const express = require('express');
const router = express.Router();
const controller = require('../controllers/serviceController');
const verifyToken = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', controller.listServices);
router.post('/', controller.createService);
router.delete('/:id', isAdmin, controller.deleteService);

module.exports = router;
