using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShuKnow.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUserLoginAndAiProviderFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "login",
                table: "users",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "model_id",
                table: "user_ai_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "provider",
                table: "user_ai_settings",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "login",
                table: "users");

            migrationBuilder.DropColumn(
                name: "model_id",
                table: "user_ai_settings");

            migrationBuilder.DropColumn(
                name: "provider",
                table: "user_ai_settings");
        }
    }
}
