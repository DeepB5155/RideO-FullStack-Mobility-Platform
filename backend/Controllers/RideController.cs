using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RideO.API.Data;
using RideO.API.Models;
using MongoDB.Driver;
using System;
using System.Threading.Tasks;

namespace RideO.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RideController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly MongoDbContext _mongoContext;

        public RideController(AppDbContext context, MongoDbContext mongoContext)
        {
            _context = context;
            _mongoContext = mongoContext;
        }

        [HttpPost("request")]
        public async Task<IActionResult> RequestRide([FromBody] Ride rideRequest)
        {
            rideRequest.Status = "Requested";
            rideRequest.RequestedAt = DateTime.UtcNow;

            _context.Rides.Add(rideRequest);
            await _context.SaveChangesAsync();

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
