// Enhanced Engineering Exam System with SBERT Integration
// Main Application JavaScript File - FIXED VERSION WITH MANUAL EVALUATION

let currentUser = null;
let currentExam = {
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
let QUESTION_BANK = null;

// SBERT Integration Variables
let sbertModelLoaded = false;
let sbertLoadingProgress = null;
let evaluationSettings = {
    enableAutoEvaluation: true,
    similarityThresholds: {
        excellent: 0.85,
        good: 0.75,
        average: 0.60,
        poor: 0.45,
        fail: 0.00
    },
    showDetailedFeedback: true,
    allowManualOverride: true,
    manualEvaluationEnabled: true // New setting for manual evaluation
};

// Storage Keys
const STORAGE_KEYS = {
    USERS: 'examSystem_users',
    CURRENT_USER: 'examSystem_currentUser',
    EXAM_RESULTS: 'examSystem_examResults',
    REMEMBER_ME: 'examSystem_rememberMe',
    SBERT_SETTINGS: 'examSystem_sbertSettings'
};

// Default Users
const DEFAULT_USERS = [
    { id: 1, name: "Admin User", email: "adarshreddy532@gmail.com", password: "admin123", type: "admin" },
    { id: 2, name: "adarsh", email: "rddadarsh@gmail.com", password: "123456", type: "student" },
    { id: 3, name: "venkat", email: "reddyvenkata979@gmail.com", password: "123456", type: "student" }
];

// SBERT Integration Functions
async function initializeSBERT() {
    try {
        console.log('Initializing SBERT model...');
        showSBERTLoadingStatus('Initializing SBERT model...', 'Please wait while the AI model loads (this may take 10-30 seconds)');

        if (typeof sbertEvaluator === 'undefined') {
            throw new Error('SBERT Evaluator not loaded. Please check if sbert-evaluator.js is included.');
        }

        const success = await sbertEvaluator.loadModel();
        if (success) {
            sbertModelLoaded = true;
            hideSBERTLoadingStatus();
            showSBERTStatus('ready', 'SBERT Auto-Evaluation Ready');
            console.log('SBERT model loaded successfully');
        } else {
            throw new Error('Failed to load SBERT model');
        }
        return success;
    } catch (error) {
        console.error('Error initializing SBERT:', error);
        hideSBERTLoadingStatus();
        showSBERTStatus('error', `SBERT Error: ${error.message} - Manual evaluation available`);
        return false;
    }
}

function showSBERTLoadingStatus(title, description) {
    const statusDiv = document.getElementById('sbertLoadingStatus');
    if (statusDiv) {
        statusDiv.className = 'sbert-loading';
        statusDiv.innerHTML = `
            <div class="loading-spinner"></div>
            <p>${title}</p>
            <small>${description}</small>
        `;
        statusDiv.classList.remove('hidden');
    }
}

function hideSBERTLoadingStatus() {
    const statusDiv = document.getElementById('sbertLoadingStatus');
    if (statusDiv) {
        statusDiv.classList.add('hidden');
    }
}

function showSBERTStatus(type, message) {
    const statusDiv = document.getElementById('sbertStatus');
    if (statusDiv) {
        const icons = {
            ready: '✅',
            error: '❌',
            evaluating: '🔄',
            manual: '📝'
        };

        statusDiv.className = `sbert-status ${type}`;
        statusDiv.innerHTML = `
            <span class="status-icon">${icons[type] || 'ℹ️'}</span>
            <span>${message}</span>
        `;
    }
}

// FIXED: Enhanced evaluation function with proper manual evaluation fallback
async function evaluateDescriptiveAnswersWithSBERT(answers) {
    console.log('Starting descriptive answer evaluation...');
    console.log('SBERT Model Loaded:', sbertModelLoaded);
    console.log('Auto Evaluation Enabled:', evaluationSettings.enableAutoEvaluation);

    const descriptiveAnswers = {};
    const answerPairs = [];

    // Collect all descriptive answers
    for (const questionIndex in answers) {
        const question = currentExam.questions[questionIndex];
        if (question && question.type === 'Descriptive' && answers[questionIndex]) {
            answerPairs.push({
                questionIndex: parseInt(questionIndex),
                studentAnswer: answers[questionIndex],
                modelAnswer: question.answer,
                maxMarks: 10,
                question: question.question
            });
        }
    }

    if (answerPairs.length === 0) {
        console.log('No descriptive answers to evaluate');
        return null;
    }

    console.log(`Found ${answerPairs.length} descriptive answers to evaluate`);

    // Try SBERT evaluation first if available
    if (sbertModelLoaded && evaluationSettings.enableAutoEvaluation && typeof sbertEvaluator !== 'undefined') {
        try {
            showSBERTStatus('evaluating', 'Evaluating descriptive answers with AI...');

            const results = await sbertEvaluator.evaluateAnswersBatch(answerPairs);

            const processedResults = {};
            results.forEach((result, index) => {
                const questionIndex = answerPairs[index].questionIndex;
                processedResults[questionIndex] = {
                    ...result,
                    question: answerPairs[index].question,
                    questionIndex: questionIndex,
                    autoEvaluated: true,
                    evaluationType: 'SBERT_AI',
                    evaluationTimestamp: new Date().toISOString()
                };
            });

            showSBERTStatus('ready', 'SBERT Auto-Evaluation Ready');
            console.log('SBERT evaluation completed:', processedResults);
            return processedResults;

        } catch (error) {
            console.error('Error in SBERT evaluation:', error);
            showSBERTStatus('error', 'AI Evaluation Failed - Using Manual Review');
            // Fall through to manual evaluation
        }
    }

    // FIXED: Manual evaluation fallback with proper scoring
    console.log('Using manual evaluation for descriptive answers');
    showSBERTStatus('manual', 'Using Manual Evaluation - Review Required');

    const manualResults = {};
    answerPairs.forEach((pair) => {
        const questionIndex = pair.questionIndex;

        // Simple keyword-based scoring for manual evaluation
        const manualScore = calculateManualScore(pair.studentAnswer, pair.modelAnswer);

        manualResults[questionIndex] = {
            similarity: manualScore.similarity,
            percentage: Math.round(manualScore.similarity * 100),
            classification: manualScore.classification,
            grade: manualScore.grade,
            marks: manualScore.marks,
            maxMarks: 10,
            question: pair.question,
            questionIndex: questionIndex,
            autoEvaluated: false,
            evaluationType: 'MANUAL',
            evaluationTimestamp: new Date().toISOString(),
            studentAnswer: pair.studentAnswer,
            modelAnswer: pair.modelAnswer,
            requiresReview: true,
            manualEvaluationNote: 'This answer was evaluated using basic keyword matching. Admin review recommended.'
        };
    });

    console.log('Manual evaluation completed:', manualResults);
    return manualResults;
}

// FIXED: Add manual scoring function
function calculateManualScore(studentAnswer, modelAnswer) {
    if (!studentAnswer || !modelAnswer) {
        return {
            similarity: 0,
            classification: 'No Answer',
            grade: 'F',
            marks: 0
        };
    }

    // Simple keyword-based evaluation
    const studentWords = studentAnswer.toLowerCase().split(/\s+/).filter(word => word.length > 3);
    const modelWords = modelAnswer.toLowerCase().split(/\s+/).filter(word => word.length > 3);

    let matchedWords = 0;
    studentWords.forEach(word => {
        if (modelWords.some(modelWord => 
            modelWord.includes(word) || word.includes(modelWord) || 
            levenshteinDistance(word, modelWord) <= 2)) {
            matchedWords++;
        }
    });

    const similarity = Math.min(matchedWords / Math.max(modelWords.length, 1), 1);

    // Length penalty for very short answers
    const lengthRatio = Math.min(studentAnswer.length / Math.max(modelAnswer.length * 0.3, 50), 1);
    const adjustedSimilarity = similarity * (0.7 + 0.3 * lengthRatio);

    let classification = '';
    let grade = '';
    let marksMultiplier = 0;

    if (adjustedSimilarity >= 0.7) {
        classification = 'Good (Manual)';
        grade = 'B+';
        marksMultiplier = 0.75;
    } else if (adjustedSimilarity >= 0.5) {
        classification = 'Average (Manual)';
        grade = 'B';
        marksMultiplier = 0.6;
    } else if (adjustedSimilarity >= 0.3) {
        classification = 'Below Average (Manual)';
        grade = 'C';
        marksMultiplier = 0.45;
    } else {
        classification = 'Poor (Manual)';
        grade = 'D';
        marksMultiplier = 0.3;
    }

    return {
        similarity: adjustedSimilarity,
        classification: classification,
        grade: grade,
        marks: Math.round(10 * marksMultiplier * 10) / 10
    };
}

// Helper function for string similarity
function levenshteinDistance(str1, str2) {
    const track = Array(str2.length + 1).fill(null).map(() =>
        Array(str1.length + 1).fill(null));
    for (let i = 0; i <= str1.length; i += 1) {
        track[0][i] = i;
    }
    for (let j = 0; j <= str2.length; j += 1) {
        track[j][0] = j;
    }
    for (let j = 1; j <= str2.length; j += 1) {
        for (let i = 1; i <= str1.length; i += 1) {
            const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
            track[j][i] = Math.min(
                track[j][i - 1] + 1,
                track[j - 1][i] + 1,
                track[j - 1][i - 1] + indicator,
            );
        }
    }
    return track[str2.length][str1.length];
}

// Utility Functions
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${secs}`;
}

function generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
}

// Storage Functions
function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Error saving to storage:', error);
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
    const users = loadFromStorage(STORAGE_KEYS.USERS);
    if (!users) {
        saveToStorage(STORAGE_KEYS.USERS, DEFAULT_USERS);
    }

    const results = loadFromStorage(STORAGE_KEYS.EXAM_RESULTS);
    if (!results) {
        saveToStorage(STORAGE_KEYS.EXAM_RESULTS, []);
    }

    // Initialize SBERT settings
    const sbertSettings = loadFromStorage(STORAGE_KEYS.SBERT_SETTINGS);
    if (!sbertSettings) {
        saveToStorage(STORAGE_KEYS.SBERT_SETTINGS, evaluationSettings);
    } else {
        evaluationSettings = { ...evaluationSettings, ...sbertSettings };
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
    results.push(result);
    saveToStorage(STORAGE_KEYS.EXAM_RESULTS, results);
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
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    screen.classList.remove('hidden');
}

function showAdminTab(tabName) {
    const tabs = ['adminStatsTab', 'adminQuestionsTab', 'adminResultsTab', 'adminUsersTab', 'adminSBERTTab'];
    const buttons = ['adminStatsTabBtn', 'adminQuestionsTabBtn', 'adminResultsTabBtn', 'adminUsersTabBtn', 'adminSBERTTabBtn'];

    tabs.forEach(tab => {
        const element = document.getElementById(tab);
        if (element) element.classList.add('hidden');
    });

    buttons.forEach(btn => {
        const element = document.getElementById(btn);
        if (element) {
            element.classList.remove('btn--primary');
            element.classList.add('btn--secondary');
        }
    });

    const activeTab = document.getElementById(tabName);
    if (activeTab) activeTab.classList.remove('hidden');

    const activeBtn = document.getElementById(tabName.replace('Tab', 'TabBtn'));
    if (activeBtn) {
        activeBtn.classList.remove('btn--secondary');
        activeBtn.classList.add('btn--primary');
    }
}

// Questions Loading
async function loadQuestions() {
    try {
        showModal(document.getElementById('loadingModal'));
        const response = await fetch('questions.json');
        if (!response.ok) {
            throw new Error('Failed to load questions');
        }
        QUESTION_BANK = await response.json();
        hideModal(document.getElementById('loadingModal'));
        console.log('Questions loaded successfully');
    } catch (error) {
        hideModal(document.getElementById('loadingModal'));
        console.error('Error loading questions:', error);
        alert('Failed to load question bank. Please check if questions.json exists.');
    }
}

// Modal Functions
function showModal(modal) {
    modal.classList.remove('hidden');
}

function hideModal(modal) {
    modal.classList.add('hidden');
}

// Authentication Functions
function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const remember = document.getElementById('rememberMe').checked;

    const users = loadFromStorage(STORAGE_KEYS.USERS, DEFAULT_USERS);
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        saveCurrentUser(user, remember);

        if (user.type === 'admin') {
            document.getElementById('adminWelcome').textContent = `Welcome, ${user.name}`;
            loadAdminDashboard();
            showScreen(screens.adminDashboard);

            // Try to initialize SBERT for admin, but don't block if it fails
            setTimeout(() => {
                initializeSBERT().catch(error => {
                    console.log('SBERT initialization failed, manual evaluation will be used');
                    showSBERTStatus('manual', 'Manual Evaluation Mode - SBERT unavailable');
                });
            }, 1000);
        } else {
            document.getElementById('studentWelcome').textContent = `Welcome, ${user.name}`;
            loadAvailableSubjects();
            showScreen(screens.studentDashboard);
            showStudentTab('examTab');
        }

        buttons.login.classList.add('hidden');
        buttons.logout.classList.remove('hidden');
        document.getElementById('loginForm').reset();
    } else {
        alert('Invalid email or password');
    }
}

function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value.trim();

    const users = loadFromStorage(STORAGE_KEYS.USERS, DEFAULT_USERS);

    if (users.find(u => u.email === email)) {
        alert('User with this email already exists');
        return;
    }

    const newUser = {
        id: generateId(),
        name,
        email,
        password,
        type: 'student',
        registeredAt: new Date().toISOString()
    };

    users.push(newUser);
    saveToStorage(STORAGE_KEYS.USERS, users);

    alert('Registration successful! Please login.');
    showScreen(screens.login);
    document.getElementById('registerForm').reset();
}

function logout() {
    currentUser = null;
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

    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);

    buttons.login.classList.remove('hidden');
    buttons.logout.classList.add('hidden');

    if (currentExam.timer) {
        clearInterval(currentExam.timer);
    }

    showScreen(screens.home);
}

// Admin Functions
function loadAdminDashboard() {
    showAdminTab('adminStatsTab');
    loadAdminStats();
}

function loadAdminStats() {
    const users = loadFromStorage(STORAGE_KEYS.USERS, DEFAULT_USERS);
    const results = loadFromStorage(STORAGE_KEYS.EXAM_RESULTS, []);

    const students = users.filter(u => u.type === 'student');
    const totalExams = results.length;

    let totalScore = 0;
    let totalPossible = 0;
    results.forEach(result => {
        totalScore += result.mcqScore;
        totalPossible += result.mcqTotal;

        // Add descriptive scores if available
        if (result.descriptiveEvaluations) {
            Object.values(result.descriptiveEvaluations).forEach(eval => {
                if (eval.marks && eval.maxMarks) {
                    totalScore += eval.marks;
                    totalPossible += eval.maxMarks;
                }
            });
        }
    });

    const averagePercent = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;

    document.getElementById('totalQuestionsCount').textContent = QUESTION_BANK ? 
        Object.values(QUESTION_BANK).reduce((total, stream) => 
            total + Object.values(stream).reduce((streamTotal, subject) => streamTotal + subject.length, 0), 0) : '750';
    document.getElementById('totalStudentsCount').textContent = students.length;
    document.getElementById('totalExamsCount').textContent = totalExams;
    document.getElementById('averageScorePercent').textContent = totalPossible > 0 ? `${averagePercent}%` : 'N/A';
}

// FIXED: Enhanced SBERT configuration with manual evaluation options
function loadAdminSBERT() {
    const container = document.getElementById('sbertConfigContainer');
    if (!container) return;

    container.innerHTML = `
        <div class="sbert-config">
            <div class="config-section">
                <h4>Evaluation Status</h4>
                <div class="model-status">
                    <p><strong>SBERT Model:</strong> ${sbertModelLoaded ? '✅ Loaded' : '❌ Not Loaded'}</p>
                    <p><strong>Auto-Evaluation:</strong> ${evaluationSettings.enableAutoEvaluation ? '✅ Enabled' : '❌ Disabled'}</p>
                    <p><strong>Manual Fallback:</strong> ✅ Always Available</p>
                    <div class="mt-16">
                        <button id="initSBERTBtn" class="btn btn--primary ${sbertModelLoaded ? 'hidden' : ''}" onclick="initializeSBERT()">
                            Initialize SBERT Model
                        </button>
                        <button id="testSBERTBtn" class="btn btn--secondary ${!sbertModelLoaded ? 'hidden' : ''}" onclick="testSBERTEvaluation()">
                            Test AI Evaluation
                        </button>
                        <button id="testManualBtn" class="btn btn--secondary" onclick="testManualEvaluation()">
                            Test Manual Evaluation
                        </button>
                    </div>
                </div>
            </div>

            <div class="config-section">
                <h4>Evaluation Settings</h4>
                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="enableAutoEval" ${evaluationSettings.enableAutoEvaluation ? 'checked' : ''} 
                               onchange="updateSBERTSettings()">
                        Enable Automatic AI Evaluation (when SBERT is available)
                    </label>
                </div>

                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="enableManualEval" ${evaluationSettings.manualEvaluationEnabled ? 'checked' : ''} 
                               onchange="updateSBERTSettings()">
                        Enable Manual Evaluation Fallback
                    </label>
                </div>

                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="showDetailedFeedback" ${evaluationSettings.showDetailedFeedback ? 'checked' : ''} 
                               onchange="updateSBERTSettings()">
                        Show Detailed Feedback to Students
                    </label>
                </div>

                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="allowManualOverride" ${evaluationSettings.allowManualOverride ? 'checked' : ''} 
                               onchange="updateSBERTSettings()">
                        Allow Manual Override of AI Scores
                    </label>
                </div>
            </div>

            <div class="config-section">
                <h4>AI Similarity Thresholds (When SBERT is Available)</h4>
                <p>Adjust the similarity thresholds for AI-based grade classification:</p>
                <div class="threshold-inputs">
                    <div class="form-group">
                        <label class="form-label">Excellent (A+) Threshold</label>
                        <input type="range" id="excellentThreshold" min="0.70" max="0.95" step="0.01" 
                               value="${evaluationSettings.similarityThresholds.excellent}" 
                               onchange="updateThresholdDisplay(this, 'excellentValue')" oninput="updateThresholdDisplay(this, 'excellentValue')">
                        <span id="excellentValue">${Math.round(evaluationSettings.similarityThresholds.excellent * 100)}%</span>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Good (A) Threshold</label>
                        <input type="range" id="goodThreshold" min="0.60" max="0.85" step="0.01" 
                               value="${evaluationSettings.similarityThresholds.good}" 
                               onchange="updateThresholdDisplay(this, 'goodValue')" oninput="updateThresholdDisplay(this, 'goodValue')">
                        <span id="goodValue">${Math.round(evaluationSettings.similarityThresholds.good * 100)}%</span>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Average (B) Threshold</label>
                        <input type="range" id="averageThreshold" min="0.45" max="0.75" step="0.01" 
                               value="${evaluationSettings.similarityThresholds.average}" 
                               onchange="updateThresholdDisplay(this, 'averageValue')" oninput="updateThresholdDisplay(this, 'averageValue')">
                        <span id="averageValue">${Math.round(evaluationSettings.similarityThresholds.average * 100)}%</span>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Poor (C) Threshold</label>
                        <input type="range" id="poorThreshold" min="0.30" max="0.65" step="0.01" 
                               value="${evaluationSettings.similarityThresholds.poor}" 
                               onchange="updateThresholdDisplay(this, 'poorValue')" oninput="updateThresholdDisplay(this, 'poorValue')">
                        <span id="poorValue">${Math.round(evaluationSettings.similarityThresholds.poor * 100)}%</span>
                    </div>
                </div>

                <div class="mt-16">
                    <button class="btn btn--primary" onclick="saveSBERTThresholds()">Save Settings</button>
                    <button class="btn btn--secondary" onclick="resetSBERTThresholds()">Reset to Defaults</button>
                </div>
            </div>

            <div class="config-section">
                <h4>Evaluation Method Priority</h4>
                <p>The system will use the following evaluation priority:</p>
                <ol>
                    <li><strong>AI Evaluation (SBERT):</strong> When model is loaded and auto-evaluation is enabled</li>
                    <li><strong>Manual Evaluation:</strong> Keyword-based scoring when AI is unavailable</li>
                    <li><strong>No Evaluation:</strong> Only if both methods are disabled (not recommended)</li>
                </ol>
            </div>
        </div>
    `;
}

function updateThresholdDisplay(slider, displayId) {
    const displayElement = document.getElementById(displayId);
    if (displayElement) {
        displayElement.textContent = Math.round(slider.value * 100) + '%';
    }
}

function updateSBERTSettings() {
    evaluationSettings.enableAutoEvaluation = document.getElementById('enableAutoEval').checked;
    evaluationSettings.manualEvaluationEnabled = document.getElementById('enableManualEval').checked;
    evaluationSettings.showDetailedFeedback = document.getElementById('showDetailedFeedback').checked;
    evaluationSettings.allowManualOverride = document.getElementById('allowManualOverride').checked;

    saveToStorage(STORAGE_KEYS.SBERT_SETTINGS, evaluationSettings);

    if (sbertEvaluator) {
        sbertEvaluator.updateThresholds(evaluationSettings.similarityThresholds);
    }

    console.log('Evaluation settings updated:', evaluationSettings);
}

function saveSBERTThresholds() {
    const thresholds = {
        excellent: parseFloat(document.getElementById('excellentThreshold').value),
        good: parseFloat(document.getElementById('goodThreshold').value),
        average: parseFloat(document.getElementById('averageThreshold').value),
        poor: parseFloat(document.getElementById('poorThreshold').value),
        fail: 0.00
    };

    evaluationSettings.similarityThresholds = thresholds;
    saveToStorage(STORAGE_KEYS.SBERT_SETTINGS, evaluationSettings);

    if (sbertEvaluator) {
        sbertEvaluator.updateThresholds(thresholds);
    }

    alert('Evaluation settings saved successfully!');
    console.log('Updated thresholds:', thresholds);
}

function resetSBERTThresholds() {
    const defaultThresholds = {
        excellent: 0.85,
        good: 0.75,
        average: 0.60,
        poor: 0.45,
        fail: 0.00
    };

    evaluationSettings.similarityThresholds = defaultThresholds;
    evaluationSettings.enableAutoEvaluation = true;
    evaluationSettings.manualEvaluationEnabled = true;
    evaluationSettings.showDetailedFeedback = true;
    evaluationSettings.allowManualOverride = true;

    saveToStorage(STORAGE_KEYS.SBERT_SETTINGS, evaluationSettings);

    if (sbertEvaluator) {
        sbertEvaluator.updateThresholds(defaultThresholds);
    }

    // Reload the SBERT configuration to reflect changes
    loadAdminSBERT();
    alert('Settings reset to default values!');
}

async function testSBERTEvaluation() {
    if (!sbertModelLoaded) {
        alert('SBERT model is not loaded. Please initialize it first.');
        return;
    }

    const testAnswerPair = {
        studentAnswer: "TCP ensures reliable communication through acknowledgments and retransmission of lost packets.",
        modelAnswer: "TCP provides reliable data transmission by using acknowledgment messages and automatic retransmission of lost data packets.",
        maxMarks: 10,
        question: "Explain how TCP ensures reliable data transmission."
    };

    try {
        showSBERTStatus('evaluating', 'Testing AI evaluation...');

        const result = await sbertEvaluator.evaluateAnswerPair(testAnswerPair);

        showSBERTStatus('ready', 'SBERT Auto-Evaluation Ready');

        alert(`AI Evaluation Test Result:\nSimilarity: ${Math.round(result.similarity * 100)}%\nClassification: ${result.classification}\nGrade: ${result.grade}\nMarks: ${result.marks}/${result.maxMarks}\nType: SBERT AI`);

        console.log('AI evaluation result:', result);

    } catch (error) {
        console.error('Error in AI evaluation:', error);
        showSBERTStatus('error', 'AI evaluation failed');
        alert('AI evaluation failed: ' + error.message);
    }
}

// FIXED: Add manual evaluation test function
async function testManualEvaluation() {
    const testStudentAnswer = "TCP ensures reliable communication through acknowledgments and retransmission of lost packets.";
    const testModelAnswer = "TCP provides reliable data transmission by using acknowledgment messages and automatic retransmission of lost data packets.";

    try {
        showSBERTStatus('manual', 'Testing manual evaluation...');

        const result = calculateManualScore(testStudentAnswer, testModelAnswer);

        showSBERTStatus('manual', 'Manual Evaluation Ready');

        alert(`Manual Evaluation Test Result:\nSimilarity: ${Math.round(result.similarity * 100)}%\nClassification: ${result.classification}\nGrade: ${result.grade}\nMarks: ${result.marks}/10\nType: Manual Keyword-Based`);

        console.log('Manual evaluation result:', result);

    } catch (error) {
        console.error('Error in manual evaluation:', error);
        alert('Manual evaluation failed: ' + error.message);
    }
}

// Student Functions
function showStudentTab(tabName) {
    const tabs = ['examTab', 'myResultsTab'];
    const buttons = ['examTabBtn', 'myResultsTabBtn'];

    tabs.forEach(tab => {
        const element = document.getElementById(tab);
        if (element) element.classList.add('hidden');
    });

    buttons.forEach(btn => {
        const element = document.getElementById(btn);
        if (element) {
            element.classList.remove('btn--primary');
            element.classList.add('btn--secondary');
        }
    });

    const activeTab = document.getElementById(tabName);
    if (activeTab) activeTab.classList.remove('hidden');

    const activeBtn = document.getElementById(tabName.replace('Tab', 'Btn'));
    if (activeBtn) {
        activeBtn.classList.remove('btn--secondary');
        activeBtn.classList.add('btn--primary');
    }
}

function loadAvailableSubjects() {
    const container = document.getElementById('availableSubjects');
    if (!QUESTION_BANK) {
        container.innerHTML = '<p>Question bank not loaded. Please refresh the page.</p>';
        return;
    }

    container.innerHTML = '';

    Object.entries(QUESTION_BANK).forEach(([stream, subjects]) => {
        Object.entries(subjects).forEach(([subjectName, questions]) => {
            if (questions && questions.length >= 10) {
                const mcqCount = questions.filter(q => q.type === 'MCQ').length;
                const descriptiveCount = questions.filter(q => q.type === 'Descriptive').length;

                if (mcqCount >= 8 && descriptiveCount >= 2) {
                    const card = document.createElement('div');
                    card.className = 'subject-card card';
                    card.style.cursor = 'pointer';
                    card.innerHTML = `
                        <div class="card__body">
                            <h4>${subjectName}</h4>
                            <p><strong>Stream:</strong> ${stream}</p>
                            <p><strong>Available Questions:</strong> ${questions.length} (${mcqCount} MCQ + ${descriptiveCount} Descriptive)</p>
                            <div class="status status--success">✓ Ready for Exam</div>
                            ${sbertModelLoaded ? 
                                '<div class="status status--info">🤖 AI Evaluation Available</div>' : 
                                '<div class="status status--warning">📝 Manual Evaluation Available</div>'}
                        </div>
                    `;
                    card.addEventListener('click', () => startExam(stream, subjectName));
                    container.appendChild(card);
                }
            }
        });
    });

    if (container.children.length === 0) {
        container.innerHTML = '<p>No subjects available for examination</p>';
    }
}

// Exam Functions
function startExam(stream, subjectName) {
    const subjects = QUESTION_BANK[stream];
    if (!subjects || !subjects[subjectName]) {
        alert('Subject not found!');
        return;
    }

    const questions = subjects[subjectName];
    const mcqQuestions = questions.filter(q => q.type === 'MCQ');
    const descriptiveQuestions = questions.filter(q => q.type === 'Descriptive');

    if (mcqQuestions.length < 8 || descriptiveQuestions.length < 2) {
        alert('Insufficient questions for this subject. Need at least 8 MCQ and 2 Descriptive questions.');
        return;
    }

    // Randomly select questions
    const selectedMCQs = shuffleArray(mcqQuestions).slice(0, 8);
    const selectedDescriptive = shuffleArray(descriptiveQuestions).slice(0, 2);
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
        timeRemaining: 1800, // 30 minutes
        startTime: new Date()
    };

    // Enter fullscreen
    enterFullscreen();

    // Show exam screen
    showScreen(screens.exam);
    document.getElementById('examSubjectName').textContent = `${subjectName} (${stream})`;
    document.getElementById('totalQuestions').textContent = examQuestions.length;

    // Start timer
    startExamTimer();

    // Load first question
    loadQuestion(0);
}

function startExamTimer() {
    currentExam.timer = setInterval(() => {
        currentExam.timeRemaining--;

        const timerElement = document.getElementById('examTimer');
        timerElement.textContent = formatTime(currentExam.timeRemaining);

        // Warning colors
        if (currentExam.timeRemaining <= 300) { // 5 minutes
            timerElement.className = 'exam-timer danger';
        } else if (currentExam.timeRemaining <= 600) { // 10 minutes
            timerElement.className = 'exam-timer warning';
        }

        // Auto submit when time runs out
        if (currentExam.timeRemaining <= 0) {
            clearInterval(currentExam.timer);
            alert('Time is up! Exam will be submitted automatically.');
            submitExam();
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
        container.innerHTML = `
            <div class="question-text">${question.question}</div>
            <div class="options-container">
                ${question.options.map((option) => `
                    <div class="option-item ${userAnswer === option ? 'selected' : ''}" 
                         onclick="selectOption(${index}, '${option.replace(/'/g, "\'")}')">
                        <input type="radio" name="question_${index}" value="${option}" 
                               ${userAnswer === option ? 'checked' : ''} class="option-radio">
                        <span>${option}</span>
                    </div>
                `).join('')}
            </div>
        `;
    } else if (question.type === 'Descriptive') {
        const evaluationStatus = sbertModelLoaded ? 
            '<div class="sbert-status ready"><span class="status-icon">🤖</span><span>This answer will be evaluated using AI</span></div>' : 
            '<div class="sbert-status manual"><span class="status-icon">📝</span><span>This answer will be evaluated using manual scoring</span></div>';

        container.innerHTML = `
            <div class="question-text">${question.question}</div>
            <textarea id="descriptive_${index}" class="descriptive-answer" 
                      placeholder="Write your answer here..." 
                      oninput="saveDescriptiveAnswer(${index}, this.value)">${userAnswer}</textarea>
            ${evaluationStatus}
        `;
    }

    // Update navigation buttons
    document.getElementById('prevQuestionBtn').style.display = index === 0 ? 'none' : 'inline-flex';
    document.getElementById('nextQuestionBtn').style.display = index === currentExam.questions.length - 1 ? 'none' : 'inline-flex';
    document.getElementById('submitExamBtn').style.display = index === currentExam.questions.length - 1 ? 'inline-flex' : 'none';
}

function selectOption(questionIndex, selectedOption) {
    currentExam.answers[questionIndex] = selectedOption;

    // Update visual selection
    const options = document.querySelectorAll(`input[name="question_${questionIndex}"]`);
    options.forEach(option => {
        const parent = option.closest('.option-item');
        if (option.value === selectedOption) {
            option.checked = true;
            parent.classList.add('selected');
        } else {
            option.checked = false;
            parent.classList.remove('selected');
        }
    });
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

// FIXED: Enhanced Submit Exam with proper evaluation handling
async function submitExam() {
    if (currentExam.timer) {
        clearInterval(currentExam.timer);
    }

    // Calculate MCQ score
    let mcqScore = 0;
    const mcqTotal = currentExam.questions.filter(q => q.type === 'MCQ').length;

    currentExam.questions.forEach((question, index) => {
        if (question.type === 'MCQ' && currentExam.answers[index] === question.answer) {
            mcqScore++;
        }
    });

    // Prepare result object
    const examResult = {
        id: generateId(),
        studentId: currentUser.id,
        subjectName: currentExam.subjectName,
        stream: currentExam.stream,
        mcqScore: mcqScore,
        mcqTotal: mcqTotal,
        timeRemaining: currentExam.timeRemaining,
        submittedAt: new Date().toISOString(),
        answers: { ...currentExam.answers },
        questions: [...currentExam.questions],
        descriptiveEvaluations: null
    };

    // Always try to evaluate descriptive answers (will use appropriate method)
    try {
        console.log('Attempting descriptive answer evaluation...');
        const descriptiveEvaluations = await evaluateDescriptiveAnswersWithSBERT(currentExam.answers);
        if (descriptiveEvaluations) {
            examResult.descriptiveEvaluations = descriptiveEvaluations;
            console.log('Descriptive evaluation completed:', descriptiveEvaluations);
        } else {
            console.log('No descriptive answers to evaluate');
        }
    } catch (error) {
        console.error('Error in descriptive evaluation:', error);
        // Continue without descriptive evaluation
    }

    // Save result
    saveExamResult(examResult);

    // Exit fullscreen
    exitFullscreen();

    // Show results
    showResultDetails(examResult.id);
}

function showResultDetails(resultId) {
    const results = loadFromStorage(STORAGE_KEYS.EXAM_RESULTS, []);
    const result = results.find(r => r.id === resultId);

    if (!result) {
        alert('Result not found!');
        return;
    }

    const mcqPercentage = Math.round((result.mcqScore / result.mcqTotal) * 100);
    let totalScore = result.mcqScore;
    let totalPossible = result.mcqTotal;
    let descriptiveScore = 0;
    let descriptivePossible = 0;

    // Calculate descriptive scores if available
    if (result.descriptiveEvaluations) {
        Object.values(result.descriptiveEvaluations).forEach(evaluation => {
            if (evaluation.marks && evaluation.maxMarks) {
                descriptiveScore += evaluation.marks;
                descriptivePossible += evaluation.maxMarks;
                totalScore += evaluation.marks;
                totalPossible += evaluation.maxMarks;
            }
        });
    }

    const overallPercentage = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : mcqPercentage;
    const timeSpent = formatTime(1800 - result.timeRemaining);

    let grade = 'F';
    if (overallPercentage >= 90) grade = 'A+';
    else if (overallPercentage >= 80) grade = 'A';
    else if (overallPercentage >= 70) grade = 'B+';
    else if (overallPercentage >= 60) grade = 'B';
    else if (overallPercentage >= 50) grade = 'C';
    else if (overallPercentage >= 40) grade = 'D';

    const resultsContainer = document.getElementById('resultsContent');
    resultsContainer.innerHTML = `
        <div class="results-container">
            <div class="results-summary">
                <h2>Exam Results</h2>
                <div class="score-display">${overallPercentage}%</div>
                <div class="grade-display">
                    <span class="grade-badge grade-${grade.toLowerCase().replace('+', 'plus')}">${grade}</span>
                </div>

                <div class="result-stats-summary">
                    <div class="stat-item">
                        <span class="stat-label">Subject:</span>
                        <span class="stat-value">${result.subjectName} (${result.stream})</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">MCQ Score:</span>
                        <span class="stat-value">${result.mcqScore}/${result.mcqTotal} (${mcqPercentage}%)</span>
                    </div>
                    ${descriptivePossible > 0 ? `
                        <div class="stat-item">
                            <span class="stat-label">Descriptive Score:</span>
                            <span class="stat-value">${Math.round(descriptiveScore * 10) / 10}/${descriptivePossible} (${Math.round((descriptiveScore/descriptivePossible) * 100)}%)</span>
                        </div>
                    ` : ''}
                    <div class="stat-item">
                        <span class="stat-label">Time Spent:</span>
                        <span class="stat-value">${timeSpent}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Date:</span>
                        <span class="stat-value">${new Date(result.submittedAt).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>

            <div class="review-section">
                <h3>Answer Review</h3>
                ${generateAnswerReview(result)}
            </div>
        </div>
    `;

    showScreen(screens.results);
}

// FIXED: Enhanced answer review with proper manual evaluation display
function generateAnswerReview(result) {
    const reviewDiv = document.createElement('div');
    reviewDiv.className = 'review-container';

    result.questions.forEach((question, index) => {
        const userAnswer = result.answers[index] || 'No answer provided';
        const isCorrect = question.type === 'MCQ' && userAnswer === question.answer;
        const evaluation = result.descriptiveEvaluations ? result.descriptiveEvaluations[index] : null;

        const questionDiv = document.createElement('div');
        questionDiv.className = `review-question ${isCorrect ? 'correct' : (question.type === 'MCQ' ? 'incorrect' : (evaluation ? 'auto-evaluated' : 'manual-review'))}`;

        let answerHtml = '';

        if (question.type === 'MCQ') {
            answerHtml = `
                <div class="user-answer">
                    <strong>Your Answer:</strong> ${userAnswer}
                </div>
                <div class="expected-answer">
                    <strong>Correct Answer:</strong> ${question.answer}
                </div>
                ${question.explanation ? `
                    <div class="explanation">
                        <strong>Explanation:</strong> ${question.explanation}
                    </div>
                ` : ''}
                <div class="question-status">
                    <strong>Status:</strong> ${isCorrect ? '✓ Correct' : '✗ Incorrect'}
                </div>
            `;
        } else {
            if (evaluation) {
                const isAIEvaluation = evaluation.evaluationType === 'SBERT_AI';
                answerHtml = `
                    <div class="descriptive-evaluation">
                        <div class="evaluation-summary">
                            <div class="similarity-score">
                                <h5>${isAIEvaluation ? 'AI Evaluation' : 'Manual Evaluation'}</h5>
                                <div class="score-bar">
                                    <div class="score-fill" style="width: ${evaluation.percentage}%"></div>
                                </div>
                                <div class="classification">${isAIEvaluation ? 'Similarity' : 'Match'}: ${evaluation.percentage}% - ${evaluation.classification}</div>
                            </div>
                            <div class="marks-awarded">
                                <h5>Score</h5>
                                <div class="grade-badge grade-${evaluation.grade.toLowerCase().replace('+', 'plus')}">${evaluation.grade}</div>
                                <div class="marks">${evaluation.marks}/${evaluation.maxMarks} marks</div>
                            </div>
                        </div>

                        ${evaluationSettings.showDetailedFeedback ? `
                            <div class="answer-comparison">
                                <div class="answer-section">
                                    <h6>Your Answer</h6>
                                    <p>${userAnswer}</p>
                                </div>
                                <div class="answer-section">
                                    <h6>Model Answer</h6>
                                    <p>${question.answer}</p>
                                </div>
                            </div>
                        ` : ''}

                        <div class="evaluation-note">
                            <small>${isAIEvaluation ? '🤖 Automatically evaluated using AI semantic similarity analysis' : '📝 Evaluated using keyword-based manual scoring'}</small>
                            ${evaluation.requiresReview ? '<br><small>⚠️ This answer may require admin review</small>' : ''}
                            ${evaluation.manualEvaluationNote ? `<br><small>${evaluation.manualEvaluationNote}</small>` : ''}
                        </div>
                    </div>
                `;
            } else {
                answerHtml = `
                    <div class="user-answer">
                        <strong>Your Answer:</strong> ${userAnswer}
                    </div>
                    <div class="expected-answer">
                        <strong>Expected Answer:</strong> ${question.answer}
                    </div>
                    <div class="question-status">
                        <strong>Status:</strong> ❌ No Evaluation Available
                    </div>
                `;
            }
        }

        questionDiv.innerHTML = `
            <h4>Question ${index + 1}</h4>
            <p class="question-text">${question.question}</p>
            ${answerHtml}
        `;

        reviewDiv.appendChild(questionDiv);
    });

    return reviewDiv.outerHTML;
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

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
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

function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement || 
              document.mozFullScreenElement || document.msFullscreenElement);
}

function handleFullscreenChange() {
    const warningModal = document.getElementById('fullscreenWarningModal');
    if (!isFullscreen() && screens.exam && !screens.exam.classList.contains('hidden')) {
        warningModal.classList.remove('hidden');
    } else {
        warningModal.classList.add('hidden');
    }
}

// Event Listeners Setup
function setupEventListeners() {
    // Navigation
    buttons.home?.addEventListener('click', () => showScreen(screens.home));
    buttons.login?.addEventListener('click', () => {
        document.getElementById('loginTitle').textContent = 'Login';
        document.getElementById('registerLink').style.display = 'block';
        showScreen(screens.login);
    });
    buttons.logout?.addEventListener('click', logout);

    // Login type selection
    buttons.adminLogin?.addEventListener('click', () => {
        document.getElementById('loginTitle').textContent = 'Admin Login';
        document.getElementById('registerLink').style.display = 'none';
        showScreen(screens.login);
    });

    buttons.studentLogin?.addEventListener('click', () => {
        document.getElementById('loginTitle').textContent = 'Student Login';
        document.getElementById('registerLink').style.display = 'block';
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
    document.getElementById('adminStatsTabBtn')?.addEventListener('click', () => {
        showAdminTab('adminStatsTab');
        loadAdminStats();
    });

    document.getElementById('adminQuestionsTabBtn')?.addEventListener('click', () => {
        showAdminTab('adminQuestionsTab');
        loadAdminQuestions();
    });

    document.getElementById('adminResultsTabBtn')?.addEventListener('click', () => {
        showAdminTab('adminResultsTab');
        loadAdminResults();
    });

    document.getElementById('adminUsersTabBtn')?.addEventListener('click', () => {
        showAdminTab('adminUsersTab');
        loadAdminUsers();
    });

    document.getElementById('adminSBERTTabBtn')?.addEventListener('click', () => {
        showAdminTab('adminSBERTTab');
        loadAdminSBERT();
    });

    // Student tabs
    document.getElementById('examTabBtn')?.addEventListener('click', () => {
        showStudentTab('examTab');
        loadAvailableSubjects();
    });

    document.getElementById('myResultsTabBtn')?.addEventListener('click', () => {
        showStudentTab('myResultsTab');
        loadStudentResults();
    });

    // Exam navigation
    document.getElementById('prevQuestionBtn')?.addEventListener('click', navigateToPrevious);
    document.getElementById('nextQuestionBtn')?.addEventListener('click', navigateToNext);
    document.getElementById('submitExamBtn')?.addEventListener('click', () => {
        if (confirm('Are you sure you want to submit your exam? This action cannot be undone.')) {
            submitExam();
        }
    });

    // Fullscreen controls
    document.getElementById('exitFullscreenBtn')?.addEventListener('click', exitFullscreen);
    document.getElementById('returnFullscreenBtn')?.addEventListener('click', () => {
        document.getElementById('fullscreenWarningModal').classList.add('hidden');
        enterFullscreen();
    });

    document.getElementById('exitExamBtn')?.addEventListener('click', () => {
        if (confirm('Are you sure you want to exit the exam? Your progress will be lost.')) {
            if (currentExam.timer) {
                clearInterval(currentExam.timer);
            }
            exitFullscreen();
            document.getElementById('fullscreenWarningModal').classList.add('hidden');
            showScreen(screens.studentDashboard);
        }
    });

    // Results
    document.getElementById('backToDashboardBtn')?.addEventListener('click', () => {
        if (currentUser.type === 'admin') {
            showScreen(screens.adminDashboard);
        } else {
            showScreen(screens.studentDashboard);
        }
    });
}

// Admin helper functions
function loadAdminQuestions() {
    document.getElementById('questionsList').innerHTML = '<p>Questions management interface would be implemented here. Current question bank loaded successfully.</p>';
}

function loadAdminResults() {
    const results = loadFromStorage(STORAGE_KEYS.EXAM_RESULTS, []);
    const users = loadFromStorage(STORAGE_KEYS.USERS, DEFAULT_USERS);
    const container = document.getElementById('allResultsList');

    if (results.length === 0) {
        container.innerHTML = '<p>No exam results available yet.</p>';
        return;
    }

    let tableHtml = `
        <table class="results-table">
            <thead>
                <tr>
                    <th>Student</th>
                    <th>Subject</th>
                    <th>Stream</th>
                    <th>MCQ Score</th>
                    <th>Descriptive Score</th>
                    <th>Overall %</th>
                    <th>Time Spent</th>
                    <th>Date</th>
                    <th>Evaluation Type</th>
                </tr>
            </thead>
            <tbody>
    `;

    results.forEach(result => {
        const student = users.find(u => u.id === result.studentId);
        const mcqPercentage = Math.round((result.mcqScore / result.mcqTotal) * 100);
        const timeSpent = formatTime(1800 - result.timeRemaining);
        const date = new Date(result.submittedAt).toLocaleDateString();

        let descriptiveScore = 0;
        let descriptivePossible = 0;
        let evaluationType = 'None';

        if (result.descriptiveEvaluations) {
            const evaluations = Object.values(result.descriptiveEvaluations);
            evaluations.forEach(eval => {
                if (eval.marks && eval.maxMarks) {
                    descriptiveScore += eval.marks;
                    descriptivePossible += eval.maxMarks;
                }
            });

            if (evaluations.length > 0) {
                evaluationType = evaluations[0].evaluationType === 'SBERT_AI' ? '🤖 AI' : '📝 Manual';
            }
        }

        const overallPercentage = descriptivePossible > 0 ? 
            Math.round(((result.mcqScore + descriptiveScore) / (result.mcqTotal + descriptivePossible)) * 100) : 
            mcqPercentage;

        tableHtml += `
            <tr>
                <td>${student ? student.name : 'Unknown'}</td>
                <td>${result.subjectName}</td>
                <td>${result.stream}</td>
                <td>${result.mcqScore}/${result.mcqTotal} (${mcqPercentage}%)</td>
                <td>${descriptivePossible > 0 ? `${Math.round(descriptiveScore * 10) / 10}/${descriptivePossible}` : 'N/A'}</td>
                <td>${overallPercentage}%</td>
                <td>${timeSpent}</td>
                <td>${date}</td>
                <td>${evaluationType}</td>
            </tr>
        `;
    });

    tableHtml += '</tbody></table>';
    container.innerHTML = tableHtml;
}

function loadAdminUsers() {
    const users = loadFromStorage(STORAGE_KEYS.USERS, DEFAULT_USERS);
    const container = document.getElementById('usersList');

    let tableHtml = `
        <table class="results-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Type</th>
                    <th>Registered</th>
                </tr>
            </thead>
            <tbody>
    `;

    users.forEach(user => {
        const registeredDate = user.registeredAt ? 
            new Date(user.registeredAt).toLocaleDateString() : 'Default User';

        tableHtml += `
            <tr>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.type}</td>
                <td>${registeredDate}</td>
            </tr>
        `;
    });

    tableHtml += '</tbody></table>';
    container.innerHTML = tableHtml;
}

function loadStudentResults() {
    const results = loadFromStorage(STORAGE_KEYS.EXAM_RESULTS, []);
    const studentResults = results.filter(r => r.studentId === currentUser.id);
    const container = document.getElementById('studentResultsList');

    if (studentResults.length === 0) {
        container.innerHTML = '<p>You have not taken any exams yet.</p>';
        return;
    }

    let resultsHtml = '<div class="student-results-grid">';

    studentResults.forEach(result => {
        const mcqPercentage = Math.round((result.mcqScore / result.mcqTotal) * 100);
        const timeSpent = formatTime(1800 - result.timeRemaining);
        const date = new Date(result.submittedAt).toLocaleDateString();

        let descriptiveScore = 0;
        let descriptivePossible = 0;
        let evaluationType = 'None';

        if (result.descriptiveEvaluations) {
            const evaluations = Object.values(result.descriptiveEvaluations);
            evaluations.forEach(eval => {
                if (eval.marks && eval.maxMarks) {
                    descriptiveScore += eval.marks;
                    descriptivePossible += eval.maxMarks;
                }
            });

            if (evaluations.length > 0) {
                evaluationType = evaluations[0].evaluationType === 'SBERT_AI' ? '🤖 AI Evaluated' : '📝 Manual Evaluated';
            }
        }

        const overallPercentage = descriptivePossible > 0 ? 
            Math.round(((result.mcqScore + descriptiveScore) / (result.mcqTotal + descriptivePossible)) * 100) : 
            mcqPercentage;

        resultsHtml += `
            <div class="result-card card" onclick="showResultDetails('${result.id}')" style="cursor: pointer;">
                <div class="card__body">
                    <h4>${result.subjectName}</h4>
                    <p><strong>Stream:</strong> ${result.stream}</p>
                    <div class="result-stats">
                        <div class="stat-item">
                            <span class="stat-label">Overall Score:</span>
                            <span class="stat-value">${overallPercentage}%</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">MCQ Score:</span>
                            <span class="stat-value">${result.mcqScore}/${result.mcqTotal}</span>
                        </div>
                        ${descriptivePossible > 0 ? `
                            <div class="stat-item">
                                <span class="stat-label">Descriptive:</span>
                                <span class="stat-value">${Math.round(descriptiveScore * 10) / 10}/${descriptivePossible}</span>
                            </div>
                        ` : ''}
                        <div class="stat-item">
                            <span class="stat-label">Time Spent:</span>
                            <span class="stat-value">${timeSpent}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Date:</span>
                            <span class="stat-value">${date}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Evaluation:</span>
                            <span class="stat-value">${evaluationType}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    resultsHtml += '</div>';
    container.innerHTML = resultsHtml;
}

// Initialize Application
async function init() {
    console.log('Initializing Engineering Exam System with Enhanced Evaluation...');

    initializeStorage();
    await loadQuestions();
    setupEventListeners();

    // Load current user if remembered
    if (loadCurrentUser()) {
        if (currentUser.type === 'admin') {
            document.getElementById('adminWelcome').textContent = `Welcome back, ${currentUser.name}`;
            loadAdminDashboard();
            showScreen(screens.adminDashboard);

            // Try to initialize SBERT for admin, but don't block if it fails
            setTimeout(() => {
                initializeSBERT().catch(error => {
                    console.log('SBERT initialization failed, manual evaluation will be used');
                    showSBERTStatus('manual', 'Manual Evaluation Mode - SBERT unavailable');
                });
            }, 2000);
        } else {
            document.getElementById('studentWelcome').textContent = `Welcome back, ${currentUser.name}`;
            loadAvailableSubjects();
            showScreen(screens.studentDashboard);
            showStudentTab('examTab');
        }

        buttons.login.classList.add('hidden');
        buttons.logout.classList.remove('hidden');
    } else {
        showScreen(screens.home);
    }

    console.log('Engineering Exam System initialized successfully');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (currentExam.timer) {
        clearInterval(currentExam.timer);
    }
});
