using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShuKnow.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddChatMessages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "chat_messages",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    session_id = table.Column<Guid>(type: "uuid", nullable: false),
                    role = table.Column<int>(type: "integer", nullable: false),
                    content = table.Column<string>(type: "text", nullable: false),
                    index = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_chat_messages", x => x.id);
                    table.ForeignKey(
                        name: "fk_chat_messages_chat_sessions_session_id",
                        column: x => x.session_id,
                        principalTable: "chat_sessions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_chat_attachments_blob_id",
                table: "chat_attachments",
                column: "blob_id");

            migrationBuilder.CreateIndex(
                name: "ix_chat_attachments_created_at_is_consumed",
                table: "chat_attachments",
                columns: new[] { "created_at", "is_consumed" });

            migrationBuilder.CreateIndex(
                name: "ix_chat_messages_session_id_index_id",
                table: "chat_messages",
                columns: new[] { "session_id", "index", "id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "chat_messages");

            migrationBuilder.DropIndex(
                name: "ix_chat_attachments_blob_id",
                table: "chat_attachments");

            migrationBuilder.DropIndex(
                name: "ix_chat_attachments_created_at_is_consumed",
                table: "chat_attachments");
        }
    }
}
