const db = require('../database');
const { logActivity } = require('../utils/logger');

exports.listMeetings = (req, res) => {
    const query = `
        SELECT m.*, c.name as client_name, p.name as professional_name
        FROM meetings m
        LEFT JOIN clients c ON m.client_id = c.id
        LEFT JOIN professionals p ON m.professional_id = p.id
        ORDER BY m.date ASC
    `;

    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Erro ao buscar reunioes.' });
        res.json(rows);
    });
};

exports.createMeeting = (req, res) => {
    const { title, date, client_id, professional_id, notes, meeting_type, location } = req.body;

    if (!title || !date || !client_id || !professional_id) {
        return res.status(400).json({ message: 'Titulo, data, cliente e profissional sao obrigatorios.' });
    }

    const meetingDate = new Date(date);
    if (Number.isNaN(meetingDate.getTime())) {
        return res.status(400).json({ message: 'Data/hora da reuniao invalida.' });
    }

    db.run(
        `INSERT INTO meetings (title, date, client_id, professional_id, notes, meeting_type, location)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            String(title).trim(),
            date,
            client_id,
            professional_id,
            notes ? String(notes).trim() : null,
            meeting_type || 'presencial',
            location ? String(location).trim() : null,
        ],
        function onInsert(err) {
            if (err) return res.status(500).json({ message: 'Erro ao agendar reuniao.' });

            logActivity(req.userId, 'MEETING_CREATED', `Reuniao criada: ${title}`);
            res.status(201).json({ message: 'Reuniao agendada com sucesso.', id: this.lastID });
        }
    );
};

exports.updateStatus = (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['scheduled', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({ message: 'Status invalido.' });
    }

    db.run('UPDATE meetings SET status = ? WHERE id = ?', [status, id], function onUpdate(err) {
        if (err) return res.status(500).json({ message: 'Erro ao atualizar status.' });
        if (!this.changes) return res.status(404).json({ message: 'Reuniao nao encontrada.' });

        logActivity(req.userId, 'MEETING_STATUS_UPDATE', `Reuniao ${id} -> ${status}`);
        res.json({ message: 'Status atualizado.' });
    });
};
