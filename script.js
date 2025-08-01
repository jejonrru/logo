// Configuration
const CONFIG = {
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbztfE4RJ2KlyO9aZhBQfQ1NNXo75jyKrgIuFdWSgacxAmN9-TxqCNCnZIcU_0jiIF4/exec',
    SHEET_ID: '1zIkLaOyceu7lXXXSxBZwymnPp_hLCB7spgikjU1AFto',
    SHEET_NAME: 'stok68'
};

// Global Variables
let currentUser = null;
let isLoggedIn = false;
let materialsData = [];
let departmentsData = [];
let categoriesData = [];
let usersData = [];
let requisitionsData = [];

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        // Show loading
        Swal.fire({
            title: 'กำลังโหลดระบบ...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // Initialize Google Sheets
        await initializeGoogleSheets();
        
        // Load initial data
        await loadAllData();
        
        // Setup event listeners
        setupEventListeners();
        
        // Show login modal
        showLogin();
        
        Swal.close();
    } catch (error) {
        console.error('Initialization error:', error);
        Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับระบบได้', 'error');
    }
}

// Google Sheets Integration
async function initializeGoogleSheets() {
    try {
        // Check if sheets exist, if not create them
        await createSheetsIfNotExist();
    } catch (error) {
        console.error('Google Sheets initialization error:', error);
        throw error;
    }
}

async function createSheetsIfNotExist() {
    const sheetsToCreate = [
        {
            name: 'stok68',
            headers: ['id', 'material_code', 'material_name', 'category', 'unit', 'stock_quantity', 'min_stock', 'created_date', 'updated_date']
        },
        {
            name: 'requisitions',
            headers: ['id', 'requisition_code', 'date', 'requester', 'department', 'purpose', 'status', 'materials', 'created_date', 'approved_date', 'approved_by']
        },
        {
            name: 'departments',
            headers: ['id', 'name', 'code', 'manager', 'created_date']
        },
        {
            name: 'categories',
            headers: ['id', 'name', 'description', 'created_date']
        },
        {
            name: 'users',
            headers: ['id', 'username', 'password', 'full_name', 'role', 'department', 'created_date', 'last_login']
        },
        {
            name: 'admin',
            headers: ['id', 'username', 'password', 'full_name', 'role', 'created_date', 'last_login']
        }
    ];

    for (const sheet of sheetsToCreate) {
        try {
            await createSheetWithHeaders(sheet.name, sheet.headers);
        } catch (error) {
            console.log(`Sheet ${sheet.name} might already exist:`, error);
        }
    }

    // Create default admin user if not exists
    await createDefaultAdmin();
}

async function createSheetWithHeaders(sheetName, headers) {
    const data = {
        action: 'createSheet',
        sheetName: sheetName,
        headers: headers
    };

    const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    });

    return await response.json();
}

