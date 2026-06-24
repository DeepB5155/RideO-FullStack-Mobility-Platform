using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RideO.API.Data;
using RideO.API.Models;
using System;
using System.Threading.Tasks;
using BCrypt.Net;

namespace RideO.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AuthController(AppDbContext context)
        {
            _context = context;
        }

        public class LoginRequest
        {
            public string Email { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest("Email and Password are required.");
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
            if (user == null)
            {
                return Unauthorized("Invalid email or password.");
            }

            bool isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
            if (!isPasswordValid)
            {
                return Unauthorized("Invalid email or password.");
            }

            // In a full production app, you would generate and return a JWT token here.
            // For now, we return the user object as expected by the frontend MVP.
            return Ok(user);
        }

        public class RegisterRequest
        {
            public string FullName { get; set; } = string.Empty;
            public string Email { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
            public string? PhoneNumber { get; set; }
            public string Role { get; set; } = "User";
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password) || string.IsNullOrWhiteSpace(request.FullName))
            {
                return BadRequest("FullName, Email, and Password are required.");
            }

            if (await _context.Users.AnyAsync(u => u.Email == request.Email))
            {
                return Conflict("Email is already registered.");
            }

            var user = new User
            {
                Id = Guid.NewGuid(),
                FullName = request.FullName,
                Email = request.Email,
                PhoneNumber = request.PhoneNumber,
                Role = request.Role,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "User registered successfully", userId = user.Id });
        }

        [HttpGet("seed-driver")]
        public async Task<IActionResult> SeedDriver()
        {
            var driverEmail = "driver@test.com";
            
            if (await _context.Users.AnyAsync(u => u.Email == driverEmail))
            {
                return Ok("Test driver already exists.");
            }

            var user = new User
            {
                Id = Guid.NewGuid(),
                FullName = "Test Driver",
                Email = driverEmail,
                Role = "Driver",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
                CreatedAt = DateTime.UtcNow
            };

            var driver = new Driver
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                LicenseNumber = "LIC-TEST-001",
                VehicleType = "SUV",
                IsAvailable = true,
                Rating = 5.0m
            };

            _context.Users.Add(user);
            _context.Drivers.Add(driver);
            await _context.SaveChangesAsync();

            return Ok(new { 
                message = "Test driver seeded successfully!", 
                email = driverEmail, 
                password = "password123" 
            });
        }
    }
}
