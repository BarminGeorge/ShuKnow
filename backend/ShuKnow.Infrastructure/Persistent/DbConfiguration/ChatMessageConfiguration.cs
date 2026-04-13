using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Infrastructure.Persistent.DbConfiguration;

internal class ChatMessageConfiguration : IEntityTypeConfiguration<ChatMessage>
{
    public void Configure(EntityTypeBuilder<ChatMessage> builder)
    {
        builder.ToTable("chat_messages");
        builder.HasKey(m => m.Id);

        builder.Property(m => m.Role)
            .HasConversion<int>();

        builder.HasIndex(m => new { m.SessionId, m.Index, m.Id });
    }
}