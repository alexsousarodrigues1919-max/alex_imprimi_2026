function sanitizeDigits(value = '') {
    return String(value).replace(/\D/g, '');
}

function isValidEmail(email = '') {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function calculateAge(birthdate) {
    const birth = new Date(birthdate);
    if (Number.isNaN(birth.getTime())) return -1;

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age -= 1;
    }

    return age;
}

function isAdult(birthdate, minAge = 18) {
    return calculateAge(birthdate) >= minAge;
}

function isValidCPF(cpf = '') {
    const digits = sanitizeDigits(cpf);
    if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i += 1) sum += Number(digits[i]) * (10 - i);
    let remainder = (sum * 10) % 11;
    if (remainder === 10) remainder = 0;
    if (remainder !== Number(digits[9])) return false;

    sum = 0;
    for (let i = 0; i < 10; i += 1) sum += Number(digits[i]) * (11 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10) remainder = 0;

    return remainder === Number(digits[10]);
}

function isValidCNPJ(cnpj = '') {
    const digits = sanitizeDigits(cnpj);
    if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) return false;

    const calc = (base, factors) => {
        const total = factors.reduce((acc, factor, idx) => acc + Number(base[idx]) * factor, 0);
        const mod = total % 11;
        return mod < 2 ? 0 : 11 - mod;
    };

    const base12 = digits.slice(0, 12);
    const d1 = calc(base12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const base13 = `${base12}${d1}`;
    const d2 = calc(base13, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

    return digits.endsWith(`${d1}${d2}`);
}

module.exports = {
    sanitizeDigits,
    isValidEmail,
    isAdult,
    calculateAge,
    isValidCPF,
    isValidCNPJ,
};
