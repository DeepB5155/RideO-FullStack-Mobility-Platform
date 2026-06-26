using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RideO.API.Migrations
{
    /// <inheritdoc />
    public partial class AddComplaintFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AdminNotes",
                table: "Complaints",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ReportedUserId",
                table: "Complaints",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Complaints_ReportedUserId",
                table: "Complaints",
                column: "ReportedUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Complaints_Users_ReportedUserId",
                table: "Complaints",
                column: "ReportedUserId",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Complaints_Users_ReportedUserId",
                table: "Complaints");

            migrationBuilder.DropIndex(
                name: "IX_Complaints_ReportedUserId",
                table: "Complaints");

            migrationBuilder.DropColumn(
                name: "AdminNotes",
                table: "Complaints");

            migrationBuilder.DropColumn(
                name: "ReportedUserId",
                table: "Complaints");
        }
    }
}
