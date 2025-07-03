// routes/memes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const Meme = require('../models/meme');
const authMiddleware = require('../middleware/authMiddleware'); // We'll create this next

// Configure Multer for in-memory storage (Cloudinary handles actual storage)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Upload Meme
router.post('/upload', authMiddleware, upload.single('memeImage'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image file provided' });
        }

        // Upload image to Cloudinary
        const result = await cloudinary.uploader.upload(
            `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
            { folder: 'vmeme_uploads' } // Optional: organize uploads in a folder
        );

        // Create new meme document in MongoDB
        const { title, tags } = req.body;
        const newMeme = new Meme({
            title,
            imageUrl: result.secure_url,
            tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
            uploader: req.user._id, // Set by authMiddleware
        });

        await newMeme.save();
        res.status(201).json({ message: 'Meme uploaded successfully', meme: newMeme });

    } catch (error) {
        console.error('Meme upload error:', error);
        res.status(500).json({ message: 'Server error during meme upload' });
    }
});

// Get all memes (with pagination)
router.get('/', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    try {
        const memes = await Meme.find()
                                .populate('uploader', 'username') // Get uploader's username
                                .sort({ createdAt: -1 }) // Sort by newest first
                                .skip(skip)
                                .limit(limit);
        const totalMemes = await Meme.countDocuments();
        res.json({
            memes,
            totalPages: Math.ceil(totalMemes / limit),
            currentPage: page
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching memes' });
    }
});

// Get memes by user (optional)
router.get('/user/:userId', async (req, res) => {
    try {
        const memes = await Meme.find({ uploader: req.params.userId })
                                .populate('uploader', 'username')
                                .sort({ createdAt: -1 });
        res.json(memes);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching user memes' });
    }
});

// Like/Unlike Meme
router.post('/:id/like', authMiddleware, async (req, res) => {
    try {
        const meme = await Meme.findById(req.params.id);
        if (!meme) {
            return res.status(404).json({ message: 'Meme not found' });
        }

        const userId = req.user._id;
        if (meme.likes.includes(userId)) {
            // Unlike
            meme.likes.pull(userId);
            await meme.save();
            res.json({ message: 'Meme unliked', likesCount: meme.likes.length });
        } else {
            // Like
            meme.likes.push(userId);
            await meme.save();
            res.json({ message: 'Meme liked', likesCount: meme.likes.length });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error during like operation' });
    }
});

// Add Comment
router.post('/:id/comment', authMiddleware, async (req, res) => {
    try {
        const meme = await Meme.findById(req.params.id);
        if (!meme) {
            return res.status(404).json({ message: 'Meme not found' });
        }

        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ message: 'Comment text is required' });
        }

        meme.comments.push({ user: req.user._id, text });
        await meme.save();
        // Populate the user field for the new comment before sending response
        const newComment = meme.comments[meme.comments.length - 1];
        await Meme.populate(newComment, { path: 'user', select: 'username' });

        res.status(201).json({ message: 'Comment added', comment: newComment });
    } catch (error) {
        res.status(500).json({ message: 'Server error during comment operation' });
    }
});


module.exports = router;