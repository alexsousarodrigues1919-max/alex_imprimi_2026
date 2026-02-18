function cleanDigits(value) {
    return String(value || '').replace(/\D/g, '');
}

function ageFromDate(date) {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return -1;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
    return age;
}

function toggleFields() {
    const type = document.getElementById('type').value;
    const docLabel = document.getElementById('docLabel');
    const nameLabel = document.getElementById('nameLabel');
    const birthDateGroup = document.getElementById('birthDateGroup');
    const documentInput = document.getElementById('document');

    if (type === 'PF') {
        docLabel.innerText = 'CPF';
        nameLabel.innerText = 'Nome Completo';
        birthDateGroup.style.display = 'block';
        documentInput.placeholder = '000.000.000-00';
    } else {
        docLabel.innerText = 'CNPJ';
        nameLabel.innerText = 'Razao Social';
        birthDateGroup.style.display = 'none';
        documentInput.placeholder = '00.000.000/0000-00';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    toggleFields();
});

const form = document.getElementById('clientForm');

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const type = document.getElementById('type').value;
        const name = document.getElementById('name').value.trim();
        const documentVal = cleanDigits(document.getElementById('document').value);
        const birthdate = document.getElementById('birthdate').value;
        const phone = document.getElementById('phone').value.trim();
        const email = document.getElementById('email').value.trim();
        const address = document.getElementById('address').value.trim();
        const errorMessage = document.getElementById('errorMessage');
        const button = form.querySelector('button[type="submit"]');

        errorMessage.textContent = '';

        if (!name || !documentVal) {
            errorMessage.textContent = 'Nome e documento sao obrigatorios.';
            return;
        }

        if (type === 'PF') {
            if (!birthdate) {
                errorMessage.textContent = 'Data de nascimento obrigatoria para PF.';
                return;
            }
            if (ageFromDate(birthdate) < 18) {
                errorMessage.textContent = 'Nao e permitido cadastrar menor de 18 anos.';
                return;
            }
        }

        const stopLoading = setButtonLoading(button, 'Salvando...');

        try {
            await apiFetch('/clients', {
                method: 'POST',
                body: JSON.stringify({
                    type,
                    name,
                    document: documentVal,
                    birthdate: type === 'PF' ? birthdate : null,
                    phone,
                    email,
                    address,
                }),
            });

            showToast('Cliente cadastrado com sucesso.', 'success');
            window.location.href = 'clients.html';
        } catch (error) {
            errorMessage.textContent = error.message;
            showToast(error.message, 'error');
        } finally {
            stopLoading();
        }
    });
}
