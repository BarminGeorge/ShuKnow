using Ardalis.Result;
using AwesomeAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using NSubstitute;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Entities;
using ShuKnow.WebAPI.Controllers;
using ShuKnow.WebAPI.Dto.Chat;

namespace ShuKnow.WebAPI.Tests.Controllers;

public class ChatControllerTests
{
    private IChatService chatService = null!;
    private IAttachmentService attachmentService = null!;
    private ICurrentUserService currentUser = null!;
    private Guid currentUserId;
    private ChatController sut = null!;

    [SetUp]
    public void SetUp()
    {
        chatService = Substitute.For<IChatService>();
        attachmentService = Substitute.For<IAttachmentService>();
        currentUser = Substitute.For<ICurrentUserService>();
        currentUserId = Guid.NewGuid();

        currentUser.UserId.Returns(currentUserId);
        sut = new ChatController(chatService, attachmentService, currentUser)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext(),
                ActionDescriptor = new ControllerActionDescriptor()
            }
        };
    }

    [Test]
    public async Task UploadChatAttachments_WhenFilesProvided_ShouldPersistAttachmentsAndReturnDtos()
    {
        var formFiles = new FormFileCollection
        {
            CreateFormFile("notes.txt", "text/plain", [1, 2, 3]),
            CreateFormFile("image.png", "image/png", [4, 5])
        };
        IReadOnlyList<(ChatAttachment Attachment, Stream Content)>? capturedUploads = null;
        IReadOnlyList<ChatAttachment> savedAttachments = [];

        attachmentService
            .UploadAsync(
                Arg.Do<IReadOnlyList<(ChatAttachment Attachment, Stream Content)>>(uploads =>
                {
                    capturedUploads = uploads;
                    savedAttachments = uploads.Select(upload =>
                    {
                        upload.Attachment.SetBlobId(Guid.NewGuid());
                        return upload.Attachment;
                    }).ToList();
                }),
                Arg.Any<CancellationToken>())
            .Returns(_ => Task.FromResult(Result.Success(savedAttachments)));

        var response = await sut.UploadChatAttachments(formFiles, CancellationToken.None);

        var objectResult = response.Result.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(StatusCodes.Status200OK);
        var dtos = objectResult.Value.Should().BeAssignableTo<IReadOnlyList<AttachmentDto>>().Subject;
        dtos.Should().BeEquivalentTo(savedAttachments.Select(attachment => new AttachmentDto(
            attachment.Id,
            attachment.FileName,
            attachment.ContentType,
            attachment.SizeBytes)));
        capturedUploads.Should().NotBeNull();
        capturedUploads!.Should().HaveCount(2);
        capturedUploads[0].Attachment.UserId.Should().Be(currentUserId);
        capturedUploads[0].Attachment.FileName.Should().Be("notes.txt");
        capturedUploads[0].Attachment.ContentType.Should().Be("text/plain");
        capturedUploads[0].Attachment.SizeBytes.Should().Be(3);
        capturedUploads[1].Attachment.UserId.Should().Be(currentUserId);
        capturedUploads[1].Attachment.FileName.Should().Be("image.png");
        capturedUploads[1].Attachment.ContentType.Should().Be("image/png");
        capturedUploads[1].Attachment.SizeBytes.Should().Be(2);
        await attachmentService.Received(1)
            .UploadAsync(Arg.Any<IReadOnlyList<(ChatAttachment Attachment, Stream Content)>>(), Arg.Any<CancellationToken>());
    }

    private static FormFile CreateFormFile(string fileName, string contentType, byte[] content)
    {
        var stream = new MemoryStream(content);
        return new FormFile(stream, 0, content.Length, "files", fileName)
        {
            Headers = new HeaderDictionary(),
            ContentType = contentType
        };
    }
}
