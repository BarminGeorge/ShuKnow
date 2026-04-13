namespace ShuKnow.WebAPI.Events;

/// <summary>
/// Event from server to client for streaming LLM chunks or a full message payload.
/// </summary>
public record MessageChunkEvent(
    Guid OperationId,
    Guid MessageId,
    string Chunk);
