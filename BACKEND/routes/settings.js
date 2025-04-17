const express = require('express');
const router = express.Router();

// Mock settings data store
let settingsStore = new Map();

// Default settings
const defaultSettings = {
    notifications: {
        sessionReminders: true,
        reminderTime: '1hour',
        messages: true,
        achievements: true,
        resources: true
    },
    communication: {
        preferredMethod: 'email',
        timeZone: 'UTC'
    },
    privacy: {
        profileVisibility: 'public',
        shareAchievements: true,
        shareProgress: true
    },
    security: {
        twoFactorAuth: false
    }
};

// Get settings for a user
router.get('/', (req, res) => {
    try {
        // In a real app, we would get the user ID from the authenticated session
        const userId = req.user?.id || 'default';
        
        // Get user's settings or return default settings
        const userSettings = settingsStore.get(userId) || defaultSettings;
        
        res.json(userSettings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ 
            status: 'error',
            message: 'Failed to load settings. Please refresh the page.'
        });
    }
});

// Update settings for a user
router.patch('/', (req, res) => {
    try {
        // In a real app, we would get the user ID from the authenticated session
        const userId = req.user?.id || 'default';
        
        // Get current settings or use defaults
        const currentSettings = settingsStore.get(userId) || defaultSettings;
        
        // Merge new settings with current settings
        const updatedSettings = {
            ...currentSettings,
            ...req.body,
            // Ensure nested objects are properly merged
            notifications: {
                ...currentSettings.notifications,
                ...(req.body.notifications || {})
            },
            communication: {
                ...currentSettings.communication,
                ...(req.body.communication || {})
            },
            privacy: {
                ...currentSettings.privacy,
                ...(req.body.privacy || {})
            },
            security: {
                ...currentSettings.security,
                ...(req.body.security || {})
            }
        };
        
        // Validate settings (basic example)
        if (updatedSettings.notifications?.reminderTime && 
            !['30mins', '1hour', '2hours', '1day'].includes(updatedSettings.notifications.reminderTime)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid reminder time setting'
            });
        }
        
        // Save updated settings
        settingsStore.set(userId, updatedSettings);
        
        res.json({
            status: 'success',
            data: updatedSettings
        });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update settings. Please try again.'
        });
    }
});

module.exports = router; 