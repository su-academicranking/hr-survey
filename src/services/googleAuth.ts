import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { SurveySubmission } from '../types';

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => {
  provider.addScope(scope);
});
provider.setCustomParameters({
  prompt: 'consent select_account',
  access_type: 'offline',
});

// Cache the access token in memory (never in localStorage/sessionStorage per security rules)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    // Gracefully handle normal user actions like closing popup window or cancelling request
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.message?.includes('popup-closed-by-user') ||
      error?.code === 'auth/cancelled-popup-request'
    ) {
      // Normal cancellation - do not treat as an application crash or error
      return null;
    }

    if (error?.code === 'auth/popup-blocked') {
      throw new Error('เบราว์เซอร์บล็อกหน้าต่าง Pop-up กรุณาอนุญาต Pop-up แล้วลองอีกครั้ง');
    }

    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

/**
 * Extracts spreadsheet ID from either a full Google Sheet URL or a raw ID string
 */
export const extractSpreadsheetId = (input: string): string => {
  if (!input) return '';
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
};

/**
 * Creates a new Google Spreadsheet in the user's Google Drive and formats it
 */
export const createSurveySpreadsheet = async (
  token: string,
  title = 'ผลการเลือกคณะอนุกรรมการ - มหาวิทยาลัยศิลปากร'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> => {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [
        {
          properties: {
            title: 'ผลการเลือกคณะอนุกรรมการ',
            gridProperties: { rowCount: 100, columnCount: 10, frozenRowCount: 1 },
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (errorText.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT')) {
      throw new Error(
        'สิทธิ์ของบัญชี Google ไม่เพียงพอสำหรับการสร้างไฟล์ (ACCESS_TOKEN_SCOPE_INSUFFICIENT) แนะนำให้สร้างไฟล์เปล่าที่ sheet.new แล้วคัดลอกลิงก์มาวางในช่อง "เชื่อมต่อด้วย Google Sheet URL / ID" หรือกด "ออกจากระบบ" แล้วเข้าใหม่เพื่อยินยอมสิทธิ์'
      );
    }
    throw new Error(`สร้าง Google Sheet ไม่สำเร็จ (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Insert headers
  const headers = [
    'รหัสการเลือก',
    'ลำดับกรรมการ',
    'ตำแหน่งกรรมการ (ตามคำสั่ง)',
    'ชื่อ-นามสกุล',
    'รหัสคณะอนุกรรมการ',
    'คณะอนุกรรมการที่เลือก',
    'วันเวลาที่บันทึก',
  ];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/ผลการเลือกคณะอนุกรรมการ!A1:G1?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: 'ผลการเลือกคณะอนุกรรมการ!A1:G1',
        majorDimension: 'ROWS',
        values: [headers],
      }),
    }
  );

  return { spreadsheetId, spreadsheetUrl };
};

/**
 * Connects and formats an existing Google Spreadsheet (created manually or existing)
 */
export const initializeExistingSpreadsheet = async (
  token: string,
  spreadsheetInput: string,
  existingSubmissions: SurveySubmission[] = []
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; sheetName: string }> => {
  const spreadsheetId = extractSpreadsheetId(spreadsheetInput);
  if (!spreadsheetId) {
    throw new Error('กรุณาระบุ Google Sheet ID หรือ URL ที่ถูกต้อง');
  }

  // 1. Check access by getting spreadsheet metadata
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!metaRes.ok) {
    const err = await metaRes.text();
    if (err.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT')) {
      throw new Error(
        'สิทธิ์ของบัญชี Google ไม่เพียงพอ (ACCESS_TOKEN_SCOPE_INSUFFICIENT) กรุณากด "ออกจากระบบ" แล้วเข้าสู่ระบบใหม่อีกครั้งเพื่อกดยืนยันสิทธิ์อนุญาตเข้าถึง Google Sheets หรือใช้วิธีเชื่อมต่อผ่าน Google Apps Script'
      );
    }
    throw new Error(`ไม่สามารถเข้าถึง Google Sheet นี้ได้ (${metaRes.status}): กรุณาตรวจสอบว่าบัญชีนี้มีสิทธิ์แก้ไขไฟล์ หรือไฟล์เปิดสิทธิ์เข้าถึงไว้`);
  }

  const metaData = await metaRes.json();
  const sheetName = metaData.sheets?.[0]?.properties?.title || 'Sheet1';

  // 2. Insert headers into row 1
  const headers = [
    'รหัสการเลือก',
    'ลำดับกรรมการ',
    'ตำแหน่งกรรมการ (ตามคำสั่ง)',
    'ชื่อ-นามสกุล',
    'รหัสคณะอนุกรรมการ',
    'คณะอนุกรรมการที่เลือก',
    'วันเวลาที่บันทึก',
  ];

  const headerRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:G1?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: `${sheetName}!A1:G1`,
        majorDimension: 'ROWS',
        values: [headers],
      }),
    }
  );

  if (!headerRes.ok) {
    const errText = await headerRes.text();
    throw new Error(`ไม่สามารถบันทึกหัวตารางได้: ${errText}`);
  }

  // 3. Populate existing submissions if available
  if (existingSubmissions.length > 0) {
    const rows = existingSubmissions.map((s) => [
      s.id,
      s.memberId,
      s.memberRole,
      s.memberName,
      s.subCommitteeId,
      s.subCommitteeName,
      s.submittedAt,
    ]);

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A2:G${rows.length + 1}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: rows,
        }),
      }
    );
  }

  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  return { spreadsheetId, spreadsheetUrl, sheetName };
};

/**
 * Appends or updates survey row in Google Spreadsheet via Sheets API v4
 */
export const syncSubmissionToSheet = async (
  token: string,
  spreadsheetId: string,
  submission: {
    id: string;
    memberId: number;
    memberRole: string;
    memberName: string;
    subCommitteeId: number;
    subCommitteeName: string;
    submittedAt: string;
  }
) => {
  const row = [
    submission.id,
    submission.memberId,
    submission.memberRole,
    submission.memberName,
    submission.subCommitteeId,
    submission.subCommitteeName,
    submission.submittedAt,
  ];

  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:G1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [row],
      }),
    }
  );

  return appendRes.ok;
};

/**
 * Saves admin credentials directly to Google Sheets in "การตั้งค่าผู้ดูแลระบบ" tab
 */
export const syncAdminConfigToSheet = async (
  token: string,
  spreadsheetId: string,
  adminEmail: string,
  adminPasswordHash: string
) => {
  try {
    // 1. Check existing sheets
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!metaRes.ok) return false;
    const metaData = await metaRes.json();
    const configTabName = 'การตั้งค่าผู้ดูแลระบบ';
    const hasConfigSheet = metaData.sheets?.some(
      (s: any) => s.properties?.title === configTabName
    );

    // 2. If tab doesn't exist, create it
    if (!hasConfigSheet) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                addSheet: {
                  properties: { title: configTabName },
                },
              },
            ],
          }),
        }
      );
    }

    // 3. Write admin credentials
    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(configTabName)}!A1:C2?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: `${configTabName}!A1:C2`,
          majorDimension: 'ROWS',
          values: [
            ['อีเมลผู้ดูแลระบบ (Admin Email)', 'รหัสผ่าน (Password)', 'วันเวลาที่แก้ไขล่าสุด'],
            [
              adminEmail,
              adminPasswordHash,
              new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
            ],
          ],
        }),
      }
    );

    return updateRes.ok;
  } catch (err) {
    console.error('Failed to sync admin config to sheet:', err);
    return false;
  }
};

/**
 * Overwrites all survey rows in Google Spreadsheet when an edit or delete occurs
 */
export const syncAllSubmissionsToSheet = async (
  token: string,
  spreadsheetId: string,
  allSubmissions: SurveySubmission[],
  sheetName = 'ผลการเลือกคณะอนุกรรมการ'
): Promise<boolean> => {
  try {
    // 1. Clear old data from A2:G200
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A2:G200:clear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // 2. Write updated rows
    if (allSubmissions.length > 0) {
      const rows = allSubmissions.map((s) => [
        s.id,
        s.memberId,
        s.memberRole,
        s.memberName,
        s.subCommitteeId,
        s.subCommitteeName,
        s.submittedAt,
      ]);

      const writeRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A2:G${rows.length + 1}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: rows,
          }),
        }
      );
      return writeRes.ok;
    }

    return true;
  } catch (err) {
    console.warn('syncAllSubmissionsToSheet error:', err);
    return false;
  }
};

