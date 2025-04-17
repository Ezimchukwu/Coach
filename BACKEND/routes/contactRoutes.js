const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Validate email format
const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

// Submit contact form
router.post('/submit', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        // Validate required fields
        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name, email and message'
            });
        }

        // Validate email format
        if (!validateEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address'
            });
        }

        // TODO: Here you would typically:
        // 1. Save the message to a database
        // 2. Send an email notification
        // 3. Create a ticket in your support system
        // For now, we'll just simulate success

        // Check if the sender is a registered user
        const user = await User.findOne({ email });
        
        // Store contact form data (you might want to create a Contact model for this)
        const contactData = {
            name,
            email,
            subject: subject || 'General Inquiry',
            message,
            userId: user ? user._id : null,
            timestamp: new Date(),
            status: 'pending'
        };

        // For now, just log the contact data
        console.log('New contact form submission:', contactData);

        // Send response
        res.status(201).json({
            success: true,
            message: 'Thank you for your message. We will get back to you soon.',
            data: {
                reference: Date.now(), // You might want to generate a proper reference number
                timestamp: contactData.timestamp
            }
        });

    } catch (error) {
        console.error('Contact form submission error:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting contact form. Please try again later.'
        });
    }
});

// Get contact form submission status (if you implement a Contact model)
router.get('/status/:reference', async (req, res) => {
    try {
        const { reference } = req.params;

        // TODO: Implement actual status checking logic
        // For now, return a mock response
        res.json({
            success: true,
            data: {
                reference,
                status: 'pending',
                message: 'Your message is being reviewed by our team.'
            }
        });

    } catch (error) {
        console.error('Contact status check error:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking contact form status'
        });
    }
});

module.exports = router; 