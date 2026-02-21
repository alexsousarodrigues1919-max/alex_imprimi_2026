const crypto = require('crypto');
const db = require('../database');
const { logActivity } = require('../utils/logger');

function formatCurrency(value) {
    return Number(value || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });
}

function formatDateTime(value) {
    const date = new Date(value || Date.now());
    if (Number.isNaN(date.getTime())) return String(value || '-');
    return date.toLocaleString('pt-BR');
}

function resolveDocMeta(type) {
    const map = {
        orcamento: { title: 'Orcamento', file: 'orcamento' },
        recibo: { title: 'Recibo', file: 'recibo' },
        ordem_servico: { title: 'Ordem de Servico', file: 'ordem-servico' },
        contrato: { title: 'Contrato', file: 'contrato' },
    };

    return map[type] || null;
}

function buildHtmlDocument({ title, companyName, userName, userRole, items }) {
    const rows = items.length
        ? items.map((item) => `
            <tr>
                <td>${item.date}</td>
                <td>${item.description}</td>
                <td>${item.status}</td>
                <td style="text-align:right">${item.value}</td>
            </tr>
        `).join('')
        : '<tr><td colspan="4">Sem registros para este documento.</td></tr>';

    return `
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 20px; }
    .title { font-size: 24px; font-weight: 700; }
    .meta { color:#4b5563; font-size: 13px; }
    table { width:100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 13px; }
    th { background:#f3f4f6; text-align:left; }
    .footer { margin-top: 28px; font-size: 12px; color:#6b7280; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">${title}</div>
      <div class="meta">Empresa: ${companyName}</div>
      <div class="meta">Emitido por: ${userName} (${userRole})</div>
      <div class="meta">Data: ${formatDateTime()}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Data</th>
        <th>Descricao</th>
        <th>Status</th>
        <th style="text-align:right">Valor</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="footer">
    Documento gerado automaticamente pela plataforma Profissional 360.
  </div>
</body>
</html>
    `.trim();
}

exports.exportDocument = (req, res) => {
    const type = String(req.query.type || '').trim().toLowerCase();
    const meta = resolveDocMeta(type);

    if (!meta) {
        return res.status(400).json({ message: 'Tipo de documento invalido.' });
    }

    db.get('SELECT name, role FROM users WHERE id = ?', [req.userId], (userErr, user) => {
        if (userErr || !user) {
            return res.status(500).json({ message: 'Erro ao carregar usuario emissor.' });
        }

        db.get('SELECT name FROM company_config ORDER BY id DESC LIMIT 1', [], (cfgErr, cfg) => {
            if (cfgErr) return res.status(500).json({ message: 'Erro ao carregar configuracao da empresa.' });

            db.all(
                `SELECT type, date, status, value
                 FROM services
                 ORDER BY date DESC, id DESC
                 LIMIT 25`,
                [],
                (servicesErr, rows) => {
                    if (servicesErr) return res.status(500).json({ message: 'Erro ao carregar dados do documento.' });

                    const items = (rows || []).map((row) => ({
                        date: formatDateTime(row.date),
                        description: String(row.type || 'Servico'),
                        status: String(row.status || '-'),
                        value: formatCurrency(row.value || 0),
                    }));

                    const html = buildHtmlDocument({
                        title: meta.title,
                        companyName: cfg?.name || 'Profissional 360',
                        userName: user.name || 'Usuario',
                        userRole: user.role || '-',
                        items,
                    });

                    const filename = `${meta.file}-${new Date().toISOString().slice(0, 10)}.html`;
                    res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                    logActivity(req.userId, 'DOCUMENT_EXPORTED', `Documento exportado: ${type}`);
                    return res.send(html);
                }
            );
        });
    });
};

exports.signDocument = (req, res) => {
    const {
        document_type: documentType,
        reference = null,
        signer_name: signerName = null,
    } = req.body || {};

    const type = String(documentType || '').trim().toLowerCase();
    const meta = resolveDocMeta(type);

    if (!meta) {
        return res.status(400).json({ message: 'Tipo de documento invalido para assinatura.' });
    }

    const stamp = new Date().toISOString();
    const payload = `${req.userId}|${type}|${reference || ''}|${signerName || ''}|${stamp}`;
    const signature = crypto.createHash('sha256').update(payload).digest('hex');

    db.run(
        `INSERT INTO digital_signatures (user_id, document_type, reference, signer_name, signature_hash, signed_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [req.userId, type, reference, signerName, signature],
        function onInsert(err) {
            if (err) return res.status(500).json({ message: 'Erro ao registrar assinatura digital.' });

            logActivity(req.userId, 'DOCUMENT_SIGNED', `Assinatura digital registrada: ${type}`);
            res.status(201).json({
                message: 'Assinatura digital registrada com sucesso.',
                id: this.lastID,
                signature,
                signedAt: stamp,
            });
        }
    );
};

exports.listMySignatures = (req, res) => {
    db.all(
        `SELECT id, document_type, reference, signer_name, signature_hash, signed_at
         FROM digital_signatures
         WHERE user_id = ?
         ORDER BY signed_at DESC, id DESC
         LIMIT 50`,
        [req.userId],
        (err, rows) => {
            if (err) return res.status(500).json({ message: 'Erro ao buscar assinaturas digitais.' });
            res.json(rows || []);
        }
    );
};
