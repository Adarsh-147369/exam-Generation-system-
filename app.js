// Complete 5-Stream Engineering Exam System Application
// Production-ready with comprehensive features and proper SBERT integration

// Global variables
let currentUser = null;
let currentExam = {
    subjectId: null,
    stream: null,
    subjectName: '',
    questions: [],
    currentQuestionIndex: 0,
    answers: {},
    timer: null,
    timeRemaining: 1800, // 30 minutes
    startTime: null
};

let QUESTION_BANK = null;

// 5-Stream Configuration
const ENGINEERING_STREAMS = {
    CSE: { name: 'Computer Science Engineering', icon: '💻', color: '#3B82F6' },
    EEE: { name: 'Electrical & Electronics Engineering', icon: '⚡', color: '#F59E0B' },
    ECE: { name: 'Electronics & Communication', icon: '📡', color: '#10B981' },
    CIVIL: { name: 'Civil Engineering', icon: '🏗️', color: '#8B5CF6' },
    Mechanical: { name: 'Mechanical Engineering', icon: '⚙️', color: '#EF4444' }
};

// Storage Keys
const STORAGE_KEYS = {
    USERS: 'examSystem_users',
    CURRENT_USER: 'examSystem_currentUser',
    EXAM_RESULTS: 'examSystem_examResults',
    REMEMBER_ME: 'examSystem_rememberMe',
    SYSTEM_CONFIG: 'examSystem_config'
};

// Default Users
const DEFAULT_USERS = [
    { 
        id: 1, 
        name: "Administrator", 
        email: "adarshreddy532@gmail.com", 
        password: "admin123", 
        type: "admin",
        createdAt: new Date().toISOString()
    },
    { 
        id: 2, 
        name: "Adarsh Reddy", 
        email: "rddadarsh@gmail.com", 
        password: "123456", 
        type: "student",
        createdAt: new Date().toISOString()
    },
    { 
        id: 3, 
        name: "Venkat Reddy", 
        email: "reddavenkata979@gmail.com", 
        password: "123456", 
        type: "student",
        createdAt: new Date().toISOString()
    }
];

// Utility Functions
function generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${secs}`;
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Storage Functions
function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Error saving to storage:', error);
        return false;
    }
}

function loadFromStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error('Error loading from storage:', error);
        return defaultValue;
    }
}

function initializeStorage() {
    // Initialize users
    let users = loadFromStorage(STORAGE_KEYS.USERS);
    if (!users) {
        saveToStorage(STORAGE_KEYS.USERS, DEFAULT_USERS);
    }

    // Initialize exam results
    const results = loadFromStorage(STORAGE_KEYS.EXAM_RESULTS);
    if (!results) {
        saveToStorage(STORAGE_KEYS.EXAM_RESULTS, []);
    }

    // Initialize system configuration
    const config = loadFromStorage(STORAGE_KEYS.SYSTEM_CONFIG);
    if (!config) {
        saveToStorage(STORAGE_KEYS.SYSTEM_CONFIG, {
            sbertEnabled: true,
            autoEvaluation: true,
            examDuration: 1800,
            questionsPerExam: 10,
            mcqCount: 8,
            descriptiveCount: 2
        });
    }
}

// User Management Functions
function saveCurrentUser(user, remember = false) {
    currentUser = user;
    if (remember) {
        saveToStorage(STORAGE_KEYS.CURRENT_USER, user);
        saveToStorage(STORAGE_KEYS.REMEMBER_ME, true);
    } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
    }
}

function loadCurrentUser() {
    const remembered = loadFromStorage(STORAGE_KEYS.REMEMBER_ME);
    if (remembered) {
        const user = loadFromStorage(STORAGE_KEYS.CURRENT_USER);
        if (user) {
            currentUser = user;
            return true;
        }
    }
    return false;
}

function saveExamResult(result) {
    const results = loadFromStorage(STORAGE_KEYS.EXAM_RESULTS, []);
    result.id = generateId();
    result.submittedAt = new Date().toISOString();
    results.push(result);
    saveToStorage(STORAGE_KEYS.EXAM_RESULTS, results);
    return result.id;
}

// DOM Elements
const screens = {
    home: document.getElementById('homeScreen'),
    login: document.getElementById('loginScreen'),
    register: document.getElementById('registerScreen'),
    adminDashboard: document.getElementById('adminDashboard'),
    studentDashboard: document.getElementById('studentDashboard'),
    exam: document.getElementById('examScreen'),
    results: document.getElementById('resultsScreen')
};

const buttons = {
    home: document.getElementById('homeBtn'),
    login: document.getElementById('loginBtn'),
    logout: document.getElementById('logoutBtn'),
    adminLogin: document.getElementById('adminLoginBtn'),
    studentLogin: document.getElementById('studentLoginBtn')
};

// Screen Management
function showScreen(screen) {
    Object.values(screens).forEach(s => s?.classList.add('hidden'));
    screen?.classList.remove('hidden');
}

// Modal Functions
function showModal(modal) {
    modal?.classList.remove('hidden');
}

function hideModal(modal) {
    modal?.classList.add('hidden');
}

// System Status Updates
function updateSystemStatus() {
    const streamsStatus = document.getElementById('streamsStatus');
    const sbertStatus = document.getElementById('sbertStatus');

    if (streamsStatus) {
        if (QUESTION_BANK) {
            const loadedStreams = Object.keys(QUESTION_BANK).length;
            streamsStatus.className = 'status-item status-ready';
            streamsStatus.innerHTML = `
                <span class="status-icon">✅</span>
                <span class="status-text">5-Stream Question Banks Loaded (${loadedStreams}/5 streams)</span>
            `;
        } else {
            streamsStatus.className = 'status-item status-loading';
            streamsStatus.innerHTML = `
                <span class="status-icon">⏳</span>
                <span class="status-text">Loading question banks...</span>
            `;
        }
    }

    if (sbertStatus) {
        const evaluatorStatus = sbertEvaluator?.getStatus();
        if (evaluatorStatus?.isLoaded) {
            sbertStatus.className = 'status-item status-ready';
            sbertStatus.innerHTML = `
                <span class="status-icon">✅</span>
                <span class="status-text">SBERT AI Evaluation Ready</span>
            `;
        } else if (evaluatorStatus?.isInitializing) {
            sbertStatus.className = 'status-item status-loading';
            sbertStatus.innerHTML = `
                <span class="status-icon">⏳</span>
                <span class="status-text">Initializing AI Evaluation...</span>
            `;
        } else {
            sbertStatus.className = 'status-item status-manual';
            sbertStatus.innerHTML = `
                <span class="status-icon">📝</span>
                <span class="status-text">Enhanced Manual Evaluation Ready</span>
            `;
        }
    }
}

// 5-Stream Question Bank Loading
async function loadAllStreams() {
    try {
        showModal(document.getElementById('loadingModal'));

        const streamFiles = ['CSE.json', 'EEE.json', 'ECE.json', 'CIVIL.json', 'MECH.json'];
        const loadPromises = streamFiles.map(loadStreamFile);

        const results = await Promise.allSettled(loadPromises);

        // Combine successful loads
        QUESTION_BANK = {};
        let loadedStreams = 0;
        let totalQuestions = 0;

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                Object.assign(QUESTION_BANK, result.value);
                loadedStreams++;

                // Count questions
                Object.values(result.value).forEach(stream => {
                    Object.values(stream).forEach(subjects => {
                        totalQuestions += subjects.length;
                    });
                });
            } else {
                console.error(`Failed to load ${streamFiles[index]}:`, result.reason);
            }
        });

        hideModal(document.getElementById('loadingModal'));
        updateSystemStatus();

        if (loadedStreams === 0) {
            showAlert('❌ No question banks loaded', 'Please ensure all 5 JSON files (CSE.json, EEE.json, ECE.json, CIVIL.json, MECH.json) are present in the same directory as the application files.');
            return false;
        }

        console.log(`✅ Loaded ${loadedStreams}/5 streams with ${totalQuestions} total questions`);
        return true;

    } catch (error) {
        hideModal(document.getElementById('loadingModal'));
        console.error('Error loading question banks:', error);
        showAlert('❌ Loading Error', 'Failed to load question banks. Please check console for details.');
        return false;
    }
}

async function loadStreamFile(filename) {
    const response = await fetch(filename);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${response.statusText}`);
    }
    const data = await response.json();

    // Validate data structure
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid JSON structure');
    }

    return data;
}

