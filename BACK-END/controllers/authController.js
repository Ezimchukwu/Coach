// Import required modules
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/userModel');
const Settings = require('../models/settingsModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Helper function to create and send token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your-temporary-secret-key', {
    expiresIn: process.env.JWT_EXPIRES_IN || '90d'
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  
  // Remove password from output
  user.password = undefined;
  
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

// For mock login when database is not connected
const mockUsers = [
  {
    _id: '60d0fe4f5311236168a109ca',
    firstName: 'John',
    lastName: 'Doe',
    email: 'johndoe@example.com',
    password: '$2a$12$QRK.f.Ja6mwswIxKdqL6XeEFv1eK9YK35kJPbO5f3oP8Y0q4A5Q1.',
    role: 'user'
  },
  {
    _id: '60d0fe4f5311236168a109cb',
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@example.com',
    password: '$2a$12$QRK.f.Ja6mwswIxKdqL6XeEFv1eK9YK35kJPbO5f3oP8Y0q4A5Q1.',
    role: 'admin'
  }
];

// Signup controller
exports.signup = catchAsync(async (req, res, next) => {
    // 1) First check if user already exists
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
        return next(new AppError('This email is already registered. Please try logging in or use a different email.', 400));
    }

    // 2) Create new user
    const newUser = await User.create({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        phoneNumber: req.body.phoneNumber,
        address: req.body.address
    });

    // 3) Create default settings for the new user
    try {
        await Settings.createDefaultSettings(newUser._id);
        console.log(`Default settings created for user: ${newUser._id}`);
    } catch (error) {
        console.error('Error creating default settings:', error);
        // Continue with signup even if settings creation fails
    }

    // 4) Generate email verification token
    const verificationToken = newUser.createEmailVerificationToken();
    await newUser.save({ validateBeforeSave: false });

    // 5) Send verification email (TODO)
    
    // 6) Send response with token
    createSendToken(newUser, 201, res);
});

// Login controller with mock DB support
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }
  
  // 2) Check if user exists && password is correct
  let user;
  
  if (global.useMockDb) {
    console.log('Using mock DB for login');
    // Mock DB implementation
    user = mockUsers.find(u => u.email === email);
    
    if (!user) {
      return next(new AppError('Incorrect email or password', 401));
    }
    
    // For test purposes, accepted password is always "password"
    const correctPassword = (password === 'password') || await bcrypt.compare(password, user.password);
    
    if (!correctPassword) {
      return next(new AppError('Incorrect email or password', 401));
    }
  } else {
    // MongoDB implementation
    user = await User.findOne({ email }).select('+password');
    
    if (!user || !(await user.correctPassword(password, user.password))) {
      return next(new AppError('Incorrect email or password', 401));
    }
  }
  
  // 3) If everything ok, send token to client
  createSendToken(user, 200, res);
});

// Authentication middleware
exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it exists
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  if (!token) {
    return next(new AppError('You are not logged in! Please log in to get access.', 401));
  }
  
  try {
    // 2) Verify token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET || 'your-temporary-secret-key');
    
    let currentUser;
    
    // 3) Check if user still exists
    if (global.useMockDb) {
      // Use mock data
      currentUser = mockUsers.find(u => u._id === decoded.id);
      if (!currentUser) {
        throw new Error('User not found');
      }
    } else {
      // Use real database
      currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        throw new Error('User not found');
      }
      
      // 4) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter && currentUser.changedPasswordAfter(decoded.iat)) {
        throw new Error('User recently changed password');
      }
    }
    
    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = currentUser;
    next();
  } catch (error) {
    return next(new AppError('Authentication failed. Please log in again.', 401));
  }
});

// Update password
exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select('+password');
  
  // 2) Check if posted current password is correct
  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    return next(new AppError('Your current password is incorrect.', 401));
  }
  
  // 3) If so, update password
  user.password = req.body.newPassword;
  if (req.body.passwordConfirm) {
    user.passwordConfirm = req.body.passwordConfirm;
  } else {
    user.passwordConfirm = req.body.newPassword;
  }
  
  await user.save();
  
  // 4) Log user in, send JWT
  createSendToken(user, 200, res);
});

// Get current user
exports.getMe = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user
    }
  });
});

// Update user information
exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user tries to update password
  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError('This route is not for password updates. Please use /update-password.', 400));
  }
  
  // 2) Filter out unwanted fields that are not allowed to be updated
  const filteredBody = {};
  const allowedFields = ['firstName', 'lastName', 'email', 'phoneNumber', 'address'];
  
  Object.keys(req.body).forEach(field => {
    if (allowedFields.includes(field)) {
      filteredBody[field] = req.body[field];
    }
  });
  
  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  });
  
  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

// Forgot password
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with that email address.', 404));
  }

  // 2) Generate random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) In a real app, send token to user's email
  // For demo purposes, we'll just return the token
  console.log('Password reset token:', resetToken);

  res.status(200).json({
    status: 'success',
    message: 'Token sent to email!',
    token: resetToken // In production, remove this line and send via email
  });
});

// Reset password
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Update changedPasswordAt property for the user
  // This is handled in the pre-save middleware

  // 4) Log the user in, send JWT
  createSendToken(user, 200, res);
}); 