const express = require('express');
const router = express.Router();
const {
    register,
    login,
    getData,
    updateRegistration,
    getAllUsers,
    getName
} = require('../controllers/UserRegistrationController');

// POST /register - Register new user
router.post('/register', register);

// GET /login - Login user
router.get('/login', login);

// GET /data/:username - Get user data
router.get('/data/:username', getData);

// PUT /updateRegistration - Update user registration
router.put('/updateRegistration', updateRegistration);

// GET /getAllUsers - Get all users
router.get('/getAllUsers', getAllUsers);

// GET /getName - Get user name
router.get('/getName', getName);

module.exports = router;