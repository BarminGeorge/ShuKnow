using Ardalis.Result;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Application.Services;

internal class ClassificationParser : IClassificationParser
{
    public Result<IReadOnlyList<ActionItem>> Parse(string llmResponseText)
    {
        throw new NotImplementedException();
    }
}