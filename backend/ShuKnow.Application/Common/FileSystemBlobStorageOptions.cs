namespace ShuKnow.Application.Common;

public class FileSystemBlobStorageOptions
{
    public const string SectionName = "BlobStorage:FileSystem";

    public string BasePath { get; set; } = "";

    public FileSystemBlobStorageOptions Validate()
    {
        BasePath = BasePath.Trim();

        if (string.IsNullOrEmpty(BasePath))
            throw new InvalidOperationException($"{SectionName}:BasePath is not configured");

        return this;
    }
}
