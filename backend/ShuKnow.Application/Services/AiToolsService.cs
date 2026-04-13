using Ardalis.Result;
using ShuKnow.Application.Interfaces;

namespace ShuKnow.Application.Services;

// TODO: зависимости в конструктор сам добавишь
public class AiToolsService : IAiToolsService
{
    public Task<Result<string>> CreateFolderAsync(string folderPath, string description, string emoji, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<string>> CreateTextFileAsync(string filePath, string content, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<string>> SaveAttachment(string attachmentId, string filePath, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<string>> AppendTextAsync(string filePath, string text, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<string>> PrependTextAsync(string filePath, string text, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<string>> MoveFileAsync(string sourcePath, string destinationPath, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }
}