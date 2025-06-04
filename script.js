const player = document.getElementById('player');
const gameContainer = document.getElementById('game-container');
const healthDisplay = document.getElementById('current-health');
const gameOverScreen = document.getElementById('game-over-screen');
const rewardScreen = document.getElementById('reward-screen');
const rewardHealthBtn = document.getElementById('reward-health-btn');
const rewardFirerateBtn = document.getElementById('reward-firerate-btn');

const startScreen = document.getElementById('start-screen');
const startGameBtn = document.getElementById('start-game-btn');

let playerHealth = 20;
let playerMaxHealth = 20; // Track max health
let playerX = window.innerWidth / 2;
let playerY = window.innerHeight / 2;
const playerSpeed = 5; // Pixels per frame
const enemySpeed = 2; // Pixels per frame for enemies
const bulletSpeed = 10; // Pixels per frame for bullets

// Player rotation variables
let playerCurrentRotation = 0; // Current rotation angle in degrees
const playerRotationSpeed = 3; // Degrees per frame

// Track previous player position to determine movement direction
let prevPlayerX = playerX;
let prevPlayerY = playerY;
// Store the last non-zero movement direction for bullet firing
let lastMovedDirection = { x: 0, y: 1 }; // Default to backward if no movement detected initially

let keysPressed = {};
let gameInterval;
let enemyGenerationInterval; 
let currentEnemySpawnInterval = 1000; // Initial 1 second

// Variables for continuous firing
let isMouseDown = false;
let lastShotTime = 0;

// Attack mode variables
let currentAttackMode = 1; // 1: single, 2: three-shot, 3: ten-shot
let currentFireRate = 100; // Cooldown for the current attack mode (0.1s for mode 1 initially)

// Kill counters for reward system
let blackCircleKills = 0;
let redSquareKills = 0;
// NEW: Make reward thresholds dynamic
let currentBlackCircleRewardThreshold = 20; 
let currentRedSquareRewardThreshold = 5; 
const BLACK_TO_RED_RATIO = 4; // 4 black circles = 1 red square equivalent

// NEW: Reward limits
let rewardsGiven = 0;
const MAX_REWARDS = 10; 

let gamePaused = true; // Game starts paused

function updatePlayerPosition() {
    if (gamePaused) return;

    // Save current position as previous for next frame's direction calculation
    prevPlayerX = playerX;
    prevPlayerY = playerY;

    let newPlayerX = playerX;
    let newPlayerY = playerY;

    // Keyboard movement
    if (keysPressed['w'] || keysPressed['W']) newPlayerY -= playerSpeed;
    if (keysPressed['s'] || keysPressed['S']) newPlayerY += playerSpeed;
    if (keysPressed['a'] || keysPressed['A']) newPlayerX -= playerSpeed;
    if (keysPressed['d'] || keysPressed['D']) newPlayerX += playerSpeed;

    // Keep player within bounds (for keyboard movement)
    newPlayerX = Math.max(0, Math.min(window.innerWidth - player.offsetWidth, newPlayerX));
    newPlayerY = Math.max(0, Math.min(window.innerHeight - player.offsetHeight, newPlayerY));

    // Update player position based on keyboard input
    playerX = newPlayerX;
    playerY = newPlayerY;

    // Apply rotation
    playerCurrentRotation = (playerCurrentRotation + playerRotationSpeed) % 360;
    player.style.transform = `translate(-50%, -50%) rotate(${playerCurrentRotation}deg)`;

    // Apply position
    player.style.left = `${playerX}px`;
    player.style.top = `${playerY}px`;
}

function handleMouseMove(event) {
    if (gamePaused) return;

    // Save current position as previous for next frame's direction calculation
    prevPlayerX = playerX;
    prevPlayerY = playerY;

    // Update player position directly based on mouse, ensuring player center is at mouse pointer
    playerX = event.clientX - player.offsetWidth / 2;
    playerY = event.clientY - player.offsetHeight / 2;

    // Keep player within bounds (for mouse movement)
    playerX = Math.max(0, Math.min(window.innerWidth - player.offsetWidth, playerX));
    playerY = Math.max(0, Math.min(window.innerHeight - player.offsetHeight, playerY));

    player.style.left = `${playerX}px`;
    player.style.top = `${playerY}px`;
}

