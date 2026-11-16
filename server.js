const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 5000;
const HOST = '127.0.0.1';

const WWW_ROOT = path.join(__dirname, 'wwwroot');
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'manga_data.json');
const UPLOADS_DIR = path.join(WWW_ROOT, 'uploads');
const COVERS_DIR = path.join(UPLOADS_DIR, 'covers');
const CHAPTERS_DIR = path.join(UPLOADS_DIR, 'chapters');

// Ensure necessary directories exist
[DATA_DIR, WWW_ROOT, UPLOADS_DIR, COVERS_DIR, CHAPTERS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Admin credentials
const ADMIN_USER = 'prct';
const ADMIN_PASS = 'prct2522';

// In-memory active sessions: token -> { username, expiresAt }
const sessions = new Map();

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function isAdmin(req) {
  // Check Authorization header
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.substring(7).trim();
    if (sessions.has(token)) {
      const sess = sessions.get(token);
      if (sess.expiresAt > Date.now()) return true;
      sessions.delete(token);
    }
  }

  // Check X-Admin-Token header
  const xToken = req.headers['x-admin-token'];
  if (xToken && sessions.has(xToken)) {
    const sess = sessions.get(xToken);
    if (sess.expiresAt > Date.now()) return true;
    sessions.delete(xToken);
  }

  // Check Cookie
  const cookieHeader = req.headers['cookie'];
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    const cookieToken = cookies['admin_session'];
    if (cookieToken && sessions.has(cookieToken)) {
      const sess = sessions.get(cookieToken);
      if (sess.expiresAt > Date.now()) return true;
      sessions.delete(cookieToken);
    }
  }

  return false;
}

function parseCookies(str) {
  const list = {};
  if (!str) return list;
  str.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    if (parts.length >= 2) {
      list[parts[0].trim()] = decodeURIComponent(parts.slice(1).join('=').trim());
    }
  });
  return list;
}

// -------------------------------------------------------------
// Data Management
// -------------------------------------------------------------
let mangas = [];

function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const json = fs.readFileSync(DATA_FILE, 'utf8');
      const data = JSON.parse(json);
      if (Array.isArray(data) && data.length > 0) {
        mangas = data;
        return;
      }
    } catch (err) {
      console.error('Error reading data file:', err);
    }
  }
  // Initial Seed
  mangas = getSeedData();
  saveData();
}

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(mangas, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving data:', err);
  }
}

