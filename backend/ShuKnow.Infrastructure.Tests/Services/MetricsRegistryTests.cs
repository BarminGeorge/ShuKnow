using System.Diagnostics.Metrics;
using AwesomeAssertions;
using ShuKnow.Metrics.Events;
using ShuKnow.Metrics.Services;

namespace ShuKnow.Infrastructure.Tests.Services;

public class MetricsRegistryTests
{
    [Test]
    public void RecordAiItemProcessed_ShouldIncrementAiSavedAndCohortCounters()
    {
        using var collector = new MeasurementCollector();
        var sut = new MetricsRegistry();

        var timestamp = new DateTimeOffset(2026, 4, 1, 12, 0, 0, TimeSpan.Zero);
        sut.RecordAiItemProcessed(Guid.NewGuid(), Guid.NewGuid(), timestamp);

        collector.Sum("shuknow_ai_items_processed_total").Should().Be(1);
        collector.Sum("shuknow_content_items_saved_total").Should().Be(1);
        collector.Sum("shuknow_retention_week1_cohort_users_total").Should().Be(1);
        collector.Sum("shuknow_metric_events_total", "event_type", "ai_item_processed").Should().Be(1);
    }

    [Test]
    public void RecordManualMove_ShouldCountOnlyFirstManualMoveAfterAiProcessing()
    {
        using var collector = new MeasurementCollector();
        var sut = new MetricsRegistry();

        var userId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        var timestamp = new DateTimeOffset(2026, 4, 1, 12, 0, 0, TimeSpan.Zero);

        sut.RecordAiItemProcessed(userId, itemId, timestamp);
        sut.RecordManualMove(itemId, timestamp.AddMinutes(1));
        sut.RecordManualMove(itemId, timestamp.AddMinutes(2));

        collector.Sum("shuknow_ai_items_manually_moved_after_processing_total").Should().Be(1);
        collector.Sum("shuknow_metric_events_total", "event_type", "manual_move").Should().Be(2);
    }

    [Test]
    public void RecordContentAccess_ShouldCountUniqueRetrievalWithinThirtyDays()
    {
        using var collector = new MeasurementCollector();
        var sut = new MetricsRegistry();

        var userId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        var timestamp = new DateTimeOffset(2026, 4, 1, 12, 0, 0, TimeSpan.Zero);

        sut.RecordContentSaved(userId, itemId, timestamp);
        sut.RecordContentOpened(itemId, timestamp.AddDays(1));
        sut.RecordContentCopied(itemId, timestamp.AddDays(2));
        sut.RecordContentOpened(itemId, timestamp.AddDays(35));

        collector.Sum("shuknow_content_items_retrieved_within_30d_total").Should().Be(1);
        collector.Sum("shuknow_content_access_events_total", "access_type", "opened").Should().Be(2);
        collector.Sum("shuknow_content_access_events_total", "access_type", "copied").Should().Be(1);
    }

    [Test]
    public void RecordContentSaved_ShouldCountWeekTwoRetentionOnlyOncePerUser()
    {
        using var collector = new MeasurementCollector();
        var sut = new MetricsRegistry();

        var userId = Guid.NewGuid();
        var day0 = new DateTimeOffset(2026, 4, 1, 0, 0, 0, TimeSpan.Zero);

        sut.RecordContentSaved(userId, Guid.NewGuid(), day0);
        sut.RecordContentSaved(userId, Guid.NewGuid(), day0.AddDays(8));
        sut.RecordContentSaved(userId, Guid.NewGuid(), day0.AddDays(10));
        sut.RecordContentSaved(userId, Guid.NewGuid(), day0.AddDays(16));

        collector.Sum("shuknow_retention_week1_cohort_users_total").Should().Be(1);
        collector.Sum("shuknow_retention_week2_returned_users_total").Should().Be(1);
    }

    [Test]
    public void RecordEvent_ShouldDispatchToConcreteCounters()
    {
        using var collector = new MeasurementCollector();
        var sut = new MetricsRegistry();

        var userId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        var timestamp = new DateTimeOffset(2026, 4, 1, 9, 0, 0, TimeSpan.Zero);

        sut.RecordEvent(new ItemEvent(userId, itemId, EventType.AiItemProcessed, timestamp));
        sut.RecordEvent(new ItemEvent(userId, itemId, EventType.ManualMove, timestamp.AddMinutes(1)));
        sut.RecordEvent(new ItemEvent(userId, itemId, EventType.ContentOpened, timestamp.AddMinutes(2)));

        collector.Sum("shuknow_ai_items_processed_total").Should().Be(1);
        collector.Sum("shuknow_ai_items_manually_moved_after_processing_total").Should().Be(1);
        collector.Sum("shuknow_content_items_retrieved_within_30d_total").Should().Be(1);
    }

    private sealed class MeasurementCollector : IDisposable
    {
        private readonly MeterListener listener;
        private readonly List<Measurement> measurements = [];
        private readonly object sync = new();

        public MeasurementCollector()
        {
            listener = new MeterListener();
            listener.SetMeasurementEventCallback<long>(OnMeasurement);
            listener.InstrumentPublished = (instrument, meterListener) =>
            {
                if (instrument.Meter.Name == "ShuKnow.Metrics")
                    meterListener.EnableMeasurementEvents(instrument);
            };
            listener.Start();
        }

        public void Dispose()
        {
            listener.Dispose();
        }

        public long Sum(string metricName)
        {
            lock (sync)
            {
                return measurements
                    .Where(m => m.MetricName == metricName)
                    .Sum(m => m.Value);
            }
        }

        public long Sum(string metricName, string tagKey, string tagValue)
        {
            lock (sync)
            {
                return measurements
                    .Where(m => m.MetricName == metricName &&
                                m.Tags.Any(tag => tag.Key == tagKey && Equals(tag.Value, tagValue)))
                    .Sum(m => m.Value);
            }
        }

        private void OnMeasurement(
            Instrument instrument,
            long measurement,
            ReadOnlySpan<KeyValuePair<string, object?>> tags,
            object? state)
        {
            var copiedTags = tags.ToArray();

            lock (sync)
            {
                measurements.Add(new Measurement(instrument.Name, measurement, copiedTags));
            }
        }

        private sealed record Measurement(
            string MetricName,
            long Value,
            IReadOnlyList<KeyValuePair<string, object?>> Tags);
    }
}
