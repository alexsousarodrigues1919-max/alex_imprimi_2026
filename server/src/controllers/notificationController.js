const db = require('../database');

exports.listNotifications = (req, res) => {
    db.all(
        `SELECT * FROM notifications
         WHERE user_id IS NULL OR user_id = ?
         ORDER BY is_read ASC, created_at DESC
         LIMIT 100`,
        [req.userId],
        (err, rows) => {
            if (err) return res.status(500).json({ message: 'Erro ao buscar notificacoes.' });
            res.json(rows);
        }
    );
};

exports.createNotification = (req, res) => {
    const { user_id, title, message, type } = req.body;

    if (!title || !message) {
        return res.status(400).json({ message: 'Titulo e mensagem sao obrigatorios.' });
    }

    db.run(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [user_id || null, String(title).trim(), String(message).trim(), type || 'info'],
        function onInsert(err) {
            if (err) return res.status(500).json({ message: 'Erro ao criar notificacao.' });
            res.status(201).json({ message: 'Notificacao criada.', id: this.lastID });
        }
    );
};

exports.markAsRead = (req, res) => {
    const { id } = req.params;

    db.run(
        'UPDATE notifications SET is_read = 1 WHERE id = ? AND (user_id IS NULL OR user_id = ?)',
        [id, req.userId],
        function onUpdate(err) {
            if (err) return res.status(500).json({ message: 'Erro ao atualizar notificacao.' });
            if (!this.changes) return res.status(404).json({ message: 'Notificacao nao encontrada.' });
            res.json({ message: 'Notificacao marcada como lida.' });
        }
    );
};