function parseChapterNumber(numStr) {
  if (!numStr) return 0;
  const cleaned = String(numStr).replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// -------------------------------------------------------------
// Initial Seed Data
// -------------------------------------------------------------
function getSeedData() {
  return [
    {
      id: "solo-leveling",
      title: "Solo Leveling",
      originalTitle: "나 혼자만 레벨업",
      type: "Manhwa",
      coverUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1400&auto=format&fit=crop&q=80",
      description: "ในโลกที่เกตเชื่อมต่อมิติเปิดออก สัตว์ประหลาดเริ่มบุกโจมตี และมนุษย์กลุ่มหนึ่งได้รับพลังพิเศษที่เรียกว่า 'ฮันเตอร์' ซองจินอู ฮันเตอร์ระดับ E ที่อ่อนแอที่สุด ได้พบกับดันเจี้ยนซ้อนดันเจี้ยนสุดอันตราย และได้รับระบบภารกิจปริศนาที่ทำให้เขาสามารถ 'เลเวลอัป' ได้เพียงคนเดียว!",
      author: "Chugong",
      artist: "DUBU (REDICE STUDIO)",
      status: "Completed",
      categories: ["แอ็กชัน", "แฟนตาซี", "พลังพิเศษ", "เอาชีวิตรอด", "ดันเจี้ยน"],
      rating: 4.9,
      views: 45280,
      createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      chapters: [
        {
          id: "sl-ch-01",
          mangaId: "solo-leveling",
          chapterNumber: "1",
          title: "ฮันเตอร์ที่อ่อนแอที่สุดในโลก",
          pages: [
            "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80"
          ],
          createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 90 * 86400000).toISOString()
        },
        {
          id: "sl-ch-02",
          mangaId: "solo-leveling",
          chapterNumber: "2",
          title: "วิหารลับสองชั้น",
          pages: [
            "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1514539079130-25950c84af65?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80"
          ],
          createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 60 * 86400000).toISOString()
        },
        {
          id: "sl-ch-03",
          mangaId: "solo-leveling",
          chapterNumber: "3",
          title: "บัญญัติสามประการ",
          pages: [
            "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80"
          ],
          createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 5 * 86400000).toISOString()
        }
      ]
    },
    {
      id: "omniscient-reader",
      title: "Omniscient Reader's Viewpoint",
      originalTitle: "전지적 독자 시점",
      type: "Manhwa",
      coverUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1400&auto=format&fit=crop&q=80",
      description: "'คิมดกจา' พนักงานบริษัทธรรมดา ผู้เป็นนักอ่านคนเดียวที่อ่านนิยายเว็บความยาวกว่า 3,149 ตอนจนจบ ทันทีที่อ่านตอนอวสาน โลกความเป็นจริงก็พังทลายลงและกลายเป็นโลกแห่งหายนะตามในนิยายทุกประการ โดยมีเพียงเขาคนเดียวเท่านั้นที่รู้จุดจบของโลกใบนี้!",
      author: "sing N song",
      artist: "Sleepy-C (REDICE STUDIO)",
      status: "Ongoing",
      categories: ["แฟนตาซี", "เอาชีวิตรอด", "ดราม่า", "ไซไฟ", "จิตวิทยา"],
      rating: 4.95,
      views: 38900,
      createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
      chapters: [
        {
          id: "orv-ch-01",
          mangaId: "omniscient-reader",
          chapterNumber: "1",
          title: "จุดเริ่มต้นของบทนำ",
          pages: [
            "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&auto=format&fit=crop&q=80"
          ],
          createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 60 * 86400000).toISOString()
        },
        {
          id: "orv-ch-02",
          mangaId: "omniscient-reader",
          chapterNumber: "2",
          title: "สถานการณ์หลักเริ่มต้น",
          pages: [
            "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80"
          ],
          createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 2 * 86400000).toISOString()
        }
      ]
    },
    {
      id: "one-piece",
      title: "One Piece",
      originalTitle: "ワンピース",
      type: "Manga",
      coverUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1400&auto=format&fit=crop&q=80",
      description: "ยุคสมัยแห่งโจรสลัดได้เริ่มต้นขึ้นเมื่อราชาโจรสลัด โกล ดี. โรเจอร์ ได้ทิ้งสมบัติลับ 'วันพีซ' ไว้ ณ จุดสิ้นสุดของแกรนด์ไลน์ มังกี้ ดี. ลูฟี่ เด็กหนุ่มผู้มีร่างกายเป็นยาง ออกเดินทางสู่ท้องทะเลกว้างเพื่อรวบรวมพรรคพวกและมุ่งสู่การเป็นราชาโจรสลัดคนต่อไป!",
      author: "Eiichiro Oda",
      artist: "Eiichiro Oda",
      status: "Ongoing",
      categories: ["แอ็กชัน", "ผจญภัย", "มิตรภาพ", "คอมเมดี้"],
      rating: 4.98,
      views: 98120,
      createdAt: new Date(Date.now() - 365 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      chapters: [
        {
          id: "op-ch-01",
          mangaId: "one-piece",
          chapterNumber: "1",
          title: "รุ่งอรุณแห่งการผจญภัย",
          pages: [
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80"
          ],
          createdAt: new Date(Date.now() - 365 * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 365 * 86400000).toISOString()
        }
      ]
    },
    {
      id: "tower-of-god",
      title: "Tower of God",
      originalTitle: "신의 탑",
      type: "Manhwa",
      coverUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1400&auto=format&fit=crop&q=80",
      description: "คุณปรารถนาสิ่งใด? เงินทอง เกียรติยศ อำนาจ หรือการล้างแค้น? สิ่งใดก็ตามที่คุณปรารถนา ทั้งหมดนั้นอยู่ที่ยอดหอคอยแห่งนี้ เรื่องราวของ 'พัมที่ยี่สิบห้า' เด็กหนุ่มผู้ก้าวเข้าสู่หอคอยอันลึกลับเพื่อตามหาเด็กสาวเพียงคนเดียวที่เป็นโลกทั้งใบของเขา",
      author: "SIU",
      artist: "SIU",
      status: "Ongoing",
      categories: ["แฟนตาซี", "ผจญภัย", "ลึกลับ", "ดราม่า", "มิตรภาพ"],
      rating: 4.85,
      views: 31200,
      createdAt: new Date(Date.now() - 120 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      chapters: [
        {
          id: "tog-ch-01",
          mangaId: "tower-of-god",
          chapterNumber: "1",
          title: "ชั้นที่ 1: หัวแถวของหอคอย",
          pages: [
            "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&auto=format&fit=crop&q=80"
          ],
          createdAt: new Date(Date.now() - 120 * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 120 * 86400000).toISOString()
        }
      ]
    },
    {
      id: "jujutsu-kaisen",
      title: "Jujutsu Kaisen",
      originalTitle: "呪術廻戦",
      type: "Manga",
      coverUrl: "https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1400&auto=format&fit=crop&q=80",
      description: "อิตาโดริ ยูจิ เด็กหนุ่มมัธยมปลายธรรมดาที่มีสมรรถภาพทางกายเหนือมนุษย์ ได้กลืนนิ้วต้องสาปของ 'เรียวเมน สุคุนะ' ราชาแห่งคำสาป เพื่อช่วยเหลือเพื่อนจากวิญญาณคำสาป ทำให้เขาต้องเข้าสู่วงการไสยเวทเพื่อกำจัดคำสาปและเผชิญหน้ากับชะตากรรมที่หลีกเลี่ยงไม่ได้",
      author: "Gege Akutami",
      artist: "Gege Akutami",
      status: "Completed",
      categories: ["แอ็กชัน", "เหนือธรรมชาติ", "ดาร์กแฟนตาซี", "โรงเรียน"],
      rating: 4.88,
      views: 51200,
      createdAt: new Date(Date.now() - 150 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      chapters: [
        {
          id: "jjk-ch-01",
          mangaId: "jujutsu-kaisen",
          chapterNumber: "1",
          title: "เรียวเมน สุคุนะ",
          pages: [
            "https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80"
          ],
          createdAt: new Date(Date.now() - 150 * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 150 * 86400000).toISOString()
        }
      ]
    },
    {
      id: "the-beginning-after-the-end",
      title: "The Beginning After The End",
      originalTitle: "끝이 아닌 시작",
      type: "Manhwa",
      coverUrl: "https://images.unsplash.com/photo-1514539079130-25950c84af65?w=600&auto=format&fit=crop&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1400&auto=format&fit=crop&q=80",
      description: "กษัตริย์เกรย์ผู้มีอำนาจและความมั่งคั่งอันไร้คู่แข่งในโลกที่ขับเคลื่อนด้วยความสามารถในการต่อสู้ ทว่าเบื้องหลังกลับโดดเดี่ยวและไร้จุดหมาย หลังจากเสียชีวิต เขาได้เกิดใหม่เป็น 'อาร์เธอร์ เลย์วิน' ในโลกแฟนตาซีใบใหม่ที่เต็มไปด้วยเวทมนตร์และสัตว์ประหลาด",
      author: "TurtleMe",
      artist: "Fuyuki23",
      status: "Ongoing",
      categories: ["แฟนตาซี", "เกิดใหม่", "เวทมนตร์", "แอ็กชัน", "ผจญภัย"],
      rating: 4.92,
      views: 41230,
      createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      chapters: [
        {
          id: "tbate-ch-01",
          mangaId: "the-beginning-after-the-end",
          chapterNumber: "1",
          title: "ชีวิตใหม่ในโลกเวทมนตร์",
          pages: [
            "https://images.unsplash.com/photo-1514539079130-25950c84af65?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80"
          ],
          createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 60 * 86400000).toISOString()
        }
      ]
    }
  ];
}

