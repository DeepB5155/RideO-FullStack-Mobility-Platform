using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RideO.API.Data;
using RideO.API.Models;
using MongoDB.Driver;
using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using RideO.API.Hubs;

using Microsoft.AspNetCore.Authorization;

namespace RideO.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "User")]
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
        public async Task<IActionResult> RequestRide()
        {
            // TODO: Refactor this endpoint to create a Booking on a Route instead of a legacy Ride.
            return BadRequest("Ride endpoint is currently being refactored to Carpool Bookings.");
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
