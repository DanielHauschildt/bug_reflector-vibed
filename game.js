// Game constants
const GRAVITY = 0.15;
const BOUNCE_FACTOR = 0.8;
const PLAYER_SPEED = 5;
const BALL_VELOCITY_X = 1.5;
const BALL_VELOCITY_Y = -8;
const BOUNCE_POWER_INCREASE = 1.02;

// Fixed game constants
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 60;
const BALL_RADIUS = 18;
const GROUND_HEIGHT = 24;

// Background constants
const STAR_COUNT = 100;
const NEBULA_COUNT = 5;
const PARALLAX_LAYERS = 3;

// Recording variables
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;
let recordingStream = null;
let recordingBufferSize = 60; // Size of the recording buffer in seconds
let recordingTimeStart = 0;
let lastRecordingBlob = null; // Store the last completed recording
let autoRecordingEnabled = false; // Flag to control auto recording, disabled by default

// Audio system variables
let audioContext = null;
let audioDestination = null;
let soundSources = {};

// Touch input variables
let touchStartX = 0;
let isTouching = false;
let touchThreshold = 20; // Minimum distance to trigger movement

// Character selection variables
let characterList = [];
let selectedCharacter = null;
const CHARACTER_PATH = 'assets/characters/';

// Sound variables
let bounceSound, wallBounceSound, gameStartSound, gameOverSound;
let soundEnabled = true;

// Game variables
let canvas, ctx;
let player = {
    x: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
    y: CANVAS_HEIGHT - PLAYER_HEIGHT - GROUND_HEIGHT,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    speed: PLAYER_SPEED,
    isMovingLeft: false,
    isMovingRight: false,
    color: '#ff9900',
    character: null, // Will store the selected character image/svg
    hoverOffset: 0,  // Current offset caused by hover effect
    hoverHeight: 10, // Maximum hover height in pixels
    hoverSpeed: 0.003 // Speed of the hover effect
};

let ball = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    radius: BALL_RADIUS,
    velocity: { x: BALL_VELOCITY_X, y: BALL_VELOCITY_Y },
    color: '#ffffff',
    image: null, // Will store the ball image
    imageLoaded: false, // Track if the image is loaded
    rotation: 0 // Current rotation angle in radians
};

let score = 0;
let highScore = 0;
let gameRunning = false;
let gameOver = false;
let gameOverStartTime = 0;
let gameOverEffectsActive = false;
let gameOverRecordingStopped = false;
let gameLoopRunning = false;
let animationId;
let characterImage = new Image();
let characterImageLoaded = false;
let loadingAttemptCount = 0;
const MAX_LOADING_ATTEMPTS = 3;

// Background elements
let stars = [];
let nebulae = [];
let parallaxOffset = 0;
let supernovaEffect = {
    active: false,
    x: 0,
    y: 0,
    radius: 0,
    maxRadius: 200,
    alpha: 1,
    color: '#ffaa00'
};

// Chat constants
const MIN_CHAT_INTERVAL = 1000;  // Minimum time between chat messages (ms)
const MAX_CHAT_INTERVAL = 4000;  // Maximum time between chat messages (ms)
const SUBSCRIPTION_CHANCE = 0.1; // 10% chance for a subscription message
const CHEER_CHANCE = 0.05;      // 5% chance for a cheer message
const EMOJI_CHANCE = 0.4;       // 40% chance to include emoji in message
const USERNAME_COUNT = 50;      // Number of random usernames to generate
const MAX_CHAT_MESSAGES = 100;  // Maximum number of messages to keep in chat history

// Chat variables
let chatMessages = [];
let chatUsernames = [];
let chatTimer = null;
let viewerCount = 0;
let chatActive = false;

// Game Over Screen constants
const GAME_OVER_ANIMATION_DURATION = 3000; // ms (increased from 2000)
let gameOverAnimationStart = 0;

// Particle constants
const PARTICLE_SIZE_MIN = 2;
const PARTICLE_SIZE_MAX = 5;
const PARTICLE_SPEED_MIN = 1;
const PARTICLE_SPEED_MAX = 3;
const PARTICLE_LIFETIME_MIN = 15;
const PARTICLE_LIFETIME_MAX = 30;
const PARTICLE_COLORS = ['#ffaa00', '#ff8800', '#ff7700', '#ffcc00', '#ff5500'];
const PARTICLE_COUNT = 100;

// Particle variables
let particles = [];

// Initialize the game
window.onload = function() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    // Handle window resizing for responsive canvas
    handleCanvasResize();
    window.addEventListener('resize', handleCanvasResize);
    
    // Load high score from local storage
    const savedHighScore = localStorage.getItem('ikPlusHighScore');
    if (savedHighScore !== null) {
        highScore = parseInt(savedHighScore);
        
        // Update the DOM element if it exists (for backward compatibility)
        const highScoreElement = document.getElementById('highScore');
        if (highScoreElement) {
            highScoreElement.textContent = highScore;
        }
    }
    
    // Initialize sounds
    initializeSounds();
    updateSoundStatus();
    
    // Load character list and show selection screen
    loadCharacterList();
    
    // Load ball image
    loadBallImage();
    
    // Add keyboard event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.getElementById('startButton').addEventListener('click', startGame);
    document.getElementById('startWithCharacterBtn').addEventListener('click', startGameWithCharacter);
    document.getElementById('changeCharacterBtn').addEventListener('click', showCharacterSelectScreen);
    
    // Add sound toggle button handler
    document.getElementById('soundToggleBtn').addEventListener('click', toggleSound);
    
    // Add touch event listeners
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', handleTouchEnd);
    
    // Add touch restart for game over
    canvas.addEventListener('touchstart', handleTouchRestart);
    
    // Add recording event listener
    document.getElementById('downloadRecordingBtn').addEventListener('click', downloadRecording);
    document.getElementById('toggleRecordingBtn').addEventListener('click', toggleRecording);
    document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);
    
    // Log SVG support for debugging
    console.log("SVG MIME type support:", document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#Image", "1.1"));
    
    // Initialize background
    initializeBackground();
    
    // Initialize chat
    initializeChat();
    
    // Initialize recording if enabled
    if (autoRecordingEnabled) {
        startContinuousRecording();
    }
}

// Adjust canvas display size based on screen size
function handleCanvasResize() {
    // Get container dimensions
    const gameArea = document.querySelector('.game-area');
    const container = document.fullscreenElement || document.webkitFullscreenElement || gameArea;
    
    // Get available width and height
    let availableWidth, availableHeight;
    
    if (document.fullscreenElement || document.webkitFullscreenElement) {
        // In fullscreen mode, use the entire screen
        availableWidth = window.innerWidth;
        availableHeight = window.innerHeight;
    } else {
        // In windowed mode, use the container's width and height
        availableWidth = container ? container.clientWidth : window.innerWidth;
        availableHeight = container ? container.clientHeight : window.innerHeight;
        
        // Subtract padding in windowed mode
        availableWidth -= 20; // 10px padding on each side
    }
    
    // Calculate optimal display size while maintaining aspect ratio
    const canvasRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
    let displayWidth, displayHeight;
    
    // Check if fitting to width or height would be better
    if (availableWidth / availableHeight > canvasRatio) {
        // Available space is wider than needed, fit to height
        displayHeight = availableHeight;
        displayWidth = displayHeight * canvasRatio;
    } else {
        // Available space is taller than needed, fit to width
        displayWidth = availableWidth;
        displayHeight = displayWidth / canvasRatio;
    }
    
    // Apply CSS for display size (actual rendering stays at original resolution)
    const canvas = document.getElementById('gameCanvas');
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    
    // Center the canvas in fullscreen mode
    if (document.fullscreenElement || document.webkitFullscreenElement) {
        canvas.style.position = 'absolute';
        canvas.style.left = `${(availableWidth - displayWidth) / 2}px`;
        canvas.style.top = `${(availableHeight - displayHeight) / 2}px`;
    } else {
        // Reset positioning in windowed mode
        canvas.style.position = '';
        canvas.style.left = '';
        canvas.style.top = '';
    }
    
    console.log(`Canvas display size adjusted to: ${displayWidth}x${displayHeight}`);
}

// Initialize sound effects
function initializeSounds() {
    // Create a shared AudioContext for both gameplay and recording
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('Created shared AudioContext for gameplay and recording, state:', audioContext.state);
        
        // AudioContext might start in suspended state due to browser autoplay policies
        if (audioContext.state === 'suspended') {
            console.warn('AudioContext suspended. Will resume on user interaction.');
            
            // Add event listeners to resume AudioContext on user interaction
            const resumeAudioContext = () => {
                if (audioContext.state === 'suspended') {
                    audioContext.resume().then(() => {
                        console.log('AudioContext resumed by user interaction');
                    }).catch(err => {
                        console.error('Failed to resume AudioContext:', err);
                    });
                }
            };
            
            // Add multiple event listeners to increase chances of resuming
            ['touchstart', 'touchend', 'mousedown', 'keydown', 'click'].forEach(event => {
                document.addEventListener(event, resumeAudioContext, { once: true });
            });
        }
        
        // Create a destination for recording that we'll use later
        audioDestination = audioContext.createMediaStreamDestination();
        console.log('Created audio destination for recording');
    } catch (err) {
        console.error('Failed to create AudioContext:', err);
        // Continue with traditional audio elements as fallback
    }
    
    bounceSound = document.getElementById('bounceSound');
    wallBounceSound = document.getElementById('wallBounceSound');
    gameStartSound = document.getElementById('gameStartSound');
    gameOverSound = document.getElementById('gameOverSound');
    
    // Set up sound fallbacks
    if (!bounceSound || !wallBounceSound || !gameStartSound || !gameOverSound) {
        createFallbackSounds();
    }
    
    // Pre-load and set volumes
    if (gameOverSound) {
        gameOverSound.volume = 1.0; // Maximum volume for game over sound
        
        // Try to preload the sound
        try {
            gameOverSound.load();
            console.log("Game over sound preloaded successfully");
        } catch (err) {
            console.warn("Could not preload game over sound:", err);
        }
    }
    
    // Connect audio elements to the shared AudioContext if available
    if (audioContext && audioDestination) {
        connectAudioElementsToContext([
            bounceSound,
            wallBounceSound,
            gameStartSound,
            gameOverSound
        ]);
    }
}

