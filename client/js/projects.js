function openModal() {
    document.getElementById('projectModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('projectModal').style.display = 'none';
    document.getElementById('projectForm').reset();
}

async function loadProjectDependencies() {
    const [clients, professionals] = await Promise.all([apiFetch('/clients'), apiFetch('/professionals')]);

    const clientSelect = document.getElementById('projClient');
    const profSelect = document.getElementById('projProf');

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

async function loadProjects() {
    const grid = document.getElementById('projectsGrid');
    const list = document.getElementById('projectsList');

    try {
        const projects = await apiFetch('/projects');
        const canDelete = isAdminUser();

        if (list) {
            if (!projects.length) {
                list.innerHTML = '<tr><td colspan="5" class="text-center p-3 text-muted">Nenhum projeto.</td></tr>';
            } else {
                list.innerHTML = projects.map((p) => `
                    <tr>
                        <td>${escapeHtml(p.name)}<br><small class="text-muted">Cliente: ${escapeHtml(p.client_name || '-')}</small></td>
                        <td>${Number(p.progress || 0)}%</td>
                        <td>${escapeHtml(p.status || 'active')}</td>
                        <td>R$ ${Number(p.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td>${canDelete
                            ? `<button class="btn btn-outline btn-icon-sm" onclick="deleteProject(${p.id}, this)"><i data-lucide="trash-2"></i></button>`
                            : '<span class="text-muted">Sem permissao</span>'}</td>
                    </tr>
                `).join('');
            }
        } else if (grid) {
            if (!projects.length) {
                grid.innerHTML = '<p class="text-muted">Nenhum projeto cadastrado.</p>';
            } else {
                grid.innerHTML = projects.map((p) => `
                    <div class="glass-card project-card">
                        <div class="project-header">
                            <div class="project-title">${escapeHtml(p.name)}</div>
                            <span class="badge badge-info">${escapeHtml(p.status || 'active')}</span>
                        </div>
                        <div class="project-progress"><div class="progress-bar" style="width:${Number(p.progress || 0)}%"></div></div>
                        <div class="project-meta">
                            <span>Cliente: ${escapeHtml(p.client_name || '-')}</span>
                            <span>Profissional: ${escapeHtml(p.professional_name || '-')}</span>
                            <span>Valor: R$ ${Number(p.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        ${canDelete
                            ? `<button class="btn btn-outline" onclick="deleteProject(${p.id}, this)"><i data-lucide="trash-2"></i> Excluir</button>`
                            : '<span class="text-muted">Sem permissao para excluir</span>'}
                    </div>
                `).join('');
            }
        }

        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function deleteProject(id, button) {
    if (!isAdminUser()) {
        showToast('Apenas administrador pode excluir projeto.', 'warning');
        return;
    }

    if (!confirm('Excluir projeto?')) return;

    const stopLoading = setButtonLoading(button, '...');

    try {
        await apiFetch(`/projects/${id}`, { method: 'DELETE' });
        showToast('Projeto removido.', 'success');
        await loadProjects();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        stopLoading();
    }
}

const projectForm = document.getElementById('projectForm');
if (projectForm) {
    projectForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const payload = {
            name: document.getElementById('projName').value.trim(),
            client_id: Number(document.getElementById('projClient').value),
            professional_id: Number(document.getElementById('projProf').value),
            start_date: document.getElementById('projStart').value,
            end_date: document.getElementById('projEnd').value,
            value: Number(document.getElementById('projValue').value || 0),
            status: 'active',
            progress: 0,
        };

        if (!payload.name || !payload.client_id || !payload.professional_id) {
            showToast('Preencha os campos obrigatorios do projeto.', 'warning');
            return;
        }

        const button = projectForm.querySelector('button[type="submit"]');
        const stopLoading = setButtonLoading(button, 'Criando...');

        try {
            await apiFetch('/projects', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            closeModal();
            showToast('Projeto criado.', 'success');
            await loadProjects();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            stopLoading();
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!window.location.pathname.endsWith('projects.html')) return;

    try {
        await loadProjectDependencies();
        await loadProjects();
    } catch (error) {
        showToast(error.message, 'error');
    }
});
