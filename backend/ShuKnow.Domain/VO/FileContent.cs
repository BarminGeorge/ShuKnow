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
        ContentType = contentType.Trim();
        _data = data is null ? null : (byte[])data.Clone();
        StorageReference = storageReference?.Trim();
    }

    public static FileContent FromBytes(string contentType, byte[] data)
    {
        ArgumentNullException.ThrowIfNull(data);
        return new FileContent(contentType, data, null);
    }

    public static FileContent FromStorageReference(string contentType, string storageReference)
    {
        return new FileContent(contentType, null, storageReference);
    }

    public bool Equals(FileContent? other)
    {
        throw new NotImplementedException();
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
