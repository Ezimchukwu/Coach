const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper function to generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'your_jwt_secret',
        { expiresIn: '24h' }
    );
};

// Register route
router.post('/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;
        
        // Basic validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address'
            });
        }

        // Validate password strength
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }
        
        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists'
            });
        }
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Create new user
        const user = await User.create({
            email,
            password: hashedPassword,
            firstName: firstName || '',
            lastName: lastName || '',
            role: 'user',
            isEmailVerified: false
        });

        // Generate JWT token
        const token = generateToken(user);
        
        // Send response
        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: {
                token,
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role
                }
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed. Please try again.'
        });
    }
});

// Login route
router.post('/login', async (req, res) => {
    try {
        console.log('Login request received:', {
            hasEmail: !!req.body.email,
            hasPassword: !!req.body.password,
            body: req.body
        });

        const { email, password } = req.body;
        
        // Basic validation
        if (!email || !password) {
            console.log('Login validation failed:', {
                hasEmail: !!email,
                hasPassword: !!password
            });
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }
        
        // Find user and explicitly select password field
        console.log('Searching for user with email:', email);
        const user = await User.findOne({ email }).select('+password');
        
        if (!user) {
            console.log('User not found:', email);
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        console.log('User found:', {
            id: user._id,
            email: user.email,
            hasPassword: !!user.password,
            provider: user.provider
        });

        // Check if this is a social auth user trying to login with password
        if (user.provider !== 'local') {
            console.log('Social auth user attempting password login:', {
                email: user.email,
                provider: user.provider
            });
            return res.status(400).json({
                success: false,
                message: `This account uses ${user.provider} authentication. Please login with ${user.provider}.`
            });
        }

        // Check password
        console.log('Attempting password comparison for user:', user.email);
        const isMatch = await bcrypt.compare(password, user.password);
        console.log('Password comparison result:', isMatch);

        if (!isMatch) {
            console.log('Invalid password for user:', email);
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate token
        console.log('Generating token for user:', user._id);
        const token = generateToken(user);
        
        // Create response data
        const responseData = {
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName || '',
                    lastName: user.lastName || '',
                    role: user.role,
                    provider: user.provider
                }
            }
        };

        console.log('Login successful for user:', email);
        res.json(responseData);
        
    } catch (error) {
        console.error('Login error - Full error:', error);
        console.error('Login error - Stack trace:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Login failed. Please try again.'
        });
    }
});

module.exports = router; 