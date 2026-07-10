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

        public class OnDemandRequestDto
        {
            public double PickupLat { get; set; }
            public double PickupLng { get; set; }
            public double DropLat { get; set; }
            public double DropLng { get; set; }
            public string PickupLocationName { get; set; } = string.Empty;
            public string DropoffLocationName { get; set; } = string.Empty;
            public int SeatsBooked { get; set; }
            public string PaymentMethod { get; set; } = "Cash";
            public decimal EstimatedFare { get; set; }
        }

        [HttpPost("ondemand")]
        [Authorize(Roles = "User")]
        public async Task<IActionResult> RequestOnDemand([FromBody] OnDemandRequestDto request)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            // 1. Find nearest driver
            string bestDriverId = null;
            double minDistance = double.MaxValue;

            foreach (var driver in RideHub.OnlineDrivers)
            {
                // Only consider drivers active in the last 5 minutes
                if ((DateTime.UtcNow - driver.Value.LastUpdated).TotalMinutes < 5)
                {
                    double dLat = driver.Value.Lat - request.PickupLat;
                    double dLng = driver.Value.Lng - request.PickupLng;
                    double dist = dLat * dLat + dLng * dLng;
                    if (dist < minDistance)
                    {
                        minDistance = dist;
                        bestDriverId = driver.Key;
                    }
                }
            }

            if (bestDriverId == null) return NotFound("No nearby drivers found right now. Please try again later.");

            var driverUserId = Guid.Parse(bestDriverId);
            var driverRecord = await _context.Drivers.FirstOrDefaultAsync(d => d.UserId == driverUserId);
            if (driverRecord == null) return NotFound("Driver record not found");

            // 2. Create Ad-hoc Route
            var route = new RideO.API.Models.Route
            {
                Id = Guid.NewGuid(),
                DriverId = driverRecord.Id,
                StartLocation = request.PickupLocationName,
                StartLat = request.PickupLat,
                StartLng = request.PickupLng,
                EndLocation = request.DropoffLocationName,
                EndLat = request.DropLat,
                EndLng = request.DropLng,
                StartTime = DateTime.UtcNow,
                EstimatedEndTime = DateTime.UtcNow.AddMinutes(30),
                AvailableSeats = 4,
                PricingMode = "Fixed",
                PricePerSeat = request.EstimatedFare / (request.SeatsBooked > 0 ? request.SeatsBooked : 1),
                PricePerKm = 0,
                IsLuggageAllowed = true,
                AutoApprove = false,
                Status = "Published",
                IsRecurring = false
            };
            _context.Routes.Add(route);

            // 3. Create Booking
            var otp = new Random().Next(1000, 9999).ToString();
            var booking = new Booking
            {
                Id = Guid.NewGuid(),
                RouteId = route.Id,
                UserId = userId.Value,
                PickupLocationName = request.PickupLocationName,
                DropoffLocationName = request.DropoffLocationName,
                SeatsBooked = request.SeatsBooked,
                TotalFare = request.EstimatedFare,
                PaymentMethod = request.PaymentMethod,
                Status = "Pending",
                Otp = otp,
                TrackingId = Guid.NewGuid()
            };
            _context.Bookings.Add(booking);
            
            if (request.PaymentMethod == "Wallet")
            {
                var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == userId.Value);
                if (wallet == null || wallet.Balance < booking.TotalFare)
                    return BadRequest("Insufficient wallet balance.");
                wallet.Balance -= booking.TotalFare;
                wallet.UpdatedAt = DateTime.UtcNow;
                _context.WalletTransactions.Add(new WalletTransaction { WalletId = wallet.Id, Amount = -booking.TotalFare, Type = "Payment", Description = "On-Demand Ride", ReferenceId = booking.Id.ToString() });
            }

            var payment = new Payment { BookingId = booking.Id, Amount = booking.TotalFare, Status = "Pending", Method = request.PaymentMethod };
            _context.Payments.Add(payment);
            await _context.SaveChangesAsync();

            // 4. Notify Driver
            var passengerUser = await _context.Users.FindAsync(userId.Value);
            var notification = new Notification
            {
                UserId = driverUserId,
                Title = "🚕 New Taxi Request!",
                Message = $"{passengerUser?.FullName ?? "Someone"} requested an instant pickup from {request.PickupLocationName}.",
                Type = "info"
            };
            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            await _hubContext.Clients.User(driverUserId.ToString()).SendAsync("BookingRequested", booking);
            await _hubContext.Clients.User(driverUserId.ToString()).SendAsync("NewNotification", notification);

            var driverUser = await _context.Users.FindAsync(driverUserId);
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

            return Ok(new { message = "Driver notified", booking });
        }

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
                .Where(b => b.UserId == userId && b.Status != "Completed" && b.Status != "Cancelled" && b.Status != "No-show" && b.Route!.IsRecurring == false)
                .OrderBy(b => b.Route!.StartTime)
                .Select(b => new
                {
                    b.Id,
                    b.RouteId,
                    b.Status,
                    b.SeatsBooked,
                    b.TotalFare,
                    PickupLocationName = string.IsNullOrEmpty(b.PickupLocationName) ? b.Route!.StartLocation : b.PickupLocationName,
                    DropoffLocationName = string.IsNullOrEmpty(b.DropoffLocationName) ? b.Route!.EndLocation : b.DropoffLocationName,
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
                IsActive = false,
                Status = "Pending",
                SubscribedAt = DateTime.UtcNow
            };

            _context.RecurringBookings.Add(subscription);

            // Notify Driver
            var passengerUser = await _context.Users.FindAsync(userId.Value);
            var notification = new Notification
            {
                UserId = route.Driver.UserId,
                Title = "New Subscription Request! 🔄",
                Message = $"{passengerUser?.FullName ?? "Someone"} requested to subscribe to your daily {route.StartLocation} → {route.EndLocation} route. Please review.",
                Type = "info"
            };
            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            if (route.Driver.User?.FcmDeviceToken != null)
            {
                var data = new System.Collections.Generic.Dictionary<string, string>
                {
                    { "type", "SUBSCRIPTION_REQUEST" },
                    { "subscriptionId", subscription.Id.ToString() },
                    { "routeId", route.Id.ToString() }
                };
                await _fcmService.SendNotificationAsync(route.Driver.User.FcmDeviceToken, notification.Title, notification.Message, data);
            }

            return Ok(new { message = "Successfully subscribed to daily route.", subscriptionId = subscription.Id });
        }

        [HttpGet("subscribe/pending")]
        [Authorize(Roles = "Driver")]
        public async Task<IActionResult> GetMyPendingSubscriptions()
        {
            var driverUserId = GetCurrentUserId();
            var pendingSubs = await _context.RecurringBookings
                .Include(sb => sb.User)
                .Include(sb => sb.OriginalRoute)
                .Where(sb => sb.OriginalRoute!.Driver!.UserId == driverUserId && sb.Status == "Pending")
                .Select(sb => new
                {
                    sb.Id,
                    sb.UserId,
                    UserName = sb.User!.FullName,
                    sb.SeatsBooked,
                    sb.TotalFarePerRide,
                    sb.PaymentPlan,
                    sb.Status,
                    sb.SubscribedAt,
                    RouteId = sb.OriginalRouteId,
                    RouteName = $"{sb.OriginalRoute.StartLocation} -> {sb.OriginalRoute.EndLocation}"
                })
                .ToListAsync();

            return Ok(pendingSubs);
        }

        [HttpGet("my-subscriptions")]
        [Authorize(Roles = "User")]
        public async Task<IActionResult> GetMySubscriptions()
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var subscriptions = await _context.RecurringBookings
                .Include(sb => sb.OriginalRoute).ThenInclude(r => r!.Driver).ThenInclude(d => d!.User)
                .Include(sb => sb.OriginalRoute).ThenInclude(r => r!.Vehicle)
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
                    sb.Status,
                    sb.PausedUntil,
                    sb.SubscribedAt,
                    Route = new {
                        sb.OriginalRoute!.StartLocation,
                        sb.OriginalRoute.EndLocation,
                        sb.OriginalRoute.RecurringDays,
                        sb.OriginalRoute.RecurringTime,
                        DriverName = sb.OriginalRoute.Driver!.User!.FullName,
                        VehicleMake = sb.OriginalRoute.Vehicle != null ? sb.OriginalRoute.Vehicle.Make : "Unknown",
                        VehicleModel = sb.OriginalRoute.Vehicle != null ? sb.OriginalRoute.Vehicle.Model : "Unknown",
                        LicensePlate = sb.OriginalRoute.Vehicle != null ? sb.OriginalRoute.Vehicle.LicensePlate : "N/A"
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

            var subscription = await _context.RecurringBookings
                .Include(sb => sb.OriginalRoute)
                .ThenInclude(r => r.Driver)
                .Include(sb => sb.User)
                .FirstOrDefaultAsync(sb => sb.Id == id && sb.UserId == userId);
            
            if (subscription == null) return NotFound("Subscription not found");

            subscription.PausedUntil = dto.PauseUntilDate;
            await _context.SaveChangesAsync();

            // Notify Driver
            if (subscription.OriginalRoute?.Driver != null && subscription.User != null)
            {
                var notification = new Notification
                {
                    UserId = subscription.OriginalRoute.Driver.UserId,
                    Title = "Subscription Paused",
                    Message = $"{subscription.User.FullName} paused their weekly subscription on your route until {dto.PauseUntilDate.ToShortDateString()}.",
                    Type = "warning"
                };
                _context.Notifications.Add(notification);
                await _context.SaveChangesAsync();

                await _hubContext.Clients.User(subscription.OriginalRoute.Driver.UserId.ToString())
                    .SendAsync("NewNotification", notification);
            }

            return Ok(new { message = $"Subscription paused until {dto.PauseUntilDate.ToShortDateString()}" });
        }

        [HttpDelete("subscribe/{id}")]
        [Authorize(Roles = "User")]
        public async Task<IActionResult> CancelSubscription(Guid id)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var subscription = await _context.RecurringBookings
                .Include(sb => sb.OriginalRoute)
                .ThenInclude(r => r.Driver)
                .Include(sb => sb.User)
                .FirstOrDefaultAsync(sb => sb.Id == id && sb.UserId == userId);
            
            if (subscription == null) return NotFound("Subscription not found");

            subscription.IsActive = false;
            subscription.Status = "Cancelled";

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

            // Notify Driver
            if (subscription.OriginalRoute?.Driver != null && subscription.User != null)
            {
                var notification = new Notification
                {
                    UserId = subscription.OriginalRoute.Driver.UserId,
                    Title = "Subscription Cancelled",
                    Message = $"{subscription.User.FullName} cancelled their weekly subscription on your route.",
                    Type = "error"
                };
                _context.Notifications.Add(notification);
                await _context.SaveChangesAsync();

                await _hubContext.Clients.User(subscription.OriginalRoute.Driver.UserId.ToString())
                    .SendAsync("NewNotification", notification);
            }

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

        public class CancelBookingDto
        {
            public string? Reason { get; set; }
        }

        [HttpPut("{id}/cancel")]
        [Authorize(Roles = "User")]
        public async Task<IActionResult> CancelBooking(Guid id, [FromBody] CancelBookingDto? dto = null)
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

            decimal penaltyFee = 0.0m;
            if (booking.Status == "Approved")
            {
                var timeSinceApproval = DateTime.UtcNow - booking.BookedAt;
                if (timeSinceApproval.TotalMinutes > 3)
                {
                    penaltyFee = 2.0m;
                }
            }

            booking.CancellationReason = dto?.Reason;
            booking.CancellationFee = penaltyFee;

            var userWallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == userId.Value);
            var driverWallet = booking.Route?.Driver != null ? await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == booking.Route.Driver.UserId) : null;

            // Refund wallet if payment method was Wallet, minus penalty
            if (booking.PaymentMethod == "Wallet" && userWallet != null)
            {
                decimal refundAmount = booking.TotalFare - penaltyFee;
                userWallet.Balance += refundAmount;
                userWallet.UpdatedAt = DateTime.UtcNow;

                var walletTx = new WalletTransaction
                {
                    WalletId = userWallet.Id,
                    Amount = refundAmount,
                    Type = "Refund",
                    Description = penaltyFee > 0 ? "Refund for cancelled booking (minus penalty)" : "Refund for cancelled booking",
                    ReferenceId = booking.Id.ToString()
                };
                _context.WalletTransactions.Add(walletTx);
            }
            else if (penaltyFee > 0 && userWallet != null)
            {
                // Paid via cash, but we still charge penalty to wallet
                userWallet.Balance -= penaltyFee;
                userWallet.UpdatedAt = DateTime.UtcNow;

                var walletTx = new WalletTransaction
                {
                    WalletId = userWallet.Id,
                    Amount = penaltyFee,
                    Type = "Penalty",
                    Description = "Cancellation fee",
                    ReferenceId = booking.Id.ToString()
                };
                _context.WalletTransactions.Add(walletTx);
            }

            // Credit driver if penalty
            if (penaltyFee > 0 && driverWallet != null)
            {
                driverWallet.Balance += penaltyFee;
                driverWallet.UpdatedAt = DateTime.UtcNow;

                var walletTx = new WalletTransaction
                {
                    WalletId = driverWallet.Id,
                    Amount = penaltyFee,
                    Type = "Credit",
                    Description = "Passenger cancellation fee compensation",
                    ReferenceId = booking.Id.ToString()
                };
                _context.WalletTransactions.Add(walletTx);
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
                Message = $"{passengerUser?.FullName ?? "Someone"} cancelled. " + (penaltyFee > 0 ? $"You have been credited ${penaltyFee}." : "No penalty was charged."),
                Type = "warning"
            };
            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            await _hubContext.Clients.User(booking.Route!.DriverId.ToString()).SendAsync("BookingCancelled", booking.Id);
            await _hubContext.Clients.User(booking.Route!.Driver!.UserId.ToString()).SendAsync("NewNotification", notification);

            return Ok(new { message = "Booking cancelled successfully", penaltyFee });
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

        public class StartRideDto
        {
            public string Otp { get; set; } = string.Empty;
        }

        [HttpPut("{id}/start-with-otp")]
        [Authorize(Roles = "Driver")]
        public async Task<IActionResult> StartWithOtp(Guid id, [FromBody] StartRideDto request)
        {
            var driverId = GetCurrentUserId();
            if (driverId == null) return Unauthorized();

            var booking = await _context.Bookings.Include(b => b.Route).FirstOrDefaultAsync(b => b.Id == id);
            if (booking == null) return NotFound("Booking not found.");

            // Verify if the current user is the driver for this route
            var driverRecord = await _context.Drivers.FirstOrDefaultAsync(d => d.UserId == driverId.Value);
            if (driverRecord == null || booking.Route?.DriverId != driverRecord.Id)
            {
                return Forbid("Only the assigned driver can start this ride.");
            }

            if (booking.Otp != request.Otp)
            {
                return BadRequest("Invalid OTP. Please check with the passenger.");
            }

            booking.Status = "Started";
            await _context.SaveChangesAsync();

            // Notify passenger
            await _hubContext.Clients.User(booking.UserId.ToString()).SendAsync("RideStarted", booking);

            return Ok(booking);
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

        // --- SUBSCRIPTION APPROVAL ENDPOINTS ---

        [HttpGet("subscribe/route/{routeId}")]
        [Authorize(Roles = "Driver")]
        public async Task<IActionResult> GetRouteSubscriptions(Guid routeId)
        {
            var driverUserId = GetCurrentUserId();
            var route = await _context.Routes.Include(r => r.Driver).FirstOrDefaultAsync(r => r.Id == routeId);
            
            if (route == null || route.Driver?.UserId != driverUserId)
                return Unauthorized();

            var subscribers = await _context.RecurringBookings
                .Include(sb => sb.User)
                .Where(sb => sb.OriginalRouteId == routeId && (sb.Status == "Pending" || sb.Status == "Active" || sb.Status == "Cancelled"))
                .Select(sb => new
                {
                    sb.Id,
                    sb.UserId,
                    UserName = sb.User!.FullName,
                    UserPhone = sb.User!.PhoneNumber,
                    sb.SeatsBooked,
                    sb.TotalFarePerRide,
                    sb.PaymentPlan,
                    sb.Status,
                    sb.SubscribedAt,
                    sb.PausedUntil,
                    sb.IsActive
                })
                .ToListAsync();

            return Ok(subscribers);
        }

        [HttpPut("subscribe/{id}/approve")]
        [Authorize(Roles = "Driver")]
        public async Task<IActionResult> ApproveSubscription(Guid id)
        {
            var driverUserId = GetCurrentUserId();
            var sub = await _context.RecurringBookings.Include(sb => sb.OriginalRoute).ThenInclude(r => r.Driver).FirstOrDefaultAsync(sb => sb.Id == id);
            
            if (sub == null || sub.OriginalRoute?.Driver?.UserId != driverUserId)
                return Unauthorized();

            sub.Status = "Active";
            sub.IsActive = true;
            await _context.SaveChangesAsync();

            var passengerUser = await _context.Users.FindAsync(sub.UserId);
            var notification = new Notification
            {
                UserId = sub.UserId,
                Title = "Subscription Approved! ✅",
                Message = $"Your subscription for {sub.OriginalRoute.StartLocation} → {sub.OriginalRoute.EndLocation} has been approved.",
                Type = "success"
            };
            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            if (passengerUser?.FcmDeviceToken != null)
                await _fcmService.SendNotificationAsync(passengerUser.FcmDeviceToken, notification.Title, notification.Message);

            return Ok(new { message = "Subscription approved successfully." });
        }

        [HttpPut("subscribe/{id}/reject")]
        [Authorize(Roles = "Driver")]
        public async Task<IActionResult> RejectSubscription(Guid id)
        {
            var driverUserId = GetCurrentUserId();
            var sub = await _context.RecurringBookings.Include(sb => sb.OriginalRoute).ThenInclude(r => r.Driver).FirstOrDefaultAsync(sb => sb.Id == id);
            
            if (sub == null || sub.OriginalRoute?.Driver?.UserId != driverUserId)
                return Unauthorized();

            sub.Status = "Rejected";
            sub.IsActive = false;

            // Refund if prepaid
            if (sub.TotalAmountPrepaid > 0)
            {
                var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == sub.UserId);
                if (wallet != null)
                {
                    wallet.Balance += sub.TotalAmountPrepaid;
                    _context.WalletTransactions.Add(new WalletTransaction
                    {
                        WalletId = wallet.Id,
                        Amount = sub.TotalAmountPrepaid,
                        Type = "Refund",
                        Description = $"Refund for rejected subscription: {sub.OriginalRoute.StartLocation} → {sub.OriginalRoute.EndLocation}",
                        ReferenceId = sub.Id.ToString()
                    });
                }
            }

            await _context.SaveChangesAsync();

            var passengerUser = await _context.Users.FindAsync(sub.UserId);
            var notification = new Notification
            {
                UserId = sub.UserId,
                Title = "Subscription Rejected ❌",
                Message = $"Your subscription for {sub.OriginalRoute.StartLocation} → {sub.OriginalRoute.EndLocation} was rejected.",
                Type = "warning"
            };
            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            if (passengerUser?.FcmDeviceToken != null)
                await _fcmService.SendNotificationAsync(passengerUser.FcmDeviceToken, notification.Title, notification.Message);

            return Ok(new { message = "Subscription rejected successfully." });
        }
    }
}
