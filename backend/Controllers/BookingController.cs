using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RideO.API.Data;
using RideO.API.Models;
using Microsoft.AspNetCore.SignalR;
using RideO.API.Hubs;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace RideO.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BookingController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<RideHub> _hubContext;

        public BookingController(AppDbContext context, IHubContext<RideHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        public class BookingRequestDto
        {
            public Guid RouteId { get; set; }
            public string PickupLocationName { get; set; } = string.Empty;
            public string DropoffLocationName { get; set; } = string.Empty;
            public int SeatsBooked { get; set; }
        }

        private Guid? GetCurrentUserId()
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdString)) return null;
            return Guid.Parse(userIdString);
        }

        // --- USER ENDPOINTS ---

        [HttpPost("request")]
        [Authorize(Roles = "User")]
        public async Task<IActionResult> RequestBooking([FromBody] BookingRequestDto request)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var route = await _context.Routes.Include(r => r.Driver).FirstOrDefaultAsync(r => r.Id == request.RouteId);
            if (route == null) return NotFound("Route not found");

            if (route.Status != "Published") return BadRequest("Route is not published.");
            if (route.AvailableSeats < request.SeatsBooked) return BadRequest("Not enough available seats.");

            var booking = new Booking
            {
                Id = Guid.NewGuid(),
                RouteId = route.Id,
                UserId = userId.Value,
                PickupLocationName = request.PickupLocationName,
                DropoffLocationName = request.DropoffLocationName,
                SeatsBooked = request.SeatsBooked,
                TotalFare = route.PricePerSeat * request.SeatsBooked,
                Status = "Pending"
            };

            // If route has AutoApprove, we can directly approve and deduct seats
            if (route.AutoApprove)
            {
                booking.Status = "Approved";
                
                int retryCount = 0;
                bool saved = false;
                while (!saved && retryCount < 3)
                {
                    try
                    {
                        if (route.AvailableSeats < request.SeatsBooked) return BadRequest("Not enough available seats.");
                        
                        route.AvailableSeats -= request.SeatsBooked;
                        if (retryCount == 0) _context.Bookings.Add(booking);
                        
                        await _context.SaveChangesAsync();
                        saved = true;
                    }
                    catch (DbUpdateConcurrencyException ex)
                    {
                        retryCount++;
                        foreach (var entry in ex.Entries)
                        {
                            if (entry.Entity is RideO.API.Models.Route)
                            {
                                await entry.ReloadAsync();
                            }
                        }
                    }
                }
                if (!saved) return BadRequest("Sorry, those seats were just booked by someone else.");
            }
            else
            {
                _context.Bookings.Add(booking);
                await _context.SaveChangesAsync();
            }

            // Notify Driver
            await _hubContext.Clients.User(route.Driver!.UserId.ToString()).SendAsync("BookingRequested", booking);

            return Ok(new { message = "Booking requested successfully", booking });
        }

        [HttpGet("my-bookings")]
        [Authorize(Roles = "User")]
        public async Task<IActionResult> GetMyBookings()
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var bookings = await _context.Bookings
                .Include(b => b.Route).ThenInclude(r => r!.Driver).ThenInclude(d => d!.User)
                .Where(b => b.UserId == userId)
                .OrderByDescending(b => b.BookedAt)
                .Select(b => new
                {
                    b.Id,
                    b.RouteId,
                    b.Status,
                    b.SeatsBooked,
                    b.TotalFare,
                    b.PickupLocationName,
                    b.DropoffLocationName,
                    b.BookedAt,
                    Route = new {
                        b.Route!.StartTime,
                        DriverName = b.Route.Driver!.User!.FullName
                    }
                })
                .ToListAsync();

            return Ok(bookings);
        }

        [HttpPut("{id}/cancel")]
        [Authorize(Roles = "User")]
        public async Task<IActionResult> CancelBooking(Guid id)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var booking = await _context.Bookings.Include(b => b.Route).FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId);
            if (booking == null) return NotFound("Booking not found");

            if (booking.Status == "Completed" || booking.Status == "Started" || booking.Status == "Cancelled")
                return BadRequest($"Cannot cancel a {booking.Status} booking.");

            if (booking.Status == "Approved")
            {
                int retryCount = 0;
                bool saved = false;
                while (!saved && retryCount < 3)
                {
                    try
                    {
                        booking.Route!.AvailableSeats += booking.SeatsBooked;
                        booking.Status = "Cancelled";
                        await _context.SaveChangesAsync();
                        saved = true;
                    }
                    catch (DbUpdateConcurrencyException ex)
                    {
                        retryCount++;
                        foreach (var entry in ex.Entries)
                        {
                            if (entry.Entity is RideO.API.Models.Route)
                            {
                                await entry.ReloadAsync();
                            }
                        }
                    }
                }
                if (!saved) return BadRequest("Concurrency conflict while cancelling. Please try again.");
            }
            else
            {
                booking.Status = "Cancelled";
                await _context.SaveChangesAsync();
            }

            // Notify Driver
            await _hubContext.Clients.User(booking.Route!.DriverId.ToString()).SendAsync("BookingCancelled", booking.Id);

            return Ok(new { message = "Booking cancelled successfully" });
        }

        // --- DRIVER ENDPOINTS ---

        [HttpGet("route/{routeId}")]
        [Authorize(Roles = "Driver")]
        public async Task<IActionResult> GetRouteBookings(Guid routeId)
        {
            var driverId = await _context.Drivers.Where(d => d.UserId == GetCurrentUserId()).Select(d => d.Id).FirstOrDefaultAsync();
            if (driverId == Guid.Empty) return Unauthorized();

            var route = await _context.Routes.FirstOrDefaultAsync(r => r.Id == routeId && r.DriverId == driverId);
            if (route == null) return Unauthorized("Not your route.");

            var bookings = await _context.Bookings
                .Include(b => b.User)
                .Where(b => b.RouteId == routeId)
                .Select(b => new
                {
                    b.Id,
                    b.Status,
                    b.SeatsBooked,
                    b.TotalFare,
                    b.PickupLocationName,
                    b.DropoffLocationName,
                    UserName = b.User!.FullName,
                    UserPhone = b.User.PhoneNumber
                })
                .ToListAsync();

            return Ok(bookings);
        }

        [HttpPut("{id}/approve")]
        [Authorize(Roles = "Driver")]
        public async Task<IActionResult> ApproveBooking(Guid id)
        {
            return await UpdateBookingStatus(id, "Approved");
        }

        [HttpPut("{id}/reject")]
        [Authorize(Roles = "Driver")]
        public async Task<IActionResult> RejectBooking(Guid id)
        {
            return await UpdateBookingStatus(id, "Rejected");
        }

        [HttpPut("{id}/status")]
        [Authorize(Roles = "Driver")]
        public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] string newStatus)
        {
            var validStatuses = new[] { "Started", "Completed", "No-show" };
            if (!validStatuses.Contains(newStatus)) return BadRequest("Invalid status transition.");

            return await UpdateBookingStatus(id, newStatus);
        }

        private async Task<IActionResult> UpdateBookingStatus(Guid bookingId, string newStatus)
        {
            var driverId = await _context.Drivers.Where(d => d.UserId == GetCurrentUserId()).Select(d => d.Id).FirstOrDefaultAsync();
            if (driverId == Guid.Empty) return Unauthorized();

            var booking = await _context.Bookings.Include(b => b.Route).FirstOrDefaultAsync(b => b.Id == bookingId);
            if (booking == null) return NotFound("Booking not found");

            if (booking.Route!.DriverId != driverId) return Unauthorized("Not your route.");

            if (newStatus == "Approved")
            {
                if (booking.Status != "Pending") return BadRequest("Can only approve pending bookings.");
                
                int retryCount = 0;
                bool saved = false;
                while (!saved && retryCount < 3)
                {
                    try
                    {
                        if (booking.Route.AvailableSeats < booking.SeatsBooked) return BadRequest("Not enough seats available.");
                        
                        booking.Route.AvailableSeats -= booking.SeatsBooked;
                        booking.Status = newStatus;
                        await _context.SaveChangesAsync();
                        saved = true;
                    }
                    catch (DbUpdateConcurrencyException ex)
                    {
                        retryCount++;
                        foreach (var entry in ex.Entries)
                        {
                            if (entry.Entity is RideO.API.Models.Route)
                            {
                                await entry.ReloadAsync();
                            }
                        }
                    }
                }
                if (!saved) return BadRequest("Sorry, those seats were just booked by someone else.");
            }
            else
            {
                if (newStatus == "Rejected" || newStatus == "No-show")
                {
                    if (booking.Status == "Approved" && newStatus == "No-show")
                    {
                        // Maybe give seats back? Usually no-show means it's too late to give back, 
                        // but depending on logic we might want to. For now, we won't.
                    }
                }

                booking.Status = newStatus;
                await _context.SaveChangesAsync();
            }

            // Notify User
            await _hubContext.Clients.User(booking.UserId.ToString()).SendAsync("BookingStatusUpdated", new { BookingId = booking.Id, Status = newStatus });

            return Ok(new { message = $"Booking {newStatus} successfully." });
        }
    }
}
