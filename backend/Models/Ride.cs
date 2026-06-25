// Deprecated in favor of Route and Booking models
/*
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RideO.API.Models
{
    public class Ride
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required]
        public Guid UserId { get; set; }
        
        [ForeignKey("UserId")]
        public User? User { get; set; }
        
        public Guid? DriverId { get; set; }
        
        [ForeignKey("DriverId")]
        public Driver? Driver { get; set; }
        
        [Required]
        [MaxLength(255)]
        public string PickupLocation { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(255)]
        public string DropoffLocation { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Requested"; // Requested, Accepted, Ongoing, Completed, Cancelled
        
        [Column(TypeName = "decimal(10,2)")]
        public decimal? Fare { get; set; }
        
        public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? CompletedAt { get; set; }
    }
}
*/
