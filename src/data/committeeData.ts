import { CommitteeMember, SubCommittee } from '../types';

export const SILPAKORN_LOGO_URL = 'https://lh3.googleusercontent.com/d/1QdEWReQB6ujnKpX9O9q1Gx1i7akY9Wqb';

export const COMMITTEE_MEMBERS: CommitteeMember[] = [
  {
    id: 1,
    role: 'ผู้ช่วยอธิการบดีฝ่ายพัฒนาบุคลากร',
    category: 'กรรมการ',
  },
  {
    id: 2,
    role: 'ผู้อำนวยการสถาบันการเรียนรู้ตลอดชีวิตแห่งมหาวิทยาลัยศิลปากร',
    category: 'กรรมการ',
  },
  {
    id: 3,
    role: 'รองคณบดีฝ่ายบริหาร คณะจิตรกรรม ประติมากรรมและภาพพิมพ์',
    category: 'กรรมการ',
  },
  {
    id: 4,
    role: 'คณบดีคณะสถาปัตยกรรมศาสตร์',
    category: 'กรรมการ',
  },
  {
    id: 5,
    role: 'รองคณบดีฝ่ายกิจการพิเศษ คณะโบราณคดี',
    category: 'กรรมการ',
  },
  {
    id: 6,
    role: 'คณบดีคณะมัณฑนศิลป์',
    category: 'กรรมการ',
  },
  {
    id: 7,
    role: 'รองคณบดีฝ่ายบริหารและกิจการพิเศษ คณะอักษรศาสตร์',
    category: 'กรรมการ',
  },
  {
    id: 8,
    role: 'รองคณบดีฝ่ายบริหาร คณะศึกษาศาสตร์',
    category: 'กรรมการ',
  },
  {
    id: 9,
    role: 'รองคณบดีฝ่ายบริหาร คณะวิทยาศาสตร์',
    category: 'กรรมการ',
  },
  {
    id: 10,
    role: 'รองคณบดีฝ่ายการจัดการทรัพยากรเพื่อความยั่งยืน คณะเภสัชศาสตร์',
    category: 'กรรมการ',
  },
  {
    id: 11,
    role: 'รองคณบดีฝ่ายบริหาร คณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม',
    category: 'กรรมการ',
  },
  {
    id: 12,
    role: 'รองคณบดีฝ่ายบริการวิชาการและวิเทศสัมพันธ์ คณะดุริยางคศาสตร์',
    category: 'กรรมการ',
  },
  {
    id: 13,
    role: 'รองคณบดีฝ่ายบริหารและพัฒนาองค์กร คณะสัตวศาสตร์และเทคโนโลยีการเกษตร',
    category: 'กรรมการ',
  },
  {
    id: 14,
    role: 'รองคณบดีฝ่ายวางแผนและพัฒนาองค์กร คณะวิทยาการจัดการ',
    category: 'กรรมการ',
  },
  {
    id: 15,
    role: 'รองคณบดีฝ่ายกิจการพิเศษ คณะเทคโนโลยีสารสนเทศและการสื่อสาร',
    category: 'กรรมการ',
  },
  {
    id: 16,
    role: 'รองคณบดีวิทยาลัยนานาชาติด้านวางแผนและพัฒนา',
    category: 'กรรมการ',
  },
  {
    id: 17,
    role: 'รองคณบดีคณะสหเวชศาสตร์',
    category: 'กรรมการ',
  },
  {
    id: 18,
    role: 'รองผู้อำนวยการสำนักดิจิทัลเทคโนโลยี ฝ่ายบริหาร',
    category: 'กรรมการ',
  },
  {
    id: 19,
    role: 'รองผู้อำนวยการสำนักหอสมุดกลางฝ่ายแผนยุทธศาสตร์และพัฒนาองค์กร',
    category: 'กรรมการ',
  },
  {
    id: 20,
    role: 'เลขานุการสำนักศิลปวัฒนธรรมและการสร้างสรรค์แห่งมหาวิทยาลัยศิลปากร',
    category: 'กรรมการ',
  },
];

