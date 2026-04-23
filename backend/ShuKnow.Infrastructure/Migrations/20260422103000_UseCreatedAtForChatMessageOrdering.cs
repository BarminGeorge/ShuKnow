using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShuKnow.Infrastructure.Migrations
{
    public partial class UseCreatedAtForChatMessageOrdering : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_chat_messages_session_id_index_id",
                table: "chat_messages");

            migrationBuilder.DropColumn(
                name: "index",
                table: "chat_messages");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "created_at",
                table: "chat_messages",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.CreateIndex(
                name: "ix_chat_messages_session_id_created_at_id",
                table: "chat_messages",
                columns: new[] { "session_id", "created_at", "id" });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_chat_messages_session_id_created_at_id",
                table: "chat_messages");

            migrationBuilder.DropColumn(
                name: "created_at",
                table: "chat_messages");

            migrationBuilder.AddColumn<int>(
                name: "index",
                table: "chat_messages",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_chat_messages_session_id_index_id",
                table: "chat_messages",
                columns: new[] { "session_id", "index", "id" });
        }
    }
}
