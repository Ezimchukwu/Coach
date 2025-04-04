const express = require('express');
const router = express.Router();

// Mock settings data
let settings = {
    theme: 'light',
    notifications: true,
    emailUpdates: true
};

// Get settings
router.get('/', (req, res) => {
    try {
        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ message: 'Failed to load settings. Please refresh the page.' });
    }
});

// Update settings
router.put('/', (req, res) => {
    try {
        const newSettings = req.body;
        settings = { ...settings, ...newSettings };
        res.json(settings);
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ message: 'Failed to update settings' });
    }
});

module.exports = router; 