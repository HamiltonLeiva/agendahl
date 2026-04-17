/**
 * Global Header Component for HLG
 */
const headerHTML = `
<header class="glass-header">
    <nav class="glass-nav">
        <a href="index.html" class="logo" style="text-decoration: none; color: var(--text-primary); font-weight: 900; font-size: 1.5rem; letter-spacing: -1px;">
            HL<span style="color: var(--accent-cyan);">G</span>
        </a>
        
        <!-- Inline Navigation (Desktop) -->
        <div class="nav-links-inline">
            <a href="index.html" class="nav-link-item" id="nav-home">Inicio</a>
            <a href="solutions.html" class="nav-link-item" id="nav-solutions">Solutions</a>
            <a href="software.html" class="nav-link-item" id="nav-software">Software</a>
            <a href="app.html" class="nav-link-item" id="nav-app">App</a>
            <a href="media.html" class="nav-link-item" id="nav-media">Media</a>
            <a href="casos-exito.html" class="nav-link-item" id="nav-casos">Casos</a>
            <a href="blog.html" class="nav-link-item" id="nav-blog">Blog</a>
        </div>

        <div class="menu-trigger" id="menu-trigger">
            <span></span>
            <span></span>
        </div>
    </nav>
</header>
`;

document.addEventListener('DOMContentLoaded', () => {
    const headerContainer = document.getElementById('global-header');
    if (headerContainer) {
        headerContainer.innerHTML = headerHTML;
        
        // Active Link Logic
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        const navLinks = document.querySelectorAll('.nav-link-item');
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPath) {
                link.classList.add('active');
            }
        });

        // Hamburger Menu Logic (If needed for mobile mega menu)
        const trigger = document.getElementById('menu-trigger');
        const navInline = document.querySelector('.nav-links-inline');
        
        if (trigger) {
            trigger.addEventListener('click', () => {
                trigger.classList.toggle('active');
                navInline.classList.toggle('active');
                // Potential for a real Mega Menu overlay here
            });
        }
    }
});