// Authentication Functions
function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const remember = document.getElementById('rememberMe').checked;

    if (!email || !password) {
        showAlert('❌ Invalid Input', 'Please enter both email and password.');
        return;
    }

    const users = loadFromStorage(STORAGE_KEYS.USERS, DEFAULT_USERS);
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        saveCurrentUser(user, remember);

        if (user.type === 'admin') {
            showAdminDashboard();
        } else {
            showStudentDashboard();
        }

        // Update UI
        buttons.login?.classList.add('hidden');
        buttons.logout?.classList.remove('hidden');
        document.getElementById('loginForm').reset();

        showAlert('✅ Login Successful', `Welcome ${user.name}!`);
    } else {
        showAlert('❌ Login Failed', 'Invalid email or password. Please try again.');
    }
}

function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value.trim();

    if (!name || !email || !password) {
        showAlert('❌ Invalid Input', 'Please fill in all fields.');
        return;
    }

    const users = loadFromStorage(STORAGE_KEYS.USERS, DEFAULT_USERS);

    if (users.find(u => u.email === email)) {
        showAlert('❌ Registration Failed', 'User with this email already exists.');
        return;
    }

    const newUser = {
        id: generateId(),
        name,
        email,
        password,
        type: 'student',
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveToStorage(STORAGE_KEYS.USERS, users);

    showAlert('✅ Registration Successful', 'Account created successfully! Please login.');
    showScreen(screens.login);
    document.getElementById('registerForm').reset();
}

function logout() {
    currentUser = null;

    // Clear exam data
    currentExam = {
        subjectId: null,
        stream: null,
        subjectName: '',
        questions: [],
        currentQuestionIndex: 0,
        answers: {},
        timer: null,
        timeRemaining: 1800,
        startTime: null
    };

    // Clear storage
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);

    // Update UI
    buttons.login?.classList.remove('hidden');
    buttons.logout?.classList.add('hidden');

    // Stop any running timer
    if (currentExam.timer) {
        clearInterval(currentExam.timer);
        currentExam.timer = null;
    }

    showScreen(screens.home);
    showAlert('👋 Logged Out', 'You have been successfully logged out.');
}

// Alert/Notification System
function showAlert(title, message, type = 'info') {
    const modal = document.getElementById('customModal');
    if (!modal) return;

    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalActions = document.getElementById('modalActions');

    if (modalTitle) modalTitle.textContent = title;
    if (modalBody) modalBody.innerHTML = `<p>${message}</p>`;
    if (modalActions) {
        modalActions.innerHTML = `
            <button class="btn btn--primary" onclick="hideModal(document.getElementById('customModal'))">
                OK
            </button>
        `;
    }

    showModal(modal);

    // Auto-hide after 5 seconds for success messages
    if (type === 'success') {
        setTimeout(() => hideModal(modal), 5000);
    }
}

// Admin Dashboard Functions
function showAdminDashboard() {
    if (!currentUser || currentUser.type !== 'admin') return;

    document.getElementById('adminWelcome').textContent = `Welcome, ${currentUser.name}`;
    loadAdminStats();
    showAdminTab('adminStatsTab');
    showScreen(screens.adminDashboard);
}

function showAdminTab(tabName) {
    const tabs = ['adminStatsTab', 'adminResultsTab', 'adminUsersTab', 'adminSettingsTab'];
    const buttons = ['adminStatsTabBtn', 'adminResultsTabBtn', 'adminUsersTabBtn', 'adminSettingsTabBtn'];

    // Hide all tabs
    tabs.forEach(tab => {
        document.getElementById(tab)?.classList.add('hidden');
    });

    // Reset all buttons
    buttons.forEach(btn => {
        const button = document.getElementById(btn);
        if (button) {
            button.classList.remove('btn--primary');
            button.classList.add('btn--secondary');
        }
    });

    // Show selected tab
    document.getElementById(tabName)?.classList.remove('hidden');

    // Highlight selected button
    const activeBtn = document.getElementById(tabName.replace('Tab', 'TabBtn'));
    if (activeBtn) {
        activeBtn.classList.remove('btn--secondary');
        activeBtn.classList.add('btn--primary');
    }

    // Load tab content
    switch (tabName) {
        case 'adminStatsTab':
            loadAdminStats();
            break;
        case 'adminResultsTab':
            loadAdminResults();
            break;
        case 'adminUsersTab':
            loadAdminUsers();
            break;
        case 'adminSettingsTab':
            loadAdminSettings();
            break;
    }
}

