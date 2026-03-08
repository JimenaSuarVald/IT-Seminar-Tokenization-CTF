const express = require('express');
const app = express();
const port = 3000;

// This tells the server how to read the form data sent by the player
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// When a player visits your site, send them your index.html file
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// --- TEMPORARY UNDER CONSTRUCTION MODE ---

// --- TEMPORARY "LOFI HACKER" MAINTENANCE MODE ---
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
                        width: 350px; /* Adjust size as needed */
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
                
                <h1>🚧 ACCESS RESTRICTED 🚧</h1>
                <p>The <span class="hacker-font">ITSeminar</span> CTF systems are currently offline for critical reinforcements. The network grid is being secured.</p>
                <p>Please check back later.</p>
            </body>
            </html>
        `);
    } else {
        next(); 
    }
});

// Start the engine!
app.listen(3000, () => {
    console.log("Your CTF server is running at http://localhost:3000");
});
// ------------------------------------------------