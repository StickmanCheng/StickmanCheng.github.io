const player = document.getElementById('player');
const gameContainer = document.getElementById('game-container');
const healthDisplay = document.getElementById('current-health');
const gameOverScreen = document.getElementById('game-over-screen');
const rewardScreen = document.getElementById('reward-screen');
const rewardHealthBtn = document.getElementById('reward-health-btn');
const rewardFirerateBtn = document.getElementById('reward-firerate-btn');

const startScreen = document.getElementById('start-screen');
const startGameBtn = document.getElementById('start-game-btn');

const scoreDisplay = document.getElementById('current-score'); // NEW
const finalScoreDisplay = document.getElementById('final-score'); // NEW

let playerHealth = 20;
let playerMaxHealth = 20; 
let playerX = window.innerWidth / 2;
let playerY = window.innerHeight / 2;
const playerSpeed = 5; 
const enemySpeed = 2; 
const bulletSpeed = 10; 

let playerCurrentRotation = 0; 
const playerRotationSpeed = 3; 

let prevPlayerX = playerX;
let prevPlayerY = playerY;
let lastMovedDirection = { x: 0, y: 1 }; 

let keysPressed = {};
let gameInterval;
let enemyGenerationInterval; 
let currentEnemySpawnInterval = 1000; 

let isMouseDown = false;
let lastShotTime = 0;

let baseFireRate = 100; 
let currentAttackMode = 1; 
let currentFireRate = baseFireRate; 

let blackCircleKills = 0;
let redSquareKills = 0;
let currentBlackCircleRewardThreshold = 20; 
let currentRedSquareRewardThreshold = 5; 
const BLACK_TO_RED_RATIO = 4; 

let rewardsGiven = 0;
const MAX_REWARDS = 10; 

let gamePaused = true; 

// NEW: Score variables
let score = 0; 
const SCORE_BASED_SPAWN_INCREASE_INTERVAL = 20; // 每20分加速一次
let nextScoreIncreaseMilestone = SCORE_BASED_SPAWN_INCREASE_INTERVAL;


function updatePlayerPosition() {
    if (gamePaused) return;

    prevPlayerX = playerX;
    prevPlayerY = playerY;

    let newPlayerX = playerX;
    let newPlayerY = playerY;

    if (keysPressed['w'] || keysPressed['W']) newPlayerY -= playerSpeed;
    if (keysPressed['s'] || keysPressed['S']) newPlayerY += playerSpeed;
    if (keysPressed['a'] || keysPressed['A']) newPlayerX -= playerSpeed;
    if (keysPressed['d'] || keysPressed['D']) newPlayerX += playerSpeed;

    newPlayerX = Math.max(0, Math.min(window.innerWidth - player.offsetWidth, newPlayerX));
    newPlayerY = Math.max(0, Math.min(window.innerHeight - player.offsetHeight, newPlayerY));

    playerX = newPlayerX;
    playerY = newPlayerY;

    playerCurrentRotation = (playerCurrentRotation + playerRotationSpeed) % 360;
    player.style.transform = `translate(-50%, -50%) rotate(${playerCurrentRotation}deg)`;

    player.style.left = `${playerX}px`;
    player.style.top = `${playerY}px`;
}

function handleMouseMove(event) {
    if (gamePaused) return;

    prevPlayerX = playerX;
    prevPlayerY = playerY;

    playerX = event.clientX - player.offsetWidth / 2;
    playerY = event.clientY - player.offsetHeight / 2;

    playerX = Math.max(0, Math.min(window.innerWidth - player.offsetWidth, playerX));
    playerY = Math.max(0, Math.min(window.innerHeight - player.offsetHeight, playerY));

    player.style.left = `${playerX}px`;
    player.style.top = `${playerY}px`;
}

