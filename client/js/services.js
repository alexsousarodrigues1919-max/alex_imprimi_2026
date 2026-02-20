function openModal() {
    document.getElementById('serviceModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('serviceModal').style.display = 'none';
    document.getElementById('serviceForm').reset();
}

async function loadServiceDependencies() {
    const [clients, professionals] = await Promise.all([apiFetch('/clients'), apiFetch('/professionals')]);

    const clientSelect = document.getElementById('servClient');
    const profSelect = document.getElementById('servProf');

    clientSelect.innerHTML = '<option value="">Selecione...</option>';
    profSelect.innerHTML = '<option value="">Selecione...</option>';

    clients.forEach((c) => {
        const o = document.createElement('option');
        o.value = c.id;
        o.textContent = c.name;
        clientSelect.appendChild(o);
    });

    professionals.forEach((p) => {
        const o = document.createElement('option');
        o.value = p.id;
        o.textContent = p.name;
        profSelect.appendChild(o);
    });
}

async function loadServices() {
    const listBody = document.getElementById('servicesList');
    if (!listBody) return;

    const services = await apiFetch('/services');
    const canDelete = isAdminUser();

    if (!services.length) {
        listBody.innerHTML = '<tr><td colspan="6" class="text-center p-3 text-muted">Nenhum atendimento cadastrado.</td></tr>';
        return;
    }

    listBody.innerHTML = services.map((s) => `
        <tr>
            <td>${new Date(s.date).toLocaleDateString('pt-BR')} ${escapeHtml(s.time || '')}</td>
            <td>${escapeHtml(s.client_name || '-')}</td>
            <td>${escapeHtml(s.professional_name || '-')}</td>
            <td>${escapeHtml(s.type || '-')}</td>
            <td>R$ ${Number(s.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            <td>
                ${canDelete
                    ? `<button class="btn btn-outline btn-icon-sm" onclick="deleteService(${s.id}, this)"><i data-lucide="trash-2"></i></button>`
                    : '<span class="text-muted">Sem permissao</span>'}
            </td>
        </tr>
    `).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function deleteService(id, button) {
    if (!isAdminUser()) {
        showToast('Apenas administrador pode excluir atendimento.', 'warning');
        return;
    }

    if (!confirm('Excluir atendimento?')) return;

    const stopLoading = setButtonLoading(button, '...');

    try {
        await apiFetch(`/services/${id}`, { method: 'DELETE' });
        showToast('Atendimento removido.', 'success');
        await loadServices();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        stopLoading();
    }
}

const serviceForm = document.getElementById('serviceForm');
if (serviceForm) {
    serviceForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const payload = {
            client_id: Number(document.getElementById('servClient').value),
            professional_id: Number(document.getElementById('servProf').value),
            type: document.getElementById('servType').value.trim(),
            date: document.getElementById('servDate').value,
            time: document.getElementById('servTime').value,
            description: document.getElementById('servDesc').value.trim(),
            value: Number(document.getElementById('servValue').value || 0),
            status: 'pendente',
        };

        if (!payload.client_id || !payload.professional_id || !payload.type || !payload.date) {
            showToast('Preencha os campos obrigatorios do atendimento.', 'warning');
            return;
        }

        const button = serviceForm.querySelector('button[type="submit"]');
        const stopLoading = setButtonLoading(button, 'Salvando...');

        try {
            await apiFetch('/services', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            closeModal();
            showToast('Atendimento registrado.', 'success');
            await loadServices();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            stopLoading();
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!window.location.pathname.endsWith('services.html')) return;

    try {
        await loadServiceDependencies();
        await loadServices();
        setupAutoRefresh(loadServices, { intervalMs: 30000 });
    } catch (error) {
        showToast(error.message, 'error');
    }
});

