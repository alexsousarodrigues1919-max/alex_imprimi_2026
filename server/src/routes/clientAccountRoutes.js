const express = require('express');
const router = express.Router();
const controller = require('../controllers/clientAccountController');
const verifyToken = require('../middleware/authMiddleware');
const { isAdmin, allowRoles } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', controller.listAccounts);
router.post('/', allowRoles('administrador', 'admin', 'financeiro', 'atendimento'), controller.createAccount);
router.patch('/:id/pay', allowRoles('administrador', 'admin', 'financeiro', 'atendimento'), controller.markAsPaid);
router.delete('/:id', isAdmin, controller.deleteAccount);

module.exports = router;
