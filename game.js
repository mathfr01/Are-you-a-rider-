let gameInitialized = false;
let gamePaused = false; // Added for future pause functionality

// Declare Three.js related variables in a broader scope so initThreeJSGame can access them
// These will be initialized within initThreeJSGame
let scene, camera, renderer, rider, clock, font;
let activeLetters = [];
let playerScore = 3; // Initial score, can be reset in init or game over
let RIDER_SPEED = 5; // Can be adjusted
const SPAWN_DISTANCE_AHEAD = 20;
// 1. Modify middleRowKeys to Lowercase
const middleRowKeys = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'];
let cameraOffsetZ, cameraOffsetY; // Will be set in initThreeJSGame

// DOM elements that are part of the game UI (not landing screen)
let scoreDisplay;
let gameCanvasContainer; // Define here, initialize in window.onload

window.onload = function() {
    // DOM Element References for Landing Screen & Controls
    const nameInput = document.getElementById('nameInput');
    const saveNameButton = document.getElementById('saveNameButton');
    const displayNameElement = document.getElementById('displayName');
    const landingScreen = document.getElementById('landingScreen');
    gameCanvasContainer = document.getElementById('gameCanvasContainer'); // Initialized here
    const gameInfo = document.getElementById('gameInfo');
    const playGameButton = document.getElementById('playGameButton');
    const pauseButton = document.getElementById('pauseButton');
    
    // Initialize scoreDisplay here as it's part of gameInfo
    scoreDisplay = document.getElementById('scoreValue'); 


    // Load and Display Name on Initial Load
    const savedName = localStorage.getItem('riderName');
    if (savedName) {
        if (displayNameElement) displayNameElement.textContent = 'Welcome back, ' + savedName + '!';
        if (nameInput) nameInput.value = savedName;
        if (playGameButton) playGameButton.style.display = 'inline-block';
    }

    // Event Listener for "Save Name" (Login/Register) Button
    if (saveNameButton) {
        saveNameButton.addEventListener('click', function() {
            if (nameInput && displayNameElement) {
                const currentName = nameInput.value.trim();
                if (currentName) {
                    localStorage.setItem('riderName', currentName);
                    displayNameElement.textContent = 'Name saved: ' + currentName;
                    if (playGameButton) playGameButton.style.display = 'inline-block';
                    console.log('Name saved: ' + currentName);
                } else {
                    displayNameElement.textContent = 'Please enter a name.';
                }
            }
        });
    }

    // Event Listener for "Play Game" Button
    if (playGameButton) {
        playGameButton.addEventListener('click', function() {
            if (landingScreen) landingScreen.style.display = 'none';
            if (gameCanvasContainer) gameCanvasContainer.style.display = 'block';
            if (gameInfo) gameInfo.style.display = 'block'; // Or 'flex' etc.
            if (pauseButton) pauseButton.style.display = 'inline-block';

            // Full Screen Attempt for gameCanvasContainer
            if (gameCanvasContainer) {
                gameCanvasContainer.style.width = '100vw';
                gameCanvasContainer.style.height = 'calc(100vh - 40px)'; 
            }
            
            if (!gameInitialized) {
                initThreeJSGame(); 
                gameInitialized = true;
            } else {
                if (gamePaused) {
                    gamePaused = false; 
                    // animate(); // Already handled by pause button logic
                }
            }
        });
    }

    // Pause Button Logic (Basic)
    if (pauseButton) {
        pauseButton.addEventListener('click', function() {
            gamePaused = !gamePaused;
            if (gamePaused) {
                pauseButton.textContent = 'Resume';
                console.log("Game Paused");
            } else {
                pauseButton.textContent = 'Pause';
                console.log("Game Resumed");
                animate(); // Restart animation loop
            }
        });
    }
};

function initThreeJSGame() {
    console.log("Game Initializing...");

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, gameCanvasContainer.clientWidth / gameCanvasContainer.clientHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(gameCanvasContainer.clientWidth, gameCanvasContainer.clientHeight);
    if (gameCanvasContainer) {
        gameCanvasContainer.innerHTML = ''; 
        gameCanvasContainer.appendChild(renderer.domElement);
    }

    const plankWidth = 4, plankHeight = 0.2, plankDepth = 1000; 
    const plankGeometry = new THREE.BoxGeometry(plankWidth, plankHeight, plankDepth);
    const plankMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); 
    const plank = new THREE.Mesh(plankGeometry, plankMaterial);
    plank.position.set(0, 0, -plankDepth / 2);
    scene.add(plank);

    const riderSize = 1;
    const riderGeometry = new THREE.BoxGeometry(riderSize, riderSize, riderSize);
    const riderMaterial = new THREE.MeshStandardMaterial({ color: 0x0000FF }); 
    rider = new THREE.Mesh(riderGeometry, riderMaterial); 
    rider.position.set(0, (plankHeight / 2) + (riderSize / 2), -5);
    scene.add(rider);

    cameraOffsetZ = 5;
    cameraOffsetY = 2;
    camera.position.set(rider.position.x, rider.position.y + cameraOffsetY, rider.position.z + cameraOffsetZ);
    camera.lookAt(rider.position.x, rider.position.y, rider.position.z - 10);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); 
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 10, rider.position.z + 2);
    directionalLight.target = rider;
    scene.add(directionalLight);
    scene.add(directionalLight.target);

    clock = new THREE.Clock(); 
    updateScoreDisplay(); 

    const fontLoader = new THREE.FontLoader();
    fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function (loadedFont) {
        font = loadedFont; 
        console.log("Font loaded.");
        if (activeLetters.length === 0) { 
             spawnLetter(); 
        }
    }, undefined, function (error) {
        console.error('Font loading failed:', error);
    });

    document.addEventListener('keydown', onKeyPress);
    animate();
    window.addEventListener('resize', onGameResize);
    onGameResize(); 
}

