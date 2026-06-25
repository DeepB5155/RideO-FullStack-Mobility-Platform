using Microsoft.EntityFrameworkCore;
using RideO.API.Models;

namespace RideO.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Driver> Drivers { get; set; }
        public DbSet<Payment> Payments { get; set; }
        public DbSet<Vehicle> Vehicles { get; set; }
        public DbSet<DriverDocument> DriverDocuments { get; set; }
        public DbSet<RideO.API.Models.Route> Routes { get; set; }
        public DbSet<RouteStop> RouteStops { get; set; }
        public DbSet<Booking> Bookings { get; set; }
        public DbSet<Rating> Ratings { get; set; }
        public DbSet<Complaint> Complaints { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<SystemSetting> SystemSettings { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            // Unique constraints
            modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();
            modelBuilder.Entity<Driver>().HasIndex(d => d.LicenseNumber).IsUnique();
            modelBuilder.Entity<Vehicle>().HasIndex(v => v.LicensePlate).IsUnique();

            // Relationships requiring configuration to avoid cascade cycles
            modelBuilder.Entity<Booking>()
                .HasOne(b => b.PickupStop)
                .WithMany()
                .HasForeignKey(b => b.PickupStopId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Booking>()
                .HasOne(b => b.DropoffStop)
                .WithMany()
                .HasForeignKey(b => b.DropoffStopId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Rating>()
                .HasOne(r => r.Reviewer)
                .WithMany()
                .HasForeignKey(r => r.ReviewerId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Rating>()
                .HasOne(r => r.Reviewee)
                .WithMany()
                .HasForeignKey(r => r.RevieweeId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Complaint>()
                .HasOne(c => c.Booking)
                .WithMany()
                .HasForeignKey(c => c.BookingId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}
