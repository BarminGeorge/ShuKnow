using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Infrastructure.Persistent.DbConfiguration;

internal class UserAiSettingConfiguration : IEntityTypeConfiguration<UserAiSettings>
{
    public void Configure(EntityTypeBuilder<UserAiSettings> builder)
    {
        builder.ToTable("user_ai_settings");
        builder.HasKey(s => s.UserId);

        builder.HasOne<User>()
            .WithOne()
            .HasForeignKey<UserAiSettings>(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}