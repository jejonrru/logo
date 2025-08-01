/**
 * Google Apps Script for Material Requisition System
 * This script handles all Google Sheets operations for the material requisition system
 * 
 * Deploy this code in Google Apps Script and use the web app URL in your frontend
 * Make sure to set execution as "Anyone" and access as "Anyone, even anonymous"
 */

// Configuration
const SHEET_ID = '1zIkLaOyceu7lXXXSxBZwymnPp_hLCB7spgikjU1AFto';

/**
 * Main function to handle all requests
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    const sheetName = e.parameter.sheetName;
    const id = e.parameter.id;
    
    switch (action) {
      case 'select':
        return handleSelect(sheetName, id);
      case 'test':
        return ContentService.createTextOutput(
          JSON.stringify({ success: true, message: 'Google Apps Script is working!' })
        ).setMimeType(ContentService.MimeType.JSON);
      default:
        return ContentService.createTextOutput(
          JSON.stringify({ success: false, message: 'Invalid action for GET request' })
        ).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    Logger.log('doGet Error: ' + error.toString());
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, message: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle POST requests
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    switch (action) {
      case 'insert':
        return handleInsert(data.sheetName, data.data);
      case 'update':
        return handleUpdate(data.sheetName, data.id, data.data);
      case 'delete':
        return handleDelete(data.sheetName, data.id);
      case 'createSheet':
        return handleCreateSheet(data.sheetName, data.headers);
      default:
        return ContentService.createTextOutput(
          JSON.stringify({ success: false, message: 'Invalid action' })
        ).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    Logger.log('doPost Error: ' + error.toString());
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, message: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle SELECT operations
 */
