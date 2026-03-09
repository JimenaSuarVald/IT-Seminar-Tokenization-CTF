const express = require('express');
const app = express();
const port = 3000;

// This tells the server how to read the form data sent by the player
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// --- TEMPORARY "LOFI HACKER" MAINTENANCE MODE ---
// (This must come BEFORE the app.get routes!)
app.use((req, res, next) => {
    // Change 'true' to 'false' when you are ready to launch!
    const isUnderConstruction = true; 
    
    // Sampled Palette from your image:
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
                The <span class="hacker-font">Tokenization & Embeddings</span> workforce is currently working really hard on getting this site up and running!
                <br><br>
                Please be sure to come back later!
                <br><br>
                This one goes out for all the kitties in the world.

                                                            <audio id="jill-radio" loop>
                                            <source src="/wildlife.mp3" type="audio/mpeg">
                                        </audio>

                                        <div style="display: flex; flex-direction: column; align-items: center; gap: 12px; margin-bottom: 25px;">
                                            <div id="music-btn" onclick="togglePlay()" style="cursor: pointer; border: 2px solid ${palette.accent}; padding: 10px 20px; border-radius: 30px; color: ${palette.text}; box-shadow: 0 0 10px ${palette.accent}; font-weight: bold; transition: all 0.3s ease;">
                                                ▶ Play Track
                                            </div>

                                            <style>

                                                #seek-bar {
                                                    -webkit-appearance: none;  /* Hides default styling */
                                                    appearance: none;
                                                    width: 250px;
                                                    height: 4px;             /* This makes the bar very thin */
                                                    background: #444;       /* Dark gray track background */
                                                    border-radius: 2px;
                                                    outline: none;
                                                    cursor: pointer;
                                                    margin: 0;
                                                    padding: 0;
                                                }

                                                /* This styles the round "thumb" (handle) for Chrome/Safari/Edge/Ngrok Phone */
                                                #seek-bar::-webkit-slider-thumb {
                                                    -webkit-appearance: none; /* Hides default styling */
                                                    appearance: none;
                                                    width: 14px;              /* Width of the round handle */
                                                    height: 14px;             /* Height of the round handle */
                                                    border-radius: 50%;      /* Makes it perfectly round */
                                                    background: ${palette.text}; /* Uses your orange/sunset text color */
                                                    border: 2px solid ${palette.bg}; /* A purple border to make it pop */
                                                    box-shadow: 0 0 8px ${palette.accent}; /* Gives the handle a pink glow */
                                                    cursor: pointer;
                                                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                                                }

                                                /* When you hover over the handle, make it bigger and glow brighter */
                                                #seek-bar::-webkit-slider-thumb:hover {
                                                    transform: scale(1.2);
                                                    box-shadow: 0 0 15px ${palette.accent};
                                                }

                                                /* This is the same styling but specifically for Firefox */
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
                                            </style>
                                            
                                            <input type="range" id="seek-bar" value="0" step="0.1">
                                        </div>

                                        <script>
                                            const audio = document.getElementById('jill-radio');
                                            const btn = document.getElementById('music-btn');
                                            const seekBar = document.getElementById('seek-bar');

                                            function togglePlay() {
                                                if (audio.paused) {
                                                    audio.play();
                                                    btn.innerHTML = '₊⊹˚♬ (▶) Playing... ♪⊹˚';
                                                    btn.style.boxShadow = '0 0 25px ${palette.accent}';
                                                    btn.style.color = '${palette.accent}';
                                                } else {
                                                    audio.pause();
                                                    btn.innerHTML = '( ❚❚ ) Paused';
                                                    btn.style.boxShadow = '0 0 10px ${palette.accent}';
                                                    btn.style.color = '${palette.text}';
                                                }
                                            }

                                            // Update the slider as the song plays
                                            audio.ontimeupdate = () => {
                                                const percentage = (audio.currentTime / audio.duration) * 100;
                                                seekBar.value = percentage;
                                            };

                                            // Let the user "rewind" or "skip" by dragging the slider
                                            seekBar.oninput = () => {
                                                const time = (seekBar.value / 100) * audio.duration;
                                                audio.currentTime = time;
                                            };
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
// ------------------------------------------------

// When a player visits your site, send them your index.html file
// (Now they can only reach this if isUnderConstruction is false!)
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Start the engine!
app.listen(3000, () => {
    console.log("Your CTF server is running at http://localhost:3000");
});