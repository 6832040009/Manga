using System.Text.Json;
using MangaReaderApp.Models;

namespace MangaReaderApp.Services;

public class MangaRepository
{
    private readonly string _dataFilePath;
    private readonly object _lock = new();
    private List<Manga> _mangas = new();

    public MangaRepository(IWebHostEnvironment env)
    {
        var dataDir = Path.Combine(env.ContentRootPath, "data");
        if (!Directory.Exists(dataDir))
        {
            Directory.CreateDirectory(dataDir);
        }

        _dataFilePath = Path.Combine(dataDir, "manga_data.json");
        LoadOrSeedData();
    }

    private void LoadOrSeedData()
    {
        lock (_lock)
        {
            if (File.Exists(_dataFilePath))
            {
                try
                {
                    var json = File.ReadAllText(_dataFilePath);
                    var list = JsonSerializer.Deserialize<List<Manga>>(json, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });
                    if (list != null && list.Count > 0)
                    {
                        _mangas = list;
                        return;
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error reading data file: {ex.Message}. Re-seeding...");
                }
            }

            // Seed default manga and manhwa
            _mangas = GenerateInitialSeedData();
            SaveDataInternal();
        }
    }

    private void SaveDataInternal()
    {
        var options = new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
        var json = JsonSerializer.Serialize(_mangas, options);
        File.WriteAllText(_dataFilePath, json);
    }

    public void SaveChanges()
    {
        lock (_lock)
        {
            SaveDataInternal();
        }
    }

