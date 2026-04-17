import { initLeadsListener } from './crm-data.js';

// Escuchar evento de autenticación exitosa
window.addEventListener('hlg-auth-success', (e) => {
    console.log("Iniciando CRM Sincronizado para:", e.detail.user?.email);
    initLeadsListener();
});

// Animación de bienvenida para el Dashboard
document.addEventListener('DOMContentLoaded', () => {
    const dashTrigger = document.getElementById('dash-trigger');
    const dashNav = document.getElementById('dash-nav-links');
    
    dashTrigger?.addEventListener('click', () => {
        dashTrigger.classList.toggle('active');
        dashNav?.classList.toggle('active');
        document.body.classList.toggle('header-nav-open');
    });
});
