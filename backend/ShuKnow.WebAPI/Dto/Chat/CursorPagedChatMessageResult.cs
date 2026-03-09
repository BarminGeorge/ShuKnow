namespace ShuKnow.WebAPI.Dto.Chat;

public record CursorPagedChatMessageResult(
    IReadOnlyList<ChatMessageDto> Items,
    string? NextCursor,
    bool HasMore);
