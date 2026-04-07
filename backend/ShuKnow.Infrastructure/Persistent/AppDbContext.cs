using Microsoft.EntityFrameworkCore;
using ShuKnow.Domain.Entities;
using ShuKnow.Infrastructure.Misc;

namespace ShuKnow.Infrastructure.Persistent;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users { get; set; }
    public DbSet<Folder> Folders { get; set; }
    public DbSet<IdentityUser> IdentityUsers { get; set; }
    public DbSet<ChatSession> ChatSessions { get; set; }
    public DbSet<UserAiSettings> UserAiSettings { get; set; }

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
            entity.HasKey(folder => folder.Id);

            entity.Property(folder => folder.Name)
                .HasMaxLength(256);

            entity.HasIndex(folder => new { folder.UserId, folder.ParentFolderId, folder.SortOrder });
            entity.HasIndex(folder => new { folder.UserId, folder.ParentFolderId, folder.Name });

            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(folder => folder.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne<Folder>()
                .WithMany()
                .HasForeignKey(folder => folder.ParentFolderId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ChatSession>(entity =>
        {
            entity.ToTable("chat_sessions");
            entity.HasKey(session => session.Id);

            entity.Property(session => session.Status)
                .HasConversion<int>();

            entity.HasIndex(session => session.UserId)
                .HasFilter("\"status\" = 1")
                .IsUnique();

            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(session => session.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // TODO: убрать после реализации ChatMessageRepository
            entity.Ignore(session => session.Messages);
        });

        modelBuilder.Entity<UserAiSettings>(entity =>
        {
            entity.ToTable("user_ai_settings");
            entity.HasKey(s => s.UserId);

            entity.HasOne<User>()
                .WithOne()
                .HasForeignKey<UserAiSettings>(s => s.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
