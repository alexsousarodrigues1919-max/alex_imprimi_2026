async function fetchProfessionals() {
    const grid = document.getElementById('profGrid');
    if (!grid) return;

    grid.innerHTML = '<p class="text-muted">Carregando equipe...</p>';

    try {
        const professionals = await apiFetch('/professionals');

        if (!professionals.length) {
            grid.innerHTML = '<p class="text-muted">Nenhum profissional cadastrado.</p>';
            return;
        }

        const canDelete = isAdminUser();

        grid.innerHTML = professionals
            .map(
                (p) => `
                <div class="glass-card prof-card">
                    <div class="prof-name">${escapeHtml(p.name)}</div>
                    <div class="prof-specialty">${escapeHtml(p.specialty || '-')}</div>
                    <div class="prof-info">
                        <span>Registro: ${escapeHtml(p.registration_number || '-')}</span>
                        <span>E-mail: ${escapeHtml(p.email || '-')}</span>
                        <span>Comissao: ${Number(p.commission_rate || 0)}%</span>
                    </div>
                    <div class="prof-actions">
                        ${canDelete
                            ? `<button class="btn btn-outline btn-icon-xs danger-soft" onclick="deleteProfessional(${p.id}, this)"><i data-lucide="trash-2"></i></button>`
                            : '<span class="text-muted">Sem permissao</span>'}
                    </div>
                </div>
            `
            )
            .join('');

        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (error) {
        grid.innerHTML = `<p class="cell-danger">${escapeHtml(error.message)}</p>`;
    }
}

function openModal() {
    document.getElementById('profModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('profModal').style.display = 'none';
    document.getElementById('profForm').reset();
    document.getElementById('modalError').textContent = '';
}

async function deleteProfessional(id, button) {
    if (!isAdminUser()) {
        showToast('Apenas administrador pode remover profissional.', 'warning');
        return;
    }

    if (!confirm('Remover profissional?')) return;

    const stopLoading = setButtonLoading(button, '...');

    try {
        await apiFetch(`/professionals/${id}`, { method: 'DELETE' });
        showToast('Profissional removido.', 'success');
        await fetchProfessionals();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        stopLoading();
    }
}

const profForm = document.getElementById('profForm');
if (profForm) {
    profForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const payload = {
            name: document.getElementById('profName').value.trim(),
            specialty: document.getElementById('profSpecialty').value.trim(),
            registration_number: document.getElementById('profReg').value.trim(),
            email: document.getElementById('profEmail').value.trim(),
            phone: document.getElementById('profPhone').value.trim(),
            commission_rate: document.getElementById('profCommission').value,
            cpf: document.getElementById('profCpf')?.value?.trim() || '',
            available_hours: document.getElementById('profHours')?.value?.trim() || '',
        };

        const modalError = document.getElementById('modalError');
        const button = profForm.querySelector('button[type="submit"]');
        modalError.textContent = '';

        if (!payload.name || !payload.specialty) {
            modalError.textContent = 'Nome e especialidade sao obrigatorios.';
            return;
        }

        const stopLoading = setButtonLoading(button, 'Salvando...');

        try {
            await apiFetch('/professionals', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            closeModal();
            showToast('Profissional cadastrado.', 'success');
            await fetchProfessionals();
        } catch (error) {
            modalError.textContent = error.message;
            showToast(error.message, 'error');
        } finally {
            stopLoading();
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.endsWith('professionals.html')) fetchProfessionals();
});
