const express = require('express');
const app = express();
const port = 3000;
// This tells the server how to read the form data sent by the player
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const sqlite3 = require('sqlite3').verbose();

// Create or open the database file
const db = new sqlite3.Database('./ctf_database.sqlite', (err) => {
    if (err) {
        console.error("Database opening error: ", err.message);
    } else {
        console.log("Connected to the SQLite database.");
    }
});

// Create the 'players' table if it doesn't exist
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        score INTEGER DEFAULT 0,
        found_flags TEXT DEFAULT ''
    )`);
});

app.use((req, res, next) => {
    // Change 'true' to 'false' when you are ready to launch!
    const isUnderConstruction = true; 
    res.setHeader('ngrok-skip-browser-warning', 'true'); // This kills the annoying ngrok popup!
    const palette = {
        bg: '#1a102a',      // Deep purple shadow
        text: '#ffb74d',    // Warm orange/sunset glow
        accent: '#e066a3',  // Purple-pink accent
    };

    if (isUnderConstruction && req.query.admin !== 'jillian') {
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>CTF Systems Reinforcing</title>
                <style>
                    body {
                        background-color: ${palette.bg};
                        color: ${palette.text};
                        font-family: 'Courier New', Courier, monospace;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        text-align: center;
                    }
                    h1 { font-size: 2.5em; margin-bottom: 10px; text-shadow: 0 0 10px ${palette.text}; }
                    p { font-size: 1.2em; max-width: 600px; line-height: 1.5; color: #fff; }
                    .hacker-gif {
                        width: 350px;
                        max-width: 80%;
                        border: 2px solid ${palette.text};
                        box-shadow: 0 0 15px ${palette.accent};
                        border-radius: 10px;
                        margin-bottom: 25px;
                    }
                    .hacker-font { color: ${palette.accent}; }
                </style>
            </head>
            <body>
                <img src="/jillWIP.gif" alt="System Admin Working" class="hacker-gif">
                
                <h1> ✩₊˚.⋆ WORK IN PROGRESS ⋆⁺₊✧</h1>
                <p>
                The <span class="hacker-font">Tokenization & Embeddings</span> team is currently working really hard on getting this site up and running!
                <br><br>
                Please be sure to come back later!
                <br><br>
                This one goes out to all the pigeons in the world.

                             <audio id="jill-radio" loop preload="auto">
                            <source src="/Wildlife.mp3" type="audio/mpeg">
                            </audio>

                            <div style="display: flex; flex-direction: column; align-items: center; gap: 12px; margin-bottom: 25px;">
                                <div id="music-btn" onclick="togglePlay()" 
                                    style="cursor: pointer; border: 2px solid ${palette.accent}; padding: 10px 20px; border-radius: 30px; color: ${palette.text}; box-shadow: 0 0 10px ${palette.accent}; font-weight: bold; transition: all 0.3s ease;">
                                    ▶ Play Track
                                </div>

                                <div style="display: flex; align-items: center; gap: 15px; width: 100%; justify-content: center;">
                                    <span id="timer">0:00 / 0:00</span>
                                    <input type="range" id="seek-bar" value="0" step="0.1">
                                </div>
                            </div>

                            <style>
                                #seek-bar {
                                    -webkit-appearance: none;
                                    appearance: none;
                                    width: 250px;
                                    height: 4px;
                                    background: #444;
                                    border-radius: 2px;
                                    outline: none;
                                    cursor: pointer;
                                    margin: 0;
                                    padding: 0;
                                }

                                #seek-bar::-webkit-slider-thumb {
                                    -webkit-appearance: none;
                                    appearance: none;
                                    width: 14px;
                                    height: 14px;
                                    border-radius: 50%;
                                    background: ${palette.text};
                                    border: 2px solid ${palette.bg};
                                    box-shadow: 0 0 8px ${palette.accent};
                                    cursor: pointer;
                                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                                }

                                #seek-bar::-webkit-slider-thumb:hover {
                                    transform: scale(1.2);
                                    box-shadow: 0 0 15px ${palette.accent};
                                }

                                #seek-bar::-moz-range-thumb {
                                    width: 14px;
                                    height: 14px;
                                    border-radius: 50%;
                                    background: ${palette.text};
                                    border: 2px solid ${palette.bg};
                                    box-shadow: 0 0 8px ${palette.accent};
                                    cursor: pointer;
                                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                                }

                                #seek-bar::-moz-range-thumb:hover {
                                    transform: scale(1.2);
                                    box-shadow: 0 0 15px ${palette.accent};
                                }

                                #timer {
                                    font-family: monospace;
                                    color: ${palette.text};
                                    min-width: 100px;
                                    text-align: right;
                                }
                            </style>

                            <script>
                                const audio = document.getElementById('jill-radio');
                                const btn = document.getElementById('music-btn');
                                const seekBar = document.getElementById('seek-bar');
                                const timer = document.getElementById('timer');

                                // Colors are already embedded from the server (palette)
                                const accentColor = '${palette.accent}';
                                const textColor = '${palette.text}';

                                // Helper: format seconds → MM:SS
                                function formatTime(seconds) {
                                    if (isNaN(seconds) || seconds < 0) return '0:00';
                                    const mins = Math.floor(seconds / 60);
                                    const secs = Math.floor(seconds % 60);
                                    return mins + ':' + (secs < 10 ? '0' + secs : secs);
                                }

                                // Update timer and seek bar position
                                function updateTimerAndSeek() {
                                    if (audio.duration && !isNaN(audio.duration)) {
                                        const current = formatTime(audio.currentTime);
                                        const total = formatTime(audio.duration);
                                        timer.textContent = current + ' / ' + total;
                                        
                                        const percent = (audio.currentTime / audio.duration) * 100;
                                        seekBar.value = percent;
                                    } else {
                                        timer.textContent = '0:00 / 0:00';
                                    }
                                }

                                // Play/Pause toggle
                                function togglePlay() {
                                    if (audio.paused) {
                                        audio.play();
                                        btn.innerHTML = '₊⊹˚♬ (▶) Playing... ♪⊹˚';
                                        btn.style.boxShadow = '0 0 25px ' + accentColor;
                                        btn.style.color = accentColor;
                                    } else {
                                        audio.pause();
                                        btn.innerHTML = '( ❚❚ ) Paused';
                                        btn.style.boxShadow = '0 0 10px ' + accentColor;
                                        btn.style.color = textColor;
                                    }
                                }

                                // Update while playing
                                audio.ontimeupdate = updateTimerAndSeek;

                                // When metadata (duration) is loaded
                                audio.onloadedmetadata = updateTimerAndSeek;

                                // Seek when slider is dragged
                                seekBar.oninput = function() {
                                    if (audio.duration && !isNaN(audio.duration)) {
                                        const newTime = (seekBar.value / 100) * audio.duration;
                                        audio.currentTime = newTime;
                                        // Update timer immediately for smoothness
                                        updateTimerAndSeek();
                                    }
                                };

                                // Initial update in case metadata is already ready
                                if (audio.readyState >= 1) {
                                    updateTimerAndSeek();
                                }
                            </script>                                      



                <div style="font-size: 2em; margin-top: 10px; color: ${palette.accent};">
                (ㅅ´ ˘ \`)  ᶻ 𝘇 𐰁 
                </div>
                </body>
                </html>
        `);
    } else {
        next(); 
    }
});
const session = require('express-session');

