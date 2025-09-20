const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { validateUser } = require('../middleware/validators');

// Get all users
router.get('/', userController.getAllUsers);

// Get single user
router.get('/:id', userController.getUserById);

// Create user
router.post('/', validateUser, userController.createUser);

// Update user
router.put('/:id', validateUser, userController.updateUser);

// Delete user
router.delete('/:id', userController.deleteUser);

module.exports = router;