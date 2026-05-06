using System.Reflection;
using Ardalis.Result;
using AwesomeAssertions;
using ShuKnow.Domain.Entities;
using ShuKnow.Infrastructure.Persistent.Repositories;

namespace ShuKnow.Infrastructure.Tests.Persistent.Repositories;

public class FolderRepositoryTests
{
    [Test]
    public void BuildTreeFromFolders_WhenHierarchyContainsCycle_ShouldReturnAllFolders()
    {
        var userId = Guid.NewGuid();
        var rootId = Guid.NewGuid();
        var childId = Guid.NewGuid();
        var root = new Folder(rootId, userId, "root", "", childId);
        var child = new Folder(childId, userId, "child", "", rootId);

        var result = BuildTreeFromFolders([root, child]);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Select(folder => folder.Id).Should().BeEquivalentTo([rootId, childId]);
    }

    [Test]
    public void BuildTreeFromFolders_WhenHierarchyIsVeryDeep_ShouldReturnAllFolders()
    {
        var userId = Guid.NewGuid();
        var folders = new List<Folder>();
        Guid? parentId = null;

        for (var i = 0; i < 128; i++)
        {
            var folderId = Guid.NewGuid();
            folders.Add(new Folder(folderId, userId, $"folder-{i}", "", parentId));
            parentId = folderId;
        }

        var result = BuildTreeFromFolders(folders);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Select(folder => folder.Id)
            .Should().BeEquivalentTo(folders.Select(folder => folder.Id), options => options.WithStrictOrdering());
    }

    private static Result<IReadOnlyList<Folder>> BuildTreeFromFolders(List<Folder> folders)
    {
        var method = typeof(FolderRepository).GetMethod(
            "BuildTreeFromFolders",
            BindingFlags.NonPublic | BindingFlags.Static);

        method.Should().NotBeNull();
        return (Result<IReadOnlyList<Folder>>)method!.Invoke(null, [folders])!;
    }
}