// Connect audio elements to the shared AudioContext
function connectAudioElementsToContext(audioElements) {
    audioElements.filter(el => el !== null).forEach(audioElement => {
        try {
            // Create a media element source
            const source = audioContext.createMediaElementSource(audioElement);
            
            // Connect to both the audio context destination (speakers) and the recording destination
            source.connect(audioContext.destination);
            source.connect(audioDestination);
            
            // Store the source for later reference
            soundSources[audioElement.id] = source;
            
            console.log(`Connected ${audioElement.id} to shared AudioContext`);
        } catch (err) {
            console.warn(`Failed to connect ${audioElement.id} to AudioContext:`, err);
        }
    });
}

// Create fallback sound objects if HTML audio elements aren't available
function createFallbackSounds() {
    if (!bounceSound) {
        bounceSound = new Audio();
        bounceSound.src = 'assets/sounds/bounce.mp3';
    }
    
    if (!wallBounceSound) {
        wallBounceSound = new Audio();
        wallBounceSound.src = 'assets/sounds/wall-bounce.mp3';
    }
    
    if (!gameStartSound) {
        gameStartSound = new Audio();
        gameStartSound.src = 'assets/sounds/game-start.mp3';
    }
    
    if (!gameOverSound) {
        gameOverSound = new Audio();
        gameOverSound.src = 'assets/sounds/game-over.mp3';
        gameOverSound.volume = 1.0; // Maximum volume for game over sound
    }
}

// Play a sound with error handling
function playSound(sound) {
    if (!soundEnabled || !sound) return;
    
    try {
        // Always try to resume the AudioContext first
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('AudioContext resumed successfully while playing sound');
                // After resuming, try playing again
                playActualSound(sound);
            }).catch(err => {
                console.warn('Failed to resume AudioContext:', err);
                // Try direct playback as fallback
                playActualSound(sound);
            });
        } else {
            // AudioContext is already running or not available, play directly
            playActualSound(sound);
        }
    } catch (err) {
        console.warn("Error playing sound:", err);
    }
}

// Actual sound playing logic (extracted to avoid duplication)
function playActualSound(sound) {
    try {
        // Reset the sound to the beginning
        sound.currentTime = 0;
        
        // Ensure game over sound is loud
        if (sound === gameOverSound) {
            sound.volume = 1.0;
        }
        
        // Play the sound
        const playPromise = sound.play();
        
        // Handle the promise to avoid errors
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn("Sound play error:", error);
                
                // If the first attempt failed, try again after a small delay
                if (sound === gameOverSound) {
                    setTimeout(() => {
                        try {
                            sound.currentTime = 0;
                            sound.play();
                        } catch (e) {
                            console.warn("Second attempt to play game over sound failed:", e);
                        }
                    }, 100);
                }
            });
        }
    } catch (err) {
        console.warn("Error in playActualSound:", err);
    }
}

// Update the sound status display in the UI
function updateSoundStatus() {
    // Update the DOM element if it exists (for backward compatibility)
    const soundStatusElement = document.getElementById('soundStatus');
    if (soundStatusElement) {
        soundStatusElement.textContent = soundEnabled ? 'ON' : 'OFF';
        soundStatusElement.style.color = soundEnabled ? '#0f0' : '#f00';
    }
    
    // Update sound toggle button
    const soundToggleBtn = document.getElementById('soundToggleBtn');
    if (soundToggleBtn) {
        soundToggleBtn.textContent = `Sound: ${soundEnabled ? 'ON' : 'OFF'}`;
        soundToggleBtn.style.backgroundColor = soundEnabled ? '#047857' : '#888';
    }
    
    // The canvas display will automatically update in the next animation frame
}

// Toggle sound on/off
function toggleSound() {
    soundEnabled = !soundEnabled;
    updateSoundStatus();
    
    // Save sound preference to localStorage
    localStorage.setItem('ikPlusSoundEnabled', soundEnabled);
    
    // Try to play a test sound to unblock audio context
    if (soundEnabled && bounceSound) {
        try {
            // Create a very quiet sound for testing
            const testSound = bounceSound.cloneNode();
            testSound.volume = 0.01;
            testSound.play().catch(err => {
                console.warn("Test sound failed, but that's okay:", err);
            });
            
            // Also try to resume audio context
            if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    console.log('AudioContext resumed by sound toggle');
                }).catch(err => {
                    console.error('Failed to resume AudioContext:', err);
                });
            }
        } catch (err) {
            console.warn("Test sound error:", err);
        }
    }
}

// Load character list from assets directory
function loadCharacterList() {
    // Dynamically use all SVG files found in the assets/characters directory
    // This list has been verified via server-side listing and represents all available characters
    const characterFiles = [
        'Angry.svg',
        'Cptn Äppler.svg',
        'Cry Laugh.svg',
        'Cute.svg', 
        'Disappointed.svg',
        // 'Eray.svg',
        'Flipped.svg',
        // 'Hangry Magnus.svg',
        // 'Happy Magnus.svg',
        'Happy.svg', 
        'Hotbox.svg',
        // 'Impressed Magnus.svg',
        'In Love.svg',
        'Kirby.svg',
        'Kiss.svg', 
        // 'Look Down.svg', 
        // 'Look Left.svg', 
        // 'Look Right.svg', 
        // 'Look Up.svg',
        // 'Neutral (Monochrome).svg',
        'Neutral.svg',
        'Pissed.svg',
        'Poop.svg', 
        'Sad.svg',
        'Santa.svg',
        'Shocked.svg', 
        'Sick.svg',
        'Smile.svg',
        'Stern Smile.svg',
        'Stoned.svg', 
        'Sunglasses.svg',
        'Surprised.svg', 
        'Sweat Smile.svg', 
        'Transparent No Hair.svg'
    ];
    
    characterList = characterFiles.map(file => {
        return {
            name: file.replace('.svg', ''),
            path: CHARACTER_PATH + file
        };
    });
    
    // Populate the character grid
    const characterGrid = document.getElementById('characterGrid');
    characterGrid.innerHTML = ''; // Clear existing content
    
    // Sort characters alphabetically for better organization
    characterList.sort((a, b) => a.name.localeCompare(b.name));
    
    characterList.forEach((character, index) => {
        const characterItem = document.createElement('div');
        characterItem.className = 'character-item';
        characterItem.dataset.index = index;
        
        // Create an IMG element instead of object for better compatibility
        const img = document.createElement('img');
        img.src = character.path;
        img.alt = character.name;
        img.style.width = '100%';
        img.style.height = '100%';
        
        // Add error handling for image loading
        img.onerror = () => {
            console.error(`Failed to load character image: ${character.path}`);
            img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><text x="10" y="40" fill="red">Error</text></svg>';
        };
        
        characterItem.appendChild(img);
        
        // Add click event listener
        characterItem.addEventListener('click', () => selectCharacter(index));
        characterGrid.appendChild(characterItem);
    });
    
    // Log available characters for debugging
    console.log("Available characters:", characterList.map(c => c.name));
    
    // Load previously selected character if it exists
    const savedCharacterIndex = localStorage.getItem('ikPlusSelectedCharacter');
    if (savedCharacterIndex !== null) {
        selectCharacter(parseInt(savedCharacterIndex));
    }
    
    // Load sound preference if it exists
    const savedSoundEnabled = localStorage.getItem('ikPlusSoundEnabled');
    if (savedSoundEnabled !== null) {
        soundEnabled = savedSoundEnabled === 'true';
        updateSoundStatus();
    }
}

// Select a character from the list
function selectCharacter(index) {
    if (index < 0 || index >= characterList.length) {
        console.error('Invalid character index:', index);
        return;
    }
    
    // Log character selection
    console.log(`Selecting character: ${characterList[index].name} at index ${index}`);
    
    // Remove selected class from all characters
    const characterItems = document.querySelectorAll('.character-item');
    characterItems.forEach(item => item.classList.remove('selected'));
    
    // Add selected class to the chosen character
    characterItems[index].classList.add('selected');
    
    // Update selected character and preview
    selectedCharacter = characterList[index];
    
    // Update preview
    const previewContainer = document.getElementById('characterPreview');
    previewContainer.innerHTML = '';
    
    // Use an image for preview instead of object
    const previewImg = document.createElement('img');
    previewImg.src = selectedCharacter.path;
    previewImg.alt = selectedCharacter.name;
    previewImg.style.maxWidth = '100%';
    previewImg.style.maxHeight = '100%';
    
    // Add error handling for preview image
    previewImg.onerror = () => {
        console.error(`Failed to load preview image: ${selectedCharacter.path}`);
        previewContainer.innerHTML = '<div style="color:red;text-align:center;">Image Error</div>';
    };
    
    previewContainer.appendChild(previewImg);
    
    // Update name display
    document.getElementById('characterName').textContent = selectedCharacter.name;
    
    // Enable start button
    document.getElementById('startWithCharacterBtn').disabled = false;
    
    // Save selected character to local storage
    localStorage.setItem('ikPlusSelectedCharacter', index);
    
    // Reset loading attempt counter
    loadingAttemptCount = 0;
    
    // Preload character image for the game
    preloadCharacterImage(selectedCharacter.path);
}

