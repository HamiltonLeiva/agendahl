/**
 * Hamilton AI Chatbot UI Component
 * Inyecta dinámicamente la interfaz del chatbot en el DOM.
 */
const chatbotHTML = `
<div class="ai-bot-container">
    <div id="ai-chat-trigger" class="ai-chat-trigger glass" role="button" aria-label="Abrir asistente Hamilton AI" tabindex="0">
        <div class="ai-indicator"></div>
        <span>Hamilton AI</span>
    </div>

    <!-- Chat Window -->
    <div id="ai-chat-window" class="ai-chat-window glass" role="dialog" aria-label="Ventana de chat de Hamilton AI">
        <div class="ai-chat-header">
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 10px; height: 10px; background: var(--accent-cyan); border-radius: 50%; box-shadow: 0 0 10px var(--accent-cyan-glow);"></div>
                <h3 style="margin: 0; font-size: 1rem; font-weight: 800; letter-spacing: 0.5px;">HAMILTON <span style="color: var(--accent-cyan);">AI</span></h3>
            </div>
            <div style="display: flex; gap: 10px;">
                <button id="reset-chat" title="Reiniciar conversación" aria-label="Reiniciar conversación" style="background: none; border: none; color: var(--text-muted); cursor: pointer; transition: all 0.3s ease;">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                        <path d="M3 3v5h5"></path>
                    </svg>
                </button>
                <button id="close-chat" style="background: none; border: none; color: var(--text-muted); cursor: pointer;">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        </div>

        <div id="ai-messages" class="ai-chat-messages">
            <div class="message message-ai">
                🤖 Hamilton AI: Bienvenido al Centro de Operaciones de HLG. Iniciando protocolos estratégicos...
            </div>
        </div>

        <div class="ai-chat-input">
            <input type="text" id="ai-input" class="ai-input" placeholder="Escriba su consulta táctica..." autocomplete="off">
            <button id="ai-send" class="ai-bot-trigger" style="width: 40px; height: 40px; box-shadow: none;">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
            </button>
        </div>
    </div>
</div>
`;

export function injectChatbot() {
    const container = document.getElementById('chatbot-container') || document.body;
    const chatbotWrapper = document.createElement('div');
    chatbotWrapper.innerHTML = chatbotHTML;
    container.appendChild(chatbotWrapper);
}
