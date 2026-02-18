const db = require('../database');
const { logActivity } = require('../utils/logger');
const { sanitizeDigits, isValidCPF, isValidEmail } = require('../utils/validation');

exports.listProfessionals = (req, res) => {
    db.all('SELECT * FROM professionals ORDER BY name ASC', [], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Erro ao buscar profissionais.' });
        res.json(rows);
    });
};

exports.createProfessional = (req, res) => {
    const {
        name,
        cpf,
        specialty,
        registration_number,
        phone,
        email,
        available_hours,
        commission_rate,
    } = req.body;

    if (!name || !specialty) {
        return res.status(400).json({ message: 'Nome e especialidade sao obrigatorios.' });
    }

    if (email && !isValidEmail(email)) {
        return res.status(400).json({ message: 'E-mail invalido.' });
    }

    const cpfDigits = cpf ? sanitizeDigits(cpf) : null;
    if (cpfDigits && !isValidCPF(cpfDigits)) {
        return res.status(400).json({ message: 'CPF invalido.' });
    }

    db.run(
        `INSERT INTO professionals (name, cpf, specialty, registration_number, phone, email, available_hours, commission_rate)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            String(name).trim(),
            cpfDigits,
            String(specialty).trim(),
            registration_number ? String(registration_number).trim() : null,
            phone ? String(phone).trim() : null,
            email ? String(email).trim().toLowerCase() : null,
            available_hours ? String(available_hours).trim() : null,
            commission_rate ? Number(commission_rate) : 0,
        ],
        function onInsert(err) {
            if (err) {
                if (String(err.message).includes('UNIQUE constraint failed: professionals.cpf')) {
                    return res.status(409).json({ message: 'CPF ja cadastrado para outro profissional.' });
                }

                return res.status(500).json({ message: 'Erro ao cadastrar profissional.' });
            }

            logActivity(req.userId, 'PROFESSIONAL_CREATED', `Profissional criado: ${name}`);
            res.status(201).json({ message: 'Profissional cadastrado.', id: this.lastID });
        }
    );
};

exports.deleteProfessional = (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM professionals WHERE id = ?', [id], function onDelete(err) {
        if (err) return res.status(500).json({ message: 'Erro ao remover profissional.' });
        if (!this.changes) return res.status(404).json({ message: 'Profissional nao encontrado.' });

        logActivity(req.userId, 'PROFESSIONAL_DELETED', `Profissional removido: ID ${id}`);
        res.json({ message: 'Profissional removido.' });
    });
};
