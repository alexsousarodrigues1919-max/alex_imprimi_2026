function formatCurrency(value) {
    return `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function formatDateTime(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('pt-BR');
}

function renderSimpleList(containerId, items, emptyText) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!items.length) {
        container.innerHTML = `<p class="text-muted">${escapeHtml(emptyText)}</p>`;
        return;
    }

    container.innerHTML = items.join('');
}

function getStatusBadge(status) {
    const normalized = String(status || '').toLowerCase();
    const warn = ['pendente', 'agendado', 'scheduled', 'aguardando'];
    return `<span class="p360-badge ${warn.includes(normalized) ? 'warn' : 'ok'}">${escapeHtml(status || 'ok')}</span>`;
}

async function loadProfessional360() {
    const data = await apiFetch('/professionals/platform');

    const userName = data?.user?.name || 'Profissional';
    const specialty = data?.professional?.specialty || 'Sem especialidade definida';
    const welcome = document.getElementById('p360Welcome');
    if (welcome) {
        welcome.textContent = `${userName} | ${specialty}`;
    }

    const summary = data?.summary || {};
    document.getElementById('p360Meetings').textContent = Number(summary.totalMeetings || 0);
    document.getElementById('p360PendingServices').textContent = Number(summary.pendingServices || 0);
    document.getElementById('p360Projects').textContent = Number(summary.activeProjects || 0);
    document.getElementById('p360Revenue').textContent = formatCurrency(summary.monthRevenue || 0);
    document.getElementById('p360Commission').textContent = `Comissao estimada: ${formatCurrency(summary.estimatedCommission || 0)}`;

    const alerts = Array.isArray(data.alerts) ? data.alerts : [];
    renderSimpleList(
        'p360Alerts',
        alerts.map((msg) => `<div class="p360-alert">${escapeHtml(msg)}</div>`),
        'Sem alertas no momento.'
    );

    const meetings = Array.isArray(data.upcomingMeetings) ? data.upcomingMeetings : [];
    renderSimpleList(
        'p360MeetingsList',
        meetings.map((m) => `
            <div class="p360-item">
                <div>
                    <strong>${escapeHtml(m.title || 'Reuniao')}</strong><br>
                    <small class="text-muted">${formatDateTime(m.date)} | ${escapeHtml(m.location || 'Local nao informado')}</small>
                </div>
                ${getStatusBadge(m.status)}
            </div>
        `),
        'Nenhuma reuniao futura.'
    );

    const services = Array.isArray(data.recentServices) ? data.recentServices : [];
    renderSimpleList(
        'p360ServicesList',
        services.map((s) => `
            <div class="p360-item">
                <div>
                    <strong>${escapeHtml(s.type || 'Atendimento')}</strong><br>
                    <small class="text-muted">${escapeHtml(s.date || '-')} ${escapeHtml(s.time || '')} | ${formatCurrency(s.value || 0)}</small>
                </div>
                ${getStatusBadge(s.status)}
            </div>
        `),
        'Nenhum atendimento registrado.'
    );

    if (!data.professionalLinked) {
        showToast('Perfil profissional nao vinculado. Cadastre no modulo Profissionais com o mesmo e-mail.', 'warning');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const page = (window.location.pathname.split('/').pop() || '').replace('.html', '');
    if (page !== 'profissional-360') return;

    const refreshBtn = document.getElementById('refreshP360Btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            const stop = setButtonLoading(refreshBtn, 'Atualizando...');
            try {
                await loadProfessional360();
                showToast('Plataforma atualizada.', 'success');
            } catch (error) {
                showToast(error.message, 'error');
            } finally {
                stop();
            }
        });
    }

    document.querySelectorAll('[data-doc]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const type = btn.getAttribute('data-doc');
            showToast(`Documento ${type} em implementacao de PDF.`, 'info');
        });
    });

    try {
        await loadProfessional360();
    } catch (error) {
        showToast(error.message, 'error');
    }

    setupAutoRefresh(loadProfessional360, { intervalMs: 30000 });

    if (typeof lucide !== 'undefined') lucide.createIcons();
});
