using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ShuKnow.WebAPI.Dto.Files;
using ShuKnow.WebAPI.Requests.Files;

namespace ShuKnow.WebAPI.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class FilesController : ControllerBase
{
    private static readonly Guid MockFolderId = Guid.Parse("6ef7d767-88fb-4d3a-b52c-9586d304f022");

    [HttpGet("{fileId}")]
    public async Task<ActionResult<FileDto>> GetFile(Guid fileId)
    {
        // TODO: implement
        return new FileDto(fileId, MockFolderId, "Documents", "report.pdf",
            "Annual report", "application/pdf", 204_800);
    }

    [HttpPut("{fileId}")]
    public async Task<ActionResult<FileDto>> UpdateFile(Guid fileId, [FromBody] UpdateFileRequest request)
    {
        // TODO: implement
        return new FileDto(fileId, MockFolderId, "Documents",
            request.Name ?? "report.pdf", request.Description ?? "Annual report",
            "application/pdf", 204_800);
    }

    [HttpDelete("{fileId}")]
    public async Task<ActionResult> DeleteFile(Guid fileId)
    {
        // TODO: implement
        return NoContent();
    }

    [HttpGet("{fileId}/content")]
    public async Task<ActionResult> DownloadFileContent(Guid fileId,
        [FromHeader(Name = "Range")] string? range = null)
    {
        // TODO: implement
        var mockContent = "Mock file content"u8.ToArray();
        return File(mockContent, "application/octet-stream", "report.pdf");
    }

    [HttpPut("{fileId}/content")]
    public async Task<ActionResult<FileDto>> ReplaceFileContent(Guid fileId, IFormFile file)
    {
        // TODO: implement
        return new FileDto(fileId, MockFolderId, "Documents", file.FileName, null, file.ContentType, file.Length);
    }

    [HttpPatch("{fileId}/move")]
    public async Task<ActionResult<FileDto>> MoveFile(Guid fileId, [FromBody] MoveFileRequest request)
    {
        // TODO: implement
        return new FileDto(fileId, request.TargetFolderId, "Target Folder",
            "report.pdf", "Annual report", "application/pdf", 204_800);
    }
}