let productsCache = [];

function toMoney(value) {
    return Number(value || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function resetProductForm() {
    const form = document.getElementById('productForm');
    const title = document.getElementById('productFormTitle');
    const idInput = document.getElementById('productId');

    if (form) form.reset();
    if (title) title.textContent = 'Cadastro de Produto';
    if (idInput) idInput.value = '';

    const stock = document.getElementById('productStock');
    const status = document.getElementById('productStatus');
    if (stock) stock.value = '0';
    if (status) status.value = 'active';
}

function fillProductForm(product) {
    document.getElementById('productId').value = String(product.id);
    document.getElementById('productName').value = product.name || '';
    document.getElementById('productCategory').value = product.category || '';
    document.getElementById('productPrice').value = typeof maskCurrencyBRL === 'function'
        ? maskCurrencyBRL(String(product.price || 0).replace('.', ','))
        : String(product.price || 0);
    document.getElementById('productStock').value = String(product.stock || 0);
    document.getElementById('productStatus').value = product.status || 'active';

    const title = document.getElementById('productFormTitle');
    if (title) title.textContent = 'Editar Produto';
}

async function loadProducts() {
    const tbody = document.getElementById('productsList');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" class="text-center p-3 text-muted">Carregando produtos...</td></tr>';

    try {
        productsCache = await apiFetch('/products');

        if (!productsCache.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center p-3 text-muted">Nenhum produto cadastrado.</td></tr>';
            return;
        }

        const canDelete = isAdminUser();

        tbody.innerHTML = productsCache
            .map((product) => {
                const badgeClass = product.status === 'active' ? 'badge-success' : 'badge-warning';
                const stockClass = Number(product.stock) <= 0 ? 'cell-danger' : '';

                return `
                    <tr>
                        <td>${escapeHtml(product.name)}</td>
                        <td>${escapeHtml(product.category || '-')}</td>
                        <td>R$ ${toMoney(product.price)}</td>
                        <td class="${stockClass}">${Number(product.stock)}</td>
                        <td><span class="badge ${badgeClass}">${product.status === 'active' ? 'Ativo' : 'Inativo'}</span></td>
                        <td>
                            <div class="flex gap-1">
                                <button class="btn btn-outline btn-icon-sm" data-action="edit" data-id="${product.id}"><i data-lucide="pencil"></i></button>
                                ${canDelete ? `<button class="btn btn-outline btn-icon-sm" data-action="delete" data-id="${product.id}"><i data-lucide="trash-2"></i></button>` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            })
            .join('');

        tbody.querySelectorAll('[data-action="edit"]').forEach((button) => {
            button.addEventListener('click', () => {
                const id = Number(button.getAttribute('data-id'));
                const product = productsCache.find((item) => item.id === id);
                if (!product) return;
                fillProductForm(product);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });

        tbody.querySelectorAll('[data-action="delete"]').forEach((button) => {
            button.addEventListener('click', () => deleteProduct(button));
        });

        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center p-3 text-danger">${escapeHtml(error.message)}</td></tr>`;
    }
}

async function deleteProduct(button) {
    const id = Number(button.getAttribute('data-id'));
    if (!id) return;

    if (!confirm('Deseja excluir este produto?')) return;

    const stopLoading = setButtonLoading(button, '...');

    try {
        await apiFetch(`/products/${id}`, { method: 'DELETE' });
        showToast('Produto excluido com sucesso.', 'success');
        await loadProducts();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        stopLoading();
    }
}

function bindProductForm() {
    const form = document.getElementById('productForm');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const id = document.getElementById('productId').value;
        const name = document.getElementById('productName').value.trim();
        const category = document.getElementById('productCategory').value.trim();
        const price = parseCurrencyBRL(document.getElementById('productPrice').value);
        const stock = Number(document.getElementById('productStock').value);
        const status = document.getElementById('productStatus').value;

        if (!name || name.length < 2) {
            showToast('Informe um nome de produto valido.', 'warning');
            return;
        }

        if (!Number.isFinite(price) || price < 0) {
            showToast('Preco invalido.', 'warning');
            return;
        }

        if (!Number.isInteger(stock) || stock < 0) {
            showToast('Estoque invalido.', 'warning');
            return;
        }

        const button = document.getElementById('saveProductBtn');
        const stopLoading = setButtonLoading(button, id ? 'Atualizando...' : 'Salvando...');

        try {
            const payload = { name, category, price, stock, status };

            if (id) {
                await apiFetch(`/products/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload),
                });
                showToast('Produto atualizado com sucesso.', 'success');
            } else {
                await apiFetch('/products', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
                showToast('Produto cadastrado com sucesso.', 'success');
            }

            resetProductForm();
            await loadProducts();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            stopLoading();
        }
    });
}

function bindMasks() {
    const input = document.getElementById('productPrice');
    if (!input) return;

    input.addEventListener('input', () => {
        input.value = maskCurrencyBRL(input.value);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!window.location.pathname.endsWith('produtos.html')) return;

    bindMasks();
    bindProductForm();

    const cancelBtn = document.getElementById('cancelProductEditBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            resetProductForm();
            showToast('Edicao cancelada.', 'info');
        });
    }

    await loadProducts();
    setupAutoRefresh(loadProducts, { intervalMs: 30000 });
});


