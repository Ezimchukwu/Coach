const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Configure Passport strategies
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:5000/api/auth/google/callback",
    scope: ['profile', 'email']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Check if user exists
        let user = await User.findOne({ email: profile.emails[0].value });
        
        if (!user) {
            // Create new user
            user = await User.create({
                name: profile.displayName,
                email: profile.emails[0].value,
                password: Math.random().toString(36).slice(-8), // Generate random password
                provider: 'google',
                providerId: profile.id,
                emailVerified: true // Since Google verifies emails
            });
        }
        
        return done(null, user);
    } catch (error) {
        console.error('Google auth error:', error);
        return done(error, null);
    }
}));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:5000/api/auth/facebook/callback",
    profileFields: ['id', 'displayName', 'email']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ email: profile.emails[0].value });
        
        if (!user) {
            user = await User.create({
                name: profile.displayName,
                email: profile.emails[0].value,
                password: Math.random().toString(36).slice(-8),
                provider: 'facebook',
                providerId: profile.id,
                emailVerified: true
            });
        }
        
        return done(null, user);
    } catch (error) {
        console.error('Facebook auth error:', error);
        return done(error, null);
    }
}));

passport.use(new LinkedInStrategy({
    clientID: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    callbackURL: "http://localhost:5000/api/auth/linkedin/callback",
    scope: ['r_emailaddress', 'r_liteprofile']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ email: profile.emails[0].value });
        
        if (!user) {
            user = await User.create({
                name: profile.displayName,
                email: profile.emails[0].value,
                password: Math.random().toString(36).slice(-8),
                provider: 'linkedin',
                providerId: profile.id,
                emailVerified: true
            });
        }
        
        return done(null, user);
    } catch (error) {
        console.error('LinkedIn auth error:', error);
        return done(error, null);
    }
}));

// Serialize and deserialize user
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Google Auth Routes
router.get('/google',
    (req, res, next) => {
        console.log('Attempting Google authentication...');
        next();
    },
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
    (req, res, next) => {
        console.log('Received Google callback...');
        next();
    },
    passport.authenticate('google', { session: false }),
    (req, res) => {
        console.log('Google authentication successful, creating token...');
        try {
            const token = jwt.sign(
                { id: req.user._id }, 
                process.env.JWT_SECRET, 
                { expiresIn: process.env.JWT_EXPIRES_IN }
            );
            console.log('Token created successfully, redirecting...');
            res.redirect(`/auth-success.html?token=${token}`);
        } catch (error) {
            console.error('Google callback error:', error);
            res.redirect('/auth-success.html?error=Authentication failed');
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
            const token = jwt.sign(
                { id: req.user._id }, 
                process.env.JWT_SECRET, 
                { expiresIn: process.env.JWT_EXPIRES_IN }
            );
            res.redirect(`/auth-success.html?token=${token}`);
        } catch (error) {
            console.error('Facebook callback error:', error);
            res.redirect('/auth-success.html?error=Authentication failed');
        }
    }
);

// LinkedIn Auth Routes
router.get('/linkedin',
    passport.authenticate('linkedin')
);

router.get('/linkedin/callback',
    passport.authenticate('linkedin', { session: false }),
    (req, res) => {
        try {
            const token = jwt.sign(
                { id: req.user._id }, 
                process.env.JWT_SECRET, 
                { expiresIn: process.env.JWT_EXPIRES_IN }
            );
            res.redirect(`/auth-success.html?token=${token}`);
        } catch (error) {
            console.error('LinkedIn callback error:', error);
            res.redirect('/auth-success.html?error=Authentication failed');
        }
    }
);

// Error handling middleware
router.use((err, req, res, next) => {
    console.error('Social auth error:', err);
    res.redirect('/auth-success.html?error=Authentication failed');
});

module.exports = router; 