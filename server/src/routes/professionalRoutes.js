const express = require('express');
const router = express.Router();
const controller = require('../controllers/professionalController');
const verifyToken = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', controller.listProfessionals);
router.post('/', controller.createProfessional);
router.delete('/:id', isAdmin, controller.deleteProfessional);

module.exports = router;