// Preload character image for the game
function preloadCharacterImage(path) {
    console.log(`Preloading character image: ${path}`);
    
    // Create a new image
    characterImage = new Image();
    characterImageLoaded = false;
    
    // Set up the onload handler
    characterImage.onload = () => {
        characterImageLoaded = true;
        player.character = characterImage;
        
        // Adjust player dimensions to match image aspect ratio
        if (characterImage.width && characterImage.height) {
            const aspectRatio = characterImage.width / characterImage.height;
            // Maintain player height but adjust width based on aspect ratio
            player.width = player.height * aspectRatio;
            console.log('Adjusted player dimensions to match image aspect ratio:', 
                        aspectRatio, 'width:', player.width, 'height:', player.height);
        }
        
        console.log('Character image loaded successfully:', path);
    };
    
    // Set up error handler
    characterImage.onerror = (err) => {
        console.error('Error loading character image:', path, err);
        characterImageLoaded = false;
        
        // Try again if we haven't reached the maximum number of attempts
        loadingAttemptCount++;
        if (loadingAttemptCount < MAX_LOADING_ATTEMPTS) {
            console.log(`Retry loading (${loadingAttemptCount}/${MAX_LOADING_ATTEMPTS}): ${path}`);
            setTimeout(() => preloadCharacterImage(path), 500);
        } else {
            console.error(`Failed to load character after ${MAX_LOADING_ATTEMPTS} attempts.`);
            
            // If this is the Angry character, try the original as a fallback
            if (selectedCharacter && selectedCharacter.name === "Angry" && selectedCharacter.isFixed) {
                console.log("Trying original Angry.svg as fallback");
                preloadCharacterImage(CHARACTER_PATH + 'Angry.svg');
            }
        }
    };
    
    // Set the source - for SVG files we'll try a different approach for better compatibility
    if (path.toLowerCase().endsWith('.svg')) {
        // Use fetch to get the SVG content
        fetch(path)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(svgContent => {
                // Create a data URL from the SVG content
                const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgContent);
                characterImage.src = dataUrl;
                console.log('SVG loaded via fetch and converted to data URL');
            })
            .catch(error => {
                console.error('Error fetching SVG:', error);
                // Fallback to direct src assignment
                characterImage.src = path;
            });
    } else {
        // For non-SVG files, use direct assignment
        characterImage.src = path;
    }
}

// Show character selection screen
function showCharacterSelectScreen() {
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('characterSelectScreen').style.display = 'flex';
    
    // Stop game if it's running
    if (gameRunning) {
        gameRunning = false;
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
    }
}

// Start game after character selection
function startGameWithCharacter() {
    if (!selectedCharacter) return;
    
    // Hide character select screen and show game screen
    document.getElementById('characterSelectScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'flex';
    
    // Start the game
    startGame();
}

// Game loop
function gameLoop() {
    // Always update and draw, but only update game logic if game is running
    if (gameRunning) {
        update();
    } else if (gameOver) {
        // For game over state, we still need to update animations
        // But particles are now updated directly in the update function
        update(); // This will handle particles and any animation updates
    }
    
    // Always draw the game (including game over screen)
    drawGame();
    
    // Continue animation loop regardless of game state
    animationId = requestAnimationFrame(gameLoop);
}

// Update game state
function update() {
    // Update hover effect for player
    player.hoverOffset = Math.sin(Date.now() * player.hoverSpeed) * player.hoverHeight;
    
    // Always update particles regardless of game state
    updateParticles();

    // If game is not running, don't update anything except animations and particles
    if (!gameRunning) {
        if (gameOver && gameOverEffectsActive) {
            // Calculate how far we are in the game over animation
            const timeSinceGameOver = Date.now() - gameOverAnimationStart;
            
            // Stop recording if we're recording and the game just ended
            if (isRecording && !gameOverRecordingStopped) {
                stopRecording(false); // Stop without downloading
                gameOverRecordingStopped = true;
            }
            
            // We no longer automatically disable game over effects
            // Keep the game over screen visible until user input
        }
        return;
    }
    
    // Update player
    if (player.isMovingLeft) {
        player.x -= player.speed;
    }
    if (player.isMovingRight) {
        player.x += player.speed;
    }
    
    // Keep player within bounds
    if (player.x < 0) {
        player.x = 0;
    }
    if (player.x + player.width > CANVAS_WIDTH) {
        player.x = CANVAS_WIDTH - player.width;
    }
    
    // Store previous position to calculate rotation
    const prevX = ball.x;
    
    // Update ball position
    ball.velocity.y += GRAVITY;
    ball.x += ball.velocity.x;
    ball.y += ball.velocity.y;
    
    // Calculate physically correct rotation
    // For a ball rolling on a surface: rotation change = distance traveled / radius
    const distanceTraveled = ball.x - prevX;
    ball.rotation -= distanceTraveled / ball.radius; // Minus for correct rotation direction
    
    // Ball collision with walls
    if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        ball.velocity.x = -ball.velocity.x * BOUNCE_FACTOR;
        playSound(wallBounceSound);
    } else if (ball.x + ball.radius > CANVAS_WIDTH) {
        ball.x = CANVAS_WIDTH - ball.radius;
        ball.velocity.x = -ball.velocity.x * BOUNCE_FACTOR;
        playSound(wallBounceSound);
    }
    
    // Ball collision with player (head)
    const playerHeadX = player.x + player.width / 2;
    const playerHeadY = player.y + player.height / 2; // Center of the character
    const playerCollisionRadius = Math.min(player.width, player.height) / 2; // Use half of the smaller dimension
    
    const dx = ball.x - playerHeadX;
    const dy = ball.y - playerHeadY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < ball.radius + playerCollisionRadius && ball.velocity.y > 0) {
        // Calculate new velocity based on hit position (for angle)
        const hitAngle = Math.atan2(dy, dx);
        const hitPower = Math.sqrt(ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y);
        
        ball.velocity.x = Math.cos(hitAngle) * hitPower * 0.8;
        ball.velocity.y = -Math.abs(ball.velocity.y) * BOUNCE_POWER_INCREASE;
        
        // Play bounce sound
        playSound(bounceSound);
        
        // Increase score
        score++;
        // Update the DOM element if it exists (for backward compatibility)
        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            scoreElement.textContent = score;
        }
        
        // Trigger extra chat messages on milestone scores
        if (score % 5 === 0) {
            // Generate more chat activity on milestones
            for (let i = 0; i < 3; i++) {
                setTimeout(() => {
                    if (chatActive) {
                        generateRandomChatMessage();
                    }
                }, i * 300);
            }
        }
        
        // Trigger supernova effect on milestone scores
        if (score % 10 === 0) {
            triggerSupernova(ball.x, ball.y);
        }
    }
    
    // Ball collision with ground
    if (ball.y + ball.radius > CANVAS_HEIGHT - GROUND_HEIGHT) {
        if (gameRunning) {
            // Game over
            gameOver = true;
            gameRunning = false; // Stop game logic updates
            gameOverAnimationStart = Date.now();
            gameOverEffectsActive = true;
            checkHighScore();
            
            // Generate "game over" chat messages
            if (chatActive) {
                generateGameOverChatMessages();
                // Keep chat active but slow it down
                const originalMinInterval = MIN_CHAT_INTERVAL;
                const originalMaxInterval = MAX_CHAT_INTERVAL;
                
                // Set slower chat intervals during game over
                window.MIN_CHAT_INTERVAL = 3000;  // 3 seconds minimum
                window.MAX_CHAT_INTERVAL = 8000;  // 8 seconds maximum
                
                // Reset chat intervals if the user starts a new game
                setTimeout(() => {
                    if (gameOver) { // Only reset if still in game over state
                        window.MIN_CHAT_INTERVAL = originalMinInterval;
                        window.MAX_CHAT_INTERVAL = originalMaxInterval;
                    }
                }, 15000); // Reset after 15 seconds
            }
            
            // Play game over sound
            playSound(gameOverSound);
            
            // Trigger a dramatic supernova for game over
            triggerSupernova(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 500, 0.9);
        } else {
            // Just bounce for visual effect when not playing
            ball.y = CANVAS_HEIGHT - GROUND_HEIGHT - ball.radius;
            ball.velocity.y = -ball.velocity.y * BOUNCE_FACTOR;
            ball.velocity.x *= BOUNCE_FACTOR;
        }
    }
}

// Draw everything
function drawGame() {
    // Clear the canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Apply recording optimizations if recording
    if (isRecording) {
        optimizeForRecording();
        updateMovementTracking();
    }
    
    // Draw the background
    drawBackground();
    
    // Draw game elements
    drawPlayer();
    drawBall();
    
    // Draw particles
    drawParticles();
    
    // Draw supernova effect
    drawSupernova();
    
    // Draw game over screen if game is over
    if (gameOver && gameOverEffectsActive) {
        drawGameOverScreen();
    }
    
    // Draw scoreboards and stats on canvas
    drawScoreboardOnCanvas();
    
    // Draw recording indicator if recording
    drawRecordingIndicator();
    
    // Restore any saved context states
    if (isRecording) {
        ctx.restore();
    }
}

