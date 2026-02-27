using ShuKnow.Domain.Enums;

namespace ShuKnow.Domain.ValueObjects;

public class FileContent
{
    public ContentType ContentType { get; private set; }
    public string? TextData { get; private set; }
    public byte[]? BinaryData { get; private set; }
    public string? MimeType { get; private set; }

    protected FileContent()
    {
    }

    private FileContent(ContentType contentType, string? textData, byte[]? binaryData, string? mimeType)
    {
        ContentType = contentType;
        TextData = textData;
        BinaryData = binaryData;
        MimeType = mimeType;
    }

    public static FileContent FromText(string text)
    {
        ArgumentException.ThrowIfNullOrEmpty(text);
        return new FileContent(ContentType.Text, text, null, "text/plain");
    }

    public static FileContent FromBinary(byte[] data, string mimeType)
    {
        ArgumentNullException.ThrowIfNull(data);
        ArgumentException.ThrowIfNullOrEmpty(mimeType);
        return new FileContent(ContentType.Binary, null, data, mimeType);
    }
}
