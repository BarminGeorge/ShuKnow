using System.Security.Cryptography;
using Ardalis.Result;
using ShuKnow.Domain.Enums;

namespace ShuKnow.Domain.VO;

public sealed class FileContent : IEquatable<FileContent>
{
    private readonly byte[]? date;
    private readonly byte[]? dataHash;

    public FileContentType ContentType { get; }
    public byte[]? Data => date is null ? null : (byte[])date.Clone();
    public string? StorageReference { get; }

    public bool IsStoredExternally => StorageReference is not null;

    private FileContent(FileContentType contentType, byte[]? data, string? storageReference)
    {
        ContentType = contentType;
        date = data is null ? null : (byte[])data.Clone();
        dataHash = date is null ? null : SHA256.HashData(date);
        StorageReference = storageReference;
    }

    public static Result<FileContent> FromBytes(FileContentType contentType, byte[] data)
    {
        return Result.Success(new FileContent(contentType, data, null));
    }

    public static Result<FileContent> FromStorageReference(FileContentType contentType, string storageReference)
    {
        return Result.Success(new FileContent(contentType, null, storageReference));
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

        if (ContentType != other.ContentType)
        {
            return false;
        }

        if (!string.Equals(StorageReference, other.StorageReference, StringComparison.Ordinal))
        {
            return false;
        }

        if (dataHash is null && other.dataHash is null)
        {
            return true;
        }

        if (dataHash is null || other.dataHash is null)
        {
            return false;
        }

        return dataHash.AsSpan().SequenceEqual(other.dataHash);
    }

    public override bool Equals(object? obj)
    {
        return Equals(obj as FileContent);
    }

    public override int GetHashCode()
    {
        var hash = new HashCode();
        hash.Add(ContentType);
        hash.Add(StorageReference, StringComparer.Ordinal);

        if (dataHash is not null)
        {
            foreach (var value in dataHash)
            {
                hash.Add(value);
            }
        }

        return hash.ToHashCode();
    }

}
