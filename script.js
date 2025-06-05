const player = document.getElementById('player');
const gameContainer = document.getElementById('game-container');
const healthDisplay = document.getElementById('current-health');
const gameOverScreen = document.getElementById('game-over-screen');
const rewardScreen = document.getElementById('reward-screen');
const rewardHealthBtn = document.getElementById('reward-health-btn');
const rewardFirerateBtn = document.getElementById('reward-firerate-btn');
const resumeGameBtn = document.getElementById('resume-game-btn');
const tutorialBtn = document.getElementById('tutorial-btn');
const tutorialScreen = document.getElementById('tutorial-screen');
const closeTutorialBtn = document.getElementById('close-tutorial-btn');

const startScreen = document.getElementById('start-screen');
const startGameBtn = document.getElementById('start-game-btn');

const scoreDisplay = document.getElementById('current-score');
const levelDisplay = document.getElementById('current-level');
const modeDisplay = document.getElementById('current-mode');
const qwqDisplay = document.getElementById('current-qwq');
const finalScoreDisplay = document.getElementById('final-score');

const pauseScreen = document.getElementById('pause-screen'); // NEW: Get pause screen element

let playerHealth = 20;
let playerMaxHealth = 20;
let playerX = window.innerWidth / 2;
let playerY = window.innerHeight / 2;
const playerSpeed = 5;
const circleSpeed = 2;
const squareSpeed = 0.5;
const bulletSpeed = 10;
const enemyBulletSpeed = 15;
const enemyFireRate = 1000;

let playerCurrentRotation = 0;
const playerRotationSpeed = 3;

let prevPlayerX = playerX;
let prevPlayerY = playerY;
let lastMovedDirection = { x: 0, y: 1 };

let keysPressed = {};
let gameInterval;
let enemyGenerationInterval;
let currentEnemySpawnInterval = 1000;

let targetMouseX = playerX;
let targetMouseY = playerY;

let isMouseDown = false;
let lastShotTime = 0;

let baseFireRate = 100;
let currentAttackMode = 1;
let currentFireRate = baseFireRate;

let rewardsGiven = 0;
let currentRewardGoal = 20;
const MAX_REWARDS = 10;

let gamePaused = true;

let score = 0;
const SCORE_BASED_SPAWN_INCREASE_INTERVAL = 110;
let nextScoreIncreaseMilestone = SCORE_BASED_SPAWN_INCREASE_INTERVAL;
const MAX_SPAWN_INCREASE = 10;
let spawnIncreaseCount = 0;

function updatePlayerPosition() {
    if (gamePaused) return;

    // Store previous position before calculating new one for direction tracking
    prevPlayerX = playerX;
    prevPlayerY = playerY;

    let newPlayerX = playerX;
    let newPlayerY = playerY;

    // 2. Mouse Movement (moves towards targetMouseX/Y)
    const dx = targetMouseX - newPlayerX;
    const dy = targetMouseY - newPlayerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const minDistanceThreshold = 1; // Stop movement when very close to target to prevent jitter

    if (distance > minDistanceThreshold) {
        // Calculate movement amount, ensuring it doesn't overshoot the target
        const moveAmount = Math.min(distance, playerSpeed);

        newPlayerX += (dx / distance) * moveAmount;
        newPlayerY += (dy / distance) * moveAmount;
    }

    // 3. Keep player within bounds (applies to combined keyboard and mouse movement)
    playerX = Math.max(0, Math.min(window.innerWidth, newPlayerX));
    playerY = Math.max(0, Math.min(window.innerHeight, newPlayerY));

    // Apply rotation (existing)
    playerCurrentRotation = (playerCurrentRotation + playerRotationSpeed) % 360;
    player.style.transform = `translate(-50%, -50%) rotate(${playerCurrentRotation}deg)`;

    // Apply position
    player.style.left = `${playerX}px`;
    player.style.top = `${playerY}px`;

    // Update lastMovedDirection based on the actual change in player's position
    // This is crucial for backward firing, reflecting actual player movement
    const actualDx = playerX - prevPlayerX;
    const actualDy = playerY - prevPlayerY;
    const actualMagnitude = Math.sqrt(actualDx * actualDx + actualDy * actualDy);

    if (actualMagnitude > 0) {
        lastMovedDirection.x = actualDx / actualMagnitude;
        lastMovedDirection.y = actualDy / actualMagnitude;
    }
}

