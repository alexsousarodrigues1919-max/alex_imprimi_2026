const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('errorMessage');
        const button = loginForm.querySelector('button[type="submit"]');

        errorMessage.textContent = '';

        if (!email || !password) {
            errorMessage.textContent = 'Preencha e-mail e senha.';
            return;
        }

        const stopLoading = setButtonLoading(button, 'Entrando...');

        try {
            const data = await apiFetch('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = 'dashboard.html';
        } catch (error) {
            errorMessage.textContent = error.message;
            showToast(error.message, 'error');
        } finally {
            stopLoading();
        }
    });
}
