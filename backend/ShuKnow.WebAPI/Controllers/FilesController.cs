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
        var result = await fileService.GetByIdAsync(fileId, ct);
        return result
            .Map(file => file.ToDto())
            .ToActionResult(this);
    }

    [HttpPut("{fileId}")]
    public async Task<ActionResult<FileDto>> UpdateFileMetadata(
        Guid fileId,
        [FromBody] UpdateFileMetadataRequest request,
        CancellationToken ct)
    {
        var fileResult = await fileService.GetByIdAsync(fileId, ct);
        if (!fileResult.IsSuccess)
            return fileResult.Map(file => file.ToDto()).ToActionResult(this);

        var file = fileResult.Value;
        file.UpdateMetadata(request.Name ?? file.Name, request.Description ?? file.Description);

        var result = await fileService.UpdateMetadataAsync(file, ct);
        return result
            .Map(updatedFile => updatedFile.ToDto())
            .ToActionResult(this);
    }

    [HttpDelete("{fileId}")]
    public async Task<ActionResult> DeleteFile(Guid fileId, CancellationToken ct)
    {
        var result = await fileService.DeleteAsync(fileId, ct);
        return result.ToActionResult(this);
    }

    [HttpGet("{fileId}/content")]
    public async Task<ActionResult> DownloadFileContent(Guid fileId,
        [FromHeader(Name = "Range")] string? range = null,
        CancellationToken ct = default)
    {
        if (!TryParseRange(range, out var rangeStart, out var rangeEnd))
            return BadRequest("Only single byte ranges in the format 'bytes=start-end' are supported.");

        var fileResult = await fileService.GetByIdAsync(fileId, ct);
        if (!fileResult.IsSuccess)
            return ToFailureActionResult(fileResult);

        var contentResult = await fileService.GetContentAsync(fileId, rangeStart, rangeEnd, ct);
        if (!contentResult.IsSuccess)
            return ToFailureActionResult(contentResult);

        var content = contentResult.Value;
        return File(content.Content, content.ContentType, fileResult.Value.Name);
    }

    [HttpPut("{fileId}/content")]
    public async Task<ActionResult<FileDto>> ReplaceFileContent(
        Guid fileId,
        IFormFile file,
        CancellationToken ct)
    {
        await using var stream = file.OpenReadStream();

        var result = await fileService.ReplaceContentAsync(fileId, stream, file.ContentType, ct);
        return result
            .Map(updatedFile => updatedFile.ToDto())
            .ToActionResult(this);
    }

    [HttpPatch("{fileId}/content")]
    public async Task<ActionResult<FileDto>> UpdateTextContent(Guid fileId,
        [FromBody] UpdateTextContentRequest request,
        CancellationToken ct)
    {
        var result = await fileService.UpdateTextContentAsync(fileId, request.Content, ct);
        return result
            .Map(file => file.ToDto())
            .ToActionResult(this);
    }

    [HttpPatch("{fileId}/move")]
    public async Task<ActionResult<FileDto>> MoveFile(
        Guid fileId,
        [FromBody] MoveFileRequest request,
        CancellationToken ct)
    {
        var result = await fileService.MoveAsync(fileId, request.TargetFolderId, ct);
        return result
            .Map(file => file.ToDto())
            .ToActionResult(this);
    }

    [HttpPatch("{fileId}/reorder")]
    public async Task<ActionResult> ReorderFile(
        Guid fileId,
        [FromBody] ReorderFileRequest request,
        CancellationToken ct)
    {
        var result = await fileService.ReorderAsync(fileId, request.Position, ct);
        return result.ToActionResult(this);
    }

    private ActionResult ToFailureActionResult<T>(Result<T> result)
    {
        return result.Status switch
        {
            ResultStatus.NotFound => NotFound(),
            ResultStatus.Invalid => BadRequest(result.ValidationErrors),
            ResultStatus.Conflict => Conflict(result.Errors),
            ResultStatus.Unauthorized => Unauthorized(),
            ResultStatus.Forbidden => Forbid(),
            _ => Problem(string.Join(Environment.NewLine, result.Errors))
        };
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
