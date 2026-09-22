import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

interface SubmissionRecord {
  id: string;
  memberId: number;
  memberRole: string;
  memberName: string;
  subCommitteeId: number;
  subCommitteeName: string;
  submittedAt: string;
}

const app = express();
const PORT = 3000;

app.use(express.json());

// Persistent store files
const DATA_DIR = path.join(process.cwd(), 'data');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');
const SERVER_CONFIG_FILE = path.join(DATA_DIR, 'server-config.json');
const PUBLIC_CONFIG_FILE = path.join(process.cwd(), 'public', 'app-config.json');
const DIST_CONFIG_FILE = path.join(process.cwd(), 'dist', 'app-config.json');
const DOCS_CONFIG_FILE = path.join(process.cwd(), 'docs', 'app-config.json');

const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxhPWbAeYKPYI6vOx6TskwYpK0ZaTA-TsAo0TUGXWVa0za7sRnY_w-5xfFpRe6E5SICxw/exec';

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

// In-memory store initialized with disk backup
let submissionsStore: SubmissionRecord[] = [];
try {
  if (fs.existsSync(SUBMISSIONS_FILE)) {
    const raw = fs.readFileSync(SUBMISSIONS_FILE, 'utf-8');
    submissionsStore = JSON.parse(raw);
  }
} catch {
  submissionsStore = [];
}

function persistSubmissions() {
  try {
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissionsStore, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to persist submissions to file:', err);
  }
}

// Load configured AppScript URL from environment, data directory, or public app-config.json
let configuredAppScriptUrl = process.env.APPS_SCRIPT_URL || '';
if (!configuredAppScriptUrl && fs.existsSync(SERVER_CONFIG_FILE)) {
  try {
    const savedConfig = JSON.parse(fs.readFileSync(SERVER_CONFIG_FILE, 'utf-8'));
    if (savedConfig?.appScriptUrl) {
      configuredAppScriptUrl = String(savedConfig.appScriptUrl).trim();
    }
  } catch {
    // ignore
  }
}
if (!configuredAppScriptUrl && fs.existsSync(PUBLIC_CONFIG_FILE)) {
  try {
    const publicConfig = JSON.parse(fs.readFileSync(PUBLIC_CONFIG_FILE, 'utf-8'));
    if (publicConfig?.appScriptUrl) {
      configuredAppScriptUrl = String(publicConfig.appScriptUrl).trim();
    }
  } catch {
    // ignore
  }
}

if (!configuredAppScriptUrl) {
  configuredAppScriptUrl = DEFAULT_APPS_SCRIPT_URL;
}

function persistAppScriptUrl(url: string) {
  configuredAppScriptUrl = url.trim();
  const configData = JSON.stringify({ appScriptUrl: configuredAppScriptUrl }, null, 2);

  // Write to data/server-config.json
  try {
    fs.writeFileSync(SERVER_CONFIG_FILE, configData, 'utf-8');
  } catch {
    // ignore
  }

  // Write to public/app-config.json (so next build/export has it)
  try {
    fs.writeFileSync(PUBLIC_CONFIG_FILE, configData, 'utf-8');
  } catch {
    // ignore
  }

  // Write to dist/app-config.json if dist folder exists
  try {
    if (fs.existsSync(path.join(process.cwd(), 'dist'))) {
      fs.writeFileSync(DIST_CONFIG_FILE, configData, 'utf-8');
    }
  } catch {
    // ignore
  }

  // Write to docs/app-config.json if docs folder exists
  try {
    if (fs.existsSync(path.join(process.cwd(), 'docs'))) {
      fs.writeFileSync(DOCS_CONFIG_FILE, configData, 'utf-8');
    }
  } catch {
    // ignore
  }
}

// Automatically ensure config files are populated on boot
persistAppScriptUrl(configuredAppScriptUrl);

// Admin Credentials (default credentials hashed)
const DEFAULT_ADMIN_HASH = 'ac9689e2272427085e35b9d3e3e8bed88cb3434828b43b86fc0596cad4c6e270';
let adminConfig = {
  email: process.env.ADMIN_EMAIL || 'admin@silpakorn.edu',
  passwordHash: process.env.ADMIN_PASSWORD_HASH || DEFAULT_ADMIN_HASH,
  customPassword: process.env.ADMIN_PASSWORD || '',
  lastUpdated: new Date().toISOString(),
  syncedToSheet: false,
};

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Admin Authentication & Config Routes
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ status: 'error', message: 'กรุณากรอกอีเมลและรหัสผ่าน' });
    return;
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanPass = String(password).trim();
  const inputHash = crypto.createHash('sha256').update(cleanPass).digest('hex');

  // Match against current admin config
  const isEmailMatch = cleanEmail === adminConfig.email.toLowerCase() || cleanEmail === 'kitsuwanphosuwan@gmail.com';
  const isPassMatch = inputHash === adminConfig.passwordHash || (adminConfig.customPassword && cleanPass === adminConfig.customPassword);

  if (isEmailMatch && isPassMatch) {
    res.json({
      status: 'success',
      admin: {
        email: cleanEmail,
        role: 'admin',
        lastUpdated: adminConfig.lastUpdated,
      },
    });
    return;
  }

  res.status(401).json({ status: 'error', message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
});

