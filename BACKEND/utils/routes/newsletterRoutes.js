const express = require('express');
const router = express.Router();
const Subscriber = require('../models/Subscriber');

// Subscribe to newsletter
router.post('/subscribe', async (req, res) => {
    try {
        console.log('Received newsletter subscription request:', req.body);
        const { name, email, interest, privacyAccepted } = req.body;

        // Validate required fields
        if (!name || !email || !interest || !privacyAccepted) {
            console.log('Missing required fields:', { name, email, interest, privacyAccepted });
            return res.status(400).json({
                status: 'error',
                message: 'Please provide all required fields'
            });
        }

        // Check if email already exists
        const existingSubscriber = await Subscriber.findOne({ email });
        if (existingSubscriber) {
            return res.status(400).json({
                status: 'error',
                message: 'This email is already subscribed to our newsletter'
            });
        }

        // Create new subscriber
        const subscriber = await Subscriber.create({
            name,
            email,
            interest,
            privacyAccepted
        });

        // Send success response
        res.status(201).json({
            status: 'success',
            message: 'Thank you for subscribing to our newsletter!',
            data: {
                subscriber
            }
        });

    } catch (error) {
        console.error('Newsletter subscription error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Something went wrong. Please try again.'
        });
    }
});

module.exports = router; 