// =============================================
// CONFIGURACIÓN DE TU API
// =============================================
const API_URL = 'https://chatbot.discoduro.app/api/chat';  // Tu API Flask
const HEALTH_URL = 'https://chatbot.discoduro.app/health';  // Endpoint de salud

const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');

// ID del cliente (se genera aleatoriamente y se mantiene en la sesión)
let clienteId = localStorage.getItem('chatbot_cliente_id');
if (!clienteId) {
    clienteId = 'web_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('chatbot_cliente_id', clienteId);
}

// Nombre del usuario (puedes personalizarlo)
const nombreUsuario = 'Estudiante Web';

// =============================================
// FUNCIONES
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
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Formatear texto (Markdown simple)
function formatMessage(text) {
    // Código en bloque (```...```)
    text = text.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    // Código en línea (`...`)
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Negrita
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Saltos de línea
    text = text.replace(/\n/g, '<br>');
    return text;
}

// Indicador de "escribiendo..."
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
// LLAMADA A TU API
// =============================================
async function callAPI(userMessage) {
    const typingDiv = showTyping();

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: userMessage,
                cliente_id: clienteId,
                nombre: nombreUsuario
            })
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Eliminar indicador de carga
        typingDiv.remove();

        if (data.error) {
            addMessage('asistente', `❌ **Error:** ${data.error}`);
            return;
        }

        addMessage('asistente', data.response);

        // Actualizar cliente_id si la API devolvió uno nuevo
        if (data.cliente_id && data.cliente_id !== clienteId) {
            clienteId = data.cliente_id;
            localStorage.setItem('chatbot_cliente_id', clienteId);
        }

    } catch (error) {
        typingDiv.remove();
        addMessage('asistente', `❌ **Error de conexión:** No se pudo contactar con el asistente. 
        Verifica que la API esté funcionando en \`${API_URL}\``);
        console.error(error);
    }
}

// Enviar mensaje
function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    addMessage('usuario', text);
    userInput.value = '';
    userInput.style.height = 'auto';

    callAPI(text);
}

// =============================================
// VERIFICAR SALUD DE LA API
// =============================================
async function checkHealth() {
    try {
        const response = await fetch(HEALTH_URL);
        if (response.ok) {
            const data = await response.json();
            console.log('✅ API conectada:', data);
            return true;
        }
    } catch (error) {
        console.warn('⚠️ No se pudo verificar la API:', error);
    }
    return false;
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

// Auto-ajustar altura del textarea
userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
});

// Nuevo chat
document.querySelector('.nuevo-chat').addEventListener('click', () => {
    // Generar nuevo ID de cliente para empezar historial limpio
    clienteId = 'web_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('chatbot_cliente_id', clienteId);

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
});

// =============================================
// INICIALIZACIÓN
// =============================================
console.log('🚀 Chat iniciado');
console.log('📡 API:', API_URL);
console.log('👤 Cliente ID:', clienteId);

// Verificar salud de la API al cargar
checkHealth().then(ok => {
    if (!ok) {
        addMessage('asistente', '⚠️ **Nota:** El asistente está iniciando. Si no responde en unos segundos, verifica que la API esté funcionando.');
    }
});