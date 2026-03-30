namespace ShuKnow.Application.Common;

public class EncryptionOptions
{
    public const string SectionName = "Encryption";

    public string Key { get; set; } = "";

    public EncryptionOptions Validate()
    {
        if (string.IsNullOrEmpty(Key))
            throw new InvalidOperationException($"{SectionName}:Key is not configured");

        return this;
    }
}
