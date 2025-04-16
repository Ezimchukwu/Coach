const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

router.get('/profile', userController.getProfile);
router.patch('/profile', userController.uploadProfileImage, userController.updateProfile);

module.exports = router; 