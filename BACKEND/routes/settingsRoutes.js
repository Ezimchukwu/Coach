const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// Get user settings
router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        // If user has no settings, create default settings
        if (!user.settings) {
            user.settings = {
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
            await user.save();
        }

        res.json({
            status: 'success',
            data: user.settings
        });
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to load settings. Please refresh the page.'
        });
    }
});

// Update settings
router.patch('/', auth, async (req, res) => {
    try {
        console.log('Received settings update request:', JSON.stringify(req.body, null, 2));
        
        // Validate request body
        const { notifications, communication, privacy, security } = req.body;
        if (!notifications && !communication && !privacy && !security) {
            console.error('Invalid request body - missing required sections:', req.body);
            return res.status(400).json({
                status: 'error',
                message: 'Invalid settings data provided'
            });
        }

        // Prepare settings update
        const settingsUpdate = {};

        if (notifications) {
            settingsUpdate['settings.notifications'] = {
                sessionReminders: Boolean(notifications.sessionReminders),
                reminderTime: String(notifications.reminderTime || '30'),
                messages: Boolean(notifications.messages),
                achievements: Boolean(notifications.achievements),
                resources: Boolean(notifications.resources)
            };
        }

        if (communication) {
            settingsUpdate['settings.communication'] = {
                preferredMethod: String(communication.preferredMethod || 'email'),
                timeZone: String(communication.timeZone || 'UTC')
            };
        }

        if (privacy) {
            settingsUpdate['settings.privacy'] = {
                profileVisibility: String(privacy.profileVisibility || 'public'),
                shareAchievements: Boolean(privacy.shareAchievements),
                shareProgress: Boolean(privacy.shareProgress)
            };
        }

        if (security) {
            settingsUpdate['settings.security'] = {
                twoFactorEnabled: Boolean(security.twoFactorEnabled)
            };
        }

        // Update settings using findOneAndUpdate
        const updatedUser = await User.findOneAndUpdate(
            { _id: req.user.id },
            { $set: settingsUpdate },
            { 
                new: true,
                runValidators: false,
                context: 'query'
            }
        );

        if (!updatedUser) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        console.log('Settings updated successfully');

        res.json({
            status: 'success',
            message: 'Settings updated successfully',
            data: updatedUser.settings
        });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Failed to update settings'
        });
    }
});

module.exports = router; 