const db = require('../database');
const { logActivity } = require('../utils/logger');
const { sanitizeDigits, isAdult, isValidCPF, isValidCNPJ, isValidEmail } = require('../utils/validation');

exports.listClients = (req, res) => {
    db.all('SELECT * FROM clients ORDER BY created_at DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Erro ao buscar clientes.' });
        res.json(rows);
    });
};

exports.createClient = (req, res) => {
    const { name, type, document, email, phone, address, birthdate, status } = req.body;

    if (!name || !type || !document) {
        return res.status(400).json({ message: 'Nome, tipo e documento sao obrigatorios.' });
    }

    if (!['PF', 'PJ'].includes(type)) {
        return res.status(400).json({ message: 'Tipo de cliente invalido.' });
    }

    if (email && !isValidEmail(email)) {
        return res.status(400).json({ message: 'E-mail invalido.' });
    }

    const docDigits = sanitizeDigits(document);

    if (type === 'PF') {
        if (!birthdate) {
            return res.status(400).json({ message: 'Data de nascimento e obrigatoria para cliente PF.' });
        }

        if (!isAdult(birthdate, 18)) {
            return res.status(400).json({ message: 'Cliente PF deve ter no minimo 18 anos.' });
        }

        if (!isValidCPF(docDigits)) {
            return res.status(400).json({ message: 'CPF invalido.' });
        }
    }

    if (type === 'PJ' && !isValidCNPJ(docDigits)) {
        return res.status(400).json({ message: 'CNPJ invalido.' });
    }

    db.get('SELECT id FROM clients WHERE document = ?', [docDigits], (lookupErr, existing) => {
        if (lookupErr) return res.status(500).json({ message: 'Erro ao validar documento.' });
        if (existing) return res.status(409).json({ message: 'Documento ja cadastrado.' });

        db.run(
            `INSERT INTO clients (name, type, document, email, phone, address, birthdate, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name.trim(),
                type,
                docDigits,
                email ? email.trim().toLowerCase() : null,
                phone ? phone.trim() : null,
                address ? address.trim() : null,
                type === 'PF' ? birthdate : null,
                status === 'inativo' ? 'inactive' : 'active',
            ],
            function onInsert(err) {
                if (err) return res.status(500).json({ message: 'Erro ao cadastrar cliente.' });

                logActivity(req.userId, 'CLIENT_CREATED', `Cliente criado: ${name} (${docDigits})`);
                res.status(201).json({ message: 'Cliente cadastrado com sucesso.', id: this.lastID });
            }
        );
    });
};

exports.deleteClient = (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM clients WHERE id = ?', [id], function onDelete(err) {
        if (err) return res.status(500).json({ message: 'Erro ao remover cliente.' });
        if (!this.changes) return res.status(404).json({ message: 'Cliente nao encontrado.' });

        logActivity(req.userId, 'CLIENT_DELETED', `Cliente removido: ID ${id}`);
        res.json({ message: 'Cliente removido com sucesso.' });
    });
};
