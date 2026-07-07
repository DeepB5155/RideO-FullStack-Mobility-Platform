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
    using RideO.API.Services;

    [ApiController]
    [Route("api/[controller]")]
    public class BookingController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<RideHub> _hubContext;
        private readonly FcmService _fcmService;

        public BookingController(AppDbContext context, IHubContext<RideHub> hubContext, FcmService fcmService)
        {
            _context = context;
            _hubContext = hubContext;
            _fcmService = fcmService;
        }

        public class BookingRequestDto
        {
            public Guid RouteId { get; set; }
            public string PickupLocationName { get; set; } = string.Empty;
            public string DropoffLocationName { get; set; } = string.Empty;
            public int SeatsBooked { get; set; }
            public string PaymentMethod { get; set; } = "Cash";
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
                PaymentMethod = request.PaymentMethod,
                Status = "Pending",
                TrackingId = Guid.NewGuid()
            };

            // Process Wallet Payment
            if (request.PaymentMethod == "Wallet")
            {
                var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == userId.Value);
                if (wallet == null || wallet.Balance < booking.TotalFare)
                {
                    return BadRequest("Insufficient wallet balance.");
                }

                wallet.Balance -= booking.TotalFare;
                wallet.UpdatedAt = DateTime.UtcNow;

                var walletTx = new WalletTransaction
                {
                    WalletId = wallet.Id,
                    Amount = -booking.TotalFare,
                    Type = "Payment",
                    Description = $"Payment for ride from {request.PickupLocationName} to {request.DropoffLocationName}",
                    ReferenceId = booking.Id.ToString()
                };
                _context.WalletTransactions.Add(walletTx);
            }

            var payment = new Payment
            {
                BookingId = booking.Id,
                Amount = booking.TotalFare,
                Status = "Pending",
                Method = request.PaymentMethod
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
                        if (retryCount == 0) {
                            _context.Bookings.Add(booking);
                            _context.Payments.Add(payment);
                        }
                        
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
                _context.Payments.Add(payment);
                await _context.SaveChangesAsync();
            }

            // Notify Driver
            var passengerUser = await _context.Users.FindAsync(userId.Value);
            var notification = new Notification
            {
                UserId = route.Driver!.UserId,
                Title = "New Ride Request! 👤",
                Message = $"{passengerUser?.FullName ?? "Someone"} wants to join your {route.StartLocation} → {route.EndLocation} ride.",
                Type = "info"
            };
            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            await _hubContext.Clients.User(route.Driver!.UserId.ToString()).SendAsync("BookingRequested", booking);
            await _hubContext.Clients.User(route.Driver!.UserId.ToString()).SendAsync("NewNotification", notification);

            // FCM Push Notification
            var driverUser = await _context.Users.FindAsync(route.Driver!.UserId);
            if (driverUser?.FcmDeviceToken != null)
            {
                var data = new System.Collections.Generic.Dictionary<string, string>
                {
                    { "type", "RIDE_REQUEST" },
                    { "bookingId", booking.Id.ToString() },
                    { "totalFare", booking.TotalFare.ToString() },
                    { "pickupLocationName", booking.PickupLocationName },
                    { "dropoffLocationName", booking.DropoffLocationName }
                };
                await _fcmService.SendNotificationAsync(driverUser.FcmDeviceToken, notification.Title, notification.Message, data);
            }

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
                        DriverName = b.Route.Driver!.User!.FullName,
                        DriverUserId = b.Route.Driver!.UserId
                    }
                })
                .ToListAsync();

            return Ok(bookings);
        }

        public class SubscribeRequestDto
        {
            public Guid RouteId { get; set; }
            public string PickupLocationName { get; set; } = string.Empty;
            public string DropoffLocationName { get; set; } = string.Empty;
            public int SeatsBooked { get; set; }
            public string PaymentPlan { get; set; } = "Daily";
        }

        [HttpPost("subscribe")]
        [Authorize(Roles = "User")]
        public async Task<IActionResult> Subscribe([FromBody] SubscribeRequestDto request)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var route = await _context.Routes.Include(r => r.Driver).ThenInclude(d => d.User).FirstOrDefaultAsync(r => r.Id == request.RouteId);
            if (route == null) return NotFound("Route not found");

            if (route.Status != "Published") return BadRequest("Route is not published.");
            if (!route.IsRecurring) return BadRequest("This route is not a recurring daily route.");
            if (route.Driver == null || !route.Driver.IsVerified) return BadRequest("Driver is not verified.");

            var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == userId.Value);
            if (wallet == null) return BadRequest("Wallet not found.");

            decimal totalAmountPrepaid = 0;
            var farePerDay = route.PricePerSeat * request.SeatsBooked;

            if (request.PaymentPlan == "Weekly")
            {
                var weeklyTotal = farePerDay * 7;
                if (wallet.Balance < weeklyTotal)
                {
                    return BadRequest($"Insufficient wallet balance. You need ₹{weeklyTotal} for a weekly pass.");
                }
                
                wallet.Balance -= weeklyTotal;
                wallet.UpdatedAt = DateTime.UtcNow;

                _context.WalletTransactions.Add(new WalletTransaction
                {
                    WalletId = wallet.Id,
                    Amount = -weeklyTotal,
                    Type = "Payment",
                    Description = $"Weekly subscription prepaid for route from {request.PickupLocationName} to {request.DropoffLocationName}",
                    ReferenceId = route.Id.ToString()
                });

                totalAmountPrepaid = weeklyTotal;
            }

            var subscription = new RecurringBooking
            {
                Id = Guid.NewGuid(),
                OriginalRouteId = route.Id,
                UserId = userId.Value,
                SeatsBooked = request.SeatsBooked,
                TotalFarePerRide = farePerDay,
                PaymentPlan = request.PaymentPlan,
                TotalAmountPrepaid = totalAmountPrepaid,
                IsActive = true,
                SubscribedAt = DateTime.UtcNow
            };

            _context.RecurringBookings.Add(subscription);

            // Notify Driver
            var passengerUser = await _context.Users.FindAsync(userId.Value);
            var notification = new Notification
            {
                UserId = route.Driver.UserId,
                Title = "New Daily Passenger! 🔄",
                Message = $"{passengerUser?.FullName ?? "Someone"} subscribed to your daily {route.StartLocation} → {route.EndLocation} route.",
                Type = "info"
            };
            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            if (route.Driver.User?.FcmDeviceToken != null)
            {
                await _fcmService.SendNotificationAsync(route.Driver.User.FcmDeviceToken, notification.Title, notification.Message);
            }

            return Ok(new { message = "Successfully subscribed to daily route.", subscriptionId = subscription.Id });
        }

        [HttpGet("my-subscriptions")]
        [Authorize(Roles = "User")]
        public async Task<IActionResult> GetMySubscriptions()
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var subscriptions = await _context.RecurringBookings
                .Include(sb => sb.OriginalRoute).ThenInclude(r => r.Driver).ThenInclude(d => d.User)
                .Where(sb => sb.UserId == userId && sb.IsActive)
                .OrderByDescending(sb => sb.SubscribedAt)
                .Select(sb => new
                {
                    sb.Id,
                    sb.OriginalRouteId,
                    sb.SeatsBooked,
                    sb.TotalFarePerRide,
                    sb.PaymentPlan,
                    sb.TotalAmountPrepaid,
                    sb.PausedUntil,
                    sb.SubscribedAt,
                    Route = new {
                        sb.OriginalRoute!.StartLocation,
                        sb.OriginalRoute.EndLocation,
                        sb.OriginalRoute.RecurringDays,
                        sb.OriginalRoute.RecurringTime,
                        DriverName = sb.OriginalRoute.Driver!.User!.FullName
                    }
                })
                .ToListAsync();

            return Ok(subscriptions);
        }

        public class PauseSubscriptionDto
        {
            public DateTime PauseUntilDate { get; set; }
        }

        [HttpPut("subscribe/{id}/pause")]
        [Authorize(Roles = "User")]
        public async Task<IActionResult> PauseSubscription(Guid id, [FromBody] PauseSubscriptionDto dto)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var subscription = await _context.RecurringBookings.FirstOrDefaultAsync(sb => sb.Id == id && sb.UserId == userId);
            if (subscription == null) return NotFound("Subscription not found");

            subscription.PausedUntil = dto.PauseUntilDate;
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Subscription paused until {dto.PauseUntilDate.ToShortDateString()}" });
        }

        [HttpDelete("subscribe/{id}")]
        [Authorize(Roles = "User")]
        public async Task<IActionResult> CancelSubscription(Guid id)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var subscription = await _context.RecurringBookings.FirstOrDefaultAsync(sb => sb.Id == id && sb.UserId == userId);
            if (subscription == null) return NotFound("Subscription not found");

            subscription.IsActive = false;

            if (subscription.PaymentPlan == "Weekly" && subscription.TotalAmountPrepaid > 0)
            {
                var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == userId.Value);
                if (wallet != null)
                {
                    wallet.Balance += subscription.TotalAmountPrepaid;
                    wallet.UpdatedAt = DateTime.UtcNow;

                    _context.WalletTransactions.Add(new WalletTransaction
                    {
                        WalletId = wallet.Id,
                        Amount = subscription.TotalAmountPrepaid,
                        Type = "Refund",
                        Description = "Refund for cancelled weekly subscription",
                        ReferenceId = subscription.Id.ToString()
                    });
                    
                    subscription.TotalAmountPrepaid = 0;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Subscription cancelled successfully" });
        }

        public class PaymentSubmissionDto
        {
            public string TransactionId { get; set; } = string.Empty;
        }

        [HttpPost("{id}/pay")]
        [Authorize(Roles = "User")]
        public async Task<IActionResult> PayBooking(Guid id, [FromBody] PaymentSubmissionDto dto)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var booking = await _context.Bookings.FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId);
            if (booking == null) return NotFound("Booking not found");

            var payment = await _context.Payments.FirstOrDefaultAsync(p => p.BookingId == id);
            if (payment == null) return NotFound("Payment record not found");

            if (payment.Status == "Completed") return BadRequest("Payment is already completed");

            if (booking.PaymentMethod != "UPI") return BadRequest("Payment method is not UPI");

            payment.Status = "Completed";
            payment.TransactionId = dto.TransactionId;
            payment.ProcessedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Payment verified successfully", payment });
        }

        [HttpPut("{id}/cancel")]
        [Authorize(Roles = "User")]
        public async Task<IActionResult> CancelBooking(Guid id)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var booking = await _context.Bookings
                .Include(b => b.Route)
                .ThenInclude(r => r.Driver)
                .FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId);
            if (booking == null) return NotFound("Booking not found");

            if (booking.Status == "Completed" || booking.Status == "Started" || booking.Status == "Cancelled")
                return BadRequest($"Cannot cancel a {booking.Status} booking.");

            // Refund wallet if payment method was Wallet
            if (booking.PaymentMethod == "Wallet")
            {
                var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == userId.Value);
                if (wallet != null)
                {
                    wallet.Balance += booking.TotalFare;
                    wallet.UpdatedAt = DateTime.UtcNow;

                    var walletTx = new WalletTransaction
                    {
                        WalletId = wallet.Id,
                        Amount = booking.TotalFare,
                        Type = "Refund",
                        Description = $"Refund for cancelled booking",
                        ReferenceId = booking.Id.ToString()
                    };
                    _context.WalletTransactions.Add(walletTx);
                }
            }

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
            var passengerUser = await _context.Users.FindAsync(userId.Value);
            var notification = new Notification
            {
                UserId = booking.Route!.Driver!.UserId,
                Title = "Passenger Cancelled",
                Message = $"{passengerUser?.FullName ?? "Someone"} cancelled their seat on your {booking.Route.StartTime.ToShortDateString()} ride. {booking.Route.AvailableSeats} seats now open.",
                Type = "warning"
            };
            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            await _hubContext.Clients.User(booking.Route!.DriverId.ToString()).SendAsync("BookingCancelled", booking.Id);
            await _hubContext.Clients.User(booking.Route!.Driver!.UserId.ToString()).SendAsync("NewNotification", notification);

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
                    if (booking.Status == "Approved")
                    {
                        booking.Route.AvailableSeats += booking.SeatsBooked;
                    }

                    // Refund if they paid via Wallet
                    if (newStatus == "Rejected" && booking.PaymentMethod == "Wallet")
                    {
                        var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == booking.UserId);
                        if (wallet != null)
                        {
                            wallet.Balance += booking.TotalFare;
                            wallet.UpdatedAt = DateTime.UtcNow;

                            var walletTx = new WalletTransaction
                            {
                                WalletId = wallet.Id,
                                Amount = booking.TotalFare,
                                Type = "Refund",
                                Description = $"Refund for rejected booking by driver",
                                ReferenceId = booking.Id.ToString()
                            };
                            _context.WalletTransactions.Add(walletTx);
                        }
                    }
                }

                booking.Status = newStatus;
                await _context.SaveChangesAsync();
            }

            // Notify User
            var driverName = booking.Route!.Driver?.User?.FullName ?? "The driver";
            string notifTitle = $"Booking {newStatus}";
            string notifMessage = $"Your booking status has been updated to {newStatus}.";
            string notifType = "info";

            if (newStatus == "Approved")
            {
                notifTitle = "Ride Confirmed! 🎉";
                notifMessage = $"Your booking with {driverName} from {booking.PickupLocationName} to {booking.DropoffLocationName} is confirmed.";
                notifType = "success";
            }
            else if (newStatus == "Rejected")
            {
                notifTitle = "Booking Not Available";
                notifMessage = $"{driverName} could not accommodate your request. Try another ride.";
                notifType = "warning";
            }

            var notification = new Notification
            {
                UserId = booking.UserId,
                Title = notifTitle,
                Message = notifMessage,
                Type = notifType
            };
            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            await _hubContext.Clients.User(booking.UserId.ToString()).SendAsync("BookingStatusUpdated", new { BookingId = booking.Id, Status = newStatus });
            await _hubContext.Clients.User(booking.UserId.ToString()).SendAsync("NewNotification", notification);

            // FCM Push Notification
            var passengerUser = await _context.Users.FindAsync(booking.UserId);
            if (passengerUser?.FcmDeviceToken != null)
            {
                await _fcmService.SendNotificationAsync(passengerUser.FcmDeviceToken, notification.Title, notification.Message);
            }

            return Ok(new { message = $"Booking {newStatus} successfully." });
        }
    }
}