// Draw player character
function drawPlayer() {
    // Apply hover effect to player's position
    const hoveredY = player.y + player.hoverOffset;
    
    // Draw the character head
    if (characterImageLoaded && player.character) {
        try {
            // Use the full player dimensions for the character
            ctx.drawImage(
                player.character,
                player.x,                   // X position
                hoveredY,                   // Y position with hover effect
                player.width,               // Use natural width dimension 
                player.height               // Use natural height dimension
            );
        } catch (err) {
            console.error('Error drawing character:', err);
            drawFallbackHead(hoveredY);
        }
    } else {
        // Use hover effect for fallback drawing as well
        drawFallbackHead(hoveredY);
    }
}

// Draw a fallback head if character image is not available
function drawFallbackHead(yPos = player.y) {
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, yPos + player.height / 6, player.width / 3, 0, Math.PI * 2);
    ctx.fill();
}

// Draw the ball with SVG image or fallback to circle
function drawBall() {
    if (ball.imageLoaded && ball.image) {
        try {
            // Draw the ball image centered at ball's position with rotation
            const drawX = ball.x - ball.radius;
            const drawY = ball.y - ball.radius;
            const drawSize = ball.radius * 2;
            
            // Save the current context state
            ctx.save();
            
            // Translate to the center of the ball
            ctx.translate(ball.x, ball.y);
            
            // Rotate around the center point
            ctx.rotate(ball.rotation);
            
            // Draw the image centered at the origin (0,0), which is now the ball's center
            ctx.drawImage(
                ball.image,
                -ball.radius, // x position relative to the new origin
                -ball.radius, // y position relative to the new origin
                drawSize,
                drawSize
            );
            
            // Restore the context to its original state
            ctx.restore();
        } catch (err) {
            console.error('Error drawing ball image:', err);
            drawFallbackBall();
        }
    } else {
        drawFallbackBall();
    }
}

// Draw fallback ball if image is not available
function drawFallbackBall() {
    ctx.save();
    
    // Translate to the center of the ball
    ctx.translate(ball.x, ball.y);
    
    // Rotate around the center point
    ctx.rotate(ball.rotation);
    
    // Draw the ball centered at the origin (0,0)
    ctx.fillStyle = ball.color;
    ctx.beginPath();
    ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Add a line to make rotation visible
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -ball.radius);
    ctx.stroke();
    
    // Restore the context to its original state
    ctx.restore();
}

// Handle keyboard input
function handleKeyDown(e) {
    // Move the player
    if (e.code === 'ArrowLeft' || e.key === 'A' || e.key === 'a') {
        player.isMovingLeft = true;
    }
    if (e.code === 'ArrowRight' || e.key === 'D' || e.key === 'd') {
        player.isMovingRight = true;
    }
    
    // If game is over and Space is pressed, restart the game
    if (gameOver && (e.code === 'Space' || e.key === ' ')) {
        startGameWithCharacter();
    }
    
    // Toggle sound with 'S' key
    if (e.key === 's' || e.key === 'S') {
        toggleSound();
        
        // Try to resume AudioContext on any key press (for sound)
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('AudioContext resumed by key press');
            }).catch(err => {
                console.error('Failed to resume AudioContext:', err);
            });
        }
    }
}

function handleKeyUp(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        player.isMovingLeft = false;
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        player.isMovingRight = false;
    }
}

// Start or restart the game
function startGame() {
    // Check if a character is selected
    if (!selectedCharacter || !characterImage.complete) {
        return;
    }

    // Resume AudioContext if suspended - browsers require user interaction
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            console.log('AudioContext resumed by game start');
        }).catch(err => {
            console.error('Failed to resume AudioContext:', err);
        });
    }

    // Reset player properties instead of reassigning the whole object
    player.x = CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2;
    player.y = CANVAS_HEIGHT - PLAYER_HEIGHT - GROUND_HEIGHT;
    player.width = PLAYER_WIDTH;
    player.height = PLAYER_HEIGHT;
    player.speed = PLAYER_SPEED;
    player.isMovingLeft = false;
    player.isMovingRight = false;
    player.color = '#ff9900';
    player.hoverOffset = 0;
    player.hoverHeight = 10;
    player.hoverSpeed = 0.003;

    // Reset ball properties instead of reassigning the whole object
    ball.x = CANVAS_WIDTH / 2;
    ball.y = CANVAS_HEIGHT / 2;
    ball.radius = BALL_RADIUS;
    ball.velocity = { x: BALL_VELOCITY_X, y: BALL_VELOCITY_Y };
    ball.color = '#0099ff';
    ball.rotation = 0;

    // Reset score
    score = 0;
    gameRunning = true;
    gameOver = false;
    gameOverEffectsActive = false;
    gameOverRecordingStopped = false;

    // Reset chat intervals to original values
    window.MIN_CHAT_INTERVAL = 1000;
    window.MAX_CHAT_INTERVAL = 4000;

    // Play game start sound with a small delay to ensure AudioContext is resumed
    setTimeout(() => {
        playSound(gameStartSound);
    }, 50);

    // Trigger a welcome supernova
    triggerSupernova(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 500, 0.3);

    // Hide start button
    document.getElementById('startButton').style.display = 'none';

    // Start the game loop and random chat
    if (!gameLoopRunning) {
        gameLoopRunning = true;
        requestAnimationFrame(gameLoop);
    }
    
    // Stop any existing recording and start a new one if auto recording is enabled
    if (isRecording) {
        stopRecording(false); // Stop without downloading
    }
    if (autoRecordingEnabled) {
        startContinuousRecording();
    }
    
    startRandomChat();
}

// Check and update high score
function checkHighScore() {
    if (score > highScore) {
        highScore = score;
        // Update the DOM element if it exists (for backward compatibility)
        const highScoreElement = document.getElementById('highScore');
        if (highScoreElement) {
            highScoreElement.textContent = highScore;
        }
        // Save to local storage
        localStorage.setItem('ikPlusHighScore', highScore);
    }
}

// Initialize background elements
function initializeBackground() {
    // Create stars for each parallax layer
    for (let layer = 0; layer < PARALLAX_LAYERS; layer++) {
        for (let i = 0; i < STAR_COUNT / PARALLAX_LAYERS; i++) {
            stars.push({
                x: Math.random() * CANVAS_WIDTH,
                y: Math.random() * CANVAS_HEIGHT,
                size: Math.random() * 2 + 0.5,
                color: getRandomStarColor(),
                layer: layer,
                twinkle: Math.random() > 0.7, // 30% of stars will twinkle
                twinkleSpeed: Math.random() * 0.05 + 0.01,
                twinklePhase: Math.random() * Math.PI * 2 // Random starting phase
            });
        }
    }
    
    // Create nebulae clouds
    for (let i = 0; i < NEBULA_COUNT; i++) {
        nebulae.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            width: Math.random() * 200 + 100,
            height: Math.random() * 150 + 50,
            color: getRandomNebulaColor(),
            alpha: Math.random() * 0.2 + 0.1,
            layer: Math.floor(Math.random() * PARALLAX_LAYERS)
        });
    }
}