export const SUB_COMMITTEES: SubCommittee[] = [
  {
    id: 1,
    number: 1,
    title: 'คณะอนุกรรมการด้านการปรับปรุงระเบียบข้อบังคับและการประเมินผลการปฏิบัติงานของบุคลากร',
    badgeLabel: 'ชุดที่ 1 : ระเบียบข้อบังคับและการประเมินผล',
    targetCapacity: 7,
    accentColor: {
      primary: '#005F56', // Silpakorn viridian
      border: 'border-emerald-700',
      bg: 'bg-emerald-50',
      text: 'text-emerald-950',
      badgeBg: 'bg-emerald-800',
      badgeText: 'text-white',
    },
  },
  {
    id: 2,
    number: 2,
    title: 'คณะอนุกรรมการด้านการพัฒนาทักษะ ขีดความสามารถ และสมรรถนะของบุคลากรตั้งแต่การบรรจุถึงการพัฒนาเส้นทางอาชีพ (Career Path)',
    badgeLabel: 'ชุดที่ 2 : พัฒนาทักษะและเส้นทางอาชีพ (Career Path)',
    targetCapacity: 7,
    accentColor: {
      primary: '#1E3A8A', // Deep Indigo/Navy
      border: 'border-blue-700',
      bg: 'bg-blue-50',
      text: 'text-blue-950',
      badgeBg: 'bg-blue-800',
      badgeText: 'text-white',
    },
  },
  {
    id: 3,
    number: 3,
    title: 'คณะอนุกรรมการด้านระบบสารสนเทศเพื่อพัฒนาระบบการทำงานทรัพยากรบุคคล',
    badgeLabel: 'ชุดที่ 3 : ระบบสารสนเทศ HR',
    targetCapacity: 6,
    accentColor: {
      primary: '#7C2D12', // Warm amber-bronze
      border: 'border-amber-700',
      bg: 'bg-amber-50',
      text: 'text-amber-950',
      badgeBg: 'bg-amber-800',
      badgeText: 'text-white',
    },
  },
];

