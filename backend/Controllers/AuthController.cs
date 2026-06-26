using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RideO.API.Data;
using RideO.API.Models;
using System;
using System.Threading.Tasks;
using BCrypt.Net;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace RideO.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        private string GenerateJwtToken(User user)
        {
            var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET") ?? "FallbackSecretIfMissing2026!@#$";
            var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "RideO_Backend";
            var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? "RideO_MobileApp";

            var key = Encoding.UTF8.GetBytes(jwtSecret);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim("FullName", user.FullName)
            };

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddDays(7),
                Issuer = jwtIssuer,
                Audience = jwtAudience,
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
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

            if (user.IsBlocked)
            {
                return StatusCode(403, new { message = "Your account has been suspended by an administrator." });
            }

            var token = GenerateJwtToken(user);

            return Ok(new { token, user });
        }

        [HttpPost("admin-login")]
        public async Task<IActionResult> AdminLogin([FromBody] LoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest("Email and Password are required.");
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email && u.Role == "Admin");
            
            // Temporary hardcoded fallback for first-time setup if no admin in DB
            if (user == null && request.Email == "admin" && request.Password == "admin123")
            {
                user = new User { Id = Guid.NewGuid(), Email = "admin@rideo.com", FullName = "System Admin", Role = "Admin" };
            }
            else if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                return Unauthorized("Invalid admin credentials.");
            }

            if (user.IsBlocked)
                return StatusCode(403, new { message = "Your account has been suspended by an administrator." });

            var token = GenerateJwtToken(user);
            return Ok(new { token, user });
        }

        public class RegisterRequest
        {
            public string FullName { get; set; } = string.Empty;
            public string Email { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
            public string? PhoneNumber { get; set; }
            public string Role { get; set; } = "User";
            public string? ReferralCode { get; set; }
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

            Guid? referredByUserId = null;
            if (!string.IsNullOrWhiteSpace(request.ReferralCode))
            {
                var referrer = await _context.Users.FirstOrDefaultAsync(u => u.ReferralCode == request.ReferralCode.ToUpper());
                if (referrer != null)
                {
                    referredByUserId = referrer.Id;
                }
            }

            var user = new User
            {
                Id = Guid.NewGuid(),
                FullName = request.FullName,
                Email = request.Email,
                PhoneNumber = request.PhoneNumber,
                Role = request.Role,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                CreatedAt = DateTime.UtcNow,
                ReferralCode = $"RIDE{Guid.NewGuid().ToString().Substring(0, 6).ToUpper()}",
                ReferredByUserId = referredByUserId
            };

            _context.Users.Add(user);

            // Add wallet for new user
            var newWallet = new Wallet { Id = Guid.NewGuid(), UserId = user.Id, Balance = 0 };
            _context.Wallets.Add(newWallet);

            // Process referral bonus if applicable
            if (referredByUserId.HasValue)
            {
                var referrerWallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == referredByUserId.Value);
                if (referrerWallet != null)
                {
                    // Bonus to referrer
                    referrerWallet.Balance += 50;
                    _context.WalletTransactions.Add(new WalletTransaction
                    {
                        WalletId = referrerWallet.Id,
                        Amount = 50,
                        Type = "ReferralBonus",
                        Description = $"Referral bonus for inviting {user.FullName}"
                    });

                    // Bonus to new user
                    newWallet.Balance += 50;
                    _context.WalletTransactions.Add(new WalletTransaction
                    {
                        WalletId = newWallet.Id,
                        Amount = 50,
                        Type = "ReferralBonus",
                        Description = "Sign-up bonus via referral code"
                    });
                }
            }

            await _context.SaveChangesAsync();

            var token = GenerateJwtToken(user);

            return Ok(new { message = "User registered successfully", token, user });
        }

        public class ForgotPasswordRequest
        {
            public string Email { get; set; } = string.Empty;
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
            if (user == null) return Ok(new { message = "If the email exists, a reset link was sent." });

            user.ResetToken = Guid.NewGuid().ToString().Replace("-", "");
            user.ResetTokenExpiry = DateTime.UtcNow.AddHours(1);
            await _context.SaveChangesAsync();

            // In production, send an email here.
            return Ok(new { message = "If the email exists, a reset link was sent.", debug_token = user.ResetToken });
        }

        public class ResetPasswordRequest
        {
            public string Token { get; set; } = string.Empty;
            public string NewPassword { get; set; } = string.Empty;
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.ResetToken == request.Token && u.ResetTokenExpiry > DateTime.UtcNow);
            if (user == null) return BadRequest("Invalid or expired reset token.");

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            user.ResetToken = null;
            user.ResetTokenExpiry = null;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Password reset successful. You can now login." });
        }

        public class UpdateFcmTokenRequest
        {
            public string Token { get; set; } = string.Empty;
        }

        [Microsoft.AspNetCore.Authorization.Authorize]
        [HttpPost("update-fcm-token")]
        public async Task<IActionResult> UpdateFcmToken([FromBody] UpdateFcmTokenRequest request)
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Unauthorized();

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound();

            user.FcmDeviceToken = request.Token;
            await _context.SaveChangesAsync();

            return Ok(new { message = "FCM token updated successfully." });
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
