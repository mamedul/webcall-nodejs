const PORT = 3000;
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path'); // Import the path module

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

wss.on('connection', ws => {
  console.log('Client connected');

  ws.on('message', message => {
    // Broadcast incoming messages to all clients
    wss.clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

server.listen(PORT, () => {
  console.log('Server is running on port ' + PORT );
});