function loadAdminStats() {
    const users = loadFromStorage(STORAGE_KEYS.USERS, []);
    const results = loadFromStorage(STORAGE_KEYS.EXAM_RESULTS, []);
    const students = users.filter(u => u.type === 'student');

    // Update basic stats
    document.getElementById('totalStudentsCount').textContent = students.length;
    document.getElementById('totalExamsCount').textContent = results.length;

    // Count AI evaluations
    const aiEvaluations = results.filter(r => {
        if (r.descriptiveEvaluations) {
            return Object.values(r.descriptiveEvaluations).some(e => e.autoEvaluated);
        }
        return false;
    }).length;
    document.getElementById('aiEvaluationsCount').textContent = aiEvaluations;

    // Update stream-specific counts
    if (QUESTION_BANK) {
        Object.entries(ENGINEERING_STREAMS).forEach(([streamKey, streamConfig]) => {
            const countElement = document.getElementById(`${streamKey.toLowerCase()}SubjectsCount`);
            if (countElement && QUESTION_BANK[streamKey]) {
                const subjectCount = Object.keys(QUESTION_BANK[streamKey]).length;
                countElement.textContent = subjectCount;
            }
        });
    }
}

function loadAdminResults() {
    const container = document.getElementById('allResultsList');
    if (!container) return;

    const results = loadFromStorage(STORAGE_KEYS.EXAM_RESULTS, []);
    const users = loadFromStorage(STORAGE_KEYS.USERS, []);

    if (results.length === 0) {
        container.innerHTML = `
            <div class="card">
                <div class="card__body text-center">
                    <h3>📝 No Results Yet</h3>
                    <p>No students have completed any exams yet.</p>
                </div>
            </div>
        `;
        return;
    }

    // Sort by date (newest first)
    results.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    let html = `
        <div class="results-summary">
            <h3>📊 Results Overview</h3>
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Total Exams:</span>
                    <span class="stat-value">${results.length}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Average Score:</span>
                    <span class="stat-value">${results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / results.length) : 0}%</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">AI Evaluated:</span>
                    <span class="stat-value">${results.filter(r => r.descriptiveEvaluations && Object.values(r.descriptiveEvaluations).some(e => e.autoEvaluated)).length}</span>
                </div>
            </div>
        </div>

        <div class="results-filters">
            <select id="streamFilter" class="form-control">
                <option value="">All Streams</option>
                ${Object.entries(ENGINEERING_STREAMS).map(([key, config]) => 
                    `<option value="${key}">${config.icon} ${config.name}</option>`
                ).join('')}
            </select>
            <button class="btn btn--outline" onclick="exportResults()">📥 Export CSV</button>
        </div>

        <div class="results-table-container">
            <table class="results-table">
                <thead>
                    <tr>
                        <th>Student</th>
                        <th>Stream</th>
                        <th>Subject</th>
                        <th>Score</th>
                        <th>Grade</th>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    results.forEach(result => {
        const user = users.find(u => u.id === result.userId);
        const streamConfig = ENGINEERING_STREAMS[result.stream];

        html += `
            <tr data-stream="${result.stream}">
                <td>${user ? user.name : 'Unknown User'}</td>
                <td><span class="stream-badge" style="background: ${streamConfig?.color}">${streamConfig?.icon} ${result.stream}</span></td>
                <td>${result.subjectName}</td>
                <td>${result.totalScore}/${result.totalPossible} (${result.percentage}%)</td>
                <td><span class="grade-badge grade-${result.grade.toLowerCase().replace('+', 'plus')}">${result.grade}</span></td>
                <td>${formatDateTime(result.submittedAt)}</td>
                <td>${getEvaluationType(result)}</td>
                <td>
                    <button class="btn btn--outline btn--sm" onclick="viewDetailedResult('${result.id}')">👁️</button>
                    <button class="btn btn--outline btn--sm" onclick="deleteResult('${result.id}')">🗑️</button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;

    // Add filter functionality
    document.getElementById('streamFilter')?.addEventListener('change', filterResults);
}

function getEvaluationType(result) {
    if (result.descriptiveEvaluations) {
        const evaluations = Object.values(result.descriptiveEvaluations);
        const hasAI = evaluations.some(e => e.autoEvaluated);
        const hasManual = evaluations.some(e => !e.autoEvaluated);

        if (hasAI && hasManual) return 'Mixed';
        if (hasAI) return 'AI';
        return 'Manual';
    }
    return 'Manual';
}

