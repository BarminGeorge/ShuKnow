namespace ShuKnow.WebAPI.Dto.Settings;

public record AiConnectionTestDto(
    bool Success,
    int? LatencyMs,
    string? ErrorMessage);
