namespace ShuKnow.Application.Common;

public class BlobStorageOptions
{
    public const string SectionName = "BlobStorage";
    public const string FileSystemProvider = "FileSystem";
    public const string S3Provider = "S3";

    public string Provider { get; set; } = "";

    public bool UsesFileSystem =>
        string.Equals(Provider, FileSystemProvider, StringComparison.OrdinalIgnoreCase);

    public bool UsesS3 =>
        string.Equals(Provider, S3Provider, StringComparison.OrdinalIgnoreCase);

    public BlobStorageOptions Validate()
    {
        if (UsesFileSystem || UsesS3)
            return this;

        throw new InvalidOperationException(
            $"{SectionName}:Provider must be '{FileSystemProvider}' or '{S3Provider}', got '{Provider}'.");
    }
}
