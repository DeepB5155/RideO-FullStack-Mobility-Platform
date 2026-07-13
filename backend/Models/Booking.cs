using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RideO.API.Models
{
    public class Booking
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required]
        public Guid RouteId { get; set; }
        
        [ForeignKey("RouteId")]
        public Route? Route { get; set; }

        [Required]
        public Guid UserId { get; set; }

        [ForeignKey("UserId")]
        public User? User { get; set; }

        public Guid? PickupStopId { get; set; }

        [ForeignKey("PickupStopId")]
        public RouteStop? PickupStop { get; set; }

        [MaxLength(255)]
        public string? PickupLocationName { get; set; }
        
        public double? PickupLat { get; set; }
        public double? PickupLng { get; set; }

        public Guid? DropoffStopId { get; set; }

        [ForeignKey("DropoffStopId")]
        public RouteStop? DropoffStop { get; set; }

        [MaxLength(255)]
        public string? DropoffLocationName { get; set; }
        
        public double? DropoffLat { get; set; }
        public double? DropoffLng { get; set; }

        [Required]
        public int SeatsBooked { get; set; } = 1;

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalFare { get; set; }

        [MaxLength(20)]
        public string PaymentMethod { get; set; } = "Cash";

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected, Cancelled, Started, Completed, No-show

        [MaxLength(10)]
        public string? Otp { get; set; }

        public DateTime BookedAt { get; set; } = DateTime.UtcNow;

        public Guid? TrackingId { get; set; }

        public string? CancellationReason { get; set; }
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal CancellationFee { get; set; } = 0.0m;
    }
}
