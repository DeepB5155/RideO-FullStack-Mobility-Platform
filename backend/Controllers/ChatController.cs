using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RideO.API.Data;
using RideO.API.Models;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace RideO.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ChatController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ChatController(AppDbContext context)
        {
            _context = context;
        }

        private Guid? GetCurrentUserId()
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdString)) return null;
            return Guid.Parse(userIdString);
        }

        [HttpGet("{bookingId}")]
        public async Task<IActionResult> GetChatHistory(Guid bookingId)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var booking = await _context.Bookings
                .Include(b => b.Route)
                .FirstOrDefaultAsync(b => b.Id == bookingId);

            if (booking == null) return NotFound("Booking not found");

            // Verify access: user must be the passenger or the driver of the route
            var isPassenger = booking.UserId == userId.Value;
            
            bool isDriver = false;
            var driver = await _context.Drivers.FirstOrDefaultAsync(d => d.Id == booking.Route!.DriverId);
            if (driver != null && driver.UserId == userId.Value) {
                isDriver = true;
            }

            if (!isPassenger && !isDriver) return Unauthorized("You are not part of this booking.");

            var messages = await _context.ChatMessages
                .Include(m => m.Sender)
                .Where(m => m.BookingId == bookingId)
                .OrderBy(m => m.SentAt)
                .Select(m => new {
                    m.Id,
                    m.SenderId,
                    SenderName = m.Sender!.FullName,
                    m.Content,
                    m.SentAt
                })
                .ToListAsync();

            return Ok(new { 
                bookingStatus = booking.Status, 
                messages 
            });
        }
    }
}