// Get a random color for stars
function getRandomStarColor() {
    const colors = [
        '#ffffff', // White
        '#ffffcc', // Pale yellow
        '#ffcccc', // Pale red
        '#ccccff', // Pale blue
        '#ccffff'  // Pale cyan
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Get a random color for nebulae
function getRandomNebulaColor() {
    const colors = [
        '#5050ff', // Blue
        '#ff5050', // Red
        '#50ff50', // Green
        '#ff50ff', // Purple
        '#ffff50'  // Yellow
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Draw the space background with parallax effect
function drawBackground() {
    // Update parallax offset based on player movement
    if (player.isMovingLeft) {
        parallaxOffset += 0.2;
    } else if (player.isMovingRight) {
        parallaxOffset -= 0.2;
    }
    
    // Draw nebulae
    nebulae.forEach(nebula => {
        const parallaxSpeed = (nebula.layer + 1) * 0.2;
        const offsetX = (parallaxOffset * parallaxSpeed) % CANVAS_WIDTH;
        
        ctx.save();
        ctx.globalAlpha = nebula.alpha;
        const gradient = ctx.createRadialGradient(
            nebula.x, nebula.y, 0,
            nebula.x, nebula.y, nebula.width / 2
        );
        gradient.addColorStop(0, nebula.color);
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        
        // Draw main nebula
        ctx.beginPath();
        ctx.ellipse(
            (nebula.x + offsetX) % CANVAS_WIDTH, 
            nebula.y, 
            nebula.width / 2, 
            nebula.height / 2, 
            0, 0, Math.PI * 2
        );
        ctx.fill();
        
        // Draw wrapped nebula if it's going off-screen
        if ((nebula.x + offsetX) < nebula.width / 2) {
            ctx.beginPath();
            ctx.ellipse(
                (nebula.x + offsetX) + CANVAS_WIDTH, 
                nebula.y, 
                nebula.width / 2, 
                nebula.height / 2, 
                0, 0, Math.PI * 2
            );
            ctx.fill();
        } else if ((nebula.x + offsetX) > CANVAS_WIDTH - nebula.width / 2) {
            ctx.beginPath();
            ctx.ellipse(
                (nebula.x + offsetX) - CANVAS_WIDTH, 
                nebula.y, 
                nebula.width / 2, 
                nebula.height / 2, 
                0, 0, Math.PI * 2
            );
            ctx.fill();
        }
        
        ctx.restore();
    });
    
    // Draw stars
    stars.forEach(star => {
        const parallaxSpeed = (star.layer + 1) * 0.3;
        const offsetX = (parallaxOffset * parallaxSpeed) % CANVAS_WIDTH;
        
        // Calculate twinkle effect
        let size = star.size;
        if (star.twinkle) {
            const time = Date.now() * star.twinkleSpeed;
            size *= 0.5 + (Math.sin(time + star.twinklePhase) + 1) * 0.5;
        }
        
        ctx.fillStyle = star.color;
        
        // Draw main star
        ctx.beginPath();
        ctx.arc(
            (star.x + offsetX) % CANVAS_WIDTH, 
            star.y, 
            size, 
            0, Math.PI * 2
        );
        ctx.fill();
        
        // Draw wrapped star if it's going off-screen
        if ((star.x + offsetX) < 0) {
            ctx.beginPath();
            ctx.arc(
                (star.x + offsetX) + CANVAS_WIDTH, 
                star.y, 
                size, 
                0, Math.PI * 2
            );
            ctx.fill();
        } else if ((star.x + offsetX) > CANVAS_WIDTH) {
            ctx.beginPath();
            ctx.arc(
                (star.x + offsetX) - CANVAS_WIDTH, 
                star.y, 
                size, 
                0, Math.PI * 2
            );
            ctx.fill();
        }
    });
    
    // Draw supernova effect if active
    if (supernovaEffect.active) {
        drawSupernova();
    }
}

// Draw supernova effect
function drawSupernova() {
    ctx.save();
    
    // Create a radial gradient for the supernova
    const gradient = ctx.createRadialGradient(
        supernovaEffect.x, supernovaEffect.y, 0,
        supernovaEffect.x, supernovaEffect.y, supernovaEffect.radius
    );
    
    gradient.addColorStop(0, `rgba(255, 255, 255, ${supernovaEffect.alpha})`);
    gradient.addColorStop(0.2, `rgba(255, 220, 100, ${supernovaEffect.alpha * 0.8})`);
    gradient.addColorStop(0.5, `rgba(255, 100, 50, ${supernovaEffect.alpha * 0.6})`);
    gradient.addColorStop(1, 'rgba(100, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(supernovaEffect.x, supernovaEffect.y, supernovaEffect.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Update supernova properties
    supernovaEffect.radius += 2;
    supernovaEffect.alpha -= 0.01;
    
    // Deactivate when it fades out
    if (supernovaEffect.alpha <= 0 || supernovaEffect.radius >= supernovaEffect.maxRadius) {
        supernovaEffect.active = false;
    }
    
    ctx.restore();
}

// Trigger a supernova effect with custom size and alpha
function triggerSupernova(x, y, customMaxRadius, customAlpha) {
    supernovaEffect = {
        active: true,
        x: x || CANVAS_WIDTH / 2,
        y: y || CANVAS_HEIGHT / 2,
        radius: 10,
        maxRadius: customMaxRadius || 300 + Math.random() * 200, // Random max size or custom
        alpha: customAlpha || 0.8,
        color: '#ffaa00'
    };
}

// Initialize chat system
function initializeChat() {
    // Generate random usernames
    generateRandomUsernames();
    
    // Set initial viewer count (100-500)
    viewerCount = Math.floor(Math.random() * 400) + 100;
    updateViewerCount();
    
    // Add initial welcome messages
    setTimeout(() => {
        addChatMessage("Nightbot", "Welcome to the stream! Let's bounce!", 2);
        addChatMessage("StreamElements", "Use !score to check the high score", 7);
    }, 1000);
}

// Generate a list of random usernames
function generateRandomUsernames() {
    const prefixes = ["Super", "Cool", "Epic", "Pro", "Mega", "Ultra", "Hyper", "Amazing", "Awesome", "Golden"];
    const roots = ["Gamer", "Player", "Bouncer", "Ninja", "Master", "Legend", "Hero", "Champion", "Warrior", "Wizard"];
    const suffixes = ["99", "69", "420", "XD", "TV", "YT", "TTV", "Live", "Gaming", "X"];
    
    chatUsernames = [];
    
    // Generate some full usernames with pattern
    for (let i = 0; i < USERNAME_COUNT; i++) {
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const root = roots[Math.floor(Math.random() * roots.length)];
        const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
        
        // 50% chance to include a prefix, 50% chance to include a suffix
        let username = root;
        if (Math.random() > 0.5) username = prefix + username;
        if (Math.random() > 0.5) username += suffix;
        
        chatUsernames.push(username);
    }
    
    // Add some common Twitch-style short usernames
    const shortUsernames = ["xQc", "Ninja", "Pokimane", "Shroud", "TimTheTatman", "DrLupo", "Sykkuno", "Toast", "Ludwig", "Valkyrae"];
    chatUsernames = chatUsernames.concat(shortUsernames);
}

// Start generating random chat messages
function startRandomChat() {
    if (chatActive) return;
    chatActive = true;
    
    // Schedule the first message
    scheduleNextChatMessage();
    
    // Start slowly increasing viewer count
    startViewerCountIncrease();
}

// Stop generating random chat messages
function stopRandomChat() {
    chatActive = false;
    clearTimeout(chatTimer);
}

// Schedule the next random chat message
function scheduleNextChatMessage() {
    if (!chatActive) return;
    
    const delay = Math.floor(Math.random() * (MAX_CHAT_INTERVAL - MIN_CHAT_INTERVAL)) + MIN_CHAT_INTERVAL;
    
    chatTimer = setTimeout(() => {
        generateRandomChatMessage();
        scheduleNextChatMessage();
    }, delay);
}

// Generate a random chat message
function generateRandomChatMessage() {
    // Determine message type based on chance
    const messageType = Math.random();
    
    if (messageType < SUBSCRIPTION_CHANCE) {
        // Generate subscription message
        generateSubscriptionMessage();
    } else if (messageType < SUBSCRIPTION_CHANCE + CHEER_CHANCE) {
        // Generate cheer message
        generateCheerMessage();
    } else {
        // Generate regular message
        generateRegularMessage();
    }
}

// Generate a regular chat message
function generateRegularMessage() {
    const username = getRandomUsername();
    const colorIndex = Math.floor(Math.random() * 8) + 1; // 1-8 for username colors
    
    let message = getRandomSupportMessage();
    
    // Possibly add emoji
    if (Math.random() < EMOJI_CHANCE) {
        message += " " + getRandomEmoji();
    }
    
    addChatMessage(username, message, colorIndex);
}

// Generate a subscription message
function generateSubscriptionMessage() {
    const username = getRandomUsername();
    const subTier = Math.random() < 0.7 ? 1 : (Math.random() < 0.8 ? 2 : 3);
    const months = Math.floor(Math.random() * 24) + 1;
    let message;
    
    if (months === 1) {
        message = `Thanks for the new Tier ${subTier} subscription!`;
    } else {
        message = `Thanks for ${months} months at Tier ${subTier}!`;
    }
    
    // Play subscription sound
    if (soundEnabled) {
        playSound(document.getElementById('subscribeSound'));
    }
    
    // Create subscription message element
    const chatMessagesElement = document.getElementById('chatMessages');
    const messageElement = document.createElement('div');
    messageElement.className = 'subscription-message';
    messageElement.innerHTML = `${username} just subscribed! ${message}`;
    
    chatMessagesElement.appendChild(messageElement);
    scrollChatToBottom();
    
    // Manage chat history
    chatMessages.push({
        type: 'subscription',
        username,
        message,
        element: messageElement
    });
    
    limitChatHistory();
    
    // Trigger a small supernova for subscriptions
    if (gameRunning) {
        triggerSupernova(
            Math.random() * CANVAS_WIDTH, 
            Math.random() * (CANVAS_HEIGHT / 2)
        );
    }
}

// Generate a cheer/bits message
function generateCheerMessage() {
    const username = getRandomUsername();
    const colorIndex = Math.floor(Math.random() * 8) + 1; // 1-8 for username colors
    const bits = [100, 500, 1000, 5000, 10000][Math.floor(Math.random() * 5)];
    
    const message = `Cheered ${bits} bits!`;
    
    // Create cheer message element
    const chatMessagesElement = document.getElementById('chatMessages');
    const messageElement = document.createElement('div');
    messageElement.className = 'cheer-message';
    messageElement.innerHTML = `
        <span class="message-username username-color-${colorIndex}">${username}</span>: 
        <span class="message-content">${message}</span>
    `;
    
    chatMessagesElement.appendChild(messageElement);
    scrollChatToBottom();
    
    // Manage chat history
    chatMessages.push({
        type: 'cheer',
        username,
        message,
        element: messageElement
    });
    
    limitChatHistory();
}

// Add a chat message to the display
function addChatMessage(username, message, colorIndex) {
    const chatMessagesElement = document.getElementById('chatMessages');
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';
    messageElement.innerHTML = `
        <span class="message-username username-color-${colorIndex}">${username}</span>: 
        <span class="message-content">${message}</span>
    `;
    
    chatMessagesElement.appendChild(messageElement);
    scrollChatToBottom();
    
    // Manage chat history
    chatMessages.push({
        type: 'regular',
        username,
        message,
        element: messageElement
    });
    
    limitChatHistory();
}

// Limit the chat history to prevent memory issues
function limitChatHistory() {
    if (chatMessages.length > MAX_CHAT_MESSAGES) {
        const oldestMessage = chatMessages.shift();
        if (oldestMessage.element && oldestMessage.element.parentNode) {
            oldestMessage.element.parentNode.removeChild(oldestMessage.element);
        }
    }
}

// Scroll chat to bottom
function scrollChatToBottom() {
    const chatMessagesElement = document.getElementById('chatMessages');
    chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
}

// Get a random username from the list
function getRandomUsername() {
    return chatUsernames[Math.floor(Math.random() * chatUsernames.length)];
}

// Get a random supportive message
function getRandomSupportMessage() {
    const messages = [
        "Nice bounce!",
        "You're killing it!",
        "Let's go!",
        "That was so close!",
        "You can do better!",
        "I believe in you!",
        "Wow, amazing skills!",
        "Keep going!",
        "New high score soon?",
        "I love this game!",
        "Just a bit higher!",
        "This is so fun to watch!",
        "Incredible moves!",
        "You make it look easy!",
        "Bounce it like a pro!",
        "You're my favorite player!",
        "Can we get some hype?",
        "Never seen better bouncing!",
        "This is better than Twitch Plays Pokémon!",
        "Clutch play!",
        "Absolutely perfect!",
        "That was insane!",
        "Mind blown!",
        "Just donated 5 dollars!",
        "What's your strategy?",
        "How long have you been playing?",
        "I want to see 100 points!",
        "Try moving faster!",
        "Slower movements might help!",
        "Precision is key!",
        "This reminds me of IK+ on C64!",
        "Retro games are the best!",
        "The nostalgia is real!"
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
}

// Get a random emoji
function getRandomEmoji() {
    const emojis = [
        "😊", "😂", "🤣", "❤️", "👍", "🔥", "😍", "🚀", "💯", "🙌", "👏", 
        "💪", "🎮", "🎯", "🏆", "⚡", "💫", "🌟", "✨", "💥", "🤔", "😱"
    ];
    
    return emojis[Math.floor(Math.random() * emojis.length)];
}

// Start slowly increasing viewer count over time
function startViewerCountIncrease() {
    setInterval(() => {
        // 60% chance to increase, 40% chance to decrease
        if (Math.random() < 0.6) {
            viewerCount += Math.floor(Math.random() * 5) + 1;
        } else {
            viewerCount -= Math.floor(Math.random() * 3) + 1;
        }
        
        // Ensure viewer count stays within reasonable limits
        viewerCount = Math.max(100, Math.min(viewerCount, 10000));
        
        updateViewerCount();
    }, 5000); // Update every 5 seconds
}

// Update viewer count display
function updateViewerCount() {
    // Update the DOM element if it exists (for backward compatibility)
    const viewerCountElement = document.getElementById('viewerCount');
    if (viewerCountElement) {
        viewerCountElement.textContent = viewerCount.toLocaleString();
    }
    // The canvas display will automatically update in the next animation frame
}

// Generate messages when game ends
function generateGameOverChatMessages() {
    setTimeout(() => {
        addChatMessage("Nightbot", "Game over! Final score: " + score, 2);
    }, 500);
    
    // Add several random reactions
    const reactions = [
        "gg!",
        "So close!",
        "Nice try!",
        "Better luck next time!",
        "That was awesome!",
        "Great game!",
        "Almost had it!",
        "Wow, that was intense!",
        "I believe in you!"
    ];
    
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            const username = getRandomUsername();
            const colorIndex = Math.floor(Math.random() * 8) + 1;
            const message = reactions[Math.floor(Math.random() * reactions.length)];
            addChatMessage(username, message, colorIndex);
        }, 1000 + i * 300);
    }
}

// Draw game over screen with animations
function drawGameOverScreen() {
    const currentTime = Date.now();
    const animationProgress = Math.min(1, (currentTime - gameOverAnimationStart) / GAME_OVER_ANIMATION_DURATION);
    
    // Dark overlay with fade-in effect
    ctx.fillStyle = `rgba(0, 0, 0, ${0.8 * animationProgress})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw "GAME OVER" text with animation
    ctx.save();
    
    // Scale and alpha animation
    const textScale = 0.5 + 0.5 * animationProgress;
    const textAlpha = animationProgress;
    
    // Set text properties
    ctx.globalAlpha = textAlpha;
    ctx.fillStyle = '#ff3333';
    ctx.font = `${Math.floor(50 * textScale)}px "Press Start 2P", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Add text shadow for dramatic effect
    ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
    ctx.shadowBlur = 20 * animationProgress;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Draw main text
    ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);
    
    // Reset shadow for other text
    ctx.shadowBlur = 0;
    ctx.globalAlpha = textAlpha * 0.9;
    
    // Draw score information
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.floor(24 * textScale)}px "Press Start 2P", monospace`;
    ctx.fillText(`Final Score: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
    
    // Show high score if this was a high score
    if (score >= highScore) {
        ctx.fillStyle = '#ffff00';
        ctx.fillText(`New High Score!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
    } else {
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText(`High Score: ${highScore}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
    }
    
    // Instruction text
    if (animationProgress > 0.7) {
        const fadeIn = (animationProgress - 0.7) / 0.3;
        ctx.globalAlpha = fadeIn;
        ctx.fillStyle = '#88ccff';
        ctx.font = '18px "Press Start 2P", monospace';
        ctx.fillText('Press SPACE to play again', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 120);
    }
    
    ctx.restore();
    
    // Random stars falling effect
    if (gameOverEffectsActive && animationProgress < 0.9) {
        drawGameOverStars(animationProgress);
    }
}

// Draw falling stars effect for game over screen
function drawGameOverStars(progress) {
    const maxStars = 20;
    ctx.save();
    
    for (let i = 0; i < maxStars; i++) {
        // Use i and progress to ensure deterministic but varied positions
        const seed = (i * 0.1 + progress) % 1;
        const x = CANVAS_WIDTH * (i / maxStars) + Math.sin(progress * 5 + i) * 50;
        const y = CANVAS_HEIGHT * seed;
        
        // Size based on position (stars further "away" are smaller)
        const size = 1 + Math.random() * 3 * progress;
        
        // Color based on position
        const hue = (240 + i * 20) % 360; // blue-ish
        ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${0.7 + 0.3 * Math.sin(progress * 10 + i)})`;
        
        // Draw star
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw trail
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - Math.sin(progress * 5 + i) * 10, y - 20);
        ctx.strokeStyle = `hsla(${hue}, 100%, 70%, 0.3)`;
        ctx.lineWidth = size / 2;
        ctx.stroke();
    }
    
    ctx.restore();
}

// Load ball image
function loadBallImage() {
    ball.image = new Image();
    ball.imageLoaded = false;
    
    ball.image.onload = () => {
        ball.imageLoaded = true;
        console.log('Ball image loaded successfully');
    };
    
    ball.image.onerror = (err) => {
        console.error('Error loading ball image:', err);
        ball.imageLoaded = false;
    };
    
    ball.image.src = 'assets/enemies/bug-in-sphere.svg';
    
    // Try fetch approach for SVG similar to character loading
    fetch('assets/enemies/bug-in-sphere.svg')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(svgContent => {
            // Create a data URL from the SVG content
            const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgContent);
            ball.image.src = dataUrl;
            console.log('Ball SVG loaded via fetch and converted to data URL');
        })
        .catch(error => {
            console.error('Error fetching ball SVG:', error);
            // Direct src assignment is already done above as fallback
        });
}

// Create a new particle
function createParticle() {
    const size = Math.random() * (PARTICLE_SIZE_MAX - PARTICLE_SIZE_MIN) + PARTICLE_SIZE_MIN;
    const speed = Math.random() * (PARTICLE_SPEED_MAX - PARTICLE_SPEED_MIN) + PARTICLE_SPEED_MIN;
    const lifetime = Math.floor(Math.random() * (PARTICLE_LIFETIME_MAX - PARTICLE_LIFETIME_MIN)) + PARTICLE_LIFETIME_MIN;
    const color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
    
    // Calculate the hover-adjusted position
    const hoveredY = player.y + player.hoverOffset;
    
    // Position at the bottom center of the player with hover offset
    const x = player.x + player.width / 2;
    const y = hoveredY + player.height;
    
    // Random horizontal velocity with slight downward tendency
    const vx = (Math.random() - 0.5) * 2;
    const vy = speed * 0.8; // Positive velocity for downward movement
    
    return {
        x,
        y,
        vx,
        vy,
        size,
        color,
        lifetime,
        maxLifetime: lifetime,
        alpha: 1
    };
}

// Update particles
function updateParticles() {
    // Generate new particles if we have fewer than the maximum
    if (particles.length < PARTICLE_COUNT && gameRunning) {
        particles.push(createParticle());
    }
    
    // Update existing particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        
        // Move particle
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Slightly increase vertical velocity (gravity acceleration)
        particle.vy += 0.05;
        
        // Decrease lifetime
        particle.lifetime--;
        
        // Update alpha based on remaining lifetime
        particle.alpha = particle.lifetime / particle.maxLifetime;
        
        // Remove dead particles
        if (particle.lifetime <= 0) {
            particles.splice(i, 1);
        }
    }
    
    // Update player hover effect
    player.hoverOffset = Math.sin(Date.now() * player.hoverSpeed) * player.hoverHeight;
}

// Draw particles
function drawParticles() {
    for (const particle of particles) {
        ctx.globalAlpha = particle.alpha;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// Start continuous recording of gameplay
function startContinuousRecording() {
    // If already recording, don't start again
    if (isRecording) {
        console.log('Already recording');
        return;
    }
    
    // Reset recording state
    recordedChunks = [];
    
    // Get the canvas
    const canvas = document.getElementById('gameCanvas');
    
    try {
        // Try to create canvas stream - this might fail if canvas is not origin-clean
        let canvasStream;
        
        try {
            canvasStream = canvas.captureStream(30); // 30 FPS
            console.log('Canvas stream created with tracks:', canvasStream.getTracks().length);
        } catch (err) {
            console.error('Canvas captureStream failed:', err);
            showNotification('Cannot record: Canvas security restriction. Try playing in a local server environment.', 'error');
            return;
        }
        
        // Optimize video track for better quality and less artifacts
        canvasStream.getVideoTracks().forEach(track => {
            // Apply constraints to video track if possible
            if (track.applyConstraints) {
                try {
                    // Request higher quality settings
                    track.applyConstraints({
                        width: CANVAS_WIDTH,
                        height: CANVAS_HEIGHT,
                        frameRate: 30
                    });
                    console.log('Applied video constraints for better quality');
                } catch (err) {
                    console.warn('Could not apply video constraints:', err);
                }
            }
        });
        
        // Create a new stream that combines the canvas video and audio
        const combinedStream = new MediaStream();
        
        // Add all video tracks from the canvas stream
        canvasStream.getVideoTracks().forEach(track => {
            combinedStream.addTrack(track);
            console.log('Added video track to combined stream');
        });
        
        // Add audio tracks if we have our shared audio destination
        if (audioContext && audioDestination) {
            const audioTracks = audioDestination.stream.getAudioTracks();
            console.log('Audio tracks from shared audio destination:', audioTracks.length);
            
            audioTracks.forEach(track => {
                combinedStream.addTrack(track);
                console.log('Added audio track to combined stream from shared audio context');
            });
        } else {
            console.warn('No shared audio context available, recording will not have audio');
            
            // Add a silent audio track as fallback if we don't have audioContext
            try {
                // Create a temporary audio context just for the silent track
                const tempAudioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.log('Created temporary AudioContext for silent track');
                
                // Create an oscillator for silent audio
                const oscillator = tempAudioContext.createOscillator();
                const gainNode = tempAudioContext.createGain();
                gainNode.gain.value = 0.001; // Nearly silent
                oscillator.connect(gainNode);
                
                const silentDestination = tempAudioContext.createMediaStreamDestination();
                gainNode.connect(silentDestination);
                
                // Start the oscillator
                oscillator.start();
                
                // Add the silent audio track
                const silentTrack = silentDestination.stream.getAudioTracks()[0];
                if (silentTrack) {
                    combinedStream.addTrack(silentTrack);
                    console.log('Added silent audio track as fallback');
                }
            } catch (err) {
                console.warn('Failed to add silent audio track:', err);
            }
        }
        
        // Remember the stream for later use
        recordingStream = combinedStream;
        
        // Check for supported MIME types with H.264 prioritized
        const mimeTypes = [
            // H.264 formats prioritized first
            'video/mp4;codecs=avc1.42E01E,mp4a.40.2', // H.264 with AAC audio
            'video/mp4;codecs=avc1.42E01E', // H.264 video only
            'video/webm;codecs=h264,opus', // WebM container with H.264 video
            'video/webm;codecs=h264', // WebM container with H.264 video only
            // Additional H.264 profiles for better compatibility
            'video/mp4;codecs=avc1.4D401E,mp4a.40.2', // High profile
            'video/mp4;codecs=avc1.64001E,mp4a.40.2', // High profile
            // Fallback to VP8/VP9 if H.264 not available
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm',
            'video/mp4'
        ];
        
        // Try to find a supported H.264 codec first
        let selectedMimeType = '';
        let isH264 = false;
        
        console.log('Checking supported MIME types with H.264 priority:');
        for (const type of mimeTypes) {
            const supported = MediaRecorder.isTypeSupported(type);
            console.log(`${type}: ${supported ? 'SUPPORTED' : 'NOT SUPPORTED'}`);
            
            if (supported && !selectedMimeType) {
                selectedMimeType = type;
                isH264 = type.includes('avc1') || type.includes('h264');
                if (isH264) {
                    console.log('✓ Selected H.264 codec: ' + type);
                    break; // We found H.264, stop searching
                }
            }
        }
        
        if (!selectedMimeType) {
            console.warn('No supported MIME types found, using default');
            selectedMimeType = '';
        } else if (!isH264) {
            console.warn('H.264 not supported by this browser, using fallback: ' + selectedMimeType);
        }
        
        // Use higher bitrate for better quality with H.264
        const options = selectedMimeType ? { 
            mimeType: selectedMimeType,
            videoBitsPerSecond: isH264 ? 5000000 : 2500000, // Higher bitrate to reduce artifacts (5Mbps for H.264, 2.5Mbps for others)
            audioBitsPerSecond: 128000 // 128kbps for audio
        } : {};
        
        console.log('Creating MediaRecorder with options:', options);
        
        // Create a new MediaRecorder with the combined stream
        mediaRecorder = new MediaRecorder(combinedStream, options);
        console.log('MediaRecorder created with MIME type:', mediaRecorder.mimeType);
        
        // Show codec information
        const codecName = mediaRecorder.mimeType.includes('avc1') || mediaRecorder.mimeType.includes('h264') 
            ? 'H.264' 
            : mediaRecorder.mimeType.includes('vp9') 
                ? 'VP9' 
                : mediaRecorder.mimeType.includes('vp8') 
                    ? 'VP8' 
                    : 'Default';
        
        // Set up event handlers
        mediaRecorder.ondataavailable = function(e) {
            console.log('Data available event triggered, data size:', e.data.size);
            if (e.data && e.data.size > 0) {
                recordedChunks.push(e.data);
                console.log('Recorded chunks now:', recordedChunks.length);
            }
        };
        
        mediaRecorder.onstop = function() {
            console.log('MediaRecorder stopped, processing chunks...');
            
            if (recordedChunks.length === 0) {
                console.error('No chunks recorded!');
                showNotification('No recording data captured', 'error');
                return;
            }
            
            // Create a blob when recording is complete
            const blob = new Blob(recordedChunks, {
                type: mediaRecorder.mimeType
            });
            
            console.log('Created blob of type:', mediaRecorder.mimeType, 'size:', blob.size);
            
            // Save this as the last recording
            lastRecordingBlob = blob;
            
            // Get codec info for notification
            const codecInfo = mediaRecorder.mimeType.includes('avc1') || mediaRecorder.mimeType.includes('h264') 
                ? 'H.264' 
                : mediaRecorder.mimeType.includes('vp9') 
                    ? 'VP9' 
                    : mediaRecorder.mimeType.includes('vp8') 
                        ? 'VP8' 
                        : 'Default';
            
            showNotification(`Recording saved! (${codecInfo} codec)`, 'success');
        };
        
        mediaRecorder.onerror = function(event) {
            console.error('MediaRecorder error:', event);
            showNotification('Recording error: ' + event.name, 'error');
        };
        
        // Start recording with larger chunks for better encoding
        mediaRecorder.start(2000); // Collect data in 2-second chunks (more efficient encoding)
        isRecording = true;
        recordingTimeStart = Date.now();
        
        console.log('MediaRecorder started in state:', mediaRecorder.state);
        showNotification(`Game recording started (${codecName} codec)`, 'info');
    } catch (err) {
        console.error('Error starting recording:', err);
        showNotification('Could not start recording: ' + err.message, 'error');
        
        // Reset recording state on error
        isRecording = false;
        autoRecordingEnabled = false;
        
        // Update UI to reflect disabled state
        const toggleRecordingBtn = document.getElementById('toggleRecordingBtn');
        if (toggleRecordingBtn) {
            toggleRecordingBtn.textContent = 'Enable Recording';
            toggleRecordingBtn.classList.remove('recording');
        }
    }
}

// Download the current recording buffer
function downloadRecording() {
    if (!lastRecordingBlob) {
        showNotification('No recording available to download', 'error');
        return;
    }

    console.log('Downloading recording, blob size:', lastRecordingBlob.size, 'type:', lastRecordingBlob.type);
    
    try {
        // Create a URL for the recording blob
        const url = URL.createObjectURL(lastRecordingBlob);
        
        // Determine file extension based on MIME type
        let fileExtension = 'webm'; // Default extension
        let isH264 = false;
        
        if (lastRecordingBlob.type.includes('mp4') || 
            lastRecordingBlob.type.includes('avc1') || 
            lastRecordingBlob.type.includes('h264')) {
            fileExtension = 'mp4';
            isH264 = true;
        }
        
        // Codec info for display
        const codecInfo = isH264 ? 'H.264' : 
                        lastRecordingBlob.type.includes('vp9') ? 'VP9' : 
                        lastRecordingBlob.type.includes('vp8') ? 'VP8' : 'Default';
        
        // Create a temporary link element to trigger the download
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `game-recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.${fileExtension}`;
        
        // Add to the DOM and trigger the download
        document.body.appendChild(a);
        a.click();
        
        // Clean up by removing the link and revoking the URL
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showNotification(`Download complete! (${codecInfo} codec, ${fileExtension} format)`, 'success');
        }, 100);
    } catch (err) {
        console.error('Error downloading recording:', err);
        showNotification('Download failed: ' + err.message, 'error');
    }
}

function stopRecording(download = true) {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        console.log('No active recording to stop');
        return;
    }

    console.log('Stopping recording, current state:', mediaRecorder.state);
    
    try {
        // First set the flag to prevent confusion
        isRecording = false;
        
        // Request final data for any pending frames
        mediaRecorder.requestData();
        
        // Then stop the recorder
        mediaRecorder.stop();
        
        console.log('MediaRecorder successfully stopped');
        
        // If download is requested, we'll do it once the onstop event has fired
        if (download) {
            // We'll add a small delay to ensure the onstop handler has completed
            setTimeout(() => {
                if (lastRecordingBlob) {
                    downloadRecording();
                } else {
                    console.warn('Recording blob not available yet, waiting...');
                    // Try again after a slightly longer delay
                    setTimeout(() => {
                        if (lastRecordingBlob) {
                            downloadRecording();
                        } else {
                            showNotification('Recording processing failed', 'error');
                        }
                    }, 1000);
                }
            }, 500);
        }
    } catch (err) {
        console.error('Error stopping recording:', err);
        showNotification('Failed to stop recording: ' + err.message, 'error');
    }
}

// Draw recording indicator
function drawRecordingIndicator() {
    if (isRecording) {
        ctx.save();
        
        // Draw a red circle with animation to indicate recording
        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.arc(20, canvas.height - 20, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw "REC" text
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('REC', 35, canvas.height - 15);
        
        ctx.restore();
    }
}

// Draw scoreboard information on the canvas
function drawScoreboardOnCanvas() {
    ctx.save();
    
    // Set common text properties
    ctx.font = '16px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#ffffff';
    
    // Add a semi-transparent background for better readability
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, 30);
    
    // Draw score
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Score: ' + score, 10, 8);
    
    // Draw high score
    ctx.textAlign = 'center';
    ctx.fillText('High Score: ' + highScore, CANVAS_WIDTH / 2, 8);
    
    // Draw sound status
    ctx.textAlign = 'right';
    ctx.fillText('Sound: ', CANVAS_WIDTH - 50, 8);
    
    // Use green for ON, red for OFF
    ctx.fillStyle = soundEnabled ? '#0f0' : '#f00';
    ctx.fillText(soundEnabled ? 'ON' : 'OFF', CANVAS_WIDTH - 10, 8);
    
    // Draw viewer count with red color for emphasis
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ff3333';
    ctx.fillText(viewerCount.toLocaleString() + ' viewers', CANVAS_WIDTH - 10, CANVAS_HEIGHT - 25);
    
    ctx.restore();
}

// Utility function to show notifications
function showNotification(message, type = "info") {
    // Remove any existing notification
    const existingNotification = document.querySelector('.recording-notification');
    if (existingNotification) {
        document.body.removeChild(existingNotification);
    }
    
    // Create new notification
    const notification = document.createElement('div');
    notification.className = `recording-notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remove notification after a delay (except for 'processing' type)
    if (type !== "processing") {
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 3000);
    }
    
    return notification;
} 

// Reduce visual artifacts during recording
function optimizeForRecording() {
    if (!isRecording) return;
    
    // Apply a very subtle anti-aliasing effect to the canvas during recording
    try {
        if (ctx) {
            // Save current settings
            ctx.save();
            
            // Enable image smoothing for better quality recording
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // Note: We don't restore immediately - the settings need to remain in effect
            // The ctx.restore() will happen at the end of drawGame()
        }
    } catch (err) {
        console.warn('Failed to optimize canvas for recording:', err);
    }
}

// Track movement intensity to help reduce motion artifacts
let lastBallPosition = { x: 0, y: 0 };
let movementIntensity = 0;

// Update the movement tracking
function updateMovementTracking() {
    if (!isRecording || !ball) return;
    
    // Calculate how much the ball has moved since last frame
    const deltaX = Math.abs(ball.x - lastBallPosition.x);
    const deltaY = Math.abs(ball.y - lastBallPosition.y);
    
    // Update movement intensity (0-1 scale)
    movementIntensity = Math.min(1, (deltaX + deltaY) / 20);
    
    // Update last position
    lastBallPosition.x = ball.x;
    lastBallPosition.y = ball.y;
    
    // In high-movement situations, we might want to apply additional smoothing
    if (movementIntensity > 0.7 && ctx) {
        // Apply a slightly stronger blur effect during high-movement scenes
        ctx.filter = 'blur(0.5px)';
        console.log('Applied motion blur for high-movement scene');
    } else if (ctx) {
        ctx.filter = 'none';
    }
}

// Toggle recording on/off
function toggleRecording() {
    autoRecordingEnabled = !autoRecordingEnabled;
    
    if (autoRecordingEnabled) {
        // Start recording if it wasn't already recording
        if (!isRecording) {
            startContinuousRecording();
        }
        document.getElementById('toggleRecordingBtn').textContent = 'Disable Recording';
        document.getElementById('toggleRecordingBtn').classList.add('recording');
    } else {
        // Stop recording if it was recording
        if (isRecording) {
            stopRecording(false); // Stop without downloading
        }
        document.getElementById('toggleRecordingBtn').textContent = 'Enable Recording';
        document.getElementById('toggleRecordingBtn').classList.remove('recording');
    }
}

// Handle touch start
function handleTouchStart(e) {
    e.preventDefault(); // Prevent scrolling when touching the canvas
    
    // Try to resume AudioContext on touch (for sound on mobile)
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            console.log('AudioContext resumed by touch');
        }).catch(err => {
            console.error('Failed to resume AudioContext:', err);
        });
    }
    
    const touch = e.touches[0];
    // Convert touch position to canvas coordinates
    const canvasRect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / canvasRect.width;
    touchStartX = (touch.clientX - canvasRect.left) * scaleX;
    
    isTouching = true;
    
    // Determine movement based on which side of the canvas was touched
    const canvasMidPoint = canvas.width / 2;
    
    // Reset player movement first
    player.isMovingLeft = false;
    player.isMovingRight = false;
    
    // If touch is on left half of canvas, move left
    if (touchStartX < canvasMidPoint) {
        player.isMovingLeft = true;
        player.isMovingRight = false;
    } 
    // If touch is on right half of canvas, move right
    else {
        player.isMovingRight = true;
        player.isMovingLeft = false;
    }
}

