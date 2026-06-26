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

        public class SOSRequest
        {
            public Guid BookingId { get; set; }
            public double? Latitude { get; set; }
            public double? Longitude { get; set; }
        }

        [Authorize]
        [HttpPost("sos")]
        public async Task<IActionResult> TriggerSOS([FromBody] SOSRequest request)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub);
            if (string.IsNullOrEmpty(userIdString)) return Unauthorized();
            var userId = Guid.Parse(userIdString);

            var booking = await _context.Bookings
                .Include(b => b.User)
                .Include(b => b.Route).ThenInclude(r => r.Driver).ThenInclude(d => d.User)
                .FirstOrDefaultAsync(b => b.Id == request.BookingId && (b.UserId == userId || (b.Route != null && b.Route.Driver != null && b.Route.Driver.UserId == userId)));

            if (booking == null) return NotFound("Booking not found or access denied.");

            // 1. Create Complaint/Emergency Log
            var emergency = new Complaint
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                BookingId = booking.Id,
                Subject = "EMERGENCY SOS TRIGGERED",
                Description = $"SOS triggered at Lat: {request.Latitude}, Lng: {request.Longitude}",
                Status = "Open",
                CreatedAt = DateTime.UtcNow
            };
            _context.Complaints.Add(emergency);
            await _context.SaveChangesAsync();

            // 2. Alert Admins via SignalR
            var sosAlert = new
            {
                EmergencyId = emergency.Id,
                BookingId = booking.Id,
                TriggeredBy = booking.User?.FullName,
                Role = booking.UserId == userId ? "Passenger" : "Driver",
                Latitude = request.Latitude,
                Longitude = request.Longitude,
                Timestamp = DateTime.UtcNow
            };

            await _hubContext.Clients.Group("Admins").SendAsync("EmergencySOS", sosAlert);

            // 3. (Optional) In future, integrate Twilio here to send SMS to EmergencyContacts

            return Ok(new { message = "SOS triggered successfully. Admins have been notified." });
        }

        public class CreateEmergencyContactRequest
        {
            public string Name { get; set; } = string.Empty;
            public string PhoneNumber { get; set; } = string.Empty;
            public string? Relationship { get; set; }
        }

        [Authorize]
        [HttpGet("emergency-contacts")]
        public async Task<IActionResult> GetEmergencyContacts()
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub);
            if (string.IsNullOrEmpty(userIdString)) return Unauthorized();
            var userId = Guid.Parse(userIdString);

            var contacts = await _context.EmergencyContacts
                .Where(e => e.UserId == userId)
                .Select(e => new { e.Id, e.Name, e.PhoneNumber, e.Relationship })
                .ToListAsync();

            return Ok(contacts);
        }

        [Authorize]
        [HttpPost("emergency-contacts")]
        public async Task<IActionResult> AddEmergencyContact([FromBody] CreateEmergencyContactRequest request)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub);
            if (string.IsNullOrEmpty(userIdString)) return Unauthorized();
            var userId = Guid.Parse(userIdString);

            // Limit to max 3 contacts
            var contactCount = await _context.EmergencyContacts.CountAsync(e => e.UserId == userId);
            if (contactCount >= 3)
            {
                return BadRequest(new { message = "You can only have a maximum of 3 emergency contacts." });
            }

            var contact = new EmergencyContact
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Name = request.Name,
                PhoneNumber = request.PhoneNumber,
                Relationship = request.Relationship
            };

            _context.EmergencyContacts.Add(contact);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Emergency contact added successfully.", contact = new { contact.Id, contact.Name, contact.PhoneNumber, contact.Relationship } });
        }

        [Authorize]
        [HttpDelete("emergency-contacts/{id}")]
        public async Task<IActionResult> DeleteEmergencyContact(Guid id)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub);
            if (string.IsNullOrEmpty(userIdString)) return Unauthorized();
            var userId = Guid.Parse(userIdString);

            var contact = await _context.EmergencyContacts.FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);
            if (contact == null) return NotFound("Contact not found.");

            _context.EmergencyContacts.Remove(contact);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Emergency contact removed." });
        }
    }
}
