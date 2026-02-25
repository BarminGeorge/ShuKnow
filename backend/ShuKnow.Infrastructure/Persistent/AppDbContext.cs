using Microsoft.EntityFrameworkCore;
using ShuKnow.Domain.Entities;
using ShuKnow.Infrastructure.Misc;

namespace ShuKnow.Infrastructure.Persistent;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users { get; set; }
    public DbSet<IdentityUser> IdentityUsers { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(u => u.Id);
        });
        
        modelBuilder.Entity<IdentityUser>(entity =>
        {
            entity.ToTable("identity_users");
            entity.HasKey(u => u.Id);
            entity.HasIndex(u => u.Login)
                .IsUnique();

            entity.HasOne<User>()
                .WithOne()
                .HasForeignKey<IdentityUser>(iu => iu.Id)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}