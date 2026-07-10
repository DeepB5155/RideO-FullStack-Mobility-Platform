using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using RideO.API.Data;
using RideO.API.Models;
using System;
using System.Security.Claims;
using System.Collections.Concurrent;

namespace RideO.API.Hubs
{
    [Authorize]
    public class RideHub : Hub
    {
        private readonly MongoDbContext _mongoDb;
        private readonly AppDbContext _appDb;

        // Stores live driver locations for on-demand matchmaking
        public static readonly ConcurrentDictionary<string, (double Lat, double Lng, DateTime LastUpdated)> OnlineDrivers = new();

        public RideHub(MongoDbContext mongoDb, AppDbContext appDb)
        {
            _mongoDb = mongoDb;
            _appDb = appDb;
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

        // Driver calls this from HomeScreen when online but not in a ride
        public async Task BroadcastDriverLocation(string driverUserId, double lat, double lng)
        {
            OnlineDrivers[driverUserId] = (lat, lng, DateTime.UtcNow);

            // Broadcast to Admin Monitors (null for routeId since they are idle)
            await Clients.Group("AdminMonitors").SendAsync("ReceiveDriverLocation", driverUserId, null, lat, lng);

            // Log to MongoDB for auditing
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

        // --- CHAT LOGIC ---

        public async Task JoinChat(string bookingId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"Chat_{bookingId}");
        }

        public async Task LeaveChat(string bookingId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Chat_{bookingId}");
        }

        public async Task SendMessage(string bookingId, string content)
        {
            var userIdString = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdString)) return;

            var userId = Guid.Parse(userIdString);
            var bId = Guid.Parse(bookingId);

            var booking = await _appDb.Bookings.FindAsync(bId);
            if (booking == null) return;

            // Enforce chat rules
            if (booking.Status != "Approved" && booking.Status != "Started") return;

            var message = new ChatMessage
            {
                BookingId = bId,
                SenderId = userId,
                Content = content,
                SentAt = DateTime.UtcNow
            };

            _appDb.ChatMessages.Add(message);
            await _appDb.SaveChangesAsync();

            var sender = await _appDb.Users.FindAsync(userId);

            await Clients.Group($"Chat_{bookingId}").SendAsync("ReceiveMessage", new {
                message.Id,
                message.SenderId,
                SenderName = sender?.FullName ?? "Unknown",
                message.Content,
                message.SentAt
            });
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
