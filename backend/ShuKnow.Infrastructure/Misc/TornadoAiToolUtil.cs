using System.Globalization;
using System.Reflection;
using System.Text.Json;
using Ardalis.Result;
using LlmTornado.ChatFunctions;
using LlmTornado.Common;
using LlmTornado.Infra;

namespace ShuKnow.Infrastructure.Misc;

public static class TornadoAiToolUtil
{
    private static readonly NullabilityInfoContext NullabilityContext = new();

    public sealed record ToolRegistration(
        string Name,
        Tool Tool,
        Func<FunctionCall, CancellationToken, Task<Result<string>>> Dispatch);

    public static Tool CreateTool(Delegate function, string name, string description)
    {
        return new Tool(CreateParameters(function), name, description);
    }

    public static ToolRegistration CreateToolRegistration(Delegate function, string name, string description)
    {
        return new ToolRegistration(
            name,
            CreateTool(function, name, description),
            CreateDispatcher(function, name));
    }

    private static List<ToolParam> CreateParameters(Delegate function)
    {
        return function.Method
            .GetParameters()
            .Where(parameter => parameter.ParameterType != typeof(CancellationToken))
            .Select(CreateParameter)
            .ToList();
    }

    private static Func<FunctionCall, CancellationToken, Task<Result<string>>> CreateDispatcher(
        Delegate function,
        string toolName)
    {
        var parameters = function.Method.GetParameters();

        return async (call, ct) =>
        {
            try
            {
                var arguments = BindArguments(call, parameters, toolName, ct);
                var invocationResult = function.DynamicInvoke(arguments);
                return await NormalizeResultAsync(invocationResult, toolName);
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (TargetInvocationException ex) when (ex.InnerException is OperationCanceledException innerCancellation)
            {
                throw innerCancellation;
            }
            catch (ToolDispatchException ex)
            {
                return Result.Error(ex.Message);
            }
            catch (TargetInvocationException ex)
            {
                return Result.Error(ex.InnerException?.Message ?? $"Tool '{toolName}' failed.");
            }
        };
    }

    private static object?[] BindArguments(
        FunctionCall call,
        IReadOnlyList<ParameterInfo> parameters,
        string toolName,
        CancellationToken ct)
    {
        var values = call.GetArguments();
        var arguments = new object?[parameters.Count];

        for (var i = 0; i < parameters.Count; i++)
            arguments[i] = BindArgument(parameters[i], values, toolName, ct);

        return arguments;
    }

    private static object? BindArgument(
        ParameterInfo parameter,
        IReadOnlyDictionary<string, object?> values,
        string toolName,
        CancellationToken ct)
    {
        if (parameter.ParameterType == typeof(CancellationToken))
            return ct;

        var parameterName = parameter.Name
            ?? throw new InvalidOperationException($"Delegate parameter name is missing for {parameter.Member.Name}.");

        if (!values.TryGetValue(parameterName, out var rawValue) || rawValue is null)
            return CreateMissingValue(parameter, toolName, parameterName);

        return ConvertArgument(rawValue, parameter, toolName);
    }

    private static object? CreateMissingValue(ParameterInfo parameter, string toolName, string parameterName)
    {
        if (parameter.HasDefaultValue)
            return parameter.DefaultValue is DBNull ? null : parameter.DefaultValue;

        if (Nullable.GetUnderlyingType(parameter.ParameterType) is not null)
            return null;

        if (!parameter.ParameterType.IsValueType && !IsRequired(parameter))
            return null;

        throw new ToolDispatchException($"Invalid parameters for {toolName}: missing '{parameterName}'.");
    }

    private static object ConvertArgument(object rawValue, ParameterInfo parameter, string toolName)
    {
        var targetType = Nullable.GetUnderlyingType(parameter.ParameterType) ?? parameter.ParameterType;

        try
        {
            if (targetType == typeof(string))
                return ConvertToString(rawValue);

            if (targetType == typeof(bool))
                return ConvertToBool(rawValue);

            if (IsIntegerType(targetType))
                return ConvertToInteger(rawValue, targetType);

            if (IsFloatType(targetType))
                return ConvertToFloat(rawValue, targetType);
        }
        catch (Exception ex) when (ex is not ToolDispatchException)
        {
            throw new ToolDispatchException(
                $"Invalid value for parameter '{parameter.Name}' in {toolName}.",
                ex);
        }

        throw new ToolDispatchException(
            $"Tool parameter type '{targetType.FullName}' is not supported for dispatch.");
    }

    private static string ConvertToString(object rawValue)
    {
        return rawValue switch
        {
            string value => value,
            JsonElement { ValueKind: JsonValueKind.String } json => json.GetString()
                ?? throw new ToolDispatchException("Tool argument cannot be null."),
            _ => throw new ToolDispatchException("Tool argument must be a string.")
        };
    }

    private static bool ConvertToBool(object rawValue)
    {
        return rawValue switch
        {
            bool value => value,
            JsonElement { ValueKind: JsonValueKind.True } => true,
            JsonElement { ValueKind: JsonValueKind.False } => false,
            string value when bool.TryParse(value, out var parsed) => parsed,
            JsonElement { ValueKind: JsonValueKind.String } json
                when bool.TryParse(json.GetString(), out var parsed) => parsed,
            _ => throw new ToolDispatchException("Tool argument must be a bool.")
        };
    }

    private static object ConvertToInteger(object rawValue, Type targetType)
    {
        var integerValue = rawValue switch
        {
            byte value => value,
            sbyte value => value,
            short value => value,
            ushort value => value,
            int value => value,
            uint value => checked((long)value),
            long value => value,
            ulong value => checked((long)value),
            JsonElement { ValueKind: JsonValueKind.Number } json when json.TryGetInt64(out var parsed) => parsed,
            string value when long.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed) => parsed,
            JsonElement { ValueKind: JsonValueKind.String } json
                when long.TryParse(json.GetString(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed) => parsed,
            _ => throw new ToolDispatchException("Tool argument must be an int.")
        };

        return Convert.ChangeType(integerValue, targetType, CultureInfo.InvariantCulture);
    }

    private static object ConvertToFloat(object rawValue, Type targetType)
    {
        var floatValue = rawValue switch
        {
            float value => value,
            double value => value,
            decimal value => (double)value,
            byte value => value,
            sbyte value => value,
            short value => value,
            ushort value => value,
            int value => value,
            uint value => value,
            long value => value,
            ulong value => value,
            JsonElement { ValueKind: JsonValueKind.Number } json => json.GetDouble(),
            string value when double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out var parsed) => parsed,
            JsonElement { ValueKind: JsonValueKind.String } json
                when double.TryParse(json.GetString(), NumberStyles.Float, CultureInfo.InvariantCulture, out var parsed) => parsed,
            _ => throw new ToolDispatchException("Tool argument must be a float.")
        };

        return Convert.ChangeType(floatValue, targetType, CultureInfo.InvariantCulture);
    }

