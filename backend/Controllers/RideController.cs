using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RideO.API.Data;
using RideO.API.Models;
using MongoDB.Driver;
using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using RideO.API.Hubs;

namespace RideO.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RideController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly MongoDbContext _mongoContext;
        private readonly IHubContext<RideHub> _hubContext;

        public RideController(AppDbContext context, MongoDbContext mongoContext, IHubContext<RideHub> hubContext)
        {
            _context = context;
            _mongoContext = mongoContext;
            _hubContext = hubContext;
        }

        [HttpPost("request")]
        public async Task<IActionResult> RequestRide([FromBody] Ride rideRequest)
        {
            rideRequest.Status = "Requested";
            rideRequest.RequestedAt = DateTime.UtcNow;

            _context.Rides.Add(rideRequest);
            await _context.SaveChangesAsync();

            await _hubContext.Clients.Group("Drivers").SendAsync("NewRideRequest", new {
                id = rideRequest.Id,
                pickupLocation = rideRequest.PickupLocation,
                dropoffLocation = rideRequest.DropoffLocation,
                fare = rideRequest.Fare,
                userId = rideRequest.UserId
            });

            return Ok(rideRequest);
        }

        [HttpGet("{id}/location-logs")]
        public async Task<IActionResult> GetRideLocationLogs(string id)
        {
            var logs = await _mongoContext.LocationLogs
                .Find(log => log.DriverId == id)
                .ToListAsync();

            return Ok(logs);
        }
    }
}
