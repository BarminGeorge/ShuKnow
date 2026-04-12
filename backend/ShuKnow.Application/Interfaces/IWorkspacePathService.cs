using Ardalis.Result;
using ShuKnow.Application.Models;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Application.Interfaces;

public interface IWorkspacePathService
{
    Task<Result<Folder>> ResolveFolderAsync(string folderPath, CancellationToken ct = default);

    Task<Result<ResolvedFolderCreationPath>> ResolveFolderCreationPathAsync(
        string folderPath,
        CancellationToken ct = default);

    Task<Result<ResolvedFilePath>> ResolveFilePathAsync(string filePath, CancellationToken ct = default);
}
