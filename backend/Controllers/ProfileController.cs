using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RideO.API.Data;
using RideO.API.Models;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace RideO.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ProfileController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly Microsoft.AspNetCore.SignalR.IHubContext<RideO.API.Hubs.RideHub> _hubContext;

        public ProfileController(AppDbContext context, Microsoft.AspNetCore.SignalR.IHubContext<RideO.API.Hubs.RideHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        public class ProfileEditDto
        {
            public string? FullName { get; set; }
            public string? PhoneNumber { get; set; }
            public string? Email { get; set; }
        }

        [HttpPost("edit-request")]
        public async Task<IActionResult> SubmitEditRequest([FromBody] ProfileEditDto request)
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

            // Check if there is already a pending request
            var existing = await _context.ProfileEditRequests.FirstOrDefaultAsync(r => r.UserId == userId && r.Status == "Pending");
            if (existing != null)
            {
                return BadRequest(new { message = "You already have a pending profile update request." });
            }

            var editRequest = new ProfileEditRequest
            {
                UserId = userId,
                RequestedFullName = request.FullName,
                RequestedPhoneNumber = request.PhoneNumber,
                RequestedEmail = request.Email
            };

            _context.ProfileEditRequests.Add(editRequest);
            await _context.SaveChangesAsync();

            // Notify admins
            await _hubContext.Clients.All.SendAsync("ProfileEditSubmitted");

            return Ok(new { message = "Profile update request submitted successfully.", data = editRequest });
        }

        [HttpGet("edit-request/status")]
        public async Task<IActionResult> GetEditRequestStatus()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

            var pending = await _context.ProfileEditRequests.FirstOrDefaultAsync(r => r.UserId == userId && r.Status == "Pending");
            return Ok(new { hasPendingRequest = pending != null, request = pending });
        }
    }
}
