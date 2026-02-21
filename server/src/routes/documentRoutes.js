const express = require('express');
const router = express.Router();
const controller = require('../controllers/documentController');
const verifyToken = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/export', controller.exportDocument);
router.post('/sign', controller.signDocument);
router.get('/signatures/me', controller.listMySignatures);

module.exports = router;
