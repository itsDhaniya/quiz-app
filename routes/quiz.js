const express = require('express');
const multer = require('multer');
const router = express.Router();
const ollamaService = require('../services/ollamaService');
const pdfService = require('../services/pdfService');

const upload = multer({ dest: 'uploads/' });

router.post('/generate', async (req, res) => {
  try {
    const { content, count = 5, type = 'mixed' } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });
    const questions = await ollamaService.generateQuestions(content, count, type);
    res.json({ questions, source: 'custom' });
  } catch (error) {
    console.error('Generate error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/upload-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'PDF required' });
    const fs = require('fs');
    const buffer = fs.readFileSync(req.file.path);
    const text = await pdfService.extractText(buffer);
    fs.unlinkSync(req.file.path);
    const questions = await ollamaService.generateQuestions(text, 10, 'mixed');
    res.json({ questions, source: 'pdf', extractedLength: text.length });
  } catch (error) {
    console.error('PDF upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/score', (req, res) => {
  const { answers, questions } = req.body;
  if (!answers || !questions) {
    return res.status(400).json({ error: 'Answers and questions required' });
  }

  let correct = 0;
  const results = questions.map((q, idx) => {
    const isCorrect = answers[idx] === q.correct;
    if (isCorrect) correct++;
    return {
      question: q.question,
      yourAnswer: answers[idx] !== undefined ? q.options[answers[idx]] : 'Not answered',
      correctAnswer: q.options[q.correct],
      isCorrect,
      explanation: q.explanation
    };
  });

  const percentage = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
  const grade = percentage >= 90 ? 'A' : 
                percentage >= 80 ? 'B' : 
                percentage >= 70 ? 'C' : 
                percentage >= 60 ? 'D' : 'F';

  res.json({
    score: correct,
    total: questions.length,
    percentage,
    grade,
    results,
    passed: percentage >= 50  // ← CHANGED: 50% is now pass
  });
});

module.exports = router;