    private static async Task<Result<string>> NormalizeResultAsync(object? invocationResult, string toolName)
    {
        return invocationResult switch
        {
            Task<Result<string>> task => await task,
            ValueTask<Result<string>> task => await task,
            Result<string> result => result,
            Task<string> task => Result.Success(await task),
            ValueTask<string> task => Result.Success(await task),
            string result => Result.Success(result),
            null => Result.Error($"Tool '{toolName}' returned no result."),
            _ => Result.Error(
                $"Tool '{toolName}' returned unsupported result type '{invocationResult.GetType().FullName}'.")
        };
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

    private static bool IsIntegerType(Type type)
    {
        return type == typeof(byte) || type == typeof(sbyte)
            || type == typeof(short) || type == typeof(ushort)
            || type == typeof(int) || type == typeof(uint)
            || type == typeof(long) || type == typeof(ulong);
    }

    private static bool IsFloatType(Type type)
    {
        return type == typeof(float) || type == typeof(double) || type == typeof(decimal);
    }

    private static bool IsRequired(ParameterInfo parameter)
    {
        if (parameter.HasDefaultValue || Nullable.GetUnderlyingType(parameter.ParameterType) is not null)
            return false;

        if (!parameter.ParameterType.IsValueType)
            return NullabilityContext.Create(parameter).ReadState != NullabilityState.Nullable;

        return true;
    }

    private sealed class ToolDispatchException(string message, Exception? innerException = null)
        : Exception(message, innerException);
}
