const STORAGE_KEYS = {
    availabilities: 'horarios_availabilities',
    blocks: 'horarios_blocks',
    confirmations: 'horarios_confirmations',
};

const weekdayMap = {
    0: 'Domingo',
    1: 'Segunda',
    2: 'Terça',
    3: 'Quarta',
    4: 'Quinta',
    5: 'Sexta',
    6: 'Sábado',
};

const state = {
    professionals: [],
    meetings: [],
    availabilities: [],
    blocks: [],
    confirmations: {},
};

function loadLocalData() {
    try {
        state.availabilities = JSON.parse(localStorage.getItem(STORAGE_KEYS.availabilities) || '[]');
    } catch {
        state.availabilities = [];
    }

    try {
        state.blocks = JSON.parse(localStorage.getItem(STORAGE_KEYS.blocks) || '[]');
    } catch {
        state.blocks = [];
    }

    try {
        state.confirmations = JSON.parse(localStorage.getItem(STORAGE_KEYS.confirmations) || '{}');
    } catch {
        state.confirmations = {};
    }
}

function persistLocalData() {
    localStorage.setItem(STORAGE_KEYS.availabilities, JSON.stringify(state.availabilities));
    localStorage.setItem(STORAGE_KEYS.blocks, JSON.stringify(state.blocks));
    localStorage.setItem(STORAGE_KEYS.confirmations, JSON.stringify(state.confirmations));
}

function professionalName(id) {
    const item = state.professionals.find((p) => Number(p.id) === Number(id));
    return item ? item.name : '-';
}

function fillProfessionalSelects() {
    const av = document.getElementById('avProfessional');
    const bl = document.getElementById('blProfessional');

    if (!av || !bl) return;

    av.innerHTML = '<option value="">Selecione...</option>';
    bl.innerHTML = '<option value="">Selecione...</option>';

    state.professionals.forEach((p) => {
        const option1 = document.createElement('option');
        option1.value = p.id;
        option1.textContent = p.name;

        const option2 = option1.cloneNode(true);

        av.appendChild(option1);
        bl.appendChild(option2);
    });
}

