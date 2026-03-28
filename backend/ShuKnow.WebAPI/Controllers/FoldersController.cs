using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ShuKnow.WebAPI.Dto.Files;
using ShuKnow.WebAPI.Dto.Folders;
using ShuKnow.WebAPI.Requests.Folders;

namespace ShuKnow.WebAPI.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class FoldersController : ControllerBase
{
    private static readonly Guid MockDocumentsId = Guid.Parse("6ef7d767-88fb-4d3a-b52c-9586d304f022");
    private static readonly Guid MockPhotosId = Guid.Parse("9605cb52-a7a0-4f7f-b5cb-be54f6e716f7");
    private static readonly DateTimeOffset MockCreatedAt = new(2026, 1, 15, 10, 30, 0, TimeSpan.Zero);

    [HttpGet("tree")]
    public async Task<ActionResult<IReadOnlyList<FolderTreeNodeDto>>> GetFolderTree()
    {
        // TODO: implement
        var photosFolder = new FolderTreeNodeDto(MockPhotosId, "Photos", string.Empty, "📷", 0, 0, []);
        return new[] { new FolderTreeNodeDto(MockDocumentsId, "Documents", "Documents folder", "📄", 0, 1, [photosFolder]) };
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<FolderDto>>> GetFolders([FromQuery] Guid? parentId)
    {
        // TODO: implement
        return new[] { new FolderDto(MockDocumentsId, "Documents", "Documents folder", "📄", null, 0, 1, true, null) };
    }

    [HttpPost]
    public async Task<ActionResult<FolderDto>> CreateFolder([FromBody] CreateFolderRequest request)
    {
        // TODO: implement
        var folder = new FolderDto(Guid.NewGuid(), request.Name, request.Description ?? string.Empty,
            request.Emoji, request.ParentFolderId, 0, 0, false, null);
        return CreatedAtAction(nameof(GetFolder), new { folderId = folder.Id }, folder);
    }

    [HttpGet("{folderId}")]
    public async Task<ActionResult<FolderDto>> GetFolder(Guid folderId)
    {
        // TODO: implement
        return new FolderDto(folderId, "Foobar", string.Empty, null, null, 0, 0, false, null);
    }

    [HttpPut("{folderId}")]
    public async Task<ActionResult<FolderDto>> UpdateFolder(Guid folderId, [FromBody] UpdateFolderRequest request)
    {
        // TODO: implement
        return new FolderDto(folderId, request.Name ?? "Old name", request.Description ?? "Old description",
            request.Emoji, null, 0, 0, false, null);
    }

    [HttpDelete("{folderId}")]
    public async Task<ActionResult> DeleteFolder(Guid folderId)
    {
        // TODO: implement
        return NoContent();
    }

    [HttpPatch("{folderId}/move")]
    public async Task<ActionResult<FolderDto>> MoveFolder(Guid folderId, [FromBody] MoveFolderRequest request)
    {
        // TODO: implement
        return new FolderDto(folderId, "Foobar", string.Empty, null, request.NewParentFolderId, 0, 0, false, null);
    }

    [HttpPatch("{folderId}/reorder")]
    public async Task<ActionResult> ReorderFolder(Guid folderId, [FromBody] ReorderFolderRequest request)
    {
        // TODO: implement
        return NoContent();
    }

    [HttpGet("{folderId}/children")]
    public async Task<ActionResult<IReadOnlyList<FolderDto>>> GetFolderChildren(Guid folderId)
    {
        // TODO: implement
        return new[] { new FolderDto(MockDocumentsId, "Photos", string.Empty, "📷", null, 0, 1, true, null) };
    }

    [HttpGet("{folderId}/files")]
    public async Task<ActionResult<PagedFileResult>> GetFolderFiles(Guid folderId,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        // TODO: implement
        return new PagedFileResult([], 0, page, pageSize, false);
    }

    [HttpPost("{folderId}/files")]
    public async Task<ActionResult<FileDto>> UploadFile(Guid folderId,
        IFormFile file, [FromForm] string? name = null, [FromForm] string? description = null)
    {
        // TODO: implement
        var fileDto = new FileDto(Guid.NewGuid(), folderId, "Folder",
            name ?? file.FileName, description ?? string.Empty, file.ContentType, file.Length, 1, null, 0, MockCreatedAt);
        return CreatedAtAction("GetFile", "Files", new { fileId = fileDto.Id }, fileDto);
    }
}