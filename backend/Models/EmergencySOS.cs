using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RideO.API.Models
{
    public class EmergencySOS
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid BookingId { get; set; }

        [ForeignKey("BookingId")]
        public Booking? Booking { get; set; }

        [Required]
        public Guid TriggeredByUserId { get; set; }

        [ForeignKey("TriggeredByUserId")]
        public User? TriggeredByUser { get; set; }

        public double? Latitude { get; set; }
        public double? Longitude { get; set; }

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Open";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ResolvedAt { get; set; }
    }
}
