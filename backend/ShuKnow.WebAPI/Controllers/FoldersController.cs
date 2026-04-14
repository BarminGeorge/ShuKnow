using Ardalis.Result;
using Ardalis.Result.AspNetCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ShuKnow.Application.Extensions;
using ShuKnow.Application.Interfaces;
using ShuKnow.WebAPI.Dto.Files;
using ShuKnow.WebAPI.Dto.Folders;
using ShuKnow.WebAPI.Mappers;
using ShuKnow.WebAPI.Requests.Folders;
using DomainFile = ShuKnow.Domain.Entities.File;

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
        return (await folderService.GetTreeAsync(ct))
            .Map(folders => folders.ToTree())
            .ToActionResult(this);
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<FolderDto>>> GetFolders(
        [FromQuery] Guid? parentId,
        CancellationToken ct)
    {
        return (await folderService.ListAsync(parentId, ct))
            .Map(folders => folders.ToDto())
            .ToActionResult(this);
    }

    [HttpPost]
    public async Task<ActionResult<FolderDto>> CreateFolder(
        [FromBody] CreateFolderRequest request,
        CancellationToken ct)
    {
        return (await folderService.CreateAsync(request.ToModel(currentUser.UserId), ct))
            .Map(createdFolder => createdFolder.ToDto())
            .ToActionResult(this);
    }

    [HttpGet("{folderId}")]
    public async Task<ActionResult<FolderDto>> GetFolder(Guid folderId, CancellationToken ct)
    {
        return (await folderService.GetByIdAsync(folderId, ct))
            .Map(folder => folder.ToDto())
            .ToActionResult(this);
    }

    [HttpPut("{folderId}")]
    public async Task<ActionResult<FolderDto>> UpdateFolder(
        Guid folderId,
        [FromBody] UpdateFolderRequest request,
        CancellationToken ct)
    {
        return (await folderService.GetByIdAsync(folderId, ct)
            .Map(folder => request.ToUpdatedModel(folder))
            .BindAsync(folder => folderService.UpdateAsync(folder, ct)))
            .Map(savedFolder => savedFolder.ToDto())
            .ToActionResult(this);
    }

    [HttpDelete("{folderId}")]
    public async Task<ActionResult> DeleteFolder(
        Guid folderId,
        CancellationToken ct = default)
    {
        return (await folderService.DeleteAsync(folderId, ct)).ToActionResult(this);
    }

    [HttpPatch("{folderId}/move")]
    public async Task<ActionResult<FolderDto>> MoveFolder(
        Guid folderId,
        [FromBody] MoveFolderRequest request,
        CancellationToken ct)
    {
        return (await folderService.MoveAsync(folderId, request.NewParentFolderId, ct))
            .Map(folder => folder.ToDto())
            .ToActionResult(this);
    }

    [HttpPatch("{folderId}/reorder")]
    public async Task<ActionResult> ReorderFolder(
        Guid folderId,
        [FromBody] ReorderFolderRequest request,
        CancellationToken ct)
    {
        return (await folderService.ReorderAsync(folderId, request.Position, ct)).ToActionResult(this);
    }

    [HttpGet("{folderId}/children")]
    public async Task<ActionResult<IReadOnlyList<FolderDto>>> GetFolderChildren(
        Guid folderId,
        CancellationToken ct)
    {
        return (await folderService.GetChildrenAsync(folderId, ct))
            .Map(folders => folders.ToDto())
            .ToActionResult(this);
    }

    [HttpGet("{folderId}/files")]
    public async Task<ActionResult<PagedFileResult>> GetFolderFiles(Guid folderId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        PagedFileResult ToDto((IReadOnlyList<DomainFile> Files, int TotalCount) filePage) =>
            filePage.ToDto(page, pageSize);

        return (await fileService.ListByFolderAsync(folderId, page, pageSize, ct))
            .Map(ToDto)
            .ToActionResult(this);
    }   

    [HttpPost("{folderId}/files")]
    public async Task<ActionResult<FileDto>> UploadFile(Guid folderId,
        IFormFile file,
        [FromForm] string? name = null,
        [FromForm] string? description = null,
        CancellationToken ct = default)
    {
        await using var stream = file.OpenReadStream();

        DomainFile ToModel(IFormFile upload) =>
            upload.ToModel(currentUser.UserId, folderId, name, description);

        FileDto ToDto(DomainFile uploadedFile) =>
            uploadedFile.ToDto();

        return (await Result.Success(file)
            .Map(ToModel)
            .BindAsync(model => fileService.UploadAsync(model, stream, ct)))
            .Map(ToDto)
            .ToActionResult(this);
    }
}
