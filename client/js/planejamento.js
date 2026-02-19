const STORAGE_KEY = 'planejamento_items';

const state = {
    items: [],
    professionals: [],
};

function loadItems() {
    try {
        state.items = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
        state.items = [];
    }
}

function saveItems() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
}

function getResponsibleName(id) {
    const prof = state.professionals.find((p) => Number(p.id) === Number(id));
    return prof ? prof.name : '-';
}

function statusLabel(status, dueDate) {
    if (status === 'concluido') return { text: 'Concluído', cls: 'badge-success' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(`${dueDate}T00:00:00`);

    if (status !== 'concluido' && due < today) {
        return { text: 'Atrasado', cls: 'badge-danger' };
    }

    if (status === 'andamento') return { text: 'Em Andamento', cls: 'badge-info' };
    return { text: 'Pendente', cls: 'badge-warning' };
}

function priorityLabel(priority) {
    if (priority === 'alta') return { text: 'Alta', cls: 'badge-danger' };
    if (priority === 'baixa') return { text: 'Baixa', cls: 'badge-success' };
    return { text: 'Média', cls: 'badge-info' };
}

function applyFilters(items) {
    const filterStatus = document.getElementById('plFilterStatus')?.value || '';
    const filterPriority = document.getElementById('plFilterPriority')?.value || '';

    return items.filter((item) => {
        const s = statusLabel(item.status, item.due_date).text.toLowerCase();
        const matchesStatus = !filterStatus
            || item.status === filterStatus
            || (filterStatus === 'atrasado' && s === 'atrasado');
        const matchesPriority = !filterPriority || item.priority === filterPriority;
        return matchesStatus && matchesPriority;
    });
}

function renderSummary() {
    const total = state.items.length;
    const done = state.items.filter((i) => i.status === 'concluido').length;
    const doing = state.items.filter((i) => i.status === 'andamento').length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const late = state.items.filter((i) => i.status !== 'concluido' && new Date(`${i.due_date}T00:00:00`) < today).length;

    const totalEl = document.getElementById('plTotal');
    const doneEl = document.getElementById('plDone');
    const doingEl = document.getElementById('plDoing');
    const lateEl = document.getElementById('plLate');

    if (totalEl) totalEl.textContent = String(total);
    if (doneEl) doneEl.textContent = String(done);
    if (doingEl) doingEl.textContent = String(doing);
    if (lateEl) lateEl.textContent = String(late);
}

function renderList() {
    const tbody = document.getElementById('planningList');
    if (!tbody) return;

    const items = applyFilters(state.items)
        .sort((a, b) => `${a.due_date}`.localeCompare(`${b.due_date}`));

    if (!items.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center p-3 text-muted">Nenhum item de planejamento.</td></tr>';
        renderSummary();
        return;
    }

    tbody.innerHTML = items.map((item) => {
        const st = statusLabel(item.status, item.due_date);
        const pr = priorityLabel(item.priority);

        return `
            <tr>
                <td>
                    <strong>${escapeHtml(item.title)}</strong>
                    ${item.notes ? `<div class="text-muted text-sm mt-1">${escapeHtml(item.notes)}</div>` : ''}
                </td>
                <td>${escapeHtml(getResponsibleName(item.responsible_id))}</td>
                <td><span class="badge ${pr.cls}">${pr.text}</span></td>
                <td>${new Date(`${item.due_date}T00:00:00`).toLocaleDateString('pt-BR')}</td>
                <td><span class="badge ${st.cls}">${st.text}</span></td>
                <td>
                    <div class="flex gap-1">
                        <button class="btn btn-outline btn-icon-sm" data-action="next-status" data-id="${item.id}">
                            <i data-lucide="refresh-cw"></i>
                        </button>
                        <button class="btn btn-outline btn-icon-sm" data-action="delete" data-id="${item.id}">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    tbody.querySelectorAll('[data-action="next-status"]').forEach((button) => {
        button.addEventListener('click', () => {
            const id = button.getAttribute('data-id');
            const item = state.items.find((i) => i.id === id);
            if (!item) return;

            if (item.status === 'pendente') item.status = 'andamento';
            else if (item.status === 'andamento') item.status = 'concluido';
            else item.status = 'pendente';

            saveItems();
            renderList();
            showToast('Status atualizado.', 'success');
        });
    });

    tbody.querySelectorAll('[data-action="delete"]').forEach((button) => {
        button.addEventListener('click', () => {
            const id = button.getAttribute('data-id');
            if (!confirm('Excluir este item de planejamento?')) return;

            state.items = state.items.filter((i) => i.id !== id);
            saveItems();
            renderList();
            showToast('Item removido.', 'success');
        });
    });

    renderSummary();
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function bindForm() {
    const form = document.getElementById('planningForm');
    if (!form) return;

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        const title = document.getElementById('plTitle').value.trim();
        const responsible_id = Number(document.getElementById('plResponsible').value);
        const priority = document.getElementById('plPriority').value;
        const due_date = document.getElementById('plDueDate').value;
        const status = document.getElementById('plStatus').value;
        const notes = document.getElementById('plNotes').value.trim();

        if (!title || !responsible_id || !due_date || !priority || !status) {
            showToast('Preencha todos os campos obrigatórios.', 'warning');
            return;
        }

        state.items.push({
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            title,
            responsible_id,
            priority,
            due_date,
            status,
            notes,
            created_at: new Date().toISOString(),
        });

        saveItems();
        form.reset();

        const due = document.getElementById('plDueDate');
        if (due) due.value = new Date().toISOString().slice(0, 10);

        renderList();
        showToast('Planejamento adicionado.', 'success');
    });
}

function bindFilters() {
    const status = document.getElementById('plFilterStatus');
    const priority = document.getElementById('plFilterPriority');

    if (status) status.addEventListener('change', renderList);
    if (priority) priority.addEventListener('change', renderList);
}

async function loadProfessionals() {
    const select = document.getElementById('plResponsible');
    if (!select) return;

    select.innerHTML = '<option value="">Selecione...</option>';

    try {
        state.professionals = await apiFetch('/professionals');
    } catch {
        state.professionals = [];
    }

    state.professionals.forEach((p) => {
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = p.name;
        select.appendChild(option);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!window.location.pathname.endsWith('planejamento.html')) return;

    loadItems();
    bindForm();
    bindFilters();

    const due = document.getElementById('plDueDate');
    if (due) due.value = new Date().toISOString().slice(0, 10);

    await loadProfessionals();
    renderList();

    if (typeof lucide !== 'undefined') lucide.createIcons();
});
