using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RideO.API.Models
{
    public class RecurringBooking
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required]
        public Guid OriginalRouteId { get; set; }
        
        [ForeignKey("OriginalRouteId")]
        public RideO.API.Models.Route? OriginalRoute { get; set; }

        [Required]
        public Guid UserId { get; set; }

        [ForeignKey("UserId")]
        public User? User { get; set; }

        [Required]
        public int SeatsBooked { get; set; } = 1;

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalFarePerRide { get; set; }

        [Required]
        public bool IsActive { get; set; } = true;

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Pending";

        [Required]
        [MaxLength(20)]
        public string PaymentPlan { get; set; } = "Daily";

        public DateTime? PausedUntil { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalAmountPrepaid { get; set; } = 0.0m;

        public DateTime SubscribedAt { get; set; } = DateTime.UtcNow;
    }
}
