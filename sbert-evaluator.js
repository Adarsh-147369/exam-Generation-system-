// Complete SBERT Evaluator for 5-Stream Engineering Exam System
// Production-ready with proper initialization and error handling

class SBERTEvaluator {
    constructor() {
        this.model = null;
        this.isModelLoaded = false;
        this.isInitializing = false;
        this.initializationAttempts = 0;
        this.maxRetries = 3;
        this.loadingTimeout = 45000; // 45 seconds timeout

        // Evaluation thresholds
        this.thresholds = {
            excellent: 0.85,  
            good: 0.75,       
            average: 0.60,    
            poor: 0.45,       
            fail: 0.00        
        };

        // Stream-specific adjustments for different engineering fields
        this.streamAdjustments = {
            'CSE': { technical: 1.1, conceptual: 1.0, keywordBonus: 0.1 },
            'EEE': { technical: 1.15, conceptual: 0.95, keywordBonus: 0.15 },
            'ECE': { technical: 1.1, conceptual: 1.0, keywordBonus: 0.1 },
            'CIVIL': { technical: 1.05, conceptual: 1.05, keywordBonus: 0.1 },
            'Mechanical': { technical: 1.1, conceptual: 1.0, keywordBonus: 0.1 }
        };

        console.log('🤖 SBERT Evaluator initialized for 5-stream assessment');
    }

