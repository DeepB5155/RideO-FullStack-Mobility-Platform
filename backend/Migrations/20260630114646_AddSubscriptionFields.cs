using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RideO.API.Migrations
{
    /// <inheritdoc />
    public partial class AddSubscriptionFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "PausedUntil",
                table: "RecurringBookings",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentPlan",
                table: "RecurringBookings",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "TotalAmountPrepaid",
                table: "RecurringBookings",
                type: "numeric(18,2)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PausedUntil",
                table: "RecurringBookings");

            migrationBuilder.DropColumn(
                name: "PaymentPlan",
                table: "RecurringBookings");

            migrationBuilder.DropColumn(
                name: "TotalAmountPrepaid",
                table: "RecurringBookings");
        }
    }
}
