using System.Collections.Concurrent;
using System.Security.Cryptography;

namespace MangaReaderApp.Services;

public class SessionInfo
{
    public string Token { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddDays(7);
}

public class AuthService
{
    private const string AdminUsername = "prct";
    private const string AdminPassword = "prct2522";

    // In-memory token store (Token -> SessionInfo)
    private readonly ConcurrentDictionary<string, SessionInfo> _sessions = new();

    public (bool Success, string? Token, string? Message) Login(string username, string password)
    {
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        {
            return (false, null, "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");
        }

        if (username.Trim() == AdminUsername && password == AdminPassword)
        {
            var token = GenerateSecureToken();
            var session = new SessionInfo
            {
                Token = token,
                Username = AdminUsername,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(7)
            };

            _sessions[token] = session;
            return (true, token, "เข้าสู่ระบบแอดมินสำเร็จ");
        }

        return (false, null, "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
    }

    public bool ValidateToken(string? token)
    {
        if (string.IsNullOrWhiteSpace(token)) return false;

        if (_sessions.TryGetValue(token, out var session))
        {
            if (session.ExpiresAt > DateTime.UtcNow)
            {
                return true;
            }
            // หมดอายุแล้ว
            _sessions.TryRemove(token, out _);
        }

        return false;
    }

    public void Logout(string? token)
    {
        if (!string.IsNullOrWhiteSpace(token))
        {
            _sessions.TryRemove(token, out _);
        }
    }

    public bool IsAdmin(HttpContext context)
    {
        // 1. ตรวจสอบจาก Authorization Header (Bearer <token>)
        var authHeader = context.Request.Headers["Authorization"].ToString();
        if (!string.IsNullOrWhiteSpace(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            var bearerToken = authHeader["Bearer ".Length..].Trim();
            if (ValidateToken(bearerToken)) return true;
        }

        // 2. ตรวจสอบจาก Cookie
        if (context.Request.Cookies.TryGetValue("admin_session", out var cookieToken))
        {
            if (ValidateToken(cookieToken)) return true;
        }

        // 3. ตรวจสอบจาก Custom Header X-Admin-Token
        var customHeader = context.Request.Headers["X-Admin-Token"].ToString();
        if (!string.IsNullOrWhiteSpace(customHeader))
        {
            if (ValidateToken(customHeader.Trim())) return true;
        }

        return false;
    }

    private static string GenerateSecureToken()
    {
        var bytes = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
