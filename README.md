# WordSurf

A browser-based 2D side-scrolling platformer where you "surf" across dynamically rendered sentences sourced from real websites.

## Overview

WordSurf is a unique gaming experience that transforms web content into an interactive platformer. The game seamlessly integrates multiple technologies to deliver a novel experience:

- Live web content is transformed into interactive in-game platforms
- Each sentence becomes a platform with curvature based on its emotional tone
- Real-time voice narration reads the text as you surf over it
- The original webpage is displayed as a synchronized background

## Technical Architecture

WordSurf integrates several advanced technologies:

- **Three.js** for WebGL-based rendering of the game
- **Apify** for web scraping of live article content
- **BEM AI** for cleaning and structuring the scraped text
- **OpenAI API** for analyzing text tone and assigning "curviness" scores
- **MiniMax Audio** for text-to-speech generation
- **Browserbase** for seamless level suggestion
- **AWS (Amplify + DynamoDB)** for storing player progress

## Getting Started

### Prerequisites

- Modern web browser with WebGL support
- Internet connection

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/wordsurf.git
   cd wordsurf
   ```

2. Open the project in a local web server. You can use any of these methods:

   - Using Python:
     ```
     python -m http.server
     ```

   - Using Node.js and http-server:
     ```
     npm install -g http-server
     http-server
     ```

3. Open your browser and navigate to `http://localhost:8000` (or whatever port your server is using)

### Configuration

To use the external APIs, you'll need to add your API keys to the `src/js/config.js` file:

```javascript
apiKeys: {
    apify: "YOUR_APIFY_KEY",
    bemAI: "YOUR_BEM_AI_KEY",
    openAI: "YOUR_OPENAI_KEY",
    minimax: "YOUR_MINIMAX_KEY",
    browserbase: "YOUR_BROWSERBASE_KEY",
    aws: {
        region: "us-west-2",
        identityPoolId: "YOUR_IDENTITY_POOL_ID",
        userPoolId: "YOUR_USER_POOL_ID",
        userPoolWebClientId: "YOUR_CLIENT_ID"
    }
}
```

## How to Play

1. Enter a URL or choose from the featured content
2. Wait for the content to load and process
3. Use the arrow keys or WASD to control your character:
   - Left/Right (A/D): Move horizontally
   - Space: Jump
4. Surf across the sentences, collecting points for each word you pass over
5. Complete the entire article to finish the level

## Development Mode

The game includes a debug mode for development:

- Set `CONFIG.debug.enabled = true` in `src/js/main.js` to enable debug mode
- Set `CONFIG.debug.skipApis = true` to use mock data instead of making API calls
- Debug keyboard shortcuts:
  - Ctrl+D: Toggle debug mode
  - Ctrl+R: Reset game
  - Escape: Pause/resume game

## Project Structure

```
wordsurf/
├── index.html              # Main HTML file
├── README.md               # This file
├── src/
│   ├── css/
│   │   └── style.css       # Main stylesheet
│   ├── js/
│   │   ├── audio-manager.js    # Handles text-to-speech
│   │   ├── config.js           # Configuration settings
│   │   ├── content-pipeline.js # Content processing pipeline
│   │   ├── game.js             # Main game logic
│   │   ├── geometry-generator.js # Creates platform geometry
│   │   ├── main.js             # Entry point
│   │   ├── player.js           # Player controls and physics
│   │   └── utils.js            # Utility functions
│   └── assets/               # Game assets (images, etc.)
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Three.js for the WebGL rendering engine
- All the API providers that make this integration possible
