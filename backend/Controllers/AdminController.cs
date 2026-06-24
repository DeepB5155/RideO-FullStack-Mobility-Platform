using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MongoDB.Driver;
using RideO.API.Data;
using RideO.API.Models;
using System.Linq;
using System.Threading.Tasks;

namespace RideO.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AdminController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly MongoDbContext _mongoContext;

        public AdminController(AppDbContext context, MongoDbContext mongoContext)
        {
            _context = context;
            _mongoContext = mongoContext;
        }

        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboardStats()
        {
            var totalRides = await _context.Rides.CountAsync();
            var activeDrivers = await _context.Drivers.CountAsync(d => d.IsAvailable);
            var registeredUsers = await _context.Users.CountAsync();
            
            var revenue = await _context.Payments.SumAsync(p => p.Amount) + (totalRides * 15.5m);

            return Ok(new
            {
                TotalRides = totalRides,
                ActiveDrivers = activeDrivers,
                RegisteredUsers = registeredUsers,
                Revenue = revenue
            });
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _context.Users.OrderByDescending(u => u.CreatedAt).ToListAsync();
            return Ok(users);
        }

        [HttpGet("drivers")]
        public async Task<IActionResult> GetDrivers()
        {
            var drivers = await _context.Drivers
                .Include(d => d.User)
                .OrderByDescending(d => d.Id)
                .ToListAsync();
            return Ok(drivers);
        }

        [HttpGet("rides")]
        public async Task<IActionResult> GetRides()
        {
            var rides = await _context.Rides
                .Include(r => r.User)
                .Include(r => r.Driver)
                .OrderByDescending(r => r.RequestedAt)
                .ToListAsync();
            return Ok(rides);
        }

        [HttpGet("live-locations")]
        public async Task<IActionResult> GetLiveLocations()
        {
            // For a real production app, we would query the most recent location per driver.
            // For this admin panel implementation, we'll fetch recent location logs.
            var recentLogs = await _mongoContext.LocationLogs
                .Find(_ => true) // In production, filter by timestamp > DateTime.UtcNow.AddMinutes(-15)
                .SortByDescending(l => l.Timestamp)
                .Limit(50)
                .ToListAsync();

            // Group by DriverId to ensure we only return the latest ping per driver
            var activeLocations = recentLogs
                .GroupBy(l => l.DriverId)
                .Select(g => g.First())
                .ToList();

            return Ok(activeLocations);
        }
    }
}
