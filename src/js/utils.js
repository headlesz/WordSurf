/**
 * WordSurf - Utility Functions
 * Contains helper functions used throughout the game
 */

const Utils = {
    /**
     * Updates the loading progress bar and status message
     * @param {number} progress - Progress percentage (0-100)
     * @param {string} status - Status message to display
     */
    updateLoadingProgress: function(progress, status) {
        const progressBar = document.querySelector('.progress');
        const statusElement = document.getElementById('loading-status');
        
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        
        if (statusElement && status) {
            statusElement.textContent = status;
        }
    },
    
    /**
     * Shows or hides a screen element (start screen, end screen, etc.)
     * @param {string} screenId - ID of the screen element
     * @param {boolean} show - Whether to show or hide the screen
     */
    toggleScreen: function(screenId, show) {
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.style.display = show ? 'flex' : 'none';
        }
    },
    
    /**
     * Safely parses JSON with error handling
     * @param {string} jsonString - JSON string to parse
     * @param {any} fallback - Fallback value if parsing fails
     * @returns {any} Parsed JSON or fallback value
     */
    safeJsonParse: function(jsonString, fallback = {}) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.error('Error parsing JSON:', error);
            return fallback;
        }
    },
    
    /**
     * Splits text into sentences using regex
     * @param {string} text - Text to split into sentences
     * @returns {string[]} Array of sentences
     */
    splitIntoSentences: function(text) {
        // Check if text is undefined or null
        if (!text) {
            this.debugLog('Warning: Attempted to split undefined or null text');
            return ['No content available'];
        }
        
        this.debugLog('Splitting text into sentences, text length:', text.length);
        
        // Improved sentence splitting regex
        // This handles more cases like ellipses, quotes, and preserves the ending punctuation
        // The regex looks for sentence-ending punctuation followed by whitespace or end of string
        const sentenceRegex = /([.!?][\s\u00A0]|[.!?]$)/g;
        
        // Split the text and reconstruct sentences with their ending punctuation
        let sentences = [];
        let lastIndex = 0;
        let match;
        
        // Use exec to find all matches and capture their positions
        while ((match = sentenceRegex.exec(text)) !== null) {
            // Extract the sentence including its ending punctuation
            const sentence = text.substring(lastIndex, match.index + 1).trim();
            if (sentence.length > 0) {
                sentences.push(sentence);
            }
            lastIndex = match.index + match[0].length;
        }
        
        // Add any remaining text as the last sentence
        if (lastIndex < text.length) {
            const remainingSentence = text.substring(lastIndex).trim();
            if (remainingSentence.length > 0) {
                sentences.push(remainingSentence);
            }
        }
        
        // Filter out empty sentences
        sentences = sentences.filter(s => s.trim().length > 0);
        
        // If no sentences were found, return the entire text as one sentence
        if (sentences.length === 0) {
            this.debugLog('No sentences found using regex, returning entire text as one sentence');
            return [text.trim()];
        }
        
        this.debugLog(`Split text into ${sentences.length} sentences`);
        
        // Log a few sample sentences
        if (sentences.length > 0) {
            this.debugLog('First few sentences:', sentences.slice(0, 3));
        }
        
        return sentences;
    },
    
    /**
     * Counts words in a string
     * @param {string} text - Text to count words in
     * @returns {number} Word count
     */
    countWords: function(text) {
        // Check if text is undefined or null
        if (!text) {
            this.debugLog('Warning: Attempted to count words in undefined or null text');
            return 0;
        }
        
        return text.trim().split(/\s+/).length;
    },
    
    /**
     * Generates a sine wave curve based on curviness with a downward trend
     * @param {number} x - X position along the curve
     * @param {number} length - Total length of the curve
     * @param {number} curviness - Curviness value (0-10)
     * @returns {number} Y position on the curve
     */
    generateCurve: function(x, length, curviness) {
        // Normalize curviness to 0-1 range
        const normalizedCurviness = curviness / CONFIG.game.maxCurviness;
        
        // Calculate amplitude based on curviness (0-5 units)
        const amplitude = normalizedCurviness * 5;
        
        // Calculate frequency based on curviness (1-3 oscillations)
        const frequency = 1 + normalizedCurviness * 2;
        
        // Generate sine wave
        const sineWave = amplitude * Math.sin((2 * Math.PI * frequency * x) / length);
        
        // Apply a -35 degree rotation to the wave
        // Convert -35 degrees to radians
        const angle = -35 * (Math.PI / 180);
        
        // Apply rotation transformation
        // x' = x * cos(angle) - y * sin(angle)
        // y' = x * sin(angle) + y * cos(angle)
        // Since we're only interested in the y-value, we only need y'
        // And we're rotating the wave, not the coordinate system
        const rotatedY = sineWave * Math.cos(angle) - x * Math.sin(angle);
        
        // Add a global downward slope for each platform
        // This ensures each subsequent platform is placed lower
        const globalDownwardSlope = -0.5 * (x / length);
        
        return rotatedY + globalDownwardSlope;
    },
    
    /**
     * Creates a text texture for Three.js
     * @param {string} text - Text to render
     * @param {object} options - Rendering options
     * @returns {THREE.Texture} Text texture
     */
    createTextTexture: function(text, options = {}) {
        const {
            fontSize = 48,
            fontFamily = 'Arial',
            fillColor = '#0066ff', // Changed to blue
            outlineColor = '#ffffff', // Added white outline
            outlineWidth = 3, // Outline width
            backgroundColor = 'transparent',
            padding = 10,
            flipVertically = false // Disable vertical flipping since we're flipping triangles
        } = options;
        
        // Create canvas and context
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // Set font and measure text
        context.font = `${fontSize}px ${fontFamily}`;
        const textMetrics = context.measureText(text);
        
        // Calculate canvas dimensions with padding
        const width = textMetrics.width + padding * 2 + outlineWidth * 2;
        const height = fontSize + padding * 2 + outlineWidth * 2;
        
        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;
        
        // Clear canvas with background color if not transparent
        if (backgroundColor !== 'transparent') {
            context.fillStyle = backgroundColor;
            context.fillRect(0, 0, width, height);
        }
        
        // Apply vertical flip if needed
        if (flipVertically) {
            context.scale(1, -1); // Flip vertically
            context.translate(0, -height); // Adjust for the flip
        }
        
        // Set up text properties
        context.font = `${fontSize}px ${fontFamily}`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Draw text with outline
        context.strokeStyle = outlineColor;
        context.lineWidth = outlineWidth;
        context.strokeText(text, width / 2, height / 2);
        
        // Draw text fill
        context.fillStyle = fillColor;
        context.fillText(text, width / 2, height / 2);
        
        // Create texture from canvas
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        
        return texture;
    },
    
    /**
     * Debounces a function to limit how often it can be called
     * @param {Function} func - Function to debounce
     * @param {number} wait - Milliseconds to wait between calls
     * @returns {Function} Debounced function
     */
    debounce: function(func, wait) {
        let timeout;
        
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    /**
     * Logs messages to console if debug mode is enabled
     * @param {string} message - Message to log
     * @param {any} data - Optional data to log
     */
    debugLog: function(message, data) {
        if (CONFIG.debug.enabled) {
            if (data) {
                console.log(`[WordSurf] ${message}`, data);
            } else {
                console.log(`[WordSurf] ${message}`);
            }
        }
    },
    
    /**
     * Generates a mock response for API calls in debug mode
     * @param {string} apiName - Name of the API
     * @param {object} params - API parameters (optional)
     * @returns {Promise<object>} Mock response
     */
    generateMockResponse: function(apiName, params = {}) {
        // Mock responses for different APIs
        const mockResponses = {
            apify: {
                url: params.url || "https://example.com",
                title: "Sample Article Title",
                contentText: "This is a sample article. It contains several sentences. Each sentence will become a platform in the game. Some sentences are more dynamic and emotional! Others are quite neutral and factual."
            },
            bemAI: {
                source: {
                    url: params.url || "https://example.com",
                    title: "Sample Article Title",
                    retrievedAt: new Date().toISOString()
                },
                paragraphs: [
                    {
                        index: 0,
                        text: "This is a sample article.",
                        sentences: [
                            { id: "s0", text: "This is a sample article.", length: 5 }
                        ]
                    },
                    {
                        index: 1,
                        text: "It contains several sentences.",
                        sentences: [
                            { id: "s1", text: "It contains several sentences.", length: 4 }
                        ]
                    },
                    {
                        index: 2,
                        text: "Each sentence will become a platform in the game.",
                        sentences: [
                            { id: "s2", text: "Each sentence will become a platform in the game.", length: 9 }
                        ]
                    },
                    {
                        index: 3,
                        text: "Some sentences are more dynamic and emotional!",
                        sentences: [
                            { id: "s3", text: "Some sentences are more dynamic and emotional!", length: 7 }
                        ]
                    },
                    {
                        index: 4,
                        text: "Others are quite neutral and factual.",
                        sentences: [
                            { id: "s4", text: "Others are quite neutral and factual.", length: 6 }
                        ]
                    }
                ]
            },
            openAI: [
                { sentence: "This is a sample article.", curviness: 2.0 },
                { sentence: "It contains several sentences.", curviness: 3.5 },
                { sentence: "Each sentence will become a platform in the game.", curviness: 5.0 },
                { sentence: "Some sentences are more dynamic and emotional!", curviness: 8.5 },
                { sentence: "Others are quite neutral and factual.", curviness: 1.5 }
            ]
        };
        
        return new Promise(resolve => {
            setTimeout(() => {
                resolve(mockResponses[apiName] || {});
            }, 500); // Simulate network delay
        });
    }
};