loadData();

// -------------------------------------------------------------
// Helper: Body Parsers
// -------------------------------------------------------------
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function readJson(req) {
  const buf = await readBody(req);
  if (!buf.length) return {};
  try {
    return JSON.parse(buf.toString('utf8'));
  } catch {
    return {};
  }
}

// Simple Multipart parser for file uploads
function parseMultipart(buffer, boundary) {
  const boundaryBuffer = Buffer.from('--' + boundary);
  const parts = [];
  let start = 0;

  while ((start = buffer.indexOf(boundaryBuffer, start)) !== -1) {
    start += boundaryBuffer.length;
    if (buffer[start] === 45 && buffer[start + 1] === 45) { // '--'
      break;
    }
    if (buffer[start] === 13 && buffer[start + 1] === 10) { // '\r\n'
      start += 2;
    }

    const nextBoundary = buffer.indexOf(boundaryBuffer, start);
    if (nextBoundary === -1) break;

    const partBuffer = buffer.slice(start, nextBoundary - 2); // subtract \r\n
    const headerEnd = partBuffer.indexOf('\r\n\r\n');
    if (headerEnd !== -1) {
      const headerStr = partBuffer.slice(0, headerEnd).toString('utf8');
      const data = partBuffer.slice(headerEnd + 4);

      const filenameMatch = headerStr.match(/filename="([^"]+)"/);
      const nameMatch = headerStr.match(/name="([^"]+)"/);
      const contentTypeMatch = headerStr.match(/Content-Type:\s*([^\r\n]+)/i);

      parts.push({
        name: nameMatch ? nameMatch[1] : null,
        filename: filenameMatch ? filenameMatch[1] : null,
        contentType: contentTypeMatch ? contentTypeMatch[1] : null,
        data
      });
    }

    start = nextBoundary;
  }

  return parts;
}

