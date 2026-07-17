// Google Apps Script untuk menghubungkan admin panel dengan Google Sheets
// DEPLOY SEBAGAI WEB APP - Set "Anyone" access saat deployment
// UPDATE: Fixed addData GET support, sheet names, field mappings

// Konfigurasi Spreadsheet IDs
const SPREADSHEET_IDS = {
  berita: '15JWk-ItlTGXX3xCNtO4cc8hBLdYVJkCMo0eTcac9QO4',
  bebaslab: '1Ke7WpL9qsUlez63hyctzIJuQwpCBRbf0uQr3NROtm9g',
  peminjaman: '1Kd6te5CvI4rdn05G1taE9uaUApYxJtJdqmQeqnrut1A'
};

// Sheet names - SEMUA menggunakan "Form Responses 1" (dari Google Forms)
const SHEET_NAMES = {
  berita: 'Sheet1',
  bebaslab: 'Form Responses 1',
  peminjaman: 'Form Responses 1'
};

// Header row index (1-based)
const HEADER_ROW = 1;

function doGet(e) {
  const action = e.parameter.action;
  const module = e.parameter.module;
  
  let result;
  
  try {
    switch(action) {
      case 'getData':
        result = getSheetData(module);
        break;
      case 'getStats':
        result = getSheetStats(module);
        break;
      case 'updateData':
        result = updateRowData(module, {
          rowId: parseInt(e.parameter.rowId),
          columnIndex: parseInt(e.parameter.columnIndex),
          newValue: e.parameter.newValue
        });
        break;
      case 'deleteData':
        result = deleteRowData(module, { rowId: parseInt(e.parameter.rowId) });
        break;
      case 'addData':
        // GET-based addData (from utils.js URLSearchParams)
        const rowData = {...e.parameter};
        delete rowData.action;
        delete rowData.module;
        result = handleAddData(module, rowData);
        break;
      default:
        result = { error: 'Action not recognized' };
    }
  } catch(error) {
    result = { error: error.toString() };
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const action = e.parameter.action;
  const module = e.parameter.module;
  
  let result;
  
  try {
    const postData = JSON.parse(e.postData.contents);
    
    switch(action) {
      case 'addData':
        result = handleAddData(module, postData);
        break;
      case 'updateData':
        result = updateRowData(module, postData);
        break;
      case 'deleteData':
        result = deleteRowData(module, postData);
        break;
      default:
        result = { success: false, error: 'Action not recognized' };
    }
  } catch(error) {
    result = { success: false, error: error.toString() };
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==================== DATA READ ====================

function getSheetData(module) {
  const spreadsheetId = SPREADSHEET_IDS[module];
  const sheetName = SHEET_NAMES[module];
  
  if (!spreadsheetId || !sheetName) {
    return { error: 'Module not found' };
  }
  
  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      return { error: 'Sheet not found: ' + sheetName };
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];
    
    const headers = data[HEADER_ROW - 1];
    const rows = data.slice(HEADER_ROW);
    
    const result = rows.map((row, index) => {
      const item = { rowId: index + HEADER_ROW + 1 }; // 1-based sheet row
      headers.forEach((header, i) => {
        if (header) item[header.toString()] = row[i];
      });
      return item;
    }).filter(item => {
      // Filter empty rows - check if any non-rowId field has value
      return Object.keys(item).some(k => k !== 'rowId' && item[k] !== '' && item[k] != null);
    });
    
    return result;
    
  } catch(error) {
    return { error: error.toString() };
  }
}

function getSheetStats(module) {
  const data = getSheetData(module);
  if (data.error) return { error: data.error };
  
  const stats = { total: data.length };
  
  if (module === 'berita') {
    stats.published = data.filter(r => r.status === 'Published' || r.status === 'published').length;
    stats.draft = data.filter(r => r.status === 'Draft' || r.status === 'draft').length;
    stats.archived = data.filter(r => r.status === 'Archived' || r.status === 'archived').length;
  } else if (module === 'bebaslab') {
    stats.onprogress = data.filter(r => r.progress === 'On Progress' || r.progress === 'on progress').length;
    stats.reject = data.filter(r => r.progress === 'Reject' || r.progress === 'reject').length;
    stats.selesai = data.filter(r => r.progress === 'Selesai' || r.progress === 'selesai').length;
  } else if (module === 'peminjaman') {
    stats.menunggu = data.filter(r => r.statusKegiatan === 'Menunggu').length;
    stats.diterima = data.filter(r => r.statusKegiatan === 'Diterima').length;
    stats.ditolak = data.filter(r => r.statusKegiatan === 'Ditolak').length;
    stats.selesai = data.filter(r => r.statusKegiatan === 'Selesai').length;
  }
  
  return stats;
}

// ==================== DATA WRITE ====================

function handleAddData(module, rowData) {
  const spreadsheetId = SPREADSHEET_IDS[module];
  const sheetName = SHEET_NAMES[module];
  
  if (!spreadsheetId || !sheetName) {
    return { success: false, error: 'Module not found' };
  }
  
  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      return { success: false, error: 'Sheet not found: ' + sheetName };
    }
    
    const headers = sheet.getRange(HEADER_ROW, 1, 1, sheet.getLastColumn()).getValues()[0];
    const newRow = headers.map(h => rowData[h.toString()] || '');
    
    // Auto-generate ID Berita if column exists and is empty
    const idCol = headers.findIndex(h => h && h.toString() === 'ID Berita');
    if (idCol >= 0 && !newRow[idCol]) {
      const lastRow = sheet.getLastRow();
      const lastId = lastRow > HEADER_ROW 
        ? sheet.getRange(lastRow, idCol + 1).getValue() 
        : 0;
      newRow[idCol] = (typeof lastId === 'number' ? lastId : parseInt(lastId) || 0) + 1;
    }
    
    sheet.appendRow(newRow);
    
    return { success: true, rowId: sheet.getLastRow() };
    
  } catch(error) {
    return { success: false, error: error.toString() };
  }
}

