const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');

// Submit contact form
router.post('/submit', async (req, res) => {
    try {
        console.log('Received contact form submission:', req.body);
        const { name, email, service, message } = req.body;

        // Validate required fields
        if (!name || !email || !service || !message) {
            console.log('Missing required fields:', { name, email, service, message });
            return res.status(400).json({
                status: 'error',
                message: 'Please provide all required fields'
            });
        }

        // Create new contact submission
        const contact = await Contact.create({
            name,
            email,
            service,
            message
        });

        // Send success response
        res.status(201).json({
            status: 'success',
            message: 'Thank you for your message! We will get back to you soon.',
            data: {
                contact
            }
        });

    } catch (error) {
        console.error('Contact form submission error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Something went wrong. Please try again.'
        });
    }
});

// Get all contact submissions (protected route for admin)
router.get('/', async (req, res) => {
    try {
        const contacts = await Contact.find().sort({ submittedAt: -1 });
        res.status(200).json({
            status: 'success',
            results: contacts.length,
            data: {
                contacts
            }
        });
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error fetching contact submissions'
        });
    }
});

module.exports = router; 