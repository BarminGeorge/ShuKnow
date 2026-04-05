namespace ShuKnow.Application.Interfaces;

public interface IBlobDeletionQueue
{
    ValueTask EnqueueDeleteAsync(Guid blobId);
}
