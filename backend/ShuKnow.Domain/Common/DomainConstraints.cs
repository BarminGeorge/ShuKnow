namespace ShuKnow.Domain.Common;

internal static class DomainConstraints
{
    public const int NameMaxLength = 128;
    public const int DescriptionMaxLength = 4_000;
    public const int IconPathMaxLength = 1_024;
    public const int FileNameMaxLength = 255;
    public const int MimeTypeMaxLength = 255;
    public const int ContentTextMaxLength = 200_000;
    public const int StorageKeyMaxLength = 1_024;
    public const int FingerprintMaxLength = 512;
    public const int SnapshotReferenceMaxLength = 1_024;
}
