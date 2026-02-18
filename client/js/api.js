const API_URL = 'http://localhost:3000/api';

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
        ...options.headers,
    };

    if (token) headers.Authorization = `Bearer ${token}`;

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
        });

        const contentType = response.headers.get('content-type') || '';
        const data = contentType.includes('application/json')
            ? await response.json()
            : { message: 'Resposta invalida do servidor.' };

        if (!response.ok) {
            if (response.status === 401) {
                logout();
            }
            throw new Error(data.message || 'Erro inesperado no servidor.');
        }

        return data;
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
