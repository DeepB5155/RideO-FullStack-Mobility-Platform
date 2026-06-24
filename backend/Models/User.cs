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
    }
}
