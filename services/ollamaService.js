const fetch = require('node-fetch');

class OllamaService {
  constructor() {
    this.baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3.2';
  }

  async generateQuestions(content, count = 5, type = 'mixed') {
    // Try AI first
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const prompt = this.buildPrompt(content, count, type, attempt);
        const response = await fetch(`${this.baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.model,
            prompt: prompt,
            stream: false,
            temperature: 0.8  // More creative/random
          })
        });

        if (!response.ok) throw new Error(`Status ${response.status}`);
        const data = await response.json();
        
        console.log(`=== ATTEMPT ${attempt + 1} RAW RESPONSE ===`);
        console.log(data.response.substring(0, 500));
        console.log('===========================');
        
        const parsed = this.parseResponse(data.response);
        if (parsed && parsed.length >= count) {
          return parsed.slice(0, count);
        }
      } catch (e) {
        console.error(`Attempt ${attempt + 1} failed:`, e.message);
      }
    }
    
    // If AI fails, use smart fallback
    console.log('AI failed, using smart fallback');
    return this.generateSmartFallback(content, count);
  }

  buildPrompt(content, count, type, attempt) {
    const questionTypes = [
      'definition (What is X? How does X work?)',
      'application (How would you use X in scenario Y?)',
      'comparison (What is the difference between X and Y?)',
      'cause_effect (What happens when X? What causes Y?)',
      'true_false (Is X true? Which statement about X is correct?)'
    ];
    
    // Rotate question types so they're not all the same
    const shuffledTypes = questionTypes.sort(() => Math.random() - 0.5).slice(0, 3);
    
    return `You are an expert teacher creating a quiz. Generate ${count} diverse, challenging quiz questions from this lecture content.

QUESTION VARIETY REQUIRED:
- Mix these types: ${shuffledTypes.join(', ')}
- DO NOT ask "what is mentioned" or "what was discussed"
- Ask students to APPLY, ANALYZE, or COMPARE concepts
- Make wrong answers plausible but clearly wrong to someone who knows the material

STRICT OUTPUT RULES:
1. Return ONLY a JSON array
2. No markdown, no explanation outside JSON
3. Each question: {"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"..."}

EXAMPLE GOOD QUESTIONS:
[
  {"question":"In distributed computing, what happens if one node fails in a system using redundancy?","options":["The entire system crashes","Other nodes continue processing the task","Data is permanently lost","The system switches to single-threaded mode"],"correct":1,"explanation":"Redundancy means multiple nodes can handle the same task, so failure of one doesn't stop the system."},
  {"question":"Which scenario BEST describes parallel computing?","options":["One person doing all chores sequentially","Multiple people doing different chores at the same time","One person doing one chore very fast","Multiple people waiting for one person to finish"],"correct":1,"explanation":"Parallel computing divides tasks among multiple processors working simultaneously."}
]

LECTURE CONTENT:
${content.substring(0, 5000)}`;
  }

  parseResponse(response) {
    try {
      let text = response.trim();
      
      // Remove markdown
      text = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      
      // Find array
      const start = text.indexOf('[');
      const end = text.lastIndexOf(']');
      if (start !== -1 && end !== -1 && end > start) {
        text = text.substring(start, end + 1);
      }
      
      // Fix JSON
      text = text.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}');
      
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) return null;
      
      return parsed.map(q => this.validateQuestion(q)).filter(q => q !== null);
    } catch (e) {
      return null;
    }
  }

  validateQuestion(q) {
    if (!q || typeof q !== 'object') return null;
    
    const question = String(q.question || '').trim();
    if (!question || question.length < 15) return null;
    
    // Reject bad patterns
    const badPatterns = [
      'what is mentioned',
      'what was discussed',
      'what is stated',
      'what is said',
      'in the following context',
      'based on the content',
      'according to the lecture'
    ];
    if (badPatterns.some(p => question.toLowerCase().includes(p))) return null;
    
    // Ensure options are diverse
    const options = Array.isArray(q.options) && q.options.length >= 4
      ? q.options.slice(0, 4).map(o => String(o || '').substring(0, 100))
      : ['Option A', 'Option B', 'Option C', 'Option D'];
    
    return {
      question: question.substring(0, 250),
      options,
      correct: Math.max(0, Math.min(3, parseInt(q.correct) || 0)),
      explanation: String(q.explanation || 'Review the material.').substring(0, 300)
    };
  }

  // Smart fallback that generates REAL questions, not recall
  generateSmartFallback(content, count) {
    const sentences = content
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20 && s.length < 300);
    
    // Extract key concepts (capitalized phrases, technical terms)
    const conceptMatches = content.match(/\b[A-Z][a-zA-Z\s]{2,20}\b/g) || [];
    const concepts = [...new Set(conceptMatches)].filter(c => c.length > 3).slice(0, 20);
    
    // Extract definitions
    const definitions = sentences.filter(s => 
      /is a|is an|refers to|means|defined as|consists of|involves|characterized by/i.test(s)
    );
    
    const questions = [];
    const usedConcepts = new Set();
    
    // Type 1: Definition questions (but phrased as application)
    for (let i = 0; i < Math.min(2, definitions.length); i++) {
      const def = definitions[i];
      const match = def.match(/^([^,]{3,40})\s+(?:is|are|refers to)\s+(?:a|an|the)?\s*(.{10,80})/i);
      if (!match) continue;
      
      const concept = match[1].trim();
      const meaning = match[2].trim();
      
      if (usedConcepts.has(concept)) continue;
      usedConcepts.add(concept);
      
      // Create application-style question
      const scenarios = [
        `A system where ${meaning.toLowerCase()}. What concept is being described?`,
        `Which of the following best describes ${concept}?`,
        `In a system using ${concept}, what would be the expected outcome?`
      ];
      
      questions.push({
        question: scenarios[i % 3],
        options: this.shuffleArray([
          concept,
          ...this.getWrongConcepts(concepts, concept, 3)
        ]),
        correct: 0, // Will be shuffled
        explanation: `The lecture defines ${concept} as: "${def.substring(0, 120)}..."`
      });
    }
    
    // Type 2: Cause/Effect questions
    const causeEffect = sentences.filter(s => 
      /results? in|leads? to|causes?|because|therefore|thus|consequently/i.test(s)
    );
    
    for (let i = 0; i < Math.min(2, causeEffect.length); i++) {
      const sent = causeEffect[i];
      const parts = sent.split(/\s+(?:results? in|leads? to|causes?|therefore|thus)\s+/i);
      if (parts.length < 2) continue;
      
      questions.push({
        question: `What is the result of ${parts[0].substring(0, 60)}?`,
        options: this.shuffleArray([
          parts[1].substring(0, 80),
          'No significant change occurs',
          'The opposite effect happens',
          'It depends on external factors'
        ]),
        correct: 0,
        explanation: `The lecture states: "${sent.substring(0, 150)}..."`
      });
    }
    
    // Type 3: Comparison/Contrast
    const comparisons = sentences.filter(s => 
      /compared to|versus|unlike|difference between|similar to|both|while|whereas/i.test(s)
    );
    
    for (let i = 0; i < Math.min(2, comparisons.length); i++) {
      const sent = comparisons[i];
      const concepts = sent.match(/\b[A-Z][a-zA-Z]{2,15}\b/g) || [];
      if (concepts.length < 2) continue;
      
      questions.push({
        question: `What is the key difference between ${concepts[0]} and ${concepts[1]}?`,
        options: this.shuffleArray([
          sent.substring(0, 80),
          'They are identical in function',
          'One is hardware, one is software',
          'There is no practical difference'
        ]),
        correct: 0,
        explanation: `The lecture notes: "${sent.substring(0, 150)}..."`
      });
    }
    
    // Type 4: True/False style (but as multiple choice)
    const facts = sentences.filter(s => s.length > 40 && !s.includes('?'));
    for (let i = 0; i < Math.min(2, facts.length); i++) {
      const fact = facts[i];
      const negated = fact.replace(/\bis\b/g, 'is not').replace(/\bcan\b/g, 'cannot').replace(/\bwill\b/g, 'will not');
      
      questions.push({
        question: `Which statement about this topic is CORRECT?`,
        options: this.shuffleArray([
          fact.substring(0, 100),
          negated.substring(0, 100),
          'This topic is not covered in the lecture',
          'All of the above are correct'
        ]),
        correct: 0,
        explanation: `The lecture confirms: "${fact.substring(0, 120)}..."`
      });
    }
    
    // Shuffle correct answers so they're not always A
    questions.forEach(q => {
      const correctOption = q.options[q.correct];
      q.options = this.shuffleArray(q.options);
      q.correct = q.options.indexOf(correctOption);
    });
    
    // Fill remaining with generic but varied questions
    const templates = [
      { q: 'Which of the following is a KEY characteristic of this topic?', opts: ['Main feature from text', 'Minor detail', 'Unrelated concept', 'Opposite of what was taught'] },
      { q: 'If you were implementing this in a real system, what would be the FIRST step?', opts: ['Planning/Analysis', 'Random implementation', 'Skipping documentation', 'Ignoring constraints'] },
      { q: 'What is the PRIMARY advantage discussed in the lecture?', opts: ['Efficiency/Performance', 'Cost reduction', 'Simplicity', 'No advantage mentioned'] },
      { q: 'Which scenario would MOST LIKELY require this concept?', opts: ['Large-scale system', 'Single-user application', 'Static website', 'Manual process'] },
      { q: 'What is the MAIN challenge or limitation mentioned?', opts: ['Complexity/Coordination', 'Speed', 'Cost', 'No challenges exist'] }
    ];
    
    while (questions.length < count) {
      const t = templates[questions.length % templates.length];
      questions.push({
        question: t.q,
        options: this.shuffleArray(t.opts),
        correct: 0,
        explanation: 'Review the lecture material for this topic.'
      });
    }
    
    return questions.slice(0, count);
  }

  getWrongConcepts(allConcepts, correct, count) {
    const wrong = allConcepts.filter(c => c !== correct && c.length > 3);
    const shuffled = wrong.sort(() => Math.random() - 0.5);
    const result = shuffled.slice(0, count);
    while (result.length < count) {
      result.push(`Alternative ${result.length + 1}`);
    }
    return result;
  }

  shuffleArray(arr) {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

const ollamaService = new OllamaService();
module.exports = ollamaService;