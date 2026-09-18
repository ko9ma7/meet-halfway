export function randomToken(bytes = 24) {
    const data = new Uint8Array(bytes);
    crypto.getRandomValues(data);
    return Array.from(data, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
export function randomShareId() {
    const data = new Uint8Array(8);
    crypto.getRandomValues(data);
    return Array.from(data, (byte) => byte.toString(36).padStart(2, '0')).join('').slice(0, 12);
}
export function escapeHtml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}
export function formatDateTime(iso) {
    const date = new Date(iso);
    return new Intl.DateTimeFormat('ko-KR', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(date);
}
export function formatCountdown(deadlineIso) {
    const diff = new Date(deadlineIso).getTime() - Date.now();
    if (diff <= 0)
        return '입력 마감';
    const minutes = Math.floor(diff / 60000);
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const mins = minutes % 60;
    if (days > 0)
        return `${days}일 ${hours}시간 남음`;
    if (hours > 0)
        return `${hours}시간 ${mins}분 남음`;
    return `${Math.max(1, mins)}분 남음`;
}
export function isMeetingClosed(status, deadlineIso) {
    return status === 'closed' || new Date(deadlineIso).getTime() <= Date.now();
}
export function toLocalDateTimeInput(date) {
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60_000);
    return local.toISOString().slice(0, 16);
}
export function showToast(message, tone = 'default') {
    const region = document.querySelector('#toast-region');
    if (!region)
        return;
    const toast = document.createElement('div');
    toast.className = `toast toast--${tone}`;
    toast.textContent = message;
    region.append(toast);
    window.setTimeout(() => toast.classList.add('is-visible'), 20);
    window.setTimeout(() => {
        toast.classList.remove('is-visible');
        window.setTimeout(() => toast.remove(), 220);
    }, 3600);
}
export async function copyText(text) {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
}
