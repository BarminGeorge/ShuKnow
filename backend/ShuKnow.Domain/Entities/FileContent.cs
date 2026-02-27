namespace ShuKnow.Domain.Entities;

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

        if (data is null && string.IsNullOrWhiteSpace(storageReference))
        {
            throw new ArgumentException("Either file data or storage reference must be provided.");
        }

        if (data is not null && !string.IsNullOrWhiteSpace(storageReference))
        {
            throw new ArgumentException("File content must contain either data or storage reference, not both.");
        }

        ContentType = contentType.Trim();
        _data = data is null ? null : (byte[])data.Clone();
        StorageReference = storageReference?.Trim();
    }

    public static FileContent FromBytes(string contentType, byte[] data)
    {
        ArgumentNullException.ThrowIfNull(data);

        if (data.Length == 0)
        {
            throw new ArgumentException("File data cannot be empty.", nameof(data));
        }

        return new FileContent(contentType, data, null);
    }

    public static FileContent FromStorageReference(string contentType, string storageReference)
    {
        if (string.IsNullOrWhiteSpace(storageReference))
        {
            throw new ArgumentException("Storage reference cannot be empty.", nameof(storageReference));
        }

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

        return _data is not null && other._data is not null && _data.SequenceEqual(other._data);
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
}
