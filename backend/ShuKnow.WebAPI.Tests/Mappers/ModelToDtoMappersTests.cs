using AwesomeAssertions;
using ShuKnow.Domain.Entities;
using ShuKnow.WebAPI.Mappers;

namespace ShuKnow.WebAPI.Tests.Mappers;

public class ModelToDtoMappersTests
{
    [Test]
    public void ToDto_WhenFolderMapped_ShouldMapOnlyKnownFolderFields()
    {
        var parentId = Guid.NewGuid();
        var folder = new Folder(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "Docs",
            "Project docs",
            parentId,
            sortOrder: 3,
            emoji: "D");

        var dto = folder.ToDto();

        dto.Id.Should().Be(folder.Id);
        dto.Name.Should().Be(folder.Name);
        dto.Description.Should().Be(folder.Description);
        dto.Emoji.Should().Be(folder.Emoji);
        dto.ParentFolderId.Should().Be(parentId);
        dto.SortOrder.Should().Be(3);
    }

    [Test]
    public void ToTree_WhenFoldersHaveParentChildRelation_ShouldMapChildren()
    {
        var userId = Guid.NewGuid();
        var root = new Folder(Guid.NewGuid(), userId, "Root", "Root folder");
        var child = new Folder(Guid.NewGuid(), userId, "Child", "Child folder", root.Id);

        var tree = new[] { root, child }.ToTree();

        tree.Should().ContainSingle();
        tree[0].Id.Should().Be(root.Id);
        tree[0].Children.Should().ContainSingle();
        tree[0].Children[0].Id.Should().Be(child.Id);
    }

    [Test]
    public void ToDto_WhenChatSessionMapped_ShouldMapProvidedMessageCount()
    {
        var session = new ChatSession(Guid.NewGuid(), Guid.NewGuid());

        var dto = session.ToDto(messageCount: 2);

        dto.MessageCount.Should().Be(2);
        dto.CanRollback.Should().BeFalse();
    }

    [Test]
    public void ToDto_WhenChatMessageMapped_ShouldUseCreatedAtInsteadOfIndex()
    {
        var createdAt = new DateTimeOffset(2026, 04, 01, 12, 00, 00, TimeSpan.Zero);
        var message = ChatMessage.CreateUserMessage(Guid.NewGuid(), "Hello", createdAt);

        var dto = message.ToDto();

        dto.Id.Should().Be(message.Id);
        dto.Content.Should().Be("Hello");
        dto.CreatedAt.Should().Be(createdAt);
    }
}
