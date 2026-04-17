/**
 * Global Footer Component for HLG
 */
const footerHTML = `
<footer>
    <div class="footer-main">
        <div class="footer-brand">
            <a href="index.html" class="logo" style="text-decoration: none; color: var(--text-primary); font-weight: 900; font-size: 1.5rem; letter-spacing: -1px;">
                HL<span style="color: var(--accent-cyan);">G</span>
            </a>
            <p style="margin-top: 1.5rem; color: var(--text-secondary); max-width: 300px;">
                Impulsando la transformación digital global con soluciones de software, apps y marketing de alto impacto.
            </p>
            <div class="social-links">
                <a href="#" class="social-icon" aria-label="LinkedIn">LN</a>
                <a href="#" class="social-icon" aria-label="Twitter">TW</a>
                <a href="#" class="social-icon" aria-label="Instagram">IG</a>
            </div>
        </div>
        
        <div class="footer-links">
            <h4 style="color: var(--text-primary); margin-bottom: 2rem;">Divisiones</h4>
            <ul style="list-style: none; padding: 0;">
                <li><a href="solutions.html" style="color: var(--text-secondary); text-decoration: none; display: block; margin-bottom: 0.8rem;">HL Solutions</a></li>
                <li><a href="software.html" style="color: var(--text-secondary); text-decoration: none; display: block; margin-bottom: 0.8rem;">H Leiva Software</a></li>
                <li><a href="app.html" style="color: var(--text-secondary); text-decoration: none; display: block; margin-bottom: 0.8rem;">Hamilton L APP</a></li>
                <li><a href="media.html" style="color: var(--text-secondary); text-decoration: none; display: block; margin-bottom: 0.8rem;">HL Media</a></li>
            </ul>
        </div>

        <div class="footer-links">
            <h4 style="color: var(--text-primary); margin-bottom: 2rem;">Compañía</h4>
            <ul style="list-style: none; padding: 0;">
                <li><a href="equipo.html" style="color: var(--text-secondary); text-decoration: none; display: block; margin-bottom: 0.8rem;">Nuestro Equipo</a></li>
                <li><a href="casos-exito.html" style="color: var(--text-secondary); text-decoration: none; display: block; margin-bottom: 0.8rem;">Casos de Éxito</a></li>
                <li><a href="blog.html" style="color: var(--text-secondary); text-decoration: none; display: block; margin-bottom: 0.8rem;">Blog & Noticias</a></li>
                <li><a href="dashboard.html" style="color: var(--text-secondary); text-decoration: none; display: block; margin-bottom: 0.8rem;">Portal Interno (CRM)</a></li>
                <li><a href="#" style="color: var(--text-secondary); text-decoration: none; display: block; margin-bottom: 0.8rem;">Contacto</a></li>
            </ul>
        </div>

        <div class="footer-newsletter">
            <h4 style="color: var(--text-primary); margin-bottom: 2rem;">Suscríbete</h4>
            <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">Recibe las últimas tendencias en tecnología.</p>
            <form id="newsletter-form" style="display: flex; gap: 0.5rem;">
                <input type="email" placeholder="tu@email.com" class="ai-input" style="border-radius: 8px;">
                <button type="submit" class="btn-primary" style="padding: 0.5rem 1rem; border-radius: 8px;">OK</button>
            </form>
        </div>
    </div>
    
    <div style="margin-top: 5rem; padding-top: 2rem; border-top: 1px solid var(--glass-border); text-align: center; color: var(--text-muted); font-size: 0.8rem;">
        &copy; 2026 Hamilton Leiva Group. Todos los derechos reservados.
    </div>
</footer>
`;

document.addEventListener('DOMContentLoaded', () => {
    const footerContainer = document.getElementById('global-footer');
    if (footerContainer) {
        footerContainer.innerHTML = footerHTML;
    }
});
