namespace ShuKnow.Application.Models;

public record PreparedPrompt(
    string PromptText,
    IReadOnlyList<Guid> ConsumedAttachmentIds);