function updateRowData(module, postData) {
  const spreadsheetId = SPREADSHEET_IDS[module];
  const sheetName = SHEET_NAMES[module];
  
  if (!spreadsheetId || !sheetName) {
    return { success: false, error: 'Module not found' };
  }
  
  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      return { success: false, error: 'Sheet not found' };
    }
    
    const { rowId, columnIndex, newValue } = postData;
    
    // Validate rowId and columnIndex
    if (!rowId || rowId < HEADER_ROW + 1 || rowId > sheet.getLastRow()) {
      return { success: false, error: 'Invalid rowId' };
    }
    if (!columnIndex || columnIndex < 1 || columnIndex > sheet.getLastColumn()) {
      return { success: false, error: 'Invalid columnIndex' };
    }
    
    sheet.getRange(rowId, columnIndex).setValue(newValue);
    
    return { success: true };
    
  } catch(error) {
    return { success: false, error: error.toString() };
  }
}

function deleteRowData(module, postData) {
  const spreadsheetId = SPREADSHEET_IDS[module];
  const sheetName = SHEET_NAMES[module];
  
  if (!spreadsheetId || !sheetName) {
    return { success: false, error: 'Module not found' };
  }
  
  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      return { success: false, error: 'Sheet not found' };
    }
    
    const { rowId } = postData;
    
    if (!rowId || rowId < HEADER_ROW + 1 || rowId > sheet.getLastRow()) {
      return { success: false, error: 'Invalid rowId' };
    }
    
    sheet.deleteRow(rowId);
    
    return { success: true };
    
  } catch(error) {
    return { success: false, error: error.toString() };
  }
}

// ==================== DEPLOYMENT INSTRUCTIONS ====================
/*
1. Buka https://script.google.com
2. Klik "New Project"
3. Hapus kode default, paste seluruh file ini
4. Klik "Deploy" > "New deployment"
5. Klik gear icon > "Web app"
6. Configure:
   - Description: "Lab IF Admin API v2"
   - Execute as: "Me"
   - Who has access: "Anyone"
7. Klik "Deploy"
8. Copy URL Web App → paste ke admin/js/utils.js (this.appsScriptURL)
9. Test di browser: https://informaticslabumbandung.github.io/admin/berita.html

COLUMN INDICES (1-based, untuk updateData):
- berita: 1=id, 2=judulBerita, 3=linkGambar, 4=isiBerita, 5=status, 6=tanggal, 7=dilihat, 8=timestamp
- bebaslab: 1=timestamp, 2=emailAddress, 3=nomorIndukMahasiswa, 4=namaLengkap, 5=programStudi, 
            6=progress, 7=tanggalPengisian, 8=nomorWhatsapp, 9=bAPSidang, 10=cetakBebasLab
- peminjaman: 1=timestamp, 2=emailAddress, 3=namaKegiatan, 4=namaPIC, 5=nomorWhatsAppPIC,
              6=tanggalKegiatan, 7=suratPeminjaman, 8=waktuMulaiKegiatan, 9=waktuSelesaiKegiatan,
              10=keterangan, 11=statusKegiatan
*/