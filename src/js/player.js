/**
 * WordSurf - Player
 * Handles player avatar and movement controls
 */

const Player = {
    // Player object (Three.js Object3D)
    object: null,
    
    // Current state
    state: {
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        isJumping: false,
        isGrounded: false,
        currentPlatform: null,
        currentWordIndex: 0,
        score: 0,
        perfectSurfs: 0
    },
    
    // Input state
    input: {
        left: false,
        right: false,
        up: false,
        down: false,
        jump: false
    },
    
    /**
     * Initializes the player
     * @param {THREE.Scene} scene - Scene to add player to
     */
    init: function(scene) {
        // Create player object
        this.object = GeometryGenerator.createPlayer();
        
        // Add to scene
        scene.add(this.object);
        
        // Reset state
        this.resetState();
        
        // Set up input handlers
        this.setupInputHandlers();
        
        Utils.debugLog('Player initialized');
    },
    
    /**
     * Resets the player state
     */
    resetState: function() {
        this.state = {
            position: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            isJumping: false,
            isGrounded: false,
            currentPlatform: null,
            currentWordIndex: 0,
            score: 0,
            perfectSurfs: 0
        };
        
        // Reset input
        this.input = {
            left: false,
            right: false,
            up: false,
            down: false,
            jump: false
        };
        
        // Update score display
        this.updateScoreDisplay();
    },
    
    /**
     * Sets up keyboard input handlers
     */
    setupInputHandlers: function() {
        // Keyboard event listeners
        window.addEventListener('keydown', (event) => {
            this.handleKeyDown(event.code);
        });
        
        window.addEventListener('keyup', (event) => {
            this.handleKeyUp(event.code);
        });
        
        // Touch controls for mobile (simplified)
        const gameCanvas = document.getElementById('game-canvas');
        
        if (gameCanvas) {
            // Touch areas (left, right, jump)
            gameCanvas.addEventListener('touchstart', (event) => {
                const touch = event.touches[0];
                const x = touch.clientX / window.innerWidth;
                
                if (x < 0.3) {
                    // Left third of screen
                    this.input.left = true;
                } else if (x > 0.7) {
                    // Right third of screen
                    this.input.right = true;
                } else {
                    // Middle of screen
                    this.input.jump = true;
                }
                
                event.preventDefault();
            });
            
            gameCanvas.addEventListener('touchend', (event) => {
                // Reset all inputs on touch end
                this.input.left = false;
                this.input.right = false;
                this.input.jump = false;
                
                event.preventDefault();
            });
        }
    },
    
    /**
     * Handles key down events
     * @param {string} keyCode - Key code
     */
    handleKeyDown: function(keyCode) {
        switch (keyCode) {
            case 'ArrowLeft':
            case 'KeyA':
                this.input.left = true;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.input.right = true;
                break;
            case 'ArrowUp':
            case 'KeyW':
                this.input.up = true;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.input.down = true;
                break;
            case 'Space':
                this.input.jump = true;
                break;
        }
    },
    
    /**
     * Handles key up events
     * @param {string} keyCode - Key code
     */
    handleKeyUp: function(keyCode) {
        switch (keyCode) {
            case 'ArrowLeft':
            case 'KeyA':
                this.input.left = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.input.right = false;
                break;
            case 'ArrowUp':
            case 'KeyW':
                this.input.up = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.input.down = false;
                break;
            case 'Space':
                this.input.jump = false;
                break;
        }
    },
    
    /**
     * Updates the player
     * @param {number} deltaTime - Time since last update
     * @param {THREE.Object3D} level - Level object
     */
    update: function(deltaTime, level) {
        // Apply input
        this.processInput(deltaTime);
        
        // Apply physics
        this.applyPhysics(deltaTime);
        
        // Check collisions with platforms
        this.checkPlatformCollisions(level);
        
        // Update player position
        this.updatePosition();
        
        // Check for word surfing
        this.checkWordSurfing();
    },
    
    /**
     * Processes player input
     * @param {number} deltaTime - Time since last update
     */
    processInput: function(deltaTime) {
        // Horizontal movement
        if (this.input.left) {
            this.state.velocity.x = Math.max(this.state.velocity.x - 0.5, -CONFIG.game.playerSpeed);
        } else if (this.input.right) {
            this.state.velocity.x = Math.min(this.state.velocity.x + 0.5, CONFIG.game.playerSpeed);
        } else {
            // Slow down if no input
            this.state.velocity.x *= 0.9;
        }
        
        // Jumping
        if (this.input.jump && this.state.isGrounded && !this.state.isJumping) {
            this.state.velocity.y = CONFIG.game.jumpForce;
            this.state.isJumping = true;
            this.state.isGrounded = false;
        }
    },
    
    /**
     * Applies physics to player
     * @param {number} deltaTime - Time since last update
     */
    applyPhysics: function(deltaTime) {
        // Apply gravity
        this.state.velocity.y -= CONFIG.game.gravity;
        
        // Apply velocity to position
        this.state.position.x += this.state.velocity.x * deltaTime;
        this.state.position.y += this.state.velocity.y * deltaTime;
        
        // Terminal velocity
        this.state.velocity.y = Math.max(this.state.velocity.y, -20);
    },
    
    /**
     * Checks collisions with platforms
     * @param {THREE.Object3D} level - Level object
     */
    checkPlatformCollisions: function(level) {
        if (!level) return;
        
        // Get player position
        const playerX = this.state.position.x;
        const playerY = this.state.position.y;
        const playerRadius = 0.5; // Approximate player radius
        
        // Check if falling
        const isFalling = this.state.velocity.y < 0;
        
        // Reset grounded state if falling
        if (isFalling) {
            this.state.isGrounded = false;
        }
        
        // Find the platform the player is over
        let currentPlatform = null;
        let platformY = -Infinity;
        
        // Check each platform in the level
        level.children.forEach(platform => {
            if (!platform.userData || !platform.userData.length) return;
            
            // Get platform bounds
            const platformLength = platform.userData.length;
            const platformLeft = platform.position.x - platformLength / 2;
            const platformRight = platform.position.x + platformLength / 2;
            
            // Check if player is horizontally within platform bounds
            if (playerX >= platformLeft && playerX <= platformRight) {
                // Get platform height at player's X position
                const relativeX = playerX - platform.position.x;
                const platformHeightAtX = GeometryGenerator.getPlatformYAtX(platform, relativeX);
                const absolutePlatformY = platform.position.y + platformHeightAtX;
                
                // Check if this is the highest platform below the player
                if (absolutePlatformY > platformY && absolutePlatformY <= playerY + playerRadius) {
                    platformY = absolutePlatformY;
                    currentPlatform = platform;
                }
            }
        });
        
        // If we found a platform and the player is falling
        if (currentPlatform && isFalling) {
            // Check if player is close enough to the platform to land
            const distanceToGround = playerY - platformY;
            
            if (distanceToGround <= playerRadius) {
                // Land on the platform
                this.state.position.y = platformY + playerRadius;
                this.state.velocity.y = 0;
                this.state.isGrounded = true;
                this.state.isJumping = false;
                
                // Set current platform
                if (this.state.currentPlatform !== currentPlatform) {
                    this.onPlatformChange(currentPlatform);
                }
                
                this.state.currentPlatform = currentPlatform;
            }
        } else if (!currentPlatform && this.state.isGrounded) {
            // Player has moved off the platform
            this.state.isGrounded = false;
            this.state.currentPlatform = null;
        }
    },
    
    /**
     * Updates player position
     */
    updatePosition: function() {
        if (this.object) {
            // Update object position
            this.object.position.set(
                this.state.position.x,
                this.state.position.y,
                this.state.position.z
            );
            
            // Add a slight tilt based on velocity
            const tiltAngle = -this.state.velocity.x * 0.05;
            this.object.rotation.z = tiltAngle;
        }
    },
    
    /**
     * Handles platform change
     * @param {THREE.Object3D} newPlatform - New platform
     */
    onPlatformChange: function(newPlatform) {
        if (!newPlatform || !newPlatform.userData) return;
        
        // Reset word index
        this.state.currentWordIndex = 0;
        
        // Play sentence audio
        if (newPlatform.userData.sentence) {
            AudioManager.playSentence(newPlatform.userData.sentence);
        }
    },
    
    /**
     * Checks for word surfing
     */
    checkWordSurfing: function() {
        const platform = this.state.currentPlatform;
        if (!platform || !platform.userData || !platform.userData.words) return;
        
        // Get words array
        const words = platform.userData.words;
        
        // Calculate which word the player is currently over
        const platformLength = platform.userData.length;
        const platformLeft = platform.position.x - platformLength / 2;
        const playerX = this.state.position.x;
        
        // Calculate relative position (0-1) along the platform
        const relativePos = (playerX - platformLeft) / platformLength;
        
        // Calculate word index
        const wordIndex = Math.min(
            Math.floor(relativePos * words.length),
            words.length - 1
        );
        
        // If we've moved to a new word
        if (wordIndex > this.state.currentWordIndex) {
            // Award points for each new word surfed
            const pointsPerWord = CONFIG.game.scorePerWord;
            this.state.score += pointsPerWord;
            
            // Play word audio
            AudioManager.playWord(words[wordIndex]);
            
            // Update score display
            this.updateScoreDisplay();
            
            // Update current word index
            this.state.currentWordIndex = wordIndex;
        }
        
        // Check if we've completed the platform
        if (wordIndex === words.length - 1 && relativePos >= 0.95) {
            // Award bonus for completing the platform
            if (this.state.currentWordIndex === words.length - 1) {
                this.awardPerfectSurf();
                this.state.currentWordIndex = words.length; // Mark as completed
            }
        }
    },
    
    /**
     * Awards points for a perfect surf
     */
    awardPerfectSurf: function() {
        // Award bonus points
        const bonus = CONFIG.game.scorePerWord * CONFIG.game.bonusMultiplier;
        this.state.score += bonus;
        this.state.perfectSurfs++;
        
        // Update score display
        this.updateScoreDisplay();
        
        // Visual feedback (could add particle effects, etc.)
        Utils.debugLog('Perfect surf!');
    },
    
    /**
     * Updates the score display
     */
    updateScoreDisplay: function() {
        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            scoreElement.textContent = this.state.score;
        }
    },
    
    /**
     * Gets the player's position
     * @returns {object} Player position
     */
    getPosition: function() {
        return { ...this.state.position };
    },
    
    /**
     * Gets the player's score
     * @returns {number} Player score
     */
    getScore: function() {
        return this.state.score;
    },
    
    /**
     * Gets the player's perfect surf count
     * @returns {number} Perfect surf count
     */
    getPerfectSurfs: function() {
        return this.state.perfectSurfs;
    }
};