function updateScoreDisplay() {
    if (scoreDisplay) { 
        scoreDisplay.textContent = playerScore;
    }
}

function spawnLetter() {
    if (!font) {
        console.log("Font not loaded yet, cannot spawn letter.");
        return;
    }
    if (activeLetters.length > 0) {
        scene.remove(activeLetters[0]);
        activeLetters = [];
    }
    // 2. Ensure TextGeometry Uses Lowercase (Implicitly confirmed)
    // The 'char' is taken directly from middleRowKeys, which is now lowercase.
    // No .toUpperCase() is applied here.
    const char = middleRowKeys[Math.floor(Math.random() * middleRowKeys.length)];
    const textGeometry = new THREE.TextGeometry(char, {
        font: font, size: 0.8, height: 0.1, curveSegments: 12, bevelEnabled: false
    });
    textGeometry.computeBoundingBox();
    const textWidth = textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x;
    textGeometry.translate(-textWidth / 2, 0, 0);
    const textMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFF00 }); 
    const letterMesh = new THREE.Mesh(textGeometry, textMaterial);
    letterMesh.userData.char = char; // Storing the char (now lowercase)
    const letterYPosition = 0 + (0.2 / 2) + 0.5; 
    const letterZPosition = rider.position.z - SPAWN_DISTANCE_AHEAD;
    letterMesh.position.set(0, letterYPosition, letterZPosition);
    scene.add(letterMesh);
    activeLetters.push(letterMesh);
    console.log(`Spawned letter: ${char} at z: ${letterZPosition.toFixed(2)}`);
}

function onKeyPress(event) {
    if (gamePaused || !font || activeLetters.length === 0) return;
    const currentLetter = activeLetters[0];
    // Note: event.key is case-sensitive. If 'A' is pressed, event.key is 'A'.
    // If 'a' is pressed, event.key is 'a'.
    // Since middleRowKeys are now lowercase, we expect lowercase input.
    const keyPressed = event.key; // No .toUpperCase()
    const expectedChar = currentLetter.userData.char; // This is lowercase from spawnLetter

    const collectionThreshold = 2; 
    if (Math.abs(rider.position.z - currentLetter.position.z) > collectionThreshold) return; 

    if (keyPressed === expectedChar) { // Direct comparison with lowercase
        console.log(`Correct key! You typed: ${keyPressed} for letter ${expectedChar}`);
        scene.remove(currentLetter);
        activeLetters = []; 
        // 3. Confirm Immediate Spawning (onKeyPress) - Confirmed
        spawnLetter(); 
    }
}

function animate() {
    if (gamePaused) {
        return;
    }
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    rider.position.z -= RIDER_SPEED * deltaTime;
    camera.position.z = rider.position.z + cameraOffsetZ;
    camera.position.x = rider.position.x;
    camera.lookAt(rider.position.x, rider.position.y, rider.position.z - 10);
    
    scene.children.forEach(child => {
        if (child instanceof THREE.DirectionalLight) {
            child.position.set(rider.position.x + 5, child.position.y, rider.position.z + 2);
            if (child.target === rider) { 
                 child.target.updateMatrixWorld(); 
            }
        }
    });

    if (font && activeLetters.length > 0) {
        const currentLetter = activeLetters[0];
        if (rider.position.z < currentLetter.position.z - 0.5) { 
            scene.remove(currentLetter);
            activeLetters = []; 
            playerScore--;
            updateScoreDisplay();
            console.log("Letter missed! Score: " + playerScore);
            if (playerScore <= 0) {
                alert("Game Over! Starting again.");
                playerScore = 3; 
                updateScoreDisplay();
            }
            // 3. Confirm Immediate Spawning (animate - miss logic) - Confirmed
            spawnLetter(); 
        }
    } else if (font && activeLetters.length === 0 && rider.position.z < -10) { 
        if (clock.elapsedTime > 1) { 
             spawnLetter();
        }
    }
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

function onGameResize() {
    if (gameCanvasContainer && renderer && camera) {
        const newWidth = gameCanvasContainer.clientWidth;
        const newHeight = gameCanvasContainer.clientHeight;
        if (newWidth > 0 && newHeight > 0) {
            camera.aspect = newWidth / newHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(newWidth, newHeight);
        }
    }
}
