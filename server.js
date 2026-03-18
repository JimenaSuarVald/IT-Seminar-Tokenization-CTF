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

    // Create the 'players and tasks' table if it doesn't exist

    // ... players table ...

    db.run(`CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        description TEXT,
        content TEXT,
        estimated_time TEXT,
        image_url TEXT,
        points INTEGER DEFAULT 100,
        flag TEXT
    )`);

    // --- NEW: Track when players open a task ---
    db.run(`CREATE TABLE IF NOT EXISTS player_timers (
        player_id INTEGER,
        task_id INTEGER,
        started_at INTEGER,
        completed_at INTEGER DEFAULT NULL,
        PRIMARY KEY (player_id, task_id)
    )`);

    // --- NEW: Documentation Table ---
    db.run(`CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        content TEXT,
        created_at INTEGER
    )`);
});

// Cookies
app.use(session({
    secret: sessionSecret, 
    resave: false,
    saveUninitialized: false
}));

// Main screen / Check to see if its under maintenance
app.use((req, res, next) => {
    // Change 'true' to 'false' when ready210
    const isUnderConstruction = false; 
    res.setHeader('ngrok-skip-browser-warning', 'true'); 
    const palette = {
        bg: '#1a102a',      
        text: '#ffb74d',    
        accent: '#e066a3',  
    };

    if (isUnderConstruction) {
       res.sendFile(path.join(__dirname, 'views', 'wip.html'));
    } else  {
        next(); 
    }
});

// ==========================================
// --- DOCUMENTATION SYSTEM ROUTES ---
// ==========================================

// 1. Serve the Index Page
app.get('/documentation', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'documentation.html'));
});

// 2. Serve the Reader Page
app.get('/documentation/read/:id', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'doc-view.html'));
});

// 3. Serve the Editor Page
app.get('/documentation/edit/:id', requireLogin, (req, res) => {
    if (req.query.admin !== process.env.ADMIN_KEY) return res.status(403).send("Admin only.");
    res.sendFile(path.join(__dirname, 'views', 'doc-edit.html'));
});

// 4. API: Get all documents for the index
app.get('/api/documents', requireLogin, (req, res) => {
    db.all("SELECT id, title FROM documents ORDER BY id ASC", [], (err, rows) => {
        if (err) return res.status(500).json([]);
        res.json(rows);
    });
});

// 5. API: Get a specific document
app.get('/api/document/:id', requireLogin, (req, res) => {
    db.get("SELECT * FROM documents WHERE id = ?", [req.params.id], (err, doc) => {
        if (err || !doc) return res.status(404).json({ error: "Not found" });
        res.json(doc);
    });
});

// 6. API: Save or Update a document
app.post('/api/document/save', express.json(), (req, res) => {
    if (req.query.admin !== process.env.ADMIN_KEY) return res.status(403).send("Denied");
    
    const { id, title, content } = req.body;
    
    if (id === 'new') {
        db.run("INSERT INTO documents (title, content, created_at) VALUES (?, ?, ?)", [title, content, Date.now()], function(err) {
            if (err) return res.status(500).json({ success: false });
            res.json({ success: true, newId: this.lastID });
        });
    } else {
        db.run("UPDATE documents SET title = ?, content = ? WHERE id = ?", [title, content, id], (err) => {
            if (err) return res.status(500).json({ success: false });
            res.json({ success: true, newId: id });
        });
    }
});

// 7. API: Delete a document
app.post('/api/document/delete/:id', (req, res) => {
    if (req.query.admin !== process.env.ADMIN_KEY) return res.status(403).send("Denied");
    db.run("DELETE FROM documents WHERE id = ?", [req.params.id], (err) => {
        res.json({ success: !err });
    });
});

// --- CREDITS PAGE ---
app.get('/credits', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'credits.html'));
});

