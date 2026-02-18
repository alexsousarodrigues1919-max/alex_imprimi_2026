function formatCurrency(value) {
    return `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function setBar(barId, value, maxValue) {
    const el = document.getElementById(barId);
    if (!el) return;
    const safeMax = maxValue > 0 ? maxValue : 1;
    const pct = Math.min(100, Math.round((value / safeMax) * 100));
    el.style.width = `${pct}%`;
}

function renderList(containerId, items, emptyText) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!items.length) {
        container.innerHTML = `<p class="text-muted dashboard-list-empty">${emptyText}</p>`;
        return;
    }

    container.innerHTML = items.join('');
}

function buildAlertItems(summary) {
    const alerts = [];
    const balance = Number(summary.totalIncomeMonth || 0) - Number(summary.totalExpenseMonth || 0);

    if (balance < 0) {
        alerts.push('<div class="dashboard-item dashboard-item-danger"><strong>Saldo negativo</strong><span>As despesas superaram as receitas no mes.</span></div>');
    }

    if (Number(summary.scheduledMeetings || 0) === 0) {
        alerts.push('<div class="dashboard-item dashboard-item-warning"><strong>Agenda vazia</strong><span>Nenhuma reuniao agendada no momento.</span></div>');
    }

    if (Number(summary.activeProjects || 0) >= 10) {
        alerts.push('<div class="dashboard-item dashboard-item-warning"><strong>Alta demanda</strong><span>Projetos ativos em volume elevado.</span></div>');
    }

    if (!alerts.length) {
        alerts.push('<div class="dashboard-item dashboard-item-success"><strong>Operacao saudavel</strong><span>Sem alertas criticos no momento.</span></div>');
    }

    return alerts;
}

async function loadDashboard() {
    const summary = await apiFetch('/reports/summary');
    const meetings = await apiFetch('/meetings');
    const notifications = await apiFetch('/notifications');

    document.getElementById('totalClients').innerText = summary.totalClients ?? 0;
    document.getElementById('monthlyRevenue').innerText = formatCurrency(summary.totalIncomeMonth || 0);
    document.getElementById('meetingsToday').innerText = summary.scheduledMeetings ?? 0;
    document.getElementById('activeProjects').innerText = summary.activeProjects ?? 0;

    const income = Number(summary.totalIncomeMonth || 0);
    const expense = Number(summary.totalExpenseMonth || 0);
    const max = Math.max(income, expense, 1);
    setBar('incomeBar', income, max);
    setBar('expenseBar', expense, max);

    const balance = income - expense;
    const balanceEl = document.getElementById('monthBalance');
    if (balanceEl) {
        balanceEl.textContent = `Saldo do mes: ${formatCurrency(balance)}`;
        balanceEl.classList.toggle('dashboard-balance-negative', balance < 0);
    }

    const incomeValue = document.getElementById('incomeValue');
    const expenseValue = document.getElementById('expenseValue');
    if (incomeValue) incomeValue.textContent = formatCurrency(income);
    if (expenseValue) expenseValue.textContent = formatCurrency(expense);

    const nextMeeting = meetings.find((m) => m.status === 'scheduled');
    const hint = document.getElementById('nextMeetingHint');
    if (hint) {
        hint.textContent = nextMeeting
            ? `Proxima: ${new Date(nextMeeting.date).toLocaleString('pt-BR')}`
            : 'Sem proxima reuniao';
    }

    const topMeetings = meetings
        .filter((m) => m.status === 'scheduled')
        .slice(0, 5)
        .map(
            (m) => `
            <div class="dashboard-item">
                <strong>${escapeHtml(m.title)}</strong>
                <span>${new Date(m.date).toLocaleString('pt-BR')} | ${escapeHtml(m.client_name || 'Sem cliente')}</span>
            </div>
        `
        );

    renderList('quickAgenda', topMeetings, 'Nenhuma reuniao agendada.');

    const topNotifications = notifications
        .slice(0, 5)
        .map(
            (n) => `
            <div class="dashboard-item ${n.is_read ? '' : 'dashboard-item-info'}">
                <strong>${escapeHtml(n.title)}</strong>
                <span>${escapeHtml(n.message)}</span>
            </div>
        `
        );

    renderList('dashboardNotifications', topNotifications, 'Sem notificacoes recentes.');
    renderList('dashboardAlerts', buildAlertItems(summary), 'Sem alertas.');
}

function fillHeaderUser() {
    const user = getCurrentUser();
    const userName = document.getElementById('userName');
    const userRole = document.getElementById('userRole');
    const userAvatar = document.getElementById('userAvatar');
    const dashboardDate = document.getElementById('dashboardDate');

    if (userName) userName.innerText = user.name || 'Usuario';
    if (userRole) userRole.innerText = user.role || '-';

    if (userAvatar) {
        const initials = (user.name || 'Office Pro')
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((chunk) => chunk[0].toUpperCase())
            .join('');
        userAvatar.textContent = initials || 'OP';
    }

    if (dashboardDate) {
        dashboardDate.textContent = new Date().toLocaleString('pt-BR', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const page = window.location.pathname.split('/').pop().split('.').shift();
    if (page !== 'dashboard') return;

    fillHeaderUser();

    const refreshBtn = document.getElementById('refreshDashboardBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            const stop = setButtonLoading(refreshBtn, 'Atualizando...');
            try {
                await loadDashboard();
                showToast('Dashboard atualizado.', 'success');
            } catch (error) {
                showToast(error.message, 'error');
            } finally {
                stop();
            }
        });
    }

    const dashboardMenuSelect = document.getElementById('dashboardMenuSelect');
    if (dashboardMenuSelect) {
        dashboardMenuSelect.addEventListener('change', (e) => {
            const target = e.target.value;
            if (target) window.location.href = target;
        });
    }

    try {
        await loadDashboard();
    } catch (error) {
        showToast(error.message, 'error');
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
});
