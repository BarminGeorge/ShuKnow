using Ardalis.Result;
using ShuKnow.Domain.Common;

namespace ShuKnow.Domain.ValueObjects;

public class Attachment
{
    public Guid Id { get; private set; }
    public string FileName { get; private set; } = string.Empty;
    public string MimeType { get; private set; } = string.Empty;
    public long SizeBytes { get; private set; }
    public string? StorageKey { get; private set; }

    private Attachment()
    {
    }

    private Attachment(Guid id, string fileName, string mimeType, long sizeBytes, string? storageKey)
    {
        Id = id;
        FileName = fileName;
        MimeType = mimeType;
        SizeBytes = sizeBytes;
        StorageKey = storageKey;
    }

    public static Result<Attachment> Create(
        Guid id,
        string fileName,
        string mimeType,
        long sizeBytes,
        string? storageKey = null)
    {
        if (id == Guid.Empty)
            return DomainResult.Invalid<Attachment>(nameof(id), "Attachment id cannot be empty.");

        if (string.IsNullOrWhiteSpace(fileName))
            return DomainResult.Invalid<Attachment>(nameof(fileName), "Attachment file name is required.");

        var normalizedFileName = fileName.Trim();
        if (normalizedFileName.Length > DomainConstraints.FileNameMaxLength)
            return DomainResult.Invalid<Attachment>(
                nameof(fileName),
                $"Attachment file name cannot exceed {DomainConstraints.FileNameMaxLength} characters.");

        if (string.IsNullOrWhiteSpace(mimeType))
            return DomainResult.Invalid<Attachment>(nameof(mimeType), "Attachment mime type is required.");

        var normalizedMimeType = mimeType.Trim();
        if (normalizedMimeType.Length > DomainConstraints.MimeTypeMaxLength)
            return DomainResult.Invalid<Attachment>(
                nameof(mimeType),
                $"Attachment mime type cannot exceed {DomainConstraints.MimeTypeMaxLength} characters.");

        if (sizeBytes <= 0)
            return DomainResult.Invalid<Attachment>(nameof(sizeBytes), "Attachment size must be greater than zero.");

        var normalizedStorageKey = string.IsNullOrWhiteSpace(storageKey) ? null : storageKey.Trim();
        if (normalizedStorageKey is not null && normalizedStorageKey.Length > DomainConstraints.StorageKeyMaxLength)
            return DomainResult.Invalid<Attachment>(
                nameof(storageKey),
                $"Attachment storage key cannot exceed {DomainConstraints.StorageKeyMaxLength} characters.");

        return Result.Success(
            new Attachment(id, normalizedFileName, normalizedMimeType, sizeBytes, normalizedStorageKey));
    }
}
