const express = require('express');
const router = express.Router();
const utils = require('../lib');

// Mock settings data
let settings = {
    theme: 'light',
    notifications: true,
    emailUpdates: true
};

// Get settings
router.get('/', (req, res) => {
    try {
        res.json(utils.formatSuccess(settings));
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json(utils.formatError(error));
    }
});

// Update settings
router.put('/', (req, res) => {
    try {
        const newSettings = req.body;
        settings = { ...settings, ...newSettings };
        res.json(utils.formatSuccess(settings));
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json(utils.formatError(error));
    }
});

module.exports = router; 