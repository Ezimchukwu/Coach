const express = require('express');
const router = express.Router();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Configure Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'your_google_client_id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your_google_client_secret',
    callbackURL: "/api/auth/google/callback",
    scope: ['profile', 'email']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        console.log('Google profile:', profile);
        
        // Check if user already exists
        let user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
            // Update user's Google ID and provider if not set
            if (!user.providerId) {
                user.providerId = profile.id;
                user.provider = 'google';
                // Set name if it doesn't exist
                if (!user.name && profile.displayName) {
                    user.name = profile.displayName;
                }
                await user.save();
            }
        } else {
            try {
                // Create new user with explicit provider setting
                const userData = {
                    provider: 'google', // Set this first
                    email: profile.emails[0].value,
                    providerId: profile.id,
                    emailVerified: true,
                    // Generate a random password
                    password: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
                };

                // Add name if available
                if (profile.displayName) {
                    userData.name = profile.displayName;
                }

                // Add photo if available
                if (profile.photos && profile.photos[0]) {
                    userData.photo = profile.photos[0].value;
                }

                console.log('Creating new user with data:', userData);
                user = await User.create(userData);
            } catch (createError) {
                console.error('Error creating user:', createError);
                return done(createError, null);
            }
        }

        return done(null, user);
    } catch (error) {
        console.error('Google auth error:', error);
        return done(error, null);
    }
}));

// Configure Facebook Strategy
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID || 'your_facebook_app_id',
    clientSecret: process.env.FACEBOOK_APP_SECRET || 'your_facebook_app_secret',
    callbackURL: "/api/auth/facebook/callback",
    profileFields: ['id', 'emails', 'name', 'picture']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Check if user already exists
        let user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
            // Update user's Facebook ID and provider if not set
            if (!user.providerId) {
                user.providerId = profile.id;
                user.provider = 'facebook';
                // Set name if it doesn't exist
                if (!user.name && profile.displayName) {
                    user.name = profile.displayName;
                }
                await user.save();
            }
        } else {
            // Create new user
            const userData = {
                email: profile.emails[0].value,
                provider: 'facebook',
                providerId: profile.id,
                emailVerified: true,
                // Generate a random password (won't be used for OAuth login)
                password: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
            };

            // Add name if available
            if (profile.displayName) {
                userData.name = profile.displayName;
            }

            // Add photo if available
            if (profile.photos && profile.photos[0]) {
                userData.photo = profile.photos[0].value;
            }

            user = await User.create(userData);
        }

        return done(null, user);
    } catch (error) {
        console.error('Facebook auth error:', error);
        return done(error, null);
    }
}));

// Helper function to generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'your_jwt_secret',
        { expiresIn: '24h' }
    );
};

// Google Auth Routes
router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
    passport.authenticate('google', { session: false }),
    (req, res) => {
        try {
            const token = generateToken(req.user);
            
            // Redirect to auth-success.html with the correct path
            res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5500'}/auth-success.html?token=${token}`);
        } catch (error) {
            console.error('Google auth callback error:', error);
            res.redirect('/login.html?error=Authentication failed');
        }
    }
);

// Facebook Auth Routes
router.get('/facebook',
    passport.authenticate('facebook', { scope: ['email'] })
);

router.get('/facebook/callback',
    passport.authenticate('facebook', { session: false }),
    (req, res) => {
        try {
            const token = generateToken(req.user);
            
            // Redirect to frontend with token
            res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5500'}/auth-success.html?token=${token}`);
        } catch (error) {
            console.error('Facebook auth callback error:', error);
            res.redirect('/auth-error.html');
        }
    }
);

// Get current OAuth user
router.get('/me', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: { user }
        });
    } catch (error) {
        console.error('Get OAuth user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user data'
        });
    }
});

module.exports = router; 