let gameInitialized = false;
let gamePaused = false; // Added for future pause functionality

// Declare Three.js related variables in a broader scope so initThreeJSGame can access them
// These will be initialized within initThreeJSGame
let scene, camera, renderer, rider, clock, font;
let activeLetters = [];
let playerScore = 3; // Initial score, effectively 'chances'
let currentScore = 0; // Player's actual score
let gameLevel = 1;    // Current game level
let RIDER_SPEED = 5; // Can be adjusted
const SPAWN_DISTANCE_AHEAD = 20;
// 1. Modify middleRowKeys to Lowercase
const middleRowKeys = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'];
let cameraOffsetZ, cameraOffsetY; // Will be set in initThreeJSGame

// HUD Sprite Variables
let chancesLabelSprite, chancesValueSprite;
let levelLabelSprite, levelValueSprite;
let scoreLabelSprite, scoreValueSprite;
let hudElements = new THREE.Group(); // Group for all HUD elements
let feedbackMessageSprite = null; // For "Correct!" / "Wrong Key!" messages
let feedbackTimeout = null;       // Timeout ID for feedback messages

// DOM elements that are part of the game UI (not landing screen)
let scoreDisplay; // This is the old HTML score display
let feedbackDisplay; // This is the old HTML feedback display (now superseded by sprite feedback)
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
    
    scoreDisplay = document.getElementById('scoreValue'); 
    feedbackDisplay = document.getElementById('feedbackMessage'); // Old HTML feedback


    const savedName = localStorage.getItem('riderName');
    if (savedName) {
        if (displayNameElement) displayNameElement.textContent = 'Welcome back, ' + savedName + '!';
        if (nameInput) nameInput.value = savedName;
        if (playGameButton) playGameButton.style.display = 'inline-block';
    }

    if (saveNameButton) {
        saveNameButton.addEventListener('click', function() {
            if (nameInput && displayNameElement) {
                const currentName = nameInput.value.trim();
                if (currentName) {
                    localStorage.setItem('riderName', currentName);
                    displayNameElement.textContent = 'Name saved: ' + currentName;
                    if (playGameButton) playGameButton.style.display = 'inline-block';
                } else {
                    displayNameElement.textContent = 'Please enter a name.';
                }
            }
        });
    }

    if (playGameButton) {
        playGameButton.addEventListener('click', function() {
            if (landingScreen) landingScreen.style.display = 'none';
            if (gameCanvasContainer) gameCanvasContainer.style.display = 'block';
            if (gameInfo) gameInfo.style.display = 'block'; 
            if (pauseButton) pauseButton.style.display = 'inline-block';

            if (gameCanvasContainer) {
                gameCanvasContainer.style.width = '100vw';
                gameCanvasContainer.style.height = 'calc(100vh - 40px)'; 
            }
            
            if (!gameInitialized) {
                initThreeJSGame(); 
                gameInitialized = true;
            } else {
                if (gamePaused) gamePaused = false; 
                playerScore = 3;
                currentScore = 0;
                gameLevel = 1;
                if(camera) { 
                    initHUD(); 
                    updateHUD();
                    clearFeedbackMessage(); // Clear any lingering feedback from previous session
                }
                 // Reset rider position if game is re-entered
                if (rider) rider.position.set(0, riderSize / 2, -5);
            }
        });
    }

    if (pauseButton) {
        pauseButton.addEventListener('click', function() {
            gamePaused = !gamePaused;
            if (gamePaused) {
                pauseButton.textContent = 'Resume';
            } else {
                pauseButton.textContent = 'Pause';
                animate(); 
            }
        });
    }
};

const riderSize = 1; 
const groundSize = 200; 
const grassStripWidth = 50; 

