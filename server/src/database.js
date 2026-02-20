const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const isProd = process.env.NODE_ENV === 'production';
const defaultDbPath = isProd ? '/var/data/office.db' : './src/office.db';
const requestedDbPath = process.env.DB_PATH || defaultDbPath;
let dbPath = path.resolve(process.cwd(), requestedDbPath);

function ensureDbDir(targetPath) {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

try {
    ensureDbDir(dbPath);
} catch (err) {
    const fallbackPath = path.resolve(process.cwd(), './src/office.db');

    if (process.env.DB_PATH) {
        throw err;
    }

    ensureDbDir(fallbackPath);
    console.warn(`DB_PATH sem permissao (${dbPath}). Usando fallback: ${fallbackPath}`);
    dbPath = fallbackPath;
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        initializeTables();
        console.log(`Database path: ${dbPath}`);
    }
});

function ensureColumn(table, column, definition) {
    db.all(`PRAGMA table_info(${table})`, [], (err, rows) => {
        if (err) {
            console.error(`Error checking ${table}.${column}:`, err.message);
            return;
        }

        const exists = rows.some((r) => r.name === column);
        if (!exists) {
            db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, (alterErr) => {
                if (alterErr) {
                    console.error(`Error adding column ${table}.${column}:`, alterErr.message);
                }
            });
        }
    });
}

function initializeTables() {
    db.serialize(() => {
        db.run('PRAGMA foreign_keys = ON');

        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'atendimento',
            birthdate TEXT NOT NULL,
            cpf TEXT,
            phone TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_access DATETIME
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('PF', 'PJ')),
            document TEXT UNIQUE NOT NULL,
            email TEXT,
            phone TEXT,
            address TEXT,
            birthdate TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS client_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            due_date TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'paid', 'overdue')),
            paid_date TEXT,
            notes TEXT,
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(client_id) REFERENCES clients(id),
            FOREIGN KEY(created_by) REFERENCES users(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS financials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL CHECK(type IN ('expense', 'income')),
            amount REAL NOT NULL,
            category TEXT,
            description TEXT NOT NULL,
            details TEXT,
            date TEXT NOT NULL,
            client_id INTEGER,
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(client_id) REFERENCES clients(id),
            FOREIGN KEY(created_by) REFERENCES users(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT,
            price REAL NOT NULL DEFAULT 0,
            stock INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS professionals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            cpf TEXT UNIQUE,
            specialty TEXT NOT NULL,
            registration_number TEXT,
            phone TEXT,
            email TEXT,
            available_hours TEXT,
            commission_rate REAL DEFAULT 0,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS meetings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            date TEXT NOT NULL,
            client_id INTEGER,
            professional_id INTEGER,
            notes TEXT,
            meeting_type TEXT DEFAULT 'presencial',
            location TEXT,
            status TEXT DEFAULT 'scheduled',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(client_id) REFERENCES clients(id),
            FOREIGN KEY(professional_id) REFERENCES professionals(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            professional_id INTEGER,
            type TEXT NOT NULL,
            date TEXT NOT NULL,
            time TEXT,
            description TEXT,
            status TEXT DEFAULT 'pendente',
            value REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(client_id) REFERENCES clients(id),
            FOREIGN KEY(professional_id) REFERENCES professionals(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            client_id INTEGER,
            professional_id INTEGER,
            start_date TEXT,
            end_date TEXT,
            status TEXT DEFAULT 'active',
            progress INTEGER DEFAULT 0,
            tasks TEXT,
            value REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(client_id) REFERENCES clients(id),
            FOREIGN KEY(professional_id) REFERENCES professionals(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS company_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT DEFAULT 'Alex_ImpressÃ£o',
            cnpj TEXT,
            logo TEXT,
            phone TEXT,
            email TEXT,
            address TEXT,
            site TEXT,
            socials TEXT,
            responsible TEXT,
            plan TEXT DEFAULT 'mensal',
            theme TEXT DEFAULT 'light',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT DEFAULT 'info',
            is_read INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            details TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);

        db.get(`SELECT COUNT(*) as count FROM company_config`, (err, row) => {
            if (!err && row && row.count === 0) {
                db.run(`INSERT INTO company_config (name) VALUES ('Alex_ImpressÃ£o')`);
            }
        });

        ensureColumn('users', 'cpf', 'TEXT');
        ensureColumn('users', 'phone', 'TEXT');
        ensureColumn('users', 'status', "TEXT DEFAULT 'active'");
        ensureColumn('users', 'last_access', 'DATETIME');

        ensureColumn('clients', 'status', "TEXT DEFAULT 'active'");
        ensureColumn('client_accounts', 'notes', 'TEXT');
        ensureColumn('client_accounts', 'created_by', 'INTEGER');
        ensureColumn('client_accounts', 'created_at', 'DATETIME');

        ensureColumn('financials', 'created_by', 'INTEGER');
        ensureColumn('financials', 'created_at', 'DATETIME');
        ensureColumn('financials', 'details', 'TEXT');

        ensureColumn('professionals', 'cpf', 'TEXT');
        ensureColumn('professionals', 'available_hours', 'TEXT');

        ensureColumn('meetings', 'professional_id', 'INTEGER');
        ensureColumn('meetings', 'meeting_type', "TEXT DEFAULT 'presencial'");
        ensureColumn('meetings', 'location', 'TEXT');

        ensureColumn('projects', 'tasks', 'TEXT');
        ensureColumn('projects', 'created_at', 'DATETIME');

        ensureColumn('company_config', 'site', 'TEXT');
        ensureColumn('company_config', 'socials', 'TEXT');
        ensureColumn('company_config', 'responsible', 'TEXT');
        ensureColumn('company_config', 'plan', "TEXT DEFAULT 'mensal'");

        console.log('Database initialized.');
    });
}

module.exports = db;



