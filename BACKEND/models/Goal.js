const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'A goal must have a title'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    targetDate: {
        type: Date
    },
    status: {
        type: String,
        enum: ['Not Started', 'In Progress', 'Completed'],
        default: 'Not Started'
    },
    progress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'A goal must belong to a user']
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Index for faster queries
goalSchema.index({ user: 1, status: 1 });

// Pre-save middleware to update the updatedAt field
goalSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const Goal = mongoose.model('Goal', goalSchema);

module.exports = Goal; 