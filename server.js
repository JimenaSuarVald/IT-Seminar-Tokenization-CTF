require('dotenv').config(); // CRITICAL FIX: Must load before trying to read process.env!
const express = require('express');
const app = express();
// Let Render choose the port, default to 3000 for your local Pi
const port = process.env.PORT || 3000; 
const path = require('path');
const adminKey = process.env.ADMIN_KEY;

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

app.get('/shout', (req, res) => {
    console.log("!!! THE SERVER IS AWAKE AND LOGGING !!!");
    res.send("I heard you!");
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
    // Change 'true' to 'false' when ready210
    const isUnderConstruction = true; 
    res.setHeader('ngrok-skip-browser-warning', 'true'); 
    const palette = {
        bg: '#1a102a',      
        text: '#ffb74d',    
        accent: '#e066a3',  
    };

    if (isUnderConstruction && req.query.admin !== process.env.ADMIN_KEY && !req.path.startsWith('/leaderboard') && !req.path.startsWith('/api/scores')) {
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Work in progress</title>
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

                                const accentColor = '${palette.accent}';
                                const textColor = '${palette.text}';

                                function formatTime(seconds) {
                                    if (isNaN(seconds) || seconds < 0) return '0:00';
                                    const mins = Math.floor(seconds / 60);
                                    const secs = Math.floor(seconds % 60);
                                    return mins + ':' + (secs < 10 ? '0' + secs : secs);
                                }

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

                                audio.ontimeupdate = updateTimerAndSeek;
                                audio.onloadedmetadata = updateTimerAndSeek;

                                seekBar.oninput = function() {
                                    if (audio.duration && !isNaN(audio.duration)) {
                                        const newTime = (seekBar.value / 100) * audio.duration;
                                        audio.currentTime = newTime;
                                        updateTimerAndSeek();
                                    }
                                };

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


app.use(session({
    secret: process.env.SESSION_SECRET, 
    resave: false,
    saveUninitialized: false
}));

// THE BOUNCER
function requireLogin(req, res, next) {
    if (req.session && req.session.userId) {
        next(); 
    } else {
        res.redirect(`/login?admin=${process.env.ADMIN_KEY}`); 
    }
}

// --- PAGE AND LOGIC ROUTES ---

app.get('/Tasks', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/register', (req, res) => {
    // CRITICAL FIX: Repaired broken comma syntax
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
            res.redirect(`/game?admin=${process.env.ADMIN_KEY}`); 
        } else {
            res.send(`<h1 style="color:red; text-align:center;">Invalid username or password! Hit back.</h1>`);
        }
    });
});

app.get('/game', requireLogin, (req, res) => {
    // CRITICAL FIX: Repaired broken comma syntax
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
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

app.get('/leaderboard', (req, res) => {
    // Assuming you didn't move this into the views folder based on your code
    res.sendFile(path.join(__dirname, 'leaderboard.html'));
});

app.get('/api/scores', (req, res) => {
    const sql = `SELECT username, score FROM players ORDER BY score DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows); 
    });
});

app.listen(port, () => {
    console.log(`Your CTF server is running on port ${port}`);
});