async function loadMeetingDependencies() {
    const clientSelect = document.getElementById('meetingClient');
    const professionalSelect = document.getElementById('meetingProfessional');

    if (clientSelect) clientSelect.innerHTML = '<option value="">Selecione...</option>';
    if (professionalSelect) professionalSelect.innerHTML = '<option value="">Selecione...</option>';

    const [clients, professionals] = await Promise.all([
        apiFetch('/clients'),
        apiFetch('/professionals'),
    ]);

    clients.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        clientSelect.appendChild(opt);
    });

    professionals.forEach((p) => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        professionalSelect.appendChild(opt);
    });
}

async function loadMeetings() {
    const meetingList = document.getElementById('meetingList');
    if (!meetingList) return;

    meetingList.innerHTML = '<p class="text-muted">Carregando reunioes...</p>';

    const meetings = await apiFetch('/meetings');
    if (!meetings.length) {
        meetingList.innerHTML = '<p class="text-muted">Nenhuma reuniao agendada.</p>';
        return;
    }

    meetingList.innerHTML = meetings
        .map(
            (m) => `
            <div class="glass-card" style="padding:1rem;margin-bottom:.75rem;">
                <div class="flex justify-between items-center">
                    <strong>${escapeHtml(m.title)}</strong>
                    <span class="badge ${m.status === 'completed' ? 'badge-success' : m.status === 'cancelled' ? 'badge-danger' : 'badge-info'}">${escapeHtml(m.status)}</span>
                </div>
                <div style="font-size:.8rem;color:var(--text-muted);margin-top:.35rem;">
                    ${new Date(m.date).toLocaleString('pt-BR')} | Cliente: ${escapeHtml(m.client_name || '-')} | Profissional: ${escapeHtml(m.professional_name || '-')}
                </div>
            </div>
        `
        )
        .join('');
}

const meetingForm = document.getElementById('meetingForm');
if (meetingForm) {
    meetingForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const button = meetingForm.querySelector('button[type="submit"]');
        const payload = {
            title: document.getElementById('meetingTitle').value.trim(),
            date: document.getElementById('meetingDate').value,
            client_id: Number(document.getElementById('meetingClient').value),
            professional_id: Number(document.getElementById('meetingProfessional').value),
            meeting_type: document.getElementById('meetingType').value,
            location: document.getElementById('meetingLocation').value.trim(),
            notes: document.getElementById('meetingNotes').value.trim(),
        };

        if (!payload.title || !payload.date || !payload.client_id || !payload.professional_id) {
            showToast('Preencha todos os campos obrigatorios.', 'warning');
            return;
        }

        const stopLoading = setButtonLoading(button, 'Agendando...');

        try {
            await apiFetch('/meetings', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            meetingForm.reset();
            showToast('Reuniao agendada.', 'success');
            await loadMeetings();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            stopLoading();
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!window.location.pathname.endsWith('agenda.html')) return;

    try {
        await loadMeetingDependencies();
        await loadMeetings();
    } catch (error) {
        showToast(error.message, 'error');
    }
});
