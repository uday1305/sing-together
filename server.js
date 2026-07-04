const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 8000;
const SECRET_KEY = 'sing_together_super_secret_key';

app.use(express.json());
app.use(express.static(__dirname));

// --- DATABASE LAYER: MONGOOSE WITH LOCAL JSON FALLBACK ---
let isUsingMongo = false;
const JSON_DB_PATH = path.join(__dirname, 'db.json');

// Initialize JSON file DB if not exists
if (!fs.existsSync(JSON_DB_PATH)) {
  fs.writeFileSync(JSON_DB_PATH, JSON.stringify({ users: [] }, null, 2));
}

// User schema definition
const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true, lowercase: true },
  password: { type: String, required: true }
});
const MongoUser = mongoose.model('User', UserSchema);

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/singtogether';

// Mongoose connect
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Successfully connected to MongoDB.');
  isUsingMongo = true;
}).catch(err => {
  console.warn('\n======================================================');
  console.warn(`WARNING: MongoDB not found on ${MONGO_URI}.`);
  console.warn('Falling back to local file JSON database ("db.json") for testing.');
  console.warn('======================================================\n');
});

// Database Abstraction API
const db = {
  findUserByUsername: async (username) => {
    const queryName = username.toLowerCase();
    if (isUsingMongo) {
      return await MongoUser.findOne({ username: queryName });
    } else {
      const data = JSON.parse(fs.readFileSync(JSON_DB_PATH, 'utf8'));
      return data.users.find(u => u.username === queryName) || null;
    }
  },
  createUser: async (username, hashedPassword) => {
    const queryName = username.toLowerCase();
    if (isUsingMongo) {
      const user = new MongoUser({ username: queryName, password: hashedPassword });
      await user.save();
      return { id: user._id, username: user.username };
    } else {
      const data = JSON.parse(fs.readFileSync(JSON_DB_PATH, 'utf8'));
      const newUser = { id: 'usr_' + Math.random().toString(36).substr(2, 9), username: queryName, password: hashedPassword };
      data.users.push(newUser);
      fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2));
      return { id: newUser.id, username: newUser.username };
    }
  }
};

