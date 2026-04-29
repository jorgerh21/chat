// =============================================
// CONFIGURACIÓN DE LA API
// =============================================
const API_URL = 'https://chatbot.discoduro.app/api/chat';
const HEALTH_URL = 'https://chatbot.discoduro.app/health';

const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');

// =============================================
// INDICADOR DE ESTADO
// =============================================
function updateStatus(connected) {
    if (!statusIndicator || !statusText) return;

    if (connected) {
        statusIndicator.className = 'status-dot connected';
        statusText.textContent = 'Conectado · Ollama Llama 3';
    } else {
        statusIndicator.className = 'status-dot disconnected';
        statusText.textContent = 'Desconectado · Verifica la API';
    }
}

// =============================================
// GESTIÓN DEL HISTORIAL (en el frontend)
// =============================================
const SYSTEM_PROMPT = `Eres un asistente amigable y experto en programación. 
Ayudas a estudiantes de los siguientes cursos:
- Crea tu propia página web (HTML, Antigravity, Gemini/ChatGPT) · 10h · $100.000 COP
- Lógica de Programación con Python · 20h · $150.000 COP
- Desarrollo Web Full Stack (MySQL, Backend Python, Frontend React) · 30h · $300.000 COP
- Inteligencia Artificial (Python para Datos, Machine Learning) · 32h · $600.000 COP

Responde en español, con ejemplos de código cuando sea útil.`;

let conversationHistory = [
    { role: "system", content: SYSTEM_PROMPT }
];

// Cargar historial guardado
const savedHistory = localStorage.getItem('chat_history');
if (savedHistory) {
    try {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed) && parsed.length > 0) {
            conversationHistory = parsed;
            console.log('💾 Historial cargado:', conversationHistory.length, 'mensajes');
        }
    } catch (e) {
        console.warn('⚠️ No se pudo cargar el historial guardado, iniciando nuevo');
    }
}

// Guardar historial
function saveHistory() {
    try {
        // Mantener solo los últimos 50 mensajes para no llenar localStorage
        const toSave = conversationHistory.slice(-50);
        localStorage.setItem('chat_history', JSON.stringify(toSave));
    } catch (e) {
        console.warn('⚠️ No se pudo guardar el historial:', e);
    }
}

// =============================================
// FUNCIONES DE UI
// =============================================

// Agregar mensaje al chat
function addMessage(role, text) {
    const div = document.createElement('div');
    div.className = `mensaje ${role}`;

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = role === 'usuario' ? '👤' : '🤖';

    const contenido = document.createElement('div');
    contenido.className = 'contenido';
    contenido.innerHTML = formatMessage(text);

    if (role === 'usuario') {
        div.appendChild(contenido);
        div.appendChild(avatar);
    } else {
        div.appendChild(avatar);
        div.appendChild(contenido);
    }

    chatMessages.appendChild(div);
    scrollToBottom();
}

// Formatear texto (Markdown simple)
function formatMessage(text) {
    if (!text) return '';

    // Escapar HTML primero para evitar XSS
    let formatted = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Código en bloque (```...```)
    formatted = formatted.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

    // Código en línea (`...`)
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Negrita (**...**)
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Cursiva (*...*)
    formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Enlaces [texto](url)
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Saltos de línea
    formatted = formatted.replace(/\n/g, '<br>');

    return formatted;
}

// Scroll automático al final
function scrollToBottom() {
    setTimeout(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 50);
}

// Indicador de "escribiendo..."
function showTyping() {
    const div = document.createElement('div');
    div.className = 'mensaje asistente typing';
    div.innerHTML = `
        <div class="avatar">🤖</div>
        <div class="contenido">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
        </div>
    `;
    chatMessages.appendChild(div);
    scrollToBottom();
    return div;
}

// Eliminar indicador de typing
function removeTyping(typingDiv) {
    if (typingDiv && typingDiv.parentNode) {
        typingDiv.remove();
    }
}

