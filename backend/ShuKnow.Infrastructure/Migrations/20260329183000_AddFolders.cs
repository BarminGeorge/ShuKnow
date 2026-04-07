using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShuKnow.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddFolders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "folders",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    parent_folder_id = table.Column<Guid>(type: "uuid", nullable: true),
                    name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    description = table.Column<string>(type: "text", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_folders", x => x.id);
                    table.ForeignKey(
                        name: "fk_folders_folders_parent_folder_id",
                        column: x => x.parent_folder_id,
                        principalTable: "folders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_folders_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_folders_parent_folder_id",
                table: "folders",
                column: "parent_folder_id");

            migrationBuilder.CreateIndex(
                name: "ix_folders_user_id_parent_folder_id_name",
                table: "folders",
                columns: new[] { "user_id", "parent_folder_id", "name" });

            migrationBuilder.CreateIndex(
                name: "ix_folders_user_id_parent_folder_id_sort_order",
                table: "folders",
                columns: new[] { "user_id", "parent_folder_id", "sort_order" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "folders");
        }
    }
}
