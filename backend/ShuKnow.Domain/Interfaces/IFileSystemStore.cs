using Ardalis.Result;
using ShuKnow.Domain.Entities;
using FileEntity = ShuKnow.Domain.Entities.File;

namespace ShuKnow.Domain.Interfaces;

public interface IFileSystemStore
{
    Task<Result<Folder>> EnsureInboxAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<Result<Folder>> GetFolderByIdAsync(
        Guid folderId,
        CancellationToken cancellationToken = default);

    Task<Result<IReadOnlyCollection<Folder>>> GetFoldersByUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<Result<IReadOnlyCollection<Folder>>> GetChildFoldersAsync(
        Guid userId,
        Guid? parentFolderId,
        CancellationToken cancellationToken = default);

    Task<Result<FileEntity>> GetFileByIdAsync(
        Guid fileId,
        CancellationToken cancellationToken = default);

    Task<Result<IReadOnlyCollection<FileEntity>>> GetFilesByFolderAsync(
        Guid folderId,
        CancellationToken cancellationToken = default);

    Task<Result> SaveFolderAsync(
        Folder folder,
        CancellationToken cancellationToken = default);

    Task<Result> SaveFileAsync(
        FileEntity file,
        CancellationToken cancellationToken = default);

    Task<Result> DeleteFolderAsync(
        Guid folderId,
        CancellationToken cancellationToken = default);

    Task<Result> DeleteFileAsync(
        Guid fileId,
        CancellationToken cancellationToken = default);

    Task<Result> EnsureFolderPlacementValidAsync(
        Guid userId,
        Guid folderId,
        Guid? parentFolderId,
        CancellationToken cancellationToken = default);

    Task<Result> EnsureFolderNameUniqueAsync(
        Guid userId,
        Guid? parentFolderId,
        string folderName,
        Guid? excludingFolderId = null,
        CancellationToken cancellationToken = default);

    Task<Result> EnsureFileNameUniqueAsync(
        Guid folderId,
        string fileName,
        Guid? excludingFileId = null,
        CancellationToken cancellationToken = default);
}
