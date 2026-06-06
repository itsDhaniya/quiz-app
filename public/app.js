const state = {
    questions: [],
    answers: {},
    currentMode: 'custom'
};

const elements = {
    btnCustom: document.getElementById('btn-custom'),
    btnPdf: document.getElementById('btn-pdf'),
    customSection: document.getElementById('custom-section'),
    pdfSection: document.getElementById('pdf-section'),
    contentInput: document.getElementById('content-input'),
    qCount: document.getElementById('q-count'),
    qType: document.getElementById('q-type'),
    generateBtn: document.getElementById('generate-btn'),
    dropZone: document.getElementById('drop-zone'),
    pdfInput: document.getElementById('pdf-input'),
    quizContainer: document.getElementById('quiz-container'),
    questionsList: document.getElementById('questions-list'),
    submitBtn: document.getElementById('submit-btn'),
    resultsContainer: document.getElementById('results-container'),
    scoreCard: document.getElementById('score-card'),
    detailedResults: document.getElementById('detailed-results'),
    retryBtn: document.getElementById('retry-btn'),
    loading: document.getElementById('loading'),
    pdfLoading: document.getElementById('pdf-loading'),
    progress: document.getElementById('progress')
};

elements.btnCustom.addEventListener('click', () => switchMode('custom'));
elements.btnPdf.addEventListener('click', () => switchMode('pdf'));

function switchMode(mode) {
    state.currentMode = mode;
    elements.btnCustom.classList.toggle('active', mode === 'custom');
    elements.btnPdf.classList.toggle('active', mode === 'pdf');
    elements.customSection.classList.toggle('active', mode === 'custom');
    elements.pdfSection.classList.toggle('active', mode === 'pdf');
}

elements.generateBtn.addEventListener('click', async () => {
    const content = elements.contentInput.value.trim();
    if (!content) return alert('Please enter some content');

    showLoading(true);
    try {
        const response = await fetch('/api/quiz/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content,
                count: parseInt(elements.qCount.value),
                type: elements.qType.value
            })
        });
        
        const data = await response.json();
        
        if (data.error) throw new Error(data.error);
        if (!data.questions || !Array.isArray(data.questions)) {
            throw new Error('Server returned invalid data');
        }
        
        startQuiz(data.questions);
    } catch (error) {
        alert('Error: ' + error.message);
        console.error('Full error:', error);
    } finally {
        showLoading(false);
    }
});

elements.dropZone.addEventListener('click', () => elements.pdfInput.click());
elements.dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.dropZone.classList.add('dragover');
});
elements.dropZone.addEventListener('dragleave', () => {
    elements.dropZone.classList.remove('dragover');
});
elements.dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length) handlePDF(files[0]);
});
elements.pdfInput.addEventListener('change', (e) => {
    if (e.target.files.length) handlePDF(e.target.files[0]);
});

async function handlePDF(file) {
    if (file.type !== 'application/pdf') return alert('Please upload a PDF file');
    
    elements.pdfLoading.classList.remove('hidden');
    const formData = new FormData();
    formData.append('pdf', file);

    try {
        const response = await fetch('/api/quiz/upload-pdf', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.error) throw new Error(data.error);
        if (!data.questions || !Array.isArray(data.questions)) {
            throw new Error('Server returned invalid data');
        }
        
        startQuiz(data.questions);
    } catch (error) {
        alert('Error: ' + error.message);
        console.error('Full error:', error);
    } finally {
        elements.pdfLoading.classList.add('hidden');
    }
}

function startQuiz(questions) {
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
        alert('Error: No valid questions received from server.');
        console.error('Invalid questions data:', questions);
        return;
    }
    
    state.questions = questions;
    state.answers = {};
    
    elements.questionsList.innerHTML = '';
    questions.forEach((q, idx) => renderQuestion(q, idx));
    
    updateProgress();
    
    elements.quizContainer.classList.remove('hidden');
    elements.resultsContainer.classList.add('hidden');
    elements.customSection.classList.remove('active');
    elements.pdfSection.classList.remove('active');
    elements.btnCustom.parentElement.classList.add('hidden');
}

