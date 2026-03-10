require('dotenv').config();

const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const adminKey = process.env.ADMIN_KEY;
const port = process.env.PORT || 3000; 
const sessionSecret = process.env.SESSION_SECRET
const multer = require('multer');
const fs = require('fs');
const uploadDir = path.join(__dirname, 'public', 'uploads');

app.set('trust proxy', true);

// This tells the server how to read the form data sent by the player
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const sqlite3 = require('sqlite3').verbose();

console.log("==========================================");
console.log("SERVER BOOT SEQUENCE INITIATED");
console.log(`TIMESTAMP: ${new Date().toISOString()}`);
console.log(`PORT: ${process.env.PORT || 3000}`);
console.log("==========================================");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
// Tell multer how to name the files so they don't overwrite each other
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Creates a unique name like: task-1709948271.png
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'task-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });


// Looks for Cloudflare's connecting IP, otherwise falls back to standard IP
app.use((req, res, next) => {
    const realIP = req.headers['cf-connecting-ip'] || req.ip;
    console.log(`[TRAFFIC] ${req.method} ${req.path} | IP: ${realIP}`);
    next(); 
});

//Initialize the database
const dbPath = path.join(__dirname, 'ctf_database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("!!! DB ERROR:", err.message);
    } else {
        console.log(">>> [DATABASE] Connected at:", dbPath);
    }
});

// Create the 'players and tasks' table if it doesn't exist
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        score INTEGER DEFAULT 0,
        found_flags TEXT DEFAULT ''
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        description TEXT,
        estimated_time TEXT,
        image_url TEXT
    )`);
});

// Main screen / Check to see if its under maintenance
app.use((req, res, next) => {
    // Change 'true' to 'false' when ready210
    const isUnderConstruction = true; 
    res.setHeader('ngrok-skip-browser-warning', 'true'); 
    const palette = {
        bg: '#1a102a',      
        text: '#ffb74d',    
        accent: '#e066a3',  
    };

    if (isUnderConstruction && req.query.admin !== process.env.ADMIN_KEY && !req.path.startsWith('/leaderboard') && !req.path.startsWith('/api/scores')) {
       res.sendFile(path.join(__dirname, 'views', 'wip.html'));
    } else  {
        next(); 
    }
});


// Cookies
app.use(session({
    secret: sessionSecret, 
    resave: false,
    saveUninitialized: false
}));

// Needed login to go through
function requireLogin(req, res, next) {
    if (req.session && req.session.userId) {
        next(); // They are logged in, let them through
    } else {
        if (req.query.admin) {
            res.redirect(`/login?admin=${req.query.admin}`);
        } else {
            res.redirect('/login'); 
        }
    }
}

// MAIN ENTRANCE
app.get('/', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});
// Tasks / Main menu
app.get('/Tasks', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

//Registration menu
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'registration.html'));
});

app.post('/register', (req, res) => {
    const { username, password } = req.body; 
    const sql = `INSERT INTO players (username, password) VALUES (?, ?)`;
    
    db.run(sql, [username, password], function(err) {
        if (err) {
            return res.send(`<h1 style="color:red; text-align:center;">Username taken! Hit back.</h1>`);
        }
        res.redirect(`/login?admin=${process.env.ADMIN_KEY}`); 
    });
});

app.get('/login', (req, res) => {
    // CRITICAL FIX: Repaired broken comma syntax
    res.sendFile(path.join(__dirname, 'views', 'login.html')); 
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    const sql = `SELECT * FROM players WHERE username = ? AND password = ?`;
    db.get(sql, [username, password], (err, user) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Server error");
        }
        if (user) {
            req.session.userId = user.id;
            req.session.username = user.username;
            res.redirect(`/`); 
        } else {
            res.send(`<h1 style="color:red; text-align:center;">Invalid username or password!</h1>`);
        }
    });
});

// Secret route to see all players
app.get('/master-list', (req, res) => {
    if (req.query.admin !== process.env.ADMIN_KEY) {
        return res.status(403).send("Access Denied.");
    }

    db.all("SELECT id, username, score FROM players", [], (err, rows) => {
        if (err) return res.status(500).send(err.message);
        
        let html = '<body style="background:#1a102a; color:#ffb74d; font-family:monospace;">';
        html += '<h1>REGISTERED ENTITIES</h1><table border="1" cellpadding="10">';
        html += '<tr><th>ID</th><th>Username</th><th>Score</th></tr>';
        
        rows.forEach(row => {
            html += `<tr><td>${row.id}</td><td>${row.username}</td><td>${row.score}</td></tr>`;
        });
        
        html += '</table></body>';
        res.send(html);
    });
});

// THE FIXED CODE
app.get('/leaderboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'leaderboard.html'));
});

app.get('/api/scores', (req, res) => {
    const sql = `SELECT username, score FROM players ORDER BY score DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows); 
    });
});

// Remote game control for time
let gameState = {
    isRunning: false,
    endTime: null,
    durationSeconds: 7200, // 2 hours
    unlockedTasks: 1 // Start with only 1 task available
};

app.get('/supersecretcyber-panel', (req, res) => {
    if (req.query.admin !== process.env.ADMIN_KEY) return res.status(403).send("Go away, bot!");
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// --- PLAYER API (How the dashboard gets the data) ---
app.get('/api/state', (req, res) => {
    // Calculate remaining time on the fly
    let timeRemaining = 0;
    if (gameState.isRunning && gameState.endTime) {
        timeRemaining = Math.max(0, Math.floor((gameState.endTime - Date.now()) / 1000));
    }
    
    res.json({
        timeRemaining: timeRemaining,
        isRunning: gameState.isRunning,
        unlockedTasks: gameState.unlockedTasks
    });
});

// --- ADMIN CONTROLS (Your remote control) ---
app.get('/supersecretcyber-panel/start-timer', (req, res) => {
    if (req.query.admin !== process.env.ADMIN_KEY) return res.status(403).send("Access Denied.");
    
    gameState.isRunning = true;
    // Set the end time to exactly 2 hours from THIS moment
    gameState.endTime = Date.now() + (gameState.durationSeconds * 1000); 
    res.send(`<h1>Timer Started! Ends at ${new Date(gameState.endTime).toLocaleTimeString()}</h1><a href="/?admin=${process.env.ADMIN_KEY}">Back to Game</a>`);
});

app.post('/supersecretcyber-panel/upload-task', upload.single('taskImage'), (req, res) => {
    // 1. Verify it's actually you
    if (req.body.adminKey !== process.env.ADMIN_KEY) {
        return res.status(403).send("Access Denied.");
    }

    // 2. Grab the text data from the form
    const { taskName, taskDesc, taskTime } = req.body;
    
    // 3. Figure out the URL for the image we just saved
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : '/task-placeholder.png';

    // 4. Save everything to the database
    const sql = `INSERT INTO tasks (name, description, estimated_time, image_url) VALUES (?, ?, ?, ?)`;
    db.run(sql, [taskName, taskDesc, taskTime, imageUrl], function(err) {
        if (err) {
            console.error("Database error while saving task:", err.message);
            return res.status(500).send("Failed to save task to database.");
        }
        
        console.log(`[SYSTEM] New task uploaded: ${taskName}`);
        res.status(200).send("Upload successful");
    });
});

app.listen(port, () => {
    console.log(`Your CTF server is running on port ${port}`);
});