// Simple auth controller with minimal dependencies

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const sendEmail = require('../config/emailConfig');
const crypto = require('crypto');

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

        // Validate required fields for signup
        if (!name || !email || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'Please provide name, email and password'
            });
        }

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

        // Remove password from output
        newUser.password = undefined;

        // Create token
        const token = jwt.sign(
            { id: newUser._id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.status(201).json({
            status: 'success',
            token,
            data: { user: newUser }
        });
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
        // 1) Get user based on POSTed email
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'There is no user with that email address.'
            });
        }

        // 2) Generate the random reset token
        const resetToken = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 character token
        const hashedToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // Update user with reset token using findOneAndUpdate
        await User.findOneAndUpdate(
            { email: req.body.email },
            {
                $set: {
                    passwordResetToken: hashedToken,
                    passwordResetExpires: Date.now() + 10 * 60 * 1000 // 10 minutes
                }
            },
            { 
                new: true,
                runValidators: false
            }
        );

        // 3) Send it to user's email
        const htmlMessage = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333; text-align: center;">Password Reset Token</h2>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
                    <h3 style="color: #007bff; font-family: monospace; letter-spacing: 3px; font-size: 24px; margin: 0;">
                        ${resetToken}
                    </h3>
                </div>
                <p style="color: #666; line-height: 1.6;">
                    You requested a password reset. Here is your 6-digit reset token. 
                    Enter this token on the password reset page to set your new password.
                </p>
                <p style="color: #dc3545; font-weight: bold;">
                    This token will expire in 10 minutes.
                </p>
                <p style="color: #666;">
                    If you didn't request this reset, please ignore this email.
                </p>
            </div>
        `;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Your Password Reset Token (valid for 10 minutes)',
                message: `Your password reset token is: ${resetToken}\n\nEnter this token to reset your password. The token will expire in 10 minutes.\n\nIf you didn't request this reset, please ignore this email.`,
                html: htmlMessage
            });

            res.status(200).json({
                status: 'success',
                message: 'Token sent to email!'
            });
        } catch (err) {
            // If email fails, remove the reset token
            await User.findOneAndUpdate(
                { email: req.body.email },
                {
                    $unset: {
                        passwordResetToken: 1,
                        passwordResetExpires: 1
                    }
                },
                { runValidators: false }
            );

            return res.status(500).json({
                status: 'error',
                message: 'There was an error sending the email. Try again later!'
            });
        }
    } catch (err) {
        res.status(500).json({
            status: 'error',
            message: 'Error generating reset token. Please try again.'
        });
    }
};

// Reset password
exports.resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        // Validate password
        if (!password || password.length < 8) {
            return res.status(400).json({
                status: 'error',
                message: 'Please provide a valid password (min 8 characters)'
            });
        }

        // Hash the token
        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Find and update user
        const user = await User.findOneAndUpdate(
            {
                passwordResetToken: hashedToken,
                passwordResetExpires: { $gt: Date.now() }
            },
            {
                $set: {
                    password: hashedPassword,
                    passwordResetToken: undefined,
                    passwordResetExpires: undefined
                }
            },
            {
                new: true,
                runValidators: false
            }
        );

        if (!user) {
            return res.status(400).json({
                status: 'error',
                message: 'Token is invalid or has expired'
            });
        }

        // Create new JWT token
        const jwtToken = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        // Send response
        res.status(200).json({
            status: 'success',
            message: 'Password has been reset successfully',
            token: jwtToken
        });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({
            status: 'error',
            message: 'Error resetting password. Please try again.'
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