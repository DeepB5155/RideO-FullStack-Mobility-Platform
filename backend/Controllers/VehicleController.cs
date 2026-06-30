using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RideO.API.Data;
using RideO.API.Models;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace RideO.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Driver")]
    public class VehicleController : ControllerBase
    {
        private readonly AppDbContext _context;

        public VehicleController(AppDbContext context)
        {
            _context = context;
        }

        public class UpdateVehicleRequest
        {
            public string Make { get; set; } = string.Empty;
            public string Model { get; set; } = string.Empty;
            public int Year { get; set; }
            public string Color { get; set; } = string.Empty;
            public string LicensePlate { get; set; } = string.Empty;
            public string VehicleType { get; set; } = string.Empty;
            public int TotalSeats { get; set; } = 4;
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateVehicle(Guid id, [FromBody] UpdateVehicleRequest request)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub);
            if (string.IsNullOrEmpty(userIdString)) return Unauthorized("User ID claim is missing.");
            var userId = Guid.Parse(userIdString);

            var driver = await _context.Drivers.FirstOrDefaultAsync(d => d.UserId == userId);
            if (driver == null) return Unauthorized("Driver profile not found.");

            var vehicle = await _context.Vehicles.FirstOrDefaultAsync(v => v.Id == id && v.DriverId == driver.Id);
            if (vehicle == null) return NotFound("Vehicle not found.");

            vehicle.Make = request.Make;
            vehicle.Model = request.Model;
            vehicle.Year = request.Year;
            vehicle.Color = request.Color;
            vehicle.LicensePlate = request.LicensePlate;
            vehicle.VehicleType = request.VehicleType;
            vehicle.TotalSeats = request.TotalSeats;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Vehicle updated successfully", vehicle });
        }
        
        [HttpGet("my")]
        public async Task<IActionResult> GetMyVehicle()
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub);
            if (string.IsNullOrEmpty(userIdString)) return Unauthorized("User ID claim is missing.");
            var userId = Guid.Parse(userIdString);

            var driver = await _context.Drivers.FirstOrDefaultAsync(d => d.UserId == userId);
            if (driver == null) return Unauthorized("Driver profile not found.");

            var vehicle = await _context.Vehicles.FirstOrDefaultAsync(v => v.DriverId == driver.Id);
            if (vehicle == null) return NotFound("Vehicle not found.");

            return Ok(vehicle);
        }
    }
}