function initThreeJSGame() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); 

    camera = new THREE.PerspectiveCamera(75, gameCanvasContainer.clientWidth / gameCanvasContainer.clientHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(gameCanvasContainer.clientWidth, gameCanvasContainer.clientHeight);
    if (gameCanvasContainer) {
        gameCanvasContainer.innerHTML = ''; 
        gameCanvasContainer.appendChild(renderer.domElement);
    }

    const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 }); 
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2; 
    groundMesh.position.y = 0; 
    scene.add(groundMesh);

    const grassGeometry = new THREE.PlaneGeometry(grassStripWidth, groundSize);
    const grassMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 }); 

    const grassPatch1 = new THREE.Mesh(grassGeometry, grassMaterial);
    grassPatch1.rotation.x = -Math.PI / 2;
    grassPatch1.position.set((groundSize / 2) + (grassStripWidth / 2), -0.05, 0); 
    scene.add(grassPatch1);

    const grassPatch2 = new THREE.Mesh(grassGeometry, grassMaterial);
    grassPatch2.rotation.x = -Math.PI / 2;
    grassPatch2.position.set(-(groundSize / 2) - (grassStripWidth / 2), -0.05, 0); 
    scene.add(grassPatch2);
    
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xA9A9A9 }); 
    const wallHeight = 0.5; 
    const wallThickness = 0.3;

    const backWallGeometry = new THREE.BoxGeometry(groundSize + 2 * grassStripWidth, wallHeight, wallThickness);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(0, wallHeight / 2, -(groundSize / 2) - (wallThickness / 2));
    scene.add(backWall);

    const frontBoundaryGeometry = new THREE.BoxGeometry(groundSize + 2 * grassStripWidth, 0.1, wallThickness * 2);
    const frontBoundary = new THREE.Mesh(frontBoundaryGeometry, wallMaterial);
    frontBoundary.position.set(0, 0.1 / 2, (groundSize / 2) + (wallThickness * 2 / 2));
    scene.add(frontBoundary);

    const sideWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, groundSize); 
    
    const sideWall1 = new THREE.Mesh(sideWallGeometry, wallMaterial);
    sideWall1.position.set((groundSize/2) + grassStripWidth + (wallThickness/2), wallHeight/2, 0);
    scene.add(sideWall1);

    const sideWall2 = new THREE.Mesh(sideWallGeometry, wallMaterial);
    sideWall2.position.set(-(groundSize/2) - grassStripWidth - (wallThickness/2), wallHeight/2, 0);
    scene.add(sideWall2);

    const brownMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); 

    const picnicTable1 = new THREE.Group();
    const tableTopGeo = new THREE.BoxGeometry(2.5, 0.15, 1); 
    const benchGeo = new THREE.BoxGeometry(2.5, 0.15, 0.4);
    const tableTopMesh = new THREE.Mesh(tableTopGeo, brownMaterial);
    const bench1Mesh = new THREE.Mesh(benchGeo, brownMaterial);
    const bench2Mesh = new THREE.Mesh(benchGeo, brownMaterial);
    tableTopMesh.position.y = 0.7;
    bench1Mesh.position.set(0, 0.45, 0.6);
    bench2Mesh.position.set(0, 0.45, -0.6);
    picnicTable1.add(tableTopMesh);
    picnicTable1.add(bench1Mesh);
    picnicTable1.add(bench2Mesh);
    picnicTable1.position.set((groundSize / 2) + (grassStripWidth / 4), 0, 15); 
    scene.add(picnicTable1);

    const picnicTable2 = picnicTable1.clone(); 
    picnicTable2.position.set((groundSize / 2) + (grassStripWidth / 4), 0, 25);
    scene.add(picnicTable2);

    const redCarMaterial = new THREE.MeshStandardMaterial({ color: 0xC70039 });
    const blueCarMaterial = new THREE.MeshStandardMaterial({ color: 0x1A5276 });

    const car1 = new THREE.Group();
    const carBodyGeo = new THREE.BoxGeometry(1.8, 0.8, 4.5); 
    const carCabinGeo = new THREE.BoxGeometry(1.6, 0.7, 2.2);
    const carBodyMesh = new THREE.Mesh(carBodyGeo, redCarMaterial);
    const carCabinMesh = new THREE.Mesh(carCabinGeo, redCarMaterial);
    carBodyMesh.position.y = 0.4; 
    carCabinMesh.position.y = 0.8 + 0.35; 
    carCabinMesh.position.z = -0.4;
    car1.add(carBodyMesh);
    car1.add(carCabinMesh);
    car1.position.set((groundSize / 4), 0, -20);
    car1.rotation.y = -Math.PI / 18; 
    scene.add(car1);

    const car2 = new THREE.Group();
    const carBodyGeo2 = new THREE.BoxGeometry(2.0, 0.7, 4.0);
    const carCabinGeo2 = new THREE.BoxGeometry(1.7, 0.6, 2.0);
    const carBodyMesh2 = new THREE.Mesh(carBodyGeo2, blueCarMaterial);
    const carCabinMesh2 = new THREE.Mesh(carCabinGeo2, blueCarMaterial);
    carBodyMesh2.position.y = 0.35;
    carCabinMesh2.position.y = 0.7 + 0.3; 
    carCabinMesh2.position.z = -0.3;
    car2.add(carBodyMesh2);
    car2.add(carCabinMesh2);
    car2.position.set(-(groundSize / 4) - 5, 0, -30);
    car2.rotation.y = Math.PI / 12;
    scene.add(car2);

    // Add Simplified Spectators:
    const spectatorMaterial1 = new THREE.MeshStandardMaterial({ color: 0xADD8E6 }); // LightBlue
    const spectatorMaterial2 = new THREE.MeshStandardMaterial({ color: 0x90EE90 }); // LightGreen
    const spectatorMaterial3 = new THREE.MeshStandardMaterial({ color: 0xFFB6C1 }); // LightPink
    const spectatorMaterials = [spectatorMaterial1, spectatorMaterial2, spectatorMaterial3];
    const spectatorRadius = 0.25; 
    const spectatorHeight = 1.7;
    const spectatorGeo = new THREE.CylinderGeometry(spectatorRadius, spectatorRadius, spectatorHeight, 8);

    const spectatorPositions = [
        { x: (groundSize / 2) + (grassStripWidth / 3), z: 12, materialIndex: 0 }, // Near picnic table 1
        { x: (groundSize / 2) + (grassStripWidth / 2.5), z: 13, materialIndex: 1 },
        { x: (groundSize / 2) + (grassStripWidth / 3.5), z: 22, materialIndex: 2 }, // Near picnic table 2
        { x: (groundSize / 2) + (grassStripWidth / 2.8), z: 23, materialIndex: 0 },
        { x: -(groundSize / 2) - (grassStripWidth / 3), z: 5, materialIndex: 1 }, // On other grass patch
        { x: -(groundSize / 2) - (grassStripWidth / 2.5), z: 8, materialIndex: 2 },
        { x: (groundSize / 2) + (grassStripWidth / 4), z: -50, materialIndex: 0 }, // Along side wall
        { x: -(groundSize / 2) - (grassStripWidth / 4), z: -45, materialIndex: 1 }, // Along other side wall
    ];

    spectatorPositions.forEach(pos => {
        const spectator = new THREE.Mesh(spectatorGeo, spectatorMaterials[pos.materialIndex]);
        spectator.position.set(pos.x, spectatorHeight / 2, pos.z);
        scene.add(spectator);
    });

    // Add Simplified Buildings:
    const buildingMaterial1 = new THREE.MeshStandardMaterial({ color: 0xB0B0B0 }); // Lighter Gray
    const buildingMaterial2 = new THREE.MeshStandardMaterial({ color: 0x9A9A9A }); // Medium Gray

    const buildingGeo1 = new THREE.BoxGeometry(40, 25, 15); // Width, Height, Depth
    const b1 = new THREE.Mesh(buildingGeo1, buildingMaterial1);
    b1.position.set(-(groundSize / 2) - (grassStripWidth / 2) - 10, 25 / 2, -(groundSize / 2) - 20);
    scene.add(b1);

    const buildingGeo2 = new THREE.BoxGeometry(30, 35, 12);
    const b2 = new THREE.Mesh(buildingGeo2, buildingMaterial2);
    b2.position.set((groundSize / 2) + (grassStripWidth / 2) + 15, 35 / 2, -(groundSize / 2) - 30);
    scene.add(b2);

    const buildingGeo3 = new THREE.BoxGeometry(25, 20, 20);
    const b3 = new THREE.Mesh(buildingGeo3, buildingMaterial1); // Reusing material1
    b3.position.set(0, 20/2, -(groundSize/2) - 40); // Centered further back
    scene.add(b3);


    const riderGeometry = new THREE.BoxGeometry(riderSize, riderSize, riderSize);
    const riderMaterial = new THREE.MeshStandardMaterial({ color: 0x0000FF }); 
    rider = new THREE.Mesh(riderGeometry, riderMaterial); 
    rider.position.set(0, riderSize / 2, -5); 
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
    playerScore = 3;    
    currentScore = 0;   
    gameLevel = 1;      
    
    if (camera) {
        initHUD();          
        updateHUD();  
        clearFeedbackMessage();      
    } else {
        console.error("Camera not available at initThreeJSGame for HUD setup.");
    }

    const fontLoader = new THREE.FontLoader();
    fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function (loadedFont) {
        font = loadedFont; 
        if (activeLetters.length === 0) spawnLetter(); 
    }, undefined, (error) => console.error('Font loading failed:', error));

    document.addEventListener('keydown', onKeyPress);
    animate();
    window.addEventListener('resize', onGameResize);
    onGameResize(); 
}

