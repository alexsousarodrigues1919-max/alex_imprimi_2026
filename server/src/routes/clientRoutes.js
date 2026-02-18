const express = require('express');
const router = express.Router();
const controller = require('../controllers/clientController');
const verifyToken = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/authMiddleware');

router.use(verifyToken); // Protect all client routes

router.get('/', controller.listClients);
router.post('/', controller.createClient);
router.delete('/:id', isAdmin, controller.deleteClient);

module.exports = router;
