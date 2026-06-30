using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RideO.API.Models
{
    public class Notification
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required]
        public Guid UserId { get; set; }
        
        [ForeignKey("UserId")]
        public User? User { get; set; }

        [Required]
        [MaxLength(100)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [MaxLength(500)]
        public string Message { get; set; } = string.Empty;

        [MaxLength(30)]
        public string Type { get; set; } = "info";

        public bool IsRead { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
