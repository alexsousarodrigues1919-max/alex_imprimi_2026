const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { logActivity } = require('../utils/logger');
const { sanitizeDigits, isValidEmail, isAdult, isValidCPF } = require('../utils/validation');

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_123';
const ALLOWED_ROLES = ['administrador', 'profissional', 'atendimento', 'financeiro', 'tecnico', 'visualizacao'];

function signToken(user) {
    return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
}

exports.register = (req, res) => {
    if (process.env.DISABLE_PUBLIC_REGISTER === 'true') {
        return res.status(403).json({ message: 'Cadastro publico desativado pelo administrador.' });
    }
    const {
        name,
        email,
        password,
        confirmPassword,
        birthdate,
        cpf,
        phone,
        role,
        status,
    } = req.body;

    if (!name || !email || !password || !birthdate || !cpf || !role) {
        return res.status(400).json({ message: 'Preencha todos os campos obrigatorios.' });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({ message: 'E-mail invalido.' });
    }

    if (password.length < 8) {
        return res.status(400).json({ message: 'A senha precisa ter no minimo 8 caracteres.' });
    }

    if (confirmPassword && password !== confirmPassword) {
        return res.status(400).json({ message: 'Senha e confirmacao de senha nao coincidem.' });
    }

    if (!isAdult(birthdate, 18)) {
        return res.status(400).json({ message: 'Proibido cadastro de menores de 18 anos.' });
    }

    if (!isValidCPF(cpf)) {
        return res.status(400).json({ message: 'CPF invalido.' });
    }

    if (!ALLOWED_ROLES.includes(role)) {
        return res.status(400).json({ message: 'Tipo de usuario invalido.' });
    }

    const cpfDigits = sanitizeDigits(cpf);
    const normalizedEmail = email.trim().toLowerCase();

    db.get(
        'SELECT id FROM users WHERE email = ? OR cpf = ?',
        [normalizedEmail, cpfDigits],
        (lookupErr, existing) => {
            if (lookupErr) {
                return res.status(500).json({ message: 'Erro ao validar dados do usuario.' });
            }

            if (existing) {
                return res.status(409).json({ message: 'E-mail ou CPF ja cadastrado.' });
            }

            const hashedPassword = bcrypt.hashSync(password, 10);

            const query = `
                INSERT INTO users (name, email, password, role, birthdate, cpf, phone, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            db.run(
                query,
                [
                    name.trim(),
                    normalizedEmail,
                    hashedPassword,
                    role,
                    birthdate,
                    cpfDigits,
                    phone ? phone.trim() : null,
                    status === 'inativo' ? 'inactive' : 'active',
                ],
                function onInsert(insertErr) {
                    if (insertErr) {
                        return res.status(500).json({ message: 'Erro ao registrar usuario.' });
                    }

                    const user = { id: this.lastID, role, name: name.trim(), email: normalizedEmail };
                    const token = signToken(user);

                    logActivity(user.id, 'REGISTER', `Usuario cadastrado: ${normalizedEmail}`);

                    res.status(201).json({
                        message: 'Usuario registrado com sucesso.',
                        token,
                        user,
                    });
                }
            );
        }
    );
};

exports.login = (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Informe e-mail e senha.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    db.get('SELECT * FROM users WHERE email = ?', [normalizedEmail], (err, user) => {
        if (err) return res.status(500).json({ message: 'Erro interno no login.' });
        if (!user) return res.status(404).json({ message: 'Usuario nao encontrado.' });

        if (user.status === 'inactive') {
            return res.status(403).json({ message: 'Usuario inativo. Contate o administrador.' });
        }

        const validPassword = bcrypt.compareSync(password, user.password);
        if (!validPassword) return res.status(401).json({ message: 'Senha invalida.' });

        const token = signToken(user);

        db.run('UPDATE users SET last_access = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
        logActivity(user.id, 'LOGIN', 'Usuario autenticado no sistema');

        res.json({
            auth: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
                lastAccess: user.last_access,
            },
        });
    });
};

exports.me = (req, res) => {
    db.get(
        'SELECT id, name, email, role, cpf, phone, status, created_at, last_access FROM users WHERE id = ?',
        [req.userId],
        (err, user) => {
            if (err) return res.status(500).json({ message: 'Erro ao buscar perfil.' });
            if (!user) return res.status(404).json({ message: 'Usuario nao encontrado.' });
            res.json(user);
        }
    );
};

exports.listUsers = (req, res) => {
    db.all(
        `SELECT id, name, email, role, cpf, phone, status, created_at, last_access
         FROM users
         ORDER BY created_at DESC, id DESC`,
        [],
        (err, rows) => {
            if (err) return res.status(500).json({ message: 'Erro ao buscar usuarios.' });
            res.json(rows);
        }
    );
};