async function createDefaultAdmin() {
    try {
        const adminData = {
            action: 'insert',
            sheetName: 'admin',
            data: {
                id: 'admin001',
                username: 'admin',
                password: 'admin123',
                full_name: 'ผู้ดูแลระบบ',
                role: 'admin',
                created_date: new Date().toISOString(),
                last_login: ''
            }
        };

        await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(adminData)
        });

        // Create default user
        const userData = {
            action: 'insert',
            sheetName: 'users',
            data: {
                id: 'user001',
                username: 'user',
                password: 'user123',
                full_name: 'ผู้ใช้งานทั่วไป',
                role: 'user',
                department: 'IT',
                created_date: new Date().toISOString(),
                last_login: ''
            }
        };

        await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });

        // Create default departments
        const defaultDepartments = [
            { id: 'dept001', name: 'แผนกเทคโนโลยีสารสนเทศ', code: 'IT', manager: 'ผู้จัดการ IT' },
            { id: 'dept002', name: 'แผนกบุคคล', code: 'HR', manager: 'ผู้จัดการ HR' },
            { id: 'dept003', name: 'แผนกการเงิน', code: 'FIN', manager: 'ผู้จัดการการเงิน' },
            { id: 'dept004', name: 'แผนกพัสดุ', code: 'SUP', manager: 'หัวหน้าพัสดุ' }
        ];

        for (const dept of defaultDepartments) {
            await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'insert',
                    sheetName: 'departments',
                    data: {
                        ...dept,
                        created_date: new Date().toISOString()
                    }
                })
            });
        }

        // Create default categories
        const defaultCategories = [
            { id: 'cat001', name: 'อุปกรณ์สำนักงาน', description: 'เครื่องเขียน อุปกรณ์สำนักงานทั่วไป' },
            { id: 'cat002', name: 'อุปกรณ์คอมพิวเตอร์', description: 'อุปกรณ์ IT และคอมพิวเตอร์' },
            { id: 'cat003', name: 'วัสดุก่อสร้าง', description: 'วัสดุและอุปกรณ์ก่อสร้าง' },
            { id: 'cat004', name: 'วัสดุทำความสะอาด', description: 'น้ำยาทำความสะอาดและอุปกรณ์' }
        ];

        for (const cat of defaultCategories) {
            await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'insert',
                    sheetName: 'categories',
                    data: {
                        ...cat,
                        created_date: new Date().toISOString()
                    }
                })
            });
        }

        // Create sample materials
        const sampleMaterials = [
            { id: 'mat001', material_code: 'PEN001', material_name: 'ปากกาลูกลื่น สีน้ำเงิน', category: 'อุปกรณ์สำนักงาน', unit: 'แท่ง', stock_quantity: 50, min_stock: 10 },
            { id: 'mat002', material_code: 'PAP001', material_name: 'กระดาษ A4 80 แกรม', category: 'อุปกรณ์สำนักงาน', unit: 'รีม', stock_quantity: 25, min_stock: 5 },
            { id: 'mat003', material_code: 'USB001', material_name: 'USB Flash Drive 32GB', category: 'อุปกรณ์คอมพิวเตอร์', unit: 'ชิ้น', stock_quantity: 15, min_stock: 3 },
            { id: 'mat004', material_code: 'CLE001', material_name: 'น้ำยาทำความสะอาดพื้น', category: 'วัสดุทำความสะอาด', unit: 'ขวด', stock_quantity: 8, min_stock: 2 }
        ];

        for (const material of sampleMaterials) {
            await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'insert',
                    sheetName: 'stok68',
                    data: {
                        ...material,
                        created_date: new Date().toISOString(),
                        updated_date: new Date().toISOString()
                    }
                })
            });
        }

    } catch (error) {
        console.log('Default data might already exist:', error);
    }
}

// Data Loading Functions
async function loadAllData() {
    try {
        await Promise.all([
            loadMaterials(),
            loadDepartments(),
            loadCategories(),
            loadUsers(),
            loadRequisitions()
        ]);
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

async function loadMaterials() {
    try {
        const response = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=select&sheetName=stok68`);
        const data = await response.json();
        materialsData = data.data || [];
    } catch (error) {
        console.error('Error loading materials:', error);
        materialsData = [];
    }
}

async function loadDepartments() {
    try {
        const response = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=select&sheetName=departments`);
        const data = await response.json();
        departmentsData = data.data || [];
        populateDepartmentSelects();
    } catch (error) {
        console.error('Error loading departments:', error);
        departmentsData = [];
    }
}

async function loadCategories() {
    try {
        const response = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=select&sheetName=categories`);
        const data = await response.json();
        categoriesData = data.data || [];
    } catch (error) {
        console.error('Error loading categories:', error);
        categoriesData = [];
    }
}

async function loadUsers() {
    try {
        const response = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=select&sheetName=users`);
        const data = await response.json();
        usersData = data.data || [];
    } catch (error) {
        console.error('Error loading users:', error);
        usersData = [];
    }
}

