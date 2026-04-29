// =============================================
// CONFIGURACIÓN DE LA API
// =============================================
const API_URL = 'https://chatbot.discoduro.app/api/chat';
const HEALTH_URL = 'https://chatbot.discoduro.app/health';

const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');

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
        conversationHistory = JSON.parse(savedHistory);
    } catch (e) {
        console.warn('No se pudo cargar el historial guardado');
    }
}

// Guardar historial
function saveHistory() {
    localStorage.setItem('chat_history', JSON.stringify(conversationHistory));
}

// =============================================
// FUNCIONES DE UI
// =============================================
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
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatMessage(text) {
    text = text.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\n/g, '<br>');
    return text;
}

function showTyping() {
    const div = document.createElement('div');
    div.className = 'mensaje asistente';
    div.innerHTML = `
        <div class="avatar">🤖</div>
        <div class="contenido">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
        </div>
    `;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
}

// =============================================
// LLAMADA A LA API (envía todo el historial)
// =============================================
async function callAPI() {
    const typingDiv = showTyping();

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: conversationHistory
            })
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        typingDiv.remove();

        if (data.error) {
            addMessage('asistente', `❌ **Error:** ${data.error}`);
            return;
        }

        // Agregar respuesta al historial y mostrarla
        const botMessage = data.response;
        conversationHistory.push({ role: "assistant", content: botMessage });
        saveHistory();
        
        addMessage('asistente', botMessage);

    } catch (error) {
        typingDiv.remove();
        addMessage('asistente', `❌ **Error de conexión:** ${error.message}`);
        console.error(error);
    }
}

// =============================================
// ENVIAR MENSAJE
// =============================================
function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    // Agregar al historial
    conversationHistory.push({ role: "user", content: text });
    saveHistory();

    // Mostrar en la UI
    addMessage('usuario', text);
    userInput.value = '';
    userInput.style.height = 'auto';

    // Llamar a la API
    callAPI();
}

// =============================================
// NUEVO CHAT
// =============================================
function newChat() {
    conversationHistory = [
        { role: "system", content: SYSTEM_PROMPT }
    ];
    saveHistory();

    chatMessages.innerHTML = `
        <div class="mensaje asistente">
            <div class="avatar">🤖</div>
            <div class="contenido">
                <p>¡Hola! Soy tu asistente de programación. Puedo ayudarte con:</p>
                <ul>
                    <li>Explicarte conceptos de código</li>
                    <li>Resolver dudas de tus cursos</li>
                    <li>Generar ejemplos prácticos</li>
                    <li>Información sobre precios y horarios</li>
                </ul>
                <p>¿En qué te puedo ayudar hoy?</p>
            </div>
        </div>
    `;
}

// =============================================
// EVENTOS
// =============================================
sendBtn.addEventListener('click', sendMessage);

userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
});

document.querySelector('.nuevo-chat').addEventListener('click', newChat);

// =============================================
// INICIALIZACIÓN
// =============================================
console.log('🚀 Chat iniciado');
console.log('📡 API:', API_URL);
console.log('💾 Historial guardado:', conversationHistory.length, 'mensajes');