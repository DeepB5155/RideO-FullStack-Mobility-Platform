using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using RideO.API.Data;
using RideO.API.Models;

namespace RideO.API.Services
{
    public class RecurringRouteService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<RecurringRouteService> _logger;

        public RecurringRouteService(IServiceProvider serviceProvider, ILogger<RecurringRouteService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("RecurringRouteService is starting.");

            // Run this loop every hour to check for routes that need to be auto-published for the next day
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessRecurringRoutesAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred executing RecurringRouteService.");
                }

                // Wait for 1 hour before running again
                await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
            }
        }

        private async Task ProcessRecurringRoutesAsync()
        {
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            // Find all templates
            var recurringRoutes = await dbContext.Routes
                .Where(r => r.IsRecurring && r.RecurringDays != null)
                .ToListAsync();

            // Look ahead for the next 7 days (including today) to ensure no missed routes
            var todayUtc = DateTime.UtcNow.Date;

            for (int i = 0; i <= 7; i++)
            {
                var targetDate = todayUtc.AddDays(i);
                var dayOfWeekStr = targetDate.DayOfWeek.ToString().Substring(0, 3); // "Mon", "Tue", etc.

                var templatesForDay = recurringRoutes.Where(r => r.RecurringDays!.Contains(dayOfWeekStr)).ToList();

                foreach (var template in templatesForDay)
                {
                    // Target start time based strictly on the original template's StartTime time component
                    var newStartTime = targetDate + template.StartTime.TimeOfDay;

                    // If it's already past, don't auto-generate it
                    if (newStartTime < DateTime.UtcNow) continue;

                    // Check if a route already exists for this driver around this time on this day
                    var existingRoute = await dbContext.Routes.FirstOrDefaultAsync(r => 
                        r.DriverId == template.DriverId && 
                        r.StartTime >= newStartTime.AddHours(-1) && 
                        r.StartTime <= newStartTime.AddHours(1) &&
                        r.Id != template.Id);

                    if (existingRoute == null)
                    {
                        // Create new route
                        var newRoute = new RideO.API.Models.Route
                        {
                            DriverId = template.DriverId,
                            VehicleId = template.VehicleId,
                            StartLocation = template.StartLocation,
                            StartLat = template.StartLat,
                            StartLng = template.StartLng,
                            EndLocation = template.EndLocation,
                            EndLat = template.EndLat,
                            EndLng = template.EndLng,
                            StartTime = newStartTime,
                            EstimatedEndTime = newStartTime + (template.EstimatedEndTime - template.StartTime),
                            AvailableSeats = 4, // Reset to 4 (or use template capacity)
                            PricePerSeat = template.PricePerSeat,
                            IsLuggageAllowed = template.IsLuggageAllowed,
                            AutoApprove = template.AutoApprove,
                            Status = "Published",
                            IsRecurring = false // Generated instances are NOT recurring templates
                        };

                        dbContext.Routes.Add(newRoute);
                        await dbContext.SaveChangesAsync(); // Save to get the new RouteId

                        // Process any RecurringBookings subscribed to this template
                        var subscriptions = await dbContext.RecurringBookings
                            .Where(rb => rb.OriginalRouteId == template.Id && rb.IsActive)
                            .ToListAsync();

                        foreach (var sub in subscriptions)
                        {
                            var newBooking = new Booking
                            {
                                RouteId = newRoute.Id,
                                UserId = sub.UserId,
                                SeatsBooked = sub.SeatsBooked,
                                TotalFare = sub.TotalFarePerRide,
                                Status = template.AutoApprove ? "Approved" : "Pending",
                                PaymentMethod = "Cash",
                                BookedAt = DateTime.UtcNow
                            };

                            if (template.AutoApprove)
                            {
                                newRoute.AvailableSeats -= sub.SeatsBooked;
                            }

                            dbContext.Bookings.Add(newBooking);
                        }

                        await dbContext.SaveChangesAsync();
                        _logger.LogInformation($"Auto-published recurring route {newRoute.Id} for driver {template.DriverId} on {newStartTime}");
                    }
                }
            }
        }
    }
}