async function loadRequisitions() {
    try {
        const response = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=select&sheetName=requisitions`);
        const data = await response.json();
        requisitionsData = data.data || [];
        updateDashboardStats();
        loadRecentRequisitions();
    } catch (error) {
        console.error('Error loading requisitions:', error);
        requisitionsData = [];
    }
}

// Event Listeners Setup
function setupEventListeners() {
    // Login form
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    
    // Requisition form
    document.getElementById('requisition-form').addEventListener('submit', handleRequisitionSubmit);
    
    // Set default date
    document.getElementById('requisition-date').value = new Date().toISOString().split('T')[0];
    
    // Add initial material row
    addMaterialRow();
}

// Authentication Functions
function showLogin() {
    document.getElementById('login-modal').classList.add('show');
}

function hideLogin() {
    document.getElementById('login-modal').classList.remove('show');
}

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username-input').value;
    const password = document.getElementById('password-input').value;
    
    try {
        Swal.fire({
            title: 'กำลังเข้าสู่ระบบ...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // Check admin login
        const adminResponse = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=select&sheetName=admin`);
        const adminData = await adminResponse.json();
        
        const admin = adminData.data?.find(user => user.username === username && user.password === password);
        
        if (admin) {
            currentUser = { ...admin, role: 'admin' };
            isLoggedIn = true;
            document.querySelector('.admin-only').style.display = 'block';
        } else {
            // Check regular user login
            const userResponse = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=select&sheetName=users`);
            const userData = await userResponse.json();
            
            const user = userData.data?.find(user => user.username === username && user.password === password);
            
            if (user) {
                currentUser = user;
                isLoggedIn = true;
                document.querySelector('.admin-only').style.display = 'none';
            } else {
                throw new Error('Invalid credentials');
            }
        }

        // Update last login
        await updateLastLogin(currentUser);
        
        // Update UI
        document.getElementById('username').textContent = currentUser.full_name;
        hideLogin();
        
        Swal.fire({
            icon: 'success',
            title: 'เข้าสู่ระบบสำเร็จ',
            text: `ยินดีต้อนรับ ${currentUser.full_name}`,
            timer: 1500,
            showConfirmButton: false
        });

    } catch (error) {
        console.error('Login error:', error);
        Swal.fire({
            icon: 'error',
            title: 'เข้าสู่ระบบไม่สำเร็จ',
            text: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
        });
    }
}

async function updateLastLogin(user) {
    try {
        const sheetName = user.role === 'admin' ? 'admin' : 'users';
        await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'update',
                sheetName: sheetName,
                id: user.id,
                data: {
                    last_login: new Date().toISOString()
                }
            })
        });
    } catch (error) {
        console.error('Error updating last login:', error);
    }
}

function logout() {
    Swal.fire({
        title: 'ออกจากระบบ?',
        text: 'คุณต้องการออกจากระบบหรือไม่?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'ออกจากระบบ',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) {
            currentUser = null;
            isLoggedIn = false;
            document.querySelector('.admin-only').style.display = 'none';
            showLogin();
            showPage('dashboard');
        }
    });
}

// Navigation Functions
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    } else {
        // Create page if it doesn't exist
        createPage(pageId);
    }
    
    // Update page title
    updatePageTitle(pageId);
    
    // Update active menu item
    updateActiveMenuItem(pageId);
    
    // Load page specific data
    loadPageData(pageId);
}

function updatePageTitle(pageId) {
    const titles = {
        'dashboard': 'แดชบอร์ด',
        'create-requisition': 'สร้างรายการเบิก',
        'pending-requisitions': 'รายการรออนุมัติ',
        'requisition-history': 'ประวัติการเบิก',
        'all-materials': 'รายการวัสดุทั้งหมด',
        'add-material': 'เพิ่มวัสดุใหม่',
        'low-stock': 'วัสดุใกล้หมด',
        'requisition-report': 'รายงานการเบิกจ่าย',
        'inventory-report': 'รายงานคลังวัสดุ',
        'department-report': 'รายงานตามหน่วยงาน',
        'manage-users': 'จัดการผู้ใช้',
        'manage-departments': 'จัดการหน่วยงาน',
        'manage-categories': 'จัดการหมวดหมู่วัสดุ',
        'usage-history': 'ประวัติการใช้งาน'
    };
    
    document.getElementById('page-title').textContent = titles[pageId] || 'ระบบเบิกจ่ายวัสดุ';
}

function updateActiveMenuItem(pageId) {
    // Remove active class from all menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to current menu item
    const menuMap = {
        'dashboard': 'dashboard',
        'create-requisition': 'requisitions',
        'pending-requisitions': 'requisitions',
        'requisition-history': 'requisitions',
        'all-materials': 'inventory',
        'add-material': 'inventory',
        'low-stock': 'inventory',
        'requisition-report': 'reports',
        'inventory-report': 'reports',
        'department-report': 'reports',
        'manage-users': 'admin',
        'manage-departments': 'admin',
        'manage-categories': 'admin',
        'usage-history': 'admin'
    };
    
    const menuId = menuMap[pageId];
    if (menuId === 'dashboard') {
        document.querySelector('[onclick="showPage(\'dashboard\')"]').parentElement.classList.add('active');
    }
}

function toggleSubmenu(element) {
    const menuItem = element.parentElement;
    const submenu = menuItem.querySelector('.submenu');
    
    menuItem.classList.toggle('open');
    submenu.classList.toggle('open');
}

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('open');
}

// Dashboard Functions
function updateDashboardStats() {
    const totalRequisitions = requisitionsData.length;
    const pendingRequisitions = requisitionsData.filter(req => req.status === 'pending').length;
    const approvedRequisitions = requisitionsData.filter(req => req.status === 'approved').length;
    const lowStockItems = materialsData.filter(material => 
        parseInt(material.stock_quantity) <= parseInt(material.min_stock)
    ).length;
    
    document.getElementById('total-requisitions').textContent = totalRequisitions;
    document.getElementById('pending-requisitions').textContent = pendingRequisitions;
    document.getElementById('approved-requisitions').textContent = approvedRequisitions;
    document.getElementById('low-stock-items').textContent = lowStockItems;
}

function loadRecentRequisitions() {
    const recentRequisitions = requisitionsData
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
        .slice(0, 5);
    
    const tbody = document.querySelector('#recent-requisitions-table tbody');
    tbody.innerHTML = '';
    
    recentRequisitions.forEach(requisition => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${requisition.requisition_code}</td>
            <td>${formatDate(requisition.date)}</td>
            <td>${requisition.requester}</td>
            <td>${requisition.department}</td>
            <td><span class="status-badge status-${requisition.status}">${getStatusText(requisition.status)}</span></td>
            <td>
                <button class="btn-primary" onclick="viewRequisition('${requisition.id}')">
                    <i class="fas fa-eye"></i> ดู
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Requisition Functions
function addMaterialRow() {
    const tbody = document.querySelector('#materials-table tbody');
    const row = document.createElement('tr');
    
    row.innerHTML = `
        <td>
            <select class="material-select" onchange="updateMaterialInfo(this)" required>
                <option value="">เลือกวัสดุ</option>
                ${materialsData.map(material => 
                    `<option value="${material.id}" data-code="${material.material_code}" data-name="${material.material_name}" data-unit="${material.unit}">
                        ${material.material_code} - ${material.material_name}
                    </option>`
                ).join('')}
            </select>
        </td>
        <td class="material-name">-</td>
        <td class="material-unit">-</td>
        <td><input type="number" class="quantity-input" min="1" required></td>
        <td><input type="text" class="note-input" placeholder="หมายเหตุ"></td>
        <td>
            <button type="button" class="btn-danger" onclick="removeMaterialRow(this)">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    tbody.appendChild(row);
}

function updateMaterialInfo(select) {
    const row = select.closest('tr');
    const selectedOption = select.options[select.selectedIndex];
    
    if (selectedOption.value) {
        row.querySelector('.material-name').textContent = selectedOption.dataset.name;
        row.querySelector('.material-unit').textContent = selectedOption.dataset.unit;
    } else {
        row.querySelector('.material-name').textContent = '-';
        row.querySelector('.material-unit').textContent = '-';
    }
}

function removeMaterialRow(button) {
    const row = button.closest('tr');
    row.remove();
}

function resetForm() {
    document.getElementById('requisition-form').reset();
    document.getElementById('requisition-date').value = new Date().toISOString().split('T')[0];
    document.querySelector('#materials-table tbody').innerHTML = '';
    addMaterialRow();
}

async function handleRequisitionSubmit(e) {
    e.preventDefault();
    
    try {
        Swal.fire({
            title: 'กำลังบันทึกรายการเบิก...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const formData = new FormData(e.target);
        const materials = [];
        
        // Collect materials data
        const materialRows = document.querySelectorAll('#materials-table tbody tr');
        materialRows.forEach(row => {
            const materialSelect = row.querySelector('.material-select');
            const quantityInput = row.querySelector('.quantity-input');
            const noteInput = row.querySelector('.note-input');
            
            if (materialSelect.value && quantityInput.value) {
                const selectedOption = materialSelect.options[materialSelect.selectedIndex];
                materials.push({
                    material_id: materialSelect.value,
                    material_code: selectedOption.dataset.code,
                    material_name: selectedOption.dataset.name,
                    unit: selectedOption.dataset.unit,
                    quantity: parseInt(quantityInput.value),
                    note: noteInput.value || ''
                });
            }
        });

        if (materials.length === 0) {
            throw new Error('กรุณาเลือกวัสดุอย่างน้อย 1 รายการ');
        }

        // Generate requisition code
        const requisitionCode = generateRequisitionCode();
        
        const requisitionData = {
            action: 'insert',
            sheetName: 'requisitions',
            data: {
                id: `req_${Date.now()}`,
                requisition_code: requisitionCode,
                date: document.getElementById('requisition-date').value,
                requester: currentUser.full_name,
                department: document.getElementById('department').value,
                purpose: document.getElementById('purpose').value,
                status: 'pending',
                materials: JSON.stringify(materials),
                created_date: new Date().toISOString(),
                approved_date: '',
                approved_by: ''
            }
        };

        const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requisitionData)
        });

        const result = await response.json();
        
        if (result.success) {
            await loadRequisitions();
            resetForm();
            
            Swal.fire({
                icon: 'success',
                title: 'บันทึกสำเร็จ',
                text: `รายการเบิกเลขที่ ${requisitionCode} ถูกบันทึกแล้ว`,
                timer: 2000,
                showConfirmButton: false
            });
        } else {
            throw new Error(result.message || 'เกิดข้อผิดพลาดในการบันทึก');
        }

    } catch (error) {
        console.error('Requisition submit error:', error);
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: error.message || 'ไม่สามารถบันทึกรายการเบิกได้'
        });
    }
}

