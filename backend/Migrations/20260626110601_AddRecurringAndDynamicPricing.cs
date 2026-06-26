using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RideO.API.Migrations
{
    /// <inheritdoc />
    public partial class AddRecurringAndDynamicPricing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsRecurring",
                table: "Routes",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "PricePerKm",
                table: "Routes",
                type: "numeric(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "PricingMode",
                table: "Routes",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "RecurringDays",
                table: "Routes",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<TimeSpan>(
                name: "RecurringTime",
                table: "Routes",
                type: "interval",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "RecurringBookings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OriginalRouteId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    SeatsBooked = table.Column<int>(type: "integer", nullable: false),
                    TotalFarePerRide = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    SubscribedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecurringBookings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RecurringBookings_Routes_OriginalRouteId",
                        column: x => x.OriginalRouteId,
                        principalTable: "Routes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RecurringBookings_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RecurringBookings_OriginalRouteId",
                table: "RecurringBookings",
                column: "OriginalRouteId");

            migrationBuilder.CreateIndex(
                name: "IX_RecurringBookings_UserId",
                table: "RecurringBookings",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RecurringBookings");

            migrationBuilder.DropColumn(
                name: "IsRecurring",
                table: "Routes");

            migrationBuilder.DropColumn(
                name: "PricePerKm",
                table: "Routes");

            migrationBuilder.DropColumn(
                name: "PricingMode",
                table: "Routes");

            migrationBuilder.DropColumn(
                name: "RecurringDays",
                table: "Routes");

            migrationBuilder.DropColumn(
                name: "RecurringTime",
                table: "Routes");
        }
    }
}
