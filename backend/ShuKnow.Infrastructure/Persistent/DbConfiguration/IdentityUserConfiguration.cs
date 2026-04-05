using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ShuKnow.Domain.Entities;
using ShuKnow.Infrastructure.Misc;

namespace ShuKnow.Infrastructure.Persistent.DbConfiguration;

public class IdentityUserConfiguration : IEntityTypeConfiguration<IdentityUser>
{
    public void Configure(EntityTypeBuilder<IdentityUser> builder)
    {
        builder.ToTable("identity_users");
        builder.HasKey(u => u.Id);
        builder.HasIndex(u => u.Login)
            .IsUnique();

        builder.HasOne<User>()
            .WithOne()
            .HasForeignKey<IdentityUser>(iu => iu.Id)
            .OnDelete(DeleteBehavior.Cascade);
    }
}