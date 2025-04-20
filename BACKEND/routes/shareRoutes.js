const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const ShareableProfile = require('../models/ShareableProfile');
const crypto = require('crypto');

// Generate a shareable link
router.post('/generate-link', auth, async (req, res) => {
    try {
        const userId = req.user.id;

        // Generate a unique token for sharing
        const shareToken = crypto.randomBytes(32).toString('hex');

        // Create or update shareable profile
        let shareableProfile = await ShareableProfile.findOne({ userId });
        
        if (!shareableProfile) {
            shareableProfile = new ShareableProfile({
                userId,
                shareToken,
                settings: {
                    showEmail: false,
                    showPhone: false,
                    showLocation: true,
                    showBio: true
                },
                views: 0
            });
        } else {
            shareableProfile.shareToken = shareToken;
        }

        await shareableProfile.save();

        // Generate the shareable link
        const shareableLink = `${req.protocol}://${req.get('host')}/shared-profile/${shareToken}`;

        res.json({
            success: true,
            data: {
                shareableLink,
                shareInfo: {
                    views: shareableProfile.views,
                    lastViewed: shareableProfile.lastViewed
                }
            }
        });
    } catch (error) {
        console.error('Error generating share link:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate share link'
        });
    }
});

// Update share settings
router.put('/update-settings', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { settings } = req.body;

        let shareableProfile = await ShareableProfile.findOne({ userId });
        
        if (!shareableProfile) {
            shareableProfile = new ShareableProfile({
                userId,
                shareToken: crypto.randomBytes(32).toString('hex'),
                settings: {
                    ...settings
                }
            });
        } else {
            shareableProfile.settings = {
                ...shareableProfile.settings,
                ...settings
            };
        }

        await shareableProfile.save();

        res.json({
            success: true,
            data: {
                settings: shareableProfile.settings
            }
        });
    } catch (error) {
        console.error('Error updating share settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update share settings'
        });
    }
});

// Revoke share link
router.post('/revoke', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Delete the shareable profile
        await ShareableProfile.findOneAndDelete({ userId });

        res.json({
            success: true,
            message: 'Share link revoked successfully'
        });
    } catch (error) {
        console.error('Error revoking share link:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to revoke share link'
        });
    }
});

// Get shared profile
router.get('/profile/:token', async (req, res) => {
    try {
        const { token } = req.params;

        const shareableProfile = await ShareableProfile.findOne({ shareToken: token });
        
        if (!shareableProfile) {
            return res.status(404).json({
                success: false,
                message: 'Shared profile not found'
            });
        }

        // Update view count and last viewed
        shareableProfile.views += 1;
        shareableProfile.lastViewed = new Date();
        await shareableProfile.save();

        // Get user profile data
        const user = await User.findById(shareableProfile.userId).select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Filter data based on share settings
        const profileData = {
            name: `${user.firstName} ${user.lastName}`,
            photo: user.photo,
            bio: shareableProfile.settings.showBio ? user.bio : null,
            email: shareableProfile.settings.showEmail ? user.email : null,
            phone: shareableProfile.settings.showPhone ? user.phoneNumber : null,
            location: shareableProfile.settings.showLocation ? user.location : null
        };

        res.json({
            success: true,
            data: profileData
        });
    } catch (error) {
        console.error('Error fetching shared profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch shared profile'
        });
    }
});

module.exports = router; 