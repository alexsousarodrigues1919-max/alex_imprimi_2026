const express = require('express');
const router = express.Router();
const controller = require('../controllers/financialController');
const verifyToken = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', controller.listFinancials);
router.post('/', controller.createFinancial);
router.delete('/:id', isAdmin, controller.deleteFinancial);

module.exports = router;
