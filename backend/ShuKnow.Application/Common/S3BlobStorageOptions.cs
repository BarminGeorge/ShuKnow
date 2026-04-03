namespace ShuKnow.Application.Common;

public class S3BlobStorageOptions
{
    public const string SectionName = "BlobStorage:S3";
    
    public string ServiceUrl { get; set; } = "";
    public string AccessKey { get; set; } = "";
    public string SecretKey { get; set; } = "";
    public string BucketName { get; set; } = "";
    public string Prefix { get; set; } = "";
    public bool ForcePathStyle { get; set; } = true;

    public S3BlobStorageOptions Validate()
    {
        if (string.IsNullOrEmpty(ServiceUrl))
            throw new InvalidOperationException($"{SectionName}:ServiceUrl is not configured");

        if (string.IsNullOrEmpty(AccessKey))
            throw new InvalidOperationException($"{SectionName}:AccessKey is not configured");

        if (string.IsNullOrEmpty(SecretKey))
            throw new InvalidOperationException($"{SectionName}:SecretKey is not configured");

        if (string.IsNullOrEmpty(BucketName))
            throw new InvalidOperationException($"{SectionName}:BucketName is not configured");

        return this;
    }
}
