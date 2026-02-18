const db = require('../database');

exports.summary = (req, res) => {
    const data = {
        totalClients: 0,
        pendingExpenses: 0,
        monthExpenses: 0,
        scheduledMeetings: 0,
        activeProjects: 0,
        totalIncomeMonth: 0,
        totalExpenseMonth: 0,
    };

    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    db.get('SELECT COUNT(*) as total FROM clients', [], (cErr, cRow) => {
        if (cErr) return res.status(500).json({ message: 'Erro ao montar resumo.' });
        data.totalClients = cRow.total;

        db.get(
            "SELECT COUNT(*) as total FROM financials WHERE type = 'expense' AND date >= ?",
            [monthStart],
            (pErr, pRow) => {
                if (pErr) return res.status(500).json({ message: 'Erro ao montar resumo.' });
                data.pendingExpenses = pRow.total;

                db.get(
                    "SELECT COALESCE(SUM(amount),0) as total FROM financials WHERE type = 'expense' AND date >= ?",
                    [monthStart],
                    (eErr, eRow) => {
                        if (eErr) return res.status(500).json({ message: 'Erro ao montar resumo.' });
                        data.monthExpenses = Number(eRow.total || 0);
                        data.totalExpenseMonth = data.monthExpenses;

                        db.get(
                            "SELECT COALESCE(SUM(amount),0) as total FROM financials WHERE type = 'income' AND date >= ?",
                            [monthStart],
                            (iErr, iRow) => {
                                if (iErr) return res.status(500).json({ message: 'Erro ao montar resumo.' });
                                data.totalIncomeMonth = Number(iRow.total || 0);

                                db.get(
                                    "SELECT COUNT(*) as total FROM meetings WHERE status = 'scheduled'",
                                    [],
                                    (mErr, mRow) => {
                                        if (mErr) return res.status(500).json({ message: 'Erro ao montar resumo.' });
                                        data.scheduledMeetings = mRow.total;

                                        db.get(
                                            "SELECT COUNT(*) as total FROM projects WHERE status = 'active'",
                                            [],
                                            (prErr, prRow) => {
                                                if (prErr) return res.status(500).json({ message: 'Erro ao montar resumo.' });
                                                data.activeProjects = prRow.total;
                                                res.json(data);
                                            }
                                        );
                                    }
                                );
                            }
                        );
                    }
                );
            }
        );
    });
};
