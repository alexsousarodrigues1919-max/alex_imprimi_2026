async function loadClients() {
    const listBody = document.getElementById('clientsList');
    if (!listBody) return;

    listBody.innerHTML = '<tr><td colspan="6" class="text-center p-3 text-muted">Carregando...</td></tr>';

    try {
        const clients = await apiFetch('/clients');

        if (!clients.length) {
            listBody.innerHTML = '<tr><td colspan="6" class="text-center p-3 text-muted">Nenhum cliente cadastrado.</td></tr>';
            return;
        }

        const canDelete = isAdminUser();

        listBody.innerHTML = clients
            .map(
                (c) => `
                <tr>
                    <td>${escapeHtml(c.name)}<br><small class="text-muted">${escapeHtml(c.email || '-')}</small></td>
                    <td>${escapeHtml(c.document)}</td>
                    <td>${escapeHtml(c.type)}</td>
                    <td>${escapeHtml(c.phone || '-')}</td>
                    <td>${c.status === 'inactive' ? 'Inativo' : 'Ativo'}</td>
                    <td>
                        ${canDelete
                            ? `<button class="btn btn-outline btn-icon-sm" onclick="deleteClient(${c.id}, this)"><i data-lucide="trash-2"></i></button>`
                            : '<span class="text-muted">Sem permissao</span>'}
                    </td>
                </tr>
            `
            )
            .join('');

        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (error) {
        listBody.innerHTML = `<tr><td colspan="6" class="text-center p-3 cell-danger">${escapeHtml(error.message)}</td></tr>`;
    }
}

async function deleteClient(id, btn) {
    if (!isAdminUser()) {
        showToast('Apenas administrador pode excluir cliente.', 'warning');
        return;
    }

    if (!confirm('Deseja excluir este cliente?')) return;

    const stopLoading = setButtonLoading(btn, '...');

    try {
        await apiFetch(`/clients/${id}`, { method: 'DELETE' });
        showToast('Cliente removido.', 'success');
        await loadClients();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        stopLoading();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.endsWith('clients.html')) {
        loadClients();
        setupAutoRefresh(loadClients, { intervalMs: 30000 });
    }
});

