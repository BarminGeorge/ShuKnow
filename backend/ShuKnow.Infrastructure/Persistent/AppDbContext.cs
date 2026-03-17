using Microsoft.EntityFrameworkCore;
using ShuKnow.Domain.Entities;
using ShuKnow.Infrastructure.Misc;
using File = ShuKnow.Domain.Entities.File;

namespace ShuKnow.Infrastructure.Persistent;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users { get; set; }
    public DbSet<IdentityUser> IdentityUsers { get; set; }
    public DbSet<Folder> Folders { get; set; }
    public DbSet<File> Files { get; set; }

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

        modelBuilder.Entity<Folder>(entity =>
        {
            entity.ToTable("folders");
            entity.HasKey(f => f.Id);

            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(f => f.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne<Folder>()
                .WithMany()
                .HasForeignKey(f => f.ParentFolderId)
                .OnDelete(DeleteBehavior.Cascade)
                .IsRequired(false);
        });

        modelBuilder.Entity<File>(entity =>
        {
            entity.ToTable("files");
            entity.HasKey(f => f.Id);

            entity.HasOne(f => f.Folder)
                .WithMany()
                .HasForeignKey(f => f.FolderId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}