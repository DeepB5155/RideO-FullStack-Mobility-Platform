using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RideO.API.Models
{
    public class RouteStop
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required]
        public Guid RouteId { get; set; }
        
        [ForeignKey("RouteId")]
        public Route? Route { get; set; }

        [Required]
        [MaxLength(255)]
        public string StopName { get; set; } = string.Empty;

        public double StopLat { get; set; }
        public double StopLng { get; set; }

        [Required]
        public int StopOrder { get; set; } // 0 = Start, 1..n = Stops, n+1 = End

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal PriceFromStart { get; set; } = 0.0m;

        [Required]
        public DateTime EstimatedArrivalTime { get; set; }
    }
}
