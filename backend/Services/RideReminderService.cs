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
    public class RideReminderService : BackgroundService
    {
        private readonly ILogger<RideReminderService> _logger;
        private readonly IServiceProvider _serviceProvider;

        public RideReminderService(ILogger<RideReminderService> logger, IServiceProvider serviceProvider)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                await ProcessRemindersAsync(stoppingToken);

                // Run every 5 minutes
                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
            }
        }

        private async Task ProcessRemindersAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("RideReminderService is checking for upcoming rides...");

            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var fcmService = scope.ServiceProvider.GetRequiredService<FcmService>();

            var now = DateTime.UtcNow;
            var windowStart = now.AddMinutes(25);
            var windowEnd = now.AddMinutes(35);

            // Find routes that are starting within the 25-35 minute window
            var upcomingRoutes = await context.Routes
                .Include(r => r.Vehicle)
                .Where(r => r.Status == "Published" && r.StartTime >= windowStart && r.StartTime <= windowEnd)
                .ToListAsync(stoppingToken);

            foreach (var route in upcomingRoutes)
            {
                // Find all approved bookings for this route
                var bookings = await context.Bookings
                    .Include(b => b.User)
                    .Where(b => b.RouteId == route.Id && b.Status == "Approved")
                    .ToListAsync(stoppingToken);

                foreach (var booking in bookings)
                {
                    // Check if a reminder has already been sent
                    var hasReminder = await context.Notifications
                        .AnyAsync(n => n.UserId == booking.UserId && n.Title.Contains("starts in 30 mins"), stoppingToken);

                    if (hasReminder) continue;

                    string vehicleInfo = "the driver's car";
                    if (route.Vehicle != null)
                    {
                        vehicleInfo = $"{route.Vehicle.Color} {route.Vehicle.Make} {route.Vehicle.Model} ({route.Vehicle.LicensePlate})";
                    }

                    var notification = new Notification
                    {
                        UserId = booking.UserId,
                        Title = "Your ride starts in 30 mins \ud83d\ude97",
                        Message = $"Head to {booking.PickupLocationName}. Look for {vehicleInfo}.",
                        Type = "info"
                    };

                    context.Notifications.Add(notification);

                    if (booking.User?.FcmDeviceToken != null)
                    {
                        await fcmService.SendNotificationAsync(booking.User.FcmDeviceToken, notification.Title, notification.Message);
                    }
                }
            }

            await context.SaveChangesAsync(stoppingToken);
            _logger.LogInformation("RideReminderService finished processing.");
        }
    }
}
