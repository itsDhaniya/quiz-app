/**
 * Logic Builders - Quiz Practice App
 * Main Application with Ollama AI Integration
 */

const quizApp = (function() {
    
    // Private state
    let questions = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let wrongAnswers = [];
    let isAnswered = false;
    let aiEnabled = false;

    // Default questions
    function createQuestion(question, options, correct, explanation) {
        return { question, options, correct, explanation };
    }

    function getDefaultQuestions() {
        return [
            createQuestion(
                "What does 'HTML' stand for?",
                ["Hyper Text Markup Language", "High Tech Modern Language", 
                 "Home Tool Markup Language", "Hyperlink Text Mode Language"],
                0,
                "HTML is the standard language for creating web pages."
            ),
            createQuestion(
                "What is a 'variable' in programming?",
                ["A fixed number", "A container that stores data values", 
                 "A type of virus", "A programming language"],
                1,
                "Variables are like labeled boxes - you can store data in them."
            ),
            createQuestion(
                "What does 'IDE' stand for?",
                ["Internet Data Exchange", "Integrated Development Environment", 
                 "Internal Drive Engine", "Interactive Design Editor"],
                1,
                "An IDE is software that helps programmers write code."
            ),
            createQuestion(
                "What is a 'loop' in programming?",
                ["A circular cable", "Code that repeats instructions", 
                 "A type of error", "A database table"],
                1,
                "Loops let you run the same code block repeatedly."
            ),
            createQuestion(
                "What is 'syntax' in programming?",
                ["Speed of execution", "Rules for writing code correctly", 
                 "A software license", "Visual design of a website"],
                1,
                "Syntax is like grammar for programming."
            ),
            createQuestion(
                "What does 'CPU' stand for?",
                ["Central Processing Unit", "Computer Personal Unit", 
                 "Central Program Utility", "Core Processing Unit"],
                0,
                "The CPU is the 'brain' of the computer."
            ),
            createQuestion(
                "What is a 'function' in programming?",
                ["A math equation", "A reusable block of code", 
                 "A hardware component", "A file format"],
                1,
                "Functions wrap reusable logic into named blocks."
            ),
            createQuestion(
                "What is 'debugging'?",
                ["Removing viruses", "Finding and fixing errors", 
                 "Upgrading hardware", "Designing interfaces"],
                1,
                "Debugging is finding bugs (errors) in your code."
            )
        ];
    }

    // Storage
    function saveToStorage() {
        localStorage.setItem('quizQuestions', JSON.stringify(questions));
        localStorage.setItem('aiEnabled', JSON.stringify(aiEnabled));
    }

    function loadFromStorage() {
        const saved = localStorage.getItem('quizQuestions');
        const aiSaved = localStorage.getItem('aiEnabled');
        
        if (saved) {
            questions = JSON.parse(saved);
        }
        if (aiSaved) {
            aiEnabled = JSON.parse(aiSaved);
        }
        
        return !!saved;
    }

    // Screen management
    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    }

    // UI Updates
    function updateTotalQuestions() {
        document.getElementById('total-questions').textContent = questions.length;
    }

    function updateProgress() {
        const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
        document.getElementById('progress-fill').style.width = progress + '%';
    }

    function updateQuestionNumber() {
        document.getElementById('question-number').textContent = 
            `Question ${currentQuestionIndex + 1} of ${questions.length}`;
    }

    function updateScore() {
        document.getElementById('current-score').textContent = `Score: ${score}`;
    }

    // Quiz logic
    function displayQuestion() {
        const question = questions[currentQuestionIndex];
        
        updateProgress();
        updateQuestionNumber();
        updateScore();
        
        document.getElementById('question-text').textContent = question.question;
        
        const optionsContainer = document.getElementById('options-container');
        optionsContainer.innerHTML = '';
        
        const letters = ['A', 'B', 'C', 'D'];
        question.options.forEach((option, index) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.innerHTML = `<span class="option-letter">${letters[index]}</span>${option}`;
            btn.onclick = () => handleAnswer(index);
            optionsContainer.appendChild(btn);
        });
        
        // Reset AI hint
        document.getElementById('ai-hint-box').style.display = 'none';
        document.getElementById('ai-hint-text').textContent = '';
        
        // Show/hide hint button based on AI availability
        document.getElementById('hint-btn').style.display = aiEnabled ? 'block' : 'none';
        
        document.getElementById('feedback-box').classList.remove('show');
        document.getElementById('next-btn').style.display = 'none';
        
        isAnswered = false;
    }

    async function handleAnswer(selectedIndex) {
        if (isAnswered) return;
        
        isAnswered = true;
        const question = questions[currentQuestionIndex];
        const correctIndex = question.correct;
        const options = document.querySelectorAll('.option-btn');
        
        options.forEach(btn => btn.classList.add('disabled'));
        options[correctIndex].classList.add('correct');
        
        if (selectedIndex === correctIndex) {
            score++;
            document.getElementById('feedback-text').textContent = 'Correct! Well done!';
            document.getElementById('feedback-text').className = 'correct-text';
        } else {
            options[selectedIndex].classList.add('wrong');
            document.getElementById('feedback-text').textContent = 'Wrong answer!';
            document.getElementById('feedback-text').className = 'wrong-text';
            
            wrongAnswers.push({
                question: question,
                userAnswer: selectedIndex,
                correctAnswer: correctIndex
            });
        }
        
        document.getElementById('explanation-text').textContent = question.explanation;
        
        // AI Enhanced Explanation
        if (aiEnabled) {
            try {
                const aiExp = await ollamaAPI.generateExplanation(
                    question.question,
                    question.options[correctIndex],
                    question.explanation
                );
                document.getElementById('ai-explanation-text').textContent = aiExp;
                document.getElementById('ai-explanation').style.display = 'block';
            } catch (e) {
                document.getElementById('ai-explanation').style.display = 'none';
            }
        } else {
            document.getElementById('ai-explanation').style.display = 'none';
        }
        
        document.getElementById('feedback-box').classList.add('show');
        document.getElementById('next-btn').style.display = 'block';
        
        updateScore();
    }

    function nextQuestion() {
        currentQuestionIndex++;
        if (currentQuestionIndex < questions.length) {
            displayQuestion();
        } else {
            showResults();
        }
    }

    function showResults() {
        const percentage = Math.round((score / questions.length) * 100);
        
        document.getElementById('final-score').textContent = percentage;
        document.getElementById('correct-count').textContent = score;
        document.getElementById('total-count').textContent = questions.length;
        
        let message = '';
        if (percentage >= 90) message = 'Excellent! You are a programming wizard!';
        else if (percentage >= 70) message = 'Good job! Keep practicing!';
        else if (percentage >= 50) message = 'Not bad! Review and try again.';
        else message = 'Keep studying! You will get better with practice.';
        
        document.getElementById('result-message').textContent = message;
        
        showScreen('result-screen');
    }

    function displayReview() {
        const reviewList = document.getElementById('review-list');
        reviewList.innerHTML = '';
        
        if (wrongAnswers.length === 0) {
            reviewList.innerHTML = '<p style="text-align: center; color: #2ecc71; font-size: 1.2rem;">Perfect! You got all questions right!</p>';
        } else {
            const letters = ['A', 'B', 'C', 'D'];
            
            wrongAnswers.forEach((item, index) => {
                const div = document.createElement('div');
                div.className = 'review-item';
                div.innerHTML = `
                    <h4>Question ${index + 1}: ${item.question.question}</h4>
                    <p class="your-answer">Your answer: ${letters[item.userAnswer]}. ${item.question.options[item.userAnswer]}</p>
                    <p class="correct-answer">Correct answer: ${letters[item.correctAnswer]}. ${item.question.options[item.correctAnswer]}</p>
                    <p class="explanation">${item.question.explanation}</p>
                `;
                reviewList.appendChild(div);
            });
        }
        
        showScreen('review-screen');
    }

    function displayAllQuestions() {
        const list = document.getElementById('questions-list');
        list.innerHTML = '';
        
        const letters = ['A', 'B', 'C', 'D'];
        
        questions.forEach((q, index) => {
            const div = document.createElement('div');
            div.className = 'question-item';
            
            let optionsHtml = '<div class="options-list">';
            q.options.forEach((opt, i) => {
                const isCorrect = i === q.correct ? 'correct-opt' : '';
                optionsHtml += `<p class="${isCorrect}">${letters[i]}. ${opt}${i === q.correct ? ' ✓' : ''}</p>`;
            });
            optionsHtml += '</div>';
            
            div.innerHTML = `
                <h4>${index + 1}. ${q.question}</h4>
                ${optionsHtml}
                <p class="q-explanation">${q.explanation}</p>
            `;
            
            list.appendChild(div);
        });
        
        showScreen('view-screen');
    }

    // Public API
    return {
        init: function() {
            loadFromStorage();
            if (questions.length === 0) {
                questions = getDefaultQuestions();
                saveToStorage();
            }
            updateTotalQuestions();
            showScreen('ai-settings');
        },

        // AI Connection
        connectOllama: async function() {
            const url = document.getElementById('ollama-url').value;
            const model = document.getElementById('ollama-model').value;
            
            ollamaAPI.setConfig(url, model);
            
            const status = document.getElementById('ai-status');
            status.textContent = 'Connecting...';
            
            try {
                const result = await ollamaAPI.checkConnection();
                if (result.success) {
                    aiEnabled = true;
                    saveToStorage();
                    status.textContent = 'Connected! Using model: ' + model;
                    status.style.color = '#2ecc71';
                    document.getElementById('ai-badge').style.display = 'block';
                    setTimeout(() => this.showMenu(), 1000);
                } else {
                    status.textContent = result.message;
                    status.style.color = '#e74c3c';
                }
            } catch (e) {
                status.textContent = 'Connection failed. Is Ollama running?';
                status.style.color = '#e74c3c';
            }
        },

        skipAI: function() {
            aiEnabled = false;
            saveToStorage();
            this.showMenu();
        },

        // AI Features
        getAIHint: async function() {
            if (!aiEnabled) return;
            
            const question = questions[currentQuestionIndex];
            const hintBox = document.getElementById('ai-hint-box');
            const hintText = document.getElementById('ai-hint-text');
            
            hintBox.style.display = 'block';
            hintText.textContent = 'Getting hint from AI...';
            
            try {
                const hint = await ollamaAPI.getHint(question.question, question.options);
                hintText.textContent = hint;
            } catch (e) {
                hintText.textContent = 'Could not get hint. Try again.';
            }
        },

        generateAIExplanation: async function() {
            if (!aiEnabled) {
                alert('Please connect to Ollama first in AI Settings.');
                return;
            }
            
            const question = document.getElementById('new-question').value;
            const correctIdx = parseInt(document.getElementById('correct-answer').value);
            const options = [
                document.getElementById('opt-a').value,
                document.getElementById('opt-b').value,
                document.getElementById('opt-c').value,
                document.getElementById('opt-d').value
            ];
            
            if (!question || options.some(o => !o)) {
                alert('Please fill in the question and all options first.');
                return;
            }
            
            try {
                const explanation = await ollamaAPI.generateExplanation(
                    question, 
                    options[correctIdx], 
                    ''
                );
                document.getElementById('explanation').value = explanation;
            } catch (e) {
                alert('Failed to generate explanation. Make sure Ollama is running.');
            }
        },

        generateAIQuestions: function() {
            if (!aiEnabled) {
                alert('Please connect to Ollama first in AI Settings.');
                return;
            }
            showScreen('ai-generate-screen');
        },

        generateQuestionsFromAI: async function() {
            const topic = document.getElementById('ai-topic').value;
            const count = parseInt(document.getElementById('ai-count').value);
            const difficulty = document.getElementById('ai-difficulty').value;
            
            if (!topic) {
                alert('Please enter a topic.');
                return;
            }
            
            document.getElementById('ai-generating').style.display = 'block';
            
            try {
                const newQuestions = await ollamaAPI.generateQuestions(topic, count, difficulty);
                
                if (newQuestions.length > 0) {
                    questions = questions.concat(newQuestions);
                    saveToStorage();
                    updateTotalQuestions();
                    alert(`Generated ${newQuestions.length} new questions!`);
                    this.showMenu();
                } else {
                    alert('Could not generate questions. Try again with a different topic.');
                }
            } catch (e) {
                alert('Error generating questions: ' + e.message);
            } finally {
                document.getElementById('ai-generating').style.display = 'none';
            }
        },

        getAIStudyPlan: async function() {
            if (!aiEnabled) {
                alert('Please connect to Ollama first.');
                return;
            }
            
            if (wrongAnswers.length === 0) {
                alert('You got everything right! No study plan needed.');
                return;
            }
            
            showScreen('ai-study-screen');
            const content = document.getElementById('ai-study-content');
            content.innerHTML = '<p>Generating your personalized study plan...</p><div class="loading-spinner"></div>';
            
            try {
                const plan = await ollamaAPI.generateStudyPlan(wrongAnswers);
                content.innerHTML = `<div class="study-plan-text">${plan.replace(/\n/g, '<br>')}</div>`;
            } catch (e) {
                content.innerHTML = '<p>Failed to generate study plan. Please try again.</p>';
            }
        },

        // Navigation
        showMenu: function() {
            updateTotalQuestions();
            showScreen('menu-screen');
        },

        startQuiz: function() {
            if (questions.length === 0) {
                alert('No questions available! Add some first.');
                return;
            }
            
            currentQuestionIndex = 0;
            score = 0;
            wrongAnswers = [];
            
            showScreen('quiz-screen');
            displayQuestion();
        },

        nextQuestion: function() {
            nextQuestion();
        },

        showAddQuestion: function() {
            showScreen('add-screen');
        },

        handleAddQuestion: function(event) {
            event.preventDefault();
            
            const questionText = document.getElementById('new-question').value.trim();
            const optA = document.getElementById('opt-a').value.trim();
            const optB = document.getElementById('opt-b').value.trim();
            const optC = document.getElementById('opt-c').value.trim();
            const optD = document.getElementById('opt-d').value.trim();
            const correct = parseInt(document.getElementById('correct-answer').value);
            const explanation = document.getElementById('explanation').value.trim();
            
            const newQuestion = createQuestion(
                questionText,
                [optA, optB, optC, optD],
                correct,
                explanation
            );
            
            questions.push(newQuestion);
            saveToStorage();
            
            document.getElementById('add-question-form').reset();
            
            alert('Question added successfully!');
            this.showMenu();
        },

        showAllQuestions: function() {
            displayAllQuestions();
        },

        reviewWrongAnswers: function() {
            displayReview();
        },

        resetToDefaults: function() {
            if (confirm('Are you sure? This will delete all custom questions.')) {
                questions = getDefaultQuestions();
                saveToStorage();
                updateTotalQuestions();
                alert('Reset to default questions!');
            }
        }
    };
    
})();

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    quizApp.init();
});