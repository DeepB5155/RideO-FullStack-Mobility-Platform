using System;
using System.ComponentModel.DataAnnotations;

namespace RideO.API.Models
{
    public class User
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required]
        [MaxLength(100)]
        public string FullName { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(255)]
        public string Email { get; set; } = string.Empty;
        
        [MaxLength(20)]
        public string? PhoneNumber { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Role { get; set; } = "User"; // User, Driver, Admin
        
        [Required]
        [MaxLength(255)]
        public string PasswordHash { get; set; } = string.Empty;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [MaxLength(255)]
        public string? ResetToken { get; set; }

        public DateTime? ResetTokenExpiry { get; set; }

        [MaxLength(500)]
        public string? ProfilePicture { get; set; }

        public bool IsVerified { get; set; } = false;

        public decimal AverageRating { get; set; } = 5.0m;
        
        public bool IsBlocked { get; set; } = false;
    }
}
