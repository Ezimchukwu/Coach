const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Define settings schema
const settingsSchema = new mongoose.Schema({
    notifications: {
        sessionReminders: { type: Boolean, default: true },
        reminderTime: { type: String, default: '30' },
        messages: { type: Boolean, default: true },
        achievements: { type: Boolean, default: true },
        resources: { type: Boolean, default: false }
    },
    communication: {
        preferredMethod: { type: String, default: 'email' },
        timeZone: { type: String, default: 'UTC' }
    },
    privacy: {
        profileVisibility: { type: String, default: 'public' },
        shareAchievements: { type: Boolean, default: true },
        shareProgress: { type: Boolean, default: false }
    },
    security: {
        twoFactorEnabled: { type: Boolean, default: false }
    }
}, { _id: false });

const userSchema = new mongoose.Schema({
    name: String,  // Making it completely optional
    email: {
        type: String,
        required: [true, 'Please provide your email'],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 8,
        select: false
    },
    photo: {
        type: String,
        default: 'default.jpg'
    },
    role: {
        type: String,
        enum: ['user', 'coach', 'admin'],
        default: 'user'
    },
    settings: {
        type: settingsSchema,
        default: () => ({})
    },
    goals: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Goal',
        default: []
    }],
    sessions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        default: []
    }],
    resources: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resource',
        default: []
    }],
    bio: String,
    location: String,
    phoneNumber: String,
    website: String,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
        type: Boolean,
        default: true,
        select: false
    },
    // Add social authentication fields
    provider: {
        type: String,
        enum: ['local', 'google', 'facebook', 'linkedin'],
        default: 'local'
    },
    providerId: String,
    emailVerified: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    // Only hash the password if it's a local account or if the password has been modified
    if (this.provider !== 'local' || !this.isModified('password')) return next();
    
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Compare password method
userSchema.methods.correctPassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User; 