using Ardalis.Result;
using Ardalis.Result.AspNetCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ShuKnow.Application.Interfaces;
using ShuKnow.WebAPI.Dto.Files;
using ShuKnow.WebAPI.Mappers;
using ShuKnow.WebAPI.Requests.Files;

namespace ShuKnow.WebAPI.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class FilesController(IFileService fileService) : ControllerBase
{
    [HttpGet("{fileId}")]
    public async Task<ActionResult<FileDto>> GetFile(Guid fileId, CancellationToken ct)
    {
        return (await fileService.GetByIdAsync(fileId, ct))
            .Map(file => file.ToDto())
            .ToActionResult(this);
    }

    [HttpPut("{fileId}")]
    public async Task<ActionResult<FileDto>> UpdateFileMetadata(
        Guid fileId,
        [FromBody] UpdateFileMetadataRequest request,
        CancellationToken ct)
    {
        return (await fileService.GetByIdAsync(fileId, ct)
            .BindAsync(file =>
            {
                file.UpdateMetadata(request.Name ?? file.Name, request.Description ?? file.Description);
                return fileService.UpdateMetadataAsync(file, ct);
            }))
            .Map(updatedFile => updatedFile.ToDto())
            .ToActionResult(this);
    }

    [HttpDelete("{fileId}")]
    public async Task<ActionResult> DeleteFile(Guid fileId, CancellationToken ct)
    {
        return (await fileService.DeleteAsync(fileId, ct)).ToActionResult(this);
    }

    [HttpGet("{fileId}/content")]
    public async Task<ActionResult> DownloadFileContent(Guid fileId,
        [FromHeader(Name = "Range")] string? range = null,
        CancellationToken ct = default)
    {
        if (!TryParseRange(range, out var rangeStart, out var rangeEnd))
            return BadRequest("Only single byte ranges in the format 'bytes=start-end' are supported.");

        var result = await fileService.GetByIdAsync(fileId, ct)
            .BindAsync(file => fileService.GetContentAsync(fileId, rangeStart, rangeEnd, ct)
                .MapAsync(content => (content.Content, content.ContentType, file.Name)));

        return result.IsSuccess
            ? File(result.Value.Content, result.Value.ContentType, result.Value.Name)
            : result.Map().ToActionResult(this);
    }

    [HttpPut("{fileId}/content")]
    public async Task<ActionResult<FileDto>> ReplaceFileContent(
        Guid fileId,
        IFormFile file,
        CancellationToken ct)
    {
        await using var stream = file.OpenReadStream();

        return (await fileService.ReplaceContentAsync(fileId, stream, file.ContentType, ct))
            .Map(updatedFile => updatedFile.ToDto())
            .ToActionResult(this);
    }

    [HttpPatch("{fileId}/content")]
    public async Task<ActionResult<FileDto>> UpdateTextContent(Guid fileId,
        [FromBody] UpdateTextContentRequest request,
        CancellationToken ct)
    {
        return (await fileService.UpdateTextContentAsync(fileId, request.Content, ct))
            .Map(file => file.ToDto())
            .ToActionResult(this);
    }

    [HttpPatch("{fileId}/move")]
    public async Task<ActionResult<FileDto>> MoveFile(
        Guid fileId,
        [FromBody] MoveFileRequest request,
        CancellationToken ct)
    {
        return (await fileService.MoveAsync(fileId, request.TargetFolderId, ct))
            .Map(file => file.ToDto())
            .ToActionResult(this);
    }

    [HttpPatch("{fileId}/reorder")]
    public async Task<ActionResult> ReorderFile(
        Guid fileId,
        [FromBody] ReorderFileRequest request,
        CancellationToken ct)
    {
        return (await fileService.ReorderAsync(fileId, request.Position, ct)).ToActionResult(this);
    }

    private static bool TryParseRange(string? range, out long? rangeStart, out long? rangeEnd)
    {
        rangeStart = null;
        rangeEnd = null;

        if (string.IsNullOrWhiteSpace(range))
            return true;

        if (!range.StartsWith("bytes=", StringComparison.OrdinalIgnoreCase))
            return false;

        var parts = range["bytes=".Length..].Split('-', 2);
        if (parts.Length != 2 || string.IsNullOrEmpty(parts[0]))
            return false;

        if (!long.TryParse(parts[0], out var start))
            return false;

        rangeStart = start;

        if (string.IsNullOrEmpty(parts[1]))
            return true;

        if (!long.TryParse(parts[1], out var inclusiveEnd))
            return false;

        rangeEnd = inclusiveEnd + 1;
        return true;
    }
}
