using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RideO.API.Migrations
{
    /// <inheritdoc />
    public partial class AddBookingLatLng : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "DropoffLat",
                table: "Bookings",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "DropoffLng",
                table: "Bookings",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "PickupLat",
                table: "Bookings",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "PickupLng",
                table: "Bookings",
                type: "double precision",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DropoffLat",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "DropoffLng",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "PickupLat",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "PickupLng",
                table: "Bookings");
        }
    }
}
