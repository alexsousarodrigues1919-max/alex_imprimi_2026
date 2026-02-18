const db = require('../database');
const { logActivity } = require('../utils/logger');
const { sanitizeDigits, isValidCNPJ, isValidEmail } = require('../utils/validation');

exports.getConfig = (req, res) => {
    db.get('SELECT * FROM company_config WHERE id = 1', [], (err, row) => {
        if (err) return res.status(500).json({ message: 'Erro ao buscar configuracoes.' });
        res.json(row || {});
    });
};

exports.updateConfig = (req, res) => {
    const { name, cnpj, logo, phone, email, address, site, socials, responsible, plan, theme } = req.body;

    if (email && !isValidEmail(email)) {
        return res.status(400).json({ message: 'E-mail de configuracao invalido.' });
    }

    let cnpjDigits = null;
    if (cnpj) {
        cnpjDigits = sanitizeDigits(cnpj);
        if (!isValidCNPJ(cnpjDigits)) {
            return res.status(400).json({ message: 'CNPJ invalido.' });
        }
    }

    db.run(
        `UPDATE company_config SET
            name = COALESCE(?, name),
            cnpj = COALESCE(?, cnpj),
            logo = COALESCE(?, logo),
            phone = COALESCE(?, phone),
            email = COALESCE(?, email),
            address = COALESCE(?, address),
            site = COALESCE(?, site),
            socials = COALESCE(?, socials),
            responsible = COALESCE(?, responsible),
            plan = COALESCE(?, plan),
            theme = COALESCE(?, theme)
        WHERE id = 1`,
        [
            name || null,
            cnpjDigits,
            logo || null,
            phone || null,
            email || null,
            address || null,
            site || null,
            socials || null,
            responsible || null,
            plan || null,
            theme || null,
        ],
        (err) => {
            if (err) return res.status(500).json({ message: 'Erro ao atualizar configuracoes.' });

            logActivity(req.userId, 'CONFIG_UPDATED', 'Configuracoes do sistema atualizadas');
            res.json({ message: 'Configuracoes atualizadas com sucesso.' });
        }
    );
};
