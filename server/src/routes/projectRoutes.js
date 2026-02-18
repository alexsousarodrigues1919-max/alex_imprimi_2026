const express = require('express');
const router = express.Router();
const controller = require('../controllers/projectController');
const verifyToken = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', controller.listProjects);
router.post('/', controller.createProject);
router.put('/:id', controller.updateProject);
router.delete('/:id', isAdmin, controller.deleteProject);

module.exports = router;
