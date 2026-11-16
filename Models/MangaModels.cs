namespace MangaReaderApp.Models;

public class Manga
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Title { get; set; } = string.Empty;
    public string OriginalTitle { get; set; } = string.Empty;
    public string Type { get; set; } = "Manhwa"; // "Manga" หรือ "Manhwa"
    public string CoverUrl { get; set; } = string.Empty;
    public string BannerUrl { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Author { get; set; } = string.Empty;
    public string Artist { get; set; } = string.Empty;
    public string Status { get; set; } = "Ongoing"; // "Ongoing" หรือ "Completed"
    public List<string> Categories { get; set; } = new();
    public double Rating { get; set; } = 4.8;
    public long Views { get; set; } = 1200;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public List<Chapter> Chapters { get; set; } = new();
}

public class Chapter
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string MangaId { get; set; } = string.Empty;
    public string ChapterNumber { get; set; } = "1";
    public string Title { get; set; } = string.Empty;
    public List<string> Pages { get; set; } = new(); // Image URLs หรือ Uploaded paths
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class MangaSummaryDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string OriginalTitle { get; set; } = string.Empty;
    public string Type { get; set; } = "Manhwa";
    public string CoverUrl { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = "Ongoing";
    public List<string> Categories { get; set; } = new();
    public double Rating { get; set; }
    public long Views { get; set; }
    public int ChapterCount { get; set; }
    public string? LatestChapterNumber { get; set; }
    public DateTime? LatestChapterDate { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class LoginRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class MangaCreateUpdateDto
{
    public string Title { get; set; } = string.Empty;
    public string OriginalTitle { get; set; } = string.Empty;
    public string Type { get; set; } = "Manhwa";
    public string CoverUrl { get; set; } = string.Empty;
    public string BannerUrl { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Author { get; set; } = string.Empty;
    public string Artist { get; set; } = string.Empty;
    public string Status { get; set; } = "Ongoing";
    public List<string> Categories { get; set; } = new();
}

public class ChapterCreateUpdateDto
{
    public string ChapterNumber { get; set; } = "1";
    public string Title { get; set; } = string.Empty;
    public List<string> Pages { get; set; } = new();
}
