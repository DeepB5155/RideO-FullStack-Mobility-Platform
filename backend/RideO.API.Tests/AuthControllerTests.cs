using System;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;
using RideO.API.Controllers;
using RideO.API.Data;
using RideO.API.Models;
using Xunit;
using Microsoft.AspNetCore.SignalR;
using RideO.API.Hubs;
using System.Security.Cryptography;
using System.Text;
using Newtonsoft.Json.Linq;

namespace RideO.API.Tests
{
    public class AuthControllerTests : IDisposable
    {
        private readonly AppDbContext _context;
        private readonly Mock<IConfiguration> _configMock;
        private readonly Mock<IWebHostEnvironment> _envMock;
        private readonly Mock<IHubContext<RideHub>> _hubMock;
        private readonly AuthController _controller;

        public AuthControllerTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new AppDbContext(options);
            _configMock = new Mock<IConfiguration>();
            _envMock = new Mock<IWebHostEnvironment>();
            _hubMock = new Mock<IHubContext<RideHub>>();

            _envMock.Setup(e => e.EnvironmentName).Returns("Development");

            _controller = new AuthController(_context, _configMock.Object, _hubMock.Object, _envMock.Object);
        }

        private string ComputeSha256Hash(string rawData)
        {
            using (SHA256 sha256Hash = SHA256.Create())
            {
                byte[] bytes = sha256Hash.ComputeHash(Encoding.UTF8.GetBytes(rawData));
                StringBuilder builder = new StringBuilder();
                for (int i = 0; i < bytes.Length; i++)
                {
                    builder.Append(bytes[i].ToString("x2"));
                }
                return builder.ToString();
            }
        }

        [Fact]
        public async Task ForgotPassword_ExistingAccount_ReturnsOkWithDebugTokenInDev()
        {
            _envMock.Setup(e => e.EnvironmentName).Returns("Development");
            var user = new User { Id = Guid.NewGuid(), Email = "test@test.com", FullName = "Test", PasswordHash = "hash" };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var result = await _controller.ForgotPassword(new AuthController.ForgotPasswordRequest { Email = "test@test.com" });
            var okResult = result as OkObjectResult;
            okResult.Should().NotBeNull();
            
            var response = JObject.FromObject(okResult!.Value!);
            response["message"]?.ToString().Should().Be("If the email exists, a reset link was sent.");
            response["debug_token"]?.ToString().Should().NotBeNullOrEmpty();
            
            var token = response["debug_token"]!.ToString();
            
            var dbUser = await _context.Users.FindAsync(user.Id);
            dbUser!.ResetToken.Should().Be(ComputeSha256Hash(token)); // Validates hashing
        }

        [Fact]
        public async Task ForgotPassword_UnknownAccount_ReturnsGenericMessage()
        {
            var result = await _controller.ForgotPassword(new AuthController.ForgotPasswordRequest { Email = "unknown@test.com" });
            var okResult = result as OkObjectResult;
            okResult.Should().NotBeNull();

            var response = JObject.FromObject(okResult!.Value!);
            response["message"]?.ToString().Should().Be("If the email exists, a reset link was sent.");
            response.ContainsKey("debug_token").Should().BeFalse();
        }

        [Fact]
        public async Task ForgotPassword_ProductionEnvironment_ReturnsNoSecret()
        {
            _envMock.Setup(e => e.EnvironmentName).Returns("Production");
            var user = new User { Id = Guid.NewGuid(), Email = "prod@test.com", FullName = "Test", PasswordHash = "hash" };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var result = await _controller.ForgotPassword(new AuthController.ForgotPasswordRequest { Email = "prod@test.com" });
            var okResult = result as OkObjectResult;
            okResult.Should().NotBeNull();
            
            var response = JObject.FromObject(okResult!.Value!);
            response.ContainsKey("debug_token").Should().BeFalse(); // No secret in prod
        }