// MODIFIED: handleMouseMove now only stores the target position
function handleMouseMove(event) {
    if (gamePaused) return;

    // Store the target mouse coordinates (adjusted for player center)
    // Player position is updated in updatePlayerPosition() based on this target
    targetMouseX = event.clientX;
    targetMouseY = event.clientY;
}

document.addEventListener('keydown', (event) => {
    keysPressed[event.key] = true;

    if (!gamePaused) { // Only allow mode switching if not paused
        if (event.key === '1') {
            currentAttackMode = 1;
            currentFireRate = baseFireRate;
            modeDisplay.textContent = '单发模式';
            lastShotTime = performance.now();
            console.log("Attack Mode: 1 (Single Shot), Cooldown:", currentFireRate);
        } else if (event.key === '2') {
            currentAttackMode = 2;
            currentFireRate = baseFireRate * 3;
            modeDisplay.textContent = '三连发模式';
            lastShotTime = performance.now();
            console.log("Attack Mode: 2 (Three-shot), Cooldown:", currentFireRate);
        } else if (event.key === '3') {
            currentAttackMode = 3;
            currentFireRate = baseFireRate * 10;
            modeDisplay.textContent = '十连发模式';
            lastShotTime = performance.now();
            console.log("Attack Mode: 3 (Ten-shot), Cooldown:", currentFireRate);
        }
    }

    // NEW: Handle Escape key for pausing
    if (event.key === 'Escape') {
        // Only toggle pause if no other critical overlay (game over, reward, start) is active
        if (gameOverScreen.classList.contains('hidden') &&
            rewardScreen.classList.contains('hidden') &&
            startScreen.classList.contains('hidden')) {
            gamePaused = !gamePaused; // Toggle general gamePaused state
            pauseScreen.classList.toggle('hidden'); // Show/hide pause screen

        }
    }
});

document.addEventListener('keyup', (event) => {
    keysPressed[event.key] = false;
});

gameContainer.addEventListener('mousemove', handleMouseMove);

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

    const type = Math.random() < 0.8 ? 'circle' : 'square';
    let damage = 0;

    if (type === 'circle') {
        enemy.classList.add('black-circle');
        damage = 1;
    } else {
        enemy.classList.add('red-square');
        damage = 10;
    }
    enemy.dataset.damage = damage;
    enemy.dataset.type = type;

    const edge = Math.floor(Math.random() * 4);
    let initialX, initialY;

    switch (edge) {
        case 0: // Top
            initialX = Math.random() * window.innerWidth;
            initialY = -50;
            break;
        case 1: // Bottom
            initialX = Math.random() * window.innerWidth;
            initialY = window.innerHeight + 50;
            break;
        case 2: // Left
            initialX = -50;
            initialY = Math.random() * window.innerHeight;
            break;
        case 3: // Right
            initialX = window.innerWidth + 50;
            initialY = Math.random() * window.innerHeight;
            break;
    }

    enemy.style.left = `${initialX}px`;
    enemy.style.top = `${initialY}px`;
    gameContainer.appendChild(enemy);

    enemy.targetX = playerX;
    enemy.targetY = playerY;
}

function moveEnemies() {
    if (gamePaused) return;

    const enemies = document.querySelectorAll('.enemy');
    enemies.forEach(enemy => {
        let enemyRect = enemy.getBoundingClientRect();
        let playerRect = player.getBoundingClientRect();

        const dx = (playerX) - enemyRect.left + (enemyRect.width / 2);
        const dy = (playerY) - enemyRect.top + (enemyRect.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 1) {
            enemy.style.left = `${parseFloat(enemy.style.left) + (dx / distance) * (enemy.dataset.type === 'circle' ? circleSpeed : squareSpeed)}px`;
            enemy.style.top = `${parseFloat(enemy.style.top) + (dy / distance) * (enemy.dataset.type === 'circle' ? circleSpeed : squareSpeed)}px`;
        }

        if (checkCollision(playerRect, enemyRect)) {
            playerHealth -= parseInt(enemy.dataset.damage);
            healthDisplay.textContent = playerHealth;
            enemy.remove();
            if (playerHealth <= 0) {
                endGame();
            }
            if (enemy.dataset.type === 'circle') {
                score += 1;
            } else if (enemy.dataset.type === 'square') {
                score += 4;
            }
            scoreDisplay.textContent = score;
            checkForReward();
            checkScoreBasedSpawnIncrease();
        }
        if (enemy.dataset.type === "square") {
            // If the enemy is a square, it will fire bullets at the player
            if (Math.random() < 0.01) { // 1% chance to fire each frame
                if (distance > 1) {
                    _createEnemyBullet(dx / distance, dy / distance, enemy);
                }
            }
        }
        if (enemyRect.top > window.innerHeight + 100 || enemyRect.bottom < -100 ||
            enemyRect.left > window.innerWidth + 100 || enemyRect.right < -100) {
            enemy.remove();
        }
    });
}

