const Settings = require('../models/settingsModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Mock data for settings
const mockSettings = {};

// Helper function to get default settings for a user
function getDefaultSettings(userId) {
    return {
        user: userId,
        notifications: {
            sessionReminders: true,
            reminderTime: '30',
            messages: true,
            achievements: true,
            resources: false
        },
        communication: {
            preferredMethod: 'email',
            timeZone: 'UTC'
        },
        privacy: {
            profileVisibility: 'public',
            shareAchievements: true,
            shareProgress: false
        },
        security: {
            twoFactorEnabled: false
        }
    };
}

// Get current user's settings
exports.getMySettings = catchAsync(async (req, res, next) => {
    let settings;
    
    if (global.useMockDb) {
        // Use mock data in development mode
        if (!mockSettings[req.user._id]) {
            mockSettings[req.user._id] = getDefaultSettings(req.user._id);
        }
        settings = mockSettings[req.user._id];
    } else {
        // Find settings document for current user
        settings = await Settings.findOne({ user: req.user.id });
        
        // If no settings found, create default settings
        if (!settings) {
            settings = await Settings.createDefaultSettings(req.user.id);
        }
    }
    
    res.status(200).json({
        status: 'success',
        data: settings
    });
});

// Update user settings
exports.updateMySettings = catchAsync(async (req, res, next) => {
    let settings;
    
    if (global.useMockDb) {
        // Use mock data in development mode
        if (!mockSettings[req.user._id]) {
            mockSettings[req.user._id] = getDefaultSettings(req.user._id);
        }
        
        // Update each section if provided
        const { notifications, communication, privacy, security } = req.body;
        
        if (notifications) {
            mockSettings[req.user._id].notifications = {
                ...mockSettings[req.user._id].notifications,
                ...notifications
            };
        }
        
        if (communication) {
            mockSettings[req.user._id].communication = {
                ...mockSettings[req.user._id].communication,
                ...communication
            };
        }
        
        if (privacy) {
            mockSettings[req.user._id].privacy = {
                ...mockSettings[req.user._id].privacy,
                ...privacy
            };
        }
        
        if (security) {
            mockSettings[req.user._id].security = {
                ...mockSettings[req.user._id].security,
                ...security
            };
        }
        
        settings = mockSettings[req.user._id];
    } else {
        // Find settings document for current user
        settings = await Settings.findOne({ user: req.user.id });
        
        // If no settings found, create default settings
        if (!settings) {
            settings = await Settings.createDefaultSettings(req.user.id);
        }
        
        // Validate update data
        const { notifications, communication, privacy, security } = req.body;
        
        // Update each section if provided
        if (notifications) {
            settings.notifications = {
                ...settings.notifications.toObject(),
                ...notifications
            };
        }
        
        if (communication) {
            settings.communication = {
                ...settings.communication.toObject(),
                ...communication
            };
        }
        
        if (privacy) {
            settings.privacy = {
                ...settings.privacy.toObject(),
                ...privacy
            };
        }
        
        if (security) {
            settings.security = {
                ...settings.security.toObject(),
                ...security
            };
        }
        
        // Save updated settings
        await settings.save();
    }
    
    res.status(200).json({
        status: 'success',
        message: 'Settings updated successfully',
        data: settings
    });
});

// Reset settings to default
exports.resetSettings = catchAsync(async (req, res, next) => {
    if (global.useMockDb) {
        // Reset mock settings
        mockSettings[req.user._id] = getDefaultSettings(req.user._id);
        settings = mockSettings[req.user._id];
    } else {
        // Delete current settings
        await Settings.findOneAndDelete({ user: req.user.id });
        
        // Create new default settings
        settings = await Settings.createDefaultSettings(req.user.id);
    }
    
    res.status(200).json({
        status: 'success',
        message: 'Settings reset to default',
        data: settings
    });
}); 