namespace ShuKnow.WebAPI.Events;

/// <summary>
/// Represents a single AI classification decision for file placement.
/// </summary>
public record ClassificationDecisionDto(
    string FileName,
    string TargetFolderName,
    Guid? TargetFolderId,
    bool IsNewFolder);
