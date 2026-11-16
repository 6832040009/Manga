using MangaReaderApp.Models;
using MangaReaderApp.Services;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls("http://127.0.0.1:5000", "http://localhost:5000");

// Register Services
builder.Services.AddSingleton<AuthService>();
builder.Services.AddSingleton<MangaRepository>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseCors("AllowAll");
app.UseDefaultFiles();
app.UseStaticFiles();

// ตรวจสอบและสร้างโฟลเดอร์สำหรับ upload
var uploadsPath = Path.Combine(app.Environment.WebRootPath ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot"), "uploads");
if (!Directory.Exists(uploadsPath))
{
    Directory.CreateDirectory(uploadsPath);
    Directory.CreateDirectory(Path.Combine(uploadsPath, "covers"));
    Directory.CreateDirectory(Path.Combine(uploadsPath, "chapters"));
}

// -------------------------------------------------------------
// Authentication Endpoints
// -------------------------------------------------------------

app.MapPost("/api/admin/login", (LoginRequest request, AuthService authService, HttpContext context) =>
{
    var (success, token, message) = authService.Login(request.Username, request.Password);
    if (!success || token == null)
    {
        return Results.Json(new { success = false, message }, statusCode: 401);
    }

    // กำหนด Cookie สำหรับ Admin
    context.Response.Cookies.Append("admin_session", token, new CookieOptions
    {
        HttpOnly = true,
        SameSite = SameSiteMode.Lax,
        Expires = DateTimeOffset.UtcNow.AddDays(7),
        Path = "/"
    });

    return Results.Ok(new
    {
        success = true,
        token,
        username = "prct",
        message
    });
});

app.MapPost("/api/admin/logout", (AuthService authService, HttpContext context) =>
{
    var token = context.Request.Cookies["admin_session"];
    if (!string.IsNullOrWhiteSpace(token))
    {
        authService.Logout(token);
    }

    context.Response.Cookies.Delete("admin_session", new CookieOptions { Path = "/" });
    return Results.Ok(new { success = true, message = "ออกจากระบบเรียบร้อยแล้ว" });
});

app.MapGet("/api/admin/check", (AuthService authService, HttpContext context) =>
{
    var isAdmin = authService.IsAdmin(context);
    return Results.Ok(new
    {
        isAdmin,
        username = isAdmin ? "prct" : null
    });
});

// -------------------------------------------------------------
// Public Endpoints (ผู้อ่านทั่วไป - ไม่ต้องล็อกอิน อ่านได้อย่างเดียว)
// -------------------------------------------------------------

app.MapGet("/api/manga", (string? q, string? type, string? category, string? status, string? sort, MangaRepository repo) =>
{
    var list = repo.GetAllSummaries(q, type, category, status, sort);
    return Results.Ok(list);
});

app.MapGet("/api/manga/{id}", (string id, MangaRepository repo) =>
{
    var manga = repo.GetById(id, incrementViews: true);
    if (manga == null) return Results.NotFound(new { message = "ไม่พบมังงะที่ระบุ" });
    return Results.Ok(manga);
});

app.MapGet("/api/manga/{mangaId}/chapters/{chapterId}", (string mangaId, string chapterId, MangaRepository repo) =>
{
    var manga = repo.GetById(mangaId, incrementViews: false);
    if (manga == null) return Results.NotFound(new { message = "ไม่พบเรื่องนี้" });

    var (chapter, prev, next) = repo.GetChapterWithNavigation(mangaId, chapterId);
    if (chapter == null) return Results.NotFound(new { message = "ไม่พบตอนที่ระบุ" });

    return Results.Ok(new
    {
        mangaId = manga.Id,
        mangaTitle = manga.Title,
        mangaType = manga.Type,
        chapter,
        prevChapter = prev == null ? null : new { id = prev.Id, number = prev.ChapterNumber, title = prev.Title },
        nextChapter = next == null ? null : new { id = next.Id, number = next.ChapterNumber, title = next.Title },
        allChapters = manga.Chapters.OrderByDescending(c => ParseChapterNumber(c.ChapterNumber)).Select(c => new
        {
            id = c.Id,
            number = c.ChapterNumber,
            title = c.Title
        }).ToList()
    });
});

app.MapGet("/api/categories", (MangaRepository repo) =>
{
    var categories = repo.GetAllCategories();
    return Results.Ok(categories);
});

app.MapGet("/api/stats", (MangaRepository repo) =>
{
    var all = repo.GetAllSummaries(null, null, null, null, null);
    var manhwaCount = all.Count(m => m.Type.Equals("Manhwa", StringComparison.OrdinalIgnoreCase));
    var mangaCount = all.Count(m => m.Type.Equals("Manga", StringComparison.OrdinalIgnoreCase));
    var totalChapters = all.Sum(m => m.ChapterCount);
    var totalViews = all.Sum(m => m.Views);

    return Results.Ok(new
    {
        totalManga = all.Count,
        manhwaCount,
        mangaCount,
        totalChapters,
        totalViews
    });
});

// -------------------------------------------------------------
// Admin-Only Protected Endpoints (สิทธิ์เฉพาะ admin: prct)
// -------------------------------------------------------------

app.MapPost("/api/manga", (MangaCreateUpdateDto dto, AuthService authService, MangaRepository repo, HttpContext context) =>
{
    if (!authService.IsAdmin(context))
    {
        return Results.Json(new { message = "ไม่มีสิทธิ์เข้าถึง: ต้องเป็น Admin เท่านั้น" }, statusCode: 403);
    }

    if (string.IsNullOrWhiteSpace(dto.Title))
    {
        return Results.BadRequest(new { message = "กรุณากรอกชื่อเรื่อง" });
    }

    var created = repo.CreateManga(dto);
    return Results.Created($"/api/manga/{created.Id}", created);
});

app.MapPut("/api/manga/{id}", (string id, MangaCreateUpdateDto dto, AuthService authService, MangaRepository repo, HttpContext context) =>
{
    if (!authService.IsAdmin(context))
    {
        return Results.Json(new { message = "ไม่มีสิทธิ์เข้าถึง: ต้องเป็น Admin เท่านั้น" }, statusCode: 403);
    }

    var updated = repo.UpdateManga(id, dto);
    if (updated == null) return Results.NotFound(new { message = "ไม่พบเรื่องที่ต้องการแก้ไข" });

    return Results.Ok(updated);
});

app.MapDelete("/api/manga/{id}", (string id, AuthService authService, MangaRepository repo, HttpContext context) =>
{
    if (!authService.IsAdmin(context))
    {
        return Results.Json(new { message = "ไม่มีสิทธิ์เข้าถึง: ต้องเป็น Admin เท่านั้น" }, statusCode: 403);
    }

    var deleted = repo.DeleteManga(id);
    if (!deleted) return Results.NotFound(new { message = "ไม่พบเรื่องที่ต้องการลบ" });

    return Results.Ok(new { success = true, message = "ลบเรื่องเรียบร้อยแล้ว" });
});

app.MapPost("/api/manga/{mangaId}/chapters", (string mangaId, ChapterCreateUpdateDto dto, AuthService authService, MangaRepository repo, HttpContext context) =>
{
    if (!authService.IsAdmin(context))
    {
        return Results.Json(new { message = "ไม่มีสิทธิ์เข้าถึง: ต้องเป็น Admin เท่านั้น" }, statusCode: 403);
    }

    if (string.IsNullOrWhiteSpace(dto.ChapterNumber))
    {
        return Results.BadRequest(new { message = "กรุณากรอกเลขตอน" });
    }

    var chapter = repo.AddChapter(mangaId, dto);
    if (chapter == null) return Results.NotFound(new { message = "ไม่พบเรื่องที่ต้องการเพิ่มตอน" });

    return Results.Created($"/api/manga/{mangaId}/chapters/{chapter.Id}", chapter);
});

app.MapPut("/api/manga/{mangaId}/chapters/{chapterId}", (string mangaId, string chapterId, ChapterCreateUpdateDto dto, AuthService authService, MangaRepository repo, HttpContext context) =>
{
    if (!authService.IsAdmin(context))
    {
        return Results.Json(new { message = "ไม่มีสิทธิ์เข้าถึง: ต้องเป็น Admin เท่านั้น" }, statusCode: 403);
    }

    var chapter = repo.UpdateChapter(mangaId, chapterId, dto);
    if (chapter == null) return Results.NotFound(new { message = "ไม่พบตอนที่ต้องการแก้ไข" });

    return Results.Ok(chapter);
});

app.MapDelete("/api/manga/{mangaId}/chapters/{chapterId}", (string mangaId, string chapterId, AuthService authService, MangaRepository repo, HttpContext context) =>
{
    if (!authService.IsAdmin(context))
    {
        return Results.Json(new { message = "ไม่มีสิทธิ์เข้าถึง: ต้องเป็น Admin เท่านั้น" }, statusCode: 403);
    }

    var deleted = repo.DeleteChapter(mangaId, chapterId);
    if (!deleted) return Results.NotFound(new { message = "ไม่พบตอนที่ต้องการลบ" });

    return Results.Ok(new { success = true, message = "ลบตอนเรียบร้อยแล้ว" });
});

// Endpoint อัปโหลดไฟล์รูปภาพ (เฉพาะ Admin)
app.MapPost("/api/upload", async (IFormFile file, string? type, AuthService authService, IWebHostEnvironment env, HttpContext context) =>
{
    if (!authService.IsAdmin(context))
    {
        return Results.Json(new { message = "ไม่มีสิทธิ์เข้าถึง: ต้องเป็น Admin เท่านั้น" }, statusCode: 403);
    }

    if (file == null || file.Length == 0)
    {
        return Results.BadRequest(new { message = "ไม่พบไฟล์ที่อัปโหลด" });
    }

    var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
    var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif" };
    if (!allowedExtensions.Contains(ext))
    {
        return Results.BadRequest(new { message = "ประเภทรองรับเฉพาะไฟล์รูปภาพ (jpg, png, webp, gif, avif) เท่านั้น" });
    }

    var subFolder = type == "cover" ? "covers" : "chapters";
    var targetDir = Path.Combine(env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot"), "uploads", subFolder);
    if (!Directory.Exists(targetDir)) Directory.CreateDirectory(targetDir);

    var fileName = $"{Guid.NewGuid():N}{ext}";
    var filePath = Path.Combine(targetDir, fileName);

    using (var stream = new FileStream(filePath, FileMode.Create))
    {
        await file.CopyToAsync(stream);
    }

    var relativeUrl = $"/uploads/{subFolder}/{fileName}";
    return Results.Ok(new { success = true, url = relativeUrl, fileName });
});

// Endpoint อัปโหลดไฟล์รูปภาพหน้าการ์ตูนหลายๆ ไฟล์พร้อมกัน (เฉพาะ Admin)
app.MapPost("/api/upload/batch", async (IFormFileCollection files, AuthService authService, IWebHostEnvironment env, HttpContext context) =>
{
    if (!authService.IsAdmin(context))
    {
        return Results.Json(new { message = "ไม่มีสิทธิ์เข้าถึง: ต้องเป็น Admin เท่านั้น" }, statusCode: 403);
    }

    if (files == null || files.Count == 0)
    {
        return Results.BadRequest(new { message = "ไม่พบไฟล์ที่อัปโหลด" });
    }

    var targetDir = Path.Combine(env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot"), "uploads", "chapters");
    if (!Directory.Exists(targetDir)) Directory.CreateDirectory(targetDir);

    var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif" };
    var uploadedUrls = new List<string>();

    foreach (var file in files)
    {
        if (file.Length == 0) continue;
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowedExtensions.Contains(ext)) continue;

        var fileName = $"{Guid.NewGuid():N}{ext}";
        var filePath = Path.Combine(targetDir, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        uploadedUrls.Add($"/uploads/chapters/{fileName}");
    }

    return Results.Ok(new { success = true, urls = uploadedUrls, count = uploadedUrls.Count });
});

// SPA Fallback: ถ้าไม่ใช่ api หรือ static file ให้ส่ง index.html
app.MapFallbackToFile("index.html");

app.Run();

static double ParseChapterNumber(string numStr)
{
    var cleaned = new string(numStr.Where(c => char.IsDigit(c) || c == '.').ToArray());
    return double.TryParse(cleaned, out var num) ? num : 0;
}
