using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RideO.API.Migrations
{
    /// <inheritdoc />
    public partial class AddRouteCarpoolingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AutoApprove",
                table: "Routes",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsLuggageAllowed",
                table: "Routes",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "PricePerSeat",
                table: "Routes",
                type: "numeric(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "RideNotes",
                table: "Routes",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AutoApprove",
                table: "Routes");

            migrationBuilder.DropColumn(
                name: "IsLuggageAllowed",
                table: "Routes");

            migrationBuilder.DropColumn(
                name: "PricePerSeat",
                table: "Routes");

            migrationBuilder.DropColumn(
                name: "RideNotes",
                table: "Routes");
        }
    }
}