// Handle touch move
function handleTouchMove(e) {
    if (!isTouching) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    // Convert touch position to canvas coordinates
    const canvasRect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / canvasRect.width;
    const touchCurrentX = (touch.clientX - canvasRect.left) * scaleX;
    
    // Determine movement based on current touch position
    const canvasMidPoint = canvas.width / 2;
    
    // Reset player movement first
    player.isMovingLeft = false;
    player.isMovingRight = false;
    
    // If touch is on left half of canvas, move left
    if (touchCurrentX < canvasMidPoint) {
        player.isMovingLeft = true;
        player.isMovingRight = false;
    } 
    // If touch is on right half of canvas, move right
    else {
        player.isMovingRight = true;
        player.isMovingLeft = false;
    }
}

// Handle touch end
function handleTouchEnd(e) {
    e.preventDefault();
    isTouching = false;
    player.isMovingLeft = false;
    player.isMovingRight = false;
}

// Handle touch restart for game over
function handleTouchRestart(e) {
    // Only handle restart touch when game is over
    if (gameOver) {
        e.preventDefault(); // Prevent default touch behavior
        
        // Try to resume AudioContext on touch restart (for sound on mobile)
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('AudioContext resumed by touch restart');
            }).catch(err => {
                console.error('Failed to resume AudioContext:', err);
            });
        }
        
        startGameWithCharacter();
    }
}

