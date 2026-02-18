const db = require('../database');

/**
 * Logs an activity to the database.
 * @param {number} userId - ID of the user performing the action.
 * @param {string} action - Short description of the action (e.g., 'LOGIN', 'CLIENT_CREATED').
 * @param {string} details - Detailed information about the action.
 */
exports.logActivity = (userId, action, details) => {
    const query = `INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)`;
    db.run(query, [userId, action, details], (err) => {
        if (err) {
            console.error('Error saving activity log:', err.message);
        }
    });
};
