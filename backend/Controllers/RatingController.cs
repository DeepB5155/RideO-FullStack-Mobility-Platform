using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
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
    public class RatingController : ControllerBase
    {
        private readonly AppDbContext _context;

        public RatingController(AppDbContext context)
        {
            _context = context;
        }

        private Guid? GetCurrentUserId()
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdString)) return null;
            return Guid.Parse(userIdString);
        }

        public class SubmitRatingDto
        {
            public Guid BookingId { get; set; }
            public Guid RevieweeId { get; set; }
            public int Score { get; set; }
            public string? Comment { get; set; }
            public string? Compliment { get; set; }
        }

        [HttpPost]
        [EnableRateLimiting("RatingLimit")]
        public async Task<IActionResult> SubmitRating([FromBody] SubmitRatingDto dto)
        {
            var reviewerId = GetCurrentUserId();
            if (reviewerId == null) return Unauthorized();

            if (dto.Score < 1 || dto.Score > 5) return BadRequest("Score must be between 1 and 5.");

            // Check if already rated
            var existingRating = await _context.Ratings
                .FirstOrDefaultAsync(r => r.BookingId == dto.BookingId && r.ReviewerId == reviewerId);
            if (existingRating != null) return BadRequest("You have already submitted a rating for this booking.");

            // Verify booking exists and involves both users
            var booking = await _context.Bookings
                .Include(b => b.Route)
                .FirstOrDefaultAsync(b => b.Id == dto.BookingId);
                
            if (booking == null) return NotFound("Booking not found.");
            if (booking.Status != "Completed") return BadRequest("Can only rate completed rides.");

            var rating = new Rating
            {
                BookingId = dto.BookingId,
                ReviewerId = reviewerId.Value,
                RevieweeId = dto.RevieweeId,
                Score = dto.Score,
                Comment = dto.Comment,
                Compliment = dto.Compliment
            };

            _context.Ratings.Add(rating);
            await _context.SaveChangesAsync();

            // Recalculate average rating for the Reviewee
            var allRatings = await _context.Ratings
                .Where(r => r.RevieweeId == dto.RevieweeId)
                .Select(r => r.Score)
                .ToListAsync();

            decimal newAverage = allRatings.Any() ? (decimal)allRatings.Average() : 5.0m;

            var user = await _context.Users.FindAsync(dto.RevieweeId);
            if (user != null)
            {
                user.AverageRating = Math.Round(newAverage, 1);
            }

            // If the reviewee is a driver, update Driver rating as well
            var driver = await _context.Drivers.FirstOrDefaultAsync(d => d.UserId == dto.RevieweeId);
            if (driver != null)
            {
                driver.Rating = Math.Round(newAverage, 1);
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "Rating submitted successfully.", average = Math.Round(newAverage, 1) });
        }

        [HttpGet("user/{userId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetUserRatings(Guid userId)
        {
            var ratings = await _context.Ratings
                .Include(r => r.Reviewer)
                .Where(r => r.RevieweeId == userId)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new {
                    r.Score,
                    r.Comment,
                    r.CreatedAt,
                    ReviewerName = r.Reviewer!.FullName
                })
                .ToListAsync();

            return Ok(ratings);
        }

        [HttpGet("insights")]
        [Authorize(Roles = "Driver")]
        public async Task<IActionResult> GetInsights()
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var driver = await _context.Drivers.FirstOrDefaultAsync(d => d.UserId == userId);
            if (driver == null) return Unauthorized();

            var allRatings = await _context.Ratings
                .Where(r => r.RevieweeId == userId)
                .ToListAsync();

            var topCompliments = allRatings
                .Where(r => !string.IsNullOrEmpty(r.Compliment))
                .GroupBy(r => r.Compliment)
                .Select(g => new { Compliment = g.Key, Count = g.Count() })
                .OrderByDescending(g => g.Count)
                .Take(3)
                .ToList();

            var totalRatings = allRatings.Count;
            var averageRating = totalRatings > 0 ? allRatings.Average(r => r.Score) : 0;

            return Ok(new
            {
                AverageRating = Math.Round(averageRating, 1),
                TotalRatings = totalRatings,
                TopCompliments = topCompliments
            });
        }

        [HttpGet("leaderboard")]
        [AllowAnonymous]
        public async Task<IActionResult> GetLeaderboard()
        {
            var topDrivers = await _context.Drivers
                .Include(d => d.User)
                .Where(d => d.IsVerified && d.Rating > 0)
                .OrderByDescending(d => d.Rating)
                .Take(10)
                .Select(d => new
                {
                    DriverId = d.Id,
                    Name = d.User!.FullName,
                    Rating = d.Rating,
                    TotalRides = _context.Routes.Count(r => r.DriverId == d.Id && r.Status == "Completed")
                })
                .Where(d => d.TotalRides >= 1) // Minimum rides to be on leaderboard
                .ToListAsync();

            return Ok(topDrivers);
        }
    }
}