function clearFeedbackMessage() {
    if (feedbackMessageSprite) {
        if (feedbackMessageSprite.parent) {
            feedbackMessageSprite.parent.remove(feedbackMessageSprite);
        }
        if (feedbackMessageSprite.material && feedbackMessageSprite.material.map) {
            feedbackMessageSprite.material.map.dispose();
        }
        if (feedbackMessageSprite.material) {
            feedbackMessageSprite.material.dispose();
        }
        feedbackMessageSprite = null;
    }
    if (feedbackTimeout) {
        clearTimeout(feedbackTimeout);
        feedbackTimeout = null;
    }
}

function initHUD() {
    clearFeedbackMessage(); 
    if (!camera) {
        console.error("initHUD: Camera not initialized yet.");
        return;
    }
    if (!camera.children.includes(hudElements)) {
        camera.add(hudElements);
    }

    while(hudElements.children.length > 0){ 
        const child = hudElements.children[0];
        hudElements.remove(child);
        if (child.material && child.material.map) child.material.map.dispose();
        if (child.material) child.material.dispose();
    }

    const hudTextColor = { r: 255, g: 255, b: 255, a: 1.0 }; 
    const hudLabelFontSize = 18; 
    
    const labelX = - (camera.aspect * 2.3); 
    const topY = 2.9;        
    const yLineSpacing = 0.38;
    const hudZ = -7.5;       

    chancesLabelSprite = createTextSprite("Chances:", { fontsize: hudLabelFontSize, textColor: hudTextColor, spriteHeight: 0.3 });
    chancesLabelSprite.position.set(labelX, topY, hudZ);
    hudElements.add(chancesLabelSprite);

    levelLabelSprite = createTextSprite("Level:", { fontsize: hudLabelFontSize, textColor: hudTextColor, spriteHeight: 0.3 });
    levelLabelSprite.position.set(labelX, topY - yLineSpacing, hudZ);
    hudElements.add(levelLabelSprite);
    
    scoreLabelSprite = createTextSprite("Score:", { fontsize: hudLabelFontSize, textColor: hudTextColor, spriteHeight: 0.3 });
    scoreLabelSprite.position.set(labelX, topY - (2 * yLineSpacing), hudZ);
    hudElements.add(scoreLabelSprite);
}

