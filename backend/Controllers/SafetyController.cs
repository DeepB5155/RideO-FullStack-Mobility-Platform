using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using MongoDB.Driver;
using RideO.API.Data;
using RideO.API.Hubs;
using RideO.API.Models;
using RideO.API.Services;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace RideO.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SafetyController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly MongoDbContext _mongoContext;
        private readonly IHubContext<RideHub> _hubContext;
        private readonly FcmService _fcmService;

        public SafetyController(AppDbContext context, MongoDbContext mongoContext, IHubContext<RideHub> hubContext, FcmService fcmService)
        {
            _context = context;
            _mongoContext = mongoContext;
            _hubContext = hubContext;
            _fcmService = fcmService;
        }

        [HttpGet("track/{trackingId}")]
        public async Task<IActionResult> GetLiveTracking(Guid trackingId)
        {
            var booking = await _context.Bookings
                .Include(b => b.Route).ThenInclude(r => r.Driver).ThenInclude(d => d.User)
                .Include(b => b.Route).ThenInclude(r => r.Vehicle)
                .FirstOrDefaultAsync(b => b.TrackingId == trackingId);

            if (booking == null) return NotFound("Invalid tracking ID");

            if (booking.Route == null || booking.Route.Driver == null)
            {
                return BadRequest("Tracking information not available yet.");
            }

            // Get latest location from MongoDB
            var driverIdStr = booking.Route.DriverId.ToString();
            var latestLocation = await _mongoContext.LocationLogs
                .Find(l => l.DriverId == driverIdStr)
                .SortByDescending(l => l.Timestamp)
                .FirstOrDefaultAsync();

            return Ok(new
            {
                BookingStatus = booking.Status,
                RouteStatus = booking.Route.Status,
                DriverName = booking.Route.Driver.User?.FullName,
                DriverRating = booking.Route.Driver.Rating,
                Vehicle = new { booking.Route.Vehicle?.Make, booking.Route.Vehicle?.Model, booking.Route.Vehicle?.LicensePlate },
                StartLocation = booking.Route.StartLocation,
                EndLocation = booking.Route.EndLocation,
                CurrentLocation = latestLocation != null ? new { 
                    Latitude = latestLocation.Location.Coordinates[1], 
                    Longitude = latestLocation.Location.Coordinates[0], 
                    Timestamp = latestLocation.Timestamp 
                } : null
            });
        }

    }
}