// Toggle fullscreen mode
function toggleFullscreen() {
    const gameContainer = document.querySelector('.game-container');
    const gameCanvas = document.getElementById('gameCanvas');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const controlsElements = document.querySelectorAll('.game-area > *:not(#gameCanvas)');
    const chatContainer = document.querySelector('.chat-container');
    
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        // Enter fullscreen
        if (gameContainer.requestFullscreen) {
            gameContainer.requestFullscreen().catch(err => {
                console.warn(`Error attempting to enable fullscreen mode: ${err.message}`);
            });
        } else if (gameContainer.webkitRequestFullscreen) { // Safari
            gameContainer.webkitRequestFullscreen();
        }
        
        // Hide all UI elements except canvas and fullscreen button
        controlsElements.forEach(element => {
            if (element !== fullscreenBtn && !element.contains(fullscreenBtn)) {
                element.classList.add('fullscreen-hidden');
            }
        });
        
        // Hide chat container
        if (chatContainer) {
            chatContainer.classList.add('fullscreen-hidden');
        }
        
        // Reposition fullscreen button over canvas
        fullscreenBtn.classList.add('fullscreen-floating');
        
        // Update button text
        fullscreenBtn.textContent = 'Exit Fullscreen';
    } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { // Safari
            document.webkitExitFullscreen();
        }
        
        // Show all UI elements again
        controlsElements.forEach(element => {
            element.classList.remove('fullscreen-hidden');
        });
        
        // Show chat container
        if (chatContainer) {
            chatContainer.classList.remove('fullscreen-hidden');
        }
        
        // Return fullscreen button to normal position
        fullscreenBtn.classList.remove('fullscreen-floating');
        
        // Update button text
        fullscreenBtn.textContent = 'Fullscreen';
    }
    
    // Update canvas size after fullscreen change
    setTimeout(handleCanvasResize, 100);
}