// 1. Initialize Session Memory
app.use(session({
    secret: 'jill-cyber-secret-key', // This encrypts the cookies
    resave: false,
    saveUninitialized: false
}));

// 2. THE BOUNCER: A custom middleware to check if someone is logged in
function requireLogin(req, res, next) {
    if (req.session && req.session.userId) {
        next(); // They have a valid session badge! Let them in.
    } else {
        // Pass the admin key so you don't get locked out by your own WIP screen!
        res.redirect('/login?admin=jillian'); 
    }
}

// --- PAGE AND LOGIC ROUTES ---

// Redirect the base URL straight to the game
app.get('/', (req, res) => {
    res.redirect('/game?admin=jillian');
});

// --- REGISTRATION ---
app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/registration.html');
});

app.post('/register', (req, res) => {
    const { username, password } = req.body; 
    const sql = `INSERT INTO players (username, password) VALUES (?, ?)`;
    
    db.run(sql, [username, password], function(err) {
        if (err) {
            return res.send(`<h1 style="color:red; text-align:center;">Username taken! Hit back.</h1>`);
        }
        // If successful, send them to the login page with the admin key!
        res.redirect('/login?admin=jillian'); 
    });
});

// --- LOGIN ---
app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/login.html'); 
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    // Look up the player in the database
    const sql = `SELECT * FROM players WHERE username = ? AND password = ?`;
    db.get(sql, [username, password], (err, user) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Server error");
        }
        if (user) {
            // SUCCESS! Give them a session badge with their ID and Username
            req.session.userId = user.id;
            req.session.username = user.username;
            res.redirect('/game?admin=jillian'); 
        } else {
            // FAILURE! 
            res.send(`<h1 style="color:red; text-align:center;">Invalid username or password! Hit back.</h1>`);
        }
    });
});

// --- THE MAIN GAME (PROTECTED) ---
app.get('/game', requireLogin, (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Secret route to see all players
app.get('/master-list', (req, res) => {
    // Only allow access if the admin key is present
    if (req.query.admin !== 'jillian') {
        return res.status(403).send("Access Denied.");
    }

    db.all("SELECT id, username, score FROM players", [], (err, rows) => {
        if (err) return res.status(500).send(err.message);
        
        // Create a simple HTML table to show the data
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

// 1. Show the Leaderboard Page (Publicly accessible)
app.get('/leaderboard', (req, res) => {
    res.sendFile(__dirname + '/leaderboard.html');
});

// 2. The Data API (The HTML file calls this every 5 seconds)
app.get('/api/scores', (req, res) => {
    const sql = `SELECT username, score FROM players ORDER BY score DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows); 
    });
});

// Start the engine!
app.listen(3000, () => {
    console.log("Your CTF server is running at http://localhost:3000");
});