using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RideO.API.Migrations
{
    /// <inheritdoc />
    public partial class AddGeospatialRouteFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "StopLat",
                table: "RouteStops",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "StopLng",
                table: "RouteStops",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "EndLat",
                table: "Routes",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "EndLng",
                table: "Routes",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "StartLat",
                table: "Routes",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "StartLng",
                table: "Routes",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StopLat",
                table: "RouteStops");

            migrationBuilder.DropColumn(
                name: "StopLng",
                table: "RouteStops");

            migrationBuilder.DropColumn(
                name: "EndLat",
                table: "Routes");

            migrationBuilder.DropColumn(
                name: "EndLng",
                table: "Routes");

            migrationBuilder.DropColumn(
                name: "StartLat",
                table: "Routes");

            migrationBuilder.DropColumn(
                name: "StartLng",
                table: "Routes");
        }
    }
}
