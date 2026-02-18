const db = require('../database');
const { logActivity } = require('../utils/logger');

exports.listProducts = (req, res) => {
    db.all('SELECT * FROM products ORDER BY created_at DESC, id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Erro ao buscar produtos.' });
        res.json(rows);
    });
};

exports.createProduct = (req, res) => {
    const { name, category, price, stock, status } = req.body;

    if (!name || String(name).trim().length < 2) {
        return res.status(400).json({ message: 'Nome do produto invalido.' });
    }

    const priceNumber = Number(price);
    const stockNumber = Number(stock);

    if (!Number.isFinite(priceNumber) || priceNumber < 0) {
        return res.status(400).json({ message: 'Preco invalido.' });
    }

    if (!Number.isInteger(stockNumber) || stockNumber < 0) {
        return res.status(400).json({ message: 'Estoque invalido.' });
    }

    db.run(
        `INSERT INTO products (name, category, price, stock, status)
         VALUES (?, ?, ?, ?, ?)`,
        [
            String(name).trim(),
            category ? String(category).trim() : null,
            priceNumber,
            stockNumber,
            status === 'inactive' ? 'inactive' : 'active',
        ],
        function onInsert(err) {
            if (err) return res.status(500).json({ message: 'Erro ao cadastrar produto.' });

            logActivity(req.userId, 'PRODUCT_CREATED', `Produto ${name} criado`);
            res.status(201).json({ message: 'Produto cadastrado com sucesso.', id: this.lastID });
        }
    );
};

exports.updateProduct = (req, res) => {
    const { id } = req.params;
    const { name, category, price, stock, status } = req.body;

    if (!name || String(name).trim().length < 2) {
        return res.status(400).json({ message: 'Nome do produto invalido.' });
    }

    const priceNumber = Number(price);
    const stockNumber = Number(stock);

    if (!Number.isFinite(priceNumber) || priceNumber < 0) {
        return res.status(400).json({ message: 'Preco invalido.' });
    }

    if (!Number.isInteger(stockNumber) || stockNumber < 0) {
        return res.status(400).json({ message: 'Estoque invalido.' });
    }

    db.run(
        `UPDATE products
         SET name = ?, category = ?, price = ?, stock = ?, status = ?
         WHERE id = ?`,
        [
            String(name).trim(),
            category ? String(category).trim() : null,
            priceNumber,
            stockNumber,
            status === 'inactive' ? 'inactive' : 'active',
            id,
        ],
        function onUpdate(err) {
            if (err) return res.status(500).json({ message: 'Erro ao atualizar produto.' });
            if (!this.changes) return res.status(404).json({ message: 'Produto nao encontrado.' });

            logActivity(req.userId, 'PRODUCT_UPDATED', `Produto ID ${id} atualizado`);
            res.json({ message: 'Produto atualizado com sucesso.' });
        }
    );
};

exports.deleteProduct = (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM products WHERE id = ?', [id], function onDelete(err) {
        if (err) return res.status(500).json({ message: 'Erro ao excluir produto.' });
        if (!this.changes) return res.status(404).json({ message: 'Produto nao encontrado.' });

        logActivity(req.userId, 'PRODUCT_DELETED', `Produto ID ${id} excluido`);
        res.json({ message: 'Produto excluido com sucesso.' });
    });
};

exports.consumeStock = (req, res) => {
    const { items } = req.body;

    if (!Array.isArray(items) || !items.length) {
        return res.status(400).json({ message: 'Itens de estoque nao informados.' });
    }

    const normalizedItems = items.map((item) => ({
        productId: Number(item.product_id),
        quantity: Number(item.quantity),
    }));

    for (const item of normalizedItems) {
        if (!Number.isInteger(item.productId) || item.productId <= 0) {
            return res.status(400).json({ message: 'Produto invalido para consumo.' });
        }
        if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
            return res.status(400).json({ message: 'Quantidade invalida para consumo.' });
        }
    }

    const merged = [];
    normalizedItems.forEach((item) => {
        const existing = merged.find((m) => m.productId === item.productId);
        if (existing) existing.quantity += item.quantity;
        else merged.push({ ...item });
    });

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        const products = [];

        const rollback = (message, status = 400) => {
            db.run('ROLLBACK', () => res.status(status).json({ message }));
        };

        const loadAndValidate = (index) => {
            if (index >= merged.length) {
                return applyUpdates(0);
            }

            const row = merged[index];
            db.get('SELECT id, name, stock, status FROM products WHERE id = ?', [row.productId], (err, product) => {
                if (err) return rollback('Erro ao validar estoque.', 500);
                if (!product) return rollback('Produto nao encontrado para consumo.');
                if (product.status !== 'active') return rollback(`Produto ${product.name} esta inativo.`);
                if (Number(product.stock) < row.quantity) {
                    return rollback(`Estoque insuficiente para ${product.name}. Disponivel: ${product.stock}.`);
                }

                products.push({ ...product, quantity: row.quantity });
                loadAndValidate(index + 1);
            });
        };

        const applyUpdates = (index) => {
            if (index >= products.length) {
                return db.run('COMMIT', (err) => {
                    if (err) return rollback('Erro ao finalizar consumo de estoque.', 500);

                    logActivity(req.userId, 'PRODUCT_STOCK_CONSUMED', `Consumo de estoque em ${products.length} produto(s)`);
                    res.json({
                        message: 'Estoque atualizado com sucesso.',
                        products: products.map((p) => ({
                            id: p.id,
                            name: p.name,
                            consumed: p.quantity,
                            remaining: Number(p.stock) - p.quantity,
                        })),
                    });
                });
            }

            const row = products[index];
            db.run(
                'UPDATE products SET stock = stock - ? WHERE id = ?',
                [row.quantity, row.id],
                (err) => {
                    if (err) return rollback('Erro ao atualizar estoque.', 500);
                    applyUpdates(index + 1);
                }
            );
        };

        loadAndValidate(0);
    });
};
