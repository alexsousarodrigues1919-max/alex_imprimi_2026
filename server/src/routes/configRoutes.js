const express = require('express');
const router = express.Router();
const controller = require('../controllers/configController');
const verifyToken = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', controller.getConfig);
router.put('/', isAdmin, controller.updateConfig);

module.exports = router;