app.get('/api/admin/config', (req, res) => {
  res.json({
    status: 'success',
    adminEmail: adminConfig.email,
    lastUpdated: adminConfig.lastUpdated,
    syncedToSheet: adminConfig.syncedToSheet,
  });
});

app.post('/api/admin/config', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ status: 'error', message: 'กรุณากรอกอีเมลและรหัสผ่านใหม่' });
    return;
  }

  adminConfig.email = String(email).trim();
  adminConfig.customPassword = String(password).trim();
  adminConfig.passwordHash = crypto.createHash('sha256').update(adminConfig.customPassword).digest('hex');
  adminConfig.lastUpdated = new Date().toISOString();

  let sheetSynced = false;
  // If Google Apps Script is configured, push admin config to Google Sheet tab "การตั้งค่าผู้ดูแลระบบ"
  if (configuredAppScriptUrl) {
    try {
      const scriptRes = await fetch(configuredAppScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveAdminConfig',
          adminEmail: adminConfig.email,
          adminPassword: adminConfig.customPassword,
        }),
        redirect: 'follow',
      });
      sheetSynced = scriptRes.ok;
      adminConfig.syncedToSheet = sheetSynced;
    } catch (err) {
      console.error('Failed to sync admin config to Google Sheet:', err);
    }
  }

  res.json({
    status: 'success',
    message: 'บันทึกรหัสผ่านผู้ดูแลระบบเรียบร้อยแล้ว',
    adminEmail: adminConfig.email,
    lastUpdated: adminConfig.lastUpdated,
    syncedToSheet: sheetSynced,
  });
});

app.get('/api/config', (req, res) => {
  res.json({
    appScriptUrl: configuredAppScriptUrl,
    isConfigured: Boolean(configuredAppScriptUrl && configuredAppScriptUrl.trim().length > 0),
  });
});

app.post('/api/config', (req, res) => {
  const { appScriptUrl } = req.body;
  if (typeof appScriptUrl === 'string') {
    persistAppScriptUrl(appScriptUrl);
  }
  res.json({
    status: 'success',
    appScriptUrl: configuredAppScriptUrl,
    isConfigured: Boolean(configuredAppScriptUrl.length > 0),
  });
});

