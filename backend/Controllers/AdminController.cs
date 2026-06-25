using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MongoDB.Driver;
using RideO.API.Data;
using RideO.API.Models;
using System.Linq;
using System.Threading.Tasks;

using Microsoft.AspNetCore.Authorization;

namespace RideO.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly MongoDbContext _mongoContext;

        public AdminController(AppDbContext context, MongoDbContext mongoContext)
        {
            _context = context;
            _mongoContext = mongoContext;
        }

        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboardStats()
        {
            var today = System.DateTime.UtcNow.Date;

            // 1 & 2. Users and Drivers
            var totalUsers = await _context.Users.CountAsync();
            var totalDrivers = await _context.Drivers.CountAsync();

            // 3 & 4. Driver Statuses
            var approvedDrivers = await _context.Drivers.CountAsync(d => d.IsVerified);
            var pendingKYC = await _context.Drivers
                .CountAsync(d => !d.IsVerified && _context.DriverDocuments.Any(doc => doc.DriverId == d.Id && doc.Status == "Pending"));

            // 5, 6, 7. Ride Statuses
            var activeRides = await _context.Routes.CountAsync(r => r.Status == "Started");
            var publishedRides = await _context.Routes.CountAsync(r => r.Status == "Published");
            var completedRides = await _context.Routes.CountAsync(r => r.Status == "Completed");

            // 8 & 9. Bookings
            var todayBookings = await _context.Bookings.CountAsync(b => b.BookedAt.Date == today);
            var cancelledBookings = await _context.Bookings.CountAsync(b => b.Status == "Cancelled");

            // 10. Revenue
            var totalBookings = await _context.Bookings.CountAsync();
            var revenue = await _context.Payments.SumAsync(p => p.Amount) + (totalBookings * 15.5m);

            // 11. Complaints (if table exists)
            // Note: Since Complaints table exists in AppDbContext, we query it.
            var openComplaints = await _context.Complaints.CountAsync(c => c.Status == "Open");

            // 12. Recent Rides
            var recentRides = await _context.Routes
                .Include(r => r.Driver).ThenInclude(d => d.User)
                .OrderByDescending(r => r.StartTime)
                .Take(5)
                .Select(r => new { r.Id, r.StartLocation, r.EndLocation, r.Status, r.StartTime, DriverName = r.Driver.User.FullName })
                .ToListAsync();

            // 13. Recent Bookings
            var recentBookings = await _context.Bookings
                .Include(b => b.User)
                .OrderByDescending(b => b.BookedAt)
                .Take(5)
                .Select(b => new { b.Id, b.Status, b.SeatsBooked, UserName = b.User.FullName, b.BookedAt })
                .ToListAsync();

            // 14. Recent KYC
            var recentKyc = await _context.Drivers
                .Include(d => d.User)
                .Where(d => !d.IsVerified && _context.DriverDocuments.Any(doc => doc.DriverId == d.Id && doc.Status == "Pending"))
                .OrderByDescending(d => d.User.CreatedAt)
                .Take(5)
                .Select(d => new { d.Id, UserName = d.User.FullName, d.LicenseNumber })
                .ToListAsync();

            return Ok(new
            {
                Metrics = new {
                    TotalUsers = totalUsers,
                    TotalDrivers = totalDrivers,
                    PendingKYC = pendingKYC,
                    ApprovedDrivers = approvedDrivers,
                    ActiveRides = activeRides,
                    PublishedRides = publishedRides,
                    CompletedRides = completedRides,
                    TodayBookings = todayBookings,
                    CancelledBookings = cancelledBookings,
                    Revenue = revenue,
                    OpenComplaints = openComplaints,
                    TotalRides = totalBookings // kept for legacy compatibility if needed
                },
                RecentActivity = new {
                    RecentRides = recentRides,
                    RecentBookings = recentBookings,
                    RecentKyc = recentKyc
                }
            });
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetUsers([FromQuery] string? search, [FromQuery] string? status)
        {
            var query = _context.Users.AsQueryable();

            if (!string.IsNullOrEmpty(search))
            {
                var lowerSearch = search.ToLower();
                query = query.Where(u => u.FullName.ToLower().Contains(lowerSearch) || u.Email.ToLower().Contains(lowerSearch));
            }

            if (!string.IsNullOrEmpty(status))
            {
                if (status == "blocked") query = query.Where(u => u.IsBlocked);
                if (status == "active") query = query.Where(u => !u.IsBlocked);
            }

            var users = await query.OrderByDescending(u => u.CreatedAt).ToListAsync();
            return Ok(users);
        }

        [HttpGet("users/{id}")]
        public async Task<IActionResult> GetUserDetails(Guid id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();

            var bookings = await _context.Bookings
                .Include(b => b.Route).ThenInclude(r => r.Driver).ThenInclude(d => d.User)
                .Where(b => b.UserId == id)
                .OrderByDescending(b => b.BookedAt)
                .Take(10)
                .Select(b => new { b.Id, b.Status, b.SeatsBooked, DriverName = b.Route.Driver.User.FullName, b.Route.StartTime })
                .ToListAsync();

            var complaints = await _context.Complaints
                .Where(c => c.UserId == id)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();

            return Ok(new { user, recentBookings = bookings, complaints });
        }

        [HttpPost("users/{id}/toggle-block")]
        public async Task<IActionResult> ToggleUserBlock(Guid id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();

            user.IsBlocked = !user.IsBlocked;
            await _context.SaveChangesAsync();
            return Ok(new { message = user.IsBlocked ? "User blocked successfully" : "User unblocked successfully", isBlocked = user.IsBlocked });
        }

        [HttpGet("drivers")]
        public async Task<IActionResult> GetDrivers([FromQuery] string? search, [FromQuery] string? status)
        {
            var query = _context.Drivers.Include(d => d.User).AsQueryable();

            if (!string.IsNullOrEmpty(search))
            {
                var lowerSearch = search.ToLower();
                query = query.Where(d => d.User.FullName.ToLower().Contains(lowerSearch) || d.LicenseNumber.ToLower().Contains(lowerSearch));
            }

            if (!string.IsNullOrEmpty(status))
            {
                if (status == "verified") query = query.Where(d => d.IsVerified);
                if (status == "unverified") query = query.Where(d => !d.IsVerified);
                if (status == "suspended") query = query.Where(d => d.IsSuspended);
            }

            var drivers = await query.OrderByDescending(d => d.Id).ToListAsync();
            return Ok(drivers);
        }

        [HttpPost("drivers/{id}/toggle-suspend")]
        public async Task<IActionResult> ToggleDriverSuspend(Guid id)
        {
            var driver = await _context.Drivers.FindAsync(id);
            if (driver == null) return NotFound();

            driver.IsSuspended = !driver.IsSuspended;
            await _context.SaveChangesAsync();
            return Ok(new { message = driver.IsSuspended ? "Driver suspended successfully" : "Driver unsuspended successfully", isSuspended = driver.IsSuspended });
        }

        [HttpGet("rides")]
        public async Task<IActionResult> GetRides()
        {
            var bookings = await _context.Bookings
                .Include(b => b.User)
                .Include(b => b.Route)
                .OrderByDescending(b => b.BookedAt)
                .ToListAsync();
            return Ok(bookings);
        }

        [HttpGet("live-locations")]
        public async Task<IActionResult> GetLiveLocations()
        {
            var recentLogs = await _mongoContext.LocationLogs
                .Find(_ => true) // In production, filter by timestamp > DateTime.UtcNow.AddMinutes(-15)
                .SortByDescending(l => l.Timestamp)
                .Limit(50)
                .ToListAsync();

            var activeLocations = recentLogs
                .GroupBy(l => l.DriverId)
                .Select(g => g.First())
                .ToList();

            return Ok(activeLocations);
        }

        [HttpGet("kyc-pending")]
        public async Task<IActionResult> GetPendingKYC()
        {
            var pendingDrivers = await _context.Drivers
                .Include(d => d.User)
                .Where(d => !d.IsVerified)
                .Select(d => new
                {
                    d.Id,
                    d.UserId,
                    d.LicenseNumber,
                    User = new { d.User.FullName, d.User.Email, d.User.PhoneNumber },
                    HasDocuments = _context.DriverDocuments.Any(doc => doc.DriverId == d.Id && doc.Status == "Pending")
                })
                .Where(d => d.HasDocuments)
                .ToListAsync();

            return Ok(pendingDrivers);
        }

        [HttpGet("kyc/{driverId}")]
        public async Task<IActionResult> GetDriverKYCDetails(Guid driverId)
        {
            var driver = await _context.Drivers
                .Include(d => d.User)
                .FirstOrDefaultAsync(d => d.Id == driverId);

            if (driver == null) return NotFound();

            var vehicle = await _context.Vehicles.FirstOrDefaultAsync(v => v.DriverId == driverId);
            var documents = await _context.DriverDocuments.Where(doc => doc.DriverId == driverId).ToListAsync();
            
            var routes = await _context.Routes
                .Where(r => r.DriverId == driverId)
                .OrderByDescending(r => r.StartTime)
                .Take(10)
                .Select(r => new { r.Id, r.StartLocation, r.EndLocation, r.StartTime, r.Status })
                .ToListAsync();

            return Ok(new
            {
                driver = new { driver.Id, driver.LicenseNumber, driver.IsVerified, driver.IsSuspended, driver.Balance, driver.Rating },
                user = new { driver.User.FullName, driver.User.Email, driver.User.PhoneNumber, driver.User.IsBlocked },
                vehicle,
                documents,
                recentRoutes = routes
            });
        }

        [HttpPost("kyc/{driverId}/approve")]
        public async Task<IActionResult> ApproveKYC(Guid driverId)
        {
            var driver = await _context.Drivers.FindAsync(driverId);
            if (driver == null) return NotFound();

            driver.IsVerified = true;

            var docs = await _context.DriverDocuments.Where(d => d.DriverId == driverId).ToListAsync();
            foreach (var doc in docs)
            {
                doc.Status = "Approved";
                doc.VerifiedAt = System.DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Driver KYC approved successfully" });
        }

        [HttpPost("kyc/{driverId}/reject")]
        public async Task<IActionResult> RejectKYC(Guid driverId, [FromBody] string reason)
        {
            var driver = await _context.Drivers.FindAsync(driverId);
            if (driver == null) return NotFound();

            driver.IsVerified = false;

            var docs = await _context.DriverDocuments.Where(d => d.DriverId == driverId).ToListAsync();
            foreach (var doc in docs)
            {
                doc.Status = "Rejected";
                doc.VerifiedAt = System.DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Driver KYC rejected" });
        }
    }
}
