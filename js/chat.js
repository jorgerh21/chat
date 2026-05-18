// DOM Elements
const chatMessagesDiv = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const statusIndicator = document.getElementById('statusIndicator');

// API endpoint (ajustar si es necesario)
const API_URL = 'https://api.sitioz.com/web.php';

// Clave para guardar el historial en localStorage
const STORAGE_KEY = 'chat_conversation_history';

// Inicializar historial (array de mensajes con role y content)
let conversation = [];

// Cargar historial desde localStorage al inicio
function loadHistory() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            conversation = JSON.parse(saved);
            // Validar que sea un array y tenga la estructura mínima
            if (!Array.isArray(conversation)) conversation = [];
        } catch (e) { conversation = []; }
    }
    // Si no hay historial, podemos dejar vacío o agregar un mensaje de bienvenida de sistema.
    // El mensaje de bienvenida está en el HTML estático.
}

// Guardar historial actual en localStorage
function saveHistory() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversation));
}

// Renderizar todos los mensajes en el contenedor
function renderMessages() {
    // Limpiar contenedor pero mantener el mensaje de bienvenida si no hay mensajes
    // Opción más limpia: vaciar todo y volver a construir, conservando bienvenida solo si no hay mensajes.
    const children = chatMessagesDiv.querySelectorAll('.message');
    for (let child of children) {
        child.remove();
    }

    // Also remove any static welcome message we might have duplicated
    const welcomeMsgDiv = chatMessagesDiv.querySelector('.welcome-message');
    if (welcomeMsgDiv) welcomeMsgDiv.remove();

    // Si no hay mensajes, mostrar bienvenida
    if (conversation.length === 0) {
        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'welcome-message';
        welcomeDiv.innerText = '🤖 ¡Hola! Soy tu asesor de ventas. Pregúntame sobre cursos de Python, JavaScript, desarrollo web, ciencia de datos y más. Estoy aquí para ayudarte a encontrar el curso ideal.';
        chatMessagesDiv.appendChild(welcomeDiv);
    } else {
        // Dibujar cada mensaje
        conversation.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${msg.role}`;

            const avatarSpan = document.createElement('div');
            avatarSpan.className = 'message-avatar';
            avatarSpan.innerText = msg.role === 'user' ? '👤' : '🤖';

            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            contentDiv.innerText = msg.content;

            messageDiv.appendChild(avatarSpan);
            messageDiv.appendChild(contentDiv);
            chatMessagesDiv.appendChild(messageDiv);
        });
    }

    // Scroll al final
    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
}

// Agregar un mensaje al historial y renderizar
function addMessage(role, content) {
    conversation.push({ role, content });
    saveHistory();
    renderMessages();
}

// Enviar mensaje del usuario y obtener respuesta
async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    // Deshabilitar botón y mostrar estado
    sendBtn.disabled = true;
    statusIndicator.innerText = 'Enviando mensaje...';
    userInput.disabled = true;

    // Agregar mensaje de usuario al historial local
    addMessage('user', text);
    userInput.value = '';
    userInput.style.height = 'auto';

    // Preparamos el historial completo para enviar a la API
    // La API espera el array de mensajes con roles 'user' y 'assistant'
    // Aseguramos que la conversación actual tiene el formato correcto.

    // Mostrar indicador de "escribiendo"
    const tempTypingId = showTypingIndicator();

    try {
        const payload = {
            messages: conversation  // ya contiene user y assistant
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const assistantReply = data.respuesta;

        // Eliminar indicador de escritura antes de agregar respuesta
        removeTypingIndicator(tempTypingId);

        // Agregar respuesta del asistente al historial y renderizar
        addMessage('assistant', assistantReply);

        statusIndicator.innerText = 'Listo';

    } catch (error) {
        console.error('Error al llamar a la API:', error);
        statusIndicator.innerText = `Error: ${error.message}`;
        removeTypingIndicator(tempTypingId);
        // Opcional: mostrar mensaje de error en el chat
        addMessage('assistant', '⚠️ Lo siento, hubo un problema al comunicarme con el servidor. Inténtalo de nuevo más tarde.');
    } finally {
        sendBtn.disabled = false;
        userInput.disabled = false;
        userInput.focus();
        // Reset status after a delay
        setTimeout(() => {
            if (statusIndicator.innerText !== 'Listo') return;
            statusIndicator.innerText = '';
        }, 2000);
    }
}

// Mostrar un "..." animado como indicador de que el asistente está escribiendo
let typingElement = null;
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant typing-indicator';
    typingDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            <div class="dots">
                <span>.</span><span>.</span><span>.</span>
            </div>
        </div>
    `;
    chatMessagesDiv.appendChild(typingDiv);
    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
    return typingDiv;
}

function removeTypingIndicator(element) {
    if (element && element.parentNode) element.parentNode.removeChild(element);
}

// Limpiar historial (borrar localStorage y resetear conversation)
function clearHistory() {
    if (confirm('¿Estás seguro de que quieres eliminar todo el historial de la conversación?')) {
        conversation = [];
        saveHistory();
        renderMessages();
        statusIndicator.innerText = 'Historial limpiado';
        setTimeout(() => { if (statusIndicator.innerText === 'Historial limpiado') statusIndicator.innerText = ''; }, 2000);
    }
}

// Ajustar altura del textarea automáticamente
function autoResizeTextarea() {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
}

// Event listeners
sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});
userInput.addEventListener('input', autoResizeTextarea);
clearHistoryBtn.addEventListener('click', clearHistory);

// Inicializar
loadHistory();
renderMessages();
userInput.focus();
// Añadir estilos para el indicador de escritura (añadir al CSS con JS o ponerlo directamente en styles.css)
// Para asegurar que se vean los puntos, añadimos una regla CSS dinámica o lo incluimos en el CSS original.
// Inyectamos estilos complementarios para los puntos animados.
const style = document.createElement('style');
style.textContent = `
    .typing-indicator .message-content {
        background: #eef2ff;
        padding: 12px 20px;
        min-width: 60px;
    }
    .dots span {
        animation: blink 1.4s infinite;
        font-size: 1.4rem;
        margin: 0 2px;
    }
    .dots span:nth-child(2) { animation-delay: 0.2s; }
    .dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes blink {
        0%, 60%, 100% { opacity: 0.2; }
        30% { opacity: 1; }
    }
`;
document.head.appendChild(style);