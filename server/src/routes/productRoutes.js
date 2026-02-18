const express = require('express');
const router = express.Router();
const controller = require('../controllers/productController');
const verifyToken = require('../middleware/authMiddleware');
const { isAdmin, allowRoles } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', controller.listProducts);
router.post('/', allowRoles('administrador', 'admin', 'financeiro', 'atendimento'), controller.createProduct);
router.post('/consume', allowRoles('administrador', 'admin', 'financeiro', 'atendimento'), controller.consumeStock);
router.put('/:id', allowRoles('administrador', 'admin', 'financeiro', 'atendimento'), controller.updateProduct);
router.delete('/:id', isAdmin, controller.deleteProduct);

module.exports = router;
