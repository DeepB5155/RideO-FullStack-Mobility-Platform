using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RideO.API.Data;
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
    public class InsightsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public InsightsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("driver-stats")]
        public async Task<IActionResult> GetDriverStats()
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdString)) return Unauthorized();
            var userId = Guid.Parse(userIdString);

            var driver = await _context.Drivers.FirstOrDefaultAsync(d => d.UserId == userId);
            if (driver == null) return NotFound("Driver not found.");

            var driverId = driver.Id;
            var now = DateTime.UtcNow;
            var startOfToday = now.Date;
            var startOfLast7Days = startOfToday.AddDays(-6);
            var startOfMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            // Fetch Payments
            var payments = await _context.Payments
                .Include(p => p.Booking)
                .ThenInclude(b => b!.Route)
                .Where(p => p.Status == "Completed" && p.Booking!.Route!.DriverId == driverId)
                .ToListAsync();

            // Earnings
            var lifetimeEarnings = payments.Sum(p => p.DriverEarning);
            var weeklyEarnings = payments.Where(p => p.ProcessedAt >= startOfLast7Days).Sum(p => p.DriverEarning);

            // Daily Earnings (Array of 7)
            var dailyEarnings = new decimal[7];
            for (int i = 0; i < 7; i++)
            {
                var day = startOfLast7Days.AddDays(i).Date;
                dailyEarnings[i] = payments.Where(p => p.ProcessedAt.Date == day).Sum(p => p.DriverEarning);
            }

            // Bookings (Trips & Acceptance)
            var bookings = await _context.Bookings
                .Include(b => b.Route)
                .Where(b => b.Route!.DriverId == driverId)
                .ToListAsync();

            var totalTripsThisMonth = bookings.Count(b => b.Status == "Completed" && b.BookedAt >= startOfMonth);

            var totalRequests = bookings.Count;
            var acceptedRequests = bookings.Count(b => b.Status != "Rejected" && b.Status != "Pending" && b.Status != "Cancelled");
            var acceptanceRate = totalRequests > 0 ? (int)Math.Round((double)acceptedRequests / totalRequests * 100) : 100;

            // Ratings
            var ratings = await _context.Ratings
                .Include(r => r.Reviewer)
                .Where(r => r.RevieweeId == userId)
                .ToListAsync();

            var ratingsThisMonth = ratings.Where(r => r.CreatedAt >= startOfMonth).ToList();
            var avgRatingThisMonth = ratingsThisMonth.Any() ? Math.Round(ratingsThisMonth.Average(r => (double)r.Score), 1) : 0.0;
            var ratingsThisWeek = ratings.Where(r => r.CreatedAt >= startOfLast7Days).ToList();
            var avgRatingThisWeek = ratingsThisWeek.Any() ? Math.Round(ratingsThisWeek.Average(r => (double)r.Score), 1) : 0.0;

            // Recent Reviews
            var recentReviews = ratings.OrderByDescending(r => r.CreatedAt).Take(3).Select(r => new
            {
                id = r.Id,
                reviewerName = r.Reviewer?.FullName ?? "Passenger",
                stars = r.Score,
                reviewText = r.Comment,
                date = r.CreatedAt
            }).ToList();

            // Badges
            var badges = new List<string>();

            // 1. Top Driver (mock check if avg rating > 4.9 for simplicity)
            if (driver.Rating >= 4.9m) badges.Add("Top Driver");

            // 2. 5-Star Week
            if (ratingsThisWeek.Any() && avgRatingThisWeek >= 4.8) badges.Add("5-Star Week");

            // 3. Daily Commuter
            var hasRecurring = await _context.Routes.AnyAsync(r => r.DriverId == driverId && r.IsRecurring && r.Status != "Cancelled");
            if (hasRecurring) badges.Add("Daily Commuter");

            // 4. 10,000 Club
            if (lifetimeEarnings >= 10000) badges.Add("₹10,000 Club");

            return Ok(new
            {
                weeklyEarnings,
                dailyEarnings,
                totalTripsThisMonth,
                avgRatingThisMonth,
                acceptanceRate,
                lifetimeEarnings,
                badges,
                recentReviews
            });
        }
    }
}