function _createSingleBullet(directionX, directionY) {
    const bullet = document.createElement('div');
    bullet.classList.add('bullet');

    const playerCenterX = playerX;
    const playerCenterY = playerY;

    bullet.style.left = `${playerCenterX - 5}px`;
    bullet.style.top = `${playerCenterY - 5}px`;
    gameContainer.appendChild(bullet);

    bullet.velX = directionX * bulletSpeed;
    bullet.velY = directionY * bulletSpeed;
}

function _createEnemyBullet(directionX, directionY, enemy) {
    const bullet = document.createElement('div');
    bullet.classList.add('enemyBullet');

    const enemyCenterX = parseFloat(enemy.style.left) + (enemy.offsetWidth / 2);
    const enemyCenterY = parseFloat(enemy.style.top) + (enemy.offsetHeight / 2);

    bullet.style.left = `${enemyCenterX - 5}px`;
    bullet.style.top = `${enemyCenterY - 5}px`;
    gameContainer.appendChild(bullet);

    bullet.velX = directionX * enemyBulletSpeed;
    bullet.velY = directionY * enemyBulletSpeed;
}

function fireBulletsInCurrentMode() {
    if (gamePaused) return;

    const baseDirX = -lastMovedDirection.x;
    const baseDirY = -lastMovedDirection.y;

    if (currentAttackMode === 1) {
        _createSingleBullet(baseDirX, baseDirY);
    } else if (currentAttackMode === 2) {
        const baseAngle = Math.atan2(baseDirY, baseDirX);
        const angleOffset = Math.PI / 6;

        _createSingleBullet(baseDirX, baseDirY);
        _createSingleBullet(
            Math.cos(baseAngle - angleOffset),
            Math.sin(baseAngle - angleOffset)
        );
        _createSingleBullet(
            Math.cos(baseAngle + angleOffset),
            Math.sin(baseAngle + angleOffset)
        );
    } else if (currentAttackMode === 3) {
        const numBullets = 10;
        const angleStep = (2 * Math.PI) / numBullets;

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

        const enemies = document.querySelectorAll('.enemy');
        enemies.forEach(enemy => {
            let enemyRect = enemy.getBoundingClientRect();
            if (checkCollision(bulletRect, enemyRect)) {
                if (enemy.dataset.type === 'circle') {
                    score += 1;
                } else if (enemy.dataset.type === 'square') {
                    score += 4;
                }
                scoreDisplay.textContent = score;

                bullet.remove();
                enemy.remove();
                checkForReward();
                checkScoreBasedSpawnIncrease();
                return;
            }
        });

        if (bulletRect.top < -50 || bulletRect.bottom > window.innerHeight + 50 ||
            bulletRect.left < -50 || bulletRect.right > window.innerWidth + 50) {
            bullet.remove();
        }
    });
    const enemyBullets = document.querySelectorAll('.enemyBullet');
    enemyBullets.forEach(bullet => {
        bullet.style.left = `${parseFloat(bullet.style.left) + bullet.velX}px`;
        bullet.style.top = `${parseFloat(bullet.style.top) + bullet.velY}px`;

        let bulletRect = bullet.getBoundingClientRect();
        let playerRect = player.getBoundingClientRect();

        if (checkCollision(bulletRect, playerRect)) {
            playerHealth -= 1; // Assuming enemy bullets do 1 damage
            healthDisplay.textContent = playerHealth;
            bullet.remove();
            if (playerHealth <= 0) {
                endGame();
            }
            return;
        }
        const enemies = document.querySelectorAll('.enemy');
        enemies.forEach(enemy => {
            let enemyRect = enemy.getBoundingClientRect();
            if (checkCollision(bulletRect, enemyRect) && enemy.dataset.type === 'circle') {
                bullet.remove();
                enemy.remove();
                return;
            }
        });
        const bullets = document.querySelectorAll('.bullet');
        bullets.forEach(bulletE => {
            let bulletERect = bulletE.getBoundingClientRect();
            if (checkCollision(bulletRect, bulletERect)) {
                score += 1;
                scoreDisplay.textContent = score;
                bullet.remove();
                bulletE.remove();
                checkForReward();
                checkScoreBasedSpawnIncrease();
                return;
            }
        });
        if (bulletRect.top < -50 || bulletRect.bottom > window.innerHeight + 50 ||
            bulletRect.left < -50 || bulletRect.right > window.innerWidth + 50) {
            bullet.remove();
        }
    });
}

