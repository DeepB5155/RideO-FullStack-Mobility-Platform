using System;
using System.ComponentModel.DataAnnotations;

namespace RideO.API.Models
{
    public class LocationCache
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required]
        public Guid DriverId { get; set; }
        
        [Required]
        public Guid RouteId { get; set; }

        [Required]
        public double Latitude { get; set; }
        
        [Required]
        public double Longitude { get; set; }

        [Required]
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}