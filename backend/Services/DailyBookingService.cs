using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RideO.API.Data;
using RideO.API.Models;

namespace RideO.API.Services
{
    public class DailyBookingService : BackgroundService
    {
        private readonly ILogger<DailyBookingService> _logger;
        private readonly IServiceProvider _serviceProvider;

        public DailyBookingService(ILogger<DailyBookingService> logger, IServiceProvider serviceProvider)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                // Calculate time until next 6:00 AM IST
                var istZone = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");
                var nowIst = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, istZone);
                var nextRunIst = nowIst.Date.AddHours(6); // 6:00 AM today
                
                if (nowIst > nextRunIst)
                {
                    nextRunIst = nextRunIst.AddDays(1); // 6:00 AM tomorrow
                }
                
                var timeToWait = nextRunIst - nowIst;
                
                _logger.LogInformation("DailyBookingService is waiting for {TimeToWait} until next run at {NextRun}", timeToWait, nextRunIst);

                // Wait until it's time
                await Task.Delay(timeToWait, stoppingToken);

                if (stoppingToken.IsCancellationRequested) break;

                await ProcessDailyBookingsAsync(stoppingToken);
            }
        }

        private async Task ProcessDailyBookingsAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("DailyBookingService is processing daily subscriptions...");

            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var fcmService = scope.ServiceProvider.GetRequiredService<FcmService>();

            var istZone = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");
            var todayIst = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, istZone).Date;
            var dayOfWeekStr = todayIst.ToString("ddd"); // "Mon", "Tue", etc.

            var activeSubscriptions = await context.RecurringBookings
                .Include(s => s.OriginalRoute).ThenInclude(r => r!.Driver).ThenInclude(d => d!.User)
                .Include(s => s.User)
                .Where(s => s.IsActive && 
                            (s.PausedUntil == null || s.PausedUntil <= todayIst) &&
                            s.OriginalRoute != null &&
                            s.OriginalRoute.Status == "Published" &&
                            s.OriginalRoute.RecurringDays != null &&
                            s.OriginalRoute.RecurringDays.Contains(dayOfWeekStr))
                .ToListAsync(stoppingToken);

            int processedCount = 0;

            foreach (var sub in activeSubscriptions)
            {
                try
                {
                    // Check if today is cancelled by driver
                    var todayDateString = todayIst.ToString("yyyy-MM-dd");
                    if (sub.OriginalRoute?.CancelledDates != null && sub.OriginalRoute.CancelledDates.Contains(todayDateString))
                    {
                        continue; // Skip this day, driver cancelled it
                    }

                    // Check if a booking already exists for today to avoid duplicates
                    var existingBooking = await context.Bookings
                        .AnyAsync(b => b.UserId == sub.UserId && 
                                       b.RouteId == sub.OriginalRouteId && 
                                       b.BookedAt.Date == todayIst, stoppingToken);
                    
                    if (existingBooking) continue;

                    var wallet = await context.Wallets.FirstOrDefaultAsync(w => w.UserId == sub.UserId, stoppingToken);
                    if (wallet == null) continue;

                    bool paymentSuccessful = false;

                    if (sub.PaymentPlan == "Weekly")
                    {
                        if (sub.TotalAmountPrepaid >= sub.TotalFarePerRide)
                        {
                            sub.TotalAmountPrepaid -= sub.TotalFarePerRide;
                            paymentSuccessful = true;
                        }
                        else
                        {
                            // Fallback to wallet if prepaid is exhausted
                            if (wallet.Balance >= sub.TotalFarePerRide)
                            {
                                wallet.Balance -= sub.TotalFarePerRide;
                                paymentSuccessful = true;
                                
                                context.WalletTransactions.Add(new WalletTransaction
                                {
                                    WalletId = wallet.Id,
                                    Amount = -sub.TotalFarePerRide,
                                    Type = "Payment",
                                    Description = $"Daily subscription deduction for {sub.OriginalRoute!.StartLocation} to {sub.OriginalRoute.EndLocation}",
                                    ReferenceId = sub.Id.ToString()
                                });
                            }
                        }
                    }
                    else // "Daily"
                    {
                        if (wallet.Balance >= sub.TotalFarePerRide)
                        {
                            wallet.Balance -= sub.TotalFarePerRide;
                            paymentSuccessful = true;

                            context.WalletTransactions.Add(new WalletTransaction
                            {
                                WalletId = wallet.Id,
                                Amount = -sub.TotalFarePerRide,
                                Type = "Payment",
                                Description = $"Daily subscription auto-pay for {sub.OriginalRoute!.StartLocation} to {sub.OriginalRoute.EndLocation}",
                                ReferenceId = sub.Id.ToString()
                            });
                        }
                    }

                    if (!paymentSuccessful)
                    {
                        // Notify user of failed payment
                        var failNotification = new Notification
                        {
                            UserId = sub.UserId,
                            Title = "Insufficient Wallet Balance ⚠️",
                            Message = "Top up your wallet to continue your daily commute subscription.",
                            Type = "warning"
                        };
                        context.Notifications.Add(failNotification);
                        if (sub.User?.FcmDeviceToken != null)
                        {
                            await fcmService.SendNotificationAsync(sub.User.FcmDeviceToken, failNotification.Title, failNotification.Message);
                        }
                        continue;
                    }

                    // Create the booking
                    var booking = new Booking
                    {
                        Id = Guid.NewGuid(),
                        RouteId = sub.OriginalRouteId,
                        UserId = sub.UserId,
                        PickupLocationName = sub.OriginalRoute!.StartLocation,
                        DropoffLocationName = sub.OriginalRoute.EndLocation,
                        SeatsBooked = sub.SeatsBooked,
                        TotalFare = sub.TotalFarePerRide,
                        PaymentMethod = "Wallet",
                        Status = "Approved",
                        TrackingId = Guid.NewGuid(),
                        BookedAt = DateTime.UtcNow
                    };
                    context.Bookings.Add(booking);

                    // Create Payment record
                    var payment = new Payment
                    {
                        BookingId = booking.Id,
                        Amount = sub.TotalFarePerRide,
                        Status = "Completed",
                        Method = "Wallet",
                        ProcessedAt = DateTime.UtcNow
                    };
                    context.Payments.Add(payment);

                    // Reduce available seats
                    if (sub.OriginalRoute.AvailableSeats >= sub.SeatsBooked)
                    {
                        sub.OriginalRoute.AvailableSeats -= sub.SeatsBooked;
                    }

                    // Notify user of success
                    var successNotification = new Notification
                    {
                        UserId = sub.UserId,
                        Title = "Daily ride confirmed ✅",
                        Message = $"Your commute to {sub.OriginalRoute.EndLocation} is set for today at {sub.OriginalRoute.RecurringTime}.",
                        Type = "success"
                    };
                    context.Notifications.Add(successNotification);
                    
                    if (sub.User?.FcmDeviceToken != null)
                    {
                        await fcmService.SendNotificationAsync(sub.User.FcmDeviceToken, successNotification.Title, successNotification.Message);
                    }

                    processedCount++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing subscription {SubscriptionId}", sub.Id);
                }
            }

            await context.SaveChangesAsync(stoppingToken);
            _logger.LogInformation("DailyBookingService finished processing. Created {Count} bookings.", processedCount);
        }
    }
}
