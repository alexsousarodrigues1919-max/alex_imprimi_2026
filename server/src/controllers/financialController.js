const db = require('../database');
const { logActivity } = require('../utils/logger');

exports.listFinancials = (req, res) => {
    db.all('SELECT * FROM financials ORDER BY date DESC, id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Erro ao buscar financeiro.' });
        res.json(rows);
    });
};

exports.createFinancial = (req, res) => {
    const { type, amount, category, date, description, client_id } = req.body;

    if (!type || !amount || !date || !description) {
        return res.status(400).json({ message: 'Preencha todos os campos obrigatorios.' });
    }

    if (!['income', 'expense'].includes(type)) {
        return res.status(400).json({ message: 'Tipo financeiro invalido.' });
    }

    const amountNumber = Number(amount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
        return res.status(400).json({ message: 'Valor invalido.' });
    }

    db.run(
        `INSERT INTO financials (type, amount, category, date, description, client_id, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            type,
            amountNumber,
            category ? String(category).trim() : null,
            date,
            String(description).trim(),
            client_id || null,
            req.userId,
        ],
        function onInsert(err) {
            if (err) return res.status(500).json({ message: 'Erro ao lancar financeiro.' });

            logActivity(req.userId, 'FINANCIAL_CREATED', `${type} - R$ ${amountNumber}`);
            res.status(201).json({ message: 'Lancamento registrado.', id: this.lastID });
        }
    );
};

exports.deleteFinancial = (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM financials WHERE id = ?', [id], function onDelete(err) {
        if (err) return res.status(500).json({ message: 'Erro ao excluir lancamento.' });
        if (!this.changes) return res.status(404).json({ message: 'Lancamento nao encontrado.' });

        logActivity(req.userId, 'FINANCIAL_DELETED', `Lancamento ID ${id} removido`);
        res.json({ message: 'Lancamento excluido.' });
    });
};
