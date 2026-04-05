using System.ComponentModel.DataAnnotations;

namespace ShuKnow.Application.Common;

public class BlobStorageOptions
{
    public const string SectionName = "BlobStorage";
    public const string FileSystemProvider = "FileSystem";
    public const string S3Provider = "S3";

    [Required(AllowEmptyStrings = false)]
    public string Provider { get; set; } = "";

    public bool UsesFileSystem =>
        string.Equals(Provider, FileSystemProvider, StringComparison.OrdinalIgnoreCase);

    public bool UsesS3 =>
        string.Equals(Provider, S3Provider, StringComparison.OrdinalIgnoreCase);
}