function renderQuestion(question, idx) {
    if (!question || !question.options || !Array.isArray(question.options)) {
        console.error(`Invalid question at index ${idx}:`, question);
        return;
    }
    
    const card = document.createElement('div');
    card.className = 'question-card';
    card.innerHTML = `
        <h3>Q${idx + 1}. ${escapeHtml(question.question || 'No question text')}</h3>
        <div class="options-list">
            ${question.options.map((opt, optIdx) => `
                <div class="option" data-q="${idx}" data-opt="${optIdx}" onclick="selectOption(${idx}, ${optIdx})">
                    <div class="option-label">${String.fromCharCode(65 + optIdx)}</div>
                    <span>${escapeHtml(opt || '')}</span>
                </div>
            `).join('')}
        </div>
    `;
    elements.questionsList.appendChild(card);
}

window.selectOption = function(qIdx, optIdx) {
    state.answers[qIdx] = optIdx;
    
    const options = document.querySelectorAll(`[data-q="${qIdx}"]`);
    options.forEach(opt => opt.classList.remove('selected'));
    
    const selected = Array.from(options).find(opt => parseInt(opt.dataset.opt) === optIdx);
    if (selected) selected.classList.add('selected');
    
    updateProgress();
};

function updateProgress() {
    const answered = Object.keys(state.answers).length;
    const total = state.questions.length;
    elements.progress.style.width = total > 0 ? `${(answered / total) * 100}%` : '0%';
}

elements.submitBtn.addEventListener('click', async () => {
    if (Object.keys(state.answers).length < state.questions.length) {
        if (!confirm('You have unanswered questions. Submit anyway?')) return;
    }

    try {
        const response = await fetch('/api/quiz/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                answers: state.answers,
                questions: state.questions
            })
        });
        
        const results = await response.json();
        showResults(results);
    } catch (error) {
        alert('Scoring error: ' + error.message);
    }
});

function showResults(results) {
    elements.quizContainer.classList.add('hidden');
    elements.resultsContainer.classList.remove('hidden');
    
    const isPass = results.passed;
    elements.scoreCard.innerHTML = `
        <div class="score-circle ${isPass ? 'pass' : 'fail'}">
            ${results.percentage}%
        </div>
        <div class="grade">${results.grade}</div>
        <p>${results.score} / ${results.total} correct</p>
        <p style="color: ${isPass ? 'var(--success)' : 'var(--danger)'}; font-weight: 600;">
            ${isPass ? 'Passed!' : 'Try Again'}
        </p>
    `;
    
    elements.detailedResults.innerHTML = results.results.map((r, idx) => `
        <div class="result-item ${r.isCorrect ? '' : 'wrong'}">
            <div class="result-header">
                <strong>Q${idx + 1}.</strong>
                <span class="badge ${r.isCorrect ? 'correct' : 'incorrect'}">
                    ${r.isCorrect ? 'Correct' : 'Wrong'}
                </span>
            </div>
            <div>${escapeHtml(r.question)}</div>
            <div style="margin-top: 0.5rem;">
                <span style="color: ${r.isCorrect ? 'var(--success)' : 'var(--danger)'}">
                    Your answer: ${r.yourAnswer || 'Not answered'}
                </span>
                ${!r.isCorrect ? `<br><span style="color: var(--success)">Correct: ${r.correctAnswer}</span>` : ''}
            </div>
            ${r.explanation ? `<div class="explanation">${escapeHtml(r.explanation)}</div>` : ''}
        </div>
    `).join('');
}

elements.retryBtn.addEventListener('click', () => {
    elements.resultsContainer.classList.add('hidden');
    elements.btnCustom.parentElement.classList.remove('hidden');
    elements.btnCustom.click();
    elements.contentInput.value = '';
    elements.pdfInput.value = '';
});

function showLoading(show) {
    elements.loading.classList.toggle('hidden', !show);
    elements.generateBtn.disabled = show;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}