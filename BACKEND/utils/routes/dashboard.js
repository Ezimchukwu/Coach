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

// Ensure upload directories exist
[uploadDir, profileUploadsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        try {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`Created directory: ${dir}`);
        } catch (err) {
            console.error(`Error creating directory ${dir}:`, err);
        }
    } else {
        console.log(`Directory exists: ${dir}`);
    }
});

// Configure multer for file uploads with simplified options
const upload = multer({
    storage: multer.diskStorage({
        destination: function(req, file, cb) {
            cb(null, profileUploadsDir);
        },
        filename: function(req, file, cb) {
            // Generate a unique filename with the original extension
            const ext = path.extname(file.originalname);
            const filename = 'profileImage-' + Date.now() + ext;
            cb(null, filename);
        }
    }),
    fileFilter: function(req, file, cb) {
        // Check file type
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files (jpeg, jpg, png, gif) are allowed!'));
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File size should be less than 5MB'
            });
        }
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    if (err) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    next();
};

// Upload profile photo
router.post('/profile/photo', auth, upload.single('photo'), async (req, res) => {
    try {
        console.log('Photo upload request received');
        
        if (!req.file) {
            console.log('No file in request');
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        console.log('File received:', {
            originalname: req.file.originalname,
            filename: req.file.filename,
            path: req.file.path,
            size: req.file.size
        });
        
        // Get the user
        const user = await User.findById(req.user.id);
        if (!user) {
            console.log('User not found:', req.user.id);
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Create a relative path to the uploaded file that works with the frontend
        const relativePath = `/uploads/profiles/${req.file.filename}`;
        console.log('Setting photo path to:', relativePath);
        
        // Update user profile
        user.photo = relativePath;
        await user.save();
        
        // Log the successful upload
        console.log(`Profile photo updated for user ${user.id}. Path: ${relativePath}`);
        
        // Return success response with multiple URLs for testing
        return res.status(200).json({
            success: true,
            message: 'Profile photo updated successfully',
            data: {
                photoUrl: relativePath,
                fileInfo: {
                    filename: req.file.filename,
                    originalname: req.file.originalname,
                    path: req.file.path,
                    size: req.file.size
                },
                urls: {
                    relative: relativePath,
                    direct: `/uploads/profiles/${req.file.filename}`,
                    absolute: `http://localhost:5000/uploads/profiles/${req.file.filename}`
                },
                user: {
                    id: user.id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    photo: relativePath
                }
            }
        });
    } catch (error) {
        console.error('Error uploading profile photo:', error);
        return res.status(500).json({
            success: false,
            message: 'Error uploading profile photo',
            error: error.message
        });
    }
});

// Get dashboard data
router.get('/data', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json({
            success: true,
            data: { user }
        });
    } catch (error) {
        console.error('Dashboard data error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard data'
        });
    }
});

// Update profile
router.patch('/profile', auth, async (req, res) => {
    try {
        console.log('Received profile update request:', req.body);
        
        // Check if no updates are provided
        if (Object.keys(req.body).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No updates provided'
            });
        }

        // Get allowed updates
        const allowedUpdates = ['firstName', 'lastName', 'bio', 'phoneNumber', 'location', 'name'];
        
        // Check if updates are valid
        const updates = Object.keys(req.body);
        const isValidOperation = updates.every(update => allowedUpdates.includes(update));

        if (!isValidOperation) {
            return res.status(400).json({
                success: false,
                message: 'Invalid updates provided'
            });
        }

        // Find user
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Handle splitting name into firstName and lastName if provided
        if (req.body.name && !req.body.firstName && !req.body.lastName) {
            const nameParts = req.body.name.split(' ');
            user.firstName = nameParts[0] || '';
            user.lastName = nameParts.slice(1).join(' ') || '';
        }
        
        // Apply updates directly to user object
        updates.forEach(update => {
            if (update !== 'name') { // Skip 'name' since we handle it separately
                user[update] = req.body[update];
            }
        });
        
        // Save updated user
        await user.save();
        
        // Log successful update
        console.log(`Profile updated for user ${user.id}`);
        console.log('Updated fields:', updates);
        
        // Return updated user data
        return res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    bio: user.bio,
                    phoneNumber: user.phoneNumber,
                    location: user.location,
                    photo: user.photo,
                    updatedAt: user.updatedAt
                }
            }
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        return res.status(500).json({
            success: false,
            message: 'Error updating profile',
            error: error.message
        });
    }
});

module.exports = router; 