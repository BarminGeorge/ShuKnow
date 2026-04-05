using Microsoft.EntityFrameworkCore;
using ShuKnow.Domain.Entities;
using ShuKnow.Infrastructure.Misc;

namespace ShuKnow.Infrastructure.Persistent;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users { get; set; }
    public DbSet<IdentityUser> IdentityUsers { get; set; }
    public DbSet<ChatSession> ChatSessions { get; set; }
    public DbSet<UserAiSettings> UserAiSettings { get; set; }
    public DbSet<ChatAttachment> ChatAttachments { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