    public List<MangaSummaryDto> GetAllSummaries(string? query, string? type, string? category, string? status, string? sort)
    {
        lock (_lock)
        {
            var result = _mangas.AsEnumerable();

            if (!string.IsNullOrWhiteSpace(query))
            {
                var q = query.Trim().ToLowerInvariant();
                result = result.Where(m =>
                    m.Title.ToLowerInvariant().Contains(q) ||
                    m.OriginalTitle.ToLowerInvariant().Contains(q) ||
                    m.Author.ToLowerInvariant().Contains(q) ||
                    m.Categories.Any(c => c.ToLowerInvariant().Contains(q)));
            }

            if (!string.IsNullOrWhiteSpace(type) && !type.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                result = result.Where(m => m.Type.Equals(type, StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrWhiteSpace(category) && !category.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                result = result.Where(m => m.Categories.Any(c => c.Equals(category, StringComparison.OrdinalIgnoreCase)));
            }

            if (!string.IsNullOrWhiteSpace(status) && !status.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                result = result.Where(m => m.Status.Equals(status, StringComparison.OrdinalIgnoreCase));
            }

            result = sort?.ToLowerInvariant() switch
            {
                "rating" => result.OrderByDescending(m => m.Rating),
                "views" => result.OrderByDescending(m => m.Views),
                "name" => result.OrderBy(m => m.Title),
                "oldest" => result.OrderBy(m => m.CreatedAt),
                _ => result.OrderByDescending(m => m.UpdatedAt) // default: latest updated
            };

            return result.Select(m =>
            {
                var latestChapter = m.Chapters.OrderByDescending(c => ParseChapterNumber(c.ChapterNumber)).FirstOrDefault();
                return new MangaSummaryDto
                {
                    Id = m.Id,
                    Title = m.Title,
                    OriginalTitle = m.OriginalTitle,
                    Type = m.Type,
                    CoverUrl = m.CoverUrl,
                    Description = m.Description,
                    Status = m.Status,
                    Categories = m.Categories,
                    Rating = m.Rating,
                    Views = m.Views,
                    ChapterCount = m.Chapters.Count,
                    LatestChapterNumber = latestChapter?.ChapterNumber,
                    LatestChapterDate = latestChapter?.CreatedAt,
                    UpdatedAt = m.UpdatedAt
                };
            }).ToList();
        }
    }

    public Manga? GetById(string id, bool incrementViews = false)
    {
        lock (_lock)
        {
            var manga = _mangas.FirstOrDefault(m => m.Id == id);
            if (manga != null && incrementViews)
            {
                manga.Views++;
                SaveDataInternal();
            }
            return manga;
        }
    }

    public Manga CreateManga(MangaCreateUpdateDto dto)
    {
        lock (_lock)
        {
            var manga = new Manga
            {
                Id = Guid.NewGuid().ToString("N"),
                Title = dto.Title.Trim(),
                OriginalTitle = dto.OriginalTitle.Trim(),
                Type = string.IsNullOrWhiteSpace(dto.Type) ? "Manhwa" : dto.Type.Trim(),
                CoverUrl = dto.CoverUrl.Trim(),
                BannerUrl = dto.BannerUrl.Trim(),
                Description = dto.Description.Trim(),
                Author = dto.Author.Trim(),
                Artist = dto.Artist.Trim(),
                Status = string.IsNullOrWhiteSpace(dto.Status) ? "Ongoing" : dto.Status.Trim(),
                Categories = dto.Categories ?? new List<string>(),
                Rating = 5.0,
                Views = 1,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Chapters = new List<Chapter>()
            };

            _mangas.Insert(0, manga);
            SaveDataInternal();
            return manga;
        }
    }

    public Manga? UpdateManga(string id, MangaCreateUpdateDto dto)
    {
        lock (_lock)
        {
            var manga = _mangas.FirstOrDefault(m => m.Id == id);
            if (manga == null) return null;

            manga.Title = dto.Title.Trim();
            manga.OriginalTitle = dto.OriginalTitle.Trim();
            manga.Type = dto.Type.Trim();
            manga.CoverUrl = dto.CoverUrl.Trim();
            manga.BannerUrl = dto.BannerUrl.Trim();
            manga.Description = dto.Description.Trim();
            manga.Author = dto.Author.Trim();
            manga.Artist = dto.Artist.Trim();
            manga.Status = dto.Status.Trim();
            manga.Categories = dto.Categories ?? new List<string>();
            manga.UpdatedAt = DateTime.UtcNow;

            SaveDataInternal();
            return manga;
        }
    }

    public bool DeleteManga(string id)
    {
        lock (_lock)
        {
            var removed = _mangas.RemoveAll(m => m.Id == id);
            if (removed > 0)
            {
                SaveDataInternal();
                return true;
            }
            return false;
        }
    }

    public Chapter? AddChapter(string mangaId, ChapterCreateUpdateDto dto)
    {
        lock (_lock)
        {
            var manga = _mangas.FirstOrDefault(m => m.Id == mangaId);
            if (manga == null) return null;

            var chapter = new Chapter
            {
                Id = Guid.NewGuid().ToString("N"),
                MangaId = mangaId,
                ChapterNumber = dto.ChapterNumber.Trim(),
                Title = dto.Title.Trim(),
                Pages = dto.Pages ?? new List<string>(),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            manga.Chapters.Add(chapter);
            manga.UpdatedAt = DateTime.UtcNow;

            SaveDataInternal();
            return chapter;
        }
    }

    public Chapter? UpdateChapter(string mangaId, string chapterId, ChapterCreateUpdateDto dto)
    {
        lock (_lock)
        {
            var manga = _mangas.FirstOrDefault(m => m.Id == mangaId);
            if (manga == null) return null;

            var chapter = manga.Chapters.FirstOrDefault(c => c.Id == chapterId);
            if (chapter == null) return null;

            chapter.ChapterNumber = dto.ChapterNumber.Trim();
            chapter.Title = dto.Title.Trim();
            chapter.Pages = dto.Pages ?? new List<string>();
            chapter.UpdatedAt = DateTime.UtcNow;
            manga.UpdatedAt = DateTime.UtcNow;

            SaveDataInternal();
            return chapter;
        }
    }

    public bool DeleteChapter(string mangaId, string chapterId)
    {
        lock (_lock)
        {
            var manga = _mangas.FirstOrDefault(m => m.Id == mangaId);
            if (manga == null) return null == null && false;

            var removed = manga.Chapters.RemoveAll(c => c.Id == chapterId);
            if (removed > 0)
            {
                manga.UpdatedAt = DateTime.UtcNow;
                SaveDataInternal();
                return true;
            }
            return false;
        }
    }

    public (Chapter? Chapter, Chapter? PrevChapter, Chapter? NextChapter) GetChapterWithNavigation(string mangaId, string chapterId)
    {
        lock (_lock)
        {
            var manga = _mangas.FirstOrDefault(m => m.Id == mangaId);
            if (manga == null) return (null, null, null);

            var sortedChapters = manga.Chapters
                .OrderBy(c => ParseChapterNumber(c.ChapterNumber))
                .ToList();

            var index = sortedChapters.FindIndex(c => c.Id == chapterId);
            if (index == -1) return (null, null, null);

            var current = sortedChapters[index];
            Chapter? prev = index > 0 ? sortedChapters[index - 1] : null;
            Chapter? next = index < sortedChapters.Count - 1 ? sortedChapters[index + 1] : null;

            return (current, prev, next);
        }
    }

    public List<string> GetAllCategories()
    {
        lock (_lock)
        {
            return _mangas
                .SelectMany(m => m.Categories)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(c => c)
                .ToList();
        }
    }

    private static double ParseChapterNumber(string numStr)
    {
        var cleaned = new string(numStr.Where(c => char.IsDigit(c) || c == '.').ToArray());
        return double.TryParse(cleaned, out var num) ? num : 0;
    }

    private static List<Manga> GenerateInitialSeedData()
    {
        return new List<Manga>
        {
            new Manga
            {
                Id = "solo-leveling",
                Title = "Solo Leveling",
                OriginalTitle = "나 혼ซา만 레벨업",
                Type = "Manhwa",
                CoverUrl = "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80",
                BannerUrl = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1400&auto=format&fit=crop&q=80",
                Description = "ในโลกที่เกต (Gate) เชื่อมต่อมิติต่างๆ เปิดออก สัตว์ประหลาดเริ่มบุกโจมตี และมนุษย์กลุ่มหนึ่งได้รับพลังพิเศษที่เรียกว่า 'ฮันเตอร์' ซองจินอู ฮันเตอร์ระดับ E ที่อ่อนแอที่สุด ได้พบกับดันเจี้ยนซ้อนดันเจี้ยนสุดอันตราย และได้รับระบบภารกิจปริศนาที่ทำให้เขาสามารถ 'เลเวลอัป' ได้เพียงคนเดียว!",
                Author = "Chugong",
                Artist = "DUBU (REDICE STUDIO)",
                Status = "Completed",
                Categories = new List<string> { "แอ็กชัน", "แฟนตาซี", "พลังพิเศษ", "เอาชีวิตรอด", "ดันเจี้ยน" },
                Rating = 4.9,
                Views = 45280,
                CreatedAt = DateTime.UtcNow.AddMonths(-3),
                UpdatedAt = DateTime.UtcNow.AddHours(-2),
                Chapters = new List<Chapter>
                {
                    new Chapter
                    {
                        Id = "sl-ch-01",
                        MangaId = "solo-leveling",
                        ChapterNumber = "1",
                        Title = "ฮันเตอร์ที่อ่อนแอที่สุดในโลก",
                        Pages = new List<string>
                        {
                            "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80",
                            "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
                            "https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80",
                            "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80",
                            "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80"
                        },
                        CreatedAt = DateTime.UtcNow.AddMonths(-3),
                        UpdatedAt = DateTime.UtcNow.AddMonths(-3)
                    },
                    new Chapter
                    {
                        Id = "sl-ch-02",
                        MangaId = "solo-leveling",
                        ChapterNumber = "2",
                        Title = "วิหารลับสองชั้น",
                        Pages = new List<string>
                        {
                            "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80",
                            "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&auto=format&fit=crop&q=80",
                            "https://images.unsplash.com/photo-1514539079130-25950c84af65?w=800&auto=format&fit=crop&q=80",
                            "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80"
                        },
                        CreatedAt = DateTime.UtcNow.AddMonths(-2),
                        UpdatedAt = DateTime.UtcNow.AddMonths(-2)
                    },
                    new Chapter
                    {
                        Id = "sl-ch-03",
                        MangaId = "solo-leveling",
                        ChapterNumber = "3",
                        Title = "บัญญัติสามประการ",
                        Pages = new List<string>
                        {
                            "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80",
                            "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80",
                            "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80"
                        },
                        CreatedAt = DateTime.UtcNow.AddDays(-5),
                        UpdatedAt = DateTime.UtcNow.AddDays(-5)
                    }
                }
            },
            new Manga
            {
                Id = "omniscient-reader",
                Title = "Omniscient Reader's Viewpoint",
                OriginalTitle = "전지적 독자 시점",
                Type = "Manhwa",
                CoverUrl = "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
                BannerUrl = "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1400&auto=format&fit=crop&q=80",
                Description = "'คิมดกจา' พนักงานบริษัทธรรมดา ผู้เป็นนักอ่านคนเดียวที่อ่านนิยายเว็บความยาวกว่า 3,149 ตอนจนจบ ทันทีที่อ่านตอนอวสาน โลกความเป็นจริงก็พังทลายลงและกลายเป็นโลกแห่งหายนะตามในนิยายทุกประการ โดยมีเพียงเขาคนเดียวเท่านั้นที่รู้จุดจบของโลกใบนี้!",
                Author = "sing N song",
                Artist = "Sleepy-C (REDICE STUDIO)",
                Status = "Ongoing",
                Categories = new List<string> { "แฟนตาซี", "เอาชีวิตรอด", "ดราม่า", "ไซไฟ", "จิตวิทยา" },
                Rating = 4.95,
                Views = 38900,
                CreatedAt = DateTime.UtcNow.AddMonths(-2),
                UpdatedAt = DateTime.UtcNow.AddHours(-5),
                Chapters = new List<Chapter>
                {
                    new Chapter
                    {
                        Id = "orv-ch-01",
                        MangaId = "omniscient-reader",
                        ChapterNumber = "1",
                        Title = "จุดเริ่มต้นของบทนำ",
                        Pages = new List<string>
                        {
                            "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80",
                            "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80",
                            "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&auto=format&fit=crop&q=80"
                        },
                        CreatedAt = DateTime.UtcNow.AddMonths(-2),
                        UpdatedAt = DateTime.UtcNow.AddMonths(-2)
                    },
                    new Chapter
                    {
                        Id = "orv-ch-02",
                        MangaId = "omniscient-reader",
                        ChapterNumber = "2",
                        Title = "สถานการณ์หลักเริ่มต้น",
                        Pages = new List<string>
                        {
                            "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80",
                            "https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80"
                        },
                        CreatedAt = DateTime.UtcNow.AddDays(-2),
                        UpdatedAt = DateTime.UtcNow.AddDays(-2)
                    }
                }
            },
            new Manga
            {
                Id = "one-piece",
                Title = "One Piece",
                OriginalTitle = "ワンピース",
                Type = "Manga",
                CoverUrl = "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
                BannerUrl = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1400&auto=format&fit=crop&q=80",
                Description = "ยุคสมัยแห่งโจรสลัดได้เริ่มต้นขึ้นเมื่อราชาโจรสลัด โกล ดี. โรเจอร์ ได้ทิ้งสมบัติลับ 'วันพีซ' ไว้ ณ จุดสิ้นสุดของแกรนด์ไลน์ มังกี้ ดี. ลูฟี่ เด็กหนุ่มผู้มีร่างกายเป็นยาง ออกเดินทางสู่ท้องทะเลกว้างเพื่อรวบรวมพรรคพวกและมุ่งสู่การเป็นราชาโจรสลัดคนต่อไป!",
                Author = "Eiichiro Oda",
                Artist = "Eiichiro Oda",
                Status = "Ongoing",
                Categories = new List<string> { "แอ็กชัน", "ผจญภัย", "มิตรภาพ", "คอมเมดี้" },
                Rating = 4.98,
                Views = 98120,
                CreatedAt = DateTime.UtcNow.AddYears(-1),
                UpdatedAt = DateTime.UtcNow.AddDays(-1),
                Chapters = new List<Chapter>
                {
                    new Chapter
                    {
                        Id = "op-ch-01",
                        MangaId = "one-piece",
                        ChapterNumber = "1",
                        Title = "รุ่งอรุณแห่งการผจญภัย",
                        Pages = new List<string>
                        {
                            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80",
                            "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80",
                            "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80"
                        },
                        CreatedAt = DateTime.UtcNow.AddYears(-1),
                        UpdatedAt = DateTime.UtcNow.AddYears(-1)
                    }
                }
            },
            new Manga
            {
                Id = "tower-of-god",
                Title = "Tower of God",
                OriginalTitle = "신의 탑",
                Type = "Manhwa",
                CoverUrl = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
                BannerUrl = "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1400&auto=format&fit=crop&q=80",
                Description = "คุณปรารถนาสิ่งใด? เงินทอง เกียรติยศ อำนาจ หรือการล้างแค้น? สิ่งใดก็ตามที่คุณปรารถนา ทั้งหมดนั้นอยู่ที่ยอดหอคอยแห่งนี้ เรื่องราวของ 'พัมที่ยี่สิบห้า' เด็กหนุ่มผู้ก้าวเข้าสู่หอคอยอันลึกลับเพื่อตามหาเด็กสาวเพียงคนเดียวที่เป็นโลกทั้งใบของเขา",
                Author = "SIU",
                Artist = "SIU",
                Status = "Ongoing",
                Categories = new List<string> { "แฟนตาซี", "ผจญภัย", "ลึกลับ", "ดราม่า", "มิตรภาพ" },
                Rating = 4.85,
                Views = 31200,
                CreatedAt = DateTime.UtcNow.AddMonths(-4),
                UpdatedAt = DateTime.UtcNow.AddDays(-3),
                Chapters = new List<Chapter>
                {
                    new Chapter
                    {
                        Id = "tog-ch-01",
                        MangaId = "tower-of-god",
                        ChapterNumber = "1",
                        Title = "ชั้นที่ 1: หัวแถวของหอคอย",
                        Pages = new List<string>
                        {
                            "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80",
                            "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&auto=format&fit=crop&q=80"
                        },
                        CreatedAt = DateTime.UtcNow.AddMonths(-4),
                        UpdatedAt = DateTime.UtcNow.AddMonths(-4)
                    }
                }
            },
            new Manga
            {
                Id = "jujutsu-kaisen",
                Title = "Jujutsu Kaisen",
                OriginalTitle = "呪術廻戦",
                Type = "Manga",
                CoverUrl = "https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80",
                BannerUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1400&auto=format&fit=crop&q=80",
                Description = "อิตาโดริ ยูจิ เด็กหนุ่มมัธยมปลายธรรมดาที่มีสมรรถภาพทางกายเหนือมนุษย์ ได้กลืนนิ้วต้องสาปของ 'เรียวเมน สุคุนะ' ราชาแห่งคำสาป เพื่อช่วยเหลือเพื่อนจากวิญญาณคำสาป ทำให้เขาต้องเข้าสู่วงการไสยเวทเพื่อกำจัดคำสาปและเผชิญหน้ากับชะตากรรมที่หลีกเลี่ยงไม่ได้",
                Author = "Gege Akutami",
                Artist = "Gege Akutami",
                Status = "Completed",
                Categories = new List<string> { "แอ็กชัน", "เหนือธรรมชาติ", "ดาร์กแฟนตาซี", "โรงเรียน" },
                Rating = 4.88,
                Views = 51200,
                CreatedAt = DateTime.UtcNow.AddMonths(-5),
                UpdatedAt = DateTime.UtcNow.AddDays(-10),
                Chapters = new List<Chapter>
                {
                    new Chapter
                    {
                        Id = "jjk-ch-01",
                        MangaId = "jujutsu-kaisen",
                        ChapterNumber = "1",
                        Title = "เรียวเมน สุคุนะ",
                        Pages = new List<string>
                        {
                            "https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80",
                            "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80"
                        },
                        CreatedAt = DateTime.UtcNow.AddMonths(-5),
                        UpdatedAt = DateTime.UtcNow.AddMonths(-5)
                    }
                }
            },
            new Manga
            {
                Id = "the-beginning-after-the-end",
                Title = "The Beginning After The End",
                OriginalTitle = "끝이 아닌 시작",
                Type = "Manhwa",
                CoverUrl = "https://images.unsplash.com/photo-1514539079130-25950c84af65?w=600&auto=format&fit=crop&q=80",
                BannerUrl = "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1400&auto=format&fit=crop&q=80",
                Description = "กษัตริย์เกรย์ผู้มีอำนาจและความมั่งคั่งอันไร้คู่แข่งในโลกที่ขับเคลื่อนด้วยความสามารถในการต่อสู้ ทว่าเบื้องหลังกลับโดดเดี่ยวและไร้จุดหมาย หลังจากเสียชีวิต เขาได้เกิดใหม่เป็น 'อาร์เธอร์ เลย์วิน' ในโลกแฟนตาซีใบใหม่ที่เต็มไปด้วยเวทมนตร์และสัตว์ประหลาด",
                Author = "TurtleMe",
                Artist = "Fuyuki23",
                Status = "Ongoing",
                Categories = new List<string> { "แฟนตาซี", "เกิดใหม่", "เวทมนตร์", "แอ็กชัน", "ผจญภัย" },
                Rating = 4.92,
                Views = 41230,
                CreatedAt = DateTime.UtcNow.AddMonths(-2),
                UpdatedAt = DateTime.UtcNow.AddDays(-2),
                Chapters = new List<Chapter>
                {
                    new Chapter
                    {
                        Id = "tbate-ch-01",
                        MangaId = "the-beginning-after-the-end",
                        ChapterNumber = "1",
                        Title = "ชีวิตใหม่ในโลกเวทมนตร์",
                        Pages = new List<string>
                        {
                            "https://images.unsplash.com/photo-1514539079130-25950c84af65?w=800&auto=format&fit=crop&q=80",
                            "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80"
                        },
                        CreatedAt = DateTime.UtcNow.AddMonths(-2),
                        UpdatedAt = DateTime.UtcNow.AddMonths(-2)
                    }
                }
            }
        };
    }
}
