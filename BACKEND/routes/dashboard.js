const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Session = require('../models/Session');
const Resource = require('../models/Resource');
const Activity = require('../models/Activity');
const Goal = require('../models/Goal');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
const profileUploadsDir = path.join(uploadDir, 'profiles');

// Ensure directories exist
[uploadDir, profileUploadsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        try {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`Created directory: ${dir}`);
        } catch (err) {
            console.error(`Error creating directory ${dir}:`, err);
        }
    }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        // Log the destination path
        console.log('Upload destination:', profileUploadsDir);
        cb(null, profileUploadsDir);
    },
    filename: function(req, file, cb) {
        // Create a unique filename with original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = 'profileImage-' + uniqueSuffix + path.extname(file.originalname);
        console.log('Generated filename:', filename);
        cb(null, filename);
    }
});

// File filter function
const fileFilter = (req, file, cb) => {
    console.log('Received file:', {
        originalname: file.originalname,
        mimetype: file.mimetype
    });
    
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        console.log('File rejected: not an allowed image type');
        return cb(new Error('Only image files (jpg, jpeg, png, gif) are allowed!'), false);
    }
    console.log('File accepted');
    cb(null, true);
};

// Configure multer upload
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1 // Only 1 file per request
    },
    fileFilter: fileFilter
}).single('photo'); // 'photo' is the field name

// Wrapper for handling multer upload with better error handling
const handleUpload = (req, res, next) => {
    upload(req, res, function(err) {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'File is too large. Maximum size is 5MB'
                });
            }
            return res.status(400).json({
                success: false,
                message: err.message
            });
        } else if (err) {
            // An unknown error occurred
            return res.status(400).json({
                success: false,
                message: err.message || 'Error uploading file'
            });
        }
        // Everything went fine
        next();
    });
};

// Get user dashboard data
router.get('/data', auth, async (req, res) => {
    try {
        // First get the user without population
        const user = await User.findById(req.user.id)
            .select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Safely populate references
        if (user.goals && user.goals.length > 0) {
            try {
                await user.populate('goals');
            } catch (error) {
                console.log('Error populating goals:', error.message);
                user.goals = [];
            }
        }

        if (user.sessions && user.sessions.length > 0) {
            try {
                await user.populate('sessions');
            } catch (error) {
                console.log('Error populating sessions:', error.message);
                user.sessions = [];
            }
        }

        if (user.resources && user.resources.length > 0) {
            try {
                await user.populate('resources');
            } catch (error) {
                console.log('Error populating resources:', error.message);
                user.resources = [];
            }
        }

        // Get stats
        const stats = {
            totalSessions: await Session.countDocuments({ user: req.user.id }).catch(() => 0),
            membershipTier: user.membershipTier || 'basic',
            resourcesCount: await Resource.countDocuments({ user: req.user.id }).catch(() => 0),
            achievementPoints: user.achievementPoints || 0
        };

        // Get activities with error handling
        let activities = [];
        try {
            activities = await Activity.find({ user: req.user.id })
                .sort('-createdAt')
                .limit(10);
        } catch (error) {
            console.log('Error fetching activities:', error.message);
        }

        // Get upcoming sessions with error handling
        let upcomingSessions = [];
        try {
            upcomingSessions = await Session.find({
                user: req.user.id,
                startTime: { $gt: new Date() }
            })
            .sort('startTime')
            .limit(5)
            .populate('coach', 'name photo');
        } catch (error) {
            console.log('Error fetching upcoming sessions:', error.message);
        }

        res.json({
            success: true,
            data: {
                user,
                stats,
                activities,
                upcomingSessions
            }
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
        const { name, bio, location, website } = req.body;
        const user = await User.findById(req.user.id);

        if (name) user.name = name;
        if (bio) user.bio = bio;
        if (location) user.location = location;
        if (website) user.website = website;

        await user.save();

        res.json({
            success: true,
            data: { user }
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating profile'
        });
    }
});

// Upload profile photo with improved error handling
router.post('/profile/photo', auth, handleUpload, async (req, res) => {
    try {
        console.log('Profile photo upload request received');
        
        if (!req.file) {
            console.log('No file received in request');
            return res.status(400).json({
                success: false,
                message: 'Please select an image to upload'
            });
        }

        console.log('File uploaded:', {
            filename: req.file.filename,
            path: req.file.path,
            destination: req.file.destination
        });

        const user = await User.findById(req.user.id);
        if (!user) {
            console.log('User not found:', req.user.id);
            // Delete uploaded file if user not found
            if (req.file) {
                const filePath = path.join(profileUploadsDir, req.file.filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log('Deleted uploaded file due to user not found');
                }
            }
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Delete old photo if it exists
        if (user.photo && user.photo !== 'default.jpg') {
            const oldPhotoPath = path.join(profileUploadsDir, path.basename(user.photo));
            console.log('Attempting to delete old photo:', oldPhotoPath);
            if (fs.existsSync(oldPhotoPath)) {
                fs.unlinkSync(oldPhotoPath);
                console.log('Old photo deleted successfully');
            }
        }

        // Store only the relative path
        const photoPath = `/uploads/profiles/${req.file.filename}`;
        console.log('New photo path:', photoPath);
        user.photo = photoPath;
        await user.save();

        // Return the full URL in the response
        const photoUrl = `http://localhost:5000${photoPath}`;
        console.log('Full photo URL for client:', photoUrl);

        res.json({
            success: true,
            data: {
                photoUrl: photoUrl,
                message: 'Profile photo updated successfully'
            }
        });
    } catch (error) {
        console.error('Photo upload error:', error);
        // If an error occurs, try to delete the uploaded file
        if (req.file) {
            const filePath = path.join(profileUploadsDir, req.file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log('Deleted uploaded file due to error');
            }
        }
        res.status(500).json({
            success: false,
            message: 'Error uploading profile photo'
        });
    }
});

// Configure multer for cover uploads
const coverStorage = multer.diskStorage({
    destination: function(req, file, cb) {
        const coverUploadsDir = path.join(uploadDir, 'covers');
        if (!fs.existsSync(coverUploadsDir)) {
            fs.mkdirSync(coverUploadsDir, { recursive: true });
        }
        cb(null, coverUploadsDir);
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'cover-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const coverUpload = multer({
    storage: coverStorage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1
    },
    fileFilter: fileFilter
}).single('cover');

// Wrapper for handling cover upload
const handleCoverUpload = (req, res, next) => {
    coverUpload(req, res, function(err) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'File is too large. Maximum size is 5MB'
                });
            }
            return res.status(400).json({
                success: false,
                message: err.message
            });
        } else if (err) {
            return res.status(400).json({
                success: false,
                message: err.message || 'Error uploading cover'
            });
        }
        next();
    });
};

