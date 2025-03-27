document.addEventListener('DOMContentLoaded', function() {
    const socket = io({
        transports: ['websocket', 'polling'],  // Add polling as fallback
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        autoConnect: true,
        path: '/socket.io'
    });
    const roomCode = document.getElementById('roomCode').value;
    const userName = document.getElementById('userName').value;
    const messages = document.getElementById('messages');
    const messageInput = document.getElementById('messageInput');
    const connectedUsers = document.getElementById('connectedUsers');
    const chatPanel = document.getElementById('chatPanel');
    const toggleChat = document.getElementById('toggleChat');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const editorContainer = document.getElementById('editorContainer');

    document.getElementById('toggleDarkMode').addEventListener('click', function() { // ToDo: Fix this
        document.body.classList.toggle('dark');
    });

    // Initialize TinyMCE editor
    tinymce.init({
        selector: '#editor',
        plugins: 'link code wordcount autosave',
        toolbar: 'undo redo | formatselect | bold italic | alignleft aligncenter alignright | code',
        height: '100%',
        skin: document.documentElement.classList.contains('dark') ? 'oxide-dark' : 'oxide',
        content_css: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
        content_style: `
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                font-size: 16px;
                line-height: 1.6;
                padding: 1rem;
            }
            body.dark { 
                background-color: #1f2937;
                color: #e5e7eb;
            }
        `,
        setup: function(editor) {
            editor.on('input', function() {
                socket.emit('editor_update', { content: editor.getContent() });
            });
        }
    });

    // Socket event handlers
    socket.on('connect', () => {
        console.log('Connected to server');
        socket.emit('join', { room: roomCode, name: userName });
    });

    socket.on('user_joined', (data) => {
        updateConnectedUsers(data.users, userName);
        document.getElementById('userCount').textContent = data.users.length;
        addMessage({
            name: 'System',
            message: `${data.name} joined the room`,
        });
    });

    socket.on('user_left', (data) => {
        updateConnectedUsers(data.users, userName);
        document.getElementById('userCount').textContent = data.users.length;
        addMessage({
            name: 'System',
            message: `${data.name} left the room`,
        });
    });

    socket.on('message', (data) => {
        addMessage(data);
    });

    socket.on('editor_update', (data) => {
        const editor = tinymce.get('editor');
        if (editor && editor.getContent() !== data.content) {
            editor.setContent(data.content);
        }
    });

    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        addMessage({
            name: 'System',
            message: 'Connection error. Please refresh the page.'
        });
    });

    socket.on('disconnect', (reason) => {
        console.log('Disconnected:', reason);
        addMessage({
            name: 'System',
            message: 'Disconnected from server. Attempting to reconnect...'
        });
    });

    socket.on('reconnect', (attemptNumber) => {
        console.log('Reconnected after', attemptNumber, 'attempts');
        addMessage({
            name: 'System',
            message: 'Successfully reconnected to server!'
        });
        
        // Rejoin the room after reconnection
        const roomCode = document.getElementById('roomCode').value;
        const userName = document.getElementById('userName').value;
        socket.emit('join', { room: roomCode, name: userName });
    });

    socket.on('error', (error) => {
        console.error('Socket error:', error);
        addMessage({
            name: 'System',
            message: 'An error occurred. Please try reconnecting.'
        });
    });

    function updateConnectedUsers(users, currentUserName) {
        const userColors = {};
        
        users.forEach(user => {
            if (!userColors[user]) {
                const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22'];
                const usedColors = Object.values(userColors);
                const availableColors = colors.filter(color => !usedColors.includes(color));
                userColors[user] = availableColors.length > 0 ? 
                    availableColors[0] : 
                    colors[Math.floor(Math.random() * colors.length)];
            }
        });

        connectedUsers.innerHTML = users.map(user => `
            <div class="flex items-center p-2 rounded-lg transition-colors mb-1.5 hover:bg-opacity-40" 
                 style="background-color: ${adjustColorOpacity(userColors[user], user === currentUserName ? 0.3 : 0.2)}">
                
                <!-- User Avatar -->
                <div class="flex-shrink-0 mr-2">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center relative" 
                         style="background-color: ${userColors[user]}">
                        <span class="text-white font-bold text-sm">
                            ${user.charAt(0).toUpperCase()}
                        </span>
                        <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-gray-800 rounded-full"></span>
                    </div>
                </div>
                
                <!-- User Info -->
                <div class="flex-1 min-w-0 flex flex-col justify-center">
                    <div class="flex items-center gap-1.5">
                        <p class="text-white text-sm font-medium truncate max-w-[100px]">
                            ${user}
                        </p>
                        ${user === currentUserName ? 
                            '<span class="flex-shrink-0 bg-green-400 text-[10px] px-1.5 py-0.5 rounded-full text-gray-800 font-medium">You</span>' : 
                            ''}
                    </div>
                    <p class="text-gray-400 text-[11px] leading-none mt-0.5">
                        ${user === currentUserName ? 'Active now' : 'Member'}
                    </p>
                </div>
            </div>
        `).join('');
    }

    // Helper function to adjust color opacity
    function adjustColorOpacity(hex, opacity) {
        // Convert hex to RGB
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    function addMessage(data) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `p-2 bg-white dark:bg-gray-600 rounded-md shadow-sm ${data.name === userName ? 'text-right' : ''}`;
        
        if (data.name === 'System') {
            // Custom styling for system messages
            messageDiv.innerHTML = `
                <div class="text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
                    ${data.message}
                </div>
            `;
        } else {
            // Regular message styling
            const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            messageDiv.innerHTML = `
                <div class="flex justify-between items-center mb-1">
                    <span class="font-semibold text-gray-700 dark:text-gray-200">${data.name}</span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">${timestamp}</span>
                </div>
                <div class="text-gray-700 dark:text-gray-300">${data.message}</div>
            `;
        }

        messages.appendChild(messageDiv);
        messages.scrollTop = messages.scrollHeight;
    }

    function sendMessage() {
        const message = messageInput.value.trim();
        if (message) {
            socket.emit('message', { message: message });
            messageInput.value = '';
        }
    }

    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    });

    sendMessageBtn.addEventListener('click', function() {
        sendMessage();
    });

    toggleChat.addEventListener('click', function() {
        chatPanel.classList.toggle('hidden');
        editorContainer.classList.toggle('flex-1');
        editorContainer.classList.toggle('w-full');
    });

    // Download as TXT or DOC
    window.downloadContent = function(format) {
        const editor = tinymce.get('editor');
        const content = editor.getContent();
        let blob;
        let filename;

        if (format === 'txt') {
            // Strip HTML tags for TXT format
            const textContent = content.replace(/<[^>]*>/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
            blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
            filename = `document_${new Date().toISOString().slice(0,10)}.txt`;
        } else if (format === 'doc') {
            // Create a simple HTML document for DOC format
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Document</title>
                </head>
                <body>
                    ${content}
                </body>
                </html>
            `;
            blob = new Blob([htmlContent], { type: 'application/msword' });
            filename = `document_${new Date().toISOString().slice(0,10)}.doc`;
        }

        // Create download link and trigger download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        // Show success message
        addMessage({
            name: 'System',
            message: `Document downloaded as ${format.toUpperCase()}`
        });
    };
});