app.get('/login', (req, res) => {
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

// Needed login to go through
function requireLogin(req, res, next) {
    // Let them through if they have a session OR if they have the admin key
    if ((req.session && req.session.userId) || req.query.admin === process.env.ADMIN_KEY) {
        next(); 
    } else {
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ error: "Session Expired" });
        }
        // Redirect to login, preserving the admin query if they mistyped it
        res.redirect('/login'); 
    }
}

// Tasks / Main menu
// CRITICAL FIX: Added requireLogin to stop unauthenticated users from seeing the dashboard
app.get('/', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});



// --- THE MISSING PLAYER VIEW ROUTE ---
app.get('/game/task/:name', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'task.html'));
});

app.get('/game/task/:name/edit', requireLogin, (req, res) => {
    // Strict backend check: If no admin key, block them completely.
    if (req.query.admin !== process.env.ADMIN_KEY) {
        return res.status(403).send("<h1>403 Forbidden</h1><p>Admin access required to edit tasks.</p>");
    }
    res.sendFile(path.join(__dirname, 'views', 'edit-task.html'));
});

// Serve the Profile Page
app.get('/profile', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'profile.html'));
});

app.get('/api/me', requireLogin, (req, res) => {
    // If testing as admin without a real session, return dummy data
    if (!req.session.userId) {
        return res.json({ username: "Admin Bypass", score: 9999, found_flags: "" });
    }
    
    // Otherwise, fetch the real player's data
    db.get("SELECT username, score, found_flags FROM players WHERE id = ?", [req.session.userId], (err, row) => {
        if (err || !row) return res.status(404).json({ error: "User not found" });
        res.json(row);
    });
});

// --- DASHBOARD API: GET ALL TASKS ---
app.get('/api/tasks', requireLogin, (req, res) => {
    db.all("SELECT id, name, description, estimated_time, image_url FROM tasks", [], (err, rows) => {
        if (err) {
            console.error("Dashboard Fetch Error:", err.message);
            return res.status(500).json([]);
        }
        // This sends the rows from SQLite back to your index.html
        res.json(rows);
    });
});

app.get('/api/task/:name', requireLogin, (req, res) => {
    const taskName = req.params.name;
    
    db.get("SELECT * FROM tasks WHERE name = ?", [taskName], (err, task) => {
        if (err) return res.status(500).json({ error: "Database error" });
        if (!task) return res.status(404).json({ error: "Task not found" });

        const isAdmin = req.query.admin === process.env.ADMIN_KEY;

        if (req.session.userId && !isAdmin) {
            db.get("SELECT started_at, completed_at FROM player_timers WHERE player_id = ? AND task_id = ?", [req.session.userId, task.id], (err, timer) => {
                let startedAt;
                
                if (!timer && !err) {
                    startedAt = Date.now();
                    db.run("INSERT INTO player_timers (player_id, task_id, started_at) VALUES (?, ?, ?)", [req.session.userId, task.id, startedAt]);
                } else {
                    startedAt = timer.started_at;
                }
                
                // NEW: If they finished, calculate elapsed time based on completion, not "now"
                const endTime = (timer && timer.completed_at) ? timer.completed_at : Date.now();
                task.elapsed_ms = endTime - startedAt;
                task.isCompleted = !!(timer && timer.completed_at); // Tell frontend if it's finished
                
                res.json(task);
            });
        
        } else {
            // If admin, just send the task with no timer data
            res.json(task);
        }
    });
});
// Add upload.single to handle the optional image change
app.post('/api/task/:name/edit', upload.single('taskImage'), (req, res) => {
    const oldTaskName = req.params.name;
    const { adminKey, name, description, content, estimated_time, points, flag, existingImageUrl } = req.body;

    if (adminKey !== process.env.ADMIN_KEY) return res.status(403).send("Denied.");

    // Determine which image URL to use
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : existingImageUrl;

    const sql = `UPDATE tasks SET name = ?, description = ?, content = ?, estimated_time = ?, points = ?, flag = ?, image_url = ? WHERE name = ?`;
    
    db.run(sql, [name, description, content, estimated_time, points, flag, imageUrl, oldTaskName], function(err) {
        if (err) return res.status(500).send(err.message);
        res.status(200).json({ newName: name });
    });
});

