using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using RideO.API.Data;
using RideO.API.Hubs;
using RideO.API.Models;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace RideO.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EmergencyController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<RideHub> _hubContext;

        public EmergencyController(AppDbContext context, IHubContext<RideHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
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

            // 1. Get user's emergency contacts
            var emergencyContacts = await _context.EmergencyContacts
                .Where(e => e.UserId == userId)
                .ToListAsync();

            // 2. Create EmergencySOS record
            var emergencySos = new EmergencySOS
            {
                BookingId = booking.Id,
                TriggeredByUserId = userId,
                Latitude = request.Latitude,
                Longitude = request.Longitude,
                Status = "Open",
                CreatedAt = DateTime.UtcNow
            };
            _context.EmergencySOSLogs.Add(emergencySos);

            // 3. Save Notification for admin dashboard
            var adminNotification = new Notification
            {
                UserId = Guid.Empty, // Represents system/admin
                Title = "⚠️ SOS Alert",
                Message = $"SOS Alert from {booking.User?.FullName} at coordinates {request.Latitude},{request.Longitude}",
                Type = "warning"
            };
            _context.Notifications.Add(adminNotification);

            await _context.SaveChangesAsync();

            // 4. Alert Admins via SignalR
            var sosAlert = new
            {
                EmergencyId = emergencySos.Id,
                BookingId = booking.Id,
                TriggeredBy = booking.User?.FullName,
                Role = booking.UserId == userId ? "Passenger" : "Driver",
                Latitude = request.Latitude,
                Longitude = request.Longitude,
                Timestamp = DateTime.UtcNow
            };

            await _hubContext.Clients.Group("Admins").SendAsync("EmergencySOS", sosAlert);

            return Ok(new { message = "SOS sent to your emergency contacts and RideO safety team." });
        }
        
        [Authorize(Roles = "Admin")]
        [HttpGet("sos")]
        public async Task<IActionResult> GetSOSAlerts()
        {
            var alerts = await _context.EmergencySOSLogs
                .Include(e => e.TriggeredByUser)
                .OrderByDescending(e => e.CreatedAt)
                .Select(e => new {
                    e.Id,
                    e.BookingId,
                    TriggeredBy = e.TriggeredByUser!.FullName,
                    e.Latitude,
                    e.Longitude,
                    e.Status,
                    e.CreatedAt,
                    e.ResolvedAt
                })
                .ToListAsync();
            
            return Ok(alerts);
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("sos/{id}/resolve")]
        public async Task<IActionResult> ResolveSOS(Guid id)
        {
            var sos = await _context.EmergencySOSLogs.FindAsync(id);
            if (sos == null) return NotFound();

            sos.Status = "Resolved";
            sos.ResolvedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = "SOS Alert resolved." });
        }

        public class CreateEmergencyContactRequest
        {
            public string Name { get; set; } = string.Empty;
            public string PhoneNumber { get; set; } = string.Empty;
            public string? Relationship { get; set; }
        }

        [Authorize]
        [HttpGet("contacts")]
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
        [HttpPost("contacts")]
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
        [HttpDelete("contacts/{id}")]
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
