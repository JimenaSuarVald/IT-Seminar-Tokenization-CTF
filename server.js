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

    if (isUnderConstruction) {
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
                                <!-- Play/Pause Button -->
                                <div id="music-btn" onclick="togglePlay()" 
                                    style="cursor: pointer; border: 2px solid ${palette.accent}; padding: 10px 20px; border-radius: 30px; color: ${palette.text}; box-shadow: 0 0 10px ${palette.accent}; font-weight: bold; transition: all 0.3s ease;">
                                    ▶ Play Track
                                </div>

                                <!-- Timer + Seek Bar -->
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
                (ㅅ´ ˘ &#96;)  ᶻ 𝘇 𐰁 
                </div>
                </body>
                </html>
        `);
    } else {
        next(); 
    }
});
// Solo pueden llegar aquí si isUnderConstruction == false
// Gracias al next();
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Start the engine!
app.listen(3000, () => {
    console.log("Your CTF server is running at http://localhost:3000");
});