        [Fact]
        public async Task ResetPassword_ValidToken_ResetsPasswordAndClearsToken()
        {
            var token = "my-secret-token";
            var user = new User { Id = Guid.NewGuid(), Email = "test2@test.com", FullName = "Test", PasswordHash = "hash", ResetToken = ComputeSha256Hash(token), ResetTokenExpiry = DateTime.UtcNow.AddMinutes(10) };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var result = await _controller.ResetPassword(new AuthController.ResetPasswordRequest { Token = token, NewPassword = "NewPassword123" });
            
            result.Should().BeOfType<OkObjectResult>();

            var dbUser = await _context.Users.FindAsync(user.Id);
            dbUser!.ResetToken.Should().BeNull();
            dbUser.ResetTokenExpiry.Should().BeNull();
            dbUser.PasswordHash.Should().NotBe("hash");
        }

        [Fact]
        public async Task ResetPassword_ExpiredToken_ReturnsBadRequest()
        {
            var token = "my-secret-token";
            var user = new User { Id = Guid.NewGuid(), Email = "test3@test.com", FullName = "Test", PasswordHash = "hash", ResetToken = ComputeSha256Hash(token), ResetTokenExpiry = DateTime.UtcNow.AddMinutes(-1) }; // EXPIRED
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var result = await _controller.ResetPassword(new AuthController.ResetPasswordRequest { Token = token, NewPassword = "NewPassword123" });
            
            var badResult = result as BadRequestObjectResult;
            badResult.Should().NotBeNull();
            badResult!.Value.Should().Be("Invalid or expired reset token.");
        }

        [Fact]
        public async Task ResetPassword_IncorrectToken_ReturnsBadRequest()
        {
            var token = "my-secret-token";
            var user = new User { Id = Guid.NewGuid(), Email = "test4@test.com", FullName = "Test", PasswordHash = "hash", ResetToken = ComputeSha256Hash(token), ResetTokenExpiry = DateTime.UtcNow.AddMinutes(10) };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var result = await _controller.ResetPassword(new AuthController.ResetPasswordRequest { Token = "wrong-token", NewPassword = "NewPassword123" });
            
            var badResult = result as BadRequestObjectResult;
            badResult.Should().NotBeNull();
        }

        [Fact]
        public async Task ResetPassword_ReuseOfToken_ReturnsBadRequest()
        {
            var token = "my-secret-token";
            var user = new User { Id = Guid.NewGuid(), Email = "test5@test.com", FullName = "Test", PasswordHash = "hash", ResetToken = ComputeSha256Hash(token), ResetTokenExpiry = DateTime.UtcNow.AddMinutes(10) };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // First reset works
            var result1 = await _controller.ResetPassword(new AuthController.ResetPasswordRequest { Token = token, NewPassword = "NewPassword123" });
            result1.Should().BeOfType<OkObjectResult>();

            // Second reset fails
            var result2 = await _controller.ResetPassword(new AuthController.ResetPasswordRequest { Token = token, NewPassword = "NewPassword123" });
            result2.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task ForgotPassword_OldTokenInvalidated_AfterRequestingNewOne()
        {
            _envMock.Setup(e => e.EnvironmentName).Returns("Development");
            var user = new User { Id = Guid.NewGuid(), Email = "test6@test.com", FullName = "Test", PasswordHash = "hash" };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Request 1
            var res1 = await _controller.ForgotPassword(new AuthController.ForgotPasswordRequest { Email = "test6@test.com" });
            var token1 = JObject.FromObject((res1 as OkObjectResult)!.Value!)["debug_token"]!.ToString();

            // Request 2
            var res2 = await _controller.ForgotPassword(new AuthController.ForgotPasswordRequest { Email = "test6@test.com" });
            var token2 = JObject.FromObject((res2 as OkObjectResult)!.Value!)["debug_token"]!.ToString();

            token1.Should().NotBe(token2);

            // Attempt reset with token 1 (old) should fail
            var resetResult1 = await _controller.ResetPassword(new AuthController.ResetPasswordRequest { Token = token1, NewPassword = "NewPassword123" });
            resetResult1.Should().BeOfType<BadRequestObjectResult>();

            // Attempt reset with token 2 (new) should succeed
            var resetResult2 = await _controller.ResetPassword(new AuthController.ResetPasswordRequest { Token = token2, NewPassword = "NewPassword123" });
            resetResult2.Should().BeOfType<OkObjectResult>();
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }
    }
}
