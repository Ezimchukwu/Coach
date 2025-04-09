const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide your name'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please provide your email'],
        trim: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    service: {
        type: String,
        required: [true, 'Please select a service'],
        enum: ['Personal Development', 'Career Growth', 'Leadership Skills', 'Health & Wellness', 'Digital Skills', 'Other']
    },
    message: {
        type: String,
        required: [true, 'Please provide your message'],
        trim: true
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['new', 'read', 'responded'],
        default: 'new'
    }
});

module.exports = mongoose.model('Contact', contactSchema); 