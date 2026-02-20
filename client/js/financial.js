async function loadFinancial() {
    const listBody = document.getElementById('financeList');
    if (!listBody) return;

    listBody.innerHTML = '<tr><td colspan="5" class="text-center p-3 text-muted">Carregando...</td></tr>';

    try {
        const transactions = await apiFetch('/financial');
        let income = 0;
        let expense = 0;

        const canDelete = isAdminUser();

        if (!transactions.length) {
            listBody.innerHTML = '<tr><td colspan="5" class="text-center p-3 text-muted">Nenhum lancamento.</td></tr>';
        } else {
            listBody.innerHTML = transactions
                .map((t) => {
                    const isIncome = t.type === 'income';
                    if (isIncome) income += Number(t.amount);
                    else expense += Number(t.amount);

                    return `
                        <tr>
                            <td>${new Date(t.date).toLocaleDateString('pt-BR')}</td>
                            <td>${escapeHtml(t.description)}</td>
                            <td>${escapeHtml(t.category || '-')}</td>
                            <td class="${isIncome ? 'amount-income' : 'amount-expense'}">${isIncome ? '+' : '-'} R$ ${Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td>
                                ${canDelete
                                    ? `<button class="btn btn-outline btn-icon-sm" onclick="deleteTransaction(${t.id}, this)"><i data-lucide="trash-2"></i></button>`
                                    : '<span class="text-muted">Sem permissao</span>'}
                            </td>
                        </tr>
                    `;
                })
                .join('');
        }

        updateSummary(income, expense);
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function updateSummary(income, expense) {
    const balance = income - expense;

    const totalIncome = document.getElementById('totalIncome');
    const totalExpense = document.getElementById('totalExpense');
    const totalBalance = document.getElementById('totalBalance');

    if (totalIncome) totalIncome.textContent = `R$ ${income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    if (totalExpense) totalExpense.textContent = `R$ ${expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    if (totalBalance) totalBalance.textContent = `R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

async function deleteTransaction(id, button) {
    if (!isAdminUser()) {
        showToast('Apenas administrador pode excluir lancamentos.', 'warning');
        return;
    }

    if (!confirm('Deseja excluir este lancamento?')) return;

    const stopLoading = setButtonLoading(button, '...');

    try {
        await apiFetch(`/financial/${id}`, { method: 'DELETE' });
        showToast('Lancamento excluido.', 'success');
        await loadFinancial();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        stopLoading();
    }
}

const financeForm = document.getElementById('financeForm');
if (financeForm) {
    financeForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const description = document.getElementById('finDesc').value.trim();
        const amountInput = document.getElementById('finAmount').value;
        const amount = typeof parseCurrencyBRL === 'function'
            ? parseCurrencyBRL(amountInput)
            : Number(amountInput);
        const type = document.getElementById('finType').value;
        const date = document.getElementById('finDate').value;
        const button = financeForm.querySelector('button[type="submit"]');

        if (!description || !date || amount <= 0) {
            showToast('Preencha descricao, data e valor valido.', 'warning');
            return;
        }

        const stopLoading = setButtonLoading(button, 'Salvando...');

        try {
            await apiFetch('/financial', {
                method: 'POST',
                body: JSON.stringify({ description, amount, type, date, category: type === 'income' ? 'Receita' : 'Despesa' }),
            });

            financeForm.reset();
            showToast('Lancamento registrado.', 'success');
            await loadFinancial();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            stopLoading();
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.endsWith('financial.html')) {
        const dateInput = document.getElementById('finDate');
        if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
        loadFinancial();
        setupAutoRefresh(loadFinancial, { intervalMs: 30000 });
    }
});


