using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RideO.API.Migrations
{
    /// <inheritdoc />
    public partial class AddSOSLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "EmergencySOSLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BookingId = table.Column<Guid>(type: "uuid", nullable: false),
                    TriggeredByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Latitude = table.Column<double>(type: "double precision", nullable: true),
                    Longitude = table.Column<double>(type: "double precision", nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ResolvedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmergencySOSLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EmergencySOSLogs_Bookings_BookingId",
                        column: x => x.BookingId,
                        principalTable: "Bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EmergencySOSLogs_Users_TriggeredByUserId",
                        column: x => x.TriggeredByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EmergencySOSLogs_BookingId",
                table: "EmergencySOSLogs",
                column: "BookingId");

            migrationBuilder.CreateIndex(
                name: "IX_EmergencySOSLogs_TriggeredByUserId",
                table: "EmergencySOSLogs",
                column: "TriggeredByUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EmergencySOSLogs");
        }
    }
}
