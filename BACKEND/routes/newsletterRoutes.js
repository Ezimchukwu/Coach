const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// Subscribe to newsletter
router.post('/subscribe', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Check if email is already subscribed
        const existingSubscriber = await User.findOne({ 
            email: email,
            isNewsletterSubscribed: true 
        });

        if (existingSubscriber) {
            return res.status(400).json({
                success: false,
                message: 'Email is already subscribed to the newsletter'
            });
        }

        // If user exists, update their subscription status
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            existingUser.isNewsletterSubscribed = true;
            await existingUser.save();

            return res.json({
                success: true,
                message: 'Successfully subscribed to newsletter'
            });
        }

        // If no user exists, create a new newsletter subscriber
        const subscriber = new User({
            email,
            isNewsletterSubscribed: true,
            role: 'subscriber'
        });

        await subscriber.save();

        res.status(201).json({
            success: true,
            message: 'Successfully subscribed to newsletter'
        });
    } catch (error) {
        console.error('Newsletter subscription error:', error);
        res.status(500).json({
            success: false,
            message: 'Error subscribing to newsletter'
        });
    }
});

// Unsubscribe from newsletter
router.post('/unsubscribe', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!user.isNewsletterSubscribed) {
            return res.status(400).json({
                success: false,
                message: 'You are not subscribed to the newsletter'
            });
        }

        user.isNewsletterSubscribed = false;
        await user.save();

        res.json({
            success: true,
            message: 'Successfully unsubscribed from newsletter'
        });
    } catch (error) {
        console.error('Newsletter unsubscribe error:', error);
        res.status(500).json({
            success: false,
            message: 'Error unsubscribing from newsletter'
        });
    }
});

// Get newsletter subscription status
router.get('/status', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: {
                isSubscribed: user.isNewsletterSubscribed
            }
        });
    } catch (error) {
        console.error('Newsletter status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching newsletter subscription status'
        });
    }
});

module.exports = router; 