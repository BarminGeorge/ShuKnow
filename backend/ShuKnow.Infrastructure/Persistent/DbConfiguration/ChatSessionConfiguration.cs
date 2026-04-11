using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Infrastructure.Persistent.DbConfiguration;

internal class ChatSessionConfiguration : IEntityTypeConfiguration<ChatSession>
{
    public void Configure(EntityTypeBuilder<ChatSession> builder)
    {
        builder.ToTable("chat_sessions");
        builder.HasKey(session => session.Id);

        builder.Property(session => session.Status)
            .HasConversion<int>();

        builder.HasIndex(session => session.UserId)
            .HasFilter("\"status\" = 1")
            .IsUnique();

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(session => session.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(session => session.Messages)
            .WithOne()
            .HasForeignKey(message => message.SessionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}