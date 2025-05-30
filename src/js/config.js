/**
 * WordSurf - Configuration
 * Contains game settings and API configurations
 */

const CONFIG = {
    // Game settings
    game: {
        playerSpeed: 5,           // Base movement speed
        jumpForce: 8,             // Jump height
        gravity: 0.5,             // Gravity force
        platformWidth: 2,         // Width of platform segments
        minPlatformHeight: 0.5,   // Minimum height of platforms
        maxCurviness: 10,         // Maximum curviness value (0-10 scale)
        scorePerWord: 10,         // Score awarded per word surfed
        bonusMultiplier: 2,       // Score multiplier for perfect surfing
        cameraFollowSpeed: 0.1,   // How quickly camera follows player
        backgroundColor: 0x121212 // Background color (dark gray)
    },
    
    // API Keys (replace with your actual keys in production)
    apiKeys: {
        apify: "",
        bemAI: "",
        openAI: "",
        minimax: "",
        browserbase: "YOUR_BROWSERBASE_KEY",
        aws: {
            region: "us-west-2",
            identityPoolId: "YOUR_IDENTITY_POOL_ID",
            userPoolId: "YOUR_USER_POOL_ID",
            userPoolWebClientId: "YOUR_CLIENT_ID"
        }
    },
    
    // API Endpoints
    endpoints: {
        apify: "https://api.apify.com/v2/acts/aYG0l9s7dbB7j3gbS/runs",
        bemAI: "https://api.bem.ai/",
        openAI: "https://api.openai.com/v1/chat/completions",
        minimax: "https://api.minimaxi.chat/v1/t2a_v2",
        browserbase: "https://api.browserbase.com/v1/sessions"
    },
    
    // Content Processing
    content: {
        maxArticleLength: 10000,  // Maximum article length to process
        minSentenceLength: 3,     // Minimum words in a sentence to create a platform
        maxSentenceLength: 30,    // Maximum words in a sentence (longer will be split)
        defaultCurviness: 5,      // Default curviness if API fails
        
        // OpenAI prompt for curviness analysis
        openAIPrompt: `
            You are an assistant that analyzes text tone.
            Analyze the tone/mood of each sentence in the following article. Rate each sentence on a "curviness" scale from 0 to 10.
            - 0 means the sentence is very neutral, flat, or factual in tone.
            - 10 means the sentence is extremely dynamic, emotional, or intense in tone.
            Provide the results as a JSON array where each element has:
              "sentence": <the original sentence text>,
              "curviness": <score from 0 to 10 (number)>.
            Include every sentence from the article in order. Use the exact sentences as they appear.
            Do NOT include any extra text or explanations besides the JSON.
            
            Article Text:
            {articleText}
        `
    },
    
    // Audio settings
    audio: {
        enabled: true,
        volume: 0.7,
        preloadSentences: 2,      // Number of sentences to preload audio for
        fallbackToWebSpeech: true // Use Web Speech API if MiniMax fails
    },
    
    // Debug settings
    debug: {
        enabled: true,           // Enable debug mode
        showFPS: false,           // Show FPS counter
        skipApis: false,          // Skip all API calls and use mock data
        skipBemAI: false,          // Skip only BEM AI API calls (useful for CORS issues)
        logApiCalls: true         // Log API requests and responses
    }
};
