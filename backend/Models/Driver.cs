using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RideO.API.Models
{
    public class Driver
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required]
        public Guid UserId { get; set; }
        
        [ForeignKey("UserId")]
        public User? User { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string LicenseNumber { get; set; } = string.Empty;
        
        [MaxLength(50)]
        public string? VehicleType { get; set; }
        
        public bool IsAvailable { get; set; } = false;
        
        public decimal Rating { get; set; } = 5.0m;

        public bool IsVerified { get; set; } = false; // KYC status

        [MaxLength(1000)]
        public string? KycRejectionReason { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Balance { get; set; } = 0.0m; // Driver wallet
        
        public bool IsSuspended { get; set; } = false;
    }
}
