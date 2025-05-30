/**
 * WordSurf - Geometry Generator
 * Creates Three.js geometry for sentence platforms based on curviness
 */

const GeometryGenerator = {
    // Cache for generated geometries
    geometryCache: {},
    
    /**
     * Initializes the geometry generator
     */
    init: function() {
        Utils.debugLog('Geometry generator initialized');
        this.geometryCache = {};
    },
    
    /**
     * Creates a platform for a sentence
     * @param {object} sentence - Sentence object with text and curviness
     * @param {number} index - Index of the sentence in the sequence
     * @returns {THREE.Object3D} Platform object
     */
    createPlatform: function(sentence, index) {
        // Create a container for the platform
        const platform = new THREE.Object3D();
        platform.name = `platform-${sentence.id || index}`;
        
        // Calculate platform dimensions based on sentence length
        const wordCount = sentence.length || Utils.countWords(sentence.text);
        const platformLength = wordCount * 2; // 2 units per word
        
        // Get the curviness value (0-10)
        const curviness = sentence.curviness !== undefined ? 
            sentence.curviness : CONFIG.content.defaultCurviness;
        
        // Create the platform geometry
        const platformMesh = this.createCurvedPlatform(
            platformLength, 
            CONFIG.game.platformWidth, 
            curviness
        );
        
        // Add text to the platform with the same curviness
        const textMesh = this.createTextOnPlatform(sentence.text, platformLength, curviness);
        
        // Position the text slightly above the platform
        textMesh.position.y = 0.1;
        
        // Add meshes to the platform container
        platform.add(platformMesh);
        platform.add(textMesh);
        
        // Store sentence data on the platform for later reference
        platform.userData = {
            sentence: sentence,
            length: platformLength,
            curviness: curviness,
            words: sentence.text.split(/\s+/)
        };
        
        return platform;
    },
    
    /**
     * Creates a curved platform geometry based on curviness
     * @param {number} length - Length of the platform
     * @param {number} width - Width of the platform
     * @param {number} curviness - Curviness value (0-10)
     * @returns {THREE.Mesh} Platform mesh
     */
    createCurvedPlatform: function(length, width, curviness) {
        // Check if we already have this geometry in cache
        const cacheKey = `platform-${length}-${width}-${curviness.toFixed(1)}`;
        if (this.geometryCache[cacheKey]) {
            return this.geometryCache[cacheKey].clone();
        }
        
        // Create a path for the platform based on curviness
        const path = new THREE.Path();
        
        // Number of segments (more segments for smoother curves)
        const segments = Math.max(10, Math.floor(length * 2));
        
        // Generate points along the path
        const points = [];
        for (let i = 0; i <= segments; i++) {
            const x = (i / segments) * length;
            const y = Utils.generateCurve(x, length, curviness);
            points.push(new THREE.Vector2(x, y));
        }
        
        // Create the path from points
        path.setFromPoints(points);
        
        // Create a shape from the path
        const shape = new THREE.Shape();
        
        // Add the top surface of the platform
        shape.setFromPoints(points);
        
        // Close the shape by adding bottom points in reverse
        for (let i = segments; i >= 0; i--) {
            const x = (i / segments) * length;
            const y = Utils.generateCurve(x, length, curviness) - CONFIG.game.minPlatformHeight;
            shape.lineTo(x, y);
        }
        
        shape.closePath();
        
        // Create geometry from the shape
        const geometry = new THREE.ShapeGeometry(shape);
        
        // Center the geometry on the X axis
        geometry.translate(-length / 2, 0, 0);
        
        // Create material
        const material = new THREE.MeshPhongMaterial({
            color: 0x4fc3f7,
            specular: 0x004ba0,
            shininess: 30,
            side: THREE.DoubleSide
        });
        
        // Create mesh
        const mesh = new THREE.Mesh(geometry, material);
        
        // Add collision data
        mesh.userData.isCollidable = true;
        mesh.userData.curveFunction = (x) => {
            // Convert from mesh-local to curve-local coordinates
            const curveX = x + length / 2;
            return Utils.generateCurve(curveX, length, curviness);
        };
        
        // Cache the mesh for future use
        this.geometryCache[cacheKey] = mesh.clone();
        
        return mesh;
    },
    
    /**
     * Creates text to display on the platform that follows the curve
     * @param {string} text - Text to display
     * @param {number} platformLength - Length of the platform
     * @param {number} curviness - Curviness value (0-10)
     * @returns {THREE.Mesh} Text mesh
     */
    createTextOnPlatform: function(text, platformLength, curviness = CONFIG.content.defaultCurviness) {
        // Create a texture with the text (blue with white outline)
        font_size = 25
        const texture = Utils.createTextTexture(text, {
            fontSize: font_size, //big number so it renders nicely
            fillColor: '#000000', // Blue text
            outlineColor: '#ffffff', // White outline
            outlineWidth: font_size * 0.15,
            backgroundColor: 'transparent'
        });
        
        // Create material with the texture
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        // Create a curved shape for the text to follow the platform curve
        // Number of segments (more segments for smoother curves)
        const segments = Math.max(20, Math.floor(platformLength * 3));
        
        // Create a custom geometry that follows the curve
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const uvs = [];
        const indices = [];
        
        // Generate vertices for the curved plane
        const textHeight = 0.8; // Height of the text plane (reduced for better visibility)
        
        // Calculate tangent vectors along the curve for better text alignment
        for (let i = 0; i <= segments; i++) {
            const x = (i / segments) * platformLength - platformLength / 2; // Center on x-axis
            const normalizedX = (i / segments) * platformLength;
            
            // Get y position on the curve
            const y = Utils.generateCurve(normalizedX, platformLength, curviness);
            
            // Calculate tangent by sampling nearby points
            const delta = 0.01;
            const y1 = Utils.generateCurve(Math.max(0, normalizedX - delta), platformLength, curviness);
            const y2 = Utils.generateCurve(Math.min(platformLength, normalizedX + delta), platformLength, curviness);
            
            // Tangent vector (not normalized)
            const tangentX = 2 * delta;
            const tangentY = y2 - y1;
            
            // Normalize tangent
            const tangentLength = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
            const normalizedTangentX = tangentX / tangentLength;
            const normalizedTangentY = tangentY / tangentLength;
            
            // Normal vector (perpendicular to tangent)
            const normalX = -normalizedTangentY;
            const normalY = normalizedTangentX;
            
            // Top vertex (offset along normal)
            vertices.push(
                x + normalX * textHeight / 2,
                y + normalY * textHeight / 2,
                0.1 // Slight z-offset to avoid z-fighting
            );
            
            // Bottom vertex (offset along normal)
            vertices.push(
                x - normalX * textHeight / 2,
                y - normalY * textHeight / 2,
                0.1
            );
            
            // UV coordinates (map texture correctly)
            // Swap UV coordinates to fix upside-down text
            uvs.push(i / segments, 1); // Top (was 0)
            uvs.push(i / segments, 0); // Bottom (was 1)
        }
        
        // Generate indices for triangles
        for (let i = 0; i < segments; i++) {
            const topLeft = i * 2;
            const bottomLeft = i * 2 + 1;
            const topRight = (i + 1) * 2;
            const bottomRight = (i + 1) * 2 + 1;
            
            // First triangle (top-left, bottom-left, top-right)
            indices.push(topLeft, bottomLeft, topRight);
            // Second triangle (bottom-left, bottom-right, top-right)
            indices.push(bottomLeft, bottomRight, topRight);
        }
        
        // Set geometry attributes
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        
        // Compute normals for proper lighting
        geometry.computeVertexNormals();
        
        // Create mesh
        const mesh = new THREE.Mesh(geometry, material);
        
        return mesh;
    },
    
    /**
     * Creates a complete level from sentences
     * @param {array} sentences - Array of sentence objects
     * @returns {THREE.Object3D} Level object containing all platforms
     */
    createLevel: function(sentences) {
        // Create a container for the level
        const level = new THREE.Object3D();
        level.name = 'level';
        
        // Track the Y position and where the next platform should start
        let nextStartX = 0;
        let currentY = 0;
        
        // Global downward slope for the entire level
        const globalDownwardSlope = 5; // Units to descend per platform
        
        // Create platforms for each sentence
        sentences.forEach((sentence, index) => {
            // Skip sentences that are too short
            if (Utils.countWords(sentence.text) < CONFIG.content.minSentenceLength) {
                return;
            }
            
            // Create the platform
            const platform = this.createPlatform(sentence, index);
            
            // Get the platform length
            const platformLength = platform.userData.length;
            
            // Calculate the position for this platform
            // Since platforms are centered, position is at the center point
            const platformCenterX = nextStartX + (platformLength / 2);
            
            // Position the platform
            platform.position.x = platformCenterX;
            platform.position.y = currentY;
            
            // Add the platform to the level
            level.add(platform);
            
            // Calculate where the next platform should start
            // This platform ends at centerX + (length/2)
            const platformEndX = platformCenterX + (platformLength / 2);
            
            // Add a fixed gap
            const gapBetweenPlatforms = 2;
            
            // The next platform should start after this one ends, plus the gap
            nextStartX = platformEndX + gapBetweenPlatforms;
            
            // Update the Y position for the next platform (move downward)
            currentY -= globalDownwardSlope;
        });
        
        // Store level metadata
        level.userData = {
            totalLength: nextStartX,
            sentenceCount: sentences.length
        };
        
        return level;
    },
    
    /**
     * Gets the Y position on a platform at a given X position
     * @param {THREE.Object3D} platform - Platform object
     * @param {number} x - X position relative to the platform's origin
     * @returns {number} Y position on the platform
     */
    getPlatformYAtX: function(platform, x) {
        // Get the platform mesh (first child)
        const platformMesh = platform.children[0];
        
        // Use the curve function stored in userData
        if (platformMesh && platformMesh.userData.curveFunction) {
            return platformMesh.userData.curveFunction(x);
        }
        
        // Fallback: return 0
        return 0;
    },
    
    /**
     * Creates a player avatar
     * @returns {THREE.Object3D} Player object
     */
    createPlayer: function() {
        // Create a container for the player
        const player = new THREE.Object3D();
        player.name = 'player';
        
        // Create the surfboard
        const boardGeometry = new THREE.BoxGeometry(1.5, 0.2, 0.5);
        const boardMaterial = new THREE.MeshPhongMaterial({
            color: 0xffeb3b,
            specular: 0xfbc02d,
            shininess: 50
        });
        const surfboard = new THREE.Mesh(boardGeometry, boardMaterial);
        surfboard.position.y = -0.1;
        
        // Create the player character (simple shape for now)
        // Using a combination of geometries instead of CapsuleGeometry which might not be available in older Three.js versions
        const characterGroup = new THREE.Group();
        
        // Body (cylinder)
        const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.7, 8);
        const characterMaterial = new THREE.MeshPhongMaterial({
            color: 0x2196f3,
            specular: 0x0d47a1,
            shininess: 30
        });
        const body = new THREE.Mesh(bodyGeometry, characterMaterial);
        
        // Head (sphere)
        const headGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const head = new THREE.Mesh(headGeometry, characterMaterial);
        head.position.y = 0.5;
        
        // Add parts to the character group
        characterGroup.add(body);
        characterGroup.add(head);
        characterGroup.position.y = 0.6;
        
        // Add meshes to the player container
        player.add(surfboard);
        player.add(characterGroup);
        
        return player;
    },
    
    /**
     * Creates background elements for the scene
     * @returns {THREE.Object3D} Background object
     */
    createBackground: function() {
        // Create a container for the background
        const background = new THREE.Object3D();
        background.name = 'background';
        
        // Create some decorative elements (clouds, stars, etc.)
        for (let i = 0; i < 50; i++) {
            // Random position
            const x = (Math.random() - 0.5) * 200;
            const y = (Math.random() - 0.5) * 100;
            const z = -50 - Math.random() * 50;
            
            // Random size
            const size = 0.5 + Math.random() * 2;
            
            // Create a star/cloud
            const geometry = Math.random() > 0.5 ? 
                new THREE.SphereGeometry(size, 8, 8) : 
                new THREE.BoxGeometry(size, size, size);
            
            const material = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.3 + Math.random() * 0.5
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(x, y, z);
            
            // Add to background
            background.add(mesh);
        }
        
        return background;
    }
};
