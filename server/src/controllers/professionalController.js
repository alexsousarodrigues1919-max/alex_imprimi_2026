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

exports.getProfessionalPlatform = (req, res) => {
    db.get('SELECT id, name, email, role FROM users WHERE id = ?', [req.userId], (userErr, user) => {
        if (userErr) return res.status(500).json({ message: 'Erro ao buscar usuario.' });
        if (!user) return res.status(404).json({ message: 'Usuario nao encontrado.' });

        const email = String(user.email || '').trim().toLowerCase();
        const name = String(user.name || '').trim();

        db.get(
            `SELECT id, name, specialty, registration_number, commission_rate, available_hours
             FROM professionals
             WHERE (email IS NOT NULL AND LOWER(email) = ?) OR name = ?
             ORDER BY id DESC
             LIMIT 1`,
            [email, name],
            (profErr, professional) => {
                if (profErr) return res.status(500).json({ message: 'Erro ao buscar perfil profissional.' });

                if (!professional) {
                    return res.json({
                        professionalLinked: false,
                        user,
                        summary: {
                            totalMeetings: 0,
                            pendingServices: 0,
                            activeProjects: 0,
                            monthRevenue: 0,
                            estimatedCommission: 0,
                        },
                        upcomingMeetings: [],
                        recentServices: [],
                        alerts: ['Perfil profissional nao vinculado. Cadastre o profissional com o mesmo e-mail do usuario.'],
                    });
                }

                const professionalId = professional.id;
                const monthPrefix = new Date().toISOString().slice(0, 7);
                const nowIso = new Date().toISOString();

                db.all(
                    `SELECT id, title, date, status, meeting_type, location
                     FROM meetings
                     WHERE professional_id = ? AND date >= ?
                     ORDER BY date ASC
                     LIMIT 10`,
                    [professionalId, nowIso],
                    (meetingsErr, upcomingMeetings) => {
                        if (meetingsErr) return res.status(500).json({ message: 'Erro ao buscar reunioes.' });

                        db.all(
                            `SELECT id, type, date, time, status, value, description
                             FROM services
                             WHERE professional_id = ?
                             ORDER BY date DESC, time DESC
                             LIMIT 10`,
                            [professionalId],
                            (servicesErr, recentServices) => {
                                if (servicesErr) return res.status(500).json({ message: 'Erro ao buscar atendimentos.' });

                                db.get(
                                    'SELECT COUNT(*) AS totalMeetings FROM meetings WHERE professional_id = ?',
                                    [professionalId],
                                    (countMeetErr, totalMeetingsRow) => {
                                        if (countMeetErr) return res.status(500).json({ message: 'Erro ao consolidar reunioes.' });

                                        db.get(
                                            `SELECT COUNT(*) AS pendingServices
                                             FROM services
                                             WHERE professional_id = ? AND status IN ('pendente', 'agendado')`,
                                            [professionalId],
                                            (pendingErr, pendingServicesRow) => {
                                                if (pendingErr) return res.status(500).json({ message: 'Erro ao consolidar atendimentos.' });

                                                db.get(
                                                    `SELECT COUNT(*) AS activeProjects
                                                     FROM projects
                                                     WHERE professional_id = ? AND status IN ('active', 'em_andamento')`,
                                                    [professionalId],
                                                    (projectsErr, activeProjectsRow) => {
                                                        if (projectsErr) {
                                                            return res.status(500).json({ message: 'Erro ao consolidar projetos.' });
                                                        }

                                                        db.get(
                                                            `SELECT COALESCE(SUM(value), 0) AS monthRevenue
                                                             FROM services
                                                             WHERE professional_id = ? AND date LIKE ?`,
                                                            [professionalId, `${monthPrefix}%`],
                                                            (revenueErr, revenueRow) => {
                                                                if (revenueErr) {
                                                                    return res.status(500).json({ message: 'Erro ao consolidar receita mensal.' });
                                                                }

                                                                const monthRevenue = Number(revenueRow?.monthRevenue || 0);
                                                                const commissionRate = Number(professional.commission_rate || 0);
                                                                const estimatedCommission = (monthRevenue * commissionRate) / 100;
                                                                const alerts = [];

                                                                if (!upcomingMeetings.length) {
                                                                    alerts.push('Nenhuma reuniao futura agendada.');
                                                                }
                                                                if (Number(pendingServicesRow?.pendingServices || 0) > 5) {
                                                                    alerts.push('Volume alto de atendimentos pendentes.');
                                                                }

                                                                return res.json({
                                                                    professionalLinked: true,
                                                                    user,
                                                                    professional,
                                                                    summary: {
                                                                        totalMeetings: Number(totalMeetingsRow?.totalMeetings || 0),
                                                                        pendingServices: Number(pendingServicesRow?.pendingServices || 0),
                                                                        activeProjects: Number(activeProjectsRow?.activeProjects || 0),
                                                                        monthRevenue,
                                                                        estimatedCommission,
                                                                    },
                                                                    upcomingMeetings,
                                                                    recentServices,
                                                                    alerts,
                                                                });
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
                    }
                );
            }
        );
    });
};
