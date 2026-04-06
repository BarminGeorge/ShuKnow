using System.Reflection;
using LlmTornado.Common;
using LlmTornado.Infra;

namespace ShuKnow.Infrastructure.Misc;

public static class TornadoAiToolUtil
{
    private static readonly NullabilityInfoContext NullabilityContext = new();

    public static Tool CreateTool(Delegate function, string name, string description)
    {
        return new Tool(CreateParameters(function), name, description);
    }

    private static List<ToolParam> CreateParameters(Delegate function)
    {
        return function.Method
            .GetParameters()
            .Where(parameter => parameter.ParameterType != typeof(CancellationToken))
            .Select(CreateParameter)
            .ToList();
    }

    private static ToolParam CreateParameter(ParameterInfo parameter)
    {
        var parameterName = parameter.Name
            ?? throw new InvalidOperationException($"Delegate parameter name is missing for {parameter.Member.Name}.");
        var parameterType = Nullable.GetUnderlyingType(parameter.ParameterType) ?? parameter.ParameterType;
        var required = IsRequired(parameter);

        if (parameterType.IsEnum)
            return new ToolParam(parameterName, new ToolParamEnum(description: null, [.. Enum.GetNames(parameterType)], required));

        return new ToolParam(parameterName, description: null, MapToolParamType(parameterType), required);
    }

    private static ToolParamAtomicTypes MapToolParamType(Type parameterType)
    {
        if (parameterType == typeof(string))
            return ToolParamAtomicTypes.String;

        if (parameterType == typeof(bool))
            return ToolParamAtomicTypes.Bool;

        if (parameterType == typeof(float) || parameterType == typeof(double) || parameterType == typeof(decimal))
            return ToolParamAtomicTypes.Float;

        if (parameterType == typeof(byte) || parameterType == typeof(sbyte)
            || parameterType == typeof(short) || parameterType == typeof(ushort)
            || parameterType == typeof(int) || parameterType == typeof(uint)
            || parameterType == typeof(long) || parameterType == typeof(ulong))
        {
            return ToolParamAtomicTypes.Int;
        }

        throw new NotSupportedException(
            $"Tool parameter type '{parameterType.FullName}' is not supported for AI tool schema generation.");
    }

    private static bool IsRequired(ParameterInfo parameter)
    {
        if (parameter.HasDefaultValue || Nullable.GetUnderlyingType(parameter.ParameterType) is not null)
            return false;

        if (!parameter.ParameterType.IsValueType)
            return NullabilityContext.Create(parameter).ReadState != NullabilityState.Nullable;

        return true;
    }
}
