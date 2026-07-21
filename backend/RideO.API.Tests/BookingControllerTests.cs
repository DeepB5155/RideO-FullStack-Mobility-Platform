using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Moq;
using RideO.API.Controllers;
using RideO.API.Data;
using RideO.API.Hubs;
using RideO.API.Models;
using RideO.API.Services;
using Xunit;
using static RideO.API.Controllers.BookingController;

namespace RideO.API.Tests
{
    public class BookingControllerTests : IDisposable
    {
        private readonly AppDbContext _context;
        private readonly Mock<FcmService> _fcmServiceMock;
        private readonly Mock<IHubContext<RideHub>> _hubContextMock;
        private readonly Mock<IHubClients> _hubClientsMock;
        private readonly Mock<IClientProxy> _clientProxyMock;
        private readonly BookingController _controller;

        public BookingControllerTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new AppDbContext(options);
            _fcmServiceMock = new Mock<FcmService>();
            
            _hubContextMock = new Mock<IHubContext<RideHub>>();
            _hubClientsMock = new Mock<IHubClients>();
            _clientProxyMock = new Mock<IClientProxy>();
            
            _hubClientsMock.Setup(c => c.User(It.IsAny<string>())).Returns(_clientProxyMock.Object);
            _hubContextMock.Setup(h => h.Clients).Returns(_hubClientsMock.Object);

            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
                new Claim(ClaimTypes.Role, "Driver")
            }, "mock"));

            _controller = new BookingController(_context, _hubContextMock.Object, _fcmServiceMock.Object)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext { User = user }
                }
            };
        }

        private async Task<(Guid driverUserId, Guid bookingId)> SetupValidBookingAsync(string status = "Approved")
        {
            var driverUserId = Guid.Parse(_controller.User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var driver = new Driver { Id = Guid.NewGuid(), UserId = driverUserId, IsVerified = true };
            var route = new RideO.API.Models.Route { Id = Guid.NewGuid(), DriverId = driver.Id, StartTime = DateTime.UtcNow, AvailableSeats = 4, Status = "Active" };
            var booking = new Booking { Id = Guid.NewGuid(), RouteId = route.Id, UserId = Guid.NewGuid(), Status = status, Otp = "1234" };

            _context.Drivers.Add(driver);
            _context.Routes.Add(route);
            _context.Bookings.Add(booking);
            await _context.SaveChangesAsync();

            return (driverUserId, booking.Id);
        }

        [Fact]
        public async Task StartWithOtp_ValidOtpAndApproved_ReturnsOkAndSendsNotificationOnce()
        {
            var (_, bookingId) = await SetupValidBookingAsync("Approved");

            var result = await _controller.StartWithOtp(bookingId, new StartRideDto { Otp = "1234" });

            result.Should().BeOfType<OkObjectResult>();
            var booking = await _context.Bookings.FindAsync(bookingId);
            booking!.Status.Should().Be("Started");

            _clientProxyMock.Verify(c => c.SendCoreAsync("RideStarted", It.IsAny<object[]>(), default), Times.Once);
        }

        [Fact]
        public async Task StartWithOtp_InvalidOtp_ReturnsBadRequest()
        {
            var (_, bookingId) = await SetupValidBookingAsync("Approved");

            var result = await _controller.StartWithOtp(bookingId, new StartRideDto { Otp = "9999" });

            var badRequest = result as BadRequestObjectResult;
            badRequest.Should().NotBeNull();
            badRequest!.Value.Should().Be("Invalid OTP. Please check with the passenger.");
        }

        [Fact]
        public async Task StartWithOtp_WrongDriver_ReturnsForbid()
        {
            var (_, bookingId) = await SetupValidBookingAsync("Approved");

            // Change controller user to someone else
            var wrongUser = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
                new Claim(ClaimTypes.Role, "Driver")
            }, "mock"));
            _controller.ControllerContext.HttpContext.User = wrongUser;

            var result = await _controller.StartWithOtp(bookingId, new StartRideDto { Otp = "1234" });

            var forbid = result as ForbidResult;
            forbid.Should().NotBeNull();
            forbid!.AuthenticationSchemes[0].Should().Be("Only the assigned driver can start this ride.");
        }

        [Fact]
        public async Task StartWithOtp_AlreadyStarted_IsIdempotent()
        {
            var (_, bookingId) = await SetupValidBookingAsync("Started");

            var result = await _controller.StartWithOtp(bookingId, new StartRideDto { Otp = "1234" });

            result.Should().BeOfType<OkObjectResult>();
            _clientProxyMock.Verify(c => c.SendCoreAsync("RideStarted", It.IsAny<object[]>(), default), Times.Never);
        }

        [Theory]
        [InlineData("Pending")]
        [InlineData("Cancelled")]
        [InlineData("Completed")]
        public async Task StartWithOtp_InvalidStatus_ReturnsConflict(string status)
        {
            var (_, bookingId) = await SetupValidBookingAsync(status);

            var result = await _controller.StartWithOtp(bookingId, new StartRideDto { Otp = "1234" });

            result.Should().BeOfType<ConflictObjectResult>();
        }

        [Fact]
        public async Task RequestBooking_WithDeepNegativeBalance_ReturnsBadRequest()
        {
            // Setup user and wallet with < -5.00 balance
            var userId = Guid.Parse(_controller.User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var wallet = new Wallet { Id = Guid.NewGuid(), UserId = userId, Balance = -6.00m };
            
            // Setup a valid route
            var driver = new Driver { Id = Guid.NewGuid(), UserId = Guid.NewGuid(), IsVerified = true };
            var route = new RideO.API.Models.Route { Id = Guid.NewGuid(), DriverId = driver.Id, StartTime = DateTime.UtcNow, AvailableSeats = 4, Status = "Published", PricePerSeat = 10.0m };
            
            _context.Wallets.Add(wallet);
            _context.Drivers.Add(driver);
            _context.Routes.Add(route);
            await _context.SaveChangesAsync();

            var request = new BookingRequestDto
            {
                RouteId = route.Id,
                SeatsBooked = 1,
                PaymentMethod = "Cash", // Explicitly test cash to show it blocks ALL methods
                PickupLocationName = "A",
                DropoffLocationName = "B",
                PickupLat = 0, PickupLng = 0, DropLat = 0, DropLng = 0
            };

            var result = await _controller.RequestBooking(request);

            var badRequest = result as BadRequestObjectResult;
            badRequest.Should().NotBeNull();
            badRequest!.Value.Should().Be("Your account has an outstanding balance from previous cancellations. Please top up your wallet to book new rides.");
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }
    }
}
