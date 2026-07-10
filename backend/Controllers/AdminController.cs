using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MongoDB.Driver;
using RideO.API.Data;
using RideO.API.Models;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace RideO.API.Controllers
{
    using RideO.API.Services;
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly MongoDbContext _mongoContext;
        private readonly Microsoft.AspNetCore.SignalR.IHubContext<RideO.API.Hubs.RideHub> _hubContext;
        private readonly FcmService _fcmService;

        public AdminController(AppDbContext context, MongoDbContext mongoContext, Microsoft.AspNetCore.SignalR.IHubContext<RideO.API.Hubs.RideHub> hubContext, FcmService fcmService)
        {
            _context = context;
            _mongoContext = mongoContext;
            _hubContext = hubContext;
            _fcmService = fcmService;
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
            var revenue = await _context.Payments
                .Where(p => p.Status == "Completed")
                .SumAsync(p => p.AdminCommission);
            var totalBookings = await _context.Bookings.CountAsync();

            // 11. Complaints (if table exists)
            // Note: Since Complaints table exists in AppDbContext, we query it.
            var openComplaints = await _context.Complaints.CountAsync(c => c.Status == "Open");

            // 12. Recent Rides
            var recentRides = await _context.Routes
                .Include(r => r.Driver).ThenInclude(d => d.User)
                .OrderByDescending(r => r.StartTime)
                .Take(5)
                .Select(r => new { r.Id, r.StartLocation, r.EndLocation, r.Status, r.StartTime, DriverName = r.Driver!.User!.FullName })
                .ToListAsync();

            // 13. Recent Bookings
            var recentBookings = await _context.Bookings
                .Include(b => b.User)
                .OrderByDescending(b => b.BookedAt)
                .Take(5)
                .Select(b => new { b.Id, b.Status, b.SeatsBooked, UserName = b.User!.FullName, b.BookedAt })
                .ToListAsync();

            // 14. Recent KYC
            var recentKyc = await _context.Drivers
                .Include(d => d.User)
                .Where(d => !d.IsVerified && _context.DriverDocuments.Any(doc => doc.DriverId == d.Id && doc.Status == "Pending"))
                .OrderByDescending(d => d.User!.CreatedAt)
                .Take(5)
                .Select(d => new { d.Id, UserName = d.User!.FullName, d.LicenseNumber })
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
                .Select(b => new { b.Id, b.Status, b.SeatsBooked, DriverName = b.Route!.Driver!.User!.FullName, b.Route.StartTime })
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

        [HttpGet("routes")]
        public async Task<IActionResult> GetRoutes([FromQuery] string? search, [FromQuery] string? status)
        {
            var query = _context.Routes.Include(r => r.Driver).ThenInclude(d => d.User).AsQueryable();

            if (!string.IsNullOrEmpty(search))
            {
                var lowerSearch = search.ToLower();
                query = query.Where(r => r.StartLocation.ToLower().Contains(lowerSearch) || r.EndLocation.ToLower().Contains(lowerSearch) || r.Driver.User.FullName.ToLower().Contains(lowerSearch));
            }

            if (!string.IsNullOrEmpty(status))
            {
                var formattedStatus = char.ToUpper(status[0]) + status.Substring(1).ToLower();
                query = query.Where(r => r.Status == formattedStatus);
            }

            var routes = await query.OrderByDescending(r => r.StartTime).ToListAsync();
            return Ok(routes);
        }

        [HttpGet("routes/{id}")]
        public async Task<IActionResult> GetRouteDetails(Guid id)
        {
            var route = await _context.Routes
                .Include(r => r.Stops)
                .Include(r => r.Driver).ThenInclude(d => d.User)
                .Include(r => r.Vehicle)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (route == null) return NotFound();

            var bookings = await _context.Bookings
                .Include(b => b.User)
                .Where(b => b.RouteId == id)
                .OrderByDescending(b => b.BookedAt)
                .ToListAsync();

            return Ok(new { route, bookings });
        }

        [HttpPost("routes/{id}/cancel")]
        public async Task<IActionResult> CancelRoute(Guid id)
        {
            var route = await _context.Routes.FindAsync(id);
            if (route == null) return NotFound();

            if (route.Status == "Completed" || route.Status == "Cancelled")
            {
                return BadRequest(new { message = $"Cannot cancel a route that is already {route.Status}" });
            }

            // 1. Mark route as cancelled
            route.Status = "Cancelled";

            // 2. Cascade cancel all active/pending bookings
            var activeBookings = await _context.Bookings
                .Where(b => b.RouteId == id && (b.Status == "Pending" || b.Status == "Approved"))
                .ToListAsync();

            foreach (var booking in activeBookings)
            {
                booking.Status = "Cancelled";
                
                // Refund payment logic would go here if implemented fully
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Route and associated bookings have been cancelled successfully." });
        }

        [HttpGet("bookings")]
        public async Task<IActionResult> GetBookings([FromQuery] string? search, [FromQuery] string? status)
        {
            var query = _context.Bookings
                .Include(b => b.User)
                .Include(b => b.Route)
                .AsQueryable();

            if (!string.IsNullOrEmpty(search))
            {
                var lowerSearch = search.ToLower();
                query = query.Where(b => b.User.FullName.ToLower().Contains(lowerSearch) || b.Route.StartLocation.ToLower().Contains(lowerSearch) || b.Route.EndLocation.ToLower().Contains(lowerSearch));
            }

            if (!string.IsNullOrEmpty(status))
            {
                var formattedStatus = char.ToUpper(status[0]) + status.Substring(1).ToLower();
                query = query.Where(b => b.Status == formattedStatus);
            }

            var bookings = await query.OrderByDescending(b => b.BookedAt).ToListAsync();
            return Ok(bookings);
        }

        [HttpGet("bookings/{id}")]
        public async Task<IActionResult> GetBookingDetails(Guid id)
        {
            var booking = await _context.Bookings
                .Include(b => b.User)
                .Include(b => b.Route).ThenInclude(r => r.Driver).ThenInclude(d => d.User)
                .FirstOrDefaultAsync(b => b.Id == id);

            if (booking == null) return NotFound();

            var payment = await _context.Payments.FirstOrDefaultAsync(p => p.BookingId == id);

            return Ok(new { booking, payment });
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
            var driver = await _context.Drivers.Include(d => d.User).FirstOrDefaultAsync(d => d.Id == driverId);
            if (driver == null) return NotFound();

            driver.IsVerified = true;

            var docs = await _context.DriverDocuments.Where(d => d.DriverId == driverId).ToListAsync();
            foreach (var doc in docs)
            {
                doc.Status = "Approved";
                doc.VerifiedAt = System.DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            
            // Realtime Update via SignalR
            await _hubContext.Clients.User(driver.UserId.ToString()).SendAsync("KYCStatusUpdated", "Approved");
            
            var notification = new Notification
            {
                UserId = driver.UserId,
                Title = "KYC Approved! 🎉",
                Message = "Congratulations! Your documents are verified. You can now publish routes and earn.",
                Type = "success"
            };
            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            if (!string.IsNullOrEmpty(driver.User?.FcmDeviceToken))
            {
                await _fcmService.SendNotificationAsync(driver.User.FcmDeviceToken, notification.Title, notification.Message);
            }

            return Ok(new { message = "Driver KYC approved successfully" });
        }

        [HttpPost("kyc/{driverId}/reject")]
        public async Task<IActionResult> RejectKYC(Guid driverId, [FromBody] string reason)
        {
            var driver = await _context.Drivers.Include(d => d.User).FirstOrDefaultAsync(d => d.Id == driverId);
            if (driver == null) return NotFound();

            driver.IsVerified = false;
            driver.KycRejectionReason = reason;

            var docs = await _context.DriverDocuments.Where(d => d.DriverId == driverId).ToListAsync();
            foreach (var doc in docs)
            {
                doc.Status = "Rejected";
                doc.VerifiedAt = System.DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            
            // Realtime Update via SignalR
            await _hubContext.Clients.User(driver.UserId.ToString()).SendAsync("KYCStatusUpdated", "Rejected");
            
            if (!string.IsNullOrEmpty(driver.User?.FcmDeviceToken))
            {
                await _fcmService.SendNotificationAsync(driver.User.FcmDeviceToken, "KYC Rejected", "Your KYC documents have been rejected. Please re-upload valid documents.");
            }

            return Ok(new { message = "Driver KYC rejected" });
        }

        [HttpGet("complaints")]
        public async Task<IActionResult> GetComplaints([FromQuery] string? status)
        {
            var query = _context.Complaints
                .Include(c => c.User)
                .Include(c => c.ReportedUser)
                .AsQueryable();

            if (!string.IsNullOrEmpty(status))
            {
                var formattedStatus = char.ToUpper(status[0]) + status.Substring(1).ToLower();
                query = query.Where(c => c.Status == formattedStatus);
            }

            var complaints = await query.OrderByDescending(c => c.CreatedAt)
                .Select(c => new {
                    c.Id,
                    c.Subject,
                    c.Status,
                    c.CreatedAt,
                    ReporterName = c.User != null ? c.User.FullName : "Unknown",
                    ReportedName = c.ReportedUser != null ? c.ReportedUser.FullName : "Unknown",
                    c.ReportedUserId,
                    c.UserId
                })
                .ToListAsync();

            return Ok(complaints);
        }

        [HttpGet("complaints/{id}")]
        public async Task<IActionResult> GetComplaintDetails(Guid id)
        {
            var complaint = await _context.Complaints
                .Include(c => c.User)
                .Include(c => c.ReportedUser)
                .Include(c => c.Booking).ThenInclude(b => b!.Route)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (complaint == null) return NotFound();

            return Ok(new {
                complaint,
                Reporter = new { complaint.User?.FullName, complaint.User?.Email, complaint.User?.PhoneNumber, complaint.User?.Role, complaint.User?.IsBlocked },
                Reported = new { complaint.ReportedUser?.FullName, complaint.ReportedUser?.Email, complaint.ReportedUser?.PhoneNumber, complaint.ReportedUser?.Role, complaint.ReportedUser?.IsBlocked }
            });
        }

        public class UpdateComplaintStatusDto
        {
            public string Status { get; set; } = string.Empty;
            public string? AdminNotes { get; set; }
        }

        [HttpPut("complaints/{id}/status")]
        public async Task<IActionResult> UpdateComplaintStatus(Guid id, [FromBody] UpdateComplaintStatusDto dto)
        {
            var complaint = await _context.Complaints.FindAsync(id);
            if (complaint == null) return NotFound("Complaint not found.");

            var validStatuses = new[] { "Open", "In Review", "Resolved", "Rejected" };
            if (!validStatuses.Contains(dto.Status)) return BadRequest("Invalid status.");

            complaint.Status = dto.Status;
            
            if (!string.IsNullOrEmpty(dto.AdminNotes))
                complaint.AdminNotes = dto.AdminNotes;

            if (dto.Status == "Resolved" || dto.Status == "Rejected")
            {
                complaint.ResolvedAt = System.DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Complaint status updated successfully.", complaint });
        }

        [HttpGet("chat/{bookingId}")]
        public async Task<IActionResult> GetAdminChatHistory(Guid bookingId)
        {
            var booking = await _context.Bookings.FindAsync(bookingId);
            if (booking == null) return NotFound("Booking not found");

            var messages = await _context.ChatMessages
                .Include(m => m.Sender)
                .Where(m => m.BookingId == bookingId)
                .OrderBy(m => m.SentAt)
                .Select(m => new {
                    m.Id,
                    m.SenderId,
                    SenderName = m.Sender!.FullName,
                    SenderRole = m.Sender.Role,
                    m.Content,
                    m.SentAt
                })
                .ToListAsync();

            return Ok(new { 
                bookingStatus = booking.Status, 
                messages 
            });
        }
        [HttpDelete("reset-database")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetDatabase()
        {
            _context.ChatMessages.RemoveRange(await _context.ChatMessages.ToListAsync());
            _context.EmergencySOSLogs.RemoveRange(await _context.EmergencySOSLogs.ToListAsync());
            _context.Notifications.RemoveRange(await _context.Notifications.ToListAsync());
            _context.Payments.RemoveRange(await _context.Payments.ToListAsync());
            _context.PayoutRequests.RemoveRange(await _context.PayoutRequests.ToListAsync());
            _context.Complaints.RemoveRange(await _context.Complaints.ToListAsync());
            _context.DriverDocuments.RemoveRange(await _context.DriverDocuments.ToListAsync());
            _context.RecurringBookings.RemoveRange(await _context.RecurringBookings.ToListAsync());
            _context.Bookings.RemoveRange(await _context.Bookings.ToListAsync());
            _context.Routes.RemoveRange(await _context.Routes.ToListAsync());
            _context.Wallets.RemoveRange(await _context.Wallets.ToListAsync());
            _context.Vehicles.RemoveRange(await _context.Vehicles.ToListAsync());
            _context.Drivers.RemoveRange(await _context.Drivers.ToListAsync());

            var nonAdmins = await _context.Users.Where(u => u.Role != "Admin").ToListAsync();
            _context.Users.RemoveRange(nonAdmins);

            await _context.SaveChangesAsync();

            return Ok(new { message = "Database has been reset successfully. All non-admin data is cleared." });
        }
    }
}
