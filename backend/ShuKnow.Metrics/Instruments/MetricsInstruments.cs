using System.Diagnostics.Metrics;

namespace ShuKnow.Metrics.Instruments;

public class MetricsInstruments
{
    public const string MeterName = "ShuKnow.Metrics";

    public Counter<long> EventsRecorded { get; }
    public Counter<long> AiItemsProcessed { get; }
    public Counter<long> AiItemsManuallyMoved { get; }
    public Counter<long> ContentItemsSaved { get; }
    public Counter<long> ContentAccessed { get; }
    public Counter<long> ContentRetrievedWithin30Days { get; }
    public Counter<long> RetentionCohortUsers { get; }
    public Counter<long> RetentionReturnedUsers { get; }

    public MetricsInstruments()
    {
        var meter1 = new Meter(MeterName, "1.0.0");

        EventsRecorded = meter1.CreateCounter<long>(
            "shuknow_events_total",
            "{event}",
            "Общее количество зафиксированных продуктовых событий");

        AiItemsProcessed = meter1.CreateCounter<long>(
            "shuknow_ai_items_processed_total",
            "{item}",
            "Количество элементов, обработанных AI");

        AiItemsManuallyMoved = meter1.CreateCounter<long>(
            "shuknow_ai_items_manually_moved_total",
            "{item}",
            "AI-обработанные элементы, перемещённые вручную");

        ContentItemsSaved = meter1.CreateCounter<long>(
            "shuknow_content_items_saved_total",
            "{item}",
            "Количество сохранённых элементов контента");

        ContentAccessed = meter1.CreateCounter<long>(
            "shuknow_content_access_total",
            "{access}",
            "Количество событий повторного доступа к контенту");

        ContentRetrievedWithin30Days = meter1.CreateCounter<long>(
            "shuknow_content_retrieved_30d_total",
            "{item}",
            "Элементы, к которым вернулись в течение 30 дней");

        RetentionCohortUsers = meter1.CreateCounter<long>(
            "shuknow_retention_cohort_total",
            "{user}",
            "Пользователи, впервые сохранившие контент");

        RetentionReturnedUsers = meter1.CreateCounter<long>(
            "shuknow_retention_returned_total",
            "{user}",
            "Пользователи, вернувшиеся на второй неделе");
    }
}