function generateRequisitionCode() {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const time = now.getTime().toString().slice(-4);
    
    return `REQ${year}${month}${day}${time}`;
}

// Utility Functions
function populateDepartmentSelects() {
    const selects = document.querySelectorAll('#department');
    selects.forEach(select => {
        select.innerHTML = '<option value="">เลือกหน่วยงาน</option>';
        departmentsData.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.name;
            option.textContent = dept.name;
            select.appendChild(option);
        });
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH');
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'รออนุมัติ',
        'approved': 'อนุมัติแล้ว',
        'rejected': 'ไม่อนุมัติ',
        'completed': 'เสร็จสิ้น'
    };
    return statusMap[status] || status;
}

function createPage(pageId) {
    const content = document.querySelector('.content');
    const page = document.createElement('div');
    page.id = pageId;
    page.className = 'page active';
    
    // Page content based on pageId
    const pageContent = getPageContent(pageId);
    page.innerHTML = pageContent;
    
    content.appendChild(page);
}

function getPageContent(pageId) {
    const pageTemplates = {
        'requisition-history': `
            <div class="page-header">
                <h2><i class="fas fa-history"></i> ประวัติการเบิก</h2>
            </div>
            <div class="table-container">
                <table id="history-table">
                    <thead>
                        <tr>
                            <th>รหัสเบิก</th>
                            <th>วันที่</th>
                            <th>ผู้เบิก</th>
                            <th>หน่วยงาน</th>
                            <th>สถานะ</th>
                            <th>การดำเนินการ</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        `,
        'all-materials': `
            <div class="page-header">
                <h2><i class="fas fa-list"></i> รายการวัสดุทั้งหมด</h2>
            </div>
            <div class="table-container">
                <table id="materials-table">
                    <thead>
                        <tr>
                            <th>รหัสวัสดุ</th>
                            <th>ชื่อวัสดุ</th>
                            <th>หมวดหมู่</th>
                            <th>หน่วย</th>
                            <th>จำนวนคงเหลือ</th>
                            <th>จำนวนขั้นต่ำ</th>
                            <th>สถานะ</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        `,
        'low-stock': `
            <div class="page-header">
                <h2><i class="fas fa-exclamation-triangle"></i> วัสดุใกล้หมด</h2>
            </div>
            <div class="table-container">
                <table id="low-stock-table">
                    <thead>
                        <tr>
                            <th>รหัสวัสดุ</th>
                            <th>ชื่อวัสดุ</th>
                            <th>จำนวนคงเหลือ</th>
                            <th>จำนวนขั้นต่ำ</th>
                            <th>สถานะ</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        `
    };
    
    return pageTemplates[pageId] || `
        <div class="page-header">
            <h2><i class="fas fa-cog"></i> ${pageId}</h2>
        </div>
        <div class="form-container">
            <p>หน้านี้อยู่ระหว่างการพัฒนา</p>
        </div>
    `;
}

