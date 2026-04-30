// chat-widget.js - Botón flotante + ventana de chat conectada a API Gemini (asistente de ventas)

(function() {
  // Configuración
  const API_URL = 'https://chatbot.discoduro.app/chat';
  const STORAGE_KEY = 'chat_widget_conversation';
  const WELCOME_MESSAGE = '🤖 ¡Hola! Soy tu asesor de ventas de cursos de programación. ¿En qué puedo ayudarte hoy?';

  // Estilos del widget (se inyectan automáticamente)
  const styles = `
    .chat-widget-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      background-color: #2c3e66;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      z-index: 9999;
      font-size: 28px;
      color: white;
      border: none;
      outline: none;
    }
    .chat-widget-btn:hover {
      transform: scale(1.05);
      background-color: #1e2a4a;
    }
    .chat-widget-container {
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 380px;
      max-width: calc(100vw - 40px);
      height: 550px;
      max-height: calc(100vh - 120px);
      background: white;
      border-radius: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 9998;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      transition: all 0.2s ease;
      border: 1px solid #e2e8f0;
    }
    .chat-widget-header {
      background: #2c3e66;
      color: white;
      padding: 15px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: bold;
    }
    .chat-widget-header h3 {
      margin: 0;
      font-size: 1.1rem;
    }
    .chat-widget-close {
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      opacity: 0.8;
    }
    .chat-widget-close:hover {
      opacity: 1;
    }
    .chat-widget-messages {
      flex: 1;
      overflow-y: auto;
      padding: 15px;
      background: #f8f9ff;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .chat-widget-message {
      display: flex;
      animation: fadeInWidget 0.2s ease;
    }
    .chat-widget-message.user {
      justify-content: flex-end;
    }
    .chat-widget-message.assistant {
      justify-content: flex-start;
    }
    .chat-widget-bubble {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 18px;
      font-size: 0.9rem;
      line-height: 1.4;
      word-wrap: break-word;
      white-space: pre-wrap;
    }
    .user .chat-widget-bubble {
      background: #2c3e66;
      color: white;
      border-bottom-right-radius: 4px;
    }
    .assistant .chat-widget-bubble {
      background: white;
      color: #1e2a3a;
      border: 1px solid #ddd;
      border-bottom-left-radius: 4px;
    }
    .chat-widget-input-area {
      padding: 12px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      gap: 10px;
      background: white;
    }
    .chat-widget-input {
      flex: 1;
      padding: 10px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 24px;
      font-family: inherit;
      font-size: 0.9rem;
      resize: none;
      outline: none;
    }
    .chat-widget-input:focus {
      border-color: #2c3e66;
    }
    .chat-widget-send {
      background: #2c3e66;
      color: white;
      border: none;
      border-radius: 50%;
      width: 38px;
      height: 38px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }
    .chat-widget-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .chat-widget-typing {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 8px 14px;
      background: #eef2ff;
      border-radius: 18px;
      width: fit-content;
      margin-bottom: 8px;
    }
    .chat-widget-typing span {
      width: 6px;
      height: 6px;
      background: #2c3e66;
      border-radius: 50%;
      display: inline-block;
      animation: blinkWidget 1.4s infinite;
    }
    .chat-widget-typing span:nth-child(2) { animation-delay: 0.2s; }
    .chat-widget-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes fadeInWidget {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes blinkWidget {
      0%, 60%, 100% { opacity: 0.2; }
      30% { opacity: 1; }
    }
    .chat-widget-status {
      font-size: 0.7rem;
      text-align: center;
      padding: 5px;
      background: #f1f5f9;
      color: #555;
    }
    @media (max-width: 480px) {
      .chat-widget-container {
        width: calc(100vw - 20px);
        right: 10px;
        bottom: 80px;
        height: calc(100vh - 100px);
      }
    }
  `;

  // Inyectar estilos
  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  // Variables de estado
  let conversation = [];
  let isWidgetOpen = false;
  let widgetContainer = null;
  let messagesDiv = null;
  let inputField = null;
  let sendButton = null;
  let statusDiv = null;
  let typingElement = null;

  // Cargar historial desde localStorage
  function loadHistory() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        conversation = JSON.parse(saved);
        if (!Array.isArray(conversation)) conversation = [];
      } catch(e) { conversation = []; }
    }
  }

  // Guardar historial
  function saveHistory() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversation));
  }

  // Agregar mensaje al historial y guardar
  function addMessage(role, content) {
    conversation.push({ role, content });
    saveHistory();
  }

  // Renderizar todos los mensajes en el contenedor
  function renderMessages() {
    if (!messagesDiv) return;
    messagesDiv.innerHTML = '';
    if (conversation.length === 0) {
      const welcomeDiv = document.createElement('div');
      welcomeDiv.className = 'chat-widget-message assistant';
      welcomeDiv.innerHTML = `<div class="chat-widget-bubble">${WELCOME_MESSAGE}</div>`;
      messagesDiv.appendChild(welcomeDiv);
    } else {
      conversation.forEach(msg => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-widget-message ${msg.role}`;
        msgDiv.innerHTML = `<div class="chat-widget-bubble">${escapeHtml(msg.content)}</div>`;
        messagesDiv.appendChild(msgDiv);
      });
    }
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  // Mostrar indicador de escritura
  function showTyping() {
    if (typingElement) return;
    typingElement = document.createElement('div');
    typingElement.className = 'chat-widget-message assistant';
    typingElement.innerHTML = `<div class="chat-widget-typing"><span></span><span></span><span></span></div>`;
    messagesDiv.appendChild(typingElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  function hideTyping() {
    if (typingElement) {
      typingElement.remove();
      typingElement = null;
    }
  }

  // Enviar mensaje a la API
  async function sendMessageToAPI() {
    const text = inputField.value.trim();
    if (!text) return;
    
    // Deshabilitar UI
    sendButton.disabled = true;
    inputField.disabled = true;
    if (statusDiv) statusDiv.innerText = 'Enviando...';
    
    // Agregar mensaje de usuario
    addMessage('user', text);
    renderMessages();
    inputField.value = '';
    inputField.style.height = 'auto';
    
    // Mostrar typing
    showTyping();
    
    try {
      const payload = { messages: conversation };
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const reply = data.respuesta || 'Lo siento, no pude generar una respuesta.';
      
      hideTyping();
      addMessage('assistant', reply);
      renderMessages();
      if (statusDiv) statusDiv.innerText = '';
    } catch (error) {
      console.error('Error en API:', error);
      hideTyping();
      addMessage('assistant', '⚠️ Error de conexión. Intenta de nuevo más tarde.');
      renderMessages();
      if (statusDiv) statusDiv.innerText = 'Error de red';
      setTimeout(() => { if(statusDiv) statusDiv.innerText = ''; }, 3000);
    } finally {
      sendButton.disabled = false;
      inputField.disabled = false;
      inputField.focus();
    }
  }

  // Helper: escapar HTML
  function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function(c) {
      return c;
    });
  }

  // Crear la ventana del widget
  function createWidget() {
    if (widgetContainer) return;
    
    widgetContainer = document.createElement('div');
    widgetContainer.className = 'chat-widget-container';
    widgetContainer.style.display = 'none';
    
    // Header
    const header = document.createElement('div');
    header.className = 'chat-widget-header';
    header.innerHTML = '<h3>🎓 Asistente de Cursos</h3><button class="chat-widget-close">✕</button>';
    header.querySelector('.chat-widget-close').addEventListener('click', toggleWidget);
    
    // Messages area
    messagesDiv = document.createElement('div');
    messagesDiv.className = 'chat-widget-messages';
    
    // Input area
    const inputArea = document.createElement('div');
    inputArea.className = 'chat-widget-input-area';
    inputField = document.createElement('textarea');
    inputField.className = 'chat-widget-input';
    inputField.placeholder = 'Escribe tu mensaje...';
    inputField.rows = 1;
    inputField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessageToAPI();
      }
    });
    inputField.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 80) + 'px';
    });
    sendButton = document.createElement('button');
    sendButton.className = 'chat-widget-send';
    sendButton.innerHTML = '➤';
    sendButton.addEventListener('click', sendMessageToAPI);
    inputArea.appendChild(inputField);
    inputArea.appendChild(sendButton);
    
    // Status
    statusDiv = document.createElement('div');
    statusDiv.className = 'chat-widget-status';
    
    widgetContainer.appendChild(header);
    widgetContainer.appendChild(messagesDiv);
    widgetContainer.appendChild(inputArea);
    widgetContainer.appendChild(statusDiv);
    
    document.body.appendChild(widgetContainer);
    
    // Cargar historial y renderizar
    loadHistory();
    renderMessages();
  }
  
  // Alternar apertura/cierre del widget
  function toggleWidget() {
    isWidgetOpen = !isWidgetOpen;
    if (!widgetContainer) createWidget();
    widgetContainer.style.display = isWidgetOpen ? 'flex' : 'none';
    if (isWidgetOpen) {
      inputField.focus();
      renderMessages(); // refrescar por si cambió
    }
  }
  
  // Crear botón flotante
  function createFloatingButton() {
    const btn = document.createElement('button');
    btn.className = 'chat-widget-btn';
    btn.innerHTML = '💬';
    btn.addEventListener('click', toggleWidget);
    document.body.appendChild(btn);
  }
  
  // Inicializar todo cuando el DOM esté listo
  function init() {
    createFloatingButton();
    createWidget(); // pre-crea pero oculto
    widgetContainer.style.display = 'none';
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();