export const APPS_SCRIPT_TEMPLATE = `/**
 * Google Apps Script สำหรับบันทึกข้อมูลแบบสำรวจเลือกคณะอนุกรรมการ
 * คณะกรรมการขับเคลื่อนการพัฒนาทรัพยากรบุคคล มหาวิทยาลัยศิลปากร
 *
 * วิธีติดตั้ง:
 * 1. เปิด Google Sheet ที่ต้องการเก็บข้อมูล
 * 2. ไปที่ Extensions (ส่วนขยาย) > Apps Script
 * 3. วางโค้ดนี้แทนที่โค้ดเดิมทั้งหมด แล้วกด Save
 * 4. คลิก Deploy (การทำให้ใช้งานได้) > New deployment (การทำให้ใช้งานได้รายการใหม่)
 * 5. เลือกประเภท: Web app (เว็บแอป)
 * 6. ตั้งค่า:
 *    - Execute as: Me (ฉัน)
 *    - Who has access: Anyone (ทุกคน)
 * 7. กด Deploy และคัดลอก Web App URL นำไปวางในระบบแบบสำรวจ
 */

function doGet(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    var action = e && e.parameter ? e.parameter.action : "";
    
    // Action: Get Admin Configuration from Google Sheet
    if (action === "getAdminConfig") {
      var adminSheet = getOrCreateAdminSheet();
      var adminData = adminSheet.getDataRange().getValues();
      if (adminData.length > 1 && adminData[1][0]) {
        return responseJSON({
          status: "success",
          adminConfig: {
            email: String(adminData[1][0]),
            password: String(adminData[1][1]),
            lastUpdated: String(adminData[1][2])
          }
        });
      }
      return responseJSON({ status: "not_configured" });
    }

    var sheet = getOrCreateSheet();
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return responseJSON({ status: "success", data: [] });
    }
    
    var submissions = [];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0]) continue;
      submissions.push({
        id: String(row[0]),
        memberId: Number(row[1]),
        memberRole: String(row[2]),
        memberName: String(row[3]),
        subCommitteeId: Number(row[4]),
        subCommitteeName: String(row[5]),
        submittedAt: String(row[6])
      });
    }
    
    return responseJSON({ status: "success", data: submissions });
  } catch (err) {
    return responseJSON({ status: "error", message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    var contents = e.postData ? e.postData.contents : null;
    if (!contents) {
      return responseJSON({ status: "error", message: "No data received" });
    }
    
    var payload = JSON.parse(contents);

    // Action 1: Save/Update Admin Password on Google Sheet
    if (payload.action === "saveAdminConfig") {
      var adminSheet = getOrCreateAdminSheet();
      var email = payload.adminEmail || payload.email || "";
      var password = payload.adminPassword || payload.password || "";
      var updatedAt = new Date().toLocaleString("th-TH");
      
      // Update Row 2 (headers are at Row 1)
      adminSheet.getRange(2, 1, 1, 3).setValues([[email, password, updatedAt]]);
      return responseJSON({
        status: "success",
        message: "บันทึกข้อมูลผู้ดูแลระบบลง Google Sheet เรียบร้อยแล้ว",
        adminEmail: email,
        updatedAt: updatedAt
      });
    }

    // Action 2: Delete Submission by Admin
    if (payload.action === "deleteSubmission") {
      var sheet = getOrCreateSheet();
      var data = sheet.getDataRange().getValues();
      var memberIdToDelete = Number(payload.memberId);
      for (var i = 1; i < data.length; i++) {
        if (Number(data[i][1]) === memberIdToDelete) {
          sheet.deleteRow(i + 1);
          return responseJSON({ status: "success", message: "Deleted row successfully" });
        }
      }
      return responseJSON({ status: "not_found", message: "Record not found" });
    }
    
    // Action 3: Add or Edit Submission
    var sheet = getOrCreateSheet();
    var data = sheet.getDataRange().getValues();
    
    var memberId = payload.memberId;
    var rowIndexToUpdate = -1;
    
    // Check if member already selected (prevent duplicate, update existing)
    for (var i = 1; i < data.length; i++) {
      if (Number(data[i][1]) === Number(memberId)) {
        rowIndexToUpdate = i + 1;
        break;
      }
    }
    
    var rowData = [
      payload.id || Utilities.getUuid(),
      payload.memberId,
      payload.memberRole,
      payload.memberName,
      payload.subCommitteeId,
      payload.subCommitteeName,
      payload.submittedAt || new Date().toLocaleString("th-TH")
    ];
    
    if (rowIndexToUpdate > 0) {
      sheet.getRange(rowIndexToUpdate, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }
    
    return responseJSON({ status: "success", message: "Saved successfully", row: rowData });
  } catch (err) {
    return responseJSON({ status: "error", message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function getOrCreateAdminSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = "การตั้งค่าผู้ดูแลระบบ";
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    var headers = [
      "อีเมลผู้ดูแลระบบ (Admin Email)",
      "รหัสผ่าน (Password)",
      "วันเวลาที่อัปเดตล่าสุด"
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#005F56").setFontColor("#FFFFFF");
    sheet.setFrozenRows(1);
  }
  
  return sheet;
}

function getOrCreateSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = "ผลการเลือกคณะอนุกรรมการ";
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    var headers = [
      "รหัสการเลือก (ID)",
      "ลำดับกรรมการ",
      "ตำแหน่งกรรมการ (ตามคำสั่ง)",
      "ชื่อ-นามสกุล ผู้เลือก",
      "รหัสคณะอนุกรรมการ",
      "คณะอนุกรรมการที่เลือก",
      "วันเวลาที่บันทึก"
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#E2E8F0");
    sheet.setFrozenRows(1);
  }
  
  return sheet;
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
