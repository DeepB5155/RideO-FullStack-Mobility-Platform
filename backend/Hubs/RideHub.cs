using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace RideO.API.Hubs
{
    public class RideHub : Hub
    {
        public async Task BroadcastDriverLocation(string driverId, double lat, double lng)
        {
            await Clients.All.SendAsync("ReceiveDriverLocation", driverId, lat, lng);
        }

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
