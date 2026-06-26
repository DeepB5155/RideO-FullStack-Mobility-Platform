using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RideO.API.Data;
using RideO.API.Models;
using System;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace RideO.API.Controllers
{
    using RideO.API.Services;

    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Driver")]
    public class KYCController : ControllerBase
    {
        private readonly AppDbContext _context;

        public KYCController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost("upload")]
        public async Task<IActionResult> UploadDocument(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file provided.");

            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "kyc");
            if (!Directory.Exists(uploadsFolder))
                Directory.CreateDirectory(uploadsFolder);

            var uniqueFileName = $"{Guid.NewGuid()}_{Path.GetFileName(file.FileName)}";
            var filePath = Path.Combine(uploadsFolder, uniqueFileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Return relative URL for static file serving
            return Ok(new { url = $"/uploads/kyc/{uniqueFileName}" });
        }

        public class SubmitKYCRequest
        {
            public string LicenseFrontUrl { get; set; } = string.Empty;
            public string LicenseBackUrl { get; set; } = string.Empty;
            public string RCUrl { get; set; } = string.Empty;
            public string LicenseNumber { get; set; } = string.Empty;
            public string PhoneNumber { get; set; } = string.Empty;
            
            // Vehicle Details
            public string Make { get; set; } = string.Empty;
            public string Model { get; set; } = string.Empty;
            public int Year { get; set; }
            public string Color { get; set; } = string.Empty;
            public string LicensePlate { get; set; } = string.Empty;
            public int TotalSeats { get; set; } = 4;
        }

        [HttpPost("submit")]
        public async Task<IActionResult> SubmitKYC([FromBody] SubmitKYCRequest request)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub);
            if (string.IsNullOrEmpty(userIdString)) return Unauthorized("User ID claim is missing.");
            var userId = Guid.Parse(userIdString);

            // Update Phone Number in User table
            var user = await _context.Users.FindAsync(userId);
            if (user != null && !string.IsNullOrWhiteSpace(request.PhoneNumber))
            {
                user.PhoneNumber = request.PhoneNumber;
            }

            // Ensure Driver record exists
            var driver = await _context.Drivers.FirstOrDefaultAsync(d => d.UserId == userId);
            if (driver == null)
            {
                driver = new Driver
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    LicenseNumber = request.LicenseNumber,
                    IsVerified = false,
                    Rating = 5.0m
                };
                _context.Drivers.Add(driver);
            }
            else
            {
                driver.LicenseNumber = request.LicenseNumber;
                driver.IsVerified = false; // Reset verification on new submission
            }

            // Ensure Vehicle record exists
            var vehicle = await _context.Vehicles.FirstOrDefaultAsync(v => v.DriverId == driver.Id);
            if (vehicle == null)
            {
                vehicle = new Vehicle
                {
                    Id = Guid.NewGuid(),
                    DriverId = driver.Id,
                    Make = request.Make,
                    Model = request.Model,
                    Year = request.Year,
                    Color = request.Color,
                    LicensePlate = request.LicensePlate,
                    TotalSeats = request.TotalSeats
                };
                _context.Vehicles.Add(vehicle);
            }
            else
            {
                vehicle.Make = request.Make;
                vehicle.Model = request.Model;
                vehicle.Year = request.Year;
                vehicle.Color = request.Color;
                vehicle.LicensePlate = request.LicensePlate;
                vehicle.TotalSeats = request.TotalSeats;
            }

            // Remove old pending/rejected documents
            var oldDocs = await _context.DriverDocuments.Where(d => d.DriverId == driver.Id).ToListAsync();
            _context.DriverDocuments.RemoveRange(oldDocs);

            // Add new documents
            _context.DriverDocuments.AddRange(
                new DriverDocument { DriverId = driver.Id, DocumentType = "LicenseFront", DocumentUrl = request.LicenseFrontUrl },
                new DriverDocument { DriverId = driver.Id, DocumentType = "LicenseBack", DocumentUrl = request.LicenseBackUrl },
                new DriverDocument { DriverId = driver.Id, DocumentType = "RC", DocumentUrl = request.RCUrl }
            );

            await _context.SaveChangesAsync();
            return Ok(new { message = "KYC and Vehicle details submitted successfully. Pending Admin review." });
        }

        [HttpGet("status")]
        public async Task<IActionResult> GetStatus()
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub);
            if (string.IsNullOrEmpty(userIdString)) return Unauthorized("User ID claim is missing.");
            var userId = Guid.Parse(userIdString);

            var driver = await _context.Drivers.FirstOrDefaultAsync(d => d.UserId == userId);
            if (driver == null)
                return Ok(new { status = "NotSubmitted", isVerified = false });

            var vehicle = await _context.Vehicles.FirstOrDefaultAsync(v => v.DriverId == driver.Id);
            var vehicleId = vehicle?.Id;

            var documents = await _context.DriverDocuments.Where(d => d.DriverId == driver.Id).ToListAsync();
            if (documents.Count == 0)
                return Ok(new { status = "NotSubmitted", isVerified = false });

            if (driver.IsVerified)
                return Ok(new { status = "Approved", isVerified = true, vehicleId, licenseNumber = driver.LicenseNumber });

            if (documents.Any(d => d.Status == "Rejected"))
                return Ok(new { status = "Rejected", isVerified = false, vehicleId, licenseNumber = driver.LicenseNumber });

            return Ok(new { status = "Pending", isVerified = false, vehicleId, licenseNumber = driver.LicenseNumber });
        }
    }
}
