using Ardalis.Result;
using ShuKnow.Domain.Common;

namespace ShuKnow.Domain.ValueObjects;

public class FileContent
{
    public byte[]? Binary { get; private set; }
    public string? Text { get; private set; }
    public string MimeType { get; private set; } = string.Empty;
    public long SizeBytes { get; private set; }
    public string? Encoding { get; private set; }

    private FileContent()
    {
    }

    private FileContent(byte[]? binary, string? text, string mimeType, long sizeBytes, string? encoding)
    {
        Binary = binary is null ? null : binary.ToArray();
        Text = text;
        MimeType = mimeType;
        SizeBytes = sizeBytes;
        Encoding = encoding;
    }

    public static Result<FileContent> Create(
        string mimeType,
        string? text = null,
        byte[]? binary = null,
        string? encoding = null)
    {
        if (string.IsNullOrWhiteSpace(mimeType))
            return DomainResult.Invalid<FileContent>(nameof(mimeType), "Mime type is required.");

        var normalizedMimeType = mimeType.Trim();
        if (normalizedMimeType.Length > DomainConstraints.MimeTypeMaxLength)
            return DomainResult.Invalid<FileContent>(
                nameof(mimeType),
                $"Mime type cannot exceed {DomainConstraints.MimeTypeMaxLength} characters.");

        var hasText = !string.IsNullOrWhiteSpace(text);
        var hasBinary = binary is not null && binary.Length > 0;

        if (!hasText && !hasBinary)
            return DomainResult.Invalid<FileContent>(
                nameof(text),
                "Either text or binary payload must be provided.");

        if (binary is not null && binary.Length == 0)
            return DomainResult.Invalid<FileContent>(
                nameof(binary),
                "Binary payload cannot be an empty array.");

        var normalizedText = hasText ? text!.Trim() : null;
        if (normalizedText is not null && normalizedText.Length > DomainConstraints.ContentTextMaxLength)
            return DomainResult.Invalid<FileContent>(
                nameof(text),
                $"Text content cannot exceed {DomainConstraints.ContentTextMaxLength} characters.");

        var normalizedEncoding = string.IsNullOrWhiteSpace(encoding) ? null : encoding.Trim();
        var sizeBytes = binary?.LongLength ?? normalizedText?.Length ?? 0;

        return Result.Success(
            new FileContent(binary, normalizedText, normalizedMimeType, sizeBytes, normalizedEncoding));
    }
}