function updateHUD() {
    if (!camera) { 
        console.error("updateHUD: Camera not initialized.");
        return;
    }

    const hudTextColor = { r: 255, g: 255, b: 255, a: 1.0 }; 
    const hudValueFontSize = 18; 
    
    const valueX = - (camera.aspect * 1.6); 
    const topY = 2.9;        
    const yLineSpacing = 0.38;
    const hudZ = -7.5;       

    if (chancesValueSprite) { 
        hudElements.remove(chancesValueSprite);
        if (chancesValueSprite.material && chancesValueSprite.material.map) chancesValueSprite.material.map.dispose();
        if (chancesValueSprite.material) chancesValueSprite.material.dispose();
    }
    chancesValueSprite = createTextSprite(playerScore.toString(), { fontsize: hudValueFontSize, textColor: hudTextColor, spriteHeight: 0.3 });
    chancesValueSprite.position.set(valueX, topY, hudZ);
    hudElements.add(chancesValueSprite);

    if (levelValueSprite) { 
        hudElements.remove(levelValueSprite);
        if (levelValueSprite.material && levelValueSprite.material.map) levelValueSprite.material.map.dispose();
        if (levelValueSprite.material) levelValueSprite.material.dispose();
    }
    levelValueSprite = createTextSprite(gameLevel.toString(), { fontsize: hudValueFontSize, textColor: hudTextColor, spriteHeight: 0.3 });
    levelValueSprite.position.set(valueX, topY - yLineSpacing, hudZ);
    hudElements.add(levelValueSprite);

    if (scoreValueSprite) { 
        hudElements.remove(scoreValueSprite);
        if (scoreValueSprite.material && scoreValueSprite.material.map) scoreValueSprite.material.map.dispose();
        if (scoreValueSprite.material) scoreValueSprite.material.dispose();
    }
    scoreValueSprite = createTextSprite(currentScore.toString(), { fontsize: hudValueFontSize, textColor: hudTextColor, spriteHeight: 0.3 });
    scoreValueSprite.position.set(valueX, topY - (2 * yLineSpacing), hudZ);
    hudElements.add(scoreValueSprite);

    updateScoreDisplay(); 
}

