namespace ShuKnow.Domain.ValueObjects;

public class Attachment
{
    public string FileName { get; private set; }
    public string ContentType { get; private set; }
    public string StoragePath { get; private set; }

    protected Attachment()
    {
        FileName = string.Empty;
        ContentType = string.Empty;
        StoragePath = string.Empty;
    }

    public Attachment(string fileName, string contentType, string storagePath)
    {
        ArgumentException.ThrowIfNullOrEmpty(fileName);
        ArgumentException.ThrowIfNullOrEmpty(contentType);
        ArgumentException.ThrowIfNullOrEmpty(storagePath);

        FileName = fileName;
        ContentType = contentType;
        StoragePath = storagePath;
    }
}
