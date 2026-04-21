using Ardalis.Result;
using Ardalis.Result.AspNetCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ShuKnow.Application.Extensions;
using ShuKnow.Application.Interfaces;
using ShuKnow.Metrics.Services;
using ShuKnow.WebAPI.Dto.Files;
using ShuKnow.WebAPI.Mappers;
using ShuKnow.WebAPI.Requests.Files;
using ShuKnow.WebAPI.Utility;

namespace ShuKnow.WebAPI.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class FilesController(
    IFileService fileService,
    IMetricsService metricsService,
    ICurrentUserService currentUserService)
    : ControllerBase
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
                    file.UpdateMetadata(request.Name, request.Description);
                    return fileService.UpdateMetadataAsync(file, ct);
                }))
            .Map(updatedFile => updatedFile.ToDto())
            .ToActionResult(this);
    }

    [HttpDelete("{fileId}")]
    public async Task<ActionResult> DeleteFile(Guid fileId, CancellationToken ct)
    {
        return (await fileService.DeleteAsync(fileId, ct))
            .ToActionResult(this);
    }

    [HttpGet("{fileId}/content")]
    public async Task<ActionResult> DownloadFileContent(
        Guid fileId,
        [FromHeader(Name = "Range")] string? range = null,
        CancellationToken ct = default)
    {
        if (!RangeHeaderParser.TryParse(range, out var rangeStart, out var rangeEnd))
            return BadRequest("Only single byte ranges in the format 'bytes=start-end' are supported.");

        var result = await fileService.GetByIdAsync(fileId, ct)
            .BindAsync(_ => fileService.GetContentAsync(fileId, rangeStart, rangeEnd, ct)
                .MapAsync(content => (content.Content, content.ContentType)))
            .TapAsync(async _ => await metricsService.RecordContentOpenedAsync(fileId));

        return result.IsSuccess
            ? File(result.Value.Content, result.Value.ContentType)
            : result.Map().ToActionResult(this);
    }

    [HttpPut("{fileId}/content")]
    public async Task<ActionResult<FileDto>> ReplaceFileContent(
        Guid fileId,
        IFormFile file,
        CancellationToken ct)
    {
        await using var stream = file.OpenReadStream();

        return (await fileService.ReplaceContentAsync(fileId, stream, file.ContentType, ct)
                .TapAsync(async updatedFile =>
                    await metricsService.RecordContentSavedAsync(currentUserService.UserId, updatedFile.Id))
                .Map(updatedFile => updatedFile.ToDto()))
            .ToActionResult(this);
    }

    [HttpPatch("{fileId}/content")]
    public async Task<ActionResult<FileDto>> UpdateTextContent(
        Guid fileId,
        [FromBody] UpdateTextContentRequest request,
        CancellationToken ct)
    {
        return (await fileService.UpdateTextContentAsync(fileId, request.Content, ct)
                .TapAsync(async file =>
                    await metricsService.RecordContentSavedAsync(currentUserService.UserId, file.Id))
                .Map(file => file.ToDto()))
            .ToActionResult(this);
    }

    [HttpPatch("{fileId}/move")]
    public async Task<ActionResult<FileDto>> MoveFile(
        Guid fileId,
        [FromBody] MoveFileRequest request,
        CancellationToken ct)
    {
        return (await fileService.MoveAsync(fileId, request.TargetFolderId, ct: ct)
                .TapAsync(async _ => await metricsService.RecordManualMoveAsync(fileId))
                .Map(file => file.ToDto()))
            .ToActionResult(this);
    }

    [HttpPatch("{fileId}/reorder")]
    public async Task<ActionResult> ReorderFile(
        Guid fileId,
        [FromBody] ReorderFileRequest request,
        CancellationToken ct)
    {
        return (await fileService.ReorderAsync(fileId, request.Position, ct))
            .ToActionResult(this);
    }
}
