/**
 * WordSurf - Content Pipeline
 * Handles fetching and processing web content
 */

const ContentPipeline = {
    // Store the processed article data
    articleData: null,
    
    /**
     * Initializes the content pipeline
     */
    init: function() {
        Utils.debugLog('Content pipeline initialized');
    },
    
    /**
     * Processes a URL through the entire pipeline
     * @param {string} url - URL to process
     * @returns {Promise<object>} Processed article data
     */
    processUrl: async function(url) {
        try {
            Utils.updateLoadingProgress(10, 'Fetching article content...');
            
            // Step 1: Fetch article content using Apify
            const articleContent = await this.fetchArticleContent(url);
            Utils.updateLoadingProgress(30, 'Structuring content...');
            
            // Step 2: Structure the content using BEM AI
            const structuredContent = await this.structureContent(articleContent, url);
            Utils.updateLoadingProgress(60, 'Analyzing tone...');
            
            // Step 3: Analyze tone and assign curviness using OpenAI
            const contentWithCurviness = await this.analyzeTone(structuredContent);
            Utils.updateLoadingProgress(90, 'Finalizing...');
            
            // Store the processed data
            this.articleData = contentWithCurviness;
            
            Utils.updateLoadingProgress(100, 'Ready!');
            return contentWithCurviness;
            
        } catch (error) {
            console.error('Error processing URL:', error);
            Utils.updateLoadingProgress(100, 'Error loading content');
            
            // If debug mode is enabled and we're skipping APIs, return mock data
            if (CONFIG.debug.enabled && CONFIG.debug.skipApis) {
                const mockData = await this.generateMockArticleData(url);
                this.articleData = mockData;
                return mockData;
            }
            
            throw error;
        }
    },
    
    /**
     * Fetches article content using Apify
     * @param {string} url - URL to fetch
     * @returns {Promise<object>} Article content
     */
    fetchArticleContent: async function(url) {
        // If debug mode is enabled and we're skipping APIs, return mock data
        if (CONFIG.debug.enabled && CONFIG.debug.skipApis) {
            return Utils.generateMockResponse('apify', { url });
        }
        
        try {
            Utils.debugLog('Starting Apify content extraction for: ' + url);
            
            // Make a single call to Apify with waitForFinish=true to wait for the result
            const response = await fetch(`${CONFIG.endpoints.apify}?token=${CONFIG.apiKeys.apify}&waitForFinish=300`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "startUrls": [
                        {
                            "url": url
                        }
                    ],
                    "useSitemaps": false,
                    "respectRobotsTxtFile": true,
                    "crawlerType": "playwright:adaptive",
                    "includeUrlGlobs": [],
                    "excludeUrlGlobs": [],
                    "keepUrlFragments": false,
                    "ignoreCanonicalUrl": false,
                    "maxCrawlDepth": 20,
                    "maxCrawlPages": 9999999,
                    "initialConcurrency": 0,
                    "maxConcurrency": 200,
                    "initialCookies": [],
                    "proxyConfiguration": {
                        "useApifyProxy": true
                    },
                    "maxSessionRotations": 10,
                    "maxRequestRetries": 5,
                    "requestTimeoutSecs": 60,
                    "minFileDownloadSpeedKBps": 128,
                    "dynamicContentWaitSecs": 10,
                    "waitForSelector": "",
                    "softWaitForSelector": "",
                    "maxScrollHeightPixels": 5000,
                    "keepElementsCssSelector": "",
                    "removeElementsCssSelector": "nav, footer, script, style, noscript, svg, img[src^='data:'], [role=\"alert\"], [role=\"banner\"], [role=\"dialog\"], [role=\"alertdialog\"], [role=\"region\"][aria-label*=\"skip\" i], [aria-modal=\"true\"]",
                    "removeCookieWarnings": true,
                    "expandIframes": true,
                    "clickElementsCssSelector": "[aria-expanded=\"false\"]",
                    "htmlTransformer": "readableText",
                    "readableTextCharThreshold": 100,
                    "aggressivePrune": false,
                    "debugMode": false,
                    "debugLog": false,
                    "saveHtml": false,
                    "saveHtmlAsFile": false,
                    "saveMarkdown": true,
                    "saveFiles": false,
                    "saveScreenshots": false,
                    "maxResults": 9999999,
                    "clientSideMinChangePercentage": 15,
                    "renderingTypeDetectionPercentage": 10
                })
            });
            
            if (!response.ok) {
                throw new Error(`Apify API error: ${response.status}`);
            }
            
            const runData = await response.json();
            
            // If the run has finished, get the dataset items directly
            if (runData.data && runData.data.status === 'SUCCEEDED') {
                Utils.debugLog('Apify run completed successfully, fetching results');
                
            const datasetResponse = await fetch(`https://api.apify.com/v2/actor-runs/${runData.data.id}/dataset/items?token=${CONFIG.apiKeys.apify}`);
                
            const items = await datasetResponse.json();
            if (items && items.length > 0) {
                // Log the Apify response structure
                Utils.debugLog('Apify response structure:', items[0]);
                
                // Log the content text
                if (items[0].text) {
                    Utils.debugLog('Apify content text sample:', items[0].text.substring(0, 200) + '...');
                    Utils.debugLog('Apify content text length:', items[0].text.length);
                } else {
                    Utils.debugLog('Warning: No text field found in Apify response');
                }
                
                return items[0]; // Get the first item
            } else {
                throw new Error('No items found in Apify dataset');
            }
            } else {
                throw new Error('Apify run did not complete within the timeout period');
            }
            
        } catch (error) {
            console.error('Error fetching article content:', error);
            
            // Fallback: Use a simple client-side extraction
            return this.fallbackContentExtraction(url);
        }
    },
    
    /**
     * Fallback method to extract content if Apify fails
     * @param {string} url - URL to extract content from
     * @returns {Promise<object>} Extracted content
     */
    fallbackContentExtraction: async function(url) {
        try {
            // Create a proxy request to avoid CORS issues
            // Note: In a real implementation, you would need a server-side proxy
            // For this demo, we'll simulate a response
            
            Utils.debugLog('Using fallback content extraction');
            
            // Extract a title from the URL
            let title = 'Article';
            try {
                // Try to extract a meaningful title from the URL
                const urlObj = new URL(url);
                const pathSegments = urlObj.pathname.split('/').filter(function(segment) { 
                    return segment.length > 0; 
                });
                
                if (pathSegments.length > 0) {
                    // Get the last path segment and convert it to a readable title
                    const lastSegment = pathSegments[pathSegments.length - 1];
                    title = lastSegment
                        .replace(/[-_]/g, ' ')  // Replace hyphens and underscores with spaces
                        .replace(/\.[^/.]+$/, ''); // Remove file extension if present
                    
                    // Capitalize first letter of each word
                    title = title.split(' ')
                        .map(function(word) { 
                            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(); 
                        })
                        .join(' ');
                } else {
                    // Use the hostname if no path segments
                    title = urlObj.hostname.replace('www.', '');
                }
            } catch (e) {
                // If URL parsing fails, use the fallback title
                title = url.split('/').pop() || 'Article';
            }
            
            // Simulate a fetch response with guaranteed content
            return {
                url: url,
                title: title,
                text: "This is fallback content. The original article could not be fetched. This text is generated as a placeholder. Each sentence will become a platform in the game. The content extraction API returned an error or invalid data. We're using this text instead to ensure the game functions properly."
            };
        } catch (error) {
            console.error('Fallback extraction failed:', error);
            
            // Return minimal data to prevent complete failure
            return {
                url: url,
                title: 'Article',
                text: "Fallback content. Unable to fetch article. This is emergency fallback text to prevent the game from crashing."
            };
        }
    },
    
    /**
     * Structures content using BEM AI
     * @param {object} articleContent - Article content from Apify
     * @param {string} url - Original URL
     * @returns {Promise<object>} Structured content
     */
    structureContent: async function(articleContent, url) {
        // Log the article content received from Apify
        Utils.debugLog('Article content received for structuring:', {
            url: articleContent.url,
            title: articleContent.title,
            textLength: articleContent.text ? articleContent.text.length : 0
        });
        // If debug mode is enabled and we're skipping all APIs or specifically BEM AI, return mock data or use fallback
        if (CONFIG.debug.enabled && (CONFIG.debug.skipApis || CONFIG.debug.skipBemAI)) {
            if (CONFIG.debug.skipApis) {
                Utils.debugLog('Skipping BEM AI API call (skipApis enabled) - using mock data');
                return Utils.generateMockResponse('bemAI', { url });
            } else {
                Utils.debugLog('Skipping BEM AI API call (skipBemAI enabled) - using fallback method');
                return this.fallbackStructureContent(articleContent, url);
            }
        }
        
        try {
            Utils.debugLog('Making BEM AI API call for content structuring');
            
            const response = await fetch(CONFIG.endpoints.bemAI, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': CONFIG.apiKeys.bemAI
                },
                body: JSON.stringify({
                    text: articleContent.text,
                    metadata: {
                        url: articleContent.url,
                        title: articleContent.title,
                        retrievedAt: new Date().toISOString()
                    }
                })
            });
            
            if (!response.ok) {
                throw new Error(`BEM AI API error: ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('Error structuring content:', error);
            
            // Fallback: Structure the content client-side
            return this.fallbackStructureContent(articleContent, url);
        }
    },
    
    /**
     * Fallback method to structure content if BEM AI fails
     * @param {object} articleContent - Article content from Apify
     * @param {string} url - Original URL
     * @returns {object} Structured content
     */
    fallbackStructureContent: function(articleContent, url) {
        Utils.debugLog('Using fallback content structuring');
        
        // Log the article content received for fallback structuring
        Utils.debugLog('Article content for fallback structuring:', {
            url: articleContent.url,
            title: articleContent.title,
            textLength: articleContent.text ? articleContent.text.length : 0
        });
        
        // Ensure articleContent is an object
        if (!articleContent) {
            articleContent = {};
        }
        
        // Ensure text exists, use a default if it doesn't
        const text = articleContent.text || 
            "No content available. This is fallback text generated when the article couldn't be retrieved properly.";
        
        // Split the text into sentences
        const sentences = Utils.splitIntoSentences(text);
        
        // Log the sentences extracted
        Utils.debugLog(`Split content into ${sentences.length} sentences`);
        if (sentences.length > 0) {
            Utils.debugLog('First few sentences:', sentences.slice(0, 3));
        }
        
        // Group sentences into paragraphs (here we just create one paragraph per sentence)
        // This ensures each sentence is treated individually
        const paragraphs = [];
        
        sentences.forEach((sentence) => {
            paragraphs.push(sentence);
        });
        
        Utils.debugLog(`Created ${paragraphs.length} paragraphs from ${sentences.length} sentences`);
        
        // Create the structured content
        const structuredContent = {
            source: {
                url: url,
                title: articleContent.title,
                retrievedAt: new Date().toISOString()
            },
            paragraphs: []
        };
        
        // Add each sentence as its own paragraph
        // This ensures each sentence gets its own wave object
        paragraphs.forEach((paragraphText, pIndex) => {
            // Each paragraph contains exactly one sentence
            const sentenceText = paragraphText;
            
            const sentenceData = {
                id: `s${pIndex}`,
                text: sentenceText,
                length: Utils.countWords(sentenceText)
            };
            
            structuredContent.paragraphs.push({
                index: pIndex,
                text: paragraphText,
                sentences: [sentenceData] // Each paragraph has exactly one sentence
            });
        });
        
        Utils.debugLog(`Structured content created with ${structuredContent.paragraphs.length} paragraphs`);
        
        return structuredContent;
    },
    
    /**
     * Analyzes tone and assigns curviness using OpenAI
     * @param {object} structuredContent - Structured content from BEM AI
     * @returns {Promise<object>} Content with curviness scores
     */
    analyzeTone: async function(structuredContent) {
        // If debug mode is enabled and we're skipping APIs, return mock data
        if (CONFIG.debug.enabled && CONFIG.debug.skipApis) {
            return this.mergeCurvinessScores(structuredContent, 
                await Utils.generateMockResponse('openAI'));
        }
        
        try {
            // Extract all sentences from the structured content
            const allSentences = [];
            structuredContent.paragraphs.forEach(paragraph => {
                paragraph.sentences.forEach(sentence => {
                    allSentences.push(sentence.text);
                });
            });
            
            // Join sentences into a single text for the API call
            const articleText = allSentences.join(' ');
            
            // Replace placeholder in the prompt
            const prompt = CONFIG.content.openAIPrompt.replace('{articleText}', articleText);
            
            const response = await fetch(CONFIG.endpoints.openAI, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.apiKeys.openAI}`
                },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [
                        {
                            role: "system",
                            content: "You are an assistant that analyzes text tone."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0.7
                })
            });
            
            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }
            
            const data = await response.json();
            const content = data.choices[0].message.content;
            
            // Parse the JSON response
            const curvinessData = Utils.safeJsonParse(content, []);
            
            // Merge curviness scores into the structured content
            return this.mergeCurvinessScores(structuredContent, curvinessData);
            
        } catch (error) {
            console.error('Error analyzing tone:', error);
            
            // Fallback: Assign default curviness values
            return this.fallbackAssignCurviness(structuredContent);
        }
    },
    
    /**
     * Merges curviness scores into the structured content
     * @param {object} structuredContent - Structured content
     * @param {array} curvinessData - Curviness data from OpenAI
     * @returns {object} Content with curviness scores
     */
    mergeCurvinessScores: function(structuredContent, curvinessData) {
        // Create a map of sentences to curviness scores
        const curvinessMap = {};
        curvinessData.forEach(item => {
            curvinessMap[item.sentence] = item.curviness;
        });
        
        // Clone the structured content to avoid modifying the original
        const contentWithCurviness = JSON.parse(JSON.stringify(structuredContent));
        
        // Add curviness scores to each sentence
        contentWithCurviness.paragraphs.forEach(paragraph => {
            paragraph.sentences.forEach(sentence => {
                // Look up the curviness score by sentence text
                if (curvinessMap[sentence.text] !== undefined) {
                    sentence.curviness = curvinessMap[sentence.text];
                } else {
                    // If not found, assign a default value
                    sentence.curviness = CONFIG.content.defaultCurviness;
                }
            });
        });
        
        return contentWithCurviness;
    },
    
    /**
     * Fallback method to assign curviness if OpenAI fails
     * @param {object} structuredContent - Structured content
     * @returns {object} Content with curviness scores
     */
    fallbackAssignCurviness: function(structuredContent) {
        Utils.debugLog('Using fallback curviness assignment');
        
        // Clone the structured content to avoid modifying the original
        const contentWithCurviness = JSON.parse(JSON.stringify(structuredContent));
        
        // Simple heuristic for curviness:
        // - Longer sentences get higher curviness
        // - Sentences with exclamation or question marks get higher curviness
        // - Otherwise, assign a random value between 2 and 8
        
        contentWithCurviness.paragraphs.forEach(paragraph => {
            paragraph.sentences.forEach(sentence => {
                let curviness = CONFIG.content.defaultCurviness;
                
                // Length factor (longer = more curved)
                const wordCount = sentence.length || Utils.countWords(sentence.text);
                if (wordCount > 15) {
                    curviness += 2;
                } else if (wordCount < 5) {
                    curviness -= 2;
                }
                
                // Punctuation factor
                if (sentence.text.includes('!')) {
                    curviness += 3;
                } else if (sentence.text.includes('?')) {
                    curviness += 2;
                }
                
                // Add some randomness
                curviness += Math.random() * 2 - 1;
                
                // Clamp to valid range
                sentence.curviness = Math.max(0, Math.min(10, curviness));
            });
        });
        
        return contentWithCurviness;
    },
    
    /**
     * Generates mock article data for testing
     * @param {string} url - URL to generate mock data for
     * @returns {Promise<object>} Mock article data
     */
    generateMockArticleData: async function(url) {
        const mockApifyData = await Utils.generateMockResponse('apify', { url });
        const mockBemData = await Utils.generateMockResponse('bemAI', { url });
        const mockOpenAIData = await Utils.generateMockResponse('openAI');
        
        return this.mergeCurvinessScores(mockBemData, mockOpenAIData);
    },
    
    /**
     * Gets all sentences from the processed article data
     * @returns {array} Array of sentence objects with curviness
     */
    getAllSentences: function() {
        if (!this.articleData) {
            return [];
        }
        
        const allSentences = [];
        this.articleData.paragraphs.forEach(paragraph => {
            paragraph.sentences.forEach(sentence => {
                allSentences.push(sentence);
            });
        });
        
        // Log the total number of sentences extracted
        Utils.debugLog(`Total sentences extracted: ${allSentences.length}`);
        if (allSentences.length > 0) {
            Utils.debugLog('Sample sentence:', allSentences[0]);
        }
        
        return allSentences;
    },
    
    /**
     * Gets the article metadata
     * @returns {object} Article metadata
     */
    getArticleMetadata: function() {
        if (!this.articleData) {
            return {};
        }
        
        return this.articleData.source;
    }
};
