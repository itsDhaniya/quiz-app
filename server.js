const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const quizRoutes = require('./routes/quiz');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use('/api/quiz', quizRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));