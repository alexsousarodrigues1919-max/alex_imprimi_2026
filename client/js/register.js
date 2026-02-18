function onlyDigits(value) {
    return String(value || '').replace(/\D/g, '');
}

function calculateAgeFromDate(date) {
    const birth = new Date(date);
    if (Number.isNaN(birth.getTime())) return -1;

    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
    return age;
}

const registerForm = document.getElementById('registerForm');

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const birthdate = document.getElementById('birthdate').value;
        const cpf = onlyDigits(document.getElementById('cpf').value);
        const phone = document.getElementById('phone').value.trim();
        const role = document.getElementById('role').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const errorMessage = document.getElementById('errorMessage');
        const button = registerForm.querySelector('button[type="submit"]');

        errorMessage.textContent = '';

        if (!name || !email || !birthdate || !cpf || !phone || !role || !password || !confirmPassword) {
            errorMessage.textContent = 'Todos os campos sao obrigatorios.';
            return;
        }

        if (calculateAgeFromDate(birthdate) < 18) {
            errorMessage.textContent = 'Cadastro permitido somente para maiores de 18 anos.';
            return;
        }

        if (password.length < 8) {
            errorMessage.textContent = 'A senha deve ter no minimo 8 caracteres.';
            return;
        }

        if (password !== confirmPassword) {
            errorMessage.textContent = 'Senha e confirmacao nao conferem.';
            return;
        }

        const stopLoading = setButtonLoading(button, 'Criando conta...');

        try {
            const data = await apiFetch('/auth/register', {
                method: 'POST',
                body: JSON.stringify({
                    name,
                    email,
                    birthdate,
                    cpf,
                    phone,
                    role,
                    password,
                    confirmPassword,
                    status: 'ativo',
                }),
            });

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            showToast('Conta criada com sucesso.', 'success');
            window.location.href = 'dashboard.html';
        } catch (error) {
            errorMessage.textContent = error.message;
            showToast(error.message, 'error');
        } finally {
            stopLoading();
        }
    });
}
