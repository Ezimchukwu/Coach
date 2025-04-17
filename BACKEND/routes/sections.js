const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Session = require('../models/Session');
const Resource = require('../models/Resource');
const Activity = require('../models/Activity');

// Get dashboard section
router.get('/:section', auth, async (req, res) => {
    try {
        const { section } = req.params;
        let data = {};

        switch (section) {
            case 'dashboard':
                data = await getDashboardData(req.user.id);
                break;
            case 'schedule':
                data = await getScheduleData(req.user.id);
                break;
            case 'resources':
                data = await getResourcesData(req.user.id);
                break;
            case 'community':
                data = await getCommunityData(req.user.id);
                break;
            case 'profile':
                data = await getProfileData(req.user.id);
                break;
            default:
                return res.status(404).json({
                    success: false,
                    message: 'Section not found'
                });
        }

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error(`Section load error (${req.params.section}):`, error);
        res.status(500).json({
            success: false,
            message: 'Error loading section'
        });
    }
});

// Helper functions for getting section data
async function getDashboardData(userId) {
    const user = await User.findById(userId).select('-password');
    const upcomingSessions = await Session.find({
        user: userId,
        startTime: { $gt: new Date() },
        status: 'scheduled'
    })
    .sort('startTime')
    .limit(5)
    .populate('coach', 'name photo');

    const recentActivities = await Activity.find({ user: userId })
        .sort('-createdAt')
        .limit(10)
        .populate('reference');

    const stats = {
        totalSessions: await Session.countDocuments({ user: userId }),
        completedSessions: await Session.countDocuments({ 
            user: userId,
            status: 'completed'
        }),
        resourcesAccessed: await Resource.countDocuments({
            $or: [
                { creator: userId },
                { 'accessedBy': userId }
            ]
        })
    };

    return {
        user,
        upcomingSessions,
        recentActivities,
        stats
    };
}

async function getScheduleData(userId) {
    const sessions = await Session.find({
        user: userId,
        startTime: { $gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    })
    .sort('startTime')
    .populate('coach', 'name photo')
    .populate('resources');

    const coaches = await User.find({ role: 'coach' })
        .select('name photo specialties availability')
        .limit(10);

    return {
        sessions,
        coaches,
        availableSlots: generateAvailableSlots()
    };
}

async function getResourcesData(userId) {
    const resources = await Resource.find({
        $or: [
            { access: 'public' },
            { creator: userId },
            { access: 'premium', 'premiumUsers': userId }
        ]
    })
    .sort('-createdAt')
    .populate('creator', 'name photo');

    const categories = await Resource.distinct('type');
    const popularResources = await Resource.find()
        .sort('-views')
        .limit(5)
        .populate('creator', 'name photo');

    return {
        resources,
        categories,
        popularResources
    };
}

async function getCommunityData(userId) {
    const users = await User.find({
        _id: { $ne: userId },
        role: { $in: ['user', 'coach'] }
    })
    .select('name photo bio specialties')
    .limit(20);

    const coaches = await User.find({ role: 'coach' })
        .select('name photo bio specialties rating')
        .limit(10);

    return {
        users,
        coaches,
        featuredMembers: users.slice(0, 5),
        upcomingEvents: [] // To be implemented
    };
}

async function getProfileData(userId) {
    const user = await User.findById(userId)
        .select('-password')
        .populate('sessions')
        .populate('resources')
        .populate('achievements');

    const stats = {
        totalSessions: await Session.countDocuments({ user: userId }),
        completedSessions: await Session.countDocuments({
            user: userId,
            status: 'completed'
        }),
        resourcesCreated: await Resource.countDocuments({ creator: userId }),
        resourcesAccessed: await Resource.countDocuments({
            'accessedBy': userId
        })
    };

    const recentActivities = await Activity.find({ user: userId })
        .sort('-createdAt')
        .limit(10)
        .populate('reference');

    return {
        user,
        stats,
        recentActivities
    };
}

// Utility function to generate available time slots
function generateAvailableSlots() {
    const slots = [];
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000); // Next 14 days

    for (let date = startDate; date <= endDate; date.setDate(date.getDate() + 1)) {
        const daySlots = [];
        for (let hour = 9; hour <= 17; hour++) {
            daySlots.push({
                time: new Date(date.setHours(hour, 0, 0, 0)),
                available: Math.random() > 0.5 // Simulate availability
            });
        }
        slots.push({
            date: new Date(date),
            slots: daySlots
        });
    }

    return slots;
}

module.exports = router; 