document.addEventListener('keydown', (event) => {
    keysPressed[event.key] = true;

    if (!gamePaused) {
        if (event.key === '1') {
            currentAttackMode = 1;
            currentFireRate = baseFireRate; 
            lastShotTime = performance.now(); 
            console.log("Attack Mode: 1 (Single Shot), Cooldown:", currentFireRate);
        } else if (event.key === '2') {
            currentAttackMode = 2;
            currentFireRate = baseFireRate * 3; 
            lastShotTime = performance.now(); 
            console.log("Attack Mode: 2 (Three-shot), Cooldown:", currentFireRate);
        } else if (event.key === '3') {
            currentAttackMode = 3;
            currentFireRate = baseFireRate * 10; 
            lastShotTime = performance.now(); 
            console.log("Attack Mode: 3 (Ten-shot), Cooldown:", currentFireRate);
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

    enemy.targetX = playerX + player.offsetWidth / 2;
    enemy.targetY = playerY + player.offsetHeight / 2;
}

function moveEnemies() {
    if (gamePaused) return;

    const enemies = document.querySelectorAll('.enemy');
    enemies.forEach(enemy => {
        let enemyRect = enemy.getBoundingClientRect();
        let playerRect = player.getBoundingClientRect();

        const dx = (playerX + player.offsetWidth / 2) - enemyRect.left;
        const dy = (playerY + player.offsetHeight / 2) - enemyRect.top;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 1) { 
            enemy.style.left = `${parseFloat(enemy.style.left) + (dx / distance) * enemySpeed}px`;
            enemy.style.top = `${parseFloat(enemy.style.top) + (dy / distance) * enemySpeed}px`;
        }

        if (checkCollision(playerRect, enemyRect)) {
            playerHealth -= parseInt(enemy.dataset.damage);
            healthDisplay.textContent = playerHealth;
            enemy.remove(); 
            if (playerHealth <= 0) {
                endGame();
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

    const playerCenterX = playerX + player.offsetWidth / 2;
    const playerCenterY = playerY + player.offsetHeight / 2;

    bullet.style.left = `${playerCenterX - bullet.offsetWidth / 2}px`;
    bullet.style.top = `${playerCenterY - bullet.offsetHeight / 2}px`;
    gameContainer.appendChild(bullet);

    bullet.velX = directionX * bulletSpeed;
    bullet.velY = directionY * bulletSpeed;
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
                    blackCircleKills++;
                    score += 1; // NEW: Add score for black circle
                } else if (enemy.dataset.type === 'square') {
                    redSquareKills++;
                    score += 4; // NEW: Add score for red square
                }
                scoreDisplay.textContent = score; // NEW: Update score display

                bullet.remove(); 
                enemy.remove(); 
                checkForReward(); 
                checkScoreBasedSpawnIncrease(); // NEW: Check for score-based spawn increase
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

    currentEnemySpawnInterval = Math.max(100, currentEnemySpawnInterval * 0.8);
    console.log(`Enemy spawn interval decreased to: ${currentEnemySpawnInterval}ms`);

    enemyGenerationInterval = setInterval(createEnemy, currentEnemySpawnInterval);
}

// NEW: Function to check for score-based enemy spawn rate increase
function checkScoreBasedSpawnIncrease() {
    // Only apply if max rewards have been reached AND score threshold is met
    if (rewardsGiven >= MAX_REWARDS && score >= nextScoreIncreaseMilestone) {
        decreaseEnemySpawnInterval(); // Reuse existing function to decrease interval
        nextScoreIncreaseMilestone += SCORE_BASED_SPAWN_INCREASE_INTERVAL; // Update milestone for next increase
        console.log(`Score-based enemy spawn interval decrease triggered! Current Score: ${score}, Next milestone: ${nextScoreIncreaseMilestone}`);
    }
}


// Reward System Functions
function checkForReward() {
    if (rewardsGiven >= MAX_REWARDS) {
        return;
    }

    const totalEquivalentKills = blackCircleKills + (redSquareKills * BLACK_TO_RED_RATIO);

    if (blackCircleKills >= currentBlackCircleRewardThreshold || redSquareKills >= currentRedSquareRewardThreshold || totalEquivalentKills >= currentBlackCircleRewardThreshold) {
        showRewardScreen();
    }
}

function showRewardScreen() {
    gamePaused = true;
    rewardScreen.classList.remove('hidden');
    document.querySelectorAll('.enemy').forEach(e => e.remove());
    document.querySelectorAll('.bullet').forEach(b => b.remove());
}

function hideRewardScreen() {
    rewardScreen.classList.add('hidden');
    gamePaused = false;
    blackCircleKills = 0;
    redSquareKills = 0;
    
    rewardsGiven++;
    console.log(`Reward #${rewardsGiven} given.`);

    if (rewardsGiven < MAX_REWARDS) {
        currentBlackCircleRewardThreshold = Math.ceil(currentBlackCircleRewardThreshold * 1.25);
        currentRedSquareRewardThreshold = Math.ceil(currentRedSquareRewardThreshold * 1.25);
        console.log(`Next reward thresholds: Black: ${currentBlackCircleRewardThreshold}, Red: ${currentRedSquareRewardThreshold}`);
    } else {
        console.log("Max rewards reached. No more reward opportunities.");
        currentBlackCircleRewardThreshold = Infinity;
        currentRedSquareRewardThreshold = Infinity;
    }

    decreaseEnemySpawnInterval();
}

function applyHealthReward() {
    playerMaxHealth += 5;
    playerHealth = playerMaxHealth; 
    healthDisplay.textContent = playerHealth;
    hideRewardScreen();
}

function applyFireRateReward() {
    baseFireRate = Math.max(20, baseFireRate * 0.75); 
    console.log(`Base Fire Rate reduced to: ${baseFireRate}ms`);

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
    finalScoreDisplay.textContent = score; // NEW: Display final score on game over

    gameContainer.removeEventListener('mousemove', handleMouseMove);
    gameContainer.removeEventListener('mousedown', () => {}); 
    gameContainer.removeEventListener('mouseup', () => {}); 
    document.removeEventListener('keydown', () => {});
    document.removeEventListener('keyup', () => {});
    rewardHealthBtn.removeEventListener('click', applyHealthReward);
    rewardFirerateBtn.removeEventListener('click', applyFireRateReward);
    startGameBtn.removeEventListener('click', initializeGame); 

    rewardScreen.classList.add('hidden'); 
}

function initializeGame() {
    startScreen.classList.add('hidden'); 
    gameContainer.classList.remove('hidden'); 

    playerX = window.innerWidth / 2;
    playerY = window.innerHeight / 2;
    player.style.left = `${playerX}px`;
    player.style.top = `${playerY}px`;
    
    // Reset all game state variables for a new game
    playerHealth = 20;
    playerMaxHealth = 20;
    healthDisplay.textContent = playerHealth;
    
    score = 0; // NEW: Reset score for new game
    scoreDisplay.textContent = score; // NEW: Update score display
    blackCircleKills = 0;
    redSquareKills = 0;
    currentBlackCircleRewardThreshold = 20;
    currentRedSquareRewardThreshold = 5;
    rewardsGiven = 0;
    baseFireRate = 100;
    currentAttackMode = 1;
    currentFireRate = baseFireRate;
    currentEnemySpawnInterval = 1000;
    nextScoreIncreaseMilestone = SCORE_BASED_SPAWN_INCREASE_INTERVAL; // Reset score milestone

    gamePaused = false; 

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