// --- AUTHENTICATION REST API ---
app.post('/api/auth/signup', async (appReq, appRes) => {
  try {
    const { username, password } = appReq.body;
    if (!username || !password) {
      return appRes.status(400).json({ error: 'Username and password are required.' });
    }
    if (username.length < 3 || password.length < 4) {
      return appRes.status(400).json({ error: 'Username (min 3 chars) and Password (min 4 chars) are too short.' });
    }

    const existingUser = await db.findUserByUsername(username);
    if (existingUser) {
      return appRes.status(400).json({ error: 'Username already taken.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const user = await db.createUser(username, hashedPassword);

    const token = jwt.sign({ userId: user.id, username: user.username }, SECRET_KEY, { expiresIn: '7d' });
    appRes.json({ token, username: user.username });
  } catch (err) {
    console.error('Signup error:', err);
    appRes.status(500).json({ error: 'Internal server error.' });
  }
});

app.post('/api/auth/login', async (appReq, appRes) => {
  try {
    const { username, password } = appReq.body;
    if (!username || !password) {
      return appRes.status(400).json({ error: 'Username and password are required.' });
    }

    const user = await db.findUserByUsername(username);
    if (!user) {
      return appRes.status(400).json({ error: 'Invalid username or password.' });
    }

    const validPass = bcrypt.compareSync(password, user.password);
    if (!validPass) {
      return appRes.status(400).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, SECRET_KEY, { expiresIn: '7d' });
    appRes.json({ token, username: user.username });
  } catch (err) {
    console.error('Login error:', err);
    appRes.status(500).json({ error: 'Internal server error.' });
  }
});

app.post('/api/auth/verify', (appReq, appRes) => {
  const authHeader = appReq.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return appRes.status(401).json({ error: 'Missing token.' });

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return appRes.status(403).json({ error: 'Invalid token.' });
    appRes.json({ username: decoded.username });
  });
});

// --- REAL-TIME LOBBY MATCHMAKING & SIGNALING OVER SOCKET.IO ---
let matchmakingQueue = []; // Array of socket objects looking for partner
let onlineUsers = {}; // Map of username -> socket.id
let privateRooms = {}; // Map of roomCode -> { host, hostSocket }

io.on('connection', (socket) => {
  let loggedInUser = null;
  console.log(`Socket connected: ${socket.id}`);

  // Register username on socket startup
  socket.on('register-user', (username) => {
    loggedInUser = username.toLowerCase();
    onlineUsers[loggedInUser] = socket.id;
    console.log(`User registered: ${loggedInUser} on socket ${socket.id}`);
  });

  // Create Private Room
  socket.on('create-private-room', () => {
    if (!loggedInUser) return;
    const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
    privateRooms[roomCode] = { host: loggedInUser, hostSocket: socket };
    socket.roomName = `private-${roomCode}`;
    socket.join(socket.roomName);
    
    socket.emit('private-room-created', roomCode);
    console.log(`Private room created: ${roomCode} by ${loggedInUser}`);
  });

  // Join Private Room
  socket.on('join-private-room', (roomCode) => {
    if (!loggedInUser) return;
    const room = privateRooms[roomCode];
    if (!room) {
      socket.emit('private-room-error', 'Room not found or expired.');
      return;
    }
    
    const partnerUser = room.host;
    const partnerSocket = room.hostSocket;
    const roomId = `private-${roomCode}`;
    
    socket.roomName = roomId;
    socket.join(roomId);
    
    // Role selection: Host is Host, Guest is Guest
    socket.emit('match-found', { room: roomId, partner: partnerUser, role: 'guest' });
    partnerSocket.emit('match-found', { room: roomId, partner: loggedInUser, role: 'host' });
    
    // Clean up private room record
    delete privateRooms[roomCode];
  });

  // Join matchmaking pool
  socket.on('join-matchmaking', () => {
    if (!loggedInUser) return;
    
    // Check if user is already in queue
    if (matchmakingQueue.some(s => s.username === loggedInUser)) {
      return;
    }

    console.log(`User entering matchmaking queue: ${loggedInUser}`);

    // If another player is in the queue, pair them up!
    if (matchmakingQueue.length > 0) {
      const partnerSocket = matchmakingQueue.shift();
      const partnerUser = partnerSocket.username;
      
      const roomId = `room-${loggedInUser}-${partnerUser}-${Math.floor(1000 + Math.random() * 9000)}`;

      console.log(`MATCH FOUND: ${loggedInUser} matched with ${partnerUser}. Room: ${roomId}`);

      // Put both sockets in the Socket.io room
      socket.join(roomId);
      partnerSocket.socket.join(roomId);

      // Save room reference inside socket sessions
      socket.roomName = roomId;
      partnerSocket.socket.roomName = roomId;

      // Emit match event
      // Role selection: User A is Host, User B is Guest
      socket.emit('match-found', { room: roomId, partner: partnerUser, role: 'host' });
      partnerSocket.socket.emit('match-found', { room: roomId, partner: loggedInUser, role: 'guest' });
    } else {
      // Add to matchmaking queue
      matchmakingQueue.push({ username: loggedInUser, socket: socket });
    }
  });

  // WebRTC Signal Forwarding
  socket.on('signal', (data) => {
    // Relays offers, answers, and ICE candidates directly to the room
    if (socket.roomName) {
      socket.to(socket.roomName).emit('signal', data);
    }
  });

  // Cancel Matchmaking
  socket.on('cancel-matchmaking', () => {
    if (loggedInUser) {
      console.log(`User cancelled matchmaking: ${loggedInUser}`);
      matchmakingQueue = matchmakingQueue.filter(s => s.username !== loggedInUser);
    }
  });

  // Disconnection cleanup
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    if (loggedInUser) {
      matchmakingQueue = matchmakingQueue.filter(s => s.username !== loggedInUser);
      delete onlineUsers[loggedInUser];
    }
    
    // Notify room if active
    if (socket.roomName) {
      socket.to(socket.roomName).emit('partner-left');
      socket.leave(socket.roomName);
    }
  });
});

// Start Express server
server.listen(PORT, () => {
  console.log(`======================================================`);
  console.log(`Sing Together Server running on http://localhost:${PORT}`);
  console.log(`======================================================`);
});
