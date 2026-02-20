const express = require('express');
const router = express.Router();
const controller = require('../controllers/authController');
const verifyToken = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/authMiddleware');

router.post('/register', controller.register);
router.post('/login', controller.login);
router.get('/me', verifyToken, controller.me);
router.get('/users', verifyToken, isAdmin, controller.listUsers);

module.exports = router;

