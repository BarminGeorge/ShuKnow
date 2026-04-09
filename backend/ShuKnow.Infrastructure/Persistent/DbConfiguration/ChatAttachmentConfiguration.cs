using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Infrastructure.Persistent.DbConfiguration;

internal class ChatAttachmentConfiguration : IEntityTypeConfiguration<ChatAttachment>
{
    public void Configure(EntityTypeBuilder<ChatAttachment> builder)
    {
        builder.ToTable("chat_attachments");
        builder.HasKey(e => e.Id);

        builder.Property(e => e.Id)
            .HasColumnName("id")
            .HasDefaultValueSql("gen_random_uuid()")
            .ValueGeneratedOnAdd();

        builder.Property(e => e.BlobId)
            .HasColumnName("blob_id")
            .IsRequired();

        builder.Property(e => e.UserId)
            .HasColumnName("user_id")
            .IsRequired();

        builder.Property(e => e.FileName)
            .HasColumnName("file_name")
            .IsRequired()
            .HasMaxLength(255);

        builder.Property(e => e.ContentType)
            .HasColumnName("content_type")
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(e => e.SizeBytes)
            .HasColumnName("size_bytes")
            .IsRequired();
        
        builder.Property(e => e.CreatedAt)
            .HasColumnName("created_at")
            .HasColumnType("timestamp with time zone")
            .HasDefaultValueSql("CURRENT_TIMESTAMP")
            .ValueGeneratedOnAdd();
        
        builder.Property(e => e.IsConsumed)
            .HasColumnName("is_consumed")
            .IsRequired();

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(e => e.UserId);
        builder.HasIndex(e => e.BlobId);
        builder.HasIndex(e => new { e.CreatedAt, e.IsConsumed });
    }
}