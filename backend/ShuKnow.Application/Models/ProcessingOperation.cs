namespace ShuKnow.Application.Models;

public record ProcessingOperation(Guid OperationId, CancellationTokenSource CancellationTokenSource);