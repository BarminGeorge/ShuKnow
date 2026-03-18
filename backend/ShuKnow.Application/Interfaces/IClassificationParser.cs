using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Application.Interfaces;

public interface IClassificationParser
{
    Result<IReadOnlyList<ActionItem>> Parse(string llmResponseText);
}
