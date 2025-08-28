
class SBERTEvaluator {
    constructor() {
        this.model = null;
        this.isModelLoaded = false;
        this.loadingProgress = 0;
        this.similarityThresholds = {
            excellent: 0.85,
            good: 0.75,
            average: 0.60,
            poor: 0.45,
            fail: 0.00
        };
    }



    async loadModel() {
        try {
            if (this.isModelLoaded && this.model) {
                return true;
            }

            console.log('Loading Universal Sentence Encoder...');

            if (typeof use === 'undefined') {
                throw new Error('Universal Sentence Encoder not loaded. Please ensure the script is included.');
            }

            this.model = await use.load();
            this.isModelLoaded = true;

            console.log('Universal Sentence Encoder loaded successfully');
            return true;

        } catch (error) {
            console.error('Error loading SBERT model:', error);
            this.isModelLoaded = false;
            return false;
        }
    }


    preprocessText(text) {
        if (!text || typeof text !== 'string') {
            return '';
        }

        let processed = text.toLowerCase();

        processed = processed.replace(/\s+/g, ' ').trim();

        const contractions = {
            "don't": "do not",
            "won't": "will not",
            "can't": "cannot",
            "isn't": "is not",
            "aren't": "are not",
            "wasn't": "was not",
            "weren't": "were not",
            "hasn't": "has not",
            "haven't": "have not",
            "hadn't": "had not",
            "doesn't": "does not",
            "didn't": "did not",
            "shouldn't": "should not",
            "wouldn't": "would not",
            "couldn't": "could not"
        };

        for (const [contraction, expansion] of Object.entries(contractions)) {
            processed = processed.replace(new RegExp(contraction, 'g'), expansion);
        }

        processed = processed.replace(/[.!?]+/g, '.');
        processed = processed.replace(/[,;:]+/g, ',');

        if (processed.length > 1000) {
            processed = processed.substring(0, 1000);
        }

        return processed;
    }


    async generateEmbeddings(texts) {
        if (!this.isModelLoaded || !this.model) {
            throw new Error('Model not loaded');
        }

        if (!Array.isArray(texts) || texts.length === 0) {
            throw new Error('Invalid texts input');
        }

        try {
            const processedTexts = texts.map(text => this.preprocessText(text));

            const embeddings = await this.model.embed(processedTexts);

            return embeddings;

        } catch (error) {
            console.error('Error generating embeddings:', error);
            throw error;
        }
    }


    calculateCosineSimilarity(embedding1, embedding2) {
        try {
            const dotProduct = tf.sum(tf.mul(embedding1, embedding2));

            const magnitude1 = tf.sqrt(tf.sum(tf.square(embedding1)));
            const magnitude2 = tf.sqrt(tf.sum(tf.square(embedding2)));

    
            const similarity = tf.div(dotProduct, tf.mul(magnitude1, magnitude2));

            return similarity.dataSync()[0];

        } catch (error) {
            console.error('Error calculating cosine similarity:', error);
            return 0;
        }
    }

    convertSimilarityToMarks(similarity, maxMarks = 10) {
        const percentage = Math.round(similarity * 100);

        let classification = '';
        let grade = '';
        let marksMultiplier = 0;

        if (similarity >= this.similarityThresholds.excellent) {
            classification = 'Excellent';
            grade = 'A+';
            marksMultiplier = 0.95; 
        } else if (similarity >= this.similarityThresholds.good) {
            classification = 'Good';
            grade = 'A';
            marksMultiplier = 0.82; 
        } else if (similarity >= this.similarityThresholds.average) {
            classification = 'Average';
            grade = 'B';
            marksMultiplier = 0.67; 
        } else if (similarity >= this.similarityThresholds.poor) {
            classification = 'Poor';
            grade = 'C';
            marksMultiplier = 0.52; 
        } else {
            classification = 'Inadequate';
            grade = 'F';
            marksMultiplier = 0.25; 
        }

        const baseMarks = maxMarks * marksMultiplier;
        const variation = maxMarks * 0.05;
        const finalMarks = Math.max(0, Math.min(maxMarks, 
            baseMarks + (Math.random() - 0.5) * variation));

        return {
            similarity: similarity,
            percentage: percentage,
            classification: classification,
            grade: grade,
            marks: Math.round(finalMarks * 10) / 10, 
            maxMarks: maxMarks
        };
    }


    async evaluateAnswerPair(answerPair) {
        const { studentAnswer, modelAnswer, maxMarks = 10, question = '' } = answerPair;

        if (!studentAnswer || !modelAnswer) {
            return {
                similarity: 0,
                percentage: 0,
                classification: 'No Answer',
                grade: 'F',
                marks: 0,
                maxMarks: maxMarks,
                error: 'Missing answer data'
            };
        }

        try {
            const embeddings = await this.generateEmbeddings([studentAnswer, modelAnswer]);

            const studentEmbedding = embeddings.slice([0, 0], [1, -1]).squeeze();
            const modelEmbedding = embeddings.slice([1, 0], [1, -1]).squeeze();

            const similarity = this.calculateCosineSimilarity(studentEmbedding, modelEmbedding);

            const evaluation = this.convertSimilarityToMarks(similarity, maxMarks);

            embeddings.dispose();
            studentEmbedding.dispose();
            modelEmbedding.dispose();

            return {
                ...evaluation,
                question: question,
                studentAnswer: studentAnswer,
                modelAnswer: modelAnswer,
                evaluationTimestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Error evaluating answer pair:', error);
            return {
                similarity: 0,
                percentage: 0,
                classification: 'Evaluation Error',
                grade: 'F',
                marks: 0,
                maxMarks: maxMarks,
                error: error.message
            };
        }
    }

    async evaluateAnswersBatch(answerPairs) {
        if (!Array.isArray(answerPairs) || answerPairs.length === 0) {
            return [];
        }

        const results = [];

        try {

            const batchSize = 4;
            for (let i = 0; i < answerPairs.length; i += batchSize) {
                const batch = answerPairs.slice(i, i + batchSize);

                const batchPromises = batch.map(pair => this.evaluateAnswerPair(pair));
                const batchResults = await Promise.all(batchPromises);

                results.push(...batchResults);


                if (i + batchSize < answerPairs.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

        } catch (error) {
            console.error('Error in batch evaluation:', error);

            for (let i = results.length; i < answerPairs.length; i++) {
                results.push({
                    similarity: 0,
                    percentage: 0,
                    classification: 'Batch Error',
                    grade: 'F',
                    marks: 0,
                    maxMarks: answerPairs[i].maxMarks || 10,
                    error: 'Batch processing failed'
                });
            }
        }

        return results;
    }


    updateThresholds(newThresholds) {
        if (newThresholds && typeof newThresholds === 'object') {
            this.similarityThresholds = {
                ...this.similarityThresholds,
                ...newThresholds
            };

            console.log('Updated SBERT thresholds:', this.similarityThresholds);
        }
    }


    getStatus() {
        return {
            isModelLoaded: this.isModelLoaded,
            model: this.model ? 'Universal Sentence Encoder' : null,
            thresholds: this.similarityThresholds,
            memoryUsage: this.model ? 'Active' : 'None'
        };
    }


    dispose() {
        if (this.model) {

            this.model = null;
        }

        this.isModelLoaded = false;
        console.log('SBERT Evaluator disposed');
    }
}

const sbertEvaluator = new SBERTEvaluator();


if (typeof module !== 'undefined' && module.exports) {
    module.exports = SBERTEvaluator;
}

if (typeof window !== 'undefined') {
    window.SBERTEvaluator = SBERTEvaluator;
    window.sbertEvaluator = sbertEvaluator;
}