function decreaseEnemySpawnInterval() {
    clearInterval(enemyGenerationInterval);

    currentEnemySpawnInterval = currentEnemySpawnInterval * 0.8;
    console.log(`Enemy spawn interval decreased to: ${currentEnemySpawnInterval}ms`);

    enemyGenerationInterval = setInterval(createEnemy, currentEnemySpawnInterval);
}

function checkScoreBasedSpawnIncrease() {
    if (score >= nextScoreIncreaseMilestone) {
        // Decrease enemy spawn interval based on score milestones
        if (spawnIncreaseCount < MAX_SPAWN_INCREASE) {
            spawnIncreaseCount++;
            decreaseEnemySpawnInterval();
        } else {
            if (playerHealth < playerMaxHealth) {
                playerHealth += 1; // Heal 1 health point for each score milestone after max spawn increase
                healthDisplay.textContent = playerHealth;
            }
            qwqDisplay.textContent = `${nextScoreIncreaseMilestone+SCORE_BASED_SPAWN_INCREASE_INTERVAL}`;
        }
        nextScoreIncreaseMilestone += SCORE_BASED_SPAWN_INCREASE_INTERVAL;
        console.log(`Score-based enemy spawn interval decrease triggered! Current Score: ${score}, Next milestone: ${nextScoreIncreaseMilestone}`);
    }
}


function checkForReward() {
    if (rewardsGiven >= MAX_REWARDS) {
        return;
    }

    if (score >= currentRewardGoal) {
        console.log(`Reward available! Current Score: ${score}, Reward Goal: ${currentRewardGoal}`);
        showRewardScreen();
    }
}

function showRewardScreen() {
    gamePaused = true;
    rewardScreen.classList.remove('hidden');
    document.querySelectorAll('.enemy').forEach(e => e.remove());
    document.querySelectorAll('.bullet').forEach(b => b.remove());
    document.querySelectorAll('.enemyBullet').forEach(b => b.remove());
    gameContainer.style.cursor = 'default'; // Show cursor when reward screen is active
}

function hideRewardScreen() {
    rewardScreen.classList.add('hidden');
    gamePaused = false;

    rewardsGiven++;
    console.log(`Reward #${rewardsGiven} given.`);
    levelDisplay.textContent = `${rewardsGiven}`;

    if (rewardsGiven < MAX_REWARDS) {
        currentRewardGoal += 20 * (rewardsGiven + 1); // Double the reward goal for the next reward
        console.log(`Next Reward Goal: ${currentRewardGoal}`);
        qwqDisplay.textContent = `${currentRewardGoal}`;
    } else {
        console.log("Max rewards reached. No more reward opportunities.");
        currentRewardGoal = Infinity;
        qwqDisplay.textContent = `${nextScoreIncreaseMilestone}`;
    }
}

function applyHealthReward() {
    playerMaxHealth += 20;
    playerHealth = playerMaxHealth;
    healthDisplay.textContent = playerHealth;
    hideRewardScreen();
}

