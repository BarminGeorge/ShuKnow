using System.ComponentModel.DataAnnotations;

namespace ShuKnow.Application.Common;

public class S3BlobStorageOptions
{
    public const string SectionName = "BlobStorage:S3";
    
    [Required(AllowEmptyStrings = false)]
    public string ServiceUrl { get; set; } = "";
    
    [Required(AllowEmptyStrings = false)]
    public string AccessKey { get; set; } = "";
    
    [Required(AllowEmptyStrings = false)]
    public string SecretKey { get; set; } = "";
    
    [Required(AllowEmptyStrings = false)]
    public string BucketName { get; set; } = "";
    
    public string Prefix { get; set; } = "";
    
    public bool ForcePathStyle { get; set; } = true;
}
