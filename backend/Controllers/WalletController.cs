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
    public class WalletController : ControllerBase
    {
        private readonly AppDbContext _context;

        public WalletController(AppDbContext context)
        {
            _context = context;
        }

        private Guid? GetCurrentUserId()
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdString)) return null;
            return Guid.Parse(userIdString);
        }

        private async Task<Wallet> GetOrCreateWalletAsync(Guid userId)
        {
            var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == userId);
            if (wallet == null)
            {
                wallet = new Wallet { UserId = userId, Balance = 0.0m };
                _context.Wallets.Add(wallet);
                await _context.SaveChangesAsync();
            }
            return wallet;
        }

        [HttpGet("balance")]
        public async Task<IActionResult> GetBalance()
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var wallet = await GetOrCreateWalletAsync(userId.Value);
            return Ok(new { balance = wallet.Balance });
        }

        [HttpGet("transactions")]
        public async Task<IActionResult> GetTransactions()
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var wallet = await GetOrCreateWalletAsync(userId.Value);
            
            var transactions = await _context.WalletTransactions
                .Where(t => t.WalletId == wallet.Id)
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            return Ok(transactions);
        }

        public class AddFundsRequest
        {
            public decimal Amount { get; set; }
            public string UpiId { get; set; } = string.Empty;
        }

        [HttpPost("add-funds")]
        public async Task<IActionResult> AddFunds([FromBody] AddFundsRequest request)
        {
            if (request.Amount <= 0) return BadRequest("Amount must be greater than zero.");

            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var wallet = await GetOrCreateWalletAsync(userId.Value);

            // Mock UPI processing delay
            await Task.Delay(1000); 

            wallet.Balance += request.Amount;
            wallet.UpdatedAt = DateTime.UtcNow;

            var transaction = new WalletTransaction
            {
                WalletId = wallet.Id,
                Amount = request.Amount,
                Type = "Deposit",
                Description = $"Added funds via UPI: {request.UpiId}",
                ReferenceId = $"MOCK_UPI_{Guid.NewGuid().ToString().Substring(0, 8)}"
            };

            _context.WalletTransactions.Add(transaction);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Funds added successfully", balance = wallet.Balance, transaction });
        }

        public class WithdrawFundsRequest
        {
            public decimal Amount { get; set; }
            public string BankAccountInfo { get; set; } = string.Empty;
        }

        [HttpPost("withdraw")]
        public async Task<IActionResult> WithdrawFunds([FromBody] WithdrawFundsRequest request)
        {
            if (request.Amount <= 0) return BadRequest("Amount must be greater than zero.");

            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var wallet = await GetOrCreateWalletAsync(userId.Value);

            if (wallet.Balance < request.Amount)
            {
                return BadRequest("Insufficient wallet balance.");
            }

            wallet.Balance -= request.Amount;
            wallet.UpdatedAt = DateTime.UtcNow;

            var transaction = new WalletTransaction
            {
                WalletId = wallet.Id,
                Amount = -request.Amount,
                Type = "Withdrawal",
                Description = $"Withdrawal to {request.BankAccountInfo}",
                ReferenceId = $"WD_{Guid.NewGuid().ToString().Substring(0, 8)}"
            };

            _context.WalletTransactions.Add(transaction);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Withdrawal request submitted successfully", balance = wallet.Balance, transaction });
        }
    }
}
