using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RideO.API.Data;
using RideO.API.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace RideO.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Driver")]
    public class RouteController : ControllerBase
    {
        private readonly AppDbContext _context;

        public RouteController(AppDbContext context)
        {
            _context = context;
        }

        public class CreateRouteRequest
        {
            public Guid? Id { get; set; } // If updating an existing draft
            public string StartLocation { get; set; } = string.Empty;
            public double StartLat { get; set; }
            public double StartLng { get; set; }
            public string EndLocation { get; set; } = string.Empty;
            public double EndLat { get; set; }
            public double EndLng { get; set; }
            public DateTime StartTime { get; set; }
            public DateTime EstimatedEndTime { get; set; }
            public int AvailableSeats { get; set; }
            public decimal PricePerSeat { get; set; }
            public Guid VehicleId { get; set; }
            public bool IsLuggageAllowed { get; set; }
            public bool AutoApprove { get; set; }
            public string? RideNotes { get; set; }

            public List<RouteStopDto> Stops { get; set; } = new();
        }

        public class RouteStopDto
        {
            public string StopName { get; set; } = string.Empty;
            public double StopLat { get; set; }
            public double StopLng { get; set; }
            public int StopOrder { get; set; }
            public decimal PriceFromStart { get; set; }
            public DateTime EstimatedArrivalTime { get; set; }
        }

        private async Task<Driver?> GetCurrentDriver()
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdString)) return null;
            var userId = Guid.Parse(userIdString);
            return await _context.Drivers.FirstOrDefaultAsync(d => d.UserId == userId);
        }

        [HttpPost("draft")]
        public async Task<IActionResult> SaveDraft([FromBody] CreateRouteRequest request)
        {
            var driver = await GetCurrentDriver();
            if (driver == null) return Unauthorized("Driver profile not found.");

            if (driver.IsSuspended)
                return StatusCode(403, "Your driver account has been suspended. You cannot save drafts or publish new routes.");

            RideO.API.Models.Route route;

            if (request.Id.HasValue && request.Id.Value != Guid.Empty)
            {
                route = await _context.Routes.Include(r => r.Stops).FirstOrDefaultAsync(r => r.Id == request.Id.Value && r.DriverId == driver.Id);
                if (route == null) return NotFound("Route not found.");
                
                // Clear old stops
                _context.RouteStops.RemoveRange(route.Stops);
            }
            else
            {
                route = new RideO.API.Models.Route { Id = Guid.NewGuid(), DriverId = driver.Id };
                _context.Routes.Add(route);
            }

            // Map fields
            route.StartLocation = request.StartLocation;
            route.StartLat = request.StartLat;
            route.StartLng = request.StartLng;
            route.EndLocation = request.EndLocation;
            route.EndLat = request.EndLat;
            route.EndLng = request.EndLng;
            route.StartTime = request.StartTime;
            route.EstimatedEndTime = request.EstimatedEndTime;
            route.AvailableSeats = request.AvailableSeats;
            route.PricePerSeat = request.PricePerSeat;
            route.VehicleId = request.VehicleId;
            route.IsLuggageAllowed = request.IsLuggageAllowed;
            route.AutoApprove = request.AutoApprove;
            route.RideNotes = request.RideNotes;
            route.Status = "Draft";

            foreach (var stop in request.Stops)
            {
                route.Stops.Add(new RouteStop
                {
                    RouteId = route.Id,
                    StopName = stop.StopName,
                    StopLat = stop.StopLat,
                    StopLng = stop.StopLng,
                    StopOrder = stop.StopOrder,
                    PriceFromStart = stop.PriceFromStart,
                    EstimatedArrivalTime = stop.EstimatedArrivalTime
                });
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Draft saved successfully", routeId = route.Id });
        }

        [HttpPost("publish")]
        public async Task<IActionResult> PublishRoute([FromBody] CreateRouteRequest request)
        {
            var driver = await GetCurrentDriver();
            if (driver == null) return Unauthorized("Driver profile not found.");

            if (driver.IsSuspended)
                return StatusCode(403, "Your driver account has been suspended. You cannot publish new routes.");

            if (!driver.IsVerified)
                return StatusCode(403, "Your KYC documents must be verified by an admin before you can publish a route.");

            // Basic Validation
            if (request.StartTime <= DateTime.UtcNow) return BadRequest("StartTime must be in the future.");
            if (request.PricePerSeat <= 0) return BadRequest("Price per seat must be greater than 0.");

            var vehicle = await _context.Vehicles.FirstOrDefaultAsync(v => v.Id == request.VehicleId && v.DriverId == driver.Id);
            if (vehicle == null) return BadRequest("Invalid vehicle selected.");
            if (request.AvailableSeats <= 0 || request.AvailableSeats > vehicle.TotalSeats)
                return BadRequest($"Available seats must be between 1 and {vehicle.TotalSeats}.");

            RideO.API.Models.Route route;

            if (request.Id.HasValue && request.Id.Value != Guid.Empty)
            {
                route = await _context.Routes.Include(r => r.Stops).FirstOrDefaultAsync(r => r.Id == request.Id.Value && r.DriverId == driver.Id);
                if (route == null) return NotFound("Route not found.");
                _context.RouteStops.RemoveRange(route.Stops);
            }
            else
            {
                route = new RideO.API.Models.Route { Id = Guid.NewGuid(), DriverId = driver.Id };
                _context.Routes.Add(route);
            }

            route.StartLocation = request.StartLocation;
            route.StartLat = request.StartLat;
            route.StartLng = request.StartLng;
            route.EndLocation = request.EndLocation;
            route.EndLat = request.EndLat;
            route.EndLng = request.EndLng;
            route.StartTime = request.StartTime;
            route.EstimatedEndTime = request.EstimatedEndTime;
            route.AvailableSeats = request.AvailableSeats;
            route.PricePerSeat = request.PricePerSeat;
            route.VehicleId = request.VehicleId;
            route.IsLuggageAllowed = request.IsLuggageAllowed;
            route.AutoApprove = request.AutoApprove;
            route.RideNotes = request.RideNotes;
            route.Status = "Published";

            foreach (var stop in request.Stops)
            {
                route.Stops.Add(new RouteStop
                {
                    RouteId = route.Id,
                    StopName = stop.StopName,
                    StopLat = stop.StopLat,
                    StopLng = stop.StopLng,
                    StopOrder = stop.StopOrder,
                    PriceFromStart = stop.PriceFromStart,
                    EstimatedArrivalTime = stop.EstimatedArrivalTime
                });
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Route published successfully", routeId = route.Id });
        }

        [HttpPut("{id}/status")]
        public async Task<IActionResult> ChangeStatus(Guid id, [FromBody] string newStatus)
        {
            var driver = await GetCurrentDriver();
            if (driver == null) return Unauthorized();

            var validStatuses = new[] { "Draft", "Published", "Started", "Completed", "Cancelled" };
            if (!validStatuses.Contains(newStatus)) return BadRequest("Invalid status.");

            var route = await _context.Routes.FirstOrDefaultAsync(r => r.Id == id && r.DriverId == driver.Id);
            if (route == null) return NotFound();

            if (route.Status == "Completed" || route.Status == "Cancelled")
                return BadRequest($"Cannot change status of a {route.Status} route.");

            route.Status = newStatus;
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Route status updated to {newStatus}" });
        }

        [HttpGet("my-routes")]
        public async Task<IActionResult> GetMyRoutes()
        {
            var driver = await GetCurrentDriver();
            if (driver == null) return Unauthorized();

            var routes = await _context.Routes
                .Include(r => r.Stops)
                .Include(r => r.Vehicle)
                .Where(r => r.DriverId == driver.Id)
                .OrderByDescending(r => r.StartTime)
                .ToListAsync();

            return Ok(routes);
        }

        // --- HA VERSINE DISTANCE HELPER ---
        private double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
        {
            var r = 6371; // Radius of earth in kilometers
            var dLat = ToRadians(lat2 - lat1);
            var dLon = ToRadians(lon2 - lon1);
            var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                    Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                    Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
            var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return r * c;
        }

        private double ToRadians(double angle)
        {
            return Math.PI * angle / 180.0;
        }

        [HttpGet("search")]
        [AllowAnonymous] // Anyone can search for rides
        public async Task<IActionResult> SearchRoutes([FromQuery] double pickupLat, [FromQuery] double pickupLng, [FromQuery] double dropLat, [FromQuery] double dropLng, [FromQuery] DateTime date, [FromQuery] int seats = 1)
        {
            // 1. Initial filter: Only Published routes, verified drivers, sufficient seats, on the specific date
            var startOfDay = date.Date;
            var endOfDay = startOfDay.AddDays(1);

            var availableRoutes = await _context.Routes
                .Include(r => r.Driver).ThenInclude(d => d.User)
                .Include(r => r.Vehicle)
                .Include(r => r.Stops)
                .Where(r => r.Status == "Published" 
                         && r.Driver != null 
                         && r.Driver.IsVerified 
                         && r.AvailableSeats >= seats
                         && r.StartTime >= startOfDay 
                         && r.StartTime < endOfDay)
                .ToListAsync();

            var matchedRoutes = new List<object>();
            var radiusKm = 5.0; // Max distance to walk/travel to pickup point

            foreach (var route in availableRoutes)
            {
                // Create an ordered list of all waypoints (Start -> Stops -> End)
                var waypoints = new List<(double Lat, double Lng, int Order, string Name)>();
                waypoints.Add((route.StartLat, route.StartLng, -1, route.StartLocation));
                
                foreach (var stop in route.Stops.OrderBy(s => s.StopOrder))
                {
                    waypoints.Add((stop.StopLat, stop.StopLng, stop.StopOrder, stop.StopName));
                }
                waypoints.Add((route.EndLat, route.EndLng, 9999, route.EndLocation)); // High order for end

                // Find a valid pickup point
                var possiblePickups = waypoints.Where(wp => CalculateDistance(pickupLat, pickupLng, wp.Lat, wp.Lng) <= radiusKm).ToList();
                
                if (!possiblePickups.Any()) continue; // No pickup point nearby

                // Find a valid dropoff point that comes AFTER the pickup point
                var bestPickup = possiblePickups.OrderBy(p => CalculateDistance(pickupLat, pickupLng, p.Lat, p.Lng)).First();
                
                var possibleDropoffs = waypoints.Where(wp => wp.Order > bestPickup.Order && CalculateDistance(dropLat, dropLng, wp.Lat, wp.Lng) <= radiusKm).ToList();

                if (!possibleDropoffs.Any()) continue; // No dropoff point nearby in the right direction

                var bestDropoff = possibleDropoffs.OrderBy(p => CalculateDistance(dropLat, dropLng, p.Lat, p.Lng)).First();

                matchedRoutes.Add(new
                {
                    routeId = route.Id,
                    driver = new { name = route.Driver!.User!.FullName, rating = route.Driver.Rating },
                    vehicle = new { make = route.Vehicle!.Make, model = route.Vehicle.Model },
                    matchedPickup = bestPickup.Name,
                    matchedDropoff = bestDropoff.Name,
                    startTime = route.StartTime,
                    availableSeats = route.AvailableSeats,
                    pricePerSeat = route.PricePerSeat,
                    autoApprove = route.AutoApprove
                });
            }

            return Ok(matchedRoutes.OrderBy(r => ((dynamic)r).startTime));
        }
    }
}
