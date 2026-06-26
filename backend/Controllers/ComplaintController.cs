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
    public class ComplaintController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ComplaintController(AppDbContext context)
        {
            _context = context;
        }

        private Guid? GetCurrentUserId()
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdString)) return null;
            return Guid.Parse(userIdString);
        }

        public class SubmitComplaintDto
        {
            public Guid? BookingId { get; set; }
            public Guid? ReportedUserId { get; set; }
            public string Subject { get; set; } = string.Empty;
            public string Description { get; set; } = string.Empty;
        }

        [HttpPost]
        public async Task<IActionResult> SubmitComplaint([FromBody] SubmitComplaintDto dto)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            if (string.IsNullOrWhiteSpace(dto.Subject) || string.IsNullOrWhiteSpace(dto.Description))
                return BadRequest("Subject and Description are required.");

            var complaint = new Complaint
            {
                UserId = userId.Value,
                BookingId = dto.BookingId,
                ReportedUserId = dto.ReportedUserId,
                Subject = dto.Subject,
                Description = dto.Description,
                Status = "Open"
            };

            _context.Complaints.Add(complaint);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Complaint submitted successfully." });
        }

        [HttpGet("my-complaints")]
        public async Task<IActionResult> GetMyComplaints()
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var complaints = await _context.Complaints
                .Include(c => c.ReportedUser)
                .Where(c => c.UserId == userId)
                .OrderByDescending(c => c.CreatedAt)
                .Select(c => new {
                    c.Id,
                    c.Subject,
                    c.Status,
                    c.CreatedAt,
                    ReportedName = c.ReportedUser != null ? c.ReportedUser.FullName : "System/Unknown"
                })
                .ToListAsync();

            return Ok(complaints);
        }
    }
}
