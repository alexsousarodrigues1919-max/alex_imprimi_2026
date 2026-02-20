let usersCache = [];

function getFilters() {
    const search = (document.getElementById('usersSearch')?.value || '').trim().toLowerCase();
    const role = document.getElementById('usersRoleFilter')?.value || '';
    const status = document.getElementById('usersStatusFilter')?.value || '';
    return { search, role, status };
}

function applyFilters(users) {
    const { search, role, status } = getFilters();

    return users.filter((u) => {
        const name = String(u.name || '').toLowerCase();
        const email = String(u.email || '').toLowerCase();
        const userRole = String(u.role || '');
        const userStatus = String(u.status || '');

        const bySearch = !search || name.includes(search) || email.includes(search);
        const byRole = !role || userRole === role;
        const byStatus = !status || userStatus === status;

        return bySearch && byRole && byStatus;
    });
}

function renderUsers() {
    const tbody = document.getElementById('usersList');
    if (!tbody) return;

    const users = applyFilters(usersCache);

    if (!users.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center p-3 text-muted">Nenhum usuário encontrado com os filtros.</td></tr>';
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
}

async function loadUsers() {
    const tbody = document.getElementById('usersList');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="7" class="text-center p-3 text-muted">Carregando usuários...</td></tr>';

    try {
        usersCache = await apiFetch('/auth/users');
        renderUsers();
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center p-3 text-danger">${escapeHtml(error.message)}</td></tr>`;
    }
}

function bindFilters() {
    const search = document.getElementById('usersSearch');
    const role = document.getElementById('usersRoleFilter');
    const status = document.getElementById('usersStatusFilter');

    if (search) search.addEventListener('input', renderUsers);
    if (role) role.addEventListener('change', renderUsers);
    if (status) status.addEventListener('change', renderUsers);
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!window.location.pathname.endsWith('users.html')) return;

    bindFilters();
    await loadUsers();
    setupAutoRefresh(loadUsers, { intervalMs: 30000 });
});
