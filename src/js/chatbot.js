import { supabaseConfig } from './supabase-config.js';

class HamiltonAI {
    constructor() {
        this.aiTrigger = document.getElementById('ai-trigger');
        this.aiChatWindow = document.getElementById('ai-chat-window');
        this.closeChat = document.getElementById('close-chat');
        this.aiInput = document.getElementById('ai-input');
        this.aiSend = document.getElementById('ai-send');
        this.aiMessages = document.getElementById('ai-messages');
        this.resetChat = document.getElementById('reset-chat');
        
        this.CONTEXT_KEY = 'hlg_ai_context';
        this.chatHistory = [];
        
        // Cargar contexto persistente INMEDIATAMENTE
        const saved = this.loadContext();
        this.userContext = {
            sessionId: saved?.sessionId || null,
            name: saved?.name || null,
            contact: saved?.contact || null,
            division: saved?.division || null,
            leadsSaved: saved?.leadsSaved || false
        };

        this.init();
    }

    async init() {
        this.aiTrigger?.addEventListener('click', () => this.toggleChat());
        this.closeChat?.addEventListener('click', () => this.toggleChat(false));
        this.aiSend?.addEventListener('click', () => this.handleSend());
        this.aiInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSend();
        });
        this.resetChat?.addEventListener('click', () => this.handleReset());
    }

    toggleChat(force) {
        const isActive = force !== undefined ? force : !this.aiChatWindow?.classList.contains('active');
        this.aiChatWindow?.classList.toggle('active', isActive);
        
        if (isActive && !this.aiMessages?.querySelector('.message')) {
            this.clearMessages();
            this.addMessage("🤖 Hamilton AI: Bienvenido de nuevo a Hamilton Leiva Group. Sincronizando su perfil estratégico...", true);
            
            // Si ya tenemos sesión, podríamos querer cargar historial, pero por ahora 
            // solo damos la bienvenida inicial. El backend ya tiene el historial.
            setTimeout(() => {
                this.addMessage("Listo. ¿En qué puedo apoyarle hoy?", true);
            }, 1000);
        }
    }

    saveContext() {
        localStorage.setItem(this.CONTEXT_KEY, JSON.stringify(this.userContext));
    }

    loadContext() {
        const saved = localStorage.getItem(this.CONTEXT_KEY);
        try {
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    }

    addMessage(text, isAI = false) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${isAI ? 'message-ai' : 'message-user'}`;
        msgDiv.textContent = text;
        this.aiMessages?.appendChild(msgDiv);
        this.aiMessages.scrollTop = this.aiMessages.scrollHeight;

        this.chatHistory.push({ role: isAI ? 'assistant' : 'user', content: text });
    }

    showTyping() {
        const typing = document.createElement('div');
        typing.id = 'typing-indicator';
        typing.className = 'typing-indicator';
        typing.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
        this.aiMessages?.appendChild(typing);
        this.aiMessages.scrollTop = this.aiMessages.scrollHeight;
    }

    removeTyping() {
        document.getElementById('typing-indicator')?.remove();
    }

    clearMessages() {
        if (this.aiMessages) this.aiMessages.innerHTML = '';
    }

    async handleSend() {
        const text = this.aiInput?.value.trim();
        if (!text) return;

        this.addMessage(text, false);
        this.aiInput.value = '';
        this.showTyping();

        try {
            const response = await fetch(supabaseConfig.functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseConfig.anonKey}`
                },
                body: JSON.stringify({
                    message: text,
                    sessionId: this.userContext.sessionId, // Enviamos el ID de sesión
                    context: this.userContext // Enviamos contexto local por si hay cambios
                    // history: No enviamos historial, el backend lo maneja vía DB
                })
            });

            const data = await response.json();
            this.removeTyping();

            if (data.reply) {
                this.addMessage(data.reply, true);
                
                // Actualizar contexto y sesión desde el servidor
                if (data.context) {
                    this.userContext = { ...this.userContext, ...data.context };
                }
                if (data.sessionId) {
                    this.userContext.sessionId = data.sessionId;
                }
                this.saveContext();

            } else {
                const errorMsg = data.error || "Operación estratégica en pausa. Intente de nuevo en breve.";
                this.addMessage(`🤖 Hamilton AI: ${errorMsg}`, true);
            }
        } catch (error) {
            this.removeTyping();
            console.error("Gateway Error:", error);
            this.addMessage("🤖 Hamilton AI: Error de conexión con la central HLG.", true);
        }
    }

    handleReset() {
        if (confirm("¿Desea reiniciar la conversación? Se borrará el historial y la sesión actual.")) {
            localStorage.removeItem(this.CONTEXT_KEY);
            this.userContext = {
                sessionId: null,
                name: null,
                contact: null,
                division: null,
                leadsSaved: false
            };
            this.chatHistory = [];
            this.clearMessages();
            this.addMessage("🤖 Hamilton AI: Memoria reiniciada. ¿Cómo puedo asistirle en un nuevo requerimiento?", true);
        }
    }
}

export default HamiltonAI;