function handleSelect(sheetName, id = null) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    let sheet;
    
    try {
      sheet = spreadsheet.getSheetByName(sheetName);
    } catch (error) {
      // Sheet doesn't exist, return empty data
      return ContentService.createTextOutput(
        JSON.stringify({ success: true, data: [] })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (!sheet) {
      return ContentService.createTextOutput(
        JSON.stringify({ success: true, data: [] })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      // Only headers or empty sheet
      return ContentService.createTextOutput(
        JSON.stringify({ success: true, data: [] })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    const result = rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });
    
    // Filter by ID if provided
    if (id) {
      const filtered = result.filter(item => item.id === id);
      return ContentService.createTextOutput(
        JSON.stringify({ success: true, data: filtered })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(
      JSON.stringify({ success: true, data: result })
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('handleSelect Error: ' + error.toString());
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, message: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle INSERT operations
 */
function handleInsert(sheetName, data) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    let sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      // Create sheet if it doesn't exist
      sheet = spreadsheet.insertSheet(sheetName);
      
      // Add headers based on data keys
      const headers = Object.keys(data);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    
    // Get headers
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Check if record with same ID already exists
    if (data.id) {
      const existingData = sheet.getDataRange().getValues();
      const idColumnIndex = headers.indexOf('id');
      
      if (idColumnIndex >= 0) {
        for (let i = 1; i < existingData.length; i++) {
          if (existingData[i][idColumnIndex] === data.id) {
            // Record exists, don't insert duplicate
            return ContentService.createTextOutput(
              JSON.stringify({ success: true, message: 'Record already exists' })
            ).setMimeType(ContentService.MimeType.JSON);
          }
        }
      }
    }
    
    // Prepare row data
    const rowData = headers.map(header => data[header] || '');
    
    // Add new row
    sheet.appendRow(rowData);
    
    return ContentService.createTextOutput(
      JSON.stringify({ success: true, message: 'Data inserted successfully' })
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('handleInsert Error: ' + error.toString());
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, message: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle UPDATE operations
 */
function handleUpdate(sheetName, id, data) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, message: 'Sheet not found' })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    const idColumnIndex = headers.indexOf('id');
    
    if (idColumnIndex === -1) {
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, message: 'ID column not found' })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Find row with matching ID
    let rowIndex = -1;
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][idColumnIndex] === id) {
        rowIndex = i + 1; // +1 because sheet rows are 1-indexed
        break;
      }
    }
    
    if (rowIndex === -1) {
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, message: 'Record not found' })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Update specific columns
    Object.keys(data).forEach(key => {
      const columnIndex = headers.indexOf(key);
      if (columnIndex >= 0) {
        sheet.getRange(rowIndex, columnIndex + 1).setValue(data[key]);
      }
    });
    
    return ContentService.createTextOutput(
      JSON.stringify({ success: true, message: 'Data updated successfully' })
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('handleUpdate Error: ' + error.toString());
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, message: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle DELETE operations
 */
function handleDelete(sheetName, id) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, message: 'Sheet not found' })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    const idColumnIndex = headers.indexOf('id');
    
    if (idColumnIndex === -1) {
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, message: 'ID column not found' })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Find row with matching ID
    let rowIndex = -1;
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][idColumnIndex] === id) {
        rowIndex = i + 1; // +1 because sheet rows are 1-indexed
        break;
      }
    }
    
    if (rowIndex === -1) {
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, message: 'Record not found' })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Delete the row
    sheet.deleteRow(rowIndex);
    
    return ContentService.createTextOutput(
      JSON.stringify({ success: true, message: 'Data deleted successfully' })
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('handleDelete Error: ' + error.toString());
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, message: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle sheet creation
 */
function handleCreateSheet(sheetName, headers) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    
    // Check if sheet already exists
    let sheet;
    try {
      sheet = spreadsheet.getSheetByName(sheetName);
      if (sheet) {
        return ContentService.createTextOutput(
          JSON.stringify({ success: true, message: 'Sheet already exists' })
        ).setMimeType(ContentService.MimeType.JSON);
      }
    } catch (error) {
      // Sheet doesn't exist, continue to create
    }
    
    // Create new sheet
    sheet = spreadsheet.insertSheet(sheetName);
    
    // Add headers
    if (headers && headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Format headers
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4a7c59');
      headerRange.setFontColor('#ffffff');
    }
    
    return ContentService.createTextOutput(
      JSON.stringify({ success: true, message: 'Sheet created successfully' })
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('handleCreateSheet Error: ' + error.toString());
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, message: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Utility function to get all sheet names
 */
function getAllSheetNames() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    const sheets = spreadsheet.getSheets();
    const sheetNames = sheets.map(sheet => sheet.getName());
    
    return ContentService.createTextOutput(
      JSON.stringify({ success: true, data: sheetNames })
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('getAllSheetNames Error: ' + error.toString());
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, message: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Initialize default data for the system
 */
function initializeDefaultData() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    
    // Create admin sheet
    createSheetWithData('admin', [
      ['id', 'username', 'password', 'full_name', 'role', 'created_date', 'last_login'],
      ['admin001', 'admin', 'admin123', 'ผู้ดูแลระบบ', 'admin', new Date().toISOString(), '']
    ]);
    
    // Create users sheet
    createSheetWithData('users', [
      ['id', 'username', 'password', 'full_name', 'role', 'department', 'created_date', 'last_login'],
      ['user001', 'user', 'user123', 'ผู้ใช้งานทั่วไป', 'user', 'IT', new Date().toISOString(), '']
    ]);
    
    // Create departments sheet
    createSheetWithData('departments', [
      ['id', 'name', 'code', 'manager', 'created_date'],
      ['dept001', 'แผนกเทคโนโลยีสารสนเทศ', 'IT', 'ผู้จัดการ IT', new Date().toISOString()],
      ['dept002', 'แผนกบุคคล', 'HR', 'ผู้จัดการ HR', new Date().toISOString()],
      ['dept003', 'แผนกการเงิน', 'FIN', 'ผู้จัดการการเงิน', new Date().toISOString()],
      ['dept004', 'แผนกพัสดุ', 'SUP', 'หัวหน้าพัสดุ', new Date().toISOString()]
    ]);
    
    // Create categories sheet
    createSheetWithData('categories', [
      ['id', 'name', 'description', 'created_date'],
      ['cat001', 'อุปกรณ์สำนักงาน', 'เครื่องเขียน อุปกรณ์สำนักงานทั่วไป', new Date().toISOString()],
      ['cat002', 'อุปกรณ์คอมพิวเตอร์', 'อุปกรณ์ IT และคอมพิวเตอร์', new Date().toISOString()],
      ['cat003', 'วัสดุก่อสร้าง', 'วัสดุและอุปกรณ์ก่อสร้าง', new Date().toISOString()],
      ['cat004', 'วัสดุทำความสะอาด', 'น้ำยาทำความสะอาดและอุปกรณ์', new Date().toISOString()]
    ]);
    
    // Create materials sheet (stok68)
    createSheetWithData('stok68', [
      ['id', 'material_code', 'material_name', 'category', 'unit', 'stock_quantity', 'min_stock', 'created_date', 'updated_date'],
      ['mat001', 'PEN001', 'ปากกาลูกลื่น สีน้ำเงิน', 'อุปกรณ์สำนักงาน', 'แท่ง', 50, 10, new Date().toISOString(), new Date().toISOString()],
      ['mat002', 'PAP001', 'กระดาษ A4 80 แกรม', 'อุปกรณ์สำนักงาน', 'รีม', 25, 5, new Date().toISOString(), new Date().toISOString()],
      ['mat003', 'USB001', 'USB Flash Drive 32GB', 'อุปกรณ์คอมพิวเตอร์', 'ชิ้น', 15, 3, new Date().toISOString(), new Date().toISOString()],
      ['mat004', 'CLE001', 'น้ำยาทำความสะอาดพื้น', 'วัสดุทำความสะอาด', 'ขวด', 8, 2, new Date().toISOString(), new Date().toISOString()]
    ]);
    
    // Create requisitions sheet
    createSheetWithData('requisitions', [
      ['id', 'requisition_code', 'date', 'requester', 'department', 'purpose', 'status', 'materials', 'created_date', 'approved_date', 'approved_by']
    ]);
    
    Logger.log('Default data initialized successfully');
    
  } catch (error) {
    Logger.log('initializeDefaultData Error: ' + error.toString());
  }
}

/**
 * Helper function to create sheet with data
 */
function createSheetWithData(sheetName, data) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    
    // Check if sheet exists
    let sheet;
    try {
      sheet = spreadsheet.getSheetByName(sheetName);
    } catch (error) {
      sheet = null;
    }
    
    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName);
    }
    
    // Clear existing data
    sheet.clear();
    
    // Add data
    if (data.length > 0) {
      sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
      
      // Format headers
      const headerRange = sheet.getRange(1, 1, 1, data[0].length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4a7c59');
      headerRange.setFontColor('#ffffff');
    }
    
    Logger.log(`Sheet ${sheetName} created/updated successfully`);
    
  } catch (error) {
    Logger.log(`createSheetWithData Error for ${sheetName}: ` + error.toString());
  }
}

/**
 * Test function to verify the script is working
 */
function testScript() {
  Logger.log('Google Apps Script is working correctly!');
  return 'Script is working';
}