function updateScoreDisplay() {
    console.log(`Game State - Score: ${currentScore}, Chances: ${playerScore}, Level: ${gameLevel}`);
}

function createTextSprite(message, parameters = {}) {
    const fontface = parameters.fontface || 'Arial';
    const fontsize = parameters.fontsize || 18;
    const borderThickness = parameters.borderThickness || 4;
    const backgroundColor = parameters.backgroundColor || { r:255, g:255, b:255, a:0.0 }; 
    const textColor = parameters.textColor || { r:0, g:0, b:0, a:1.0 };

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    context.font = `Bold ${fontsize}px ${fontface}`;
    const metrics = context.measureText(message);
    const textWidth = metrics.width;

    canvas.width = textWidth + borderThickness * 2;
    canvas.height = fontsize + borderThickness * 2; 
    context.font = `Bold ${fontsize}px ${fontface}`; 

    context.fillStyle = `rgba(${backgroundColor.r},${backgroundColor.g},${backgroundColor.b},${backgroundColor.a})`;
    context.fillRect(0, 0, canvas.width, canvas.height);

    if (parameters.borderColor) {
        context.strokeStyle = `rgba(${parameters.borderColor.r},${parameters.borderColor.g},${parameters.borderColor.b},${parameters.borderColor.a})`;
        context.lineWidth = borderThickness;
        context.strokeRect(0, 0, canvas.width, canvas.height);
    }

    context.fillStyle = `rgba(${textColor.r},${textColor.g},${textColor.b},${textColor.a})`;
    context.fillText(message, borderThickness, fontsize + borderThickness / 2); 

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true, 
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    
    const desiredHeight = parameters.spriteHeight || 0.5; 
    sprite.scale.set((desiredHeight * canvas.width / canvas.height), desiredHeight, 1);

    return sprite;
}

