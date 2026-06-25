using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using RideO.API.Data;
using RideO.API.Models;
using System;
using System.Security.Claims;

namespace RideO.API.Hubs
{
    [Authorize]
    public class RideHub : Hub
    {
        private readonly MongoDbContext _mongoDb;

        public RideHub(MongoDbContext mongoDb)
        {
            _mongoDb = mongoDb;
        }

        // Users call this when opening LiveTrackingScreen
        public async Task JoinRouteGroup(string routeId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"Route_{routeId}");
        }

        // Users call this when leaving the tracking screen
        public async Task LeaveRouteGroup(string routeId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Route_{routeId}");
        }

        // Driver calls this from ActiveRideScreen every 5 seconds
        public async Task UpdateRouteLocation(string routeId, double lat, double lng)
        {
            var driverUserId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier) ?? "Unknown";

            // 1. Broadcast to Users watching this route
            await Clients.Group($"Route_{routeId}").SendAsync("ReceiveRouteLocation", routeId, lat, lng);
            
            // 2. Broadcast to Admin Monitors
            await Clients.Group("AdminMonitors").SendAsync("ReceiveDriverLocation", driverUserId, routeId, lat, lng);

            // 3. Log to MongoDB for auditing
            var locationLog = new LocationLog
            {
                DriverId = driverUserId,
                Location = new GeoJsonPoint
                {
                    Coordinates = new double[] { lng, lat } // GeoJSON is [longitude, latitude]
                },
                Timestamp = DateTime.UtcNow
            };
            await _mongoDb.LocationLogs.InsertOneAsync(locationLog);
        }

        // Admin calls this to listen to all drivers globally
        [Authorize(Roles = "Admin")]
        public async Task JoinAdminMonitors()
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, "AdminMonitors");
        }

        // Legacy methods for initial setup
        public async Task SendRideRequestToDrivers(string rideId, string pickupLocation)
        {
            await Clients.Group("AvailableDrivers").SendAsync("NewRideRequest", rideId, pickupLocation);
        }

        public async Task JoinDriverGroup()
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, "AvailableDrivers");
        }
    }
}