function renderAvailabilities() {
    const tbody = document.getElementById('availabilityList');
    if (!tbody) return;

    if (!state.availabilities.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center p-3 text-muted">Sem disponibilidades.</td></tr>';
        return;
    }

    tbody.innerHTML = state.availabilities
        .map((item) => `
            <tr>
                <td>${escapeHtml(professionalName(item.professional_id))}</td>
                <td>${weekdayMap[item.weekday] || '-'}</td>
                <td>${item.start} - ${item.end}</td>
                <td>${item.slot_duration} min</td>
                <td>
                    <button class="btn btn-outline btn-icon-sm" data-action="delete-availability" data-id="${item.id}">
                        <i data-lucide="trash-2"></i>
                    </button>
                </td>
            </tr>
        `)
        .join('');

    tbody.querySelectorAll('[data-action="delete-availability"]').forEach((button) => {
        button.addEventListener('click', () => {
            const id = button.getAttribute('data-id');
            state.availabilities = state.availabilities.filter((item) => item.id !== id);
            persistLocalData();
            renderAvailabilities();
            showToast('Disponibilidade removida.', 'success');
        });
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderBlocks() {
    const tbody = document.getElementById('blocksList');
    if (!tbody) return;

    if (!state.blocks.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center p-3 text-muted">Sem bloqueios.</td></tr>';
        return;
    }

    tbody.innerHTML = state.blocks
        .sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`))
        .map((item) => `
            <tr>
                <td>${escapeHtml(professionalName(item.professional_id))}</td>
                <td>${new Date(`${item.date}T00:00:00`).toLocaleDateString('pt-BR')}</td>
                <td>${item.start} - ${item.end}</td>
                <td>${escapeHtml(item.reason)}</td>
                <td>
                    <button class="btn btn-outline btn-icon-sm" data-action="delete-block" data-id="${item.id}">
                        <i data-lucide="trash-2"></i>
                    </button>
                </td>
            </tr>
        `)
        .join('');

    tbody.querySelectorAll('[data-action="delete-block"]').forEach((button) => {
        button.addEventListener('click', () => {
            const id = button.getAttribute('data-id');
            state.blocks = state.blocks.filter((item) => item.id !== id);
            persistLocalData();
            renderBlocks();
            showToast('Bloqueio removido.', 'success');
        });
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderConfirmations() {
    const tbody = document.getElementById('confirmationsList');
    if (!tbody) return;

    const upcoming = state.meetings
        .filter((m) => m.status === 'scheduled')
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (!upcoming.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center p-3 text-muted">Nenhum horário pendente de confirmação.</td></tr>';
        return;
    }

    tbody.innerHTML = upcoming
        .map((m) => {
            const confirmed = Boolean(state.confirmations[String(m.id)]);
            return `
                <tr>
                    <td>${new Date(m.date).toLocaleString('pt-BR')}</td>
                    <td>${escapeHtml(m.title || '-')}</td>
                    <td>${escapeHtml(m.client_name || '-')}</td>
                    <td>${escapeHtml(m.professional_name || '-')}</td>
                    <td><span class="badge ${confirmed ? 'badge-success' : 'badge-warning'}">${confirmed ? 'Confirmado' : 'Pendente'}</span></td>
                    <td>
                        <div class="flex gap-1">
                            <button class="btn btn-outline btn-icon-sm" data-action="confirm" data-id="${m.id}">
                                <i data-lucide="check-circle"></i>
                            </button>
                            <button class="btn btn-outline btn-icon-sm" data-action="cancel" data-id="${m.id}">
                                <i data-lucide="x-circle"></i>
                            </button>
                            <button class="btn btn-outline btn-icon-sm" data-action="complete" data-id="${m.id}">
                                <i data-lucide="badge-check"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        })
        .join('');

    tbody.querySelectorAll('[data-action="confirm"]').forEach((button) => {
        button.addEventListener('click', async () => {
            const id = button.getAttribute('data-id');
            state.confirmations[id] = true;
            persistLocalData();

            try {
                await apiFetch('/notifications', {
                    method: 'POST',
                    body: JSON.stringify({
                        title: 'Horário confirmado',
                        message: `Reunião ID ${id} confirmada no módulo Marcar Horários.`,
                        type: 'success',
                    }),
                });
            } catch {
                // Notificação pode falhar por perfil sem permissão. Mantemos confirmação local.
            }

            renderConfirmations();
            showToast('Horário confirmado.', 'success');
        });
    });

    tbody.querySelectorAll('[data-action="cancel"]').forEach((button) => {
        button.addEventListener('click', async () => {
            const id = Number(button.getAttribute('data-id'));
            const stopLoading = setButtonLoading(button, '...');

            try {
                await apiFetch(`/meetings/${id}/status`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status: 'cancelled' }),
                });
                delete state.confirmations[String(id)];
                persistLocalData();
                await loadMeetings();
                showToast('Horário cancelado.', 'success');
            } catch (error) {
                showToast(error.message, 'error');
            } finally {
                stopLoading();
            }
        });
    });

    tbody.querySelectorAll('[data-action="complete"]').forEach((button) => {
        button.addEventListener('click', async () => {
            const id = Number(button.getAttribute('data-id'));
            const stopLoading = setButtonLoading(button, '...');

            try {
                await apiFetch(`/meetings/${id}/status`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status: 'completed' }),
                });
                delete state.confirmations[String(id)];
                persistLocalData();
                await loadMeetings();
                showToast('Horário concluído.', 'success');
            } catch (error) {
                showToast(error.message, 'error');
            } finally {
                stopLoading();
            }
        });
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function bindForms() {
    const avForm = document.getElementById('availabilityForm');
    if (avForm) {
        avForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const professional_id = Number(document.getElementById('avProfessional').value);
            const weekday = Number(document.getElementById('avWeekday').value);
            const slot_duration = Number(document.getElementById('avSlot').value);
            const start = document.getElementById('avStart').value;
            const end = document.getElementById('avEnd').value;

            if (!professional_id || !start || !end || start >= end) {
                showToast('Preencha disponibilidade com horário válido.', 'warning');
                return;
            }

            const exists = state.availabilities.some(
                (item) =>
                    Number(item.professional_id) === professional_id &&
                    Number(item.weekday) === weekday &&
                    item.start === start &&
                    item.end === end
            );

            if (exists) {
                showToast('Essa disponibilidade já foi cadastrada.', 'warning');
                return;
            }

            state.availabilities.push({
                id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                professional_id,
                weekday,
                slot_duration,
                start,
                end,
            });

            persistLocalData();
            avForm.reset();
            renderAvailabilities();
            showToast('Disponibilidade salva.', 'success');
        });
    }

    const blForm = document.getElementById('blockForm');
    if (blForm) {
        blForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const professional_id = Number(document.getElementById('blProfessional').value);
            const date = document.getElementById('blDate').value;
            const start = document.getElementById('blStart').value;
            const end = document.getElementById('blEnd').value;
            const reason = document.getElementById('blReason').value.trim();

            if (!professional_id || !date || !start || !end || !reason || start >= end) {
                showToast('Preencha bloqueio com horário válido.', 'warning');
                return;
            }

            state.blocks.push({
                id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                professional_id,
                date,
                start,
                end,
                reason,
            });

            persistLocalData();
            blForm.reset();
            const blDate = document.getElementById('blDate');
            if (blDate) blDate.value = new Date().toISOString().slice(0, 10);
            renderBlocks();
            showToast('Bloqueio registrado.', 'success');
        });
    }
}

async function loadDependencies() {
    const [professionals, meetings] = await Promise.all([
        apiFetch('/professionals'),
        apiFetch('/meetings'),
    ]);

    state.professionals = professionals;
    state.meetings = meetings;
}

async function loadMeetings() {
    state.meetings = await apiFetch('/meetings');
    renderConfirmations();
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!window.location.pathname.endsWith('horarios.html')) return;

    loadLocalData();
    bindForms();

    const blDate = document.getElementById('blDate');
    if (blDate) blDate.value = new Date().toISOString().slice(0, 10);

    try {
        await loadDependencies();
        fillProfessionalSelects();
        renderAvailabilities();
        renderBlocks();
        renderConfirmations();
        setupAutoRefresh(loadMeetings, { intervalMs: 30000 });
    } catch (error) {
        showToast(error.message, 'error');
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
});

