using Ardalis.Result;
using Ardalis.Result.AspNetCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ShuKnow.Application.Interfaces;
using ShuKnow.WebAPI.Dto.Files;
using ShuKnow.WebAPI.Dto.Folders;
using ShuKnow.WebAPI.Mappers;
using ShuKnow.WebAPI.Requests.Folders;
using DomainFile = ShuKnow.Domain.Entities.File;
using Folder = ShuKnow.Domain.Entities.Folder;

namespace ShuKnow.WebAPI.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class FoldersController(
    IFolderService folderService,
    IFileService fileService,
    ICurrentUserService currentUser)
    : ControllerBase
{
    [HttpGet("tree")]
    public async Task<ActionResult<IReadOnlyList<FolderTreeNodeDto>>> GetFolderTree(CancellationToken ct)
    {
        var result = await folderService.GetTreeAsync(ct);
        return result
            .Map(folders => folders.ToTree())
            .ToActionResult(this);
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<FolderDto>>> GetFolders(
        [FromQuery] Guid? parentId,
        CancellationToken ct)
    {
        var result = await folderService.ListAsync(parentId, ct);
        return result
            .Map(folders => (IReadOnlyList<FolderDto>)folders.Select(folder => folder.ToDto()).ToList())
            .ToActionResult(this);
    }

    [HttpPost]
    public async Task<ActionResult<FolderDto>> CreateFolder(
        [FromBody] CreateFolderRequest request,
        CancellationToken ct)
    {
        var folder = new Folder(
            Guid.NewGuid(),
            currentUser.UserId,
            request.Name,
            request.Description ?? string.Empty,
            request.ParentFolderId,
            emoji: request.Emoji);

        var result = await folderService.CreateAsync(folder, ct);
        return result.IsSuccess
            ? CreatedAtAction(nameof(GetFolder), new { folderId = result.Value.Id }, result.Value.ToDto())
            : result.Map(createdFolder => createdFolder.ToDto()).ToActionResult(this);
    }

    [HttpGet("{folderId}")]
    public async Task<ActionResult<FolderDto>> GetFolder(Guid folderId, CancellationToken ct)
    {
        var result = await folderService.GetByIdAsync(folderId, ct);
        return result
            .Map(folder => folder.ToDto())
            .ToActionResult(this);
    }

    [HttpPut("{folderId}")]
    public async Task<ActionResult<FolderDto>> UpdateFolder(
        Guid folderId,
        [FromBody] UpdateFolderRequest request,
        CancellationToken ct)
    {
        var folderResult = await folderService.GetByIdAsync(folderId, ct);
        if (!folderResult.IsSuccess)
            return folderResult.Map(folder => folder.ToDto()).ToActionResult(this);

        var folder = folderResult.Value;
        var updatedFolder = new Folder(
            folder.Id,
            folder.UserId,
            request.Name ?? folder.Name,
            request.Description ?? folder.Description,
            folder.ParentFolderId,
            folder.SortOrder,
            request.Emoji ?? folder.Emoji);

        var result = await folderService.UpdateAsync(updatedFolder, ct);
        return result
            .Map(savedFolder => savedFolder.ToDto())
            .ToActionResult(this);
    }

    [HttpDelete("{folderId}")]
    public async Task<ActionResult> DeleteFolder(
        Guid folderId,
        CancellationToken ct = default)
    {
        var result = await folderService.DeleteAsync(folderId, ct);
        return result.ToActionResult(this);
    }

    [HttpPatch("{folderId}/move")]
    public async Task<ActionResult<FolderDto>> MoveFolder(
        Guid folderId,
        [FromBody] MoveFolderRequest request,
        CancellationToken ct)
    {
        var result = await folderService.MoveAsync(folderId, request.NewParentFolderId, ct);
        return result
            .Map(folder => folder.ToDto())
            .ToActionResult(this);
    }

    [HttpPatch("{folderId}/reorder")]
    public async Task<ActionResult> ReorderFolder(
        Guid folderId,
        [FromBody] ReorderFolderRequest request,
        CancellationToken ct)
    {
        var result = await folderService.ReorderAsync(folderId, request.Position, ct);
        return result.ToActionResult(this);
    }

    [HttpGet("{folderId}/children")]
    public async Task<ActionResult<IReadOnlyList<FolderDto>>> GetFolderChildren(
        Guid folderId,
        CancellationToken ct)
    {
        var result = await folderService.GetChildrenAsync(folderId, ct);
        return result
            .Map(folders => (IReadOnlyList<FolderDto>)folders.Select(folder => folder.ToDto()).ToList())
            .ToActionResult(this);
    }

    [HttpGet("{folderId}/files")]
    public async Task<ActionResult<PagedFileResult>> GetFolderFiles(Guid folderId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        var result = await fileService.ListByFolderAsync(folderId, page, pageSize, ct);
        return result
            .Map(filePage => new PagedFileResult(
                filePage.Files.Select(file => file.ToDto()).ToList(),
                filePage.TotalCount,
                page,
                pageSize,
                page * pageSize < filePage.TotalCount))
            .ToActionResult(this);
    }

    [HttpPost("{folderId}/files")]
    public async Task<ActionResult<FileDto>> UploadFile(Guid folderId,
        IFormFile file,
        [FromForm] string? name = null,
        [FromForm] string? description = null,
        CancellationToken ct = default)
    {
        var domainFile = new DomainFile(
            Guid.NewGuid(),
            currentUser.UserId,
            folderId,
            name ?? file.FileName,
            description ?? string.Empty,
            file.ContentType,
            file.Length);

        await using var stream = file.OpenReadStream();

        var result = await fileService.UploadAsync(domainFile, stream, ct);
        return result.IsSuccess
            ? CreatedAtAction("GetFile", "Files", new { fileId = result.Value.Id }, result.Value.ToDto())
            : result.Map(uploadedFile => uploadedFile.ToDto()).ToActionResult(this);
    }
}
