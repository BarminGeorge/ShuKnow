namespace ShuKnow.Domain.VO;

public sealed class FileContent : IEquatable<FileContent>
{
    private readonly byte[]? _data;

    public string ContentType { get; }
    public byte[]? Data => _data is null ? null : (byte[])_data.Clone();
    public string? StorageReference { get; }

    public bool IsStoredExternally => StorageReference is not null;

    private FileContent(string contentType, byte[]? data, string? storageReference)
    {
        ValidateContentType(contentType);
        var normalizedStorageReference = NormalizeStorageReference(storageReference);
        ValidatePayload(data, normalizedStorageReference);

        ContentType = contentType.Trim();
        _data = data is null ? null : (byte[])data.Clone();
        StorageReference = normalizedStorageReference;
    }

    public static FileContent FromBytes(string contentType, byte[] data)
    {
        ArgumentNullException.ThrowIfNull(data);
        return new FileContent(contentType, data, null);
    }

    public static FileContent FromStorageReference(string contentType, string storageReference)
    {
        ArgumentNullException.ThrowIfNull(storageReference);
        return new FileContent(contentType, null, storageReference);
    }

    public bool Equals(FileContent? other)
    {
        if (ReferenceEquals(this, other))
        {
            return true;
        }

        if (other is null)
        {
            return false;
        }

        if (!string.Equals(ContentType, other.ContentType, StringComparison.Ordinal))
        {
            return false;
        }

        if (!string.Equals(StorageReference, other.StorageReference, StringComparison.Ordinal))
        {
            return false;
        }

        if (_data is null && other._data is null)
        {
            return true;
        }

        if (_data is null || other._data is null)
        {
            return false;
        }

        return _data.AsSpan().SequenceEqual(other._data);
    }

    public override bool Equals(object? obj)
    {
        return Equals(obj as FileContent);
    }

    public override int GetHashCode()
    {
        var hash = new HashCode();
        hash.Add(ContentType, StringComparer.Ordinal);
        hash.Add(StorageReference, StringComparer.Ordinal);

        if (_data is not null)
        {
            foreach (var value in _data)
            {
                hash.Add(value);
            }
        }

        return hash.ToHashCode();
    }

    private static void ValidateContentType(string contentType)
    {
        if (string.IsNullOrWhiteSpace(contentType))
        {
            throw new ArgumentException("Content type cannot be empty.", nameof(contentType));
        }
    }

    private static string? NormalizeStorageReference(string? storageReference)
    {
        if (storageReference is null)
        {
            return null;
        }

        var normalized = storageReference.Trim();
        if (normalized.Length == 0)
        {
            throw new ArgumentException("Storage reference cannot be empty.", nameof(storageReference));
        }

        return normalized;
    }

    private static void ValidatePayload(byte[]? data, string? storageReference)
    {
        if (data is not null && data.Length == 0)
        {
            throw new ArgumentException("Data cannot be empty.", nameof(data));
        }

        var hasData = data is not null;
        var hasStorageReference = storageReference is not null;

        if (hasData == hasStorageReference)
        {
            throw new ArgumentException("File content must contain either data or storage reference.");
        }
    }
}
