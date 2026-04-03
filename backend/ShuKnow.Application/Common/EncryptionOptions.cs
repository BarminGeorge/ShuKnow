using System.ComponentModel.DataAnnotations;

namespace ShuKnow.Application.Common;

public class EncryptionOptions
{
    public const string SectionName = "Encryption";
    
    [Required(AllowEmptyStrings = false)]
    public string Key { get; set; } = "";
}