document.addEventListener('keydown', (event) => {
    keysPressed[event.key] = true;

    // Handle attack mode switching
    if (!gamePaused) {
        if (event.key === '1') {
            currentAttackMode = 1;
            currentFireRate = 100; // 0.1 seconds
            lastShotTime = performance.now(); // FIX: Reset cooldown when mode is switched
            console.log("Attack Mode: 1 (Single Shot)");
        } else if (event.key === '2') {
            currentAttackMode = 2;
            currentFireRate = 300; // 0.3 seconds
            lastShotTime = performance.now(); // FIX: Reset cooldown when mode is switched
            console.log("Attack Mode: 2 (Three-shot)");
        } else if (event.key === '3') {
            currentAttackMode = 3;
            currentFireRate = 1000; // 1 second
            lastShotTime = performance.now(); // FIX: Reset cooldown when mode is switched
            console.log("Attack Mode: 3 (Ten-shot)");
        }
    }
});

document.addEventListener('keyup', (event) => {
    keysPressed[event.key] = false;
});

gameContainer.addEventListener('mousemove', handleMouseMove);

// Mouse down/up events for continuous firing
gameContainer.addEventListener('mousedown', (event) => {
    if (event.button === 0 && !gamePaused) {
        isMouseDown = true;
    }
});

gameContainer.addEventListener('mouseup', (event) => {
    if (event.button === 0) {
        isMouseDown = false;
    }
});


function createEnemy() {
    if (gamePaused) return;

    const enemy = document.createElement('div');
    enemy.classList.add('enemy');

    const type = Math.random() < 0.8 ? 'circle' : 'square'; // 80% chance for circle
    let damage = 0;

    if (type === 'circle') {
        enemy.classList.add('black-circle');
        damage = 1;
    } else {
        enemy.classList.add('red-square');
        damage = 10;
    }
    enemy.dataset.damage = damage;
    enemy.dataset.type = type; // Store enemy type for kill tracking

    // Determine spawn edge (top, bottom, left, right)
    const edge = Math.floor(Math.random() * 4);
    let initialX, initialY;

    switch (edge) {
        case 0: // Top
            initialX = Math.random() * window.innerWidth;
            initialY = -50; // Off-screen
            break;
        case 1: // Bottom
            initialX = Math.random() * window.innerWidth;
            initialY = window.innerHeight + 50; // Off-screen
            break;
        case 2: // Left
            initialX = -50; // Off-screen
            initialY = Math.random() * window.innerHeight;
            break;
            case 3: // Right
            initialX = window.innerWidth + 50; // Off-screen
            initialY = Math.random() * window.innerHeight;
            break;
    }

    enemy.style.left = `${initialX}px`;
    enemy.style.top = `${initialY}px`;
    gameContainer.appendChild(enemy);

    // Store target position (player's current position)
    enemy.targetX = playerX + player.offsetWidth / 2;
    enemy.targetY = playerY + player.offsetHeight / 2;
}

function moveEnemies() {
    if (gamePaused) return;

    const enemies = document.querySelectorAll('.enemy');
    enemies.forEach(enemy => {
        let enemyRect = enemy.getBoundingClientRect();
        let playerRect = player.getBoundingClientRect();

        // Recalculate target towards player's current position for dynamic chasing
        const dx = (playerX + player.offsetWidth / 2) - enemyRect.left;
        const dy = (playerY + player.offsetHeight / 2) - enemyRect.top;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Normalize direction and move
        if (distance > 1) { // Avoid division by zero
            enemy.style.left = `${parseFloat(enemy.style.left) + (dx / distance) * enemySpeed}px`;
            enemy.style.top = `${parseFloat(enemy.style.top) + (dy / distance) * enemySpeed}px`;
        }

        // Collision detection with player
        if (checkCollision(playerRect, enemyRect)) {
            playerHealth -= parseInt(enemy.dataset.damage);
            healthDisplay.textContent = playerHealth;
            enemy.remove(); // Remove enemy after collision
            if (playerHealth <= 0) {
                endGame();
            }
        }

        // Remove enemies that are far off-screen (optimization)
        if (enemyRect.top > window.innerHeight + 100 || enemyRect.bottom < -100 ||
            enemyRect.left > window.innerWidth + 100 || enemyRect.right < -100) {
            enemy.remove();
        }
    });
}

// Helper function to create a single bullet with a given direction
function _createSingleBullet(directionX, directionY) {
    const bullet = document.createElement('div');
    bullet.classList.add('bullet');

    // Bullet starts at the center of the player
    // This calculation ensures the bullet's center aligns with the player's center.
    // playerX and playerY are the top-left of the player element.
    // Adding half of player's width/height gets the player's center.
    // Subtracting half of bullet's width/height offsets the bullet's top-left
    // so that its center is at the player's center.
    const playerCenterX = playerX + player.offsetWidth / 2;
    const playerCenterY = playerY + player.offsetHeight / 2;

    bullet.style.left = `${playerCenterX - bullet.offsetWidth / 2}px`;
    bullet.style.top = `${playerCenterY - bullet.offsetHeight / 2}px`;
    gameContainer.appendChild(bullet);

    bullet.velX = directionX * bulletSpeed;
    bullet.velY = directionY * bulletSpeed;
}

