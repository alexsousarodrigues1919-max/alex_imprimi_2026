const pdvState = {
    cart: [],
    products: [],
    lastReceipt: null,
};

function toMoney(value) {
    return Number(value || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function parseMoney(value) {
    if (typeof parseCurrencyBRL === 'function') return parseCurrencyBRL(value);
    const normalized = String(value || '').replace(/\./g, '').replace(',', '.');
    const number = Number(normalized);
    return Number.isFinite(number) ? number : 0;
}

function formatPaymentLabel(value) {
    const map = {
        pix: 'PIX',
        dinheiro: 'Dinheiro',
        cartao_credito: 'Cartão de Crédito',
        cartao_debito: 'Cartão de Débito',
        boleto: 'Boleto',
        transferencia: 'Transferência',
    };
    return map[value] || value || '-';
}

function getProductById(productId) {
    return pdvState.products.find((p) => p.id === Number(productId));
}

function getReservedStock(productId) {
    return pdvState.cart
        .filter((item) => Number(item.productId) === Number(productId))
        .reduce((acc, item) => acc + Number(item.qty), 0);
}

function getTotals() {
    const subtotal = pdvState.cart.reduce((acc, item) => acc + item.qty * item.price, 0);
    const discountInput = document.getElementById('pdvDiscount');
    let discount = parseMoney(discountInput ? discountInput.value : 0);

    if (discount < 0) discount = 0;
    if (discount > subtotal) discount = subtotal;

    const total = subtotal - discount;
    return { subtotal, discount, total };
}

function renderTotals() {
    const totals = getTotals();

    const subtotalEl = document.getElementById('pdvSubtotal');
    const discountEl = document.getElementById('pdvDiscountValue');
    const totalEl = document.getElementById('pdvTotal');

    if (subtotalEl) subtotalEl.textContent = `R$ ${toMoney(totals.subtotal)}`;
    if (discountEl) discountEl.textContent = `R$ ${toMoney(totals.discount)}`;
    if (totalEl) totalEl.textContent = `R$ ${toMoney(totals.total)}`;
}

function removeItem(index) {
    pdvState.cart.splice(index, 1);
    renderCart();
    renderTotals();
}

function editItem(index) {
    const item = pdvState.cart[index];
    if (!item) return;

    const qtyValue = prompt('Quantidade do item:', String(item.qty));
    if (qtyValue === null) return;

    const qty = Number(qtyValue);
    if (!Number.isInteger(qty) || qty <= 0) {
        showToast('Quantidade invalida.', 'warning');
        return;
    }

    const priceValue = prompt('Valor unitario (R$):', toMoney(item.price));
    if (priceValue === null) return;

    const price = parseMoney(priceValue);
    if (!Number.isFinite(price) || price <= 0) {
        showToast('Valor unitario invalido.', 'warning');
        return;
    }

    if (item.productId) {
        const product = getProductById(item.productId);
        if (product) {
            const reservedExcludingCurrent = pdvState.cart
                .filter((_, idx) => idx !== index)
                .filter((cartItem) => Number(cartItem.productId) === Number(item.productId))
                .reduce((acc, cartItem) => acc + Number(cartItem.qty), 0);

            const available = Number(product.stock) - reservedExcludingCurrent;
            if (qty > available) {
                showToast(`Estoque insuficiente para ${product.name}. Disponivel: ${available}.`, 'warning');
                return;
            }
        }
    }

    item.qty = qty;
    item.price = price;

    renderCart();
    renderTotals();
    showToast('Item atualizado no carrinho.', 'success');
}

function renderCart() {
    const tbody = document.getElementById('pdvCartList');
    if (!tbody) return;

    if (!pdvState.cart.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center p-3 text-muted">Nenhum item adicionado.</td></tr>';
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    tbody.innerHTML = pdvState.cart
        .map((item, index) => {
            const total = item.qty * item.price;
            const note = item.note ? `<div class="text-muted text-sm mt-1">${escapeHtml(item.note)}</div>` : '';
            const stockInfo = item.productId
                ? (() => {
                    const product = getProductById(item.productId);
                    return product ? `<div class="text-muted text-sm">Estoque atual: ${product.stock}</div>` : '';
                })()
                : '';

            return `
                <tr>
                    <td>
                        <strong>${escapeHtml(item.name)}</strong>
                        ${stockInfo}
                        ${note}
                    </td>
                    <td>${item.qty}</td>
                    <td>R$ ${toMoney(item.price)}</td>
                    <td class="amount-income">R$ ${toMoney(total)}</td>
                    <td>
                        <div class="flex gap-1">
                            <button class="btn btn-outline btn-icon-sm" data-action="edit-item" data-index="${index}">
                                <i data-lucide="pencil"></i>
                            </button>
                            <button class="btn btn-outline btn-icon-sm" data-action="remove-item" data-index="${index}">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        })
        .join('');

    tbody.querySelectorAll('[data-action="remove-item"]').forEach((button) => {
        button.addEventListener('click', () => {
            const index = Number(button.getAttribute('data-index'));
            removeItem(index);
        });
    });

    tbody.querySelectorAll('[data-action="edit-item"]').forEach((button) => {
        button.addEventListener('click', () => {
            const index = Number(button.getAttribute('data-index'));
            editItem(index);
        });
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function loadClients() {
    const select = document.getElementById('pdvClient');
    if (!select) return;

    select.innerHTML = '<option value="">Consumidor final</option>';

    try {
        const clients = await apiFetch('/clients');

        clients.forEach((client) => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = `${client.name} (${client.type})`;
            select.appendChild(option);
        });
    } catch (error) {
        showToast(`Nao foi possivel carregar clientes: ${error.message}`, 'warning');
    }
}

async function loadProducts() {
    const select = document.getElementById('pdvProduct');
    if (!select) return;

    select.innerHTML = '<option value="">Selecionar produto...</option>';

    try {
        const products = await apiFetch('/products');
        pdvState.products = products.filter((product) => product.status === 'active');

        pdvState.products.forEach((product) => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.name} | R$ ${toMoney(product.price)} | Estoque: ${product.stock}`;
            select.appendChild(option);
        });
    } catch (error) {
        showToast(`Nao foi possivel carregar produtos: ${error.message}`, 'warning');
    }
}

function getReceiptFromSale(sale) {
    if (!sale || !sale.details) return null;

    let details = sale.details;
    if (typeof details === 'string') {
        try {
            details = JSON.parse(details);
        } catch {
            details = null;
        }
    }

    if (!details || !Array.isArray(details.items) || !details.items.length) return null;

    return {
        ...details,
        financialId: sale.id,
        date: sale.date || details.date,
    };
}

async function loadSalesHistory() {
    const tbody = document.getElementById('pdvSalesHistory');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" class="text-center p-3 text-muted">Carregando vendas...</td></tr>';

    try {
        const transactions = await apiFetch('/financial');

        const sales = transactions
            .filter((item) => item.type === 'income')
            .filter((item) => {
                const category = String(item.category || '').toLowerCase();
                const description = String(item.description || '');
                return category === 'pdv' || description.startsWith('PDV |');
            })
            .slice(0, 20);

        if (!sales.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center p-3 text-muted">Nenhuma venda PDV registrada.</td></tr>';
            return;
        }

        tbody.innerHTML = sales
            .map((sale) => `
                <tr>
                    <td>${new Date(sale.date).toLocaleDateString('pt-BR')}</td>
                    <td>${escapeHtml(sale.description)}</td>
                    <td>${escapeHtml(sale.category || '-')}</td>
                    <td class="amount-income">R$ ${toMoney(sale.amount)}</td>
                    <td>
                        <button class="btn btn-outline btn-icon-sm" data-action="reprint" data-id="${sale.id}">
                            <i data-lucide="printer"></i>
                        </button>
                    </td>
                </tr>
            `)
            .join('');

        tbody.querySelectorAll('[data-action="reprint"]').forEach((button) => {
            button.addEventListener('click', () => {
                const id = Number(button.getAttribute('data-id'));
                const sale = sales.find((item) => item.id === id);
                const receipt = getReceiptFromSale(sale);

                if (!receipt) {
                    showToast('Venda antiga sem detalhes para reimpressao.', 'warning');
                    return;
                }

                printReceipt(receipt);
            });
        });

        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center p-3 text-danger">${escapeHtml(error.message)}</td></tr>`;
    }
}

function buildReceiptObject(financialId) {
    const clientSelect = document.getElementById('pdvClient');
    const payment = document.getElementById('pdvPayment').value;
    const totals = getTotals();

    const clientLabel = clientSelect && clientSelect.value
        ? clientSelect.options[clientSelect.selectedIndex].textContent
        : 'Consumidor final';

    return {
        financialId,
        date: new Date().toISOString(),
        payment,
        paymentLabel: formatPaymentLabel(payment),
        clientLabel,
        items: pdvState.cart.map((item) => ({
            name: item.name,
            qty: item.qty,
            price: item.price,
            note: item.note || '',
            productId: item.productId || null,
        })),
        subtotal: totals.subtotal,
        discount: totals.discount,
        total: totals.total,
    };
}

function printReceipt(receipt) {
    if (!receipt || !receipt.items || !receipt.items.length) {
        showToast('Nao ha dados para imprimir.', 'warning');
        return;
    }

    const itemsHtml = receipt.items
        .map((item) => `
            <tr>
                <td>${escapeHtml(item.name)}</td>
                <td>${item.qty}</td>
                <td>R$ ${toMoney(item.price)}</td>
                <td>R$ ${toMoney(item.qty * item.price)}</td>
            </tr>
        `)
        .join('');

    const printWindow = window.open('', '_blank', 'width=760,height=900');
    if (!printWindow) {
        showToast('Bloqueio de popup ativo. Permita popups para imprimir.', 'warning');
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Comprovante PDV</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
                h1 { margin: 0 0 6px; font-size: 22px; }
                .muted { color: #475569; margin: 0 0 16px; }
                .box { border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px; margin-bottom: 14px; }
                table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                th, td { border-bottom: 1px solid #e2e8f0; padding: 8px; text-align: left; font-size: 14px; }
                .totals { margin-top: 12px; }
                .totals p { margin: 5px 0; text-align: right; }
                .strong { font-weight: 700; font-size: 17px; }
            </style>
        </head>
        <body>
            <h1>Alex_Impressão - Comprovante PDV</h1>
            <p class="muted">Data: ${new Date(receipt.date).toLocaleString('pt-BR')}</p>

            <div class="box">
                <p><strong>ID Financeiro:</strong> ${receipt.financialId || '-'}</p>
                <p><strong>Cliente:</strong> ${escapeHtml(receipt.clientLabel || 'Consumidor final')}</p>
                <p><strong>Pagamento:</strong> ${escapeHtml(receipt.paymentLabel || '-')}</p>
            </div>

            <div class="box">
                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Qtd</th>
                            <th>Unitário</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>

                <div class="totals">
                    <p>Subtotal: R$ ${toMoney(receipt.subtotal)}</p>
                    <p>Desconto: R$ ${toMoney(receipt.discount)}</p>
                    <p class="strong">Total: R$ ${toMoney(receipt.total)}</p>
                </div>
            </div>
        </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

function buildSaleDescription(receipt) {
    const totalQty = receipt.items.reduce((acc, item) => acc + item.qty, 0);
    const shortItems = receipt.items.slice(0, 3).map((item) => `${item.name} x${item.qty}`).join(', ');

    return `PDV | Pagamento:${receipt.paymentLabel} | Qtd:${totalQty} | Itens:${shortItems}`;
}

function buildStockPayload() {
    const grouped = new Map();

    pdvState.cart.forEach((item) => {
        if (!item.productId) return;
        const current = grouped.get(item.productId) || 0;
        grouped.set(item.productId, current + Number(item.qty));
    });

    return Array.from(grouped.entries()).map(([productId, quantity]) => ({
        product_id: Number(productId),
        quantity: Number(quantity),
    }));
}

async function finalizeSale(event) {
    event.preventDefault();

    if (!pdvState.cart.length) {
        showToast('Adicione pelo menos um item ao carrinho.', 'warning');
        return;
    }

    const paymentInput = document.getElementById('pdvPayment');
    const clientInput = document.getElementById('pdvClient');

    if (!paymentInput.value) {
        showToast('Selecione a forma de pagamento.', 'warning');
        return;
    }

    const totals = getTotals();
    if (totals.total <= 0) {
        showToast('Total da venda deve ser maior que zero.', 'warning');
        return;
    }

    const receipt = buildReceiptObject(null);
    const description = buildSaleDescription(receipt);
    const button = document.getElementById('btnFinalizeSale');
    const stopLoading = setButtonLoading(button, 'Finalizando...');

    try {
        const stockItems = buildStockPayload();
        if (stockItems.length) {
            await apiFetch('/products/consume', {
                method: 'POST',
                body: JSON.stringify({ items: stockItems }),
            });
        }

        const clientId = clientInput && clientInput.value ? Number(clientInput.value) : null;
        const result = await apiFetch('/financial', {
            method: 'POST',
            body: JSON.stringify({
                type: 'income',
                amount: totals.total,
                category: 'PDV',
                date: new Date().toISOString().slice(0, 10),
                description,
                details: receipt,
                client_id: clientId,
            }),
        });

        receipt.financialId = result.id || null;
        pdvState.lastReceipt = receipt;
        localStorage.setItem('pdv_last_receipt', JSON.stringify(receipt));

        pdvState.cart = [];

        const itemForm = document.getElementById('pdvItemForm');
        const checkoutForm = document.getElementById('pdvCheckoutForm');
        if (itemForm) itemForm.reset();
        if (checkoutForm) checkoutForm.reset();

        renderCart();
        renderTotals();
        await loadProducts();
        await loadSalesHistory();

        showToast('Venda finalizada e registrada no financeiro.', 'success');
        printReceipt(receipt);
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        stopLoading();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

function bindItemForm() {
    const form = document.getElementById('pdvItemForm');
    if (!form) return;

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        const productInput = document.getElementById('pdvProduct');
        const nameInput = document.getElementById('pdvItemName');
        const qtyInput = document.getElementById('pdvItemQty');
        const priceInput = document.getElementById('pdvItemPrice');
        const noteInput = document.getElementById('pdvItemNote');

        const selectedProductId = productInput && productInput.value ? Number(productInput.value) : null;
        const name = nameInput.value.trim();
        const qty = Number(qtyInput.value);
        const price = parseMoney(priceInput.value);
        const note = noteInput.value.trim();

        if (!name) {
            showToast('Informe o nome do item.', 'warning');
            return;
        }

        if (!Number.isInteger(qty) || qty <= 0) {
            showToast('Quantidade invalida.', 'warning');
            return;
        }

        if (!Number.isFinite(price) || price <= 0) {
            showToast('Valor unitario invalido.', 'warning');
            return;
        }

        if (selectedProductId) {
            const product = getProductById(selectedProductId);
            if (!product) {
                showToast('Produto selecionado nao encontrado.', 'warning');
                return;
            }

            const available = Number(product.stock) - getReservedStock(selectedProductId);
            if (qty > available) {
                showToast(`Estoque insuficiente para ${product.name}. Disponivel: ${available}.`, 'warning');
                return;
            }
        }

        pdvState.cart.push({
            name,
            qty,
            price,
            note,
            productId: selectedProductId,
        });

        renderCart();
        renderTotals();

        productInput.value = '';
        nameInput.value = '';
        qtyInput.value = '1';
        priceInput.value = '';
        noteInput.value = '';
        nameInput.focus();
    });
}

function bindDiscountMask() {
    const itemPriceInput = document.getElementById('pdvItemPrice');
    const discountInput = document.getElementById('pdvDiscount');

    const applyMask = (input) => {
        if (!input) return;
        input.addEventListener('input', () => {
            if (typeof maskCurrencyBRL === 'function') {
                input.value = maskCurrencyBRL(input.value);
            }
            renderTotals();
        });
    };

    applyMask(itemPriceInput);
    applyMask(discountInput);
}

function bindProductSelector() {
    const select = document.getElementById('pdvProduct');
    const nameInput = document.getElementById('pdvItemName');
    const priceInput = document.getElementById('pdvItemPrice');

    if (!select) return;

    select.addEventListener('change', () => {
        if (!select.value) return;

        const product = getProductById(select.value);
        if (!product) return;

        if (nameInput && !nameInput.value.trim()) nameInput.value = product.name;
        if (priceInput && (!priceInput.value || parseMoney(priceInput.value) <= 0)) {
            const raw = String(product.price || 0).replace('.', ',');
            priceInput.value = typeof maskCurrencyBRL === 'function' ? maskCurrencyBRL(raw) : raw;
        }
    });
}

function bindActions() {
    const checkoutForm = document.getElementById('pdvCheckoutForm');
    if (checkoutForm) checkoutForm.addEventListener('submit', finalizeSale);

    const clearButton = document.getElementById('btnClearCart');
    if (clearButton) {
        clearButton.addEventListener('click', () => {
            if (!pdvState.cart.length) return;
            if (!confirm('Deseja limpar todos os itens do carrinho?')) return;

            pdvState.cart = [];
            renderCart();
            renderTotals();
            showToast('Carrinho limpo.', 'info');
        });
    }

    const printButton = document.getElementById('btnPrintPreview');
    if (printButton) {
        printButton.addEventListener('click', () => {
            if (pdvState.cart.length) {
                const preview = buildReceiptObject('PREVIA');
                printReceipt(preview);
                return;
            }

            if (!pdvState.lastReceipt) {
                try {
                    pdvState.lastReceipt = JSON.parse(localStorage.getItem('pdv_last_receipt') || 'null');
                } catch {
                    pdvState.lastReceipt = null;
                }
            }

            if (pdvState.lastReceipt) {
                printReceipt(pdvState.lastReceipt);
            } else {
                showToast('Nao ha venda para imprimir no momento.', 'warning');
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!window.location.pathname.endsWith('pdv.html')) return;

    renderCart();
    renderTotals();
    bindItemForm();
    bindDiscountMask();
    bindProductSelector();
    bindActions();

    await loadClients();
    await loadProducts();
    await loadSalesHistory();
    setupAutoRefresh(async () => {
        await loadProducts();
        await loadSalesHistory();
    }, { intervalMs: 30000 });

    if (typeof lucide !== 'undefined') lucide.createIcons();
});

