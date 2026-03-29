namespace ShuKnow.Domain.Interfaces;

public interface IOrderedItem
{
    int SortOrder { get; set; }
}