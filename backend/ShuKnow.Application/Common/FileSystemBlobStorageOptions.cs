using System.ComponentModel.DataAnnotations;

namespace ShuKnow.Application.Common;

public class FileSystemBlobStorageOptions
{
    public const string SectionName = "BlobStorage:FileSystem";

    [Required(AllowEmptyStrings = false)]
    public string BasePath { get; set; } = "";
}
