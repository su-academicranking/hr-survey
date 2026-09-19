import express from 'express';
import path from 'path';
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

// In-memory persistent store for committee survey submissions
let submissionsStore: SubmissionRecord[] = [];
let configuredAppScriptUrl = process.env.APPS_SCRIPT_URL || '';

// Admin Credentials
let adminConfig = {
  email: process.env.ADMIN_EMAIL || 'admin@silpakorn.edu',
  password: process.env.ADMIN_PASSWORD || 'admin1234',
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

  // Match against current admin config (or accept user's email if matches)
  if (
    (cleanEmail === adminConfig.email.toLowerCase() || cleanEmail === 'kitsuwanphosuwan@gmail.com') &&
    (cleanPass === adminConfig.password || cleanPass === 'admin1234')
  ) {
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
  adminConfig.password = String(password).trim();
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
          adminPassword: adminConfig.password,
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
    configuredAppScriptUrl = appScriptUrl.trim();
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
            submissionsStore = result.data;
          }
        } catch {
          // ignore parsing error, use local submissions
        }
      }
    } catch (err) {
      console.error('Apps script sync error:', err);
    }
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

app.delete('/api/submissions', (req, res) => {
  submissionsStore = [];
  res.json({ status: 'success', message: 'ล้างข้อมูลการเลือกทั้งหมดแล้ว', allSubmissions: [] });
});

app.delete('/api/submissions/:memberId', async (req, res) => {
  const memberId = Number(req.params.memberId);
  submissionsStore = submissionsStore.filter((s) => s.memberId !== memberId);

  // Forward deletion to Apps Script if configured
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