function filterResults() {
    const filter = document.getElementById('streamFilter')?.value;
    const rows = document.querySelectorAll('.results-table tbody tr');

    rows.forEach(row => {
        const stream = row.dataset.stream;
        if (!filter || stream === filter) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function exportResults() {
    const results = loadFromStorage(STORAGE_KEYS.EXAM_RESULTS, []);
    const users = loadFromStorage(STORAGE_KEYS.USERS, []);

    if (results.length === 0) {
        showAlert('❌ No Data', 'No results available to export.');
        return;
    }

    // Create CSV content
    const headers = ['Student Name', 'Email', 'Stream', 'Subject', 'Score', 'Percentage', 'Grade', 'Date', 'Evaluation Type'];
    const rows = [headers.join(',')];

    results.forEach(result => {
        const user = users.find(u => u.id === result.userId);
        const row = [
            user ? user.name : 'Unknown',
            user ? user.email : 'Unknown',
            result.stream,
            result.subjectName,
            `${result.totalScore}/${result.totalPossible}`,
            result.percentage,
            result.grade,
            result.submittedAt,
            getEvaluationType(result)
        ];
        rows.push(row.join(','));
    });

    // Download CSV
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exam_results_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showAlert('✅ Export Successful', 'Results exported to CSV file.');
}

function loadAdminUsers() {
    const container = document.getElementById('usersManagementContainer');
    if (!container) return;

    const users = loadFromStorage(STORAGE_KEYS.USERS, []);
    const results = loadFromStorage(STORAGE_KEYS.EXAM_RESULTS, []);

    let html = `
        <div class="users-summary">
            <h3>👥 Users Overview</h3>
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Total Users:</span>
                    <span class="stat-value">${users.length}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Students:</span>
                    <span class="stat-value">${users.filter(u => u.type === 'student').length}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Admins:</span>
                    <span class="stat-value">${users.filter(u => u.type === 'admin').length}</span>
                </div>
            </div>
        </div>

        <div class="users-list">
    `;

    users.forEach(user => {
        const userResults = results.filter(r => r.userId === user.id);
        const averageScore = userResults.length > 0 
            ? Math.round(userResults.reduce((sum, r) => sum + r.percentage, 0) / userResults.length)
            : 0;

        html += `
            <div class="user-card card">
                <div class="card__body">
                    <div class="user-header">
                        <h4>${user.name}</h4>
                        <span class="user-type ${user.type}">${user.type.toUpperCase()}</span>
                    </div>
                    <div class="user-details">
                        <p><strong>Email:</strong> ${user.email}</p>
                        <p><strong>Joined:</strong> ${formatDateTime(user.createdAt || new Date().toISOString())}</p>
                        <p><strong>Exams Taken:</strong> ${userResults.length}</p>
                        ${userResults.length > 0 ? `<p><strong>Average Score:</strong> ${averageScore}%</p>` : ''}
                    </div>
                    ${user.id !== currentUser.id ? `
                        <div class="user-actions">
                            <button class="btn btn--outline btn--sm" onclick="deleteUser('${user.id}')">🗑️ Delete User</button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

function loadAdminSettings() {
    const container = document.getElementById('systemSettingsContainer');
    if (!container) return;

    const config = loadFromStorage(STORAGE_KEYS.SYSTEM_CONFIG, {});
    const evaluatorStatus = sbertEvaluator?.getStatus() || {};

    container.innerHTML = `
        <div class="settings-section">
            <h3>🤖 AI Evaluation Settings</h3>
            <div class="settings-grid">
                <div class="setting-item">
                    <label>SBERT Status:</label>
                    <span class="status-indicator ${evaluatorStatus.isLoaded ? 'ready' : 'manual'}">
                        ${evaluatorStatus.isLoaded ? '✅ AI Ready' : '📝 Manual Mode'}
                    </span>
                </div>
                <div class="setting-item">
                    <label>Evaluation Mode:</label>
                    <span>${evaluatorStatus.evaluationMode || 'Manual'}</span>
                </div>
                <div class="setting-item">
                    <label>Model Type:</label>
                    <span>${evaluatorStatus.modelType || 'Enhanced Manual'}</span>
                </div>
            </div>
        </div>

        <div class="settings-section">
            <h3>⚙️ System Configuration</h3>
            <div class="settings-form">
                <div class="form-group">
                    <label>Exam Duration (seconds):</label>
                    <input type="number" id="examDuration" value="${config.examDuration || 1800}" class="form-control">
                </div>
                <div class="form-group">
                    <label>Questions per Exam:</label>
                    <input type="number" id="questionsPerExam" value="${config.questionsPerExam || 10}" class="form-control">
                </div>
                <div class="form-group">
                    <label>MCQ Questions:</label>
                    <input type="number" id="mcqCount" value="${config.mcqCount || 8}" class="form-control">
                </div>
                <div class="form-group">
                    <label>Descriptive Questions:</label>
                    <input type="number" id="descriptiveCount" value="${config.descriptiveCount || 2}" class="form-control">
                </div>
                <button class="btn btn--primary" onclick="saveSystemSettings()">💾 Save Settings</button>
            </div>
        </div>

        <div class="settings-section">
            <h3>🔄 System Actions</h3>
            <div class="action-buttons">
                <button class="btn btn--outline" onclick="reinitializeSBERT()">🔄 Restart AI System</button>
                <button class="btn btn--warning" onclick="clearAllData()">🗑️ Clear All Data</button>
                <button class="btn btn--secondary" onclick="downloadSystemBackup()">📥 Download Backup</button>
            </div>
        </div>
    `;
}

function saveSystemSettings() {
    const config = {
        examDuration: parseInt(document.getElementById('examDuration').value) || 1800,
        questionsPerExam: parseInt(document.getElementById('questionsPerExam').value) || 10,
        mcqCount: parseInt(document.getElementById('mcqCount').value) || 8,
        descriptiveCount: parseInt(document.getElementById('descriptiveCount').value) || 2
    };

    saveToStorage(STORAGE_KEYS.SYSTEM_CONFIG, config);
    showAlert('✅ Settings Saved', 'System configuration updated successfully.');
}

function reinitializeSBERT() {
    if (sbertEvaluator) {
        showAlert('🔄 Reinitializing...', 'Restarting AI evaluation system...');
        sbertEvaluator.dispose();
        setTimeout(() => {
            sbertEvaluator.initialize().then(success => {
                if (success) {
                    showAlert('✅ AI Ready', 'SBERT AI evaluation system reinitialized successfully.');
                } else {
                    showAlert('📝 Manual Mode', 'AI unavailable, using enhanced manual evaluation.');
                }
                updateSystemStatus();
            });
        }, 1000);
    }
}

// Student Dashboard Functions
function showStudentDashboard() {
    if (!currentUser || currentUser.type !== 'student') return;

    document.getElementById('studentWelcome').textContent = `Welcome, ${currentUser.name}`;
    showStudentTab('examTab');
    showScreen(screens.studentDashboard);
}

function showStudentTab(tabName) {
    const tabs = ['examTab', 'myResultsTab'];
    const buttons = ['examTabBtn', 'myResultsTabBtn'];

    // Hide all tabs
    tabs.forEach(tab => {
        document.getElementById(tab)?.classList.add('hidden');
    });

    // Reset all buttons
    buttons.forEach(btn => {
        const button = document.getElementById(btn);
        if (button) {
            button.classList.remove('btn--primary');
            button.classList.add('btn--secondary');
        }
    });

    // Show selected tab
    document.getElementById(tabName)?.classList.remove('hidden');

    // Highlight selected button
    const activeBtn = document.getElementById(tabName.replace('Tab', 'TabBtn'));
    if (activeBtn) {
        activeBtn.classList.remove('btn--secondary');
        activeBtn.classList.add('btn--primary');
    }

    // Load tab content
    if (tabName === 'myResultsTab') {
        loadStudentResults();
    }
}

function loadStudentResults() {
    const container = document.getElementById('studentResultsContainer');
    if (!container) return;

    const allResults = loadFromStorage(STORAGE_KEYS.EXAM_RESULTS, []);
    const userResults = allResults.filter(r => r.userId === currentUser.id);

    if (userResults.length === 0) {
        container.innerHTML = `
            <div class="card">
                <div class="card__body text-center">
                    <h3>📝 No Results Yet</h3>
                    <p>You haven't taken any exams yet. Start with any of the 5 engineering streams!</p>
                    <button class="btn btn--primary" onclick="showStudentTab('examTab')">🚀 Take Your First Exam</button>
                </div>
            </div>
        `;
        return;
    }

    // Sort by date (newest first)
    userResults.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    const totalExams = userResults.length;
    const averageScore = Math.round(userResults.reduce((sum, r) => sum + r.percentage, 0) / totalExams);
    const bestScore = Math.max(...userResults.map(r => r.percentage));

    let html = `
        <div class="results-summary">
            <h3>📊 Your Performance</h3>
            <div class="stats-grid">
                <div class="stat-card card">
                    <div class="card__body text-center">
                        <h4>📝 Total Exams</h4>
                        <div class="stat-number">${totalExams}</div>
                    </div>
                </div>
                <div class="stat-card card">
                    <div class="card__body text-center">
                        <h4>📈 Average Score</h4>
                        <div class="stat-number">${averageScore}%</div>
                    </div>
                </div>
                <div class="stat-card card">
                    <div class="card__body text-center">
                        <h4>🏆 Best Score</h4>
                        <div class="stat-number">${bestScore}%</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="results-list">
            <h3>📋 Recent Results</h3>
    `;

    userResults.forEach(result => {
        const streamConfig = ENGINEERING_STREAMS[result.stream];

        html += `
            <div class="result-card card">
                <div class="card__body">
                    <div class="result-header">
                        <div class="result-title">
                            <span style="color: ${streamConfig?.color}; font-size: 1.5em;">${streamConfig?.icon}</span>
                            <div>
                                <h4>${result.subjectName}</h4>
                                <p class="result-stream">${streamConfig?.name}</p>
                            </div>
                        </div>
                        <div class="result-score">
                            <div class="score-main">${result.totalScore}/${result.totalPossible}</div>
                            <div class="score-percentage">${result.percentage}%</div>
                            <div class="grade-badge grade-${result.grade.toLowerCase().replace('+', 'plus')}">${result.grade}</div>
                        </div>
                    </div>

                    <div class="result-details">
                        <div class="detail-grid">
                            <div class="detail-item">
                                <span class="detail-label">📅 Date:</span>
                                <span class="detail-value">${formatDateTime(result.submittedAt)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">⏱️ Time:</span>
                                <span class="detail-value">${formatTime(result.timeSpent || 0)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">✅ MCQ:</span>
                                <span class="detail-value">${result.mcqScore}/${result.mcqTotal}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">📝 Descriptive:</span>
                                <span class="detail-value">${result.descriptiveScore}/${result.descriptiveTotal}</span>
                            </div>
                        </div>
                    </div>

                    <div class="result-actions">
                        <button class="btn btn--outline" onclick="viewDetailedResult('${result.id}')">📋 View Details</button>
                        <button class="btn btn--secondary" onclick="retakeExam('${result.stream}', '${result.subjectName}')">🔄 Retake</button>
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

// Stream and Subject Management
function setupStreamCards() {
    const streamCards = document.querySelectorAll('.stream-card');
    streamCards.forEach(card => {
        card.addEventListener('click', function() {
            const streamName = this.dataset.stream;
            showStreamSubjects(streamName);
        });
    });
}

function showStreamSubjects(streamName) {
    if (!QUESTION_BANK || !QUESTION_BANK[streamName]) {
        showAlert('❌ Stream Not Available', `${streamName} question bank is not loaded. Please refresh the page.`);
        return;
    }

    const streamConfig = ENGINEERING_STREAMS[streamName];
    document.getElementById('selectedStreamTitle').innerHTML = 
        `${streamConfig.icon} ${streamConfig.name} Subjects`;

    const container = document.getElementById('availableSubjects');
    container.innerHTML = '';

    const subjects = QUESTION_BANK[streamName];
    Object.entries(subjects).forEach(([subjectName, questions]) => {
        if (questions && Array.isArray(questions) && questions.length >= 10) {
            const mcqCount = questions.filter(q => q.type === 'MCQ').length;
            const descriptiveCount = questions.filter(q => q.type === 'Descriptive').length;

            if (mcqCount >= 8 && descriptiveCount >= 2) {
                const card = document.createElement('div');
                card.className = 'subject-card card hover-lift';
                card.style.cursor = 'pointer';
                card.innerHTML = `
                    <div class="card__body">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                            <span style="font-size: 1.5em; color: ${streamConfig.color}">${streamConfig.icon}</span>
                            <h4>${subjectName}</h4>
                        </div>
                        <p><strong>Stream:</strong> ${streamConfig.name}</p>
                        <p><strong>Questions Available:</strong> ${questions.length}</p>
                        <p><strong>Exam Format:</strong> ${mcqCount} MCQ + ${descriptiveCount} Descriptive</p>
                        <div class="stream-badge" style="background: ${streamConfig.color}">
                            AI Evaluation Ready
                        </div>
                        <button class="btn btn--primary btn--full-width" style="margin-top: 16px;">
                            🚀 Start Assessment
                        </button>
                    </div>
                `;

                card.addEventListener('click', () => startExam(streamName, subjectName));
                container.appendChild(card);
            }
        }
    });

    if (container.children.length === 0) {
        container.innerHTML = `
            <div class="card">
                <div class="card__body text-center">
                    <h3>⚠️ No Subjects Available</h3>
                    <p>This stream doesn't have enough questions for examination.</p>
                    <p>Required: At least 8 MCQ and 2 Descriptive questions per subject.</p>
                </div>
            </div>
        `;
    }

    // Show subjects container and hide stream selection
    document.querySelector('.streams-selection')?.classList.add('hidden');
    document.getElementById('streamSubjects')?.classList.remove('hidden');
}

// Exam Functions
function startExam(stream, subjectName) {
    if (!QUESTION_BANK || !QUESTION_BANK[stream] || !QUESTION_BANK[stream][subjectName]) {
        showAlert('❌ Subject Not Available', 'Selected subject is not available.');
        return;
    }

    const questions = QUESTION_BANK[stream][subjectName];
    const mcqQuestions = questions.filter(q => q.type === 'MCQ');
    const descriptiveQuestions = questions.filter(q => q.type === 'Descriptive');

    const config = loadFromStorage(STORAGE_KEYS.SYSTEM_CONFIG, {});
    const mcqCount = config.mcqCount || 8;
    const descriptiveCount = config.descriptiveCount || 2;

    if (mcqQuestions.length < mcqCount || descriptiveQuestions.length < descriptiveCount) {
        showAlert('❌ Insufficient Questions', `This subject needs at least ${mcqCount} MCQ and ${descriptiveCount} descriptive questions.`);
        return;
    }

    // Select and shuffle questions
    const selectedMCQs = shuffleArray(mcqQuestions).slice(0, mcqCount);
    const selectedDescriptive = shuffleArray(descriptiveQuestions).slice(0, descriptiveCount);
    const examQuestions = shuffleArray([...selectedMCQs, ...selectedDescriptive]);

    // Initialize exam
    currentExam = {
        subjectId: generateId(),
        stream: stream,
        subjectName: subjectName,
        questions: examQuestions,
        currentQuestionIndex: 0,
        answers: {},
        timer: null,
        timeRemaining: config.examDuration || 1800,
        startTime: new Date()
    };

    // Update exam UI
    const streamConfig = ENGINEERING_STREAMS[stream];
    document.getElementById('examSubjectName').textContent = 
        `${subjectName} (${streamConfig.name})`;
    document.getElementById('totalQuestions').textContent = examQuestions.length;

    const examStreamBadge = document.getElementById('examStreamBadge');
    if (examStreamBadge) {
        examStreamBadge.textContent = `${streamConfig.icon} ${stream}`;
        examStreamBadge.style.backgroundColor = streamConfig.color;
    }

    // Enter fullscreen and start exam
    enterFullscreen();
    showScreen(screens.exam);
    startExamTimer();
    loadQuestion(0);

    showAlert('🚀 Exam Started', `Good luck with your ${subjectName} assessment!`, 'success');
}

function startExamTimer() {
    if (currentExam.timer) {
        clearInterval(currentExam.timer);
    }

    currentExam.timer = setInterval(() => {
        currentExam.timeRemaining--;
        const timerElement = document.getElementById('examTimer');
        if (timerElement) {
            timerElement.textContent = formatTime(currentExam.timeRemaining);

            // Warning colors
            if (currentExam.timeRemaining <= 300) { // 5 minutes
                timerElement.className = 'exam-timer danger';
            } else if (currentExam.timeRemaining <= 600) { // 10 minutes
                timerElement.className = 'exam-timer warning';
            }
        }

        // Auto-submit when time is up
        if (currentExam.timeRemaining <= 0) {
            clearInterval(currentExam.timer);
            currentExam.timer = null;
            showAlert('⏰ Time Up!', 'Exam time expired. Submitting automatically...');
            setTimeout(() => submitExam(), 2000);
        }
    }, 1000);
}

function loadQuestion(index) {
    if (index < 0 || index >= currentExam.questions.length) return;

    currentExam.currentQuestionIndex = index;
    const question = currentExam.questions[index];

    document.getElementById('currentQuestionNum').textContent = index + 1;

    const container = document.getElementById('questionContainer');
    const userAnswer = currentExam.answers[index] || '';

    if (question.type === 'MCQ') {
        const optionsHtml = question.options.map((option, optIndex) => 
            `<div class="option-item ${userAnswer === option ? 'selected' : ''}" onclick="selectOption(${index}, '${option.replace(/'/g, "\'")}')">
                <input type="radio" name="question${index}" value="${option}" ${userAnswer === option ? 'checked' : ''} class="option-radio">
                <span>${option}</span>
            </div>`
        ).join('');

        container.innerHTML = `
            <div class="question-text">
                <strong>Question ${index + 1}:</strong> ${question.question}
            </div>
            <div class="options-container">${optionsHtml}</div>
        `;
    } else if (question.type === 'Descriptive') {
        container.innerHTML = `
            <div class="question-text">
                <strong>Question ${index + 1} (Descriptive):</strong> ${question.question}
            </div>
            <textarea class="descriptive-answer" placeholder="Write your detailed answer here..." 
                     onchange="saveDescriptiveAnswer(${index}, this.value)">${userAnswer}</textarea>
            <div class="answer-tips">
                <p><strong>Tips:</strong> Write a comprehensive answer including key concepts, explanations, and examples where applicable.</p>
            </div>
        `;
    }

    // Update navigation buttons
    document.getElementById('prevQuestionBtn').disabled = index === 0;
    document.getElementById('nextQuestionBtn').disabled = index === currentExam.questions.length - 1;
}

function selectOption(questionIndex, option) {
    currentExam.answers[questionIndex] = option;
    loadQuestion(questionIndex); // Refresh to show selection
}

function saveDescriptiveAnswer(questionIndex, value) {
    currentExam.answers[questionIndex] = value;
}

function navigateToPrevious() {
    if (currentExam.currentQuestionIndex > 0) {
        loadQuestion(currentExam.currentQuestionIndex - 1);
    }
}

function navigateToNext() {
    if (currentExam.currentQuestionIndex < currentExam.questions.length - 1) {
        loadQuestion(currentExam.currentQuestionIndex + 1);
    }
}

async function submitExam() {
    if (currentExam.timer) {
        clearInterval(currentExam.timer);
        currentExam.timer = null;
    }

    exitFullscreen();

    // Show loading
    const loadingModal = document.getElementById('loadingModal');
    const loadingTitle = document.getElementById('loadingTitle');
    const loadingDescription = document.getElementById('loadingDescription');

    if (loadingTitle) loadingTitle.textContent = 'Evaluating Answers...';
    if (loadingDescription) loadingDescription.textContent = 'Please wait while AI evaluates your descriptive answers...';
    showModal(loadingModal);

    try {
        // Calculate MCQ score
        let mcqScore = 0;
        let mcqTotal = 0;

        currentExam.questions.forEach((question, index) => {
            if (question.type === 'MCQ') {
                mcqTotal++;
                if (currentExam.answers[index] === question.answer) {
                    mcqScore++;
                }
            }
        });

        // Evaluate descriptive answers
        const descriptiveEvaluations = await evaluateDescriptiveAnswers();

        // Calculate total score
        let descriptiveScore = 0;
        let descriptiveTotal = 0;

        if (descriptiveEvaluations) {
            Object.values(descriptiveEvaluations).forEach(evaluation => {
                descriptiveScore += evaluation.marks || 0;
                descriptiveTotal += evaluation.maxMarks || 10;
            });
        }

        const totalScore = mcqScore + descriptiveScore;
        const totalPossible = mcqTotal + descriptiveTotal;
        const percentage = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;
        const timeSpent = 1800 - currentExam.timeRemaining;

        // Determine grade
        let grade = 'F';
        if (percentage >= 90) grade = 'A+';
        else if (percentage >= 80) grade = 'A';
        else if (percentage >= 70) grade = 'B+';
        else if (percentage >= 60) grade = 'B';
        else if (percentage >= 50) grade = 'C';
        else if (percentage >= 40) grade = 'D';

        // Create result object
        const examResult = {
            userId: currentUser.id,
            userName: currentUser.name,
            stream: currentExam.stream,
            subjectName: currentExam.subjectName,
            mcqScore: mcqScore,
            mcqTotal: mcqTotal,
            descriptiveScore: Math.round(descriptiveScore * 10) / 10,
            descriptiveTotal: descriptiveTotal,
            totalScore: Math.round(totalScore * 10) / 10,
            totalPossible: totalPossible,
            percentage: percentage,
            grade: grade,
            timeSpent: timeSpent,
            questions: currentExam.questions,
            answers: currentExam.answers,
            descriptiveEvaluations: descriptiveEvaluations,
            evaluationSummary: {
                aiEvaluated: descriptiveEvaluations && Object.values(descriptiveEvaluations).some(e => e.autoEvaluated),
                manualEvaluated: descriptiveEvaluations && Object.values(descriptiveEvaluations).some(e => !e.autoEvaluated),
                totalDescriptiveQuestions: Object.keys(descriptiveEvaluations || {}).length
            }
        };

        // Save result
        const resultId = saveExamResult(examResult);
        examResult.id = resultId;

        hideModal(loadingModal);

        // Show results
        showExamResults(examResult);

        showAlert('✅ Exam Submitted', 'Your exam has been successfully submitted and evaluated!', 'success');

    } catch (error) {
        hideModal(loadingModal);
        console.error('Error during exam submission:', error);
        showAlert('❌ Submission Error', 'There was an error submitting your exam. Please try again.');
    }
}

async function evaluateDescriptiveAnswers() {
    const descriptiveAnswers = [];

    // Collect descriptive answers
    currentExam.questions.forEach((question, index) => {
        if (question.type === 'Descriptive' && currentExam.answers[index]) {
            descriptiveAnswers.push({
                questionIndex: index,
                studentAnswer: currentExam.answers[index],
                modelAnswer: question.answer,
                maxMarks: 10,
                question: question.question,
                stream: currentExam.stream
            });
        }
    });

    if (descriptiveAnswers.length === 0) {
        return null;
    }

    try {
        // Use SBERT evaluator
        const results = await sbertEvaluator.evaluateAnswersBatch(descriptiveAnswers);
        const evaluations = {};

        results.forEach((result, index) => {
            const questionIndex = descriptiveAnswers[index].questionIndex;
            evaluations[questionIndex] = {
                ...result,
                question: descriptiveAnswers[index].question,
                questionIndex: questionIndex,
                evaluationTimestamp: new Date().toISOString()
            };
        });

        return evaluations;

    } catch (error) {
        console.error('Error in descriptive evaluation:', error);

        // Fallback to basic manual evaluation
        const evaluations = {};
        descriptiveAnswers.forEach((pair, index) => {
            const questionIndex = pair.questionIndex;
            evaluations[questionIndex] = {
                similarity: 0.5,
                percentage: 50,
                classification: 'Manual Review Required',
                grade: 'C',
                marks: 5,
                maxMarks: 10,
                question: pair.question,
                questionIndex: questionIndex,
                autoEvaluated: false,
                evaluationType: 'MANUAL_FALLBACK',
                error: true,
                evaluationTimestamp: new Date().toISOString()
            };
        });

        return evaluations;
    }
}

function showExamResults(result) {
    showScreen(screens.results);

    const streamConfig = ENGINEERING_STREAMS[result.stream];

    // Update results display
    document.getElementById('finalScore').textContent = `${result.totalScore}/${result.totalPossible}`;
    document.getElementById('finalPercentage').textContent = `${result.percentage}%`;

    const gradeElement = document.getElementById('finalGrade');
    if (gradeElement) {
        gradeElement.textContent = result.grade;
        gradeElement.className = `grade-badge grade-${result.grade.toLowerCase().replace('+', 'plus')}`;
    }

    // Stream badge
    const resultStreamBadge = document.getElementById('resultStreamBadge');
    if (resultStreamBadge) {
        resultStreamBadge.textContent = `${streamConfig.icon} ${streamConfig.name}`;
        resultStreamBadge.style.backgroundColor = streamConfig.color;
    }

    // Result details
    document.getElementById('resultStream').textContent = streamConfig.name;
    document.getElementById('resultSubject').textContent = result.subjectName;
    document.getElementById('examDuration').textContent = formatTime(result.timeSpent);
    document.getElementById('mcqScoreResult').textContent = `${result.mcqScore}/${result.mcqTotal}`;
    document.getElementById('descriptiveScoreResult').textContent = `${result.descriptiveScore}/${result.descriptiveTotal}`;

    // Generate detailed review
    const reviewContainer = document.getElementById('examReview');
    if (reviewContainer) {
        reviewContainer.innerHTML = generateExamReview(result);
    }
}

function generateExamReview(result) {
    let reviewHtml = '<div class="review-questions">';

    result.questions.forEach((question, index) => {
        const userAnswer = result.answers[index] || 'No answer provided';
        const isCorrect = question.type === 'MCQ' && userAnswer === question.answer;
        const isDescriptive = question.type === 'Descriptive';

        let statusClass = isCorrect ? 'correct' : (isDescriptive ? 'descriptive' : 'incorrect');
        let statusText = isCorrect ? '✅ Correct' : (isDescriptive ? '📝 Descriptive' : '❌ Incorrect');

        reviewHtml += `
            <div class="review-question ${statusClass}">
                <div class="question-header">
                    <h4>Question ${index + 1}: ${statusText}</h4>
                    <span class="question-type">${question.type}</span>
                </div>
                <div class="question-content">
                    <p><strong>Question:</strong> ${question.question}</p>
                    <p><strong>Your Answer:</strong> ${userAnswer}</p>
                    <p><strong>Expected Answer:</strong> ${question.answer}</p>
                    ${question.explanation ? `<p><strong>Explanation:</strong> ${question.explanation}</p>` : ''}
        `;

        // Add descriptive evaluation details
        if (isDescriptive && result.descriptiveEvaluations && result.descriptiveEvaluations[index]) {
            const evaluation = result.descriptiveEvaluations[index];
            reviewHtml += `
                <div class="descriptive-evaluation">
                    <div class="evaluation-header">
                        <h5>🤖 AI Evaluation Results</h5>
                        <span class="evaluation-type">${evaluation.evaluationType || 'SBERT'}</span>
                    </div>
                    <div class="evaluation-details">
                        <div class="score-breakdown">
                            <div class="score-item">
                                <span class="score-label">Similarity:</span>
                                <span class="score-value">${evaluation.percentage}%</span>
                            </div>
                            <div class="score-item">
                                <span class="score-label">Classification:</span>
                                <span class="score-value">${evaluation.classification}</span>
                            </div>
                            <div class="score-item">
                                <span class="score-label">Grade:</span>
                                <span class="grade-badge grade-${evaluation.grade.toLowerCase().replace('+', 'plus')}">${evaluation.grade}</span>
                            </div>
                            <div class="score-item">
                                <span class="score-label">Marks:</span>
                                <span class="score-value">${evaluation.marks}/${evaluation.maxMarks}</span>
                            </div>
                        </div>
                        ${evaluation.feedback ? `<p class="evaluation-feedback">${evaluation.feedback}</p>` : ''}
                        ${evaluation.breakdown ? `
                            <div class="score-breakdown-details">
                                <small>Breakdown: Keywords ${evaluation.breakdown.keywords}%, Length ${evaluation.breakdown.length}%, Structure ${evaluation.breakdown.structure}%, Technical ${evaluation.breakdown.technical}%</small>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        reviewHtml += '</div></div>';
    });

    reviewHtml += '</div>';
    return reviewHtml;
}

// Utility Functions for Exam System
function viewDetailedResult(resultId) {
    const results = loadFromStorage(STORAGE_KEYS.EXAM_RESULTS, []);
    const result = results.find(r => r.id === resultId);

    if (result) {
        showExamResults(result);
    } else {
        showAlert('❌ Result Not Found', 'The requested result could not be found.');
    }
}

function retakeExam(stream, subjectName) {
    showStudentTab('examTab');
    // If we're already showing subjects for this stream, don't need to navigate
    setTimeout(() => {
        showStreamSubjects(stream);
    }, 100);
}

function deleteResult(resultId) {
    if (confirm('Are you sure you want to delete this result? This action cannot be undone.')) {
        const results = loadFromStorage(STORAGE_KEYS.EXAM_RESULTS, []);
        const updatedResults = results.filter(r => r.id !== resultId);
        saveToStorage(STORAGE_KEYS.EXAM_RESULTS, updatedResults);

        // Reload current view
        if (currentUser.type === 'admin') {
            loadAdminResults();
            loadAdminStats();
        }

        showAlert('✅ Deleted', 'Result has been deleted successfully.');
    }
}

function deleteUser(userId) {
    if (userId === currentUser.id) {
        showAlert('❌ Cannot Delete', 'You cannot delete your own account.');
        return;
    }

    if (confirm('Are you sure you want to delete this user? This will also delete all their exam results.')) {
        const users = loadFromStorage(STORAGE_KEYS.USERS, []);
        const results = loadFromStorage(STORAGE_KEYS.EXAM_RESULTS, []);

        const updatedUsers = users.filter(u => u.id !== userId);
        const updatedResults = results.filter(r => r.userId !== userId);

        saveToStorage(STORAGE_KEYS.USERS, updatedUsers);
        saveToStorage(STORAGE_KEYS.EXAM_RESULTS, updatedResults);

        loadAdminUsers();
        loadAdminStats();

        showAlert('✅ User Deleted', 'User and all associated data have been deleted.');
    }
}

// Fullscreen Functions
function enterFullscreen() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(err => console.log('Fullscreen error:', err));
    } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
    } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
    } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
    }
}

function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }
}

// Event Listeners Setup
function setupEventListeners() {
    // Navigation buttons
    buttons.home?.addEventListener('click', () => showScreen(screens.home));
    buttons.login?.addEventListener('click', () => {
        document.getElementById('loginTitle').textContent = 'Login';
        showScreen(screens.login);
    });
    buttons.logout?.addEventListener('click', logout);

    // Login type selection
    buttons.adminLogin?.addEventListener('click', () => {
        document.getElementById('loginTitle').textContent = 'Admin Login';
        showScreen(screens.login);
    });

    buttons.studentLogin?.addEventListener('click', () => {
        document.getElementById('loginTitle').textContent = 'Student Login';
        showScreen(screens.login);
    });

    // Forms
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('registerForm')?.addEventListener('submit', handleRegister);

    // Registration links
    document.getElementById('showRegister')?.addEventListener('click', (e) => {
        e.preventDefault();
        showScreen(screens.register);
    });

    document.getElementById('showLogin')?.addEventListener('click', (e) => {
        e.preventDefault();
        showScreen(screens.login);
    });

    // Admin tabs
    document.getElementById('adminStatsTabBtn')?.addEventListener('click', () => showAdminTab('adminStatsTab'));
    document.getElementById('adminResultsTabBtn')?.addEventListener('click', () => showAdminTab('adminResultsTab'));
    document.getElementById('adminUsersTabBtn')?.addEventListener('click', () => showAdminTab('adminUsersTab'));
    document.getElementById('adminSettingsTabBtn')?.addEventListener('click', () => showAdminTab('adminSettingsTab'));

    // Student tabs
    document.getElementById('examTabBtn')?.addEventListener('click', () => showStudentTab('examTab'));
    document.getElementById('myResultsTabBtn')?.addEventListener('click', () => showStudentTab('myResultsTab'));

    // Back to streams
    document.getElementById('backToStreams')?.addEventListener('click', () => {
        document.querySelector('.streams-selection')?.classList.remove('hidden');
        document.getElementById('streamSubjects')?.classList.add('hidden');
    });

    // Exam navigation
    document.getElementById('prevQuestionBtn')?.addEventListener('click', navigateToPrevious);
    document.getElementById('nextQuestionBtn')?.addEventListener('click', navigateToNext);
    document.getElementById('submitExamBtn')?.addEventListener('click', () => {
        if (confirm('Are you sure you want to submit your exam? This action cannot be undone.')) {
            submitExam();
        }
    });

    // Results
    document.getElementById('backToDashboardBtn')?.addEventListener('click', () => {
        if (currentUser?.type === 'admin') {
            showAdminDashboard();
        } else {
            showStudentDashboard();
        }
    });

    // Modal close
    document.getElementById('closeModal')?.addEventListener('click', () => {
        hideModal(document.getElementById('customModal'));
    });
}

// Application Initialization
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 5-Stream Engineering Exam System Starting...');

    // Initialize storage
    initializeStorage();

    // Setup event listeners
    setupEventListeners();

    // Setup stream cards
    setupStreamCards();

    // Update initial system status
    updateSystemStatus();

    // Load question banks
    const questionsLoaded = await loadAllStreams();

    // Update system status after loading
    updateSystemStatus();

    if (!questionsLoaded) {
        showAlert('⚠️ Incomplete Setup', 'Some question banks failed to load. Please ensure all 5 JSON files (CSE.json, EEE.json, ECE.json, CIVIL.json, MECH.json) are present.');
    }

    // Check for remembered user
    if (loadCurrentUser()) {
        buttons.login?.classList.add('hidden');
        buttons.logout?.classList.remove('hidden');

        if (currentUser.type === 'admin') {
            showAdminDashboard();
        } else {
            showStudentDashboard();
        }

        console.log(`✅ Auto-logged in ${currentUser.name} (${currentUser.type})`);
    }

    // Periodic status update
    setInterval(updateSystemStatus, 30000); // Update every 30 seconds

    console.log('✅ 5-Stream Engineering Exam System Ready!');
});
