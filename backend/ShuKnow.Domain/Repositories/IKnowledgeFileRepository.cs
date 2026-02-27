using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Domain.Repositories;

public interface IKnowledgeFileRepository
{
    Task<Result<KnowledgeFile>> GetByIdAsync(Guid id);
    Task<Result<IReadOnlyList<KnowledgeFile>>> GetByFolderIdAsync(Guid folderId);
    void Add(KnowledgeFile file);
    void Remove(KnowledgeFile file);
}