// Listen for fullscreen changes
document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

// Handle fullscreen change
function handleFullscreenChange() {
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const controlsElements = document.querySelectorAll('.game-area > *:not(#gameCanvas)');
    const chatContainer = document.querySelector('.chat-container');
    
    if (document.fullscreenElement || document.webkitFullscreenElement) {
        // Entered fullscreen
        fullscreenBtn.textContent = 'Exit Fullscreen';
        
        // Hide all UI elements except canvas and fullscreen button
        controlsElements.forEach(element => {
            if (element !== fullscreenBtn && !element.contains(fullscreenBtn)) {
                element.classList.add('fullscreen-hidden');
            }
        });
        
        // Hide chat container
        if (chatContainer) {
            chatContainer.classList.add('fullscreen-hidden');
        }
        
        // Reposition fullscreen button over canvas
        fullscreenBtn.classList.add('fullscreen-floating');
    } else {
        // Exited fullscreen
        fullscreenBtn.textContent = 'Fullscreen';
        
        // Show all UI elements again
        controlsElements.forEach(element => {
            element.classList.remove('fullscreen-hidden');
        });
        
        // Show chat container
        if (chatContainer) {
            chatContainer.classList.remove('fullscreen-hidden');
        }
        
        // Return fullscreen button to normal position
        fullscreenBtn.classList.remove('fullscreen-floating');
    }
    
    // Update canvas size
    handleCanvasResize();
}