function loadPageData(pageId) {
    switch(pageId) {
        case 'requisition-history':
            loadRequisitionHistory();
            break;
        case 'all-materials':
            loadAllMaterials();
            break;
        case 'low-stock':
            loadLowStockMaterials();
            break;
        case 'pending-requisitions':
            loadPendingRequisitions();
            break;
    }
}

function loadRequisitionHistory() {
    const tbody = document.querySelector('#history-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    requisitionsData.forEach(requisition => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${requisition.requisition_code}</td>
            <td>${formatDate(requisition.date)}</td>
            <td>${requisition.requester}</td>
            <td>${requisition.department}</td>
            <td><span class="status-badge status-${requisition.status}">${getStatusText(requisition.status)}</span></td>
            <td>
                <button class="btn-primary" onclick="viewRequisition('${requisition.id}')">
                    <i class="fas fa-eye"></i> ดู
                </button>
                ${requisition.status === 'approved' ? 
                    `<button class="btn-secondary" onclick="generatePDF('${requisition.id}')">
                        <i class="fas fa-file-pdf"></i> PDF
                    </button>` : ''
                }
            </td>
        `;
        tbody.appendChild(row);
    });
}

function loadAllMaterials() {
    const tbody = document.querySelector('#materials-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    materialsData.forEach(material => {
        const isLowStock = parseInt(material.stock_quantity) <= parseInt(material.min_stock);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${material.material_code}</td>
            <td>${material.material_name}</td>
            <td>${material.category}</td>
            <td>${material.unit}</td>
            <td>${material.stock_quantity}</td>
            <td>${material.min_stock}</td>
            <td>
                <span class="status-badge ${isLowStock ? 'status-low-stock' : 'status-approved'}">
                    ${isLowStock ? 'ใกล้หมด' : 'ปกติ'}
                </span>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function loadLowStockMaterials() {
    const tbody = document.querySelector('#low-stock-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const lowStockMaterials = materialsData.filter(material => 
        parseInt(material.stock_quantity) <= parseInt(material.min_stock)
    );
    
    lowStockMaterials.forEach(material => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${material.material_code}</td>
            <td>${material.material_name}</td>
            <td>${material.stock_quantity}</td>
            <td>${material.min_stock}</td>
            <td><span class="status-badge status-low-stock">ใกล้หมด</span></td>
        `;
        tbody.appendChild(row);
    });
}

