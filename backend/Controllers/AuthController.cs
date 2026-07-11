using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
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
using Microsoft.AspNetCore.SignalR;
using RideO.API.Hubs;

namespace RideO.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IHubContext<RideHub> _hubContext;

        public AuthController(AppDbContext context, IConfiguration configuration, IHubContext<RideHub> hubContext)
        {
            _context = context;
            _configuration = configuration;
            _hubContext = hubContext;
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
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
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

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email || u.PhoneNumber == request.Email);
            if (user == null)
            {
                return Unauthorized("Account not found. Please register first.");
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

            if (user.Role == "Driver")
            {
                var driver = await _context.Drivers.FirstOrDefaultAsync(d => d.UserId == user.Id);
                if (driver != null && driver.IsSuspended)
                {
                    return StatusCode(403, new { message = "Your driver account is suspended. Contact support." });
                }

                var token = GenerateJwtToken(user);
                return Ok(new { 
                    token, 
                    user = new { 
                        id = user.Id, 
                        fullName = user.FullName, 
                        email = user.Email, 
                        phoneNumber = user.PhoneNumber,
                        role = user.Role, 
                        isVerified = driver?.IsVerified ?? false
                    } 
                });
            }

            var defaultToken = GenerateJwtToken(user);
            return Ok(new { token = defaultToken, user });
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

        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> GetMe()
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Unauthorized();

            var user = await _context.Users
                .Where(u => u.Id == userId)
                .Select(u => new {
                    u.Id,
                    u.FullName,
                    u.Email,
                    u.PhoneNumber,
                    u.Role,
                    u.AverageRating,
                    u.ReferralCode,
                    u.CreatedAt
                })
                .FirstOrDefaultAsync();

            if (user == null) return NotFound();

            return Ok(user);
        }

        public class UpdateProfileRequest
        {
            public string FullName { get; set; } = string.Empty;
            public string PhoneNumber { get; set; } = string.Empty;
            public string Email { get; set; } = string.Empty;
        }

        [Authorize]
        [HttpGet("driver-status")]
        public async Task<IActionResult> GetDriverStatus()
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Unauthorized();

            var driver = await _context.Drivers.FirstOrDefaultAsync(d => d.UserId == userId);
            if (driver == null) return NotFound("Driver not found");

            return Ok(new { isAvailable = driver.IsAvailable });
        }

        public class UpdateDriverStatusRequest
        {
            public bool IsAvailable { get; set; }
        }

        [Authorize]
        [HttpPut("driver-status")]
        public async Task<IActionResult> UpdateDriverStatus([FromBody] UpdateDriverStatusRequest request)
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Unauthorized();

            var driver = await _context.Drivers.FirstOrDefaultAsync(d => d.UserId == userId);
            if (driver == null) return NotFound("Driver not found");

            driver.IsAvailable = request.IsAvailable;
            await _context.SaveChangesAsync();
            
            await _hubContext.Clients.Group("AdminMonitors").SendAsync("DriverStatusChanged", driver.Id, request.IsAvailable);

            return Ok(new { message = "Status updated", isAvailable = driver.IsAvailable });
        }

        [Authorize]
        [HttpPut("me")]
        public async Task<IActionResult> UpdateMe([FromBody] UpdateProfileRequest request)
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Unauthorized();

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound();

            if (!string.IsNullOrWhiteSpace(request.Email) && request.Email != user.Email)
            {
                var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
                if (existingUser != null)
                {
                    return BadRequest(new { message = "This email address is already in use by another account." });
                }
                user.Email = request.Email;
            }

            user.FullName = request.FullName;
            user.PhoneNumber = request.PhoneNumber;
            await _context.SaveChangesAsync();

            var token = GenerateJwtToken(user);

            return Ok(new { message = "Profile updated successfully.", token, user });
        }

        public class VerifyPasswordRequest
        {
            public string CurrentPassword { get; set; } = string.Empty;
        }

        [Authorize]
        [HttpPost("verify-password")]
        public async Task<IActionResult> VerifyPassword([FromBody] VerifyPasswordRequest request)
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Unauthorized();

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound();

            if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
                return BadRequest(new { message = "Incorrect current password." });

            return Ok(new { message = "Password verified successfully." });
        }

        public class ChangePasswordRequest
        {
            public string CurrentPassword { get; set; } = string.Empty;
            public string NewPassword { get; set; } = string.Empty;
        }

        [Authorize]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Unauthorized();

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound();

            if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
                return BadRequest(new { message = "Incorrect current password." });

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Password changed successfully." });
        }

        [Authorize]
        [HttpDelete("account")]
        public async Task<IActionResult> DeleteAccount()
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Unauthorized();

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound();

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Account deleted successfully." });
        }

        [HttpGet("update-passwords")]
        public async Task<IActionResult> UpdatePasswords()
        {
            var accounts = new[]
            {
                new { Email = "admin@gmail.com", Role = "Admin", Name = "Admin User" },
                new { Email = "driver@gmail.com", Role = "Driver", Name = "Driver User" },
                new { Email = "user@gmail.com", Role = "User", Name = "Passenger User" }
            };

            var updated = 0;
            var created = 0;

            foreach (var acc in accounts)
            {
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == acc.Email);
                if (user != null)
                {
                    user.PasswordHash = BCrypt.Net.BCrypt.HashPassword("Pass@123");
                    updated++;
                }
                else
                {
                    user = new User
                    {
                        Id = Guid.NewGuid(),
                        FullName = acc.Name,
                        Email = acc.Email,
                        Role = acc.Role,
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword("Pass@123"),
                        CreatedAt = DateTime.UtcNow,
                        IsVerified = true
                    };
                    _context.Users.Add(user);
                    
                    if (acc.Role == "Driver")
                    {
                        _context.Drivers.Add(new Driver
                        {
                            Id = Guid.NewGuid(),
                            UserId = user.Id,
                            LicenseNumber = "DL-NEW-000",
                            VehicleType = "Sedan",
                            IsAvailable = true,
                            Rating = 5.0m
                        });
                    }
                    created++;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = $"Passwords updated. Created: {created}, Updated: {updated}" });
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