    /**
     * Initialize the SBERT model with proper error handling
     */
    async initialize() {
        if (this.isModelLoaded) {
            console.log('✅ SBERT model already loaded');
            return true;
        }

        if (this.isInitializing) {
            console.log('⏳ SBERT model initialization already in progress');
            return new Promise((resolve) => {
                const checkStatus = setInterval(() => {
                    if (!this.isInitializing) {
                        clearInterval(checkStatus);
                        resolve(this.isModelLoaded);
                    }
                }, 500);
            });
        }

        this.isInitializing = true;
        console.log(`🔄 Starting SBERT model initialization (attempt ${this.initializationAttempts + 1}/${this.maxRetries})`);

        try {
            // Update status
            this.updateStatus('loading', 'Loading SBERT AI model...');

            // Check if USE is available
            if (typeof use === 'undefined') {
                throw new Error('Universal Sentence Encoder library not loaded. Check script includes.');
            }

            // Check browser capabilities
            const capabilities = this.checkBrowserCapabilities();
            if (!capabilities.webgl) {
                console.warn('⚠️ WebGL not supported - model may not load properly');
            }

            // Create loading promise with timeout
            const loadPromise = this.loadModelWithProgress();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Model loading timeout after 45 seconds')), this.loadingTimeout)
            );

            // Race between loading and timeout
            this.model = await Promise.race([loadPromise, timeoutPromise]);

            // Verify model functionality
            await this.verifyModelFunctionality();

            this.isModelLoaded = true;
            this.isInitializing = false;

            console.log('✅ SBERT model loaded and verified successfully');
            this.updateStatus('ready', 'SBERT AI Evaluation Ready');

            return true;

        } catch (error) {
            this.initializationAttempts++;
            this.isInitializing = false;

            console.error(`❌ SBERT initialization attempt ${this.initializationAttempts} failed:`, error.message);

            // Retry logic
            if (this.initializationAttempts < this.maxRetries) {
                console.log(`🔄 Retrying in 3 seconds... (${this.maxRetries - this.initializationAttempts} attempts remaining)`);
                await this.delay(3000);
                return this.initialize();
            } else {
                console.log('❌ All SBERT initialization attempts failed. Using enhanced manual evaluation.');
                this.updateStatus('manual', 'Enhanced Manual Evaluation Mode - SBERT unavailable');
                return false;
            }
        }
    }

    /**
     * Load model with progress indication
     */
    async loadModelWithProgress() {
        console.log('📥 Downloading Universal Sentence Encoder model (~25MB)...');

        // Load the model
        const model = await use.load();

        console.log('🔧 Model downloaded, initializing...');

        return model;
    }

    /**
     * Verify model functionality with test embeddings
     */
    async verifyModelFunctionality() {
        console.log('🧪 Verifying model functionality...');

        const testSentences = [
            'This is a test sentence for model verification',
            'Another test sentence to ensure proper functionality'
        ];

        const embeddings = await this.model.embed(testSentences);
        const embeddingData = await embeddings.data();

        // Verify embeddings are generated
        if (!embeddingData || embeddingData.length === 0) {
            throw new Error('Model test failed - no embeddings generated');
        }

        // Test cosine similarity calculation
        const embeddingSize = embeddingData.length / testSentences.length;
        const embedding1 = Array.from(embeddingData.slice(0, embeddingSize));
        const embedding2 = Array.from(embeddingData.slice(embeddingSize));
        const similarity = this.calculateCosineSimilarity(embedding1, embedding2);

        if (isNaN(similarity) || similarity < 0 || similarity > 1) {
            throw new Error('Model test failed - invalid similarity calculation');
        }

        // Clean up test embeddings
        embeddings.dispose();

        console.log('✅ Model functionality verified successfully');
    }

    /**
     * Check browser capabilities for TensorFlow.js
     */
    checkBrowserCapabilities() {
        const capabilities = {
            webgl: this.hasWebGLSupport(),
            webworkers: typeof Worker !== 'undefined',
            indexeddb: typeof indexedDB !== 'undefined',
            es6: this.hasES6Support(),
            memory: this.getAvailableMemory()
        };

        console.log('🔍 Browser capabilities:', capabilities);
        return capabilities;
    }

    hasWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (e) {
            return false;
        }
    }

    hasES6Support() {
        try {
            eval('const test = () => {}; class TestClass {}');
            return true;
        } catch (e) {
            return false;
        }
    }

    getAvailableMemory() {
        if ('memory' in performance && performance.memory) {
            return {
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                usedJSHeapSize: performance.memory.usedJSHeapSize
            };
        }
        return 'unknown';
    }

    /**
     * Update status indicators
     */
    updateStatus(type, message) {
        const statusElement = document.getElementById('sbertStatus');
        if (statusElement) {
            const icons = {
                loading: '⏳',
                ready: '✅', 
                error: '❌',
                manual: '📝'
            };

            const statusIcon = statusElement.querySelector('.status-icon');
            const statusText = statusElement.querySelector('.status-text');

            if (statusIcon) statusIcon.textContent = icons[type] || '📝';
            if (statusText) statusText.textContent = message;

            // Update class for styling
            statusElement.className = `status-item status-${type}`;
        }
    }

    /**
     * Calculate cosine similarity between two vectors
     */
    calculateCosineSimilarity(vecA, vecB) {
        if (vecA.length !== vecB.length) {
            throw new Error('Vectors must have the same length');
        }

        const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
        const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
        const magnitudeB = Math.sqrt(vecB.reduce((sum, a) => sum + a * a, 0));

        if (magnitudeA === 0 || magnitudeB === 0) {
            return 0;
        }

        return dotProduct / (magnitudeA * magnitudeB);
    }

    /**
     * Enhanced manual evaluation with comprehensive scoring
     */
    calculateEnhancedManualScore(studentAnswer, modelAnswer, stream = 'CSE') {
        if (!studentAnswer || !modelAnswer) {
            return {
                similarity: 0,
                classification: 'No Answer Provided',
                grade: 'F',
                marks: 0,
                confidence: 'high',
                breakdown: { keywords: 0, length: 0, structure: 0, technical: 0 }
            };
        }

        // Normalize answers
        const student = studentAnswer.toLowerCase().trim();
        const model = modelAnswer.toLowerCase().trim();

        // Calculate different scoring components
        const keywordScore = this.calculateKeywordSimilarity(student, model);
        const lengthScore = this.calculateLengthSimilarity(student, model);
        const structureScore = this.calculateStructureSimilarity(student, model);
        const technicalScore = this.calculateTechnicalTermsScore(student, model, stream);

        // Weighted final score
        const weights = { keywords: 0.4, length: 0.25, structure: 0.2, technical: 0.15 };
        const baseScore = (
            keywordScore * weights.keywords +
            lengthScore * weights.length +
            structureScore * weights.structure +
            technicalScore * weights.technical
        );

        // Apply stream-specific adjustments
        const streamAdjustment = this.streamAdjustments[stream] || this.streamAdjustments['CSE'];
        const finalScore = Math.min(baseScore * streamAdjustment.conceptual, 1.0);

        const classification = this.classifyManualScore(finalScore);

        return {
            similarity: Math.round(finalScore * 1000) / 1000,
            classification: classification.classification + ' (Enhanced Manual)',
            grade: classification.grade,
            marks: Math.round(10 * classification.marksMultiplier * 10) / 10,
            confidence: this.calculateConfidence(keywordScore, structureScore),
            breakdown: {
                keywords: Math.round(keywordScore * 100),
                length: Math.round(lengthScore * 100),
                structure: Math.round(structureScore * 100),
                technical: Math.round(technicalScore * 100)
            },
            evaluationType: 'ENHANCED_MANUAL',
            streamAdjusted: stream !== 'CSE'
        };
    }

    /**
     * Calculate keyword similarity with advanced matching
     */
    calculateKeywordSimilarity(student, model) {
        const studentWords = this.extractKeywords(student);
        const modelWords = this.extractKeywords(model);

        if (modelWords.length === 0) return 0.5;

        let matchScore = 0;
        const modelWordSet = new Set(modelWords);

        studentWords.forEach(studentWord => {
            // Exact match
            if (modelWordSet.has(studentWord)) {
                matchScore += 1.0;
            } else {
                // Partial matches
                for (const modelWord of modelWords) {
                    if (this.areWordsSimilar(studentWord, modelWord)) {
                        matchScore += 0.7;
                        break;
                    }
                }
            }
        });

        return Math.min(matchScore / modelWords.length, 1.0);
    }

    /**
     * Extract meaningful keywords from text
     */
    extractKeywords(text) {
        const stopWords = new Set([
            'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
            'a', 'an', 'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their'
        ]);

        return text
            .split(/\s+/)
            .map(word => word.replace(/[^a-z0-9]/g, ''))
            .filter(word => word.length > 2 && !stopWords.has(word));
    }

    /**
     * Check if two words are similar
     */
    areWordsSimilar(word1, word2) {
        if (word1.length < 3 || word2.length < 3) return false;

        // Check containment
        if (word1.includes(word2) || word2.includes(word1)) return true;

        // Check edit distance
        return this.levenshteinDistance(word1, word2) <= Math.max(1, Math.min(word1.length, word2.length) * 0.3);
    }

    /**
     * Calculate Levenshtein distance
     */
    levenshteinDistance(str1, str2) {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i] + 1,
                    matrix[j - 1][i - 1] + indicator
                );
            }
        }

        return matrix[str2.length][str1.length];
    }

    /**
     * Calculate length similarity
     */
    calculateLengthSimilarity(student, model) {
        const minLength = Math.min(student.length, model.length);
        const maxLength = Math.max(student.length, model.length);

        if (maxLength === 0) return 0;

        const ratio = minLength / maxLength;

        // Penalize very short answers
        if (student.length < model.length * 0.2) {
            return Math.min(ratio, 0.3);
        }

        return ratio;
    }

    /**
     * Calculate structure similarity
     */
    calculateStructureSimilarity(student, model) {
        let score = 0;

        // Sentence structure
        const studentSentences = student.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const modelSentences = model.split(/[.!?]+/).filter(s => s.trim().length > 0);

        if (studentSentences.length >= 2) score += 0.3;
        if (student.includes(',')) score += 0.2;
        if (/[A-Z]/.test(student)) score += 0.2;
        if (student.includes('.')) score += 0.3;

        return Math.min(score, 1.0);
    }

    /**
     * Calculate technical terms score based on engineering stream
     */
    calculateTechnicalTermsScore(student, model, stream) {
        const technicalTerms = this.getTechnicalTerms(stream);

        let studentTerms = 0;
        let modelTerms = 0;
        let commonTerms = 0;

        technicalTerms.forEach(term => {
            const inStudent = student.includes(term.toLowerCase());
            const inModel = model.includes(term.toLowerCase());

            if (inStudent) studentTerms++;
            if (inModel) modelTerms++;
            if (inStudent && inModel) commonTerms++;
        });

        if (modelTerms === 0) return 0.7; // Neutral score if no technical terms in model
        return commonTerms / modelTerms;
    }

    /**
     * Get technical terms for each engineering stream
     */
    getTechnicalTerms(stream) {
        const terms = {
            CSE: [
                'algorithm', 'data structure', 'object oriented', 'database', 'network',
                'programming', 'software', 'system', 'architecture', 'design pattern',
                'class', 'object', 'inheritance', 'polymorphism', 'encapsulation',
                'array', 'tree', 'graph', 'sorting', 'searching', 'complexity'
            ],
            EEE: [
                'voltage', 'current', 'resistance', 'power', 'circuit', 'frequency',
                'transformer', 'motor', 'generator', 'control system', 'feedback',
                'amplifier', 'filter', 'signal', 'electromagnetic', 'induction',
                'capacitor', 'inductor', 'impedance', 'reactance', 'phase'
            ],
            ECE: [
                'signal', 'communication', 'modulation', 'antenna', 'transmission',
                'digital', 'analog', 'frequency', 'bandwidth', 'noise', 'filter',
                'amplifier', 'oscillator', 'microprocessor', 'embedded', 'protocol',
                'encoding', 'decoding', 'multiplexing', 'networking', 'wireless'
            ],
            CIVIL: [
                'concrete', 'steel', 'structure', 'beam', 'column', 'foundation',
                'load', 'stress', 'strain', 'material', 'construction', 'design',
                'reinforcement', 'aggregate', 'cement', 'surveying', 'transportation',
                'hydraulic', 'geotechnical', 'environmental', 'seismic'
            ],
            Mechanical: [
                'thermodynamics', 'fluid mechanics', 'heat transfer', 'machine design',
                'manufacturing', 'material science', 'mechanics', 'dynamics',
                'kinematics', 'engine', 'turbine', 'gear', 'bearing', 'shaft',
                'vibration', 'control', 'automation', 'robotics', 'cad', 'cam'
            ]
        };

        return terms[stream] || terms.CSE;
    }

    /**
     * Classify manual score into grade categories
     */
    classifyManualScore(score) {
        if (score >= 0.80) {
            return { classification: 'Excellent', grade: 'A+', marksMultiplier: 0.90 };
        } else if (score >= 0.70) {
            return { classification: 'Good', grade: 'B+', marksMultiplier: 0.80 };
        } else if (score >= 0.60) {
            return { classification: 'Average', grade: 'B', marksMultiplier: 0.70 };
        } else if (score >= 0.45) {
            return { classification: 'Below Average', grade: 'C', marksMultiplier: 0.55 };
        } else if (score >= 0.30) {
            return { classification: 'Poor', grade: 'D', marksMultiplier: 0.35 };
        } else {
            return { classification: 'Very Poor', grade: 'F', marksMultiplier: 0.15 };
        }
    }

    /**
     * Calculate confidence level for manual evaluation
     */
    calculateConfidence(keywordScore, structureScore) {
        const averageScore = (keywordScore + structureScore) / 2;

        if (averageScore >= 0.7) return 'high';
        if (averageScore >= 0.4) return 'medium';
        return 'low';
    }

    /**
     * Evaluate a single answer pair using AI
     */
    async evaluateWithAI(answerPair) {
        const { studentAnswer, modelAnswer, maxMarks = 10, question = '', stream = 'CSE' } = answerPair;

        if (!this.isModelLoaded) {
            throw new Error('SBERT model not loaded');
        }

        // Preprocess texts
        const processedStudent = this.preprocessText(studentAnswer);
        const processedModel = this.preprocessText(modelAnswer);

        if (!processedStudent || !processedModel) {
            throw new Error('Invalid input texts');
        }

        // Get embeddings
        const sentences = [processedStudent, processedModel];
        const embeddings = await this.model.embed(sentences);
        const embeddingData = await embeddings.data();

        // Extract individual embeddings
        const embeddingSize = embeddingData.length / sentences.length;
        const studentEmbedding = Array.from(embeddingData.slice(0, embeddingSize));
        const modelEmbedding = Array.from(embeddingData.slice(embeddingSize));

        // Calculate similarity
        let similarity = this.calculateCosineSimilarity(studentEmbedding, modelEmbedding);

        // Apply stream-specific adjustments
        const streamAdjustment = this.streamAdjustments[stream] || this.streamAdjustments['CSE'];
        if (this.containsTechnicalTerms(question, stream)) {
            similarity = Math.min(similarity * streamAdjustment.technical, 1.0);
        } else {
            similarity = Math.min(similarity * streamAdjustment.conceptual, 1.0);
        }

        // Classify result
        const classification = this.classifyAISimilarity(similarity);

        // Calculate marks
        const marks = Math.round(maxMarks * classification.marksMultiplier * 10) / 10;

        // Clean up
        embeddings.dispose();

        return {
            similarity: Math.round(similarity * 1000) / 1000,
            percentage: Math.round(similarity * 100),
            classification: classification.classification,
            grade: classification.grade,
            marks: marks,
            maxMarks: maxMarks,
            feedback: classification.feedback,
            evaluationType: 'SBERT_AI',
            streamAdjusted: stream !== 'CSE',
            confidence: 'high'
        };
    }

    /**
     * Check if question contains technical terms
     */
    containsTechnicalTerms(question, stream) {
        const technicalTerms = this.getTechnicalTerms(stream);
        const questionLower = question.toLowerCase();

        return technicalTerms.some(term => questionLower.includes(term.toLowerCase()));
    }

    /**
     * Classify AI similarity scores
     */
    classifyAISimilarity(similarity) {
        if (similarity >= this.thresholds.excellent) {
            return {
                classification: 'Excellent',
                grade: 'A+',
                marksMultiplier: 0.95,
                feedback: 'Outstanding semantic understanding with excellent accuracy'
            };
        } else if (similarity >= this.thresholds.good) {
            return {
                classification: 'Good',
                grade: 'B+',
                marksMultiplier: 0.85,
                feedback: 'Good semantic understanding with solid comprehension'
            };
        } else if (similarity >= this.thresholds.average) {
            return {
                classification: 'Average',
                grade: 'B',
                marksMultiplier: 0.70,
                feedback: 'Average understanding with basic concept grasp'
            };
        } else if (similarity >= this.thresholds.poor) {
            return {
                classification: 'Below Average',
                grade: 'C',
                marksMultiplier: 0.55,
                feedback: 'Below average understanding, needs improvement'
            };
        } else {
            return {
                classification: 'Poor',
                grade: 'D',
                marksMultiplier: 0.35,
                feedback: 'Poor understanding, significant gaps in knowledge'
            };
        }
    }

    /**
     * Preprocess text for evaluation
     */
    preprocessText(text) {
        if (!text || typeof text !== 'string') return '';

        return text
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"');
    }

    /**
     * Evaluate a single answer pair (tries AI first, falls back to manual)
     */
    async evaluateAnswerPair(answerPair) {
        const { studentAnswer, modelAnswer, maxMarks = 10, question = '', stream = 'CSE' } = answerPair;

        // Try AI evaluation first if model is loaded
        if (this.isModelLoaded) {
            try {
                return await this.evaluateWithAI(answerPair);
            } catch (error) {
                console.warn('❌ AI evaluation failed, using enhanced manual evaluation:', error.message);
            }
        }

        // Enhanced manual evaluation fallback
        const manualResult = this.calculateEnhancedManualScore(studentAnswer, modelAnswer, stream);

        return {
            ...manualResult,
            maxMarks: maxMarks,
            question: question,
            studentAnswer: studentAnswer,
            modelAnswer: modelAnswer,
            autoEvaluated: false,
            evaluationTimestamp: new Date().toISOString(),
            requiresReview: manualResult.confidence === 'low'
        };
    }

    /**
     * Evaluate multiple answer pairs in batch
     */
    async evaluateAnswersBatch(answerPairs) {
        if (!Array.isArray(answerPairs) || answerPairs.length === 0) {
            return [];
        }

        console.log(`🔄 Evaluating ${answerPairs.length} descriptive answers (AI: ${this.isModelLoaded ? 'Available' : 'Manual Mode'})`);

        const results = [];

        for (let i = 0; i < answerPairs.length; i++) {
            try {
                const result = await this.evaluateAnswerPair(answerPairs[i]);
                results.push(result);

                // Small delay between evaluations to prevent overwhelming
                if (i < answerPairs.length - 1) {
                    await this.delay(100);
                }

            } catch (error) {
                console.error('Error evaluating answer pair:', error);
                results.push({
                    similarity: 0,
                    percentage: 0,
                    classification: 'Evaluation Error',
                    grade: 'F',
                    marks: 0,
                    maxMarks: answerPairs[i].maxMarks || 10,
                    error: true,
                    errorMessage: error.message
                });
            }
        }

        console.log(`✅ Batch evaluation completed: ${results.length} results`);
        return results;
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get current status of the evaluator
     */
    getStatus() {
        return {
            isLoaded: this.isModelLoaded,
            isInitializing: this.isInitializing,
            initializationAttempts: this.initializationAttempts,
            modelType: this.isModelLoaded ? 'Universal Sentence Encoder (SBERT)' : 'Enhanced Manual',
            evaluationMode: this.isModelLoaded ? 'AI Semantic Analysis' : 'Enhanced Manual Evaluation',
            supportedStreams: Object.keys(this.streamAdjustments),
            thresholds: this.thresholds,
            version: '4.0.0'
        };
    }

    /**
     * Update evaluation thresholds
     */
    updateThresholds(newThresholds) {
        this.thresholds = { ...this.thresholds, ...newThresholds };
        console.log('🔧 SBERT evaluation thresholds updated:', this.thresholds);
    }

    /**
     * Dispose of the model to free memory
     */
    dispose() {
        if (this.model) {
            this.model.dispose();
            this.model = null;
            this.isModelLoaded = false;
            this.isInitializing = false;
            console.log('🗑️ SBERT model disposed');
        }
    }
}

// Create global instance
const sbertEvaluator = new SBERTEvaluator();

// Auto-initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('📚 SBERT Evaluator loaded - Ready for 5-stream engineering assessment');

    // Start initialization after a short delay to ensure all scripts are loaded
    setTimeout(() => {
        sbertEvaluator.initialize().then(success => {
            if (success) {
                console.log('🎉 SBERT AI evaluation system ready!');
            } else {
                console.log('📝 Enhanced manual evaluation system ready!');
            }
        });
    }, 1000);
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SBERTEvaluator, sbertEvaluator };
}
