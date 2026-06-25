using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RideO.API.Models
{
    public class Route
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required]
        public Guid DriverId { get; set; }
        
        [ForeignKey("DriverId")]
        public Driver? Driver { get; set; }

        public Guid? VehicleId { get; set; }

        [ForeignKey("VehicleId")]
        public Vehicle? Vehicle { get; set; }

        [Required]
        [MaxLength(255)]
        public string StartLocation { get; set; } = string.Empty;

        public double StartLat { get; set; }
        public double StartLng { get; set; }

        [Required]
        [MaxLength(255)]
        public string EndLocation { get; set; } = string.Empty;

        public double EndLat { get; set; }
        public double EndLng { get; set; }

        [Required]
        public DateTime StartTime { get; set; }

        [Required]
        public DateTime EstimatedEndTime { get; set; }

        [Required]
        [ConcurrencyCheck]
        public int AvailableSeats { get; set; } = 4;

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal PricePerSeat { get; set; } = 0.0m;

        public bool IsLuggageAllowed { get; set; } = true;

        public bool AutoApprove { get; set; } = false;

        [MaxLength(500)]
        public string? RideNotes { get; set; }

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Draft"; // Draft, Published, Started, Completed, Cancelled

        public ICollection<RouteStop> Stops { get; set; } = new List<RouteStop>();
    }
}
