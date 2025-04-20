const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
const profileUploadsDir = path.join(uploadDir, 'profiles');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(profileUploadsDir)) {
    fs.mkdirSync(profileUploadsDir, { recursive: true });
}

// Configure multer for profile uploads
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, profileUploadsDir);
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: fileFilter
});

// Get public profile
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password -email -phone')
            .lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found'
            });
        }

        res.json({
            success: true,
            data: { user }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching profile'
        });
    }
});

// Update profile
router.put('/', auth, async (req, res) => {
    try {
        const allowedUpdates = ['firstName', 'lastName', 'email', 'bio', 'location', 'phoneNumber'];
        const updates = {};

        // Validate required fields
        if (!req.body.firstName || !req.body.lastName) {
            return res.status(400).json({
                success: false,
                message: 'First name and last name are required'
            });
        }

        // Validate email format if provided
        if (req.body.email && !req.body.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Build updates object with validated fields
        Object.keys(req.body).forEach(key => {
            if (allowedUpdates.includes(key) && req.body[key] !== undefined) {
                updates[key] = req.body[key].trim();
            }
        });

        // Find and update user
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Log successful update
        console.log('Profile updated successfully:', {
            userId: user._id,
            updatedFields: Object.keys(updates)
        });

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: { user }
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error updating profile'
        });
    }
});

// Upload profile photo
router.post('/photo', auth, upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please select an image to upload'
            });
        }

        const user = await User.findById(req.user.id);
        
        // Delete old photo if it exists
        if (user.photo && !user.photo.includes('default-avatar')) {
            const oldPhotoPath = path.join(profileUploadsDir, path.basename(user.photo));
            if (fs.existsSync(oldPhotoPath)) {
                fs.unlinkSync(oldPhotoPath);
            }
        }

        // Update user's photo path
        const photoUrl = `/uploads/profiles/${req.file.filename}`;
        user.photo = photoUrl;
        await user.save();

        res.json({
            success: true,
            data: {
                photoUrl,
                message: 'Profile photo updated successfully'
            }
        });
    } catch (error) {
        console.error('Photo upload error:', error);
        // Clean up uploaded file if there was an error
        if (req.file) {
            const filePath = path.join(profileUploadsDir, req.file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        res.status(500).json({
            success: false,
            message: 'Error uploading profile photo'
        });
    }
});

module.exports = router; 