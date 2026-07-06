using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using RideO.API.Controllers;
using RideO.API.Data;
using RideO.API.Models;
using RideO.API.Services;
using Xunit;

namespace RideO.API.Tests
{
    public class RouteControllerTests : IDisposable
    {
        private readonly AppDbContext _context;
        private readonly Mock<FcmService> _fcmServiceMock;
        private readonly RouteController _controller;

        public RouteControllerTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new AppDbContext(options);
            _fcmServiceMock = new Mock<FcmService>();

            // Setup a mock user claim for testing
            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
                new Claim(ClaimTypes.Role, "Driver")
            }, "mock"));

            _controller = new RouteController(_context, _fcmServiceMock.Object)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext { User = user }
                }
            };
        }

        [Fact]
        public async Task SearchRoutes_ReturnsOk_WithMatchingRoutes()
        {
            // Arrange
            var driverUserId = Guid.NewGuid();
            var driverId = Guid.NewGuid();

            var testUser = new User { Id = driverUserId, FullName = "Test Driver", Email = "test@driver.com" };
            var testDriver = new Driver { Id = driverId, UserId = driverUserId, IsVerified = true, User = testUser };
            var testVehicle = new Vehicle { Id = Guid.NewGuid(), DriverId = driverId, Make = "Toyota", Model = "Prius" };
            
            var testRoute = new RideO.API.Models.Route
            {
                Id = Guid.NewGuid(),
                DriverId = driverId,
                VehicleId = testVehicle.Id,
                Status = "Published",
                StartLocation = "Mumbai",
                StartLat = 19.0760,
                StartLng = 72.8777,
                EndLocation = "Pune",
                EndLat = 18.5204,
                EndLng = 73.8567,
                AvailableSeats = 3,
                PricePerSeat = 500,
                StartTime = DateTime.UtcNow.AddHours(2), // Match today's UTC date
                Driver = testDriver,
                Vehicle = testVehicle,
                Stops = new List<RouteStop>()
            };

            _context.Users.Add(testUser);
            _context.Drivers.Add(testDriver);
            _context.Vehicles.Add(testVehicle);
            _context.Routes.Add(testRoute);
            await _context.SaveChangesAsync();

            // Act: Searching near Mumbai and Pune
            var result = await _controller.SearchRoutes(19.0760, 72.8777, 18.5204, 73.8567, DateTime.UtcNow, 1);

            // Assert
            var okResult = result as OkObjectResult;
            okResult.Should().NotBeNull();
            
            var routes = okResult!.Value as IEnumerable<object>;
            routes.Should().NotBeNull();
            routes.Should().HaveCount(1);
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }
    }
}
