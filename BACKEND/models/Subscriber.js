const mongoose = require('mongoose');

const subscriberSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide your name'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please provide your email'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    interest: {
        type: String,
        required: [true, 'Please select your area of interest'],
        enum: ['personal', 'career', 'leadership', 'wellness', 'digital']
    },
    privacyAccepted: {
        type: Boolean,
        required: [true, 'Please accept the privacy policy']
    },
    subscriptionDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['active', 'unsubscribed'],
        default: 'active'
    }
});

const Subscriber = mongoose.model('Subscriber', subscriberSchema);

module.exports = Subscriber; 