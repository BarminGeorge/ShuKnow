using Microsoft.EntityFrameworkCore;
using ShuKnow.Infrastructure.Persistent;
using Testcontainers.PostgreSql;

namespace ShuKnow.Infrastructure.IntegrationTests.Persistent.Repositories;

public class BaseRepositoryTests
{
    protected AppDbContext Context = null!;
    
    private PostgreSqlContainer postgresContainer = null!;
    private DbContextOptions<AppDbContext> dbContextOptions = null!;

    [OneTimeSetUp]
    public async Task OneTimeSetUp()
    {
        postgresContainer = new PostgreSqlBuilder("postgres:16-alpine")
            .WithDatabase("shuknow_integration_tests")
            .WithUsername("postgres")
            .WithPassword("postgres")
            .Build();

        await postgresContainer.StartAsync();

        dbContextOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(postgresContainer.GetConnectionString())
            .UseSnakeCaseNamingConvention()
            .Options;

        await using var migrationContext = CreateDbContext();
        await migrationContext.Database.MigrateAsync();
    }
    
    [SetUp]
    public virtual async Task SetUp()
    {
        await ResetDatabaseAsync();
        Context = CreateDbContext();
    }
    
    [TearDown]
    public async Task TearDown()
    {
        if (Context is not null) 
            await Context.DisposeAsync();
    }

    [OneTimeTearDown]
    public async Task OneTimeTearDown()
    {
        if (postgresContainer is not null) 
            await postgresContainer.DisposeAsync();
    }
    
    protected AppDbContext CreateDbContext()
    {
        return new AppDbContext(dbContextOptions);
    }
    
    private async Task ResetDatabaseAsync()
    {
        await using var resetContext = CreateDbContext();

        await resetContext.Database.ExecuteSqlRawAsync("""
            TRUNCATE TABLE
                folders,
                identity_users,
                chat_sessions,
                user_ai_settings,
                users
            CASCADE;
            """);
    }
}