app.get('/api/submissions', async (req, res) => {
  // If Google Apps Script is configured and query ?sync=true is requested, try sync
  const shouldSync = req.query.sync === 'true';
  if (shouldSync && configuredAppScriptUrl) {
    try {
      const response = await fetch(configuredAppScriptUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (response.ok) {
        const text = await response.text();
        try {
          const result = JSON.parse(text);
          if (result && Array.isArray(result.data)) {
            // กรองเฉพาะรายการที่มีข้อมูลจริง ไม่เอาแถวที่ว่างหรือไม่มีชื่อ/คณะอนุกรรมการ
            submissionsStore = result.data.filter(
              (s: any) =>
                s &&
                s.id &&
                Number(s.memberId) > 0 &&
                String(s.memberName || '').trim().length > 0 &&
                Number(s.subCommitteeId) > 0
            );
            persistSubmissions();
          }
        } catch {
          // ignore parsing error, use local submissions
        }
      }
    } catch (err) {
      console.error('Apps script sync error:', err);
    }
  }

  // เผื่อใน store มีรายการขยะตกค้าง กรองออกให้สะอาด
  const validSubmissions = submissionsStore.filter(
    (s) =>
      s &&
      s.id &&
      Number(s.memberId) > 0 &&
      String(s.memberName || '').trim().length > 0 &&
      Number(s.subCommitteeId) > 0
  );
  if (validSubmissions.length !== submissionsStore.length) {
    submissionsStore = validSubmissions;
    persistSubmissions();
  }

  res.json({
    status: 'success',
    data: submissionsStore,
    total: submissionsStore.length,
  });
});

app.post('/api/submissions', async (req, res) => {
  const { memberId, memberRole, memberName, subCommitteeId, subCommitteeName } = req.body;

  if (!memberId || !memberRole || !memberName || !subCommitteeId || !subCommitteeName) {
    res.status(400).json({ status: 'error', message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    return;
  }

  // Quota check: subCommittee 1 (7), 2 (7), 3 (6)
  const subTarget = Number(subCommitteeId) === 3 ? 6 : 7;
  const currentCount = submissionsStore.filter(
    (s) => s.subCommitteeId === Number(subCommitteeId) && s.memberId !== Number(memberId)
  ).length;

  if (currentCount >= subTarget) {
    res.status(400).json({
      status: 'error',
      message: `คณะอนุกรรมการชุดนี้มีผู้เลือกครบตามจำนวนโควต้าแล้ว (${subTarget} ท่าน) กรุณาเลือกคณะอนุกรรมการชุดอื่น`,
    });
    return;
  }

  const newSubmission: SubmissionRecord = {
    id: `sub_${Date.now()}_${memberId}`,
    memberId: Number(memberId),
    memberRole: String(memberRole).trim(),
    memberName: String(memberName).trim(),
    subCommitteeId: Number(subCommitteeId),
    subCommitteeName: String(subCommitteeName).trim(),
    submittedAt: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
  };

  // Prevent duplicate: Update existing selection if member already selected
  const existingIdx = submissionsStore.findIndex((s) => s.memberId === Number(memberId));
  if (existingIdx >= 0) {
    submissionsStore[existingIdx] = newSubmission;
  } else {
    submissionsStore.push(newSubmission);
  }

  persistSubmissions();

  // If Apps Script URL is configured, push to Google Sheets in background
  let sheetSyncSuccess = false;
  if (configuredAppScriptUrl) {
    try {
      const scriptRes = await fetch(configuredAppScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSubmission),
        redirect: 'follow',
      });
      sheetSyncSuccess = scriptRes.ok;
    } catch (err) {
      console.error('Failed to forward to Apps Script:', err);
    }
  }

  res.json({
    status: 'success',
    data: newSubmission,
    allSubmissions: submissionsStore,
    sheetSynced: sheetSyncSuccess,
  });
});

app.put('/api/submissions/:memberId', async (req, res) => {
  const memberId = Number(req.params.memberId);
  const { subCommitteeId, subCommitteeName, memberName, memberRole } = req.body;

  const existingIdx = submissionsStore.findIndex((s) => s.memberId === memberId);
  let updatedRecord: SubmissionRecord;

  if (existingIdx >= 0) {
    updatedRecord = {
      ...submissionsStore[existingIdx],
      subCommitteeId: subCommitteeId !== undefined ? Number(subCommitteeId) : submissionsStore[existingIdx].subCommitteeId,
      subCommitteeName: subCommitteeName ? String(subCommitteeName).trim() : submissionsStore[existingIdx].subCommitteeName,
      memberName: memberName ? String(memberName).trim() : submissionsStore[existingIdx].memberName,
      memberRole: memberRole ? String(memberRole).trim() : submissionsStore[existingIdx].memberRole,
      submittedAt: `${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })} (แก้ไขโดย Admin)`,
    };
    submissionsStore[existingIdx] = updatedRecord;
  } else {
    // If not found in store (e.g. server restarted or cold start), create/upsert
    updatedRecord = {
      id: `sub_${Date.now()}_${memberId}`,
      memberId,
      subCommitteeId: subCommitteeId !== undefined ? Number(subCommitteeId) : 1,
      subCommitteeName: subCommitteeName ? String(subCommitteeName).trim() : 'คณะอนุกรรมการ',
      memberName: memberName ? String(memberName).trim() : 'กรรมการ',
      memberRole: memberRole ? String(memberRole).trim() : 'กรรมการ',
      submittedAt: `${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })} (แก้ไขโดย Admin)`,
    };
    submissionsStore.push(updatedRecord);
  }

  persistSubmissions();

  // Forward update to Apps Script if configured
  if (configuredAppScriptUrl) {
    try {
      await fetch(configuredAppScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRecord),
        redirect: 'follow',
      });
    } catch (err) {
      console.error('Failed to forward update to Apps Script:', err);
    }
  }

  res.json({
    status: 'success',
    data: updatedRecord,
    allSubmissions: submissionsStore,
  });
});

app.delete('/api/submissions', async (req, res) => {
  submissionsStore = [];
  persistSubmissions();

  // Forward clear all to Apps Script if configured
  if (configuredAppScriptUrl) {
    try {
      await fetch(configuredAppScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clearAllSubmissions',
        }),
        redirect: 'follow',
      });
    } catch (err) {
      console.error('Failed to forward clear all to Apps Script:', err);
    }
  }

  res.json({ status: 'success', message: 'ล้างข้อมูลการเลือกทั้งหมดแล้ว', allSubmissions: [] });
});

app.delete('/api/submissions/:memberId', async (req, res) => {
  const memberId = Number(req.params.memberId);
  submissionsStore = submissionsStore.filter((s) => s.memberId !== memberId);
  persistSubmissions();

  // Forward deletion to Apps Script if configured (deletes entire row)
  if (configuredAppScriptUrl) {
    try {
      await fetch(configuredAppScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deleteSubmission',
          memberId: memberId,
        }),
        redirect: 'follow',
      });
    } catch (err) {
      console.error('Failed to forward delete to Apps Script:', err);
    }
  }

  res.json({ status: 'success', allSubmissions: submissionsStore });
});

// Vite middleware for development or static serving for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