// Upload cover image
router.post('/profile/cover', auth, handleCoverUpload, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please select an image to upload'
            });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            // Delete uploaded file if user not found
            if (req.file) {
                const filePath = path.join(uploadDir, 'covers', req.file.filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Delete old cover if it exists
        if (user.coverPhoto) {
            const oldCoverPath = path.join(uploadDir, 'covers', path.basename(user.coverPhoto));
            if (fs.existsSync(oldCoverPath)) {
                fs.unlinkSync(oldCoverPath);
            }
        }

        // Update user's cover photo path
        const coverUrl = `/uploads/covers/${req.file.filename}`;
        user.coverPhoto = coverUrl;
        await user.save();

        res.json({
            success: true,
            data: {
                coverUrl: coverUrl,
                message: 'Cover photo updated successfully'
            }
        });
    } catch (error) {
        console.error('Cover upload error:', error);
        // If an error occurs, try to delete the uploaded file
        if (req.file) {
            const filePath = path.join(uploadDir, 'covers', req.file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        res.status(500).json({
            success: false,
            message: 'Error uploading cover photo'
        });
    }
});

// Get notifications
router.get('/notifications', auth, async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user.id })
            .sort('-createdAt')
            .limit(20);

        const unreadCount = await Notification.countDocuments({
            user: req.user.id,
            read: false
        });

        res.json({
            success: true,
            data: {
                notifications,
                unreadCount
            }
        });
    } catch (error) {
        console.error('Notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching notifications'
        });
    }
});

// Get messages
router.get('/messages', auth, async (req, res) => {
    try {
        const messages = await Message.find({
            $or: [
                { sender: req.user.id },
                { recipient: req.user.id }
            ]
        })
        .sort('-createdAt')
        .limit(20)
        .populate('sender', 'name photo')
        .populate('recipient', 'name photo');

        const unreadCount = await Message.countDocuments({
            recipient: req.user.id,
            read: false
        });

        res.json({
            success: true,
            data: {
                messages,
                unreadCount
            }
        });
    } catch (error) {
        console.error('Messages error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching messages'
        });
    }
});

// Create new goal
router.post('/goals', auth, async (req, res) => {
    try {
        const { title, targetDate, description } = req.body;
        const goal = new Goal({
            user: req.user.id,
            title,
            targetDate,
            description
        });

        await goal.save();

        res.json({
            success: true,
            data: { goal }
        });
    } catch (error) {
        console.error('Goal creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating goal'
        });
    }
});

// Update goal progress
router.patch('/goals/:goalId/progress', auth, async (req, res) => {
    try {
        const { progress } = req.body;
        const goal = await Goal.findOne({
            _id: req.params.goalId,
            user: req.user.id
        });

        if (!goal) {
            return res.status(404).json({
                success: false,
                message: 'Goal not found'
            });
        }

        goal.progress = progress;
        await goal.save();

        res.json({
            success: true,
            data: { goal }
        });
    } catch (error) {
        console.error('Goal progress update error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating goal progress'
        });
    }
});

// Schedule new session
router.post('/sessions', auth, async (req, res) => {
    try {
        const { coachId, startTime, duration, topic } = req.body;
        const session = new Session({
            user: req.user.id,
            coach: coachId,
            startTime,
            duration,
            topic
        });

        await session.save();

        // Create activity
        const activity = new Activity({
            user: req.user.id,
            type: 'session_scheduled',
            reference: session._id,
            description: `Scheduled a new session: ${topic}`
        });

        await activity.save();

        res.json({
            success: true,
            data: { session }
        });
    } catch (error) {
        console.error('Session scheduling error:', error);
        res.status(500).json({
            success: false,
            message: 'Error scheduling session'
        });
    }
});

// Share profile
router.post('/profile/share', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const shareableProfile = {
            name: user.name,
            bio: user.bio,
            photo: user.photo,
            achievements: user.achievements
        };

        res.json({
            success: true,
            data: {
                shareableProfile,
                shareUrl: `${process.env.FRONTEND_URL}/profile/${user._id}`
            }
        });
    } catch (error) {
        console.error('Profile sharing error:', error);
        res.status(500).json({
            success: false,
            message: 'Error sharing profile'
        });
    }
});

module.exports = router; 