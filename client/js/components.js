const getTheme = () => localStorage.getItem('theme') || 'light';

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
}

setTheme(getTheme());

function ensureLucide() {
    if (typeof lucide !== 'undefined') return Promise.resolve();

    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/lucide@latest';
        script.onload = () => resolve();
        script.onerror = () => resolve();
        document.head.appendChild(script);
    });
}

function showSplashScreen() {
    const splash = document.createElement('div');
    splash.id = 'splash-screen';
    splash.className = 'splash-screen';

    splash.innerHTML = `
        <img class="splash-logo" src="assets/logo-alex-impressao.svg" alt="Alex_Impressao">
        <h2 class="splash-title">Alex_Impressao</h2>
        <p class="splash-subtitle">Carregando plataforma...</p>
    `;

    document.body.appendChild(splash);

    setTimeout(() => {
        splash.style.opacity = '0';
        setTimeout(() => splash.remove(), 450);
    }, 900);
}

function ensureDashboardLayout() {
    if (document.querySelector('.dashboard-layout')) return;

    const bodyChildren = Array.from(document.body.children);
    const layout = document.createElement('div');
    layout.className = 'dashboard-layout';

    const main = document.createElement('main');
    main.className = 'main-content';

    bodyChildren.forEach((node) => {
        if (node.tagName === 'SCRIPT') return;
        main.appendChild(node);
    });

    layout.appendChild(main);
    document.body.insertBefore(layout, document.body.firstChild);
}

function getMenuByRole(role) {
    const fullMenu = [
        { href: 'dashboard.html', icon: 'layout-dashboard', label: 'Painel', key: 'dashboard' },
        { href: 'profissional-360.html', icon: 'monitor-cog', label: 'Profissional 360', key: 'profissional-360' },
        { href: 'clients.html', icon: 'users', label: 'Clientes', key: 'clients' },
        { href: 'conta-cliente.html', icon: 'contact', label: 'Conta Cliente', key: 'conta-cliente' },
        { href: 'pdv.html', icon: 'shopping-cart', label: 'PDV', key: 'pdv' },
        { href: 'produtos.html', icon: 'package', label: 'Produtos', key: 'produtos' },
        { href: 'financial.html', icon: 'banknote', label: 'Financeiro', key: 'financial' },
        { href: 'agenda.html', icon: 'calendar-days', label: 'Agenda', key: 'agenda' },
        { href: 'horarios.html', icon: 'clock-3', label: 'Marcar Horarios', key: 'horarios' },
        { href: 'projects.html', icon: 'folder-kanban', label: 'Projetos', key: 'projects' },
        { href: 'planejamento.html', icon: 'list-checks', label: 'Planejamento', key: 'planejamento' },
        { href: 'services.html', icon: 'headset', label: 'Atendimento', key: 'services' },
        { href: 'professionals.html', icon: 'briefcase', label: 'Profissionais', key: 'professionals' },
        { href: 'users.html', icon: 'user-cog', label: 'Usuarios', key: 'users' },
        { href: 'reports.html', icon: 'bar-chart-3', label: 'Relatorios', key: 'reports' },
        { href: 'notifications.html', icon: 'bell', label: 'Notificacoes', key: 'notifications' },
        { href: 'settings.html', icon: 'settings', label: 'Configuracoes', key: 'settings' },
    ];

    const professionalMenuKeys = [
        'profissional-360',
        'agenda',
        'horarios',
        'services',
        'projects',
        'notifications',
        'settings',
    ];

    const viewOnlyMenuKeys = ['dashboard', 'reports', 'notifications', 'settings'];

    if (role === 'profissional' || role === 'tecnico') {
        return fullMenu.filter((item) => professionalMenuKeys.includes(item.key));
    }

    if (role === 'visualizacao') {
        return fullMenu.filter((item) => viewOnlyMenuKeys.includes(item.key));
    }

    return fullMenu;
}

function injectSidebar() {
    const layout = document.querySelector('.dashboard-layout');
    if (!layout) return;

    const page = (window.location.pathname.split('/').pop() || 'dashboard.html').replace('.html', '');
    const selectedRole = localStorage.getItem('login_access_type') || getCurrentUser()?.role || '';
    const role = String(selectedRole).toLowerCase();
    const menu = getMenuByRole(role);

    const links = menu
        .map(
            (item) =>
                `<li><a href="${item.href}" class="nav-link ${page === item.key ? 'active' : ''}"><i data-lucide="${item.icon}"></i>${item.label}</a></li>`
        )
        .join('');

    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';
    sidebar.innerHTML = `
        <div class="brand">
            <img class="brand-logo-image" src="assets/logo-alex-impressao.svg" alt="Alex_Impressao">
            <span class="brand-name">Alex_Impressao</span>
        </div>
        <nav class="flex-1">
            <ul class="nav-list">${links}</ul>
        </nav>
        <div class="sidebar-footer">
            <a href="settings.html" class="nav-link"><i data-lucide="user"></i>Perfil</a>
            <a href="#" onclick="logout()" class="nav-link text-danger"><i data-lucide="log-out"></i>Sair</a>
        </div>
    `;

    layout.insertBefore(sidebar, layout.firstChild);
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', async () => {
    await ensureLucide();

    const page = (window.location.pathname.split('/').pop() || '').replace('.html', '');
    const isAuthPage = page === '' || page === 'index' || page === 'register';

    if (!isAuthPage) {
        if (!checkAuth()) return;
        ensureDashboardLayout();
        showSplashScreen();
        injectSidebar();
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
});
