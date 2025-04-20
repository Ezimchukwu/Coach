const mongoose = require('mongoose');

const shareableProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    shareToken: {
        type: String,
        required: true,
        unique: true
    },
    settings: {
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
        }
    },
    views: {
        type: Number,
        default: 0
    },
    lastViewed: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt timestamp before saving
shareableProfileSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('ShareableProfile', shareableProfileSchema); 