const express = require('express');
const router = express.Router();
const controller = require('../controllers/notificationController');
const verifyToken = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', controller.listNotifications);
router.post('/', allowRoles('administrador', 'admin', 'atendimento'), controller.createNotification);
router.patch('/:id/read', controller.markAsRead);

module.exports = router;
