// Simple auth controller with minimal dependencies

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Create and send JWT token
const createSendToken = async (user, statusCode, res) => {
    // Create token
    const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Remove password from output
    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        token,
        data: { user }
    });
};

// Sign up new user
exports.signup = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                status: 'error',
                message: 'Email already registered'
            });
        }

        // Create new user
        const newUser = await User.create({
            name,
            email,
            password,
            role: role || 'user'
        });

        await createSendToken(newUser, 201, res);
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({
            status: 'error',
            message: 'Error creating user'
        });
    }
};

// Login existing user
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if email and password exist
        if (!email || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'Please provide email and password'
            });
        }

        // Find user and include password in the result
        const user = await User.findOne({ email }).select('+password');

        // Check if user exists and password is correct
        if (!user || !(await user.correctPassword(password))) {
            return res.status(401).json({
                status: 'error',
                message: 'Incorrect email or password'
            });
        }

        await createSendToken(user, 200, res);
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({
            status: 'error',
            message: 'Error logging in'
        });
    }
};

// Logout user
exports.logout = (req, res) => {
    res.status(200).json({ 
        status: 'success',
        message: 'Logged out successfully'
    });
};

// Forgot password
exports.forgotPassword = async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'There is no user with that email address.'
            });
        }

        // Generate reset token
        const resetToken = user.createPasswordResetToken();
        await user.save({ validateBeforeSave: false });

        res.status(200).json({
            status: 'success',
            message: 'Token sent to email!',
            resetToken
        });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({
            status: 'error',
            message: 'Error sending reset token'
        });
    }
};

// Reset password
exports.resetPassword = async (req, res) => {
    try {
        const user = await User.findOne({
            passwordResetToken: req.params.token,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                status: 'error',
                message: 'Token is invalid or has expired'
            });
        }

        user.password = req.body.password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        await createSendToken(user, 200, res);
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({
            status: 'error',
            message: 'Error resetting password'
        });
    }
};

// Protect routes - middleware to check if user is logged in
exports.protect = async (req, res, next) => {
    try {
        // Get token from header
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                status: 'error',
                message: 'You are not logged in. Please log in to get access.'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if user still exists
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: 'The user belonging to this token no longer exists.'
            });
        }

        // Grant access to protected route
        req.user = user;
        next();
    } catch (err) {
        console.error('Auth middleware error:', err);
        res.status(401).json({
            status: 'error',
            message: 'Invalid token. Please log in again.'
        });
    }
};

// Update password
exports.updatePassword = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('+password');

        if (!(await user.correctPassword(req.body.currentPassword))) {
            return res.status(401).json({
                status: 'error',
                message: 'Your current password is incorrect'
            });
        }

        user.password = req.body.newPassword;
        await user.save();

        await createSendToken(user, 200, res);
    } catch (err) {
        console.error('Update password error:', err);
        res.status(500).json({
            status: 'error',
            message: 'Error updating password'
        });
    }
}; 