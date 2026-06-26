using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RideO.API.Models
{
    public class WalletTransaction
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid WalletId { get; set; }

        [ForeignKey("WalletId")]
        public Wallet? Wallet { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; } // Positive for deposit, Negative for withdrawal/payment

        [Required]
        [MaxLength(20)]
        public string Type { get; set; } = "Deposit"; // Deposit, Withdrawal, Payment, Refund, Earning

        [MaxLength(255)]
        public string? Description { get; set; }

        [MaxLength(255)]
        public string? ReferenceId { get; set; } // e.g. UPI Transaction ID or Booking ID

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
