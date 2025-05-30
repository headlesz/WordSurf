/**
 * WordSurf - Audio Manager
 * Handles text-to-speech functionality using MiniMax Audio
 */

const AudioManager = {
    // Audio context for Web Audio API
    audioContext: null,
    
    // Queue of sentences to process
    audioQueue: [],
    
    // Cache of audio buffers
    audioCache: {},
    
    // Currently playing audio sources
    activeSources: [],
    
    // Web Speech API synthesis object (fallback)
    speechSynthesis: window.speechSynthesis,
    
    // Flag to track if audio is enabled
    enabled: true,
    
    /**
     * Initializes the audio manager
     */
    init: function() {
        // Create audio context
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            Utils.debugLog('Audio context initialized');
        } catch (error) {
            console.error('Failed to create audio context:', error);
        }
        
        // Set enabled state from config
        this.enabled = CONFIG.audio.enabled;
        
        // Clear cache and queue
        this.audioCache = {};
        this.audioQueue = [];
        this.activeSources = [];
    },
    
    /**
     * Preloads audio for sentences
     * @param {array} sentences - Array of sentence objects to preload
     * @param {number} count - Number of sentences to preload (default: from config)
     */
    preloadSentences: async function(sentences, count = CONFIG.audio.preloadSentences) {
        if (!this.enabled || !sentences || sentences.length === 0) {
            return;
        }
        
        // Limit to the specified count
        const sentencesToPreload = sentences.slice(0, count);
        
        // Add to queue
        this.audioQueue = [...this.audioQueue, ...sentencesToPreload];
        
        // Start processing the queue
        this.processAudioQueue();
    },
    
    /**
     * Processes the audio queue
     */
    processAudioQueue: async function() {
        if (!this.enabled || this.audioQueue.length === 0) {
            return;
        }
        
        // Process one sentence at a time
        const sentence = this.audioQueue.shift();
        
        // Skip if already cached
        if (this.audioCache[sentence.id || sentence.text]) {
            // Continue with next sentence
            if (this.audioQueue.length > 0) {
                this.processAudioQueue();
            }
            return;
        }
        
        try {
            // Generate audio for the sentence
            const audioBuffer = await this.generateAudio(sentence.text);
            
            // Cache the audio
            this.audioCache[sentence.id || sentence.text] = audioBuffer;
            
            Utils.debugLog(`Audio generated for: ${sentence.text.substring(0, 30)}...`);
            
            // Continue with next sentence
            if (this.audioQueue.length > 0) {
                this.processAudioQueue();
            }
        } catch (error) {
            console.error('Error generating audio:', error);
            
            // Continue with next sentence despite error
            if (this.audioQueue.length > 0) {
                this.processAudioQueue();
            }
        }
    },
    
    /**
     * Generates audio for text using MiniMax Audio
     * @param {string} text - Text to generate audio for
     * @returns {Promise<AudioBuffer>} Audio buffer
     */
    generateAudio: async function(text) {
        // If debug mode is enabled and we're skipping APIs, return mock audio
        if (CONFIG.debug.enabled && CONFIG.debug.skipApis) {
            return this.generateMockAudio(text);
        }
        
        try {
            // Call MiniMax API
            const response = await fetch(CONFIG.endpoints.minimax, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.apiKeys.minimax}`
                },
                body: JSON.stringify({
                    text: text,
                    model: 'speech-02-turbo',
                    voice_setting:{
                    "voice_id":"Grinch",
                    "speed":1,
                    "vol":1,
                    "pitch":0
                },
                
                    streaming: true,
                    speed: 1.0,
                    format: 'mp3'
                })
            });
            
            if (!response.ok) {
                throw new Error(`MiniMax API error: ${response.status}`);
            }
            
            // Get audio data as ArrayBuffer
            const audioData = await response.arrayBuffer();
            
            // Decode audio data
            const audioBuffer = await this.decodeAudioData(audioData);
            
            return audioBuffer;
            
        } catch (error) {
            console.error('Error calling MiniMax API:', error);
            
            // Fallback to Web Speech API if enabled
            if (CONFIG.audio.fallbackToWebSpeech) {
                return this.fallbackGenerateAudio(text);
            }
            
            throw error;
        }
    },
    
    /**
     * Decodes audio data into an AudioBuffer
     * @param {ArrayBuffer} audioData - Audio data to decode
     * @returns {Promise<AudioBuffer>} Decoded audio buffer
     */
    decodeAudioData: function(audioData) {
        return new Promise((resolve, reject) => {
            this.audioContext.decodeAudioData(audioData, 
                (buffer) => resolve(buffer),
                (error) => reject(error)
            );
        });
    },
    
    /**
     * Fallback method to generate audio using Web Speech API
     * @param {string} text - Text to generate audio for
     * @returns {Promise<AudioBuffer>} Audio buffer
     */
    fallbackGenerateAudio: function(text) {
        return new Promise((resolve, reject) => {
            Utils.debugLog('Using Web Speech API fallback');
            
            // Check if speech synthesis is available
            if (!this.speechSynthesis) {
                reject(new Error('Web Speech API not available'));
                return;
            }
            
            // Create a mock audio buffer (since we can't directly get the audio data from Web Speech API)
            // This is a simplified approach - in a real implementation, we would need to capture the audio
            
            // Create an empty buffer with approximate duration
            // Estimate: ~5 characters per word, ~3 words per second
            const wordCount = text.length / 5;
            const durationSeconds = wordCount / 3;
            const sampleRate = this.audioContext.sampleRate;
            const buffer = this.audioContext.createBuffer(
                1, // mono
                Math.ceil(durationSeconds * sampleRate),
                sampleRate
            );
            
            // Store the text to be spoken when this buffer is played
            buffer.userData = { text: text };
            
            resolve(buffer);
        });
    },
    
    /**
     * Generates mock audio for testing
     * @param {string} text - Text to generate mock audio for
     * @returns {Promise<AudioBuffer>} Mock audio buffer
     */
    generateMockAudio: function(text) {
        return new Promise((resolve) => {
            // Create a mock audio buffer
            const sampleRate = this.audioContext ? this.audioContext.sampleRate : 44100;
            
            // Estimate duration based on text length (approx. 3 words per second)
            const wordCount = text.split(/\s+/).length;
            const durationSeconds = wordCount / 3;
            
            // Create buffer
            const buffer = new AudioBuffer({
                length: Math.ceil(durationSeconds * sampleRate),
                numberOfChannels: 1,
                sampleRate: sampleRate
            });
            
            // Store the text to be logged when this buffer is played
            buffer.userData = { text: text };
            
            // Simulate network delay
            setTimeout(() => {
                resolve(buffer);
            }, 300);
        });
    },
    
    /**
     * Plays audio for a sentence
     * @param {object} sentence - Sentence object to play audio for
     * @returns {Promise<void>}
     */
    playSentence: async function(sentence) {
        if (!this.enabled) {
            return;
        }
        
        const sentenceId = sentence.id || sentence.text;
        
        // Check if audio is cached
        if (!this.audioCache[sentenceId]) {
            // Try to generate it now
            try {
                this.audioCache[sentenceId] = await this.generateAudio(sentence.text);
            } catch (error) {
                console.error('Failed to generate audio for sentence:', error);
                return;
            }
        }
        
        // Get the audio buffer
        const buffer = this.audioCache[sentenceId];
        
        // If using Web Speech API fallback (buffer has text property)
        if (buffer.userData && buffer.userData.text) {
            this.speakWithWebSpeech(buffer.userData.text);
            return;
        }
        
        // Play the audio buffer
        this.playAudioBuffer(buffer);
    },
    
    /**
     * Plays an audio buffer
     * @param {AudioBuffer} buffer - Audio buffer to play
     */
    playAudioBuffer: function(buffer) {
        if (!this.audioContext || !buffer) {
            return;
        }
        
        // Create source
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        
        // Create gain node for volume control
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = CONFIG.audio.volume;
        
        // Connect nodes
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Start playback
        source.start(0);
        
        // Add to active sources
        this.activeSources.push(source);
        
        // Remove from active sources when done
        source.onended = () => {
            const index = this.activeSources.indexOf(source);
            if (index !== -1) {
                this.activeSources.splice(index, 1);
            }
        };
    },
    
    /**
     * Speaks text using Web Speech API
     * @param {string} text - Text to speak
     */
    speakWithWebSpeech: function(text) {
        if (!this.speechSynthesis) {
            return;
        }
        
        // Cancel any current speech
        this.speechSynthesis.cancel();
        
        // Create utterance
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set properties
        utterance.volume = CONFIG.audio.volume;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.lang = 'en-US';
        
        // Speak
        this.speechSynthesis.speak(utterance);
    },
    
    /**
     * Plays audio for a word
     * @param {string} word - Word to play audio for
     */
    playWord: function(word) {
        if (!this.enabled) {
            return;
        }
        
        // For simplicity, we'll just use Web Speech API for individual words
        this.speakWithWebSpeech(word);
    },
    
    /**
     * Stops all currently playing audio
     */
    stopAll: function() {
        // Stop all active sources
        this.activeSources.forEach(source => {
            try {
                source.stop();
            } catch (error) {
                // Ignore errors (source might have already ended)
            }
        });
        
        // Clear active sources
        this.activeSources = [];
        
        // Cancel any Web Speech API utterances
        if (this.speechSynthesis) {
            this.speechSynthesis.cancel();
        }
    },
    
    /**
     * Sets the audio volume
     * @param {number} volume - Volume level (0-1)
     */
    setVolume: function(volume) {
        // Clamp volume to valid range
        const clampedVolume = Math.max(0, Math.min(1, volume));
        
        // Update config
        CONFIG.audio.volume = clampedVolume;
    },
    
    /**
     * Enables or disables audio
     * @param {boolean} enabled - Whether audio should be enabled
     */
    setEnabled: function(enabled) {
        this.enabled = enabled;
        CONFIG.audio.enabled = enabled;
        
        if (!enabled) {
            this.stopAll();
        }
    },
    
    /**
     * Clears the audio cache
     */
    clearCache: function() {
        this.audioCache = {};
    }
};
