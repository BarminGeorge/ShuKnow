using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShuKnow.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddChatSessions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "chat_sessions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_chat_sessions", x => x.id);
                    table.ForeignKey(
                        name: "fk_chat_sessions_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_chat_sessions_user_id",
                table: "chat_sessions",
                column: "user_id",
                unique: true,
                filter: "\"status\" = 1");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "chat_sessions");
        }
    }
}
