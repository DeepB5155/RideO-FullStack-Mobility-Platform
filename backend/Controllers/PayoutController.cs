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
    [Authorize]
    public class PayoutController : ControllerBase
    {
        private readonly AppDbContext _context;

        public PayoutController(AppDbContext context)
        {
            _context = context;
        }

        private Guid? GetCurrentUserId()
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdString)) return null;
            return Guid.Parse(userIdString);
        }

        [HttpPost("request")]
        [Authorize(Roles = "Driver")]
        public async Task<IActionResult> RequestPayout([FromBody] PayoutRequestDto dto)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var driver = await _context.Drivers.FirstOrDefaultAsync(d => d.UserId == userId.Value);
            if (driver == null) return Forbid();

            var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == userId.Value);
            if (wallet == null || wallet.Balance < dto.Amount || dto.Amount <= 0)
                return BadRequest("Insufficient balance.");

            // Deduct from wallet immediately to prevent double spending
            wallet.Balance -= dto.Amount;
            wallet.UpdatedAt = DateTime.UtcNow;

            var walletTx = new WalletTransaction
            {
                WalletId = wallet.Id,
                Amount = dto.Amount,
                Type = "Withdrawal",
                Description = "Payout request pending"
            };
            _context.WalletTransactions.Add(walletTx);

            var payoutRequest = new PayoutRequest
            {
                DriverId = driver.Id,
                Amount = dto.Amount,
                Status = "Pending"
            };
            _context.PayoutRequests.Add(payoutRequest);

            await _context.SaveChangesAsync();

            return Ok(new { message = "Payout requested successfully", payoutRequest });
        }

        [HttpGet("pending")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetPendingPayouts()
        {
            var requests = await _context.PayoutRequests
                .Where(p => p.Status == "Pending")
                .OrderBy(p => p.RequestedAt)
                .Select(p => new
                {
                    p.Id,
                    p.DriverId,
                    DriverName = _context.Drivers.Where(d => d.Id == p.DriverId).Select(d => d.User.FullName).FirstOrDefault(),
                    p.Amount,
                    p.Status,
                    p.RequestedAt
                })
                .ToListAsync();

            return Ok(requests);
        }

        [HttpPut("{id}/status")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdatePayoutStatus(Guid id, [FromBody] UpdatePayoutDto dto)
        {
            var payout = await _context.PayoutRequests.FindAsync(id);
            if (payout == null) return NotFound();

            if (payout.Status != "Pending")
                return BadRequest("Payout is already processed.");

            payout.Status = dto.Status; // Approved or Rejected
            payout.ProcessedAt = DateTime.UtcNow;

            if (dto.Status == "Rejected")
            {
                // Refund the wallet
                var driver = await _context.Drivers.FindAsync(payout.DriverId);
                if (driver != null)
                {
                    var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == driver.UserId);
                    if (wallet != null)
                    {
                        wallet.Balance += payout.Amount;
                        wallet.UpdatedAt = DateTime.UtcNow;

                        var tx = new WalletTransaction
                        {
                            WalletId = wallet.Id,
                            Amount = payout.Amount,
                            Type = "Refund",
                            Description = "Payout request rejected"
                        };
                        _context.WalletTransactions.Add(tx);
                    }
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = $"Payout {dto.Status.ToLower()} successfully" });
        }
    }

    public class PayoutRequestDto
    {
        public decimal Amount { get; set; }
    }

    public class UpdatePayoutDto
    {
        public string Status { get; set; } = string.Empty;
    }
}
