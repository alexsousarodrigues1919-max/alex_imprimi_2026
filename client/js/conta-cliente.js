let caClients = [];
let caAccounts = [];

function caMoney(value) {
    return `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function caStatusLabel(status) {
    if (status === 'paid') return { text: 'Recebida', cls: 'badge-success' };
    if (status === 'overdue') return { text: 'Vencida', cls: 'badge-danger' };
    return { text: 'Em Aberto', cls: 'badge-warning' };
}

function fillClientSelect(selectId, includeAll = false) {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.innerHTML = includeAll ? '<option value="">Todos os clientes</option>' : '<option value="">Selecione o cliente...</option>';

    caClients.forEach((client) => {
        const option = document.createElement('option');
        option.value = client.id;
        option.textContent = `${client.name} (${client.type})`;
        select.appendChild(option);
    });
}

function renderSummary() {
    const openAccounts = caAccounts.filter((a) => a.status === 'open');
    const overdueAccounts = caAccounts.filter((a) => a.status === 'overdue');
    const paidAccounts = caAccounts.filter((a) => a.status === 'paid');

    const openCount = openAccounts.length;
    const overdueCount = overdueAccounts.length;
    const openAmount = openAccounts.reduce((acc, a) => acc + Number(a.amount || 0), 0) + overdueAccounts.reduce((acc, a) => acc + Number(a.amount || 0), 0);
    const paidAmount = paidAccounts.reduce((acc, a) => acc + Number(a.amount || 0), 0);

    const openCountEl = document.getElementById('caOpenCount');
    const overdueCountEl = document.getElementById('caOverdueCount');
    const openAmountEl = document.getElementById('caOpenAmount');
    const paidAmountEl = document.getElementById('caPaidAmount');

    if (openCountEl) openCountEl.textContent = String(openCount);
    if (overdueCountEl) overdueCountEl.textContent = String(overdueCount);
    if (openAmountEl) openAmountEl.textContent = caMoney(openAmount);
    if (paidAmountEl) paidAmountEl.textContent = caMoney(paidAmount);
}

async function loadClients() {
    caClients = await apiFetch('/clients');
    fillClientSelect('caClient');
    fillClientSelect('caFilterClient', true);
}

function buildQuery() {
    const clientId = document.getElementById('caFilterClient')?.value || '';
    const status = document.getElementById('caFilterStatus')?.value || '';

    const params = new URLSearchParams();
    if (clientId) params.set('client_id', clientId);
    if (status) params.set('status', status);

    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
}

async function loadAccounts() {
    const list = document.getElementById('caList');
    if (!list) return;

    list.innerHTML = '<tr><td colspan="6" class="text-center p-3 text-muted">Carregando contas...</td></tr>';

    try {
        caAccounts = await apiFetch(`/client-accounts${buildQuery()}`);

        renderSummary();

        if (!caAccounts.length) {
            list.innerHTML = '<tr><td colspan="6" class="text-center p-3 text-muted">Nenhuma conta encontrada.</td></tr>';
            return;
        }

        const canDelete = isAdminUser();

        list.innerHTML = caAccounts.map((account) => {
            const s = caStatusLabel(account.status);
            const dueDate = new Date(`${account.due_date}T00:00:00`).toLocaleDateString('pt-BR');
            const isPayable = account.status !== 'paid';

            return `
                <tr>
                    <td>${escapeHtml(account.client_name || '-')}</td>
                    <td>${escapeHtml(account.description || '-')}</td>
                    <td>${dueDate}</td>
                    <td><span class="badge ${s.cls}">${s.text}</span></td>
                    <td class="${account.status === 'paid' ? 'amount-income' : 'amount-expense'}">${caMoney(account.amount)}</td>
                    <td>
                        <div class="flex gap-1">
                            ${isPayable ? `<button class="btn btn-outline btn-icon-sm" data-action="pay" data-id="${account.id}"><i data-lucide="check"></i></button>` : '<span class="text-muted">Recebida</span>'}
                            ${canDelete ? `<button class="btn btn-outline btn-icon-sm" data-action="delete" data-id="${account.id}"><i data-lucide="trash-2"></i></button>` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        list.querySelectorAll('[data-action="pay"]').forEach((button) => {
            button.addEventListener('click', () => markAsPaid(button));
        });

        list.querySelectorAll('[data-action="delete"]').forEach((button) => {
            button.addEventListener('click', () => deleteAccount(button));
        });

        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (error) {
        list.innerHTML = `<tr><td colspan="6" class="text-center p-3 text-danger">${escapeHtml(error.message)}</td></tr>`;
    }
}

async function markAsPaid(button) {
    const id = Number(button.getAttribute('data-id'));
    if (!id) return;

    const stopLoading = setButtonLoading(button, '...');

    try {
        await apiFetch(`/client-accounts/${id}/pay`, { method: 'PATCH' });
        showToast('Recebimento registrado com sucesso.', 'success');
        await loadAccounts();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        stopLoading();
    }
}

async function deleteAccount(button) {
    const id = Number(button.getAttribute('data-id'));
    if (!id) return;

    if (!confirm('Deseja excluir esta conta?')) return;

    const stopLoading = setButtonLoading(button, '...');

    try {
        await apiFetch(`/client-accounts/${id}`, { method: 'DELETE' });
        showToast('Conta excluida com sucesso.', 'success');
        await loadAccounts();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        stopLoading();
    }
}

function bindForm() {
    const form = document.getElementById('clientAccountForm');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const client_id = document.getElementById('caClient').value;
        const description = document.getElementById('caDescription').value.trim();
        const amount = parseCurrencyBRL(document.getElementById('caAmount').value);
        const due_date = document.getElementById('caDueDate').value;
        const installments_count = Number(document.getElementById('caInstallments').value || 1);
        const installments_interval_months = Number(document.getElementById('caInstallmentInterval').value || 1);
        const notes = document.getElementById('caNotes').value.trim();

        if (!client_id || !description || !due_date || amount <= 0) {
            showToast('Preencha cliente, descricao, valor e vencimento.', 'warning');
            return;
        }

        const saveBtn = document.getElementById('caSaveBtn');
        const stopLoading = setButtonLoading(saveBtn, 'Salvando...');

        try {
            const result = await apiFetch('/client-accounts', {
                method: 'POST',
                body: JSON.stringify({
                    client_id: Number(client_id),
                    description,
                    amount,
                    due_date,
                    notes,
                    installments_count,
                    installments_interval_months,
                }),
            });

            form.reset();
            const dueDate = document.getElementById('caDueDate');
            if (dueDate) dueDate.value = new Date().toISOString().slice(0, 10);
            const installments = document.getElementById('caInstallments');
            const interval = document.getElementById('caInstallmentInterval');
            if (installments) installments.value = '1';
            if (interval) interval.value = '1';

            showToast(result.message || 'Conta cadastrada com sucesso.', 'success');
            await loadAccounts();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            stopLoading();
        }
    });
}

function bindFilters() {
    const filterClient = document.getElementById('caFilterClient');
    const filterStatus = document.getElementById('caFilterStatus');

    if (filterClient) filterClient.addEventListener('change', () => loadAccounts());
    if (filterStatus) filterStatus.addEventListener('change', () => loadAccounts());
}

function bindMasks() {
    const amountInput = document.getElementById('caAmount');
    if (!amountInput) return;

    amountInput.addEventListener('input', () => {
        amountInput.value = maskCurrencyBRL(amountInput.value);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!window.location.pathname.endsWith('conta-cliente.html')) return;

    bindMasks();
    bindForm();
    bindFilters();

    const dueDate = document.getElementById('caDueDate');
    if (dueDate) dueDate.value = new Date().toISOString().slice(0, 10);

    try {
        await loadClients();
        await loadAccounts();
    } catch (error) {
        showToast(error.message, 'error');
    }
});
