function onlyDigits(value) {
    return String(value || '').replace(/\D/g, '');
}

function maskCPF(value) {
    const v = onlyDigits(value).slice(0, 11);
    return v
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function maskCNPJ(value) {
    const v = onlyDigits(value).slice(0, 14);
    return v
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

function maskPhone(value) {
    const v = onlyDigits(value).slice(0, 11);
    if (v.length <= 10) {
        return v
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
    }

    return v
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

function maskCurrencyBRL(value) {
    const digits = onlyDigits(value);
    if (!digits) return '';

    const number = Number(digits) / 100;
    return number.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function parseCurrencyBRL(value) {
    const normalized = String(value || '')
        .replace(/\./g, '')
        .replace(',', '.');
    const number = Number(normalized);
    return Number.isFinite(number) ? number : 0;
}

function bindMask(selector, formatter) {
    const input = document.querySelector(selector);
    if (!input) return;

    input.addEventListener('input', (e) => {
        e.target.value = formatter(e.target.value);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    bindMask('#cpf', maskCPF);
    bindMask('#phone', maskPhone);
    bindMask('#profCpf', maskCPF);
    bindMask('#profPhone', maskPhone);
    bindMask('#compCnpj', maskCNPJ);

    const documentInput = document.querySelector('#document');
    const typeInput = document.querySelector('#type');
    if (documentInput) {
        const applyClientDocMask = () => {
            const type = typeInput ? typeInput.value : 'PF';
            documentInput.value = type === 'PJ' ? maskCNPJ(documentInput.value) : maskCPF(documentInput.value);
        };

        documentInput.addEventListener('input', applyClientDocMask);
        if (typeInput) typeInput.addEventListener('change', applyClientDocMask);
    }

    bindMask('#finAmount', maskCurrencyBRL);
});
