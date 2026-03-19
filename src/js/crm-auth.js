import { supabaseConfig } from './supabase-config.js';

const supabase = window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey);

const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const authError = document.getElementById('auth-error');
const btnLogout = document.getElementById('btn-logout');

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        loginModal.style.display = 'none';
        console.log("Acceso autorizado:", session.user.email);
        // Despachar evento para que otros módulos sepan que estamos logueados
        window.dispatchEvent(new CustomEvent('hlg-auth-success', { detail: session }));
    } else {
        loginModal.style.display = 'flex';
    }
}

loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        authError.style.display = 'block';
        authError.textContent = error.message;
    } else {
        loginModal.style.display = 'none';
        window.dispatchEvent(new CustomEvent('hlg-auth-success', { detail: data.session }));
    }
});

btnLogout?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.reload();
});

// Suscribirse a cambios de estado de auth
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
        loginModal.style.display = 'none';
    } else if (event === 'SIGNED_OUT') {
        loginModal.style.display = 'flex';
    }
});

// Ejecutar verificación inicial
checkAuth();
