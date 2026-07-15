import { io } from 'socket.io-client';

// Pass token via command line: node test-messaging.js <JWT_TOKEN>
const token = process.argv[2];
if (!token) {
  console.error('Please provide a JWT token as an argument: node test-messaging.js <TOKEN>');
  process.exit(1);
}

const socket = io('http://localhost:3000', {
  auth: { token },
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server with ID:', socket.id);

  // Join a conversation
  console.log('Joining conversation cmrhvv0zc0002bufxl27ptkm9...');
  socket.emit('conversation:join', { conversationId: 'cmrhvv0zc0002bufxl27ptkm9' });

  // Send a test message
  setTimeout(() => {
    console.log('Sending message...');
    socket.emit('message:send', {
      conversationId: 'cmrhvv0zc0002bufxl27ptkm9',
      content: 'Hello from WebSocket test script!',
    });
  }, 1000);
});

socket.on('message:new', (data) => {
  console.log('📩 Received new message:', data);
  socket.disconnect();
});

socket.on('error', (err) => {
  console.error('❌ WebSocket error:', err);
});

socket.on('connect_error', (err) => {
  console.error('❌ Connection error:', err.message);
  process.exit(1);
});

setTimeout(() => {
  console.log('Timeout reached. Disconnecting.');
  socket.disconnect();
  process.exit(0);
}, 5000);