function applyFireRateReward() {
    baseFireRate = Math.max(20, baseFireRate * 0.75);
    console.log(`Base Fire Rate reduced to: ${baseFireRate}ms`);
    playerHealth = playerMaxHealth;
    healthDisplay.textContent = playerHealth;
    if (currentAttackMode === 1) {
        currentFireRate = baseFireRate;
    } else if (currentAttackMode === 2) {
        currentFireRate = baseFireRate * 3;
    } else if (currentAttackMode === 3) {
        currentFireRate = baseFireRate * 10;
    }
    console.log(`Current Mode's Cooldown updated to: ${currentFireRate}ms`);

    hideRewardScreen();
}

rewardHealthBtn.addEventListener('click', applyHealthReward);
rewardFirerateBtn.addEventListener('click', applyFireRateReward);
resumeGameBtn.addEventListener('click', resumeGame);
tutorialBtn.addEventListener('click', tutorial);
closeTutorialBtn.addEventListener('click', closeTutorial);

function tutorial(){
    tutorialScreen.classList.remove('hidden');
    pauseScreen.classList.add('hidden'); // Hide pause screen if it was visible
    startScreen.classList.add('hidden'); // Hide start screen if it was visible
    rewardScreen.classList.add('hidden'); // Hide reward screen if it was visible
    gameOverScreen.classList.add('hidden'); // Hide game over screen if it was visible
}
function closeTutorial(){
    tutorialScreen.classList.add('hidden');
    pauseScreen.classList.remove('hidden'); // Ensure pause screen is hidden when closing tutorial
}

function resumeGame(){
    gamePaused = false;
    pauseScreen.classList.add('hidden'); // Hide pause screen when resuming
}

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
    finalScoreDisplay.textContent = score;

    // Ensure all overlays are hidden and cursor is restored
    pauseScreen.classList.add('hidden'); // NEW: Hide pause screen on game over
    rewardScreen.classList.add('hidden');
    gameContainer.style.cursor = 'default'; // Restore default cursor on game over

    // It's good practice to remove event listeners here if not already handled by reload
    gameContainer.removeEventListener('mousemove', handleMouseMove);
    gameContainer.removeEventListener('mousedown', () => { });
    gameContainer.removeEventListener('mouseup', () => { });
    document.removeEventListener('keydown', () => { });
    document.removeEventListener('keyup', () => { });
    rewardHealthBtn.removeEventListener('click', applyHealthReward);
    rewardFirerateBtn.removeEventListener('click', applyFireRateReward);
    startGameBtn.removeEventListener('click', initializeGame);
}

function initializeGame() {
    startScreen.classList.add('hidden');
    gameContainer.classList.remove('hidden');

    playerX = window.innerWidth / 2;
    playerY = window.innerHeight / 2;
    player.style.left = `${playerX}px`;
    player.style.top = `${playerY}px`;

    playerHealth = 20;
    playerMaxHealth = 20;
    healthDisplay.textContent = playerHealth;

    score = 0;
    scoreDisplay.textContent = score;
    rewardsGiven = 0;
    baseFireRate = 100;
    currentAttackMode = 1;
    currentFireRate = baseFireRate;
    currentEnemySpawnInterval = 1000;
    nextScoreIncreaseMilestone = SCORE_BASED_SPAWN_INCREASE_INTERVAL;

    gamePaused = false;
    pauseScreen.classList.add('hidden'); // Ensure pause screen is hidden at start

    gameLoop();
    enemyGenerationInterval = setInterval(createEnemy, currentEnemySpawnInterval);
}

function gameLoop() {
    const currentDx = playerX - prevPlayerX;
    const currentDy = playerY - prevPlayerY;
    const currentMagnitude = Math.sqrt(currentDx * currentDx + currentDy * currentDy);

    if (currentMagnitude > 0) {
        lastMovedDirection.x = currentDx / currentMagnitude;
        lastMovedDirection.y = currentDy / currentMagnitude;
    }

    if (!gamePaused) {
        updatePlayerPosition();
        moveEnemies();
        moveBullets();

        if (isMouseDown && (performance.now() - lastShotTime > currentFireRate)) {
            fireBulletsInCurrentMode();
            lastShotTime = performance.now();
        }
    }

    if (playerHealth > 0) {
        gameInterval = requestAnimationFrame(gameLoop);
    }
}

startGameBtn.addEventListener('click', initializeGame);