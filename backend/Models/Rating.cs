using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RideO.API.Models
{
    public class Rating
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required]
        public Guid BookingId { get; set; }
        
        [ForeignKey("BookingId")]
        public Booking? Booking { get; set; }

        [Required]
        public Guid ReviewerId { get; set; }

        [ForeignKey("ReviewerId")]
        public User? Reviewer { get; set; }

        [Required]
        public Guid RevieweeId { get; set; }

        [ForeignKey("RevieweeId")]
        public User? Reviewee { get; set; }

        [Required]
        [Range(1, 5)]
        public int Score { get; set; }

        [MaxLength(1000)]
        public string? Comment { get; set; }

        [MaxLength(100)]
        public string? Compliment { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