function loadPendingRequisitions() {
    const tbody = document.querySelector('#pending-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const pendingRequisitions = requisitionsData.filter(req => req.status === 'pending');
    
    pendingRequisitions.forEach(requisition => {
        const materials = JSON.parse(requisition.materials || '[]');
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${requisition.requisition_code}</td>
            <td>${formatDate(requisition.date)}</td>
            <td>${requisition.requester}</td>
            <td>${requisition.department}</td>
            <td>${materials.length} รายการ</td>
            <td>
                <button class="btn-primary" onclick="viewRequisition('${requisition.id}')">
                    <i class="fas fa-eye"></i> ดู
                </button>
                ${currentUser && currentUser.role === 'admin' ? 
                    `<button class="btn-success" onclick="approveRequisition('${requisition.id}')">
                        <i class="fas fa-check"></i> อนุมัติ
                    </button>
                    <button class="btn-danger" onclick="rejectRequisition('${requisition.id}')">
                        <i class="fas fa-times"></i> ไม่อนุมัติ
                    </button>` : ''
                }
            </td>
        `;
        tbody.appendChild(row);
    });
}

function viewRequisition(id) {
    const requisition = requisitionsData.find(req => req.id === id);
    if (!requisition) return;
    
    const materials = JSON.parse(requisition.materials || '[]');
    const materialsHtml = materials.map(material => 
        `<tr>
            <td>${material.material_code}</td>
            <td>${material.material_name}</td>
            <td>${material.unit}</td>
            <td>${material.quantity}</td>
            <td>${material.note || '-'}</td>
        </tr>`
    ).join('');
    
    Swal.fire({
        title: `รายการเบิกเลขที่ ${requisition.requisition_code}`,
        html: `
            <div style="text-align: left;">
                <p><strong>วันที่:</strong> ${formatDate(requisition.date)}</p>
                <p><strong>ผู้เบิก:</strong> ${requisition.requester}</p>
                <p><strong>หน่วยงาน:</strong> ${requisition.department}</p>
                <p><strong>วัตถุประสงค์:</strong> ${requisition.purpose}</p>
                <p><strong>สถานะ:</strong> <span class="status-badge status-${requisition.status}">${getStatusText(requisition.status)}</span></p>
                
                <h4>รายการวัสดุ:</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8f9fa;">
                            <th style="border: 1px solid #ddd; padding: 8px;">รหัส</th>
                            <th style="border: 1px solid #ddd; padding: 8px;">ชื่อวัสดุ</th>
                            <th style="border: 1px solid #ddd; padding: 8px;">หน่วย</th>
                            <th style="border: 1px solid #ddd; padding: 8px;">จำนวน</th>
                            <th style="border: 1px solid #ddd; padding: 8px;">หมายเหตุ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${materialsHtml}
                    </tbody>
                </table>
            </div>
        `,
        width: '80%',
        confirmButtonText: 'ปิด'
    });
}

async function approveRequisition(id) {
    const result = await Swal.fire({
        title: 'อนุมัติรายการเบิก?',
        text: 'คุณต้องการอนุมัติรายการเบิกนี้หรือไม่?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'อนุมัติ',
        cancelButtonText: 'ยกเลิก'
    });
    
    if (result.isConfirmed) {
        try {
            Swal.fire({
                title: 'กำลังอนุมัติ...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'update',
                    sheetName: 'requisitions',
                    id: id,
                    data: {
                        status: 'approved',
                        approved_date: new Date().toISOString(),
                        approved_by: currentUser.full_name
                    }
                })
            });

            await loadRequisitions();
            loadPageData('pending-requisitions');
            
            Swal.fire({
                icon: 'success',
                title: 'อนุมัติสำเร็จ',
                text: 'รายการเบิกได้รับการอนุมัติแล้ว',
                timer: 1500,
                showConfirmButton: false
            });

        } catch (error) {
            console.error('Approve error:', error);
            Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถอนุมัติรายการเบิกได้', 'error');
        }
    }
}

async function rejectRequisition(id) {
    const { value: reason } = await Swal.fire({
        title: 'ไม่อนุมัติรายการเบิก',
        input: 'textarea',
        inputLabel: 'เหตุผลที่ไม่อนุมัติ',
        inputPlaceholder: 'ระบุเหตุผล...',
        showCancelButton: true,
        confirmButtonText: 'ไม่อนุมัติ',
        cancelButtonText: 'ยกเลิก',
        inputValidator: (value) => {
            if (!value) {
                return 'กรุณาระบุเหตุผล'
            }
        }
    });
    
    if (reason) {
        try {
            Swal.fire({
                title: 'กำลังบันทึก...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'update',
                    sheetName: 'requisitions',
                    id: id,
                    data: {
                        status: 'rejected',
                        approved_date: new Date().toISOString(),
                        approved_by: currentUser.full_name,
                        reject_reason: reason
                    }
                })
            });

            await loadRequisitions();
            loadPageData('pending-requisitions');
            
            Swal.fire({
                icon: 'success',
                title: 'บันทึกสำเร็จ',
                text: 'รายการเบิกถูกปฏิเสธแล้ว',
                timer: 1500,
                showConfirmButton: false
            });

        } catch (error) {
            console.error('Reject error:', error);
            Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถปฏิเสธรายการเบิกได้', 'error');
        }
    }
}

function generatePDF(requisitionId) {
    const requisition = requisitionsData.find(req => req.id === requisitionId);
    if (!requisition) return;
    
    const materials = JSON.parse(requisition.materials || '[]');
    
    // Create PDF using jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add Thai font support (simplified)
    doc.setFont('helvetica');
    
    // Header
    doc.setFontSize(20);
    doc.text('Material Requisition Form', 105, 20, { align: 'center' });
    
    doc.setFontSize(16);
    doc.text(`Requisition No: ${requisition.requisition_code}`, 20, 40);
    
    // Details
    doc.setFontSize(12);
    doc.text(`Date: ${formatDate(requisition.date)}`, 20, 55);
    doc.text(`Requester: ${requisition.requester}`, 20, 65);
    doc.text(`Department: ${requisition.department}`, 20, 75);
    doc.text(`Purpose: ${requisition.purpose}`, 20, 85);
    doc.text(`Status: ${getStatusText(requisition.status)}`, 20, 95);
    
    if (requisition.approved_by) {
        doc.text(`Approved by: ${requisition.approved_by}`, 20, 105);
        doc.text(`Approved date: ${formatDate(requisition.approved_date)}`, 20, 115);
    }
    
    // Materials table
    let y = 130;
    doc.text('Materials:', 20, y);
    y += 10;
    
    // Table headers
    doc.text('Code', 20, y);
    doc.text('Name', 60, y);
    doc.text('Unit', 120, y);
    doc.text('Qty', 150, y);
    doc.text('Note', 170, y);
    y += 10;
    
    // Table content
    materials.forEach(material => {
        doc.text(material.material_code, 20, y);
        doc.text(material.material_name.substring(0, 20), 60, y);
        doc.text(material.unit, 120, y);
        doc.text(material.quantity.toString(), 150, y);
        doc.text(material.note || '-', 170, y);
        y += 10;
    });
    
    // Save PDF
    doc.save(`requisition_${requisition.requisition_code}.pdf`);
}

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}