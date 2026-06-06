/**
 * Ollama API Integration Module
 * Handles all communication with local Ollama server
 * 
 * DESIGN PATTERN: Adapter Pattern
 * Provides a clean interface to interact with Ollama API
 */

const ollamaAPI = (function() {
    
    // Private configuration
    let config = {
        baseUrl: 'http://localhost:11434',
        model: 'llama3.2',
        isConnected: false
    };

    /**
     * Set configuration
     */
    function setConfig(baseUrl, model) {
        config.baseUrl = baseUrl || config.baseUrl;
        config.model = model || config.model;
    }

    /**
     * Check if Ollama is running
     */
    async function checkConnection() {
        try {
            const response = await fetch(`${config.baseUrl}/api/tags`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                config.isConnected = true;
                return { success: true, message: 'Connected to Ollama' };
            }
        } catch (error) {
            config.isConnected = false;
            return { 
                success: false, 
                message: 'Cannot connect to Ollama. Make sure it is running on your machine.' 
            };
        }
    }

    /**
     * Send prompt to Ollama and get response
     */
    async function generateResponse(prompt, systemPrompt = '') {
        if (!config.isConnected) {
            throw new Error('Ollama is not connected');
        }

        try {
            const response = await fetch(`${config.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: config.model,
                    prompt: prompt,
                    system: systemPrompt,
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.response.trim();
            
        } catch (error) {
            console.error('Ollama API Error:', error);
            throw error;
        }
    }

    /**
     * Generate quiz questions using AI
     */
    async function generateQuestions(topic, count, difficulty) {
        const prompt = `
Create ${count} multiple choice quiz questions about ${topic} at ${difficulty} difficulty level for beginner programmers.

Format each question EXACTLY like this:
QUESTION: [question text]
A) [option]
B) [option]
C) [option]
D) [option]
CORRECT: [A/B/C/D]
EXPLANATION: [brief explanation]

Make sure:
- Questions are clear and specific
- Only one correct answer
- Explanations are educational
- Format is consistent
`;

        const response = await generateResponse(prompt);
        return parseQuestionsFromAI(response);
    }

    /**
     * Parse AI response into question objects
     */
    function parseQuestionsFromAI(aiText) {
        const questions = [];
        const lines = aiText.split('\n');
        
        let currentQuestion = null;
        let currentOptions = [];
        let currentCorrect = 0;
        let currentExplanation = '';
        
        for (let line of lines) {
            line = line.trim();
            if (!line) continue;
            
            if (line.startsWith('QUESTION:')) {
                // Save previous question if exists
                if (currentQuestion && currentOptions.length === 4) {
                    questions.push({
                        question: currentQuestion,
                        options: currentOptions,
                        correct: currentCorrect,
                        explanation: currentExplanation
                    });
                }
                // Start new question
                currentQuestion = line.replace('QUESTION:', '').trim();
                currentOptions = [];
                currentCorrect = 0;
                currentExplanation = '';
                
            } else if (line.match(/^[A-D]\)/)) {
                const option = line.substring(2).trim();
                currentOptions.push(option);
                
            } else if (line.startsWith('CORRECT:')) {
                const letter = line.replace('CORRECT:', '').trim();
                currentCorrect = letter.charCodeAt(0) - 'A'.charCodeAt(0);
                
            } else if (line.startsWith('EXPLANATION:')) {
                currentExplanation = line.replace('EXPLANATION:', '').trim();
            }
        }
        
        // Save last question
        if (currentQuestion && currentOptions.length === 4) {
            questions.push({
                question: currentQuestion,
                options: currentOptions,
                correct: currentCorrect,
                explanation: currentExplanation
            });
        }
        
        return questions;
    }

    /**
     * Get hint for current question
     */
    async function getHint(question, options) {
        const prompt = `
Question: ${question}
Options: ${options.join(', ')}

Give a brief hint (2-3 sentences) to help answer this programming question. Do NOT give the direct answer.`;
        
        return await generateResponse(prompt);
    }

    /**
     * Generate explanation for an answer
     */
    async function generateExplanation(question, correctAnswer, explanation) {
        const prompt = `
Question: ${question}
Correct Answer: ${correctAnswer}
Basic Explanation: ${explanation}

Provide a detailed, beginner-friendly explanation of why this is the correct answer. Use simple analogies if helpful.`;
        
        return await generateResponse(prompt);
    }

    /**
     * Generate study plan based on wrong answers
     */
    async function generateStudyPlan(wrongAnswers) {
        const topics = wrongAnswers.map(wa => wa.question.question).join('\n');
        
        const prompt = `
The student got these questions wrong:
${topics}

Create a personalized study plan with:
1. What topics to focus on
2. Specific resources or concepts to review
3. Practice suggestions
4. Estimated time to master these topics

Keep it encouraging and practical.`;
        
        return await generateResponse(prompt);
    }

    // Public API
    return {
        setConfig: setConfig,
        checkConnection: checkConnection,
        generateQuestions: generateQuestions,
        getHint: getHint,
        generateExplanation: generateExplanation,
        generateStudyPlan: generateStudyPlan,
        isConnected: () => config.isConnected,
        getModel: () => config.model
    };
    
})();