// -------------------------------------------------------------
// MIME Types
// -------------------------------------------------------------
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// -------------------------------------------------------------
// HTTP Server & Router
// -------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(urlObj.pathname);

  // Helper response functions
  const sendJson = (statusCode, data) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
  };

  try {
    // ---------------------------------------------------------
    // API ROUTES
    // ---------------------------------------------------------

    // 1. Admin Login
    if (req.method === 'POST' && pathname === '/api/admin/login') {
      const body = await readJson(req);
      const { username, password } = body;

      if (username === ADMIN_USER && password === ADMIN_PASS) {
        const token = generateToken();
        sessions.set(token, {
          username: ADMIN_USER,
          expiresAt: Date.now() + 7 * 86400000
        });

        res.setHeader('Set-Cookie', `admin_session=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax`);
        sendJson(200, {
          success: true,
          token,
          username: ADMIN_USER,
          message: 'เข้าสู่ระบบแอดมินสำเร็จ'
        });
      } else {
        sendJson(401, { success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
      }
      return;
    }

    // 2. Admin Logout
    if (req.method === 'POST' && pathname === '/api/admin/logout') {
      const cookieHeader = req.headers['cookie'];
      if (cookieHeader) {
        const cookies = parseCookies(cookieHeader);
        const token = cookies['admin_session'];
        if (token) sessions.delete(token);
      }
      res.setHeader('Set-Cookie', 'admin_session=; Path=/; Max-Age=0');
      sendJson(200, { success: true, message: 'ออกจากระบบเรียบร้อยแล้ว' });
      return;
    }

    // 3. Admin Check
    if (req.method === 'GET' && pathname === '/api/admin/check') {
      const admin = isAdmin(req);
      sendJson(200, { isAdmin: admin, username: admin ? ADMIN_USER : null });
      return;
    }

    // 4. Public: Manga List
    if (req.method === 'GET' && pathname === '/api/manga') {
      const q = (urlObj.searchParams.get('q') || '').trim().toLowerCase();
      const type = urlObj.searchParams.get('type');
      const category = urlObj.searchParams.get('category');
      const status = urlObj.searchParams.get('status');
      const sort = urlObj.searchParams.get('sort');

      let list = [...mangas];

      if (q) {
        list = list.filter(m =>
          m.title.toLowerCase().includes(q) ||
          (m.originalTitle && m.originalTitle.toLowerCase().includes(q)) ||
          (m.author && m.author.toLowerCase().includes(q)) ||
          m.categories.some(c => c.toLowerCase().includes(q))
        );
      }

      if (type && type !== 'All') {
        list = list.filter(m => m.type.toLowerCase() === type.toLowerCase());
      }

      if (category && category !== 'All') {
        list = list.filter(m => m.categories.some(c => c.toLowerCase() === category.toLowerCase()));
      }

      if (status && status !== 'All') {
        list = list.filter(m => m.status.toLowerCase() === status.toLowerCase());
      }

      if (sort === 'rating') {
        list.sort((a, b) => b.rating - a.rating);
      } else if (sort === 'views') {
        list.sort((a, b) => b.views - a.views);
      } else if (sort === 'name') {
        list.sort((a, b) => a.title.localeCompare(b.title));
      } else {
        // default: latest updated
        list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      }

      const summaries = list.map(m => {
        const sortedCh = [...m.chapters].sort((a, b) => parseChapterNumber(b.chapterNumber) - parseChapterNumber(a.chapterNumber));
        const latest = sortedCh[0];
        return {
          id: m.id,
          title: m.title,
          originalTitle: m.originalTitle,
          type: m.type,
          coverUrl: m.coverUrl,
          description: m.description,
          status: m.status,
          categories: m.categories,
          rating: m.rating,
          views: m.views,
          chapterCount: m.chapters.length,
          latestChapterNumber: latest ? latest.chapterNumber : null,
          latestChapterDate: latest ? latest.createdAt : null,
          updatedAt: m.updatedAt
        };
      });

      sendJson(200, summaries);
      return;
    }

    // 5. Public: Manga Detail by ID
    const mangaDetailMatch = pathname.match(/^\/api\/manga\/([a-zA-Z0-9_-]+)$/);
    if (req.method === 'GET' && mangaDetailMatch) {
      const id = mangaDetailMatch[1];
      const manga = mangas.find(m => m.id === id);
      if (!manga) {
        sendJson(404, { message: 'ไม่พบมังงะที่ระบุ' });
        return;
      }
      manga.views++;
      saveData();
      sendJson(200, manga);
      return;
    }

    // 6. Public: Chapter Detail with Navigation
    const chapterDetailMatch = pathname.match(/^\/api\/manga\/([a-zA-Z0-9_-]+)\/chapters\/([a-zA-Z0-9_-]+)$/);
    if (req.method === 'GET' && chapterDetailMatch) {
      const mangaId = chapterDetailMatch[1];
      const chapterId = chapterDetailMatch[2];

      const manga = mangas.find(m => m.id === mangaId);
      if (!manga) {
        sendJson(404, { message: 'ไม่พบเรื่องนี้' });
        return;
      }

      const sortedChapters = [...manga.chapters].sort((a, b) => parseChapterNumber(a.chapterNumber) - parseChapterNumber(b.chapterNumber));
      const idx = sortedChapters.findIndex(c => c.id === chapterId);
      if (idx === -1) {
        sendJson(404, { message: 'ไม่พบตอนที่ระบุ' });
        return;
      }

      const current = sortedChapters[idx];
      const prev = idx > 0 ? sortedChapters[idx - 1] : null;
      const next = idx < sortedChapters.length - 1 ? sortedChapters[idx + 1] : null;

      sendJson(200, {
        mangaId: manga.id,
        mangaTitle: manga.title,
        mangaType: manga.type,
        chapter: current,
        prevChapter: prev ? { id: prev.id, number: prev.chapterNumber, title: prev.title } : null,
        nextChapter: next ? { id: next.id, number: next.chapterNumber, title: next.title } : null,
        allChapters: [...manga.chapters]
          .sort((a, b) => parseChapterNumber(b.chapterNumber) - parseChapterNumber(a.chapterNumber))
          .map(c => ({ id: c.id, number: c.chapterNumber, title: c.title }))
      });
      return;
    }

    // 7. Public: Categories List
    if (req.method === 'GET' && pathname === '/api/categories') {
      const cats = new Set();
      mangas.forEach(m => m.categories.forEach(c => cats.add(c)));
      sendJson(200, Array.from(cats).sort());
      return;
    }

    // 8. Public: Stats
    if (req.method === 'GET' && pathname === '/api/stats') {
      const totalManga = mangas.length;
      const manhwaCount = mangas.filter(m => m.type.toLowerCase() === 'manhwa').length;
      const mangaCount = mangas.filter(m => m.type.toLowerCase() === 'manga').length;
      const totalChapters = mangas.reduce((sum, m) => sum + m.chapters.length, 0);
      const totalViews = mangas.reduce((sum, m) => sum + (m.views || 0), 0);

      sendJson(200, {
        totalManga,
        manhwaCount,
        mangaCount,
        totalChapters,
        totalViews
      });
      return;
    }

    // ---------------------------------------------------------
    // PROTECTED ADMIN ENDPOINTS
    // ---------------------------------------------------------

    // Admin Check Gate
    if (pathname.startsWith('/api/manga') && (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE')) {
      if (!isAdmin(req)) {
        sendJson(403, { message: 'ไม่มีสิทธิ์เข้าถึง: ต้องเป็น Admin เท่านั้น' });
        return;
      }
    }

    // Create Manga
    if (req.method === 'POST' && pathname === '/api/manga') {
      const body = await readJson(req);
      if (!body.title || !body.title.trim()) {
        sendJson(400, { message: 'กรุณากรอกชื่อเรื่อง' });
        return;
      }

      const id = body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || crypto.randomBytes(6).toString('hex');
      const newManga = {
        id: mangas.some(m => m.id === id) ? `${id}-${Date.now().toString().slice(-4)}` : id,
        title: body.title.trim(),
        originalTitle: (body.originalTitle || '').trim(),
        type: body.type || 'Manhwa',
        coverUrl: (body.coverUrl || '').trim(),
        bannerUrl: (body.bannerUrl || '').trim(),
        description: (body.description || '').trim(),
        author: (body.author || '').trim(),
        artist: (body.artist || '').trim(),
        status: body.status || 'Ongoing',
        categories: Array.isArray(body.categories) ? body.categories : [],
        rating: 5.0,
        views: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        chapters: []
      };

      mangas.unshift(newManga);
      saveData();
      sendJson(201, newManga);
      return;
    }

    // Update Manga
    if (req.method === 'PUT' && mangaDetailMatch) {
      const id = mangaDetailMatch[1];
      const manga = mangas.find(m => m.id === id);
      if (!manga) {
        sendJson(404, { message: 'ไม่พบเรื่องที่ต้องการแก้ไข' });
        return;
      }

      const body = await readJson(req);
      manga.title = (body.title || manga.title).trim();
      manga.originalTitle = (body.originalTitle !== undefined ? body.originalTitle : manga.originalTitle).trim();
      manga.type = body.type || manga.type;
      manga.coverUrl = (body.coverUrl !== undefined ? body.coverUrl : manga.coverUrl).trim();
      manga.bannerUrl = (body.bannerUrl !== undefined ? body.bannerUrl : manga.bannerUrl).trim();
      manga.description = (body.description !== undefined ? body.description : manga.description).trim();
      manga.author = (body.author !== undefined ? body.author : manga.author).trim();
      manga.artist = (body.artist !== undefined ? body.artist : manga.artist).trim();
      manga.status = body.status || manga.status;
      manga.categories = Array.isArray(body.categories) ? body.categories : manga.categories;
      manga.updatedAt = new Date().toISOString();

      saveData();
      sendJson(200, manga);
      return;
    }

    // Delete Manga
    if (req.method === 'DELETE' && mangaDetailMatch) {
      const id = mangaDetailMatch[1];
      const index = mangas.findIndex(m => m.id === id);
      if (index === -1) {
        sendJson(404, { message: 'ไม่พบเรื่องที่ต้องการลบ' });
        return;
      }

      mangas.splice(index, 1);
      saveData();
      sendJson(200, { success: true, message: 'ลบเรื่องเรียบร้อยแล้ว' });
      return;
    }

    // Add Chapter
    const mangaChaptersMatch = pathname.match(/^\/api\/manga\/([a-zA-Z0-9_-]+)\/chapters$/);
    if (req.method === 'POST' && mangaChaptersMatch) {
      const mangaId = mangaChaptersMatch[1];
      const manga = mangas.find(m => m.id === mangaId);
      if (!manga) {
        sendJson(404, { message: 'ไม่พบเรื่องที่ต้องการเพิ่มตอน' });
        return;
      }

      const body = await readJson(req);
      if (!body.chapterNumber) {
        sendJson(400, { message: 'กรุณากรอกเลขตอน' });
        return;
      }

      const newChapter = {
        id: `ch-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
        mangaId: manga.id,
        chapterNumber: String(body.chapterNumber).trim(),
        title: (body.title || '').trim(),
        pages: Array.isArray(body.pages) ? body.pages : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      manga.chapters.push(newChapter);
      manga.updatedAt = new Date().toISOString();
      saveData();

      sendJson(201, newChapter);
      return;
    }

    // Update Chapter
    if (req.method === 'PUT' && chapterDetailMatch) {
      const mangaId = chapterDetailMatch[1];
      const chapterId = chapterDetailMatch[2];

      const manga = mangas.find(m => m.id === mangaId);
      if (!manga) {
        sendJson(404, { message: 'ไม่พบเรื่องที่ต้องการแก้ไข' });
        return;
      }

      const chapter = manga.chapters.find(c => c.id === chapterId);
      if (!chapter) {
        sendJson(404, { message: 'ไม่พบตอนที่ต้องการแก้ไข' });
        return;
      }

      const body = await readJson(req);
      if (body.chapterNumber) chapter.chapterNumber = String(body.chapterNumber).trim();
      if (body.title !== undefined) chapter.title = String(body.title).trim();
      if (Array.isArray(body.pages)) chapter.pages = body.pages;
      chapter.updatedAt = new Date().toISOString();
      manga.updatedAt = new Date().toISOString();

      saveData();
      sendJson(200, chapter);
      return;
    }

    // Delete Chapter
    if (req.method === 'DELETE' && chapterDetailMatch) {
      const mangaId = chapterDetailMatch[1];
      const chapterId = chapterDetailMatch[2];

      const manga = mangas.find(m => m.id === mangaId);
      if (!manga) {
        sendJson(404, { message: 'ไม่พบเรื่อง' });
        return;
      }

      const idx = manga.chapters.findIndex(c => c.id === chapterId);
      if (idx === -1) {
        sendJson(404, { message: 'ไม่พบตอนที่ต้องการลบ' });
        return;
      }

      manga.chapters.splice(idx, 1);
      manga.updatedAt = new Date().toISOString();
      saveData();

      sendJson(200, { success: true, message: 'ลบตอนเรียบร้อยแล้ว' });
      return;
    }

    // Image Upload Single (Admin)
    if (req.method === 'POST' && pathname === '/api/upload') {
      if (!isAdmin(req)) {
        sendJson(403, { message: 'ไม่มีสิทธิ์เข้าถึง: ต้องเป็น Admin เท่านั้น' });
        return;
      }

      const contentType = req.headers['content-type'] || '';
      const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
      if (!boundaryMatch) {
        sendJson(400, { message: 'Invalid multipart body' });
        return;
      }

      const boundary = boundaryMatch[1] || boundaryMatch[2];
      const bodyBuffer = await readBody(req);
      const parts = parseMultipart(bodyBuffer, boundary);

      const filePart = parts.find(p => p.filename && p.data && p.data.length > 0);
      const typePart = parts.find(p => p.name === 'type');
      const isCover = typePart && typePart.data.toString().trim() === 'cover';

      if (!filePart) {
        sendJson(400, { message: 'ไม่พบไฟล์ที่อัปโหลด' });
        return;
      }

      const ext = path.extname(filePart.filename).toLowerCase() || '.jpg';
      const targetSubDir = isCover ? 'covers' : 'chapters';
      const fileName = `${crypto.randomBytes(16).toString('hex')}${ext}`;
      const filePath = path.join(UPLOADS_DIR, targetSubDir, fileName);

      fs.writeFileSync(filePath, filePart.data);

      sendJson(200, {
        success: true,
        url: `/uploads/${targetSubDir}/${fileName}`,
        fileName
      });
      return;
    }

    // Image Upload Batch (Admin)
    if (req.method === 'POST' && pathname === '/api/upload/batch') {
      if (!isAdmin(req)) {
        sendJson(403, { message: 'ไม่มีสิทธิ์เข้าถึง: ต้องเป็น Admin เท่านั้น' });
        return;
      }

      const contentType = req.headers['content-type'] || '';
      const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
      if (!boundaryMatch) {
        sendJson(400, { message: 'Invalid multipart body' });
        return;
      }

      const boundary = boundaryMatch[1] || boundaryMatch[2];
      const bodyBuffer = await readBody(req);
      const parts = parseMultipart(bodyBuffer, boundary);

      const uploadedUrls = [];
      for (const part of parts) {
        if (part.filename && part.data && part.data.length > 0) {
          const ext = path.extname(part.filename).toLowerCase() || '.jpg';
          const fileName = `${crypto.randomBytes(16).toString('hex')}${ext}`;
          const filePath = path.join(CHAPTERS_DIR, fileName);
          fs.writeFileSync(filePath, part.data);
          uploadedUrls.push(`/uploads/chapters/${fileName}`);
        }
      }

      sendJson(200, {
        success: true,
        urls: uploadedUrls,
        count: uploadedUrls.length
      });
      return;
    }

    // ---------------------------------------------------------
    // STATIC FILES SERVING & SPA FALLBACK
    // ---------------------------------------------------------
    let filePath = path.join(WWW_ROOT, pathname);

    // Prevent directory traversal
    if (!filePath.startsWith(WWW_ROOT)) {
      sendJson(403, { message: 'Forbidden' });
      return;
    }

    // If points to directory, serve index.html
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    // If file exists, serve it
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    // SPA Fallback: if not an API route and file not found, serve index.html
    if (!pathname.startsWith('/api/')) {
      const indexPath = path.join(WWW_ROOT, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        fs.createReadStream(indexPath).pipe(res);
        return;
      }
    }

    sendJson(404, { message: 'Not Found' });

  } catch (err) {
    console.error('Server error:', err);
    sendJson(500, { message: 'Internal Server Error', error: err.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`====================================================`);
  console.log(` MangaVerse Server is running!`);
  console.log(` URL: http://${HOST}:${PORT}`);
  console.log(` Admin User: ${ADMIN_USER}`);
  console.log(` Admin Pass: ${ADMIN_PASS}`);
  console.log(`====================================================`);
});
