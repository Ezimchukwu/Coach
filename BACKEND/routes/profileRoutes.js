const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Get public profile by ID
router.get('/:id', async (req, res) => {
    try {
        console.log(`Fetching profile for ID: ${req.params.id}`);
        
        const user = await User.findById(req.params.id)
            .select('name firstName lastName bio photo location settings.privacy');

        if (!user) {
            console.log(`Profile not found for ID: ${req.params.id}`);
            return res.status(404).json({
                success: false,
                message: 'Profile not found'
            });
        }

        console.log(`Found profile for user: ${user.name || user._id}`);

        // Check privacy settings
        if (user.settings?.privacy?.profileVisibility === 'private') {
            return res.status(403).json({
                success: false,
                message: 'This profile is private'
            });
        }

        // If we're using the name field instead of firstName/lastName
        let firstName = user.firstName;
        let lastName = user.lastName;
        
        if ((!firstName || !lastName) && user.name) {
            const nameParts = user.name.split(' ');
            firstName = nameParts[0] || '';
            lastName = nameParts.slice(1).join(' ') || '';
        }

        // Return public profile data
        res.json({
            success: true,
            data: {
                firstName: firstName,
                lastName: lastName,
                bio: user.bio,
                photo: user.photo,
                location: user.location
            }
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching profile'
        });
    }
});

module.exports = router; 