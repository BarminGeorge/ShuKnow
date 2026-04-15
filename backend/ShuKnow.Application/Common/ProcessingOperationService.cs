using System.Collections.Concurrent;
using ShuKnow.Application.Interfaces;
using ShuKnow.Application.Models;

namespace ShuKnow.Application.Common;

public class ProcessingOperationService : IProcessingOperationService
{
    private readonly ConcurrentDictionary<string, ProcessingOperation> ActiveOperations = new();

    public ProcessingOperation BeginOperation(string connectionId)
    {
        throw new NotImplementedException();
    }

    public void CancelOperation(string connectionId)
    {
        if (!ActiveOperations.TryRemove(connectionId, out var operation))
            return;
        
        operation.CancellationTokenSource.Cancel();
        operation.CancellationTokenSource.Dispose();
    }

    public void CompleteOperation(string connectionId)
    {
        ActiveOperations.TryRemove(connectionId, out _);
    }
}