// Main function to fire bullets based on current attack mode
function fireBulletsInCurrentMode() {
    if (gamePaused) return;

    // Calculate the base direction for backward firing
    const baseDirX = -lastMovedDirection.x;
    const baseDirY = -lastMovedDirection.y;

    if (currentAttackMode === 1) {
        _createSingleBullet(baseDirX, baseDirY);
    } else if (currentAttackMode === 2) {
        // Three-shot mode (center + 30 deg left/right)
        const baseAngle = Math.atan2(baseDirY, baseDirX); // Get angle from base direction
        const angleOffset = Math.PI / 6; // 30 degrees in radians (30 * Math.PI / 180)

        _createSingleBullet(baseDirX, baseDirY); // Center bullet
        _createSingleBullet(
            Math.cos(baseAngle - angleOffset),
            Math.sin(baseAngle - angleOffset)
        );
        _createSingleBullet(
            Math.cos(baseAngle + angleOffset),
            Math.sin(baseAngle + angleOffset)
        );
    } else if (currentAttackMode === 3) {
        // Ten-shot mode (360 degrees spread)
        const numBullets = 10;
        const angleStep = (2 * Math.PI) / numBullets; // Angle between bullets in radians (360/10 = 36 degrees)

        for (let i = 0; i < numBullets; i++) {
            const angle = i * angleStep;
            _createSingleBullet(Math.cos(angle), Math.sin(angle));
        }
    }
}

function moveBullets() {
    if (gamePaused) return;

    const bullets = document.querySelectorAll('.bullet');
    bullets.forEach(bullet => {
        bullet.style.left = `${parseFloat(bullet.style.left) + bullet.velX}px`;
        bullet.style.top = `${parseFloat(bullet.style.top) + bullet.velY}px`;

        let bulletRect = bullet.getBoundingClientRect();

        // Check for collision with enemies
        const enemies = document.querySelectorAll('.enemy');
        enemies.forEach(enemy => {
            let enemyRect = enemy.getBoundingClientRect();
            if (checkCollision(bulletRect, enemyRect)) {
                // Update kill counters
                if (enemy.dataset.type === 'circle') {
                    blackCircleKills++;
                } else if (enemy.dataset.type === 'square') {
                    redSquareKills++;
                }
                
                bullet.remove(); // Destroy bullet
                enemy.remove(); // Destroy enemy
                checkForReward(); // Check for reward after each kill
                return; // Stop checking this bullet against other enemies
            }
        });

        // Remove bullets that go off-screen
        if (bulletRect.top < -50 || bulletRect.bottom > window.innerHeight + 50 ||
            bulletRect.left < -50 || bulletRect.right > window.innerWidth + 50) {
            bullet.remove();
        }
    });
}

// Function to decrease enemy spawn interval
function decreaseEnemySpawnInterval() {
    // Clear the old interval first
    clearInterval(enemyGenerationInterval);

    // Decrease interval by 20%, ensure it doesn't go below a certain minimum (e.g., 100ms)
    currentEnemySpawnInterval = Math.max(100, currentEnemySpawnInterval * 0.8);
    console.log(`Enemy spawn interval decreased to: ${currentEnemySpawnInterval}ms`);

    // Start a new interval with the updated rate
    enemyGenerationInterval = setInterval(createEnemy, currentEnemySpawnInterval);
}


// Reward System Functions
function checkForReward() {
    // NEW: Only check for reward if max rewards haven't been reached
    if (rewardsGiven >= MAX_REWARDS) {
        return;
    }

    const totalEquivalentKills = blackCircleKills + (redSquareKills * BLACK_TO_RED_RATIO);

    // NEW: Use dynamic thresholds
    if (blackCircleKills >= currentBlackCircleRewardThreshold || redSquareKills >= currentRedSquareRewardThreshold || totalEquivalentKills >= currentBlackCircleRewardThreshold) {
        showRewardScreen();
    }
}

function showRewardScreen() {
    gamePaused = true;
    rewardScreen.classList.remove('hidden');
    // Clear existing enemies and bullets to prevent them from hitting player while paused
    document.querySelectorAll('.enemy').forEach(e => e.remove());
    document.querySelectorAll('.bullet').forEach(b => b.remove());
}

