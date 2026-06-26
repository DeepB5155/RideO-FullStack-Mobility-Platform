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

            var tomorrow = DateTime.UtcNow.AddDays(1);
            var dayOfWeekStr = tomorrow.DayOfWeek.ToString().Substring(0, 3); // "Mon", "Tue", etc.

            // Find all routes that are recurring, active (Status=Published or Completed), and recur on tomorrow's day
            var recurringRoutes = await dbContext.Routes
                .Where(r => r.IsRecurring && r.RecurringDays != null && r.RecurringDays.Contains(dayOfWeekStr))
                // For simplicity, we assume the original route is kept as a template, 
                // or we clone it for the new day. Let's find templates.
                .ToListAsync();

            // Note: In a real production system, you would have a separate 'RouteTemplate' table.
            // For this project, we'll assume the original route acts as a template if IsRecurring = true.
            // We need to ensure we haven't already created a route for tomorrow for this driver.

            foreach (var template in recurringRoutes)
            {
                if (template.RecurringTime == null) continue;

                // Target start time for tomorrow
                var newStartTime = tomorrow.Date + template.RecurringTime.Value;

                // Check if a route already exists for this driver around this time
                var existingRoute = await dbContext.Routes.FirstOrDefaultAsync(r => 
                    r.DriverId == template.DriverId && 
                    r.StartTime >= newStartTime.AddHours(-1) && 
                    r.StartTime <= newStartTime.AddHours(1) &&
                    r.Id != template.Id);

                if (existingRoute == null)
                {
                    // Create new route for tomorrow
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
                        IsRecurring = false // The generated instances are NOT recurring templates themselves
                    };

                    dbContext.Routes.Add(newRoute);
                    await dbContext.SaveChangesAsync(); // Save to get the new RouteId

                    // Now process any RecurringBookings subscribed to this template
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
                    _logger.LogInformation($"Auto-published recurring route {newRoute.Id} for driver {template.DriverId}");
                }
            }
        }
    }
}
