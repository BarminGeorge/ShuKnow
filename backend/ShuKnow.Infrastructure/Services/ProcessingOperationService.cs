using System.Collections.Concurrent;
using ShuKnow.Application.Interfaces;
using ShuKnow.Application.Models;

namespace ShuKnow.Infrastructure.Services;

public class ProcessingOperationService : IProcessingOperationService
{
    private readonly ConcurrentDictionary<string, ProcessingOperation> activeOperations = new();
    private readonly object syncRoot = new();

    public ProcessingOperation BeginOperation(string connectionId)
    {
        lock (syncRoot)
        {
            var operation = new ProcessingOperation(Guid.NewGuid(), new CancellationTokenSource());

            if (activeOperations.TryGetValue(connectionId, out var existingOperation))
            {
                existingOperation.CancellationTokenSource.Cancel();
                existingOperation.CancellationTokenSource.Dispose();
            }

            activeOperations[connectionId] = operation;
            return operation;
        }
    }

    public void CancelOperation(string connectionId)
    {
        lock (syncRoot)
        {
            if (!activeOperations.TryRemove(connectionId, out var operation))
                return;

            operation.CancellationTokenSource.Cancel();
            operation.CancellationTokenSource.Dispose();
        }
    }

    public void CompleteOperation(string connectionId, Guid operationId)
    {
        lock (syncRoot)
        {
            if (!activeOperations.TryGetValue(connectionId, out var operation)
                || operation.OperationId != operationId
                || !activeOperations.TryRemove(connectionId, out _))
            {
                return;
            }

            operation.CancellationTokenSource.Dispose();
        }
    }
}