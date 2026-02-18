const express = require('express');
const router = express.Router();
const controller = require('../controllers/reportController');
const verifyToken = require('../middleware/authMiddleware');

router.use(verifyToken);
router.get('/summary', controller.summary);

module.exports = router;
