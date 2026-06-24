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
        public Guid RideId { get; set; }
        
        [ForeignKey("RideId")]
        public Ride? Ride { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(10,2)")]
        public decimal Amount { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Pending"; // Pending, Completed, Failed
        
        [MaxLength(50)]
        public string? Method { get; set; }
        
        public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;
    }
}
