const express = require('express');
const router = express.Router();
const controller = require('../controllers/meetingController');
const verifyToken = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', controller.listMeetings);
router.post('/', controller.createMeeting);
router.patch('/:id/status', controller.updateStatus);

module.exports = router;