// =============================================
// LLAMADA A LA API (envía todo el historial)
// =============================================
async function callAPI() {
    let typingDiv = null;

    try {
        // Mostrar indicador de escritura
        typingDiv = showTyping();

        // Limitar historial a últimos 20 mensajes para no sobrecargar
        const messagesToSend = conversationHistory.slice(-20);

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: messagesToSend
            })
        });

        // Eliminar indicador
        removeTyping(typingDiv);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();

        if (data.error) {
            addMessage('asistente', `❌ **Error del servidor:** ${data.error}`);
            return;
        }

        const botMessage = data.response || 'No se recibió respuesta';

        // Agregar respuesta al historial
        conversationHistory.push({ role: "assistant", content: botMessage });
        saveHistory();

        // Mostrar respuesta
        addMessage('asistente', botMessage);

    } catch (error) {
        removeTyping(typingDiv);

        let errorMsg = '❌ **Error de conexión**';

        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            errorMsg += '\nNo se pudo conectar con el servidor. Verifica tu conexión a internet.';
            updateStatus(false);
        } else if (error.message.includes('timeout')) {
            errorMsg += '\nLa solicitud tardó demasiado. Intenta de nuevo.';
        } else {
            errorMsg += `\n${error.message}`;
        }

        addMessage('asistente', errorMsg);
        console.error('❌ Error:', error);
    }
}

// =============================================
// ENVIAR MENSAJE
// =============================================
function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    // Verificar que no esté vacío después de trim
    if (text.length === 0) return;

    // Deshabilitar botón mientras se procesa
    sendBtn.disabled = true;
    userInput.disabled = true;

    // Agregar mensaje del usuario al historial
    conversationHistory.push({ role: "user", content: text });
    saveHistory();

    // Mostrar en la UI
    addMessage('usuario', text);

    // Limpiar input
    userInput.value = '';
    userInput.style.height = 'auto';

    // Hacer foco en el input
    userInput.focus();

    // Llamar a la API
    callAPI().finally(() => {
        // Re-habilitar botón después de recibir respuesta
        sendBtn.disabled = false;
        userInput.disabled = false;
        userInput.focus();
    });
}

// =============================================
// NUEVO CHAT
// =============================================
function newChat() {
    // Confirmar si hay conversación activa
    if (conversationHistory.length > 1) {
        const confirmar = confirm('¿Estás seguro de iniciar un nuevo chat? Se perderá el historial actual.');
        if (!confirmar) return;
    }

    // Reiniciar historial
    conversationHistory = [
        { role: "system", content: SYSTEM_PROMPT }
    ];
    saveHistory();

    // Limpiar mensajes y mostrar bienvenida
    chatMessages.innerHTML = `
        <div class="mensaje asistente">
            <div class="avatar">🤖</div>
            <div class="contenido">
                <p>¡Hola! Soy tu asistente de programación. Puedo ayudarte con:</p>
                <ul>
                    <li>Explicarte conceptos de código</li>
                    <li>Resolver dudas de tus cursos</li>
                    <li>Generar ejemplos prácticos</li>
                    <li>Depurar fragmentos de código</li>
                </ul>
                <p>¿En qué te puedo ayudar hoy?</p>
            </div>
        </div>
    `;

    // Hacer foco en el input
    userInput.focus();

    console.log('🔄 Nuevo chat iniciado');
}

// =============================================
// VERIFICAR SALUD DE LA API
// =============================================
async function checkHealth() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(HEALTH_URL, {
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            console.log('✅ API conectada:', data);
            updateStatus(true);

            // Actualizar texto con el modelo real si viene en la respuesta
            if (data.model) {
                statusText.textContent = `Conectado · ${data.model}`;
            }
        } else {
            updateStatus(false);
        }
    } catch (error) {
        console.warn('⚠️ No se pudo verificar la API:', error.message);
        updateStatus(false);
    }
}

// =============================================
// EVENTOS
// =============================================

// Botón enviar
sendBtn.addEventListener('click', (e) => {
    e.preventDefault();
    sendMessage();
});

// Enter para enviar, Shift+Enter para nueva línea
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Auto-ajustar altura del textarea
userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
});

// Botón nuevo chat
const nuevoChatBtn = document.querySelector('.nuevo-chat');
if (nuevoChatBtn) {
    nuevoChatBtn.addEventListener('click', (e) => {
        e.preventDefault();
        newChat();
    });
}

// Atajo de teclado: Ctrl+K para nuevo chat
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        newChat();
    }
});

// =============================================
// INICIALIZACIÓN
// =============================================
console.log('🚀 Asistente de Programación iniciado');
console.log('📡 API:', API_URL);
console.log('💾 Historial:', conversationHistory.length, 'mensajes');

// Verificar conexión al cargar
checkHealth();

// Verificar periódicamente (cada 60 segundos)
setInterval(checkHealth, 60000);

// Enfocar el input al cargar
userInput.focus();