// models/Meme.js
const mongoose = require('mongoose');

const MemeSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    imageUrl: { type: String, required: true },
    tags: [{ type: String, trim: true }],
    uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        text: { type: String, required: true, trim: true },
        createdAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Meme', MemeSchema);