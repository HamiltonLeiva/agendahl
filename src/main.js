import './style.css'

// === SCROLL PROGRESS BAR ===
const progressBar = document.createElement('div');
progressBar.classList.add('scroll-progress');
document.body.prepend(progressBar);

window.addEventListener('scroll', () => {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  progressBar.style.width = `${progress}%`;
}, { passive: true });

// === ACTIVE NAV LINK ===
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-link-item').forEach(link => {
  const linkPage = link.getAttribute('href');
  if (linkPage === currentPage || (currentPage === '' && linkPage === 'index.html')) {
    link.classList.add('active');
  }
});

// === SCROLL REVEAL ANIMATIONS ===
const observerOptions = {
  threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, observerOptions);

// Hero reveal
document.querySelectorAll('.hero h1, .hero p').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(30px)';
  el.style.transition = 'all 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)';
  const simpleObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });
  simpleObserver.observe(el);
});

// --- STATS ANIMATION ---
const stats = document.querySelectorAll('.stat-number');
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const target = parseInt(entry.target.getAttribute('data-target'));
            let current = 0;
            const increment = target / 50;
            const updateCount = () => {
                if (current < target) {
                    current += increment;
                    entry.target.innerText = Math.ceil(current);
                    setTimeout(updateCount, 20);
                } else {
                    entry.target.innerText = target;
                }
            };
            updateCount();
            statsObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

stats.forEach(stat => statsObserver.observe(stat));


// Bento items and section headers use fade-up (avoid chatbot/fixed elements)
document.querySelectorAll('.bento-item, .section-header, .bento-grid .glass, footer .footer-dashboard, footer .newsletter-box').forEach(el => {
  el.classList.add('fade-up');
  observer.observe(el);
});

// Premium Inline Menu Logic
const menuTrigger = document.getElementById('menu-trigger');
const megaMenu = document.getElementById('mega-menu');
const navLinksInline = document.querySelector('.nav-links-inline');

menuTrigger?.addEventListener('click', () => {
  const isActive = menuTrigger.classList.toggle('active');
  megaMenu?.classList.toggle('active', isActive);
  navLinksInline?.classList.toggle('active', isActive);
});

// Close menu when clicking a link
document.querySelectorAll('.nav-link-item').forEach(link => {
  link.addEventListener('click', () => {
    menuTrigger?.classList.remove('active');
    megaMenu?.classList.remove('active');
    navLinksInline?.classList.remove('active');
  });
});

import { injectChatbot } from './js/chatbot-ui.js';
import HamiltonAI from './js/chatbot.js';

// Inyectar UI de Hamilton AI
injectChatbot();

// Inicializar Hamilton AI
new HamiltonAI();


// Solution Finder Mock Interaction
const solutionFinderBtn = document.querySelector('.solution-finder button');
if (solutionFinderBtn) {
  solutionFinderBtn.addEventListener('click', () => {
    alert('¡Excelente! El diagnóstico inicial está cargando. Hamilton Leiva Group se pondrá en contacto contigo.');
  });
}

console.log('Hamilton Leiva Group - AI Gateway Synchronized [Strategic Mode]');
