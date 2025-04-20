const mongoose = require('mongoose');

const shareSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    token: {
        type: String,
        required: true,
        unique: true
    },
    views: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        default: () => new Date(+new Date() + 30*24*60*60*1000) // 30 days from creation
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastViewedAt: {
        type: Date
    },
    shareSettings: {
        showEmail: {
            type: Boolean,
            default: false
        },
        showPhone: {
            type: Boolean,
            default: false
        },
        showLocation: {
            type: Boolean,
            default: true
        },
        showBio: {
            type: Boolean,
            default: true
        },
        showAchievements: {
            type: Boolean,
            default: true
        }
    }
});

// Update the updatedAt timestamp before saving
shareSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Index for faster queries
shareSchema.index({ userId: 1 });
shareSchema.index({ token: 1 });

const Share = mongoose.model('Share', shareSchema);

module.exports = Share; 