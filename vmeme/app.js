// app.js
require('dotenv').config(); // Load environment variables first
const mongoose = require('mongoose');

//connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());
//app.use(compression());

//add the path to the routes
const authRoutes = require('./routes/auth');
 app.use('/api/auth', authRoutes);

const memeRoutes = require('./routes/meme');
 app.use('/api/memes', memeRoutes);

const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

// For any other routes, serve the index.html (useful for single-page apps)
app.get('/{*any}', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});


// Basic route
app.get('/', (req, res) => {
    res.send('VMeme Backend API is running!');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});