function spawnLetter() {
    if (!font || !rider) return; 
    if (activeLetters.length > 0) {
        scene.remove(activeLetters[0]);
        activeLetters = [];
    }
    const char = middleRowKeys[Math.floor(Math.random() * middleRowKeys.length)];
    const textGeometry = new THREE.TextGeometry(char, {
        font: font, size: 0.8, height: 0.1, curveSegments: 12, bevelEnabled: false
    });
    textGeometry.computeBoundingBox();
    const textWidth = textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x;
    textGeometry.translate(-textWidth / 2, 0, 0);
    const textMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFF00 }); 
    const letterMesh = new THREE.Mesh(textGeometry, textMaterial);
    letterMesh.userData.char = char; 
    
    const letterYPosition = rider.position.y; 
    const letterZPosition = rider.position.z - SPAWN_DISTANCE_AHEAD;
    letterMesh.position.set(0, letterYPosition, letterZPosition); 
    scene.add(letterMesh);
    activeLetters.push(letterMesh);
}

function onKeyPress(event) {
    if (gamePaused || !font || activeLetters.length === 0 || !camera) return;
    
    clearFeedbackMessage(); 

    const currentLetterObj = activeLetters[0];
    const keyPressed = event.key; 
    const expectedChar = currentLetterObj.userData.char; 
    
    const feedbackZ = -8; 
    const feedbackY = 1.5; 

    if (keyPressed === expectedChar) { 
        feedbackMessageSprite = createTextSprite("Correct!", { 
            fontsize: 30, 
            textColor: { r:50, g:255, b:50, a:1.0 }, 
            backgroundColor: {r:0,g:0,b:0,a:0.5},
            spriteHeight: 0.4 
        });
        feedbackMessageSprite.position.set(0, feedbackY, feedbackZ); 
        camera.add(feedbackMessageSprite);
        feedbackTimeout = setTimeout(clearFeedbackMessage, 1500);

        scene.remove(currentLetterObj);
        activeLetters = []; 
        currentScore++; 
        updateHUD();    
        spawnLetter(); 
    } else {
        feedbackMessageSprite = createTextSprite("Wrong Key!", { 
            fontsize: 30, 
            textColor: { r:255, g:50, b:50, a:1.0 }, 
            backgroundColor: {r:0,g:0,b:0,a:0.5},
            spriteHeight: 0.4
        });
        feedbackMessageSprite.position.set(0, feedbackY, feedbackZ);
        camera.add(feedbackMessageSprite);
        feedbackTimeout = setTimeout(clearFeedbackMessage, 1500);
    }
}

function animate() {
    if (gamePaused) return;
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    if (rider) { 
        rider.position.z -= RIDER_SPEED * deltaTime;
        camera.position.z = rider.position.z + cameraOffsetZ;
        camera.position.x = rider.position.x; 

        scene.children.forEach(child => {
            if (child instanceof THREE.DirectionalLight) {
                child.position.set(rider.position.x + 5, child.position.y, rider.position.z + 2);
                if (child.target === rider) child.target.updateMatrixWorld(); 
            }
        });

        if (font && activeLetters.length > 0) {
            const currentLetterObj = activeLetters[0];
            if (rider.position.z < currentLetterObj.position.z - 0.5) { 
                scene.remove(currentLetterObj);
                activeLetters = []; 
                playerScore--; 
                updateHUD();   
                if (playerScore <= 0) {
                    alert("Game Over! Starting again.");
                    playerScore = 3;    
                    currentScore = 0;   
                    gameLevel = 1;      
                    updateHUD();        
                    rider.position.z = -5; 
                }
                spawnLetter(); 
            }
        }
    }
    if (renderer && scene && camera) renderer.render(scene, camera);
}

function onGameResize() {
    if (gameCanvasContainer && renderer && camera) {
        const newWidth = gameCanvasContainer.clientWidth;
        const newHeight = gameCanvasContainer.clientHeight;
        if (newWidth > 0 && newHeight > 0) {
            camera.aspect = newWidth / newHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(newWidth, newHeight);
            if (gameInitialized) { 
                 initHUD(); 
                 updateHUD(); 
                 clearFeedbackMessage(); 
            }
        }
    }
}
