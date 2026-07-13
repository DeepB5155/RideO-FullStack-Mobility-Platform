using System;
using System.ComponentModel.DataAnnotations;

namespace RideO.API.Models
{
    public class ProfileEditRequest
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required]
        public Guid UserId { get; set; }

        public string? RequestedFullName { get; set; }
        
        public string? RequestedPhoneNumber { get; set; }
        
        public string? RequestedEmail { get; set; }

        public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public string? RejectionReason { get; set; }
    }
}
