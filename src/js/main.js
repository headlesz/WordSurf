/**
 * WordSurf - Main
 * Entry point for the application
 */

// Enable debug mode for development


// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('WordSurf initializing...');
    
    // Initialize the game
    Game.init();
    
    // For development: Add keyboard shortcuts
    if (CONFIG.debug.enabled) {
        // Add debug keyboard shortcuts
        window.addEventListener('keydown', (event) => {
            // Ctrl+D: Toggle debug mode
            if (event.ctrlKey && event.code === 'KeyD') {
                CONFIG.debug.enabled = !CONFIG.debug.enabled;
                console.log('Debug mode:', CONFIG.debug.enabled ? 'enabled' : 'disabled');
                event.preventDefault();
            }
            
            // Ctrl+R: Reset game
            if (event.ctrlKey && event.code === 'KeyR') {
                Game.reset();
                console.log('Game reset');
                event.preventDefault();
            }
            
            // Escape: Pause/resume game
            if (event.code === 'Escape') {
                if (Game.state.isPaused) {
                    Game.resume();
                    console.log('Game resumed');
                } else if (Game.state.isPlaying) {
                    Game.pause();
                    console.log('Game paused');
                }
            }
        });
    }
});

// Handle errors
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    
    // Show error message if in debug mode
    if (CONFIG.debug.enabled) {
        const errorMessage = document.createElement('div');
        errorMessage.style.position = 'fixed';
        errorMessage.style.top = '10px';
        errorMessage.style.left = '10px';
        errorMessage.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
        errorMessage.style.color = 'white';
        errorMessage.style.padding = '10px';
        errorMessage.style.borderRadius = '5px';
        errorMessage.style.zIndex = '9999';
        errorMessage.style.maxWidth = '80%';
        errorMessage.style.wordBreak = 'break-word';
        errorMessage.textContent = `Error: ${event.error.message}`;
        
        document.body.appendChild(errorMessage);
        
        // Remove after 5 seconds
        setTimeout(() => {
            document.body.removeChild(errorMessage);
        }, 5000);
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Show error message if in debug mode
    if (CONFIG.debug.enabled) {
        const errorMessage = document.createElement('div');
        errorMessage.style.position = 'fixed';
        errorMessage.style.top = '10px';
        errorMessage.style.left = '10px';
        errorMessage.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
        errorMessage.style.color = 'white';
        errorMessage.style.padding = '10px';
        errorMessage.style.borderRadius = '5px';
        errorMessage.style.zIndex = '9999';
        errorMessage.style.maxWidth = '80%';
        errorMessage.style.wordBreak = 'break-word';
        errorMessage.textContent = `Promise Error: ${event.reason.message || event.reason}`;
        
        document.body.appendChild(errorMessage);
        
        // Remove after 5 seconds
        setTimeout(() => {
            document.body.removeChild(errorMessage);
        }, 5000);
    }
});

// Log initialization complete
console.log('WordSurf initialization complete');
