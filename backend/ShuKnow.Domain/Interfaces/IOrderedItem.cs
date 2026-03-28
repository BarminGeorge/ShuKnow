namespace ShuKnow.Domain.Interfaces;

public interface IOrderedItem
{
    int SortOrder { get; }
    
    void SetSortOrder(int sortOrder);
}