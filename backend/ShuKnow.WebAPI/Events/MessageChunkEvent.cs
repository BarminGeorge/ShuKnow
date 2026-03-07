namespace ShuKnow.WebAPI.Events;

/// <summary>
/// Event from server to client for streaming LLM token chunks.
/// </summary>
public record MessageChunkEvent(
    Guid OperationId,
    Guid MessageId,
    string Chunk);
