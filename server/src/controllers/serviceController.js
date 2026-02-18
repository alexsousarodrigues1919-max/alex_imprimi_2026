const db = require('../database');
const { logActivity } = require('../utils/logger');

exports.listServices = (req, res) => {
    const query = `
        SELECT s.*, c.name as client_name, p.name as professional_name
        FROM services s
        LEFT JOIN clients c ON s.client_id = c.id
        LEFT JOIN professionals p ON s.professional_id = p.id
        ORDER BY s.date DESC, s.time DESC, s.id DESC
    `;

    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Erro ao buscar atendimentos.' });
        res.json(rows);
    });
};

exports.createService = (req, res) => {
    const { client_id, professional_id, type, date, time, description, value, status } = req.body;

    if (!client_id || !professional_id || !type || !date) {
        return res.status(400).json({ message: 'Cliente, profissional, tipo e data sao obrigatorios.' });
    }

    const amount = value ? Number(value) : 0;
    if (!Number.isFinite(amount) || amount < 0) {
        return res.status(400).json({ message: 'Valor invalido.' });
    }

    db.run(
        `INSERT INTO services (client_id, professional_id, type, date, time, description, status, value)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            client_id,
            professional_id,
            String(type).trim(),
            date,
            time || null,
            description ? String(description).trim() : null,
            status || 'pendente',
            amount,
        ],
        function onInsert(err) {
            if (err) return res.status(500).json({ message: 'Erro ao registrar atendimento.' });

            logActivity(req.userId, 'SERVICE_CREATED', `Atendimento criado para cliente ${client_id}`);
            res.status(201).json({ message: 'Atendimento registrado.', id: this.lastID });
        }
    );
};

exports.deleteService = (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM services WHERE id = ?', [id], function onDelete(err) {
        if (err) return res.status(500).json({ message: 'Erro ao remover atendimento.' });
        if (!this.changes) return res.status(404).json({ message: 'Atendimento nao encontrado.' });

        logActivity(req.userId, 'SERVICE_DELETED', `Atendimento removido: ${id}`);
        res.json({ message: 'Atendimento removido.' });
    });
};
