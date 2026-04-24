using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShuKnow.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AllowMultipleChatSessionsAndCleanup : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_files_folders_folder_id",
                table: "files");

            migrationBuilder.DropIndex(
                name: "ix_chat_sessions_user_id",
                table: "chat_sessions");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "created_at",
                table: "chat_sessions",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "last_activity_at",
                table: "chat_sessions",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.CreateIndex(
                name: "ix_chat_sessions_last_activity_at",
                table: "chat_sessions",
                column: "last_activity_at");

            migrationBuilder.CreateIndex(
                name: "ix_chat_sessions_user_id",
                table: "chat_sessions",
                column: "user_id");

            migrationBuilder.AddForeignKey(
                name: "fk_files_folders_folder_id",
                table: "files",
                column: "folder_id",
                principalTable: "folders",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_files_folders_folder_id",
                table: "files");

            migrationBuilder.DropIndex(
                name: "ix_chat_sessions_last_activity_at",
                table: "chat_sessions");

            migrationBuilder.DropIndex(
                name: "ix_chat_sessions_user_id",
                table: "chat_sessions");

            migrationBuilder.DropColumn(
                name: "created_at",
                table: "chat_sessions");

            migrationBuilder.DropColumn(
                name: "last_activity_at",
                table: "chat_sessions");

            migrationBuilder.CreateIndex(
                name: "ix_chat_sessions_user_id",
                table: "chat_sessions",
                column: "user_id",
                unique: true,
                filter: "\"status\" = 1");

            migrationBuilder.AddForeignKey(
                name: "fk_files_folders_folder_id",
                table: "files",
                column: "folder_id",
                principalTable: "folders",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
