using System.Text.Json;
using System.Text.Json.Serialization;

namespace ShuKnow.WebAPI.Utility;

public class CaseInsensitiveJsonStringEnumConverter<TEnum> : JsonConverter<TEnum>
    where TEnum : struct, Enum
{
    public override TEnum Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType != JsonTokenType.String)
            return default;

        var value = reader.GetString();
        if (value is not null && Enum.TryParse<TEnum>(value, ignoreCase: true, out var result))
            return result;

        return default;
    }

    public override void Write(Utf8JsonWriter writer, TEnum value, JsonSerializerOptions options)
    {
        writer.WriteStringValue(value.ToString().ToLowerInvariant());
    }
}