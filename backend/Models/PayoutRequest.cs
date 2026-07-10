using System;
using System.ComponentModel.DataAnnotations;

namespace RideO.API.Models
{
    public class PayoutRequest
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required]
        public Guid DriverId { get; set; }
        
        [Required]
        public decimal Amount { get; set; }

        [Required]
        public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected
        
        [Required]
        public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? ProcessedAt { get; set; }
    }
}