async function loadUsers() {
    const tbody = document.getElementById('usersList');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="7" class="text-center p-3 text-muted">Carregando usuários...</td></tr>';

    try {
        const users = await apiFetch('/auth/users');

        if (!users.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center p-3 text-muted">Nenhum usuário cadastrado.</td></tr>';
            return;
        }

        tbody.innerHTML = users
            .map((u) => {
                const created = u.created_at ? new Date(u.created_at).toLocaleString('pt-BR') : '-';
                const lastAccess = u.last_access ? new Date(u.last_access).toLocaleString('pt-BR') : 'Sem acesso';
                const statusBadge = u.status === 'inactive' ? 'badge-warning' : 'badge-success';
                const statusLabel = u.status === 'inactive' ? 'Inativo' : 'Ativo';

                return `
                    <tr>
                        <td>${escapeHtml(u.name || '-')}</td>
                        <td>${escapeHtml(u.email || '-')}</td>
                        <td>${escapeHtml(u.role || '-')}</td>
                        <td>${escapeHtml(u.phone || '-')}</td>
                        <td><span class="badge ${statusBadge}">${statusLabel}</span></td>
                        <td>${created}</td>
                        <td>${lastAccess}</td>
                    </tr>
                `;
            })
            .join('');
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center p-3 text-danger">${escapeHtml(error.message)}</td></tr>`;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!window.location.pathname.endsWith('users.html')) return;

    await loadUsers();
    setupAutoRefresh(loadUsers, { intervalMs: 30000 });
});
