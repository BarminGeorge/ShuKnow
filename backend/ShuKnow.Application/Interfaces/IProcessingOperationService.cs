using ShuKnow.Application.Models;

namespace ShuKnow.Application.Interfaces;

public interface IProcessingOperationService
{
    ProcessingOperation BeginOperation(string connectionId);

    void CancelOperation(string connectionId);

    void CompleteOperation(string connectionId);
}