function hideRewardScreen() {
    rewardScreen.classList.add('hidden');
    gamePaused = false;
    // Reset kill counters
    blackCircleKills = 0;
    redSquareKills = 0;
    
    // NEW: Increment reward count
    rewardsGiven++;
    console.log(`Reward #${rewardsGiven} given.`);

    // NEW: If max rewards not reached, increase next reward's kill requirements
    if (rewardsGiven < MAX_REWARDS) {
        currentBlackCircleRewardThreshold = Math.ceil(currentBlackCircleRewardThreshold * 1.25);
        currentRedSquareRewardThreshold = Math.ceil(currentRedSquareRewardThreshold * 1.25);
        console.log(`Next reward thresholds: Black: ${currentBlackCircleRewardThreshold}, Red: ${currentRedSquareRewardThreshold}`);
    } else {
        console.log("Max rewards reached. No more reward opportunities.");
        // Optionally, set thresholds to a very high number to prevent further checks
        currentBlackCircleRewardThreshold = Infinity;
        currentRedSquareRewardThreshold = Infinity;
    }

    // Decrease enemy spawn interval after reward
    decreaseEnemySpawnInterval();
}

function applyHealthReward() {
    playerMaxHealth += 5;
    playerHealth = playerMaxHealth; // Heal to full max health
    healthDisplay.textContent = playerHealth;
    hideRewardScreen();
}

function applyFireRateReward() {
    currentFireRate = Math.max(20, currentFireRate * 0.75); // Reduce fire rate by 25%, with a minimum of 20ms
    hideRewardScreen();
}

// Attach reward button event listeners
rewardHealthBtn.addEventListener('click', applyHealthReward);
rewardFirerateBtn.addEventListener('click', applyFireRateReward);


function checkCollision(rect1, rect2) {
    return rect1.left < rect2.right &&
           rect1.right > rect2.left &&
           rect1.top < rect2.bottom &&
           rect1.bottom > rect2.top;
}

function endGame() {
    clearInterval(enemyGenerationInterval);
    cancelAnimationFrame(gameInterval);
    gameOverScreen.classList.remove('hidden');
    
    // Remove all game-related event listeners or disable them properly
    gameContainer.removeEventListener('mousemove', handleMouseMove);
    // Note: It's better to add/remove actual named functions for event listeners
    // For simplicity in this example, we keep them as is, but in a larger game
    // you'd typically store function references to remove properly.
    gameContainer.removeEventListener('mousedown', () => {}); 
    gameContainer.removeEventListener('mouseup', () => {}); 
    document.removeEventListener('keydown', () => {});
    document.removeEventListener('keyup', () => {});
    rewardHealthBtn.removeEventListener('click', applyHealthReward);
    rewardFirerateBtn.removeEventListener('click', applyFireRateReward);
    startGameBtn.removeEventListener('click', initializeGame); // Remove start button listener

    // Hide reward screen if game over occurs during a reward
    rewardScreen.classList.add('hidden'); 
}

// Function to initialize the game after start button is clicked
function initializeGame() {
    startScreen.classList.add('hidden'); // Hide start screen
    gameContainer.classList.remove('hidden'); // Show game container

    // Reset player position to center
    playerX = window.innerWidth / 2;
    playerY = window.innerHeight / 2;
    player.style.left = `${playerX}px`;
    player.style.top = `${playerY}px`;
    healthDisplay.textContent = playerHealth;
    
    gamePaused = false; // Unpause the game

    // Start game loop and enemy generation
    gameLoop();
    // Initialize enemy generation interval here
    enemyGenerationInterval = setInterval(createEnemy, currentEnemySpawnInterval);
}

function gameLoop() {
    // Calculate current movement direction (always run, even if paused, to capture last direction)
    const currentDx = playerX - prevPlayerX;
    const currentDy = playerY - prevPlayerY;
    const currentMagnitude = Math.sqrt(currentDx * currentDx + currentDy * currentDy);

    if (currentMagnitude > 0) {
        lastMovedDirection.x = currentDx / currentMagnitude;
        lastMovedDirection.y = currentDy / currentMagnitude;
    }
    
    // Only update game state if not paused
    if (!gamePaused) {
        updatePlayerPosition(); 
        moveEnemies();
        moveBullets(); 
        
        // Handle continuous firing based on current mode's fire rate
        if (isMouseDown && (performance.now() - lastShotTime > currentFireRate)) {
            fireBulletsInCurrentMode();
            lastShotTime = performance.now();
        }
    }

    if (playerHealth > 0) {
        gameInterval = requestAnimationFrame(gameLoop);
    }
}

// Attach event listener to start game button
startGameBtn.addEventListener('click', initializeGame);

// Initial setup: Player position and health display are set in initializeGame().
// Game loop and enemy generation only start AFTER the start button is clicked.