// --- NEW: Flag Submission Logic with Kahoot Scoring ---
app.post('/api/task/:name/submit', requireLogin, express.json(), (req, res) => {
    let currentRemaining = gameState.secondsLeft;
    if (gameState.isRunning && gameState.lastTick) {
        const elapsed = Math.floor((Date.now() - gameState.lastTick) / 1000);
        currentRemaining = Math.max(0, gameState.secondsLeft - elapsed);
    }

    // If the game is paused or out of time, reject the submission immediately
    if (!gameState.isRunning || currentRemaining <= 0) {
        return res.json({ success: false, message: "⛔ SUBMISSIONS LOCKED: The game clock is paused or time is up!" });
    }
    // ----------------------------------

    const taskName = req.params.name;
    const submittedFlag = req.body.flag;
    const userId = req.session.userId;

    db.get("SELECT id, flag, points FROM tasks WHERE name = ?", [taskName], (err, task) => {
        if (err || !task) return res.status(404).json({ error: "Task not found." });

        if (task.flag !== submittedFlag) {
            return res.json({ success: false, message: "❌ Incorrect flag. Try again!" });
        }

        db.get("SELECT score, found_flags FROM players WHERE id = ?", [userId], (err, player) => {
            if (err || !player) return res.status(500).json({ error: "Player data error." });

            const solvedTasks = player.found_flags ? player.found_flags.split(',') : [];
            if (solvedTasks.includes(task.id.toString())) {
                return res.json({ success: true, message: "⚠️ Flag correct, but you already claimed these points!" });
            }

            // --- POINT DECAY MATH ---
            db.get("SELECT started_at FROM player_timers WHERE player_id = ? AND task_id = ?", [userId, task.id], (err, timer) => {
                
                const startTime = timer ? timer.started_at : Date.now();
                const minutesTaken = Math.floor((Date.now() - startTime) / 60000);
                
                const pointsLostPerMinute = 2; // Lose 2 points every minute
                
                let earnedPoints = task.points - (minutesTaken * pointsLostPerMinute);
                earnedPoints = Math.max(10, earnedPoints); // Hard floor at 10 points

                // Save the new score
                solvedTasks.push(task.id);
                const newFlags = solvedTasks.join(',');
                const newScore = player.score + earnedPoints;

                db.run("UPDATE players SET score = ?, found_flags = ? WHERE id = ?", [newScore, newFlags, userId], (err) => {
                    if (err) return res.status(500).json({ error: "Failed to update score." });
                    
                    // NEW: Record the completion time in the timers table
                    db.run("UPDATE player_timers SET completed_at = ? WHERE player_id = ? AND task_id = ?", [Date.now(), userId, task.id]);

                    res.json({ 
                        success: true, 
                        message: `🎉 Flag Correct! You finished in ${minutesTaken} minutes and earned ${earnedPoints} points.` 
                    });
                
                });
            });
        });
    });
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
        res.redirect(`/login`); 
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
    secondsLeft: 7200, // Default to 2 hours, but updates instantly when you change it
    lastTick: null,    // Tracks the exact millisecond you press "Start"
    unlockedTasks: 1 
};

app.get('/supersecretcyber-panel', (req, res) => {
    if (req.query.admin !== process.env.ADMIN_KEY) return res.status(403).send("Go away, bot!");
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// --- PLAYER API (How the dashboard gets the data) ---
app.get('/api/state', (req, res) => {
    let currentRemaining = gameState.secondsLeft;

    // If running, subtract the seconds that have passed since we hit Start
    if (gameState.isRunning && gameState.lastTick) {
        const elapsed = Math.floor((Date.now() - gameState.lastTick) / 1000);
        currentRemaining = Math.max(0, gameState.secondsLeft - elapsed);
    }
    
    res.json({
        timeRemaining: currentRemaining,
        isRunning: gameState.isRunning,
        unlockedTasks: gameState.unlockedTasks
    });
});

// --- SET TIMER ON THE FLY ---
app.post('/supersecretcyber-panel/set-time', express.json(), (req, res) => {
    if (req.query.admin !== process.env.ADMIN_KEY) return res.status(403).send("Access Denied.");
    
    const newMinutes = parseInt(req.body.minutes);
    if (!isNaN(newMinutes)) {
        gameState.secondsLeft = newMinutes * 60; // Update the memory bank
        
        if (gameState.isRunning) {
            gameState.lastTick = Date.now(); // Reset the anchor if currently ticking
        }
        res.json({ success: true });
    } else {
        res.status(400).json({ success: false });
    }
});

// --- START / RESUME TIMER ---
app.get('/supersecretcyber-panel/start-timer', (req, res) => {
    if (req.query.admin !== process.env.ADMIN_KEY) return res.status(403).send("Access Denied.");
    
    if (!gameState.isRunning) {
        gameState.isRunning = true;
        gameState.lastTick = Date.now(); // Start counting from exactly right now
    }
    res.send(`<h1>Timer Resumed!</h1>`);
});

// --- STOP / PAUSE TIMER ---
app.get('/supersecretcyber-panel/stop-timer', (req, res) => {
    if (req.query.admin !== process.env.ADMIN_KEY) return res.status(403).send("Access Denied.");
    
    if (gameState.isRunning && gameState.lastTick) {
        // Calculate the exact time spent ticking and permanently subtract it
        const elapsed = Math.floor((Date.now() - gameState.lastTick) / 1000);
        gameState.secondsLeft = Math.max(0, gameState.secondsLeft - elapsed);
        
        gameState.isRunning = false;
        gameState.lastTick = null;
    }
    res.send(`<h1>Timer Paused!</h1>`);
});

app.post('/supersecretcyber-panel/upload-task', upload.single('taskImage'), (req, res) => {

    // 1. Get the key from the Form OR the URL (just in case)
    const providedKey = req.body.adminKey || req.query.admin;

    // DEBUG: This will show up in your 'pm2 logs'
    console.log(`[AUTH CHECK] Provided: "${providedKey}" | Expected: "${process.env.ADMIN_KEY}"`);

    if (providedKey !== process.env.ADMIN_KEY) {
        console.log("!!! REJECTED: Keys do not match.");
        return res.status(403).send("SHOO SHOO HACKER!.");
    }

    const { taskName, taskDesc, taskTime } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : '/task-placeholder.png';

    const sql = `INSERT INTO tasks (name, description, estimated_time, image_url) VALUES (?, ?, ?, ?)`;
    db.run(sql, [taskName, taskDesc, taskTime, imageUrl], function(err) {
        if (err) {
            console.error("DB Error:", err.message);
            return res.status(500).send("Database failure.");
        }
        console.log(`[SYSTEM] SUCCESS! Task "${taskName}" added to Database.`);
        res.status(200).send("Task saved successfully!");
    });
});

app.get('/supersecretcyber-panel/set-tasks', (req, res) => {
    if (req.query.admin !== process.env.ADMIN_KEY) return res.status(403).send("Access Denied.");
    
    // FIX: Properly check for numbers so 0 doesn't get rejected!
    let count = parseInt(req.query.count);
    if (isNaN(count)) count = 1; 
    gameState.unlockedTasks = count;
    
    // Give the admin a confirmation screen
    res.send(`
        <body style="background:#1a102a; color:#e066a3; font-family:monospace; text-align:center; padding-top:50px;">
            <h1>✔ TASKS UNLOCKED: ${count}</h1>
            <a href="/supersecretcyber-panel?admin=${process.env.ADMIN_KEY}" style="color:#ffb74d;">Return to Mission Control</a>
        </body>
    `);
});

// ==========================================
// --- NEW: PLAYER MANAGEMENT SYSTEM ---
// ==========================================

app.get('/supersecretcyber-panel/manage-players', (req, res) => {
    if (req.query.admin !== process.env.ADMIN_KEY) return res.status(403).send("Access Denied.");

    db.all("SELECT id, username, score FROM players", [], (err, rows) => {
        if (err) return res.status(500).send("Database error.");

        let html = `
        <body style="background:#1a102a; color:#ffb74d; font-family:monospace; padding: 40px; text-align: center;">
            <h1 style="color: #ffb74d; text-shadow: 0 0 10px #ffb74d;">👥 PLAYER MANAGER</h1>
            <a href="/supersecretcyber-panel?admin=${process.env.ADMIN_KEY}" style="color: #e066a3; text-decoration: none; border: 1px solid #e066a3; padding: 10px; border-radius: 5px; transition: 0.2s;">◄ Back to Mission Control</a>
            
            <table style="margin: 40px auto; border-collapse: collapse; width: 80%; background: rgba(0,0,0,0.3); box-shadow: 0 0 15px #ffb74d;">
                <tr style="background: #ffb74d; color: #1a102a;">
                    <th style="padding: 15px; border: 1px solid #444;">ID</th>
                    <th style="padding: 15px; border: 1px solid #444;">Username</th>
                    <th style="padding: 15px; border: 1px solid #444;">Score</th>
                    <th style="padding: 15px; border: 1px solid #444;">Actions</th>
                </tr>
        `;

        rows.forEach(player => {
            html += `
                <tr>
                    <td style="padding: 15px; border: 1px solid #444;">${player.id}</td>
                    <td style="padding: 15px; border: 1px solid #444; font-weight: bold;">${player.username}</td>
                    <td style="padding: 15px; border: 1px solid #444;">
                        <form action="/api/player/update" method="POST" style="margin:0; display:flex; justify-content:center; gap:10px;">
                            <input type="hidden" name="adminKey" value="${process.env.ADMIN_KEY}">
                            <input type="hidden" name="playerId" value="${player.id}">
                            <input type="number" name="score" value="${player.score}" style="width: 80px; padding: 5px; background: #110a1c; color: white; border: 1px solid #ffb74d; border-radius: 5px; text-align: center; font-family: monospace; font-size: 1.1em;">
                            <button type="submit" style="background:#4caf50; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:5px; font-weight:bold;">SAVE</button>
                        </form>
                    </td>
                    <td style="padding: 15px; border: 1px solid #444;">
                        <form action="/api/player/delete" method="POST" style="margin:0;">
                            <input type="hidden" name="adminKey" value="${process.env.ADMIN_KEY}">
                            <input type="hidden" name="playerId" value="${player.id}">
                            <button type="submit" style="background:#d32f2f; color:white; border:none; padding:8px 15px; cursor:pointer; border-radius:5px; font-weight:bold;" onclick="return confirm('WARNING: Are you sure you want to permanently delete this player?');">DELETE</button>
                        </form>
                    </td>
                </tr>
            `;
        });

        html += '</table></body>';
        res.send(html);
    });
});

app.post('/api/player/update', express.urlencoded({ extended: true }), (req, res) => {
    if (req.body.adminKey !== process.env.ADMIN_KEY) return res.status(403).send("Denied.");
    
    db.run("UPDATE players SET score = ? WHERE id = ?", [req.body.score, req.body.playerId], (err) => {
        if (err) return res.status(500).send("Error updating player.");
        res.redirect(`/supersecretcyber-panel/manage-players?admin=${process.env.ADMIN_KEY}`);
    });
});

app.post('/api/player/delete', express.urlencoded({ extended: true }), (req, res) => {
    if (req.body.adminKey !== process.env.ADMIN_KEY) return res.status(403).send("Denied.");
    
    db.run("DELETE FROM players WHERE id = ?", [req.body.playerId], (err) => {
        if (err) return res.status(500).send("Error deleting player.");
        res.redirect(`/supersecretcyber-panel/manage-players?admin=${process.env.ADMIN_KEY}`);
    });
});

// --- TASK MANAGER (Admin Menu View) ---
app.get('/supersecretcyber-panel/manage-tasks', (req, res) => {
    if (req.query.admin !== process.env.ADMIN_KEY) return res.status(403).send("Access Denied.");

    db.all("SELECT id, name, points, flag FROM tasks", [], (err, rows) => {
        if (err) return res.status(500).send("Database error.");

        let html = `
        <body style="background:#1a102a; color:#ffb74d; font-family:monospace; padding: 40px; text-align: center;">
            <h1 style="color: #e066a3; text-shadow: 0 0 10px #e066a3;">🗑️ TASK MANAGER</h1>
            <a href="/supersecretcyber-panel?admin=${process.env.ADMIN_KEY}" style="color: #ffb74d; text-decoration: none; border: 1px solid #ffb74d; padding: 10px; border-radius: 5px; transition: 0.2s;">◄ Back to Mission Control</a>
            
            <table style="margin: 40px auto; border-collapse: collapse; width: 80%; background: rgba(0,0,0,0.3); box-shadow: 0 0 15px #e066a3;">
                <tr style="background: #e066a3; color: white;">
                    <th style="padding: 15px; border: 1px solid #444;">ID</th>
                    <th style="padding: 15px; border: 1px solid #444;">Task Name</th>
                    <th style="padding: 15px; border: 1px solid #444;">Points</th>
                    <th style="padding: 15px; border: 1px solid #444;">Flag</th>
                    <th style="padding: 15px; border: 1px solid #444;">Actions</th>
                </tr>
        `;

        rows.forEach(task => {
            html += `
                <tr>
                    <td style="padding: 15px; border: 1px solid #444;">${task.id}</td>
                    <td style="padding: 15px; border: 1px solid #444;">
                        <a href="/game/task/${encodeURIComponent(task.name)}?admin=${process.env.ADMIN_KEY}" style="color:#ffb74d; font-weight:bold; text-decoration:none;">${task.name} 📝</a>
                    </td>
                    <td style="padding: 15px; border: 1px solid #444;">${task.points}</td>
                    <td style="padding: 15px; border: 1px solid #444; color: #4caf50;">${task.flag || "<em>Not set</em>"}</td>
                    <td style="padding: 15px; border: 1px solid #444;">
                        <form action="/api/task/delete" method="POST" style="margin:0;">
                            <input type="hidden" name="adminKey" value="${process.env.ADMIN_KEY}">
                            <input type="hidden" name="taskId" value="${task.id}">
                            <button type="submit" style="background:#d32f2f; color:white; border:none; padding:8px 15px; cursor:pointer; border-radius:5px; font-weight:bold; font-family:monospace;">DELETE</button>
                        </form>
                    </td>
                </tr>
            `;
        });

        html += '</table></body>';
        res.send(html);
    });
});

// --- DELETE TASK LOGIC ---
app.post('/api/task/delete', express.urlencoded({ extended: true }), (req, res) => {
    if (req.body.adminKey !== process.env.ADMIN_KEY) return res.status(403).send("Denied.");
    
    db.run("DELETE FROM tasks WHERE id = ?", [req.body.taskId], (err) => {
        if (err) return res.status(500).send("Error deleting task.");
        // Reload the task manager page after deletion
        res.redirect(`/supersecretcyber-panel/manage-tasks?admin=${process.env.ADMIN_KEY}`);
    });
});

app.listen(port, () => {
    console.log(`Your CTF server is running on port ${port}`);
});