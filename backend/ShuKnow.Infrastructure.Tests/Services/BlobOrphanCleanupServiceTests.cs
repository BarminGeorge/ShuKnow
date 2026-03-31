using AwesomeAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NSubstitute;
using ShuKnow.Application.Common;
using ShuKnow.Infrastructure.Interfaces;
using ShuKnow.Infrastructure.Services;

namespace ShuKnow.Infrastructure.Tests.Services;

public class BlobOrphanCleanupServiceTests
{
    private IServiceScopeFactory scopeFactory = null!;
    private IBlobOrphanCleanupRunner runner = null!;
    private IOptions<OrphanCleanupOptions> options = null!;
    private ILogger<BlobOrphanCleanupService> logger = null!;
    private BlobOrphanCleanupService sut = null!;

    [SetUp]
    public void SetUp()
    {
        runner = Substitute.For<IBlobOrphanCleanupRunner>();
        logger = Substitute.For<ILogger<BlobOrphanCleanupService>>();
        options = Options.Create(new OrphanCleanupOptions
        {
            IntervalHours = 6,
            GracePeriodMinutes = 60
        });

        var serviceProvider = Substitute.For<IServiceProvider>();
        serviceProvider.GetService(typeof(IBlobOrphanCleanupRunner)).Returns(runner);

        var scope = Substitute.For<IServiceScope>();
        scope.ServiceProvider.Returns(serviceProvider);

        scopeFactory = Substitute.For<IServiceScopeFactory>();
        scopeFactory.CreateScope().Returns(scope);

        sut = new BlobOrphanCleanupService(scopeFactory, options, logger);
    }

    [TearDown]
    public void TearDown()
    {
        sut.Dispose();
    }

    [Test]
    public async Task RunCleanupAsync_ShouldResolveScopedRunnerAndReturnDeletedCount()
    {
        runner.RunCleanupAsync(Arg.Any<CancellationToken>()).Returns(3);

        var deleted = await sut.RunCleanupAsync(CancellationToken.None);

        deleted.Should().Be(3);
        scopeFactory.Received(1).CreateScope();
        await runner.Received(1).RunCleanupAsync(CancellationToken.None);
    }
}
