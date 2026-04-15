        // ============================================
        // GAME CONFIGURATION
        // ============================================
        const CONFIG = {
            TILE_SIZE: 32,
            GRAVITY: 0.6,
            FRICTION: 0.85,
            PLAYER_SPEED: 5,
            JUMP_FORCE: -14,
            MAX_FALL_SPEED: 15
        };

        // ============================================
        // CANVAS SETUP
        // ============================================
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        
        let WIDTH = 0;
        let HEIGHT = 0;

        function resizeCanvas() {
            const container = document.getElementById('gameContainer');
            WIDTH = container.clientWidth;
            HEIGHT = container.clientHeight;
            canvas.width = WIDTH;
            canvas.height = HEIGHT;
        }
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // ============================================
        // SPRITE SHEET GENERATOR
        // ============================================
        class SpriteSheet {
            constructor() {
                this.playerSprites = {};
                this.generatePlayerSprites();
            }

            generatePlayerSprites() {
                const states = ['idle', 'run', 'jump', 'fall'];
                const framesPerState = { idle: 4, run: 6, jump: 1, fall: 1 };
                
                states.forEach(state => {
                    this.playerSprites[state] = [];
                    for (let i = 0; i < framesPerState[state]; i++) {
                        const frameCanvas = document.createElement('canvas');
                        frameCanvas.width = 32;
                        frameCanvas.height = 48;
                        const frameCtx = frameCanvas.getContext('2d');
                        this.drawPlayerFrame(frameCtx, state, i);
                        this.playerSprites[state].push(frameCanvas);
                    }
                });
            }

            drawPlayerFrame(ctx, state, frameIndex) {
                ctx.clearRect(0, 0, 32, 48);
                
                const bounce = state === 'run' ? Math.sin(frameIndex * 0.8) * 2 : 0;
                const armSwing = state === 'run' ? Math.sin(frameIndex * 1.2) * 0.4 : 0;
                
                // Body glow - NEW ORANGE/RED COLOR
                const gradient = ctx.createRadialGradient(16, 24, 0, 16, 24, 20);
                gradient.addColorStop(0, 'rgba(255, 140, 0, 0.3)');
                gradient.addColorStop(1, 'rgba(255, 140, 0, 0)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(16, 24 + bounce, 20, 0, Math.PI * 2);
                ctx.fill();

                // Legs - ORANGE
                ctx.strokeStyle = '#cc00ff';
                ctx.lineWidth = 4;
                ctx.lineCap = 'round';
                
                const legOffset = state === 'run' ? Math.sin(frameIndex * 1.5) * 8 : 0;
                
                ctx.beginPath();
                ctx.moveTo(12, 36 + bounce);
                ctx.lineTo(10 - legOffset, 46);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(20, 36 + bounce);
                ctx.lineTo(22 + legOffset, 46);
                ctx.stroke();

                // Body - RED/ORANGE
                ctx.fillStyle = '#cc3300';
                ctx.strokeStyle = '#cc00ff';
                ctx.lineWidth = 2;
                
                ctx.beginPath();
                ctx.roundRect(8, 20 + bounce, 16, 18, 4);
                ctx.fill();
                ctx.stroke();

                // Arms - YELLOW
                ctx.strokeStyle = '#cc00ff';
                ctx.lineWidth = 3;
                
                ctx.beginPath();
                ctx.moveTo(8, 24 + bounce);
                ctx.lineTo(2, 32 + armSwing * 10);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(24, 24 + bounce);
                ctx.lineTo(30, 32 - armSwing * 10);
                ctx.stroke();

                // Head - DARK RED
                ctx.fillStyle = '#8b2200';
                ctx.strokeStyle = '#ae00ff7a';
                ctx.lineWidth = 2;
                
                ctx.beginPath();
                ctx.arc(16, 12 + bounce, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Visor - BRIGHT YELLOW
                ctx.fillStyle = state === 'jump' ? '#ffff00' : '#ffdd00';
                ctx.beginPath();
                ctx.ellipse(16, 12 + bounce, 7, 3, 0, 0, Math.PI * 2);
                ctx.fill();

                // Visor glow - YELLOW GLOW
                ctx.shadowColor = '#ffdd00';
                ctx.shadowBlur = 10;
                ctx.fillStyle = 'rgba(255, 221, 0, 0.75)';
                ctx.beginPath();
                ctx.ellipse(16, 12 + bounce, 4, 1.5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            getFrame(state, frameIndex) {
                const frames = this.playerSprites[state] || this.playerSprites['idle'];
                return frames[Math.floor(frameIndex) % frames.length];
            }
        }

        // ============================================
        // TILEMAP SYSTEM
        // ============================================
        class TileMap {
            constructor() {
                this.tiles = [];
                this.decorations = [];
                this.coins = [];
                this.hazards = [];
                this.width = 0;
                this.height = 0;
                this.tileColors = {
                    platform: '#00aa44',
                    platformBorder: '#00ff66',
                    ground: '#006633',
                    groundBorder: '#00dd55'
                };
            }

            generate(level) {
                this.tiles = [];
                this.decorations = [];
                this.coins = [];
                this.hazards = [];
                
                this.width = Math.max(100, 60 + level * 20);
                this.height = 20;
                
                // Initialize empty map
                for (let y = 0; y < this.height; y++) {
                    this.tiles[y] = [];
                    for (let x = 0; x < this.width; x++) {
                        this.tiles[y][x] = 0;
                    }
                }

                // Ground layer with neon gaps
                for (let x = 0; x < this.width; x++) {
                    const isGap = x > 8 && x < 12 || x > 22 && x < 26 || x > 38 && x < 42 || x > 54 && x < 58 || x > 68 && x < 72;
                    if (!isGap) {
                        this.tiles[this.height - 1][x] = 2;
                        this.tiles[this.height - 2][x] = 2;
                    }
                }

                // Floating platforms
                const platforms = [
                    { x: 8, y: 15, w: 4 },
                    { x: 16, y: 12, w: 3 },
                    { x: 26, y: 14, w: 4 },
                    { x: 34, y: 11, w: 5 },
                    { x: 44, y: 13, w: 4 },
                    { x: 54, y: 9, w: 3 },
                    { x: 62, y: 13, w: 4 },
                    { x: 72, y: 10, w: 3 },
                    { x: 80, y: 15, w: 5 },
                    { x: 88, y: 8, w: 4 },
                    { x: 96, y: 12, w: 3 }
                ];

                // Add more platforms based on level
                for (let i = 0; i < level * 5; i++) {  // Increased from level * 3 to level * 5
                    platforms.push({
                        x: 15 + Math.floor(Math.random() * (this.width - 20)),
                        y: 6 + Math.floor(Math.random() * 10),
                        w: 2 + Math.floor(Math.random() * 4)
                    });
                }

                platforms.forEach(p => {
                    for (let i = 0; i < p.w; i++) {
                        if (p.x + i < this.width && p.y < this.height) {
                            this.tiles[p.y][p.x + i] = 1;
                        }
                    }
                });

                // Coins - INCREASED SPAWN RATE
                platforms.forEach(p => {
                    if (Math.random() > 0.1) {  // Changed from 0.3 to 0.1 for more coins
                        for (let i = 0; i < p.w; i++) {
                            if (Math.random() > 0.2) {  // Changed from 0.5 to 0.2 for more coins
                                this.coins.push({
                                    x: (p.x + i) * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                                    y: (p.y - 1) * CONFIG.TILE_SIZE,
                                    collected: false,
                                    bobOffset: Math.random() * Math.PI * 2
                                });
                            }
                        }
                    }
                });

                // Hazards (energy nodes)
                for (let x = 15; x < this.width - 5; x += 10 + Math.floor(Math.random() * 15)) {
                    if (this.tiles[this.height - 3][x] === 2) {
                        this.hazards.push({
                            x: x * CONFIG.TILE_SIZE,
                            y: (this.height - 3) * CONFIG.TILE_SIZE
                        });
                    }
                }

                // Background decorations - REMOVED (no more green triangles/circles)
                // for (let i = 0; i < this.width / 3; i++) {
                //     this.decorations.push({
                //         x: Math.random() * this.width * CONFIG.TILE_SIZE,
                //         y: Math.random() * this.height * CONFIG.TILE_SIZE * 0.7,
                //         type: Math.floor(Math.random() * 3),
                //         size: 20 + Math.random() * 40,
                //         alpha: 0.1 + Math.random() * 0.2
                //     });
                // }
            }

            draw(ctx, camera) {
                const startX = Math.max(0, Math.floor(camera.x / CONFIG.TILE_SIZE) - 1);
                const endX = Math.min(this.width, Math.ceil((camera.x + WIDTH) / CONFIG.TILE_SIZE) + 1);
                const startY = Math.max(0, Math.floor(camera.y / CONFIG.TILE_SIZE) - 1);
                const endY = Math.min(this.height, Math.ceil((camera.y + HEIGHT) / CONFIG.TILE_SIZE) + 1);

                // Draw decorations first (background)
                this.decorations.forEach(dec => {
                    if (dec.x > camera.x - 100 && dec.x < camera.x + WIDTH + 100) {
                        ctx.fillStyle = `rgba(0, 255, 170, ${dec.alpha})`;
                        ctx.beginPath();
                        if (dec.type === 0) {
                            ctx.arc(dec.x - camera.x * 0.3, dec.y, dec.size, 0, Math.PI * 2);
                        } else if (dec.type === 1) {
                            ctx.rect(dec.x - camera.x * 0.3, dec.y, dec.size, dec.size * 0.3);
                        } else {
                            ctx.moveTo(dec.x - camera.x * 0.3, dec.y);
                            ctx.lineTo(dec.x - camera.x * 0.3 + dec.size, dec.y + dec.size);
                            ctx.lineTo(dec.x - camera.x * 0.3 - dec.size, dec.y + dec.size);
                            ctx.closePath();
                        }
                        ctx.fill();
                    }
                });

                // Draw tiles
                for (let y = startY; y < endY; y++) {
                    for (let x = startX; x < endX; x++) {
                        const tile = this.tiles[y] ? this.tiles[y][x] : 0;
                        if (tile > 0) {
                            const px = x * CONFIG.TILE_SIZE - camera.x;
                            const py = y * CONFIG.TILE_SIZE - camera.y;

                            if (tile === 1) {
                                // Platform
                                ctx.fillStyle = this.tileColors.platform;
                                ctx.fillRect(px, py, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
                                ctx.strokeStyle = this.tileColors.platformBorder;
                                ctx.lineWidth = 2;
                                ctx.strokeRect(px + 1, py + 1, CONFIG.TILE_SIZE - 2, CONFIG.TILE_SIZE - 2);
                                
                                // Glow effect
                                ctx.shadowColor = '#00ffaa';
                                ctx.shadowBlur = 5;
                                ctx.strokeRect(px + 1, py + 1, CONFIG.TILE_SIZE - 2, CONFIG.TILE_SIZE - 2);
                                ctx.shadowBlur = 0;
                            } else if (tile === 2) {
                                // Ground
                                ctx.fillStyle = this.tileColors.ground;
                                ctx.fillRect(px, py, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
                                ctx.strokeStyle = this.tileColors.groundBorder;
                                ctx.lineWidth = 1;
                                ctx.strokeRect(px, py, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
                            }
                        }
                    }
                }

                // Draw hazards
                this.hazards.forEach(hazard => {
                    const px = hazard.x - camera.x;
                    const py = hazard.y - camera.y;
                    
                    ctx.fillStyle = '#ff5dcb';
                    ctx.fillRect(px + 8, py + 4, CONFIG.TILE_SIZE - 16, CONFIG.TILE_SIZE - 8);
                    ctx.fillStyle = '#8c6cff';
                    ctx.fillRect(px + 12, py + 8, CONFIG.TILE_SIZE - 24, CONFIG.TILE_SIZE - 16);
                    
                    ctx.shadowColor = '#ff5dcb';
                    ctx.shadowBlur = 12;
                    ctx.fillRect(px + 8, py + 4, CONFIG.TILE_SIZE - 16, CONFIG.TILE_SIZE - 8);
                    ctx.shadowBlur = 0;
                });

                // Draw coins
                const time = Date.now() / 1000;
                this.coins.forEach(coin => {
                    if (!coin.collected) {
                        const px = coin.x - camera.x;
                        const bobY = Math.sin(time * 3 + coin.bobOffset) * 4;
                        const py = coin.y - camera.y + bobY;

                        // Coin glow
                        const gradient = ctx.createRadialGradient(px, py, 0, px, py, 16);
                        gradient.addColorStop(0, 'rgba(255, 220, 0, 0.4)');
                        gradient.addColorStop(1, 'rgba(255, 220, 0, 0)');
                        ctx.fillStyle = gradient;
                        ctx.beginPath();
                        ctx.arc(px, py, 16, 0, Math.PI * 2);
                        ctx.fill();

                        // Coin body
                        ctx.fillStyle = '#fbff00';
                        ctx.beginPath();
                        ctx.arc(px, py, 10, 0, Math.PI * 2);
                        ctx.fill();
                        
                        ctx.strokeStyle = '#a200ff96';
                        ctx.lineWidth = 2;
                        ctx.stroke();

                        // Inner detail
                        ctx.fillStyle = '#ffee88';
                        ctx.beginPath();
                        ctx.arc(px - 2, py - 2, 4, 0, Math.PI * 2);
                        ctx.fill();
                    }
                });
            }

            getTileAtPixel(x, y) {
                const tileX = Math.floor(x / CONFIG.TILE_SIZE);
                const tileY = Math.floor(y / CONFIG.TILE_SIZE);
                
                if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
                    return 0;
                }
                
                return this.tiles[tileY] ? this.tiles[tileY][tileX] : 0;
            }
        }

        // ============================================
        // PLAYER
        // ============================================
        class Player {
            constructor(x, y, spriteSheet) {
                this.x = x;
                this.y = y;
                this.width = 24;
                this.height = 44;
                this.vx = 0;
                this.vy = 0;
                this.speed = CONFIG.PLAYER_SPEED;
                this.jumpForce = CONFIG.JUMP_FORCE;
                this.onGround = false;
                this.facingRight = true;
                this.state = 'idle';
                this.frameIndex = 0;
                this.frameTimer = 0;
                this.spriteSheet = spriteSheet;
                this.alive = true;
                this.skinWidth = 1;
            }

            update(keys, tileMap, deltaTime) {
                // Horizontal movement
                if (keys['KeyA'] || keys['ArrowLeft']) {
                    this.vx = -this.speed;
                    this.facingRight = false;
                } else if (keys['KeyD'] || keys['ArrowRight']) {
                    this.vx = this.speed;
                    this.facingRight = true;
                } else {
                    this.vx *= CONFIG.FRICTION;
                }

                // Jump
                if ((keys['KeyW'] || keys['Space'] || keys['ArrowUp']) && this.onGround) {
                    this.vy = this.jumpForce;
                    this.onGround = false;
                }

                // Gravity
                this.vy += CONFIG.GRAVITY;
                this.vy = Math.min(this.vy, CONFIG.MAX_FALL_SPEED);

                // Collision X
                this.x += this.vx;
                this.resolveHorizontalCollision(tileMap);

                // Collision Y
                this.y += this.vy;
                this.resolveVerticalCollision(tileMap);

                // Animation
                this.updateAnimationState(deltaTime);

                // Hazards
                this.checkHazards(tileMap);

                // Fall death
                if (this.y > tileMap.height * CONFIG.TILE_SIZE + 100) {
                    this.alive = false;
                }
            }

            resolveHorizontalCollision(tileMap) {
                const leftTile = Math.floor(this.x / CONFIG.TILE_SIZE);
                const rightTile = Math.floor((this.x + this.width) / CONFIG.TILE_SIZE);
                const topY = this.y + this.skinWidth;
                const bottomY = this.y + this.height - this.skinWidth;
                const topTile = Math.floor(topY / CONFIG.TILE_SIZE);
                const bottomTile = Math.floor(bottomY / CONFIG.TILE_SIZE);

                if (this.vx > 0) {
                    for (let ty = topTile; ty <= bottomTile; ty++) {
                        const tile = tileMap.getTileAtPixel(this.x + this.width, ty * CONFIG.TILE_SIZE + 1);
                        if (tile > 0) {
                            this.x = Math.floor((this.x + this.width) / CONFIG.TILE_SIZE) * CONFIG.TILE_SIZE - this.width - 0.01;
                            this.vx = 0;
                            return;
                        }
                    }
                }
                else if (this.vx < 0) {
                    for (let ty = topTile; ty <= bottomTile; ty++) {
                        const tile = tileMap.getTileAtPixel(this.x, ty * CONFIG.TILE_SIZE + 1);
                        if (tile > 0) {
                            this.x = Math.floor(this.x / CONFIG.TILE_SIZE) * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE + 0.01;
                            this.vx = 0;
                            return;
                        }
                    }
                }
            }

            resolveVerticalCollision(tileMap) {
                const leftTile = Math.floor(this.x / CONFIG.TILE_SIZE);
                const rightTile = Math.floor((this.x + this.width) / CONFIG.TILE_SIZE);
                const topTile = Math.floor(this.y / CONFIG.TILE_SIZE);
                const bottomTile = Math.floor((this.y + this.height) / CONFIG.TILE_SIZE);

                if (this.vy > 0) {
                    this.onGround = false;
                    for (let tx = leftTile; tx <= rightTile; tx++) {
                        const tile = tileMap.getTileAtPixel(tx * CONFIG.TILE_SIZE + 1, this.y + this.height);
                        if (tile > 0) {
                            this.y = Math.floor((this.y + this.height) / CONFIG.TILE_SIZE) * CONFIG.TILE_SIZE - this.height;
                            this.vy = 0;
                            this.onGround = true;
                            return;
                        }
                    }
                }
                else if (this.vy < 0) {
                    for (let tx = leftTile; tx <= rightTile; tx++) {
                        const tile = tileMap.getTileAtPixel(tx * CONFIG.TILE_SIZE + 1, this.y);
                        if (tile > 0) {
                            this.y = Math.floor(this.y / CONFIG.TILE_SIZE) * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE;
                            this.vy = 0;
                            return;
                        }
                    }
                }
            }

            checkHazards(tileMap) {
                tileMap.hazards.forEach(hazard => {
                    if (this.x < hazard.x + CONFIG.TILE_SIZE &&
                        this.x + this.width > hazard.x &&
                        this.y < hazard.y + CONFIG.TILE_SIZE &&
                        this.y + this.height > hazard.y) {
                        this.alive = false;
                    }
                });
            }

            updateAnimationState(deltaTime) {
                this.frameTimer += deltaTime;
                if (this.frameTimer > 100) {
                    this.frameTimer = 0;
                    this.frameIndex++;
                }

                if (!this.onGround) {
                    this.state = this.vy < 0 ? 'jump' : 'fall';
                } else if (Math.abs(this.vx) > 0.5) {
                    this.state = 'run';
                } else {
                    this.state = 'idle';
                }
            }

            checkCoins(tileMap) {
                let collected = 0;
                tileMap.coins.forEach(coin => {
                    if (!coin.collected) {
                        const dx = (this.x + this.width / 2) - coin.x;
                        const dy = (this.y + this.height / 2) - coin.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        
                        if (dist < 25) {
                            coin.collected = true;
                            collected++;
                        }
                    }
                });
                return collected;
            }

            draw(ctx, camera) {
                const screenX = this.x - camera.x;
                const screenY = this.y - camera.y;

                ctx.save();
                
                if (!this.facingRight) {
                    ctx.translate(screenX + this.width / 2, 0);
                    ctx.scale(-1, 1);
                    ctx.translate(-(screenX + this.width / 2), 0);
                }

                const sprite = this.spriteSheet.getFrame(this.state, this.frameIndex);
                ctx.drawImage(sprite, screenX - 4, screenY - 2);

                ctx.restore();
            }
        }

        class ParallaxBackground {
            constructor() {
                this.layers = [];
                this.generateLayers();
            }

            generateLayers() {
                this.layers.push({
                    speed: 0.08,
                    elements: this.generateStars(180, 1),
                    color: 'rgba(140, 108, 255, 0.28)'
                });

                this.layers.push({
                    speed: 0.25,
                    elements: this.generateNebulae(18),
                    color: 'rgba(140, 108, 255, 0.35)'
                });
                this.layers.push({
                    speed: 0.45,
                    elements: this.generateParticles(110),
                    color: 'rgba(140, 108, 255, 0.35)'
                });
            }

            generateStars(count, brightness) {
                const stars = [];
                for (let i = 0; i < count; i++) {
                    stars.push({
                        x: Math.random() * 5000,
                        y: Math.random() * HEIGHT,
                        size: Math.random() * 2 + 0.5,
                        twinkle: Math.random() * Math.PI * 2
                    });
                }
                return stars;
            }

            generateNebulae(count) {
                const nebulae = [];
                for (let i = 0; i < count; i++) {
                    nebulae.push({
                        x: Math.random() * 4000,
                        y: Math.random() * HEIGHT * 0.8,
                        size: 100 + Math.random() * 200,
                        hue: Math.random() * 60 + 160
                    });
                }
                return nebulae;
            }

            generateParticles(count) {
                const particles = [];
                for (let i = 0; i < count; i++) {
                    particles.push({
                        x: Math.random() * 3000,
                        y: Math.random() * HEIGHT,
                        size: Math.random() * 4 + 1,
                        speed: Math.random() * 2 + 1
                    });
                }
                return particles;
            }

            draw(ctx, camera, time) {
                // NEW BACKGROUND - SUNSET/FIRE THEME
                const baseGradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
                baseGradient.addColorStop(0, '#1a0a2a');      // Purple top
                baseGradient.addColorStop(0.3, '#4a1a0a');    // Dark red
                baseGradient.addColorStop(0.6, '#8a3a0a');    // Orange
                baseGradient.addColorStop(1, '#2a1a3a');      // Purple bottom
                ctx.fillStyle = baseGradient;
                ctx.fillRect(0, 0, WIDTH, HEIGHT);

                this.layers.forEach((layer, layerIndex) => {
                    layer.elements.forEach(el => {
                        const parallaxX = el.x - camera.x * layer.speed;
                        const wrappedX = ((parallaxX % (WIDTH * 3)) + WIDTH * 3) % (WIDTH * 3) - WIDTH;

                        if (layerIndex === 0) {
                            // Stars - now with warmer colors (yellow/orange)
                            const twinkle = 0.5 + Math.sin(time * 2 + el.twinkle) * 0.5;
                            ctx.fillStyle = `rgba(255, 200, 0, ${0.4 * twinkle})`;
                            ctx.beginPath();
                            ctx.arc(wrappedX, el.y, el.size, 0, Math.PI * 2);
                            ctx.fill();
                        } else if (layerIndex === 1) {
                            // Nebulae - warmer colors (orange/red)
                            const gradient = ctx.createRadialGradient(wrappedX, el.y, 0, wrappedX, el.y, el.size);
                            gradient.addColorStop(0, `hsla(${el.hue + 30}, 100%, 50%, 0.15)`);
                            gradient.addColorStop(0.5, `hsla(${el.hue + 30}, 100%, 30%, 0.08)`);
                            gradient.addColorStop(1, 'transparent');
                            ctx.fillStyle = gradient;
                            ctx.beginPath();
                            ctx.arc(wrappedX, el.y, el.size, 0, Math.PI * 2);
                            ctx.fill();
                        } else {
                            // Particles - warm colors
                            ctx.fillStyle = `rgba(255, 140, 0, ${0.4 + Math.sin(time + el.x) * 0.3})`;
                            ctx.fillRect(wrappedX, el.y, el.size, el.size * 3);
                        }
                    });
                });

                // Grid lines - warmer colors
                ctx.fillStyle = 'rgba(255, 140, 0, 0.08)';
                for (let y = 0; y < HEIGHT; y += 32) {
                    ctx.fillRect(0, y, WIDTH, 1);
                }
                ctx.fillStyle = 'rgba(255, 100, 0, 0.1)';
                for (let x = 0; x < WIDTH; x += 48) {
                    ctx.fillRect(x, 0, 1, HEIGHT);
                }
            }
        }

        class Camera {
            constructor() {
                this.x = 0;
                this.y = 0;
                this.targetX = 0;
                this.targetY = 0;
                this.smoothing = 0.08;
                this.bounds = { minX: 0, minY: 0, maxX: Infinity, maxY: Infinity };
            }

            follow(target, mapWidth, mapHeight) {
                this.targetX = target.x + target.width / 2 - WIDTH / 2;
                this.targetY = target.y + target.height / 2 - HEIGHT / 2;

                this.x += (this.targetX - this.x) * this.smoothing;
                this.y += (this.targetY - this.y) * this.smoothing;

                this.x = Math.max(0, Math.min(this.x, mapWidth * CONFIG.TILE_SIZE - WIDTH));
                this.y = Math.max(0, Math.min(this.y, mapHeight * CONFIG.TILE_SIZE - HEIGHT));
            }

            setBounds(minX, minY, maxX, maxY) {
                this.bounds = { minX, minY, maxX, maxY };
            }
        }

        class Game {
            constructor() {
                this.spriteSheet = new SpriteSheet();
                this.tileMap = new TileMap();
                this.parallax = new ParallaxBackground();
                this.camera = new Camera();
                this.player = null;
                this.keys = {};
                this.score = 0;
                this.coins = 0;
                this.level = 1;
                this.running = false;
                this.lastTime = 0;

                this.setupEventListeners();
            }

            setupEventListeners() {
                // Keyboard Events
                window.addEventListener('keydown', (e) => {
                    this.keys[e.code] = true;
                    if (e.code === 'KeyF') this.toggleFullscreen();
                    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
                });

                window.addEventListener('keyup', (e) => {
                    this.keys[e.code] = false;
                });

                // Button Listeners
                document.getElementById('startBtn').addEventListener('click', () => this.start());
                document.getElementById('restartBtn').addEventListener('click', () => this.restart());

                // Mobile Touch Controls Mapping
                this.setupTouchControls();
            }

            setupTouchControls() {
                const btnLeft = document.getElementById('btnLeft');
                const btnRight = document.getElementById('btnRight');
                const btnJump = document.getElementById('btnJump');

                // Helper function to bind touch events to key states
                const bindTouch = (element, keyCode) => {
                    element.addEventListener('touchstart', (e) => {
                        e.preventDefault(); // Prevent scrolling/zooming
                        this.keys[keyCode] = true;
                    }, { passive: false });

                    element.addEventListener('touchend', (e) => {
                        e.preventDefault();
                        this.keys[keyCode] = false;
                    }, { passive: false });
                    
                    // If finger moves out of button, treat as release
                    element.addEventListener('touchcancel', (e) => {
                        this.keys[keyCode] = false;
                    });
                };

                // Mapping virtual buttons to keyboard keys used in update()
                bindTouch(btnLeft, 'KeyA');
                bindTouch(btnRight, 'KeyD');
                bindTouch(btnJump, 'Space');
            }

            toggleFullscreen() {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(err => {
                        console.log('Fullscreen not supported');
                    });
                    // Try to lock orientation on mobile
                    if (screen.orientation && screen.orientation.lock) {
                        screen.orientation.lock('landscape').catch(e => console.log('Orientation lock failed'));
                    }
                } else {
                    document.exitFullscreen();
                }
            }

            start() {
                document.getElementById('startScreen').style.display = 'none';
                this.running = true;
                this.initLevel(1);
                this.lastTime = performance.now();
                
                // Auto fullscreen on mobile start
                if (window.innerWidth < 1024) {
                    this.toggleFullscreen();
                }
                
                this.gameLoop();
            }

            restart() {
                document.getElementById('gameOverScreen').style.display = 'none';
                this.score = 0;
                this.coins = 0;
                this.level = 1;
                this.start();
            }

            initLevel(level) {
                this.level = level;
                this.tileMap.generate(level);
                this.player = new Player(
                    3 * CONFIG.TILE_SIZE,
                    10 * CONFIG.TILE_SIZE,
                    this.spriteSheet
                );
                this.camera.x = 0;
                this.camera.y = 0;
                this.updateUI();
            }

            gameLoop(currentTime = 0) {
                if (!this.running) return;

                const deltaTime = currentTime - this.lastTime;
                this.lastTime = currentTime;

                this.update(deltaTime);
                this.render();

                requestAnimationFrame((t) => this.gameLoop(t));
            }

            update(deltaTime) {
                this.player.update(this.keys, this.tileMap, deltaTime);
                this.camera.follow(this.player, this.tileMap.width, this.tileMap.height);

                const collected = this.player.checkCoins(this.tileMap);
                if (collected > 0) {
                    this.coins += collected;
                    this.score += collected * 100;
                    this.updateUI();
                }

                if (this.player.x > (this.tileMap.width - 5) * CONFIG.TILE_SIZE) {
                    this.level++;
                    this.score += 500;
                    this.initLevel(this.level);
                }

                if (!this.player.alive) {
                    this.gameOver();
                }
            }

            render() {
                ctx.clearRect(0, 0, WIDTH, HEIGHT);

                const time = Date.now() / 1000;
                this.parallax.draw(ctx, this.camera, time);
                this.tileMap.draw(ctx, this.camera);
                this.player.draw(ctx, this.camera);

                // Draw Exit Zone indicator
                const endX = (this.tileMap.width - 3) * CONFIG.TILE_SIZE - this.camera.x;
                const endY = (this.tileMap.height - 5) * CONFIG.TILE_SIZE - this.camera.y;
                
                ctx.fillStyle = 'rgba(0, 255, 170, 0.3)';
                ctx.fillRect(endX, 0, 60, HEIGHT);
                
                ctx.font = '14px Orbitron';
                ctx.fillStyle = '#00ffaa';
                ctx.textAlign = 'center';
                ctx.fillText('EXIT', endX + 30, endY + 50);
            }

            updateUI() {
                // Update individual displays
                document.getElementById('scoreDisplay').textContent = this.score;
                document.getElementById('coinDisplay').textContent = this.coins;
                document.getElementById('levelDisplay').textContent = this.level;
                
                // Also update combined display if it exists
                const combinedDisplay = document.getElementById('levelScoreDisplay');
                if (combinedDisplay) {
                    combinedDisplay.textContent = `LVL ${this.level}  |  GEMS ${this.coins}  |  SCORE ${this.score}`;
                }
            }

            gameOver() {
                this.running = false;
                document.getElementById('finalScore').textContent = this.score;
                document.getElementById('gameOverScreen').style.display = 'flex';
            }
        }

        const game = new Game();