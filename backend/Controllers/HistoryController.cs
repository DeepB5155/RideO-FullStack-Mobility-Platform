using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RideO.API.Data;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using System.Security.Claims;

namespace RideO.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class HistoryController : ControllerBase
    {
        private readonly AppDbContext _context;

        public HistoryController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("rides")]
        public async Task<IActionResult> GetRideHistory()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Unauthorized();

            var role = User.FindFirstValue(ClaimTypes.Role);

            if (role == "User")
            {
                var history = await _context.Bookings
                    .Include(b => b.Route)
                    .ThenInclude(r => r.Driver)
                    .ThenInclude(d => d.User)
                    .Where(b => b.UserId == userId && (b.Status == "Completed" || b.Status == "Cancelled" || b.Status == "No-show"))
                    .OrderByDescending(b => b.BookedAt)
                    .Select(b => new
                    {
                        id = b.Id,
                        routeId = b.RouteId,
                        date = b.Route.StartTime,
                        driverName = b.Route.Driver.User.FullName,
                        pickup = b.Route.StartLocation,
                        dropoff = b.Route.EndLocation,
                        fare = b.TotalFare,
                        status = b.Status,
                        seats = b.SeatsBooked,
                        cancellationFee = b.CancellationFee
                    })
                    .ToListAsync();
                return Ok(history);
            }
            else if (role == "Driver")
            {
                var driver = await _context.Drivers.FirstOrDefaultAsync(d => d.UserId == userId);
                if (driver == null) return Unauthorized();

                var history = await _context.Routes
                    .Where(r => r.DriverId == driver.Id && (r.Status == "Completed" || r.Status == "Cancelled"))
                    .OrderByDescending(r => r.StartTime)
                    .Select(r => new
                    {
                        id = r.Id,
                        date = r.StartTime,
                        pickup = r.StartLocation,
                        dropoff = r.EndLocation,
                        status = r.Status,
                        availableSeats = r.AvailableSeats,
                        pricePerSeat = r.PricePerSeat
                    })
                    .ToListAsync();
                return Ok(history);
            }

            return BadRequest("Invalid role");
        }

        [HttpGet("receipt/{bookingId}")]
        [AllowAnonymous] // Allowing anonymous here to make linking in React Native easy for download
        public async Task<IActionResult> DownloadReceipt(Guid bookingId)
        {
            var booking = await _context.Bookings
                .Include(b => b.Route)
                .ThenInclude(r => r.Driver)
                .ThenInclude(d => d.User)
                .Include(b => b.User)
                .FirstOrDefaultAsync(b => b.Id == bookingId);

            if (booking == null) return NotFound("Booking not found");
            if (booking.Status != "Completed" && booking.Status != "Cancelled")
                return BadRequest("Receipts are only available for completed or cancelled rides.");

            var pdfData = GeneratePdfReceipt(booking);
            return File(pdfData, "application/pdf", $"RideO_Receipt_{booking.Id.ToString().Substring(0, 8)}.pdf");
        }

        private byte[] GeneratePdfReceipt(RideO.API.Models.Booking booking)
        {
            var document = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(2, Unit.Centimetre);
                    page.PageColor(Colors.White);
                    page.DefaultTextStyle(x => x.FontSize(11).FontFamily(Fonts.Arial));

                    page.Header().Element(header =>
                    {
                        header.Row(row =>
                        {
                            row.RelativeItem().Column(col =>
                            {
                                col.Item().Text("RideO Invoice").FontSize(24).SemiBold().FontColor(Colors.Blue.Darken2);
                                col.Item().Text($"Booking ID: {booking.Id}").FontSize(10).FontColor(Colors.Grey.Medium);
                                col.Item().Text($"Date Issued: {DateTime.UtcNow:MMM dd, yyyy}").FontSize(10).FontColor(Colors.Grey.Medium);
                            });

                            row.ConstantItem(100).AlignRight().Text("Paid").FontSize(20).FontColor(Colors.Green.Medium).SemiBold();
                        });
                    });

                    page.Content().PaddingVertical(1, Unit.Centimetre).Column(column =>
                    {
                        column.Spacing(10);
                        
                        column.Item().Text("Passenger Details").SemiBold().FontSize(14).Underline();
                        column.Item().Text($"Name: {booking.User.FullName}");
                        column.Item().Text($"Seats Booked: {booking.SeatsBooked}");

                        column.Item().PaddingTop(10).Text("Trip Details").SemiBold().FontSize(14).Underline();
                        column.Item().Text($"Date: {booking.Route.StartTime:MMM dd, yyyy HH:mm}");
                        column.Item().Text($"Driver: {booking.Route.Driver.User.FullName}");
                        column.Item().Text($"From: {booking.Route.StartLocation}");
                        column.Item().Text($"To: {booking.Route.EndLocation}");
                        column.Item().Text($"Status: {booking.Status}");

                        column.Item().PaddingTop(20).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);

                        column.Item().Table(table =>
                        {
                            table.ColumnsDefinition(columns =>
                            {
                                columns.RelativeColumn(3);
                                columns.RelativeColumn();
                            });

                            table.Header(header =>
                            {
                                header.Cell().Text("Description").SemiBold();
                                header.Cell().AlignRight().Text("Amount").SemiBold();
                            });

                            table.Cell().Text("Trip Fare");
                            table.Cell().AlignRight().Text($"${booking.TotalFare:F2}");

                            if (booking.CancellationFee > 0)
                            {
                                table.Cell().Text("Cancellation Fee");
                                table.Cell().AlignRight().Text($"${booking.CancellationFee:F2}");
                            }

                            var total = booking.TotalFare + booking.CancellationFee;

                            table.Cell().PaddingTop(10).Text("Total").SemiBold().FontSize(14);
                            table.Cell().PaddingTop(10).AlignRight().Text($"${total:F2}").SemiBold().FontSize(14).FontColor(Colors.Blue.Darken2);
                        });
                    });

                    page.Footer().AlignCenter().Text(x =>
                    {
                        x.Span("Thank you for riding with RideO! ");
                        x.Span("Page ");
                        x.CurrentPageNumber();
                    });
                });
            });

            return document.GeneratePdf();
        }
    }
}
