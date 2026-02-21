function resolveApiUrl() {
    const override = window.localStorage.getItem('api_base_url');
    if (override) {
        return `${override.replace(/\/$/, '')}/api`;
    }

    const { protocol, hostname, origin } = window.location;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

    if (isLocal && protocol.startsWith('http')) {
        return 'http://localhost:3000/api';
    }

    return `${origin}/api`;
}

const API_URL = resolveApiUrl();

function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
        return {};
    }
}

function isAdminUser() {
    const user = getCurrentUser();
    return user.role === 'administrador' || user.role === 'admin';
}

function escapeHtml(text = '') {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function toggleGlobalLoading(show) {
    let loader = document.getElementById('global-loader');

    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'global-loader';
        loader.style = `
            position: fixed;
            top: 0;
            left: 0;
            width: 0%;
            height: 3px;
            z-index: 9999;
            background: linear-gradient(90deg, var(--primary), var(--accent));
            box-shadow: 0 0 12px rgba(59,130,246,0.45);
            transition: width 0.35s ease, opacity 0.35s ease;
            opacity: 0;
        `;
        document.body.appendChild(loader);
    }

    if (show) {
        loader.style.opacity = '1';
        loader.style.width = '70%';
    } else {
        loader.style.width = '100%';
        setTimeout(() => {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.width = '0%';
            }, 300);
        }, 200);
    }
}

function setButtonLoading(button, loadingText) {
    if (!button) return () => { };

    const originalHtml = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<i data-lucide="loader-2" class="spin"></i> ${loadingText}`;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    return () => {
        button.disabled = false;
        button.innerHTML = originalHtml;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };
}

async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    toggleGlobalLoading(true);

    const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...options.headers,
    };

    if (token) headers.Authorization = `Bearer ${token}`;

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
        });

        const contentType = response.headers.get('content-type') || '';
        let data = null;
        let rawText = '';

        if (contentType.includes('application/json')) {
            data = await response.json();
        } else {
            rawText = await response.text();
            data = {};
        }

        if (!response.ok) {
            if (response.status === 401) {
                logout();
            }

            const htmlResponse = contentType.includes('text/html') || /<html/i.test(rawText);
            const responseHint = htmlResponse
                ? 'Servidor retornou HTML em vez de JSON. Verifique API_URL/CORS/deploy.'
                : (rawText ? rawText.slice(0, 180) : '');

            throw new Error(
                data.message
                || responseHint
                || `Erro ${response.status} ao acessar ${endpoint}.`
            );
        }

        if (!contentType.includes('application/json')) {
            throw new Error(
                `Resposta invalida do servidor (${response.status}) em ${endpoint}. Esperado JSON.`
            );
        }

        return data;
    } catch (error) {
        if (error instanceof TypeError) {
            throw new Error('Falha de conexao com o servidor. Verifique se o backend esta online.');
        }
        throw error;
    } finally {
        toggleGlobalLoading(false);
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const iconMap = {
        success: 'check-circle',
        error: 'alert-circle',
        warning: 'alert-triangle',
        info: 'info',
    };

    const toast = document.createElement('div');
    toast.className = `toast glass-card toast-${type}`;
    toast.innerHTML = `
        <i data-lucide="${iconMap[type] || 'info'}"></i>
        <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    if (typeof lucide !== 'undefined') lucide.createIcons();

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 250);
    }, 3500);
}

function setupAutoRefresh(refreshFn, options = {}) {
    if (typeof refreshFn !== 'function') return () => {};

    const intervalMs = Number(options.intervalMs || 30000);
    const runOnFocus = options.runOnFocus !== false;
    const runOnOnline = options.runOnOnline !== false;
    const runWhenHidden = options.runWhenHidden === true;

    let stopped = false;
    let timer = null;
    let busy = false;

    const safeRefresh = async () => {
        if (stopped || busy) return;
        if (!runWhenHidden && document.hidden) return;

        busy = true;
        try {
            await refreshFn();
        } catch {
            // silencioso: cada modulo ja trata erro/toast
        } finally {
            busy = false;
        }
    };

    const startTimer = () => {
        if (timer) clearInterval(timer);
        timer = setInterval(safeRefresh, intervalMs);
    };

    const onVisibility = () => {
        if (document.hidden) return;
        safeRefresh();
    };

    const onFocus = () => safeRefresh();
    const onOnline = () => safeRefresh();

    startTimer();
    document.addEventListener('visibilitychange', onVisibility);
    if (runOnFocus) window.addEventListener('focus', onFocus);
    if (runOnOnline) window.addEventListener('online', onOnline);

    safeRefresh();

    return () => {
        stopped = true;
        if (timer) clearInterval(timer);
        document.removeEventListener('visibilitychange', onVisibility);
        if (runOnFocus) window.removeEventListener('focus', onFocus);
        if (runOnOnline) window.removeEventListener('online', onOnline);
    };
}
