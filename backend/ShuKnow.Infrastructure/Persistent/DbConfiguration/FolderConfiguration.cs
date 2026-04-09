using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Infrastructure.Persistent.DbConfiguration;

public class FolderConfiguration : IEntityTypeConfiguration<Folder>
{
    public void Configure(EntityTypeBuilder<Folder> builder)
    {
        builder.ToTable("folders");
        builder.HasKey(folder => folder.Id);

        builder.Property(folder => folder.Name)
            .HasMaxLength(256);

        builder.HasIndex(folder => new { folder.UserId, folder.ParentFolderId, folder.SortOrder });
        builder.HasIndex(folder => new { folder.UserId, folder.ParentFolderId, folder.Name });

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(folder => folder.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<Folder>()
            .WithMany()
            .HasForeignKey(folder => folder.ParentFolderId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}