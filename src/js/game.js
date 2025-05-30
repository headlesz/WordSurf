/**
 * WordSurf - Game
 * Main game module that ties everything together
 */

const Game = {
    // Three.js objects
    renderer: null,
    scene: null,
    camera: null,
    
    // Game state
    state: {
        isLoading: false,
        isPlaying: false,
        isPaused: false,
        currentUrl: null,
        level: null,
        startTime: 0,
        elapsedTime: 0
    },
    
    // Background iframe
    backgroundIframe: null,
    
    /**
     * Initializes the game
     */
    init: function() {
        Utils.debugLog('Initializing game');
        
        // Initialize Three.js
        this.initThreeJs();
        
        // Initialize modules
        ContentPipeline.init();
        GeometryGenerator.init();
        AudioManager.init();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Show start screen
        Utils.toggleScreen('loading-screen', false);
        Utils.toggleScreen('start-screen', true);
        
        Utils.debugLog('Game initialized');
    },
    
    /**
     * Initializes Three.js
     */
    initThreeJs: function() {
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('game-canvas'),
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(CONFIG.game.backgroundColor, 1);
        
        // Create scene
        this.scene = new THREE.Scene();
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            60, // Field of view
            window.innerWidth / window.innerHeight, // Aspect ratio
            0.1, // Near clipping plane
            1000 // Far clipping plane
        );
        this.camera.position.set(0, 5, 15);
        this.camera.lookAt(0, 0, 0);
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 10);
        this.scene.add(directionalLight);
        
        // Add background elements
        const background = GeometryGenerator.createBackground();
        this.scene.add(background);
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
        });
    },
    
    /**
     * Sets up event listeners
     */
    setupEventListeners: function() {
        // Start button
        const startButton = document.getElementById('start-button');
        if (startButton) {
            startButton.addEventListener('click', () => {
                const urlInput = document.getElementById('url-input');
                const url = urlInput ? urlInput.value : 'https://en.wikipedia.org/wiki/Surfing';
                this.startGame(url);
            });
        }
        
        // Featured content buttons
        const featuredItems = document.querySelectorAll('.featured-item');
        featuredItems.forEach(item => {
            item.addEventListener('click', () => {
                const url = item.getAttribute('data-url');
                if (url) {
                    this.startGame(url);
                }
            });
        });
        
        // Play again button
        const playAgainButton = document.getElementById('play-again-button');
        if (playAgainButton) {
            playAgainButton.addEventListener('click', () => {
                Utils.toggleScreen('end-screen', false);
                Utils.toggleScreen('start-screen', true);
            });
        }
    },
    
    /**
     * Starts the game with the given URL
     * @param {string} url - URL to load content from
     */
    startGame: async function(url) {
        if (this.state.isLoading || this.state.isPlaying) return;
        
        // Set loading state
        this.state.isLoading = true;
        this.state.currentUrl = url;
        
        // Show loading screen
        Utils.toggleScreen('start-screen', false);
        Utils.toggleScreen('loading-screen', true);
        Utils.updateLoadingProgress(0, 'Starting...');
        
        try {
            // Process the URL
            await ContentPipeline.processUrl(url);
            
            // Create the level
            this.createLevel();
            
            // Initialize player
            Player.init(this.scene);
            
            // Position player at start of level
            this.positionPlayerAtStart();
            
            // Load background iframe
            this.loadBackgroundIframe(url);
            
            // Start game loop
            this.startGameLoop();
            
            // Hide loading screen
            Utils.toggleScreen('loading-screen', false);
            
            // Set game state
            this.state.isLoading = false;
            this.state.isPlaying = true;
            this.state.startTime = Date.now();
            
        } catch (error) {
            console.error('Error starting game:', error);
            Utils.updateLoadingProgress(100, 'Error loading content');
            
            // Show error message
            setTimeout(() => {
                Utils.toggleScreen('loading-screen', false);
                Utils.toggleScreen('start-screen', true);
                alert('Error loading content. Please try a different URL.');
            }, 1000);
            
            this.state.isLoading = false;
        }
    },
    
    /**
     * Creates the level from processed content
     */
    createLevel: function() {
        // Get all sentences
        const sentences = ContentPipeline.getAllSentences();
        
        Utils.debugLog(`Game.createLevel: Retrieved ${sentences.length} sentences from ContentPipeline`);
        
        // Create level geometry
        const level = GeometryGenerator.createLevel(sentences);
        
        // Add level to scene
        this.scene.add(level);
        
        // Store level reference
        this.state.level = level;
        
        // Log the number of platforms created
        if (level && level.children) {
            Utils.debugLog(`Game.createLevel: Created level with ${level.children.length} platforms`);
        }
        
        // Preload audio for first few sentences
        AudioManager.preloadSentences(sentences);
    },
    
    /**
     * Positions the player at the start of the level
     */
    positionPlayerAtStart: function() {
        if (!this.state.level || !this.state.level.children.length) return;
        
        // Get the first platform
        const firstPlatform = this.state.level.children[0];
        
        // Position player at the start of the first platform
        const platformLength = firstPlatform.userData.length;
        const startX = firstPlatform.position.x - platformLength / 2 + 1; // +1 to move slightly in from the edge
        const startY = firstPlatform.position.y + 2; // +200 to position above the platform
        
        // Set player position
        Player.state.position.x = startX;
        Player.state.position.y = startY;
        Player.updatePosition();
        
        // Position camera to look at player
        this.updateCamera();
    },
    
    /**
     * Loads the background iframe
     * @param {string} url - URL to load in the iframe
     */
    loadBackgroundIframe: function(url) {
        // Get the background container
        const backgroundContainer = document.getElementById('background-container');
        if (!backgroundContainer) return;
        
        // Clear any existing content
        backgroundContainer.innerHTML = '';
        
        // In a real implementation, we would use Browserbase API here
        // For this demo, we'll create a simple iframe
        
        // Check if we're in debug mode and skipping APIs
        if (CONFIG.debug.enabled && CONFIG.debug.skipApis) {
            // Create a placeholder div instead of iframe
            const placeholderDiv = document.createElement('div');
            placeholderDiv.style.width = '100%';
            placeholderDiv.style.height = '100%';
            placeholderDiv.style.background = 'linear-gradient(to bottom, #333, #111)';
            placeholderDiv.style.display = 'flex';
            placeholderDiv.style.justifyContent = 'center';
            placeholderDiv.style.alignItems = 'center';
            placeholderDiv.style.color = '#666';
            placeholderDiv.style.fontSize = '1.5rem';
            placeholderDiv.textContent = 'Background: ' + url;
            
            backgroundContainer.appendChild(placeholderDiv);
            this.backgroundIframe = placeholderDiv;
            return;
        }
        
        // Create iframe
        try {
            // Note: In a real implementation, we would use Browserbase API
            // This direct iframe approach won't work for most sites due to X-Frame-Options
            const iframe = document.createElement('iframe');
            iframe.src = url;
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = 'none';
            
            backgroundContainer.appendChild(iframe);
            this.backgroundIframe = iframe;
        } catch (error) {
            console.error('Error loading background iframe:', error);
            
            // Fallback to a placeholder
            const placeholderDiv = document.createElement('div');
            placeholderDiv.style.width = '100%';
            placeholderDiv.style.height = '100%';
            placeholderDiv.style.background = 'linear-gradient(to bottom, #333, #111)';
            placeholderDiv.textContent = 'Unable to load background';
            
            backgroundContainer.appendChild(placeholderDiv);
            this.backgroundIframe = placeholderDiv;
        }
    },
    
    /**
     * Updates the background iframe scroll position
     */
    updateBackgroundScroll: function() {
        if (!this.backgroundIframe || !this.state.level) return;
        
        // Get player position
        const playerPos = Player.getPosition();
        
        // Calculate progress through level (0-1)
        const levelLength = this.state.level.userData.totalLength;
        const progress = playerPos.x / levelLength;
        
        // In a real implementation, we would use Browserbase API to scroll the page
        // For this demo, we'll just update a placeholder
        
        if (this.backgroundIframe.style) {
            // If it's our placeholder div, update the background position
            const scrollPercent = Math.min(100, Math.max(0, progress * 100));
            this.backgroundIframe.style.background = 
                `linear-gradient(to bottom, #333, #111) 0 ${scrollPercent}% / 100% 200%`;
        } else if (this.backgroundIframe.contentWindow) {
            // If it's an iframe, try to scroll it
            try {
                const scrollHeight = this.backgroundIframe.contentDocument.body.scrollHeight;
                const scrollY = scrollHeight * progress;
                this.backgroundIframe.contentWindow.scrollTo(0, scrollY);
            } catch (error) {
                // Ignore errors (cross-origin restrictions)
            }
        }
    },
    
    /**
     * Starts the game loop
     */
    startGameLoop: function() {
        // Store the last time for delta calculation
        let lastTime = performance.now();
        
        // Animation loop
        const animate = (time) => {
            // Calculate delta time
            const deltaTime = (time - lastTime) / 1000; // Convert to seconds
            lastTime = time;
            
            // Skip if game is not playing
            if (!this.state.isPlaying) return;
            
            // Update game
            this.update(deltaTime);
            
            // Render
            this.render();
            
            // Request next frame
            requestAnimationFrame(animate);
        };
        
        // Start the loop
        requestAnimationFrame(animate);
    },
    
    /**
     * Updates the game state
     * @param {number} deltaTime - Time since last update
     */
    update: function(deltaTime) {
        // Cap delta time to avoid large jumps
        const cappedDelta = Math.min(deltaTime, 0.1);
        
        // Update player
        Player.update(cappedDelta, this.state.level);
        
        // Update camera
        this.updateCamera();
        
        // Update background scroll
        this.updateBackgroundScroll();
        
        // Check for level completion
        this.checkLevelCompletion();
        
        // Update elapsed time
        this.state.elapsedTime = (Date.now() - this.state.startTime) / 1000;
    },
    
    /**
     * Updates the camera position to follow the player
     */
    updateCamera: function() {
        if (!this.camera) return;
        
        // Get player position
        const playerPos = Player.getPosition();
        
        // Calculate target camera position
        const targetX = playerPos.x;
        const targetY = playerPos.y + 3; // Look slightly above player
        
        // Smoothly move camera
        this.camera.position.x += (targetX - this.camera.position.x) * CONFIG.game.cameraFollowSpeed;
        this.camera.position.y += (targetY - this.camera.position.y) * CONFIG.game.cameraFollowSpeed;
        
        // Keep camera looking at player's horizontal position
        this.camera.lookAt(targetX, playerPos.y, 0);
    },
    
    /**
     * Renders the scene
     */
    render: function() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    },
    
    /**
     * Checks if the level is complete
     */
    checkLevelCompletion: function() {
        if (!this.state.level || !this.state.isPlaying) return;
        
        // Get player position
        const playerPos = Player.getPosition();
        
        // Get level length
        const levelLength = this.state.level.userData.totalLength;
        
        // Check if player has reached the end of the level
        if (playerPos.x >= levelLength) {
            this.endLevel();
        }
        
        // Check if player has fallen off the level
        if (playerPos.y < -20) {
            this.endLevel();
        }
    },
    
    /**
     * Ends the current level
     */
    endLevel: function() {
        // Stop the game
        this.state.isPlaying = false;
        
        // Stop all audio
        AudioManager.stopAll();
        
        // Show end screen
        const finalScoreElement = document.querySelector('#final-score span');
        if (finalScoreElement) {
            finalScoreElement.textContent = Player.getScore();
        }
        
        Utils.toggleScreen('end-screen', true);
        
        // Save progress (in a real implementation, this would use AWS Amplify)
        this.saveProgress();
    },
    
    /**
     * Saves the player's progress
     */
    saveProgress: function() {
        // In a real implementation, this would use AWS Amplify to save to DynamoDB
        // For this demo, we'll just log to console
        
        const progressData = {
            url: this.state.currentUrl,
            title: ContentPipeline.getArticleMetadata().title || 'Article',
            completedOn: new Date().toISOString(),
            score: Player.getScore(),
            timeSeconds: Math.floor(this.state.elapsedTime),
            perfectSurfs: Player.getPerfectSurfs()
        };
        
        Utils.debugLog('Saving progress:', progressData);
        
        // In a real implementation:
        // Amplify.API.post('wordsurfApi', '/progress', { body: progressData })
        //   .then(response => console.log('Progress saved'))
        //   .catch(error => console.error('Error saving progress:', error));
    },
    
    /**
     * Pauses the game
     */
    pause: function() {
        if (!this.state.isPlaying || this.state.isPaused) return;
        
        this.state.isPaused = true;
        AudioManager.stopAll();
    },
    
    /**
     * Resumes the game
     */
    resume: function() {
        if (!this.state.isPlaying || !this.state.isPaused) return;
        
        this.state.isPaused = false;
    },
    
    /**
     * Resets the game
     */
    reset: function() {
        // Stop the game
        this.state.isPlaying = false;
        
        // Stop all audio
        AudioManager.stopAll();
        
        // Clear the scene
        if (this.state.level) {
            this.scene.remove(this.state.level);
            this.state.level = null;
        }
        
        // Reset player
        if (Player.object) {
            this.scene.remove(Player.object);
            Player.object = null;
        }
        
        // Clear background
        const backgroundContainer = document.getElementById('background-container');
        if (backgroundContainer) {
            backgroundContainer.innerHTML = '';
        }
        this.backgroundIframe = null;
        
        // Reset state
        this.state = {
            isLoading: false,
            isPlaying: false,
            isPaused: false,
            currentUrl: null,
            level: null,
            startTime: 0,
            elapsedTime: 0
        };
        
        // Show start screen
        Utils.toggleScreen('end-screen', false);
        Utils.toggleScreen('start-screen', true);
    }
};
