async function loadReports() {
    const reportCards = document.getElementById('reportCards');
    if (!reportCards) return;

    try {
        const summary = await apiFetch('/reports/summary');

        const cards = [
            { title: 'Total de Clientes', value: summary.totalClients },
            { title: 'Contas Pendentes', value: summary.pendingExpenses },
            { title: 'Despesas do Mes', value: `R$ ${Number(summary.monthExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
            { title: 'Reunioes Agendadas', value: summary.scheduledMeetings },
            { title: 'Projetos Ativos', value: summary.activeProjects },
            { title: 'Saldo do Mes', value: `R$ ${(Number(summary.totalIncomeMonth) - Number(summary.totalExpenseMonth)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
        ];

        reportCards.innerHTML = cards.map((c) => `
            <div class="glass-card">
                <div class="text-muted" style="font-size:.85rem;">${escapeHtml(c.title)}</div>
                <div class="stats-value">${escapeHtml(String(c.value))}</div>
            </div>
        `).join('');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.endsWith('reports.html')) loadReports();
});
