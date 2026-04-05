using Ardalis.Result;

namespace ShuKnow.Application.Interfaces;

public interface IAiToolsService
{
    Task<Result<string>> CreateFolderAsync(
        string folderPath,
        string description,
        string emoji, 
        CancellationToken ct = default);

    Task<Result<string>> CreateTextFileAsync(
        string filePath, 
        string content, 
        CancellationToken ct = default);

    Task<Result<string>> SaveAttachment(
        string fileName,
        string filePath,
        CancellationToken ct = default);

    Task<Result<string>> AppendTextAsync(
        string filePath, 
        string text, 
        CancellationToken ct = default);

    Task<Result<string>> PrependTextAsync(
        string filePath, 
        string text, 
        CancellationToken ct = default);

    Task<Result<string>> MoveFileAsync(
        string sourcePath,
        string destinationPath,
        CancellationToken ct = default);
}