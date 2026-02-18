const db = require('../database');
const { logActivity } = require('../utils/logger');

function isValidDate(date) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(date || ''));
}

function addMonths(dateStr, monthsToAdd) {
    const [year, month, day] = String(dateStr).split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setMonth(date.getMonth() + Number(monthsToAdd || 0));

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function splitAmount(total, parts) {
    const cents = Math.round(Number(total) * 100);
    const base = Math.floor(cents / parts);
    const remainder = cents - base * parts;

    return Array.from({ length: parts }, (_, index) => {
        const value = base + (index === parts - 1 ? remainder : 0);
        return value / 100;
    });
}

function notifyOncePerDay({ title, message, type = 'warning' }, done) {
    db.get(
        `SELECT id FROM notifications
         WHERE user_id IS NULL
           AND title = ?
           AND message = ?
           AND date(created_at) = date('now','localtime')
         LIMIT 1`,
        [title, message],
        (lookupErr, existing) => {
            if (lookupErr || existing) return done && done();

            db.run(
                'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
                [null, title, message, type],
                () => done && done()
            );
        }
    );
}

function createDueNotifications(accounts) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const today = new Date(`${todayStr}T00:00:00`);

    accounts.forEach((account) => {
        if (account.status === 'paid') return;

        const due = new Date(`${account.due_date}T00:00:00`);
        const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (account.status === 'overdue' || diffDays < 0) {
            notifyOncePerDay({
                title: 'Conta vencida',
                message: `Conta ID ${account.id} (${account.client_name}) esta vencida desde ${new Date(`${account.due_date}T00:00:00`).toLocaleDateString('pt-BR')}.`,
                type: 'danger',
            });
            return;
        }

        if (diffDays <= 2) {
            notifyOncePerDay({
                title: 'Conta proxima do vencimento',
                message: `Conta ID ${account.id} (${account.client_name}) vence em ${new Date(`${account.due_date}T00:00:00`).toLocaleDateString('pt-BR')}.`,
                type: 'warning',
            });
        }
    });
}

exports.listAccounts = (req, res) => {
    const today = new Date().toISOString().slice(0, 10);

    db.run(
        "UPDATE client_accounts SET status = 'overdue' WHERE status = 'open' AND due_date < ?",
        [today],
        () => {
            const where = [];
            const params = [];

            if (req.query.client_id) {
                where.push('a.client_id = ?');
                params.push(Number(req.query.client_id));
            }

            if (req.query.status && ['open', 'paid', 'overdue'].includes(req.query.status)) {
                where.push('a.status = ?');
                params.push(req.query.status);
            }

            const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

            const query = `
                SELECT a.*, c.name as client_name, c.type as client_type
                FROM client_accounts a
                INNER JOIN clients c ON c.id = a.client_id
                ${whereSql}
                ORDER BY
                    CASE a.status
                        WHEN 'overdue' THEN 0
                        WHEN 'open' THEN 1
                        ELSE 2
                    END,
                    a.due_date ASC,
                    a.id DESC
            `;

            db.all(query, params, (err, rows) => {
                if (err) return res.status(500).json({ message: 'Erro ao buscar contas de cliente.' });

                createDueNotifications(rows);
                res.json(rows);
            });
        }
    );
};

exports.createAccount = (req, res) => {
    const {
        client_id,
        description,
        amount,
        due_date,
        notes,
        installments_count,
        installments_interval_months,
    } = req.body;

    if (!client_id || !description || !amount || !due_date) {
        return res.status(400).json({ message: 'Cliente, descricao, valor e vencimento sao obrigatorios.' });
    }

    const amountNumber = Number(amount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
        return res.status(400).json({ message: 'Valor invalido.' });
    }

    if (!isValidDate(due_date)) {
        return res.status(400).json({ message: 'Data de vencimento invalida.' });
    }

    const installments = Number(installments_count || 1);
    const intervalMonths = Number(installments_interval_months || 1);

    if (!Number.isInteger(installments) || installments <= 0 || installments > 48) {
        return res.status(400).json({ message: 'Quantidade de parcelas invalida.' });
    }

    if (!Number.isInteger(intervalMonths) || intervalMonths <= 0 || intervalMonths > 12) {
        return res.status(400).json({ message: 'Intervalo de parcelas invalido.' });
    }

    db.get('SELECT id, name FROM clients WHERE id = ?', [client_id], (lookupErr, client) => {
        if (lookupErr) return res.status(500).json({ message: 'Erro ao validar cliente.' });
        if (!client) return res.status(404).json({ message: 'Cliente nao encontrado.' });

        const today = new Date().toISOString().slice(0, 10);
        const installmentValues = splitAmount(amountNumber, installments);

        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            let inserted = 0;
            let failed = false;

            for (let i = 0; i < installments; i += 1) {
                const due = addMonths(due_date, i * intervalMonths);
                const status = due < today ? 'overdue' : 'open';
                const partDescription = installments > 1
                    ? `${String(description).trim()} (Parcela ${i + 1}/${installments})`
                    : String(description).trim();

                db.run(
                    `INSERT INTO client_accounts (client_id, description, amount, due_date, status, notes, created_by)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        Number(client_id),
                        partDescription,
                        installmentValues[i],
                        due,
                        status,
                        notes ? String(notes).trim() : null,
                        req.userId,
                    ],
                    (insertErr) => {
                        if (failed) return;

                        if (insertErr) {
                            failed = true;
                            db.run('ROLLBACK', () => {
                                res.status(500).json({ message: 'Erro ao cadastrar conta do cliente.' });
                            });
                            return;
                        }

                        inserted += 1;

                        if (inserted === installments) {
                            db.run('COMMIT', (commitErr) => {
                                if (commitErr) {
                                    return db.run('ROLLBACK', () => {
                                        res.status(500).json({ message: 'Erro ao finalizar cadastro de contas.' });
                                    });
                                }

                                logActivity(req.userId, 'CLIENT_ACCOUNT_CREATED', `${installments} conta(s) para cliente ${client.name}`);
                                res.status(201).json({
                                    message: installments > 1
                                        ? `Contas parceladas cadastradas com sucesso (${installments} parcelas).`
                                        : 'Conta cadastrada com sucesso.',
                                    total_created: installments,
                                });
                            });
                        }
                    }
                );
            }
        });
    });
};

exports.markAsPaid = (req, res) => {
    const { id } = req.params;
    const { paid_date } = req.body;

    const paidDate = paid_date && isValidDate(paid_date)
        ? paid_date
        : new Date().toISOString().slice(0, 10);

    db.run(
        "UPDATE client_accounts SET status = 'paid', paid_date = ? WHERE id = ?",
        [paidDate, Number(id)],
        function onUpdate(err) {
            if (err) return res.status(500).json({ message: 'Erro ao registrar recebimento.' });
            if (!this.changes) return res.status(404).json({ message: 'Conta nao encontrada.' });

            logActivity(req.userId, 'CLIENT_ACCOUNT_PAID', `Conta ${id} marcada como recebida`);
            res.json({ message: 'Recebimento registrado com sucesso.' });
        }
    );
};

exports.deleteAccount = (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM client_accounts WHERE id = ?', [Number(id)], function onDelete(err) {
        if (err) return res.status(500).json({ message: 'Erro ao excluir conta.' });
        if (!this.changes) return res.status(404).json({ message: 'Conta nao encontrada.' });

        logActivity(req.userId, 'CLIENT_ACCOUNT_DELETED', `Conta ${id} excluida`);
        res.json({ message: 'Conta excluida com sucesso.' });
    });
};
