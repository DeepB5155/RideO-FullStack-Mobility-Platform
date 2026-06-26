using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RideO.API.Models
{
    public class Payment
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required]
        public Guid BookingId { get; set; }
        
        [ForeignKey("BookingId")]
        public Booking? Booking { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Pending"; // Pending, Completed, Failed
        
        [MaxLength(50)]
        public string? Method { get; set; }

        [MaxLength(100)]
        public string? TransactionId { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal AdminCommission { get; set; } = 0.0m;

        [Column(TypeName = "decimal(18,2)")]
        public decimal DriverEarning { get; set; } = 0.0m;
        
        public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;
    }
}
