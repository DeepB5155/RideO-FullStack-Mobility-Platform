using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RideO.API.Models
{
    public class DriverDocument
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required]
        public Guid DriverId { get; set; }
        
        [ForeignKey("DriverId")]
        public Driver? Driver { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string DocumentType { get; set; } = string.Empty; // LicenseFront, LicenseBack, Insurance

        [Required]
        [MaxLength(1000)]
        public string DocumentUrl { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected

        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

        public DateTime? VerifiedAt { get; set; }
    }
}
