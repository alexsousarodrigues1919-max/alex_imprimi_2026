async function loadConfig() {
    try {
        const [config, me] = await Promise.all([apiFetch('/config'), apiFetch('/auth/me')]);

        if (config) {
            const compName = document.getElementById('compName');
            const compCnpj = document.getElementById('compCnpj');
            if (compName) compName.value = config.name || '';
            if (compCnpj) compCnpj.value = config.cnpj || '';
        }

        const profileName = document.getElementById('profileName');
        const profileEmail = document.getElementById('profileEmail');
        const roleBadge = document.getElementById('userRoleBadge');

        if (profileName) profileName.textContent = me.name || '-';
        if (profileEmail) profileEmail.textContent = me.email || '-';
        if (roleBadge) roleBadge.textContent = me.role || '-';

        updateThemeButtons(getTheme());
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function updateThemeButtons(theme) {
    const btnLight = document.getElementById('btnLightTheme');
    const btnDark = document.getElementById('btnDarkTheme');
    if (!btnLight || !btnDark) return;

    const apply = (button, active) => {
        button.classList.toggle('btn-primary', active);
        button.classList.toggle('btn-outline', !active);
    };

    apply(btnLight, theme === 'light');
    apply(btnDark, theme === 'dark');
}

window.setTheme = async (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateThemeButtons(theme);

    try {
        await apiFetch('/config', {
            method: 'PUT',
            body: JSON.stringify({ theme }),
        });
    } catch {
        // Ignore theme persistence failures
    }
};

const companyForm = document.getElementById('companyForm');
if (companyForm) {
    companyForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const button = companyForm.querySelector('button[type="submit"]');
        const stopLoading = setButtonLoading(button, 'Salvando...');

        const payload = {
            name: document.getElementById('compName').value.trim(),
            cnpj: document.getElementById('compCnpj').value.trim(),
        };

        try {
            await apiFetch('/config', {
                method: 'PUT',
                body: JSON.stringify(payload),
            });

            showToast('Configuracoes salvas.', 'success');
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            stopLoading();
        }
    });
}

document.addEventListener('DOMContentLoaded', loadConfig);
