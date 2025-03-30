const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: String,
    type: {
        type: String,
        enum: ['document', 'video', 'audio', 'link'],
        required: true
    },
    url: {
        type: String,
        required: true
    },
    thumbnail: String,
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    access: {
        type: String,
        enum: ['public', 'private', 'premium'],
        default: 'public'
    },
    tags: [String],
    downloads: {
        type: Number,
        default: 0
    },
    views: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Resource', resourceSchema); 