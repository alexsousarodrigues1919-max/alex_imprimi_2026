const db = require('../database');
const { logActivity } = require('../utils/logger');

exports.listProjects = (req, res) => {
    const query = `
        SELECT p.*, c.name as client_name, prof.name as professional_name
        FROM projects p
        LEFT JOIN clients c ON p.client_id = c.id
        LEFT JOIN professionals prof ON p.professional_id = prof.id
        ORDER BY p.created_at DESC, p.id DESC
    `;

    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Erro ao buscar projetos.' });
        res.json(rows);
    });
};

exports.createProject = (req, res) => {
    const { name, client_id, professional_id, start_date, end_date, progress, value, tasks, status } = req.body;

    if (!name || !client_id || !professional_id) {
        return res.status(400).json({ message: 'Nome, cliente e profissional sao obrigatorios.' });
    }

    const progressValue = Number(progress || 0);
    if (progressValue < 0 || progressValue > 100) {
        return res.status(400).json({ message: 'Progresso deve estar entre 0 e 100.' });
    }

    db.run(
        `INSERT INTO projects (name, client_id, professional_id, start_date, end_date, status, progress, tasks, value)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            String(name).trim(),
            client_id,
            professional_id,
            start_date || null,
            end_date || null,
            status || 'active',
            progressValue,
            tasks ? String(tasks).trim() : null,
            value ? Number(value) : 0,
        ],
        function onInsert(err) {
            if (err) return res.status(500).json({ message: 'Erro ao criar projeto.' });

            logActivity(req.userId, 'PROJECT_CREATED', `Projeto criado: ${name}`);
            res.status(201).json({ message: 'Projeto criado.', id: this.lastID });
        }
    );
};

exports.updateProject = (req, res) => {
    const { id } = req.params;
    const { status, progress } = req.body;

    if (!status && typeof progress === 'undefined') {
        return res.status(400).json({ message: 'Informe status e/ou progresso.' });
    }

    const safeProgress = typeof progress === 'undefined' ? null : Number(progress);
    if (safeProgress !== null && (safeProgress < 0 || safeProgress > 100)) {
        return res.status(400).json({ message: 'Progresso invalido.' });
    }

    db.run(
        `UPDATE projects
         SET status = COALESCE(?, status), progress = COALESCE(?, progress)
         WHERE id = ?`,
        [status || null, safeProgress, id],
        function onUpdate(err) {
            if (err) return res.status(500).json({ message: 'Erro ao atualizar projeto.' });
            if (!this.changes) return res.status(404).json({ message: 'Projeto nao encontrado.' });

            logActivity(req.userId, 'PROJECT_UPDATED', `Projeto ${id} atualizado`);
            res.json({ message: 'Projeto atualizado.' });
        }
    );
};

exports.deleteProject = (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM projects WHERE id = ?', [id], function onDelete(err) {
        if (err) return res.status(500).json({ message: 'Erro ao remover projeto.' });
        if (!this.changes) return res.status(404).json({ message: 'Projeto nao encontrado.' });

        logActivity(req.userId, 'PROJECT_DELETED', `Projeto removido: ${id}`);
        res.json({ message: 'Projeto removido.' });
    });
};
