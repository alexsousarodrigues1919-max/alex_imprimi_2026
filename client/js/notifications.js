async function loadNotifications() {
    const list = document.getElementById('notificationsList');
    if (!list) return;

    try {
        const notifications = await apiFetch('/notifications');

        if (!notifications.length) {
            list.innerHTML = '<p class="text-muted">Nenhuma notificacao encontrada.</p>';
            return;
        }

        list.innerHTML = notifications.map((n) => `
            <div class="glass-card notification-card${n.is_read ? ' notification-read' : ''}">
                <div class="flex justify-between">
                    <strong>${escapeHtml(n.title)}</strong>
                    <small class="text-muted">${new Date(n.created_at).toLocaleString('pt-BR')}</small>
                </div>
                <p class="notification-message">${escapeHtml(n.message)}</p>
                ${n.is_read ? '<span class="badge badge-info">Lida</span>' : `<button class="btn btn-outline btn-read" onclick="markNotificationRead(${n.id}, this)">Marcar como lida</button>`}
            </div>
        `).join('');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function markNotificationRead(id, button) {
    const stopLoading = setButtonLoading(button, '...');

    try {
        await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
        await loadNotifications();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        stopLoading();
    }
}

const notificationForm = document.getElementById('notificationForm');
if (notificationForm) {
    notificationForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const payload = {
            title: document.getElementById('notifTitle').value.trim(),
            message: document.getElementById('notifMessage').value.trim(),
        };

        if (!payload.title || !payload.message) {
            showToast('Titulo e mensagem sao obrigatorios.', 'warning');
            return;
        }

        const button = notificationForm.querySelector('button[type="submit"]');
        const stopLoading = setButtonLoading(button, 'Criando...');

        try {
            await apiFetch('/notifications', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            notificationForm.reset();
            showToast('Notificacao criada.', 'success');
            await loadNotifications();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            stopLoading();
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.endsWith('notifications.html')) loadNotifications();
});
