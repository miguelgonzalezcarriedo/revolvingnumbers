// First, define all the classes and functions needed
class PointSelector {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.isDragging = false;
        
        // Default options
        this.options = {
            width: 300,
            height: 300,
            gridStep: 50,  // Larger grid steps like Desmos
            pointRadius: 6,
            pointColor: '#2d70b3', // Desmos blue
            padding: 50,
            initialPoint: { x: 0.5, y: -0.5 },
            onChange: null,
            ...options
        };
        
        // Set canvas size
        this.canvas.width = this.options.width;
        this.canvas.height = this.options.height;
        
        // Current point
        this.point = options.initialPoint || { x: 0, y: 0 };
        
        // Create input element for direct coordinate entry
        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.className = 'complex-input';
        this.input.value = `${this.point.x.toFixed(2)} + ${this.point.y.toFixed(2)}i`;
        
        // Add input to the value container instead of after canvas
        options.valueContainer.appendChild(this.input);
        
        // Create hidden span to measure text width
        this.measureSpan = document.createElement('span');
        this.measureSpan.style.visibility = 'hidden';
        this.measureSpan.style.position = 'absolute';
        this.measureSpan.style.font = window.getComputedStyle(this.input).font;
        document.body.appendChild(this.measureSpan);
        
        this.resizeInput();
        
        // Add pan tracking with velocity
        this.isPanning = false;
        this.isPointDragging = false;
        this.lastPanPosition = { x: 0, y: 0 };
        this.panVelocity = { x: 0, y: 0 };
        this.lastPanTime = 0;
        
        // Add view bounds with pan offset
        this.viewBounds = {
            xMin: -1,
            xMax: 1,
            yMin: -1,
            yMax: 1
        };
        
        // Add animation frame handling
        this.animationFrameId = null;
        
        this.setupEventListeners();
        this.draw();
        
        // Add input event listener
        this.input.addEventListener('change', () => {
            const point = this.parseComplexInput(this.input.value);
            if (point) {
                this.updatePoint(point.x, point.y);
            } else {
                // If parsing fails, revert to current value
                this.updateInput();
            }
        });
    }
    
    createCoordinateInput() {
        const container = this.canvas.parentElement;
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'coordinate-input';
        input.placeholder = 'a ± bi';
        
        // Format initial value with explicit signs
        const realStr = this.point.x >= 0 ? 
            this.point.x.toString() : 
            `${this.point.x}`;
        const imagStr = this.point.y >= 0 ? 
            `+ ${this.point.y}` : 
            `- ${Math.abs(this.point.y)}`;
        input.value = `${realStr} ${imagStr}i`;
        
        input.addEventListener('change', (e) => {
            // Update regex to handle both plus and minus signs
            const match = e.target.value.match(/([-+]?\d*\.?\d+)\s*([-+])\s*(\d*\.?\d+)i/);
            if (match) {
                const [_, real, sign, imag] = match;
                const imagValue = sign === '+' ? Number(imag) : -Number(imag);
                this.setPoint(Number(real), imagValue);
            }
        });
        
        container.appendChild(input);
        this.coordInput = input;
    }
    
    setupEventListeners() {
        let clickStartTime;
        let clickStartPosition;
        const CLICK_TIME_THRESHOLD = 200; // milliseconds
        const CLICK_DISTANCE_THRESHOLD = 5; // pixels

        this.canvas.addEventListener('mousedown', (e) => {
            clickStartTime = Date.now();
            clickStartPosition = { x: e.clientX, y: e.clientY };
            
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const pointScreenPos = this.mathToScreen(this.point.x, this.point.y);
            const distToPoint = Math.hypot(mouseX - pointScreenPos.x, mouseY - pointScreenPos.y);
            
            if (distToPoint <= this.options.pointRadius * 2) {
                this.isPointDragging = true;
            } else {
                this.isPanning = true;
                this.wasPanning = false;  // Reset panning flag
                this.lastPanPosition = { x: mouseX, y: mouseY };
                this.lastPanTime = performance.now();
                this.panVelocity = { x: 0, y: 0 };
                
                if (!this.animationFrameId) {
                    this.animate();
                }
            }
        });

        this.canvas.addEventListener('mouseup', (e) => {
            const clickDuration = Date.now() - clickStartTime;
            const clickDistance = Math.hypot(
                e.clientX - clickStartPosition.x,
                e.clientY - clickStartPosition.y
            );
            
            // If it was a quick click without much movement
            if (clickDuration < CLICK_TIME_THRESHOLD && 
                clickDistance < CLICK_DISTANCE_THRESHOLD && 
                !this.isPointDragging) {
                
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                
                const mathCoords = this.screenToMath(mouseX, mouseY);
                this.setPoint(mathCoords.x, mathCoords.y);
                if (this.options.onChange) {
                    this.options.onChange(this.point);
                }
            }
            
            this.isPanning = false;
            this.isPointDragging = false;
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!this.isPanning && !this.isPointDragging) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            if (this.isPointDragging) {
                const mathCoords = this.screenToMath(mouseX, mouseY);
                this.setPoint(mathCoords.x, mathCoords.y);
                if (this.options.onChange) {
                    this.options.onChange(this.point);
                }
            } else if (this.isPanning) {
                const currentTime = performance.now();
                const dt = (currentTime - this.lastPanTime) / 1000; // Convert to seconds
                
                const dx = mouseX - this.lastPanPosition.x;
                const dy = mouseY - this.lastPanPosition.y;
                
                const scale = (this.viewBounds.xMax - this.viewBounds.xMin) / this.canvas.width;
                
                // Calculate velocity
                this.panVelocity = {
                    x: dx / dt,
                    y: dy / dt
                };
                
                // Update view bounds
                const deltaX = dx * scale;
                const deltaY = dy * scale;
                
                this.viewBounds.xMin -= deltaX;
                this.viewBounds.xMax -= deltaX;
                this.viewBounds.yMin += deltaY;
                this.viewBounds.yMax += deltaY;
                
                this.lastPanPosition = { x: mouseX, y: mouseY };
                this.lastPanTime = currentTime;
                
                this.draw();
            }
        });
        
        // Add zoom with mouse wheel
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
            
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const mouseMathCoords = this.screenToMath(mouseX, mouseY);
            
            // Calculate distance from origin to cursor
            const distToOrigin = Math.hypot(mouseMathCoords.x, mouseMathCoords.y);
            
            // Calculate weight based on distance (closer to origin = more weight to origin)
            const originWeight = 1 / (1 + distToOrigin);
            const cursorWeight = 1 - originWeight;
            
            // Calculate weighted zoom center
            const zoomCenterX = mouseMathCoords.x * cursorWeight;
            const zoomCenterY = mouseMathCoords.y * cursorWeight;
            
            const dx = this.viewBounds.xMax - this.viewBounds.xMin;
            const dy = this.viewBounds.yMax - this.viewBounds.yMin;
            
            // Apply zoom with weighted center
            this.viewBounds.xMin = zoomCenterX - (zoomCenterX - this.viewBounds.xMin) * zoomFactor;
            this.viewBounds.xMax = zoomCenterX + (this.viewBounds.xMax - zoomCenterX) * zoomFactor;
            this.viewBounds.yMin = zoomCenterY - (zoomCenterY - this.viewBounds.yMin) * zoomFactor;
            this.viewBounds.yMax = zoomCenterY + (this.viewBounds.yMax - zoomCenterY) * zoomFactor;
            
            this.draw();
        });
        
        // Keyboard events for arrow keys
        document.addEventListener('keydown', (e) => {
            if (this.coordInput === document.activeElement) return;
            
            const step = e.shiftKey ? 0.01 : 0.1;
            switch (e.key) {
                case 'ArrowLeft':
                    this.setPoint(this.point.x - step, this.point.y);
                    break;
                case 'ArrowRight':
                    this.setPoint(this.point.x + step, this.point.y);
                    break;
                case 'ArrowUp':
                    this.setPoint(this.point.x, this.point.y + step);
                    break;
                case 'ArrowDown':
                    this.setPoint(this.point.x, this.point.y - step);
                    break;
            }
        });
    }
    
    screenToMath(screenX, screenY) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        const xRange = this.viewBounds.xMax - this.viewBounds.xMin;
        const yRange = this.viewBounds.yMax - this.viewBounds.yMin;
        
        return {
            x: this.viewBounds.xMin + (screenX / width) * xRange,
            y: this.viewBounds.yMax - (screenY / height) * yRange
        };
    }
    
    mathToScreen(mathX, mathY) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        const xRange = this.viewBounds.xMax - this.viewBounds.xMin;
        const yRange = this.viewBounds.yMax - this.viewBounds.yMin;
        
        return {
            x: ((mathX - this.viewBounds.xMin) / xRange) * width,
            y: ((this.viewBounds.yMax - mathY) / yRange) * height
        };
    }
    
    calculateGridSpacing() {
        const xRange = this.viewBounds.xMax - this.viewBounds.xMin;
        const exponent = Math.floor(Math.log10(xRange));
        const gridSpacing = Math.pow(10, exponent);
        const minorGridSpacing = gridSpacing / 10;
        
        return { 
            major: gridSpacing, 
            minor: minorGridSpacing,
            exponent: exponent  // Store the exponent for rounding
        };
    }
    
    snapToGrid(value) {
        const gridSpacing = this.calculateGridSpacing();
        const snapValue = gridSpacing.minor; // Snap to minor grid lines
        return Math.round(value / snapValue) * snapValue;
    }
    
    setPoint(x, y) {
        // Snap coordinates to grid
        this.point.x = this.snapToGrid(x);
        this.point.y = this.snapToGrid(y);
        this.draw();
        this.updateInput();
        
        // Call onChange callback when point is set
        if (this.options.onChange) {
            this.options.onChange(this.point);
        }
    }
    
    getDecimalPlaces(value) {
        if (value >= 1) return 0;
        return Math.ceil(-Math.log10(value));
    }
    
    animate() {
        if (this.isPanning) {
            this.draw();
            this.animationFrameId = requestAnimationFrame(() => this.animate());
        } else {
            this.animationFrameId = null;
        }
    }
    
    // Add new method for formatting numbers in decimal form
    formatDecimal(value) {
        const gridSpacing = this.calculateGridSpacing();
        const precision = -gridSpacing.exponent + 1; // One more decimal than grid spacing
        return value.toFixed(Math.max(0, precision));
    }
    
    updatePointFromEvent(event) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        const mathCoords = this.screenToMath(mouseX, mouseY);
        
        // Snap to grid when setting point
        this.setPoint(mathCoords.x, mathCoords.y);
        
        // Update coordinate input with snapped values
        if (this.coordInput) {
            this.coordInput.value = `(${this.point.x.toFixed(2)}, ${this.point.y.toFixed(2)})`;
        }
        
        if (this.options.onChange) {
            this.options.onChange(this.point);
        }
    }
    
    draw() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Clear canvas
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        
        // Get dynamic grid spacing
        const gridSpacing = this.calculateGridSpacing();
        
        // Draw minor grid lines
        ctx.strokeStyle = '#f0f0f0';
        ctx.lineWidth = 1;
        
        // Calculate grid bounds
        const minX = Math.floor(this.viewBounds.xMin / gridSpacing.minor) * gridSpacing.minor;
        const maxX = Math.ceil(this.viewBounds.xMax / gridSpacing.minor) * gridSpacing.minor;
        const minY = Math.floor(this.viewBounds.yMin / gridSpacing.minor) * gridSpacing.minor;
        const maxY = Math.ceil(this.viewBounds.yMax / gridSpacing.minor) * gridSpacing.minor;
        
        // Draw minor grid lines
        for (let x = minX; x <= maxX; x += gridSpacing.minor) {
            const screenX = this.mathToScreen(x, 0).x;
            ctx.beginPath();
            ctx.moveTo(screenX, 0);
            ctx.lineTo(screenX, height);
            ctx.stroke();
        }
        
        for (let y = minY; y <= maxY; y += gridSpacing.minor) {
            const screenY = this.mathToScreen(0, y).y;
            ctx.beginPath();
            ctx.moveTo(0, screenY);
            ctx.lineTo(width, screenY);
            ctx.stroke();
        }
        
        // Draw major grid lines
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        
        for (let x = minX; x <= maxX; x += gridSpacing.major) {
            const screenX = this.mathToScreen(x, 0).x;
            ctx.beginPath();
            ctx.moveTo(screenX, 0);
            ctx.lineTo(screenX, height);
            ctx.stroke();
            
            // Add labels for major grid lines
            if (Math.abs(x) > gridSpacing.major/10) {  // Don't label near zero
                ctx.fillStyle = '#666';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                
                let labelY = this.mathToScreen(0, 0).y + 20;
                labelY = Math.min(Math.max(20, labelY), height - 5);
                
                let labelX = this.mathToScreen(x, 0).x;
                labelX = Math.min(Math.max(20, labelX), width - 20);
                
                ctx.fillText(this.formatDecimal(x), labelX, labelY);
            }
        }
        
        for (let y = minY; y <= maxY; y += gridSpacing.major) {
            const screenY = this.mathToScreen(0, y).y;
            ctx.beginPath();
            ctx.moveTo(0, screenY);
            ctx.lineTo(width, screenY);
            ctx.stroke();
            
            // Add labels for major grid lines
            if (Math.abs(y) > gridSpacing.major/10) {  // Don't label near zero
                ctx.fillStyle = '#666';
                ctx.font = '12px Arial';
                
                let labelX = this.mathToScreen(0, 0).x - 10;
                labelX = Math.min(Math.max(35, labelX), width - 5);
                
                let labelY = this.mathToScreen(0, y).y;
                labelY = Math.min(Math.max(15, labelY), height - 5);
                
                if (labelX <= 40) {
                    ctx.textAlign = 'left';
                } else if (labelX >= width - 10) {
                    ctx.textAlign = 'right';
                } else {
                    ctx.textAlign = 'right';
                }
                
                ctx.fillText(this.formatDecimal(y), labelX, labelY + 4);
            }
        }
        
        // Draw axes
        const origin = this.mathToScreen(0, 0);
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, origin.y);
        ctx.lineTo(width, origin.y);
        ctx.moveTo(origin.x, 0);
        ctx.lineTo(origin.x, height);
        ctx.stroke();
        
        // Draw point
        const pointScreen = this.mathToScreen(this.point.x, this.point.y);
        
        // Draw point shadow
        ctx.beginPath();
        ctx.arc(pointScreen.x, pointScreen.y, this.options.pointRadius + 2, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(45, 112, 179, 0.3)';
        ctx.fill();
        
        // Draw point
        ctx.beginPath();
        ctx.arc(pointScreen.x, pointScreen.y, this.options.pointRadius, 0, 2 * Math.PI);
        ctx.fillStyle = this.options.pointColor;
        ctx.fill();
        
        // Update coordinate input with snapped values
        if (this.coordInput) {
            const gridSpacing = this.calculateGridSpacing();
            const precision = -gridSpacing.exponent + 1;
            
            // Format real part with explicit plus/minus
            const realStr = this.point.x >= 0 ? 
                this.point.x.toFixed(precision) : 
                `${this.point.x.toFixed(precision)}`;
                
            // Format imaginary part with explicit plus/minus
            const imagStr = this.point.y >= 0 ? 
                `+ ${this.point.y.toFixed(precision)}` : 
                `- ${Math.abs(this.point.y).toFixed(precision)}`;
                
            this.coordInput.value = `${realStr} ${imagStr}i`;
        }
    }
    
    getPoint() {
        return { ...this.point };
    }
    
    getValue() {
        return this.point;
    }
    
    updateInput() {
        this.input.value = `${this.point.x.toFixed(2)} + ${this.point.y.toFixed(2)}i`;
        this.resizeInput();
    }
    
    resizeInput() {
        // Measure text width
        this.measureSpan.textContent = this.input.value;
        const width = this.measureSpan.offsetWidth;
        // Add padding for the input borders and some extra space
        this.input.style.width = (width + 20) + 'px';
    }
    
    // Clean up when removing selector
    cleanup() {
        if (this.measureSpan) {
            this.measureSpan.remove();
        }
    }
    
    parseComplexInput(value) {
        // Remove all spaces
        value = value.replace(/\s+/g, '');
        
        // Try different formats:
        // 1. a+bi format
        const standardForm = /^(-?\d*\.?\d*)(?:\+|-)(\d*\.?\d*)i$/;
        // 2. Single real number
        const realOnly = /^(-?\d*\.?\d*)$/;
        // 3. Single imaginary number
        const imagOnly = /^(-?\d*\.?\d*)i$/;
        
        let match;
        
        if (match = value.match(standardForm)) {
            return {
                x: parseFloat(match[1]) || 0,
                y: value.includes('+') ? parseFloat(match[2]) || 0 : -(parseFloat(match[2]) || 0)
            };
        } else if (match = value.match(realOnly)) {
            return {
                x: parseFloat(match[1]) || 0,
                y: 0
            };
        } else if (match = value.match(imagOnly)) {
            return {
                x: 0,
                y: parseFloat(match[1]) || 1  // Handle just 'i' as 1i
            };
        }
        
        return null;  // Parsing failed
    }
}

class AngleSelector {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Default options
        this.options = {
            width: 200,
            height: 200,
            initialValue: 2,
            onChange: null,
            ...options
        };
        
        // Set canvas size
        this.canvas.width = this.options.width;
        this.canvas.height = this.options.height;
        
        // Current value
        this.denominator = this.options.initialValue;
        
        this.setupEventListeners();
        this.draw();
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => {
            this.updateFromEvent(e);
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (e.buttons === 1) {
                this.updateFromEvent(e);
            }
        });
    }
    
    updateFromEvent(event) {
        const rect = this.canvas.getBoundingClientRect();
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        const x = event.clientX - rect.left - centerX;
        const y = -(event.clientY - rect.top - centerY);
        
        let angle = Math.atan2(y, x);
        let denominator = Math.round(Math.PI / angle);
        
        denominator = Math.max(-20, Math.min(20, denominator));
        if (denominator === 0) denominator = 1;
        
        this.denominator = denominator;
        this.draw();
        
        if (this.options.onChange) {
            this.options.onChange(this.denominator);
        }
    }
    
    draw() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const armLength = Math.min(width, height) * 0.4;
        
        // Clear canvas
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        
        // Calculate angle
        const angle = Math.PI / Math.abs(this.denominator);
        const direction = Math.sign(this.denominator);
        
        // Draw right arm (fixed)
        ctx.strokeStyle = '#000';
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + armLength, centerY);
        ctx.stroke();
        
        // Draw left arm (movable)
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        const endX = centerX + armLength * Math.cos(angle * direction);
        const endY = centerY - armLength * Math.sin(angle * direction);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // Draw arc
        const arcRadius = armLength * 0.3;
        ctx.beginPath();
        if (direction > 0) {
            ctx.arc(centerX, centerY, arcRadius, 0, -angle, true);
        } else {
            ctx.arc(centerX, centerY, arcRadius, 0, angle, false);
        }
        ctx.stroke();
        
        // Draw red point at intersection
        const intersectionX = centerX + arcRadius * Math.cos(angle * direction);
        const intersectionY = centerY - arcRadius * Math.sin(angle * direction);
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(intersectionX, intersectionY, 4, 0, 2 * Math.PI);
        ctx.fill();
    }
    
    getValue() {
        return this.denominator;
    }
    
    setValue(denominator) {
        this.denominator = denominator;
        this.draw();
    }
}

class PlotShower {
    constructor() {
        // Initialize variables first, before any other operations
        this.variables = {
            alpha: { real: 1, imag: 0 },  // Default alpha value
            theta: 2  // Default theta value (π/2)
        };
        
        // Get canvas and context
        this.canvas = document.getElementById('plotCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Grid settings
        this.gridSize = 0.5;  // Space between grid lines
        this.scale = 100;     // Pixels per unit
        
        // Set initial center coordinates
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
        
        // Set up canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Start animation
        this.startAnimation();
    }
    
    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        // Center coordinates
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
        
        this.draw();
    }
    
    reset() {
            this.draw();
        }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        this.drawGrid();
        
        // Draw axes
        this.drawAxes();
        
        // Draw IFS equations
        this.drawEquations();
        
        // Draw points
        this.drawPoints();
    }
    
    drawGrid() {
        const ctx = this.ctx;
        ctx.strokeStyle = '#eee';
        ctx.lineWidth = 1;
        
        // Calculate grid bounds
        const xLines = Math.ceil(this.canvas.width / (this.gridSize * this.scale));
        const yLines = Math.ceil(this.canvas.height / (this.gridSize * this.scale));
        
        // Vertical lines
        for (let i = -xLines; i <= xLines; i++) {
            const x = this.centerX + i * this.gridSize * this.scale;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let i = -yLines; i <= yLines; i++) {
            const y = this.centerY + i * this.gridSize * this.scale;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
            ctx.stroke();
        }
    }
    
    drawAxes() {
        const ctx = this.ctx;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        
        // X-axis
        ctx.beginPath();
        ctx.moveTo(0, this.centerY);
        ctx.lineTo(this.canvas.width, this.centerY);
        ctx.stroke();
        
        // Y-axis
        ctx.beginPath();
        ctx.moveTo(this.centerX, 0);
        ctx.lineTo(this.centerX, this.canvas.height);
        ctx.stroke();
    }
    
    drawPoints() {
        const ctx = this.ctx;
        ctx.fillStyle = 'blue';
        
        // Start with initial point 1 + 0i
        let points = [{ real: 1, imag: 0 }];
        
        // Generate next set of points by applying transformations
        for (let i = 0; i < 15; i++) {  // Increased to 15 iterations
            let newPoints = [];
            
            // For each existing point, apply both transformations
            for (const point of points) {
                // First transformation (f₁)
                const f1 = this.transformPoint(point, 1);
                newPoints.push(f1);
                
                // Second transformation (f₂)
                const f2 = this.transformPoint(point, 2);
                newPoints.push(f2);
            }
            
            points = newPoints;
        }
        
        // Draw all points
        for (const point of points) {
            const screenX = this.centerX + point.real * this.scale;
            const screenY = this.centerY - point.imag * this.scale;
            
            ctx.beginPath();
            ctx.arc(screenX, screenY, 2, 0, 2 * Math.PI);
            ctx.fill();
        }
    }
    
    transformPoint(z, functionNumber) {
        // Get the LaTeX expression from the appropriate input field
        const latex = functionNumber === 1 ? 
            function1Field.latex() : 
            function2Field.latex();
        
        // Parse and evaluate the function
        return parseLatexFunction(latex, z);
    }
    
    startAnimation() {
        const animate = () => {
            this.draw();
            requestAnimationFrame(animate);
        };
        animate();
    }
    
    drawEquations() {
        const ctx = this.ctx;
        ctx.font = '16px Arial';
        ctx.fillStyle = 'black';
        
        // Get current values
        const alpha = this.variables.alpha || { real: 1, imag: 0 };
        const theta = this.variables.theta || 2;
        
        // Format complex number
        const formatComplex = (real, imag) => {
            if (imag === 0) return real.toFixed(2);
            if (real === 0) return `${imag.toFixed(2)}i`;
            return `${real.toFixed(2)}${imag >= 0 ? '+' : ''}${imag.toFixed(2)}i`;
        };
        
        const alphaStr = formatComplex(alpha.real, alpha.imag);
        
        // Draw equations
        ctx.fillText(`f₁(z) = ${alphaStr}z`, 20, 30);
        ctx.fillText(`f₂(z) = ${alphaStr}e^{πi/${theta}}z + ${alphaStr}`, 20, 60);
    }
}

// Define helper functions
function parseVariables(latex) {
    const varRegex = /\\?([a-zA-Z]+)(?![a-zA-Z])/g;
    const excludedVars = new Set(['z', 'e', 'i', 'pi']);
    const variables = new Set();
    
    let match;
    while ((match = varRegex.exec(latex)) !== null) {
        const varName = match[1];
        if (!excludedVars.has(varName)) {
            variables.add(varName);
        }
    }
    return Array.from(variables);
}

function createVariableSelector(varName) {
    const container = document.createElement('div');
    container.className = 'variable-selector';
    container.id = `${varName}-selector-container`;
    
    const header = document.createElement('div');
    header.className = 'variable-header';
    
    const label = document.createElement('span');
    label.textContent = `${varName} = `;
    header.appendChild(label);
    
    const typeSelect = document.createElement('select');
    typeSelect.className = 'selector-type';
    typeSelect.innerHTML = `
        <option value="complex">Complex</option>
        <option value="angle">Angle</option>
    `;
    header.appendChild(typeSelect);
    container.appendChild(header);
    
    // Create canvas container first
    const canvasContainer = document.createElement('div');
    canvasContainer.className = 'selector-canvas-container';
    container.appendChild(canvasContainer);
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    canvas.id = `${varName}-selector`;
    canvasContainer.appendChild(canvas);
    
    const valueContainer = document.createElement('div');
    valueContainer.className = 'selector-value';
    container.appendChild(valueContainer);
    
    // Add to document before initializing selector
    const selectorsContainer = document.getElementById('variable-selectors');
    selectorsContainer.appendChild(container);
    
    let currentSelector = null;
    
    typeSelect.addEventListener('change', () => {
        // Clear the canvas
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Remove old selector from DOM
        if (currentSelector) {
            if (currentSelector.cleanup) {
                currentSelector.cleanup();
            }
            // Remove old canvas
            while (canvasContainer.firstChild) {
                canvasContainer.removeChild(canvasContainer.firstChild);
            }
            
            // Create fresh canvas
            const newCanvas = document.createElement('canvas');
            newCanvas.width = 200;
            newCanvas.height = 200;
            newCanvas.id = `${varName}-selector`;
            canvasContainer.appendChild(newCanvas);
        }
        
        // Clear the value container
        while (valueContainer.firstChild) {
            valueContainer.removeChild(valueContainer.firstChild);
        }
        
        if (typeSelect.value === 'complex') {
            currentSelector = new PointSelector(canvas.id, {
                width: 200,
                height: 200,
                initialPoint: { x: 0.5, y: -0.5 },
                valueContainer: valueContainer,  // Pass the container
                onChange: (point) => {
                    if (window.plotShower) {
                        window.plotShower.variables[varName] = { real: point.x, imag: point.y };
                        window.plotShower.reset();
                        updateURL();
                    }
                }
            });
        } else {
            currentSelector = new AngleSelector(canvas.id, {
                width: 200,
                height: 200,
                initialValue: 2,
                onChange: (denominator) => {
                    valueContainer.textContent = `π/${denominator}`;
                    if (window.plotShower) {
                        window.plotShower.variables[varName] = denominator;
                        window.plotShower.reset();
                        updateURL();
                    }
                }
            });
        }
    });
    
    // Initialize with complex selector by default
    typeSelect.dispatchEvent(new Event('change'));
    
    return container;
}

function updateVariableSelectors() {
    const variables = new Set([
        ...parseVariables(function1Field.latex()),
        ...parseVariables(function2Field.latex())
    ]);
    
    console.log('Detected variables:', Array.from(variables));
    
    const selectorsContainer = document.getElementById('variable-selectors');
    const existingSelectors = new Set(
        Array.from(selectorsContainer.children).map(child => 
            child.id.replace('-selector-container', '')
        )
    );
    
    // Remove selectors for variables that no longer exist
    for (const existingVar of existingSelectors) {
        if (!variables.has(existingVar)) {
            const selector = document.getElementById(`${existingVar}-selector-container`);
            if (selector) {
                selector.remove();
            }
        }
    }
    
    // Add new selectors
    for (const varName of variables) {
        if (!existingSelectors.has(varName)) {
            const selector = createVariableSelector(varName);
            selectorsContainer.appendChild(selector);
        }
    }
}

function updateURL() {
    const params = new URLSearchParams();
    
    // Save function expressions
    if (function1Field && function2Field) {
        params.set('f1', function1Field.latex());
        params.set('f2', function2Field.latex());
        
        // Save variables
        if (window.plotShower && window.plotShower.variables) {
            for (const [varName, value] of Object.entries(window.plotShower.variables)) {
                if (typeof value === 'object') {
                    // Complex number
                    params.set(`${varName}_real`, value.real);
                    params.set(`${varName}_imag`, value.imag);
                } else {
                    // Angle
                    params.set(varName, value);
                }
            }
        }
        
        window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    }
}

// Create plotShower immediately and make it globally available
window.plotShower = new PlotShower();

// Initialize when the page loads
window.addEventListener('load', () => {
    // Wait a bit for everything to be ready
    setTimeout(() => {
        loadFromURL();
        updateVariableSelectors();
    }, 100);
});

function loadFromURL() {
    const params = new URLSearchParams(window.location.search);
    
    // Load function expressions
    if (params.has('f1')) {
        function1Field.latex(params.get('f1'));
    }
    if (params.has('f2')) {
        function2Field.latex(params.get('f2'));
    }
    
    // Load variable values
    if (window.plotShower) {
        // Load alpha value
        if (params.has('alpha_real') && params.has('alpha_imag')) {
            window.plotShower.variables.alpha = {
                real: parseFloat(params.get('alpha_real')),
                imag: parseFloat(params.get('alpha_imag'))
            };
        }
        
        // Load theta value
        if (params.has('theta')) {
            window.plotShower.variables.theta = parseInt(params.get('theta'));
        }
    }
    
    // Update visualization
    if (window.plotShower) {
        window.plotShower.reset();
    }
}

// Add a proper LaTeX function parser
function parseLatexFunction(latex, z) {
    // Remove all spaces
    latex = latex.replace(/\s+/g, '');
    
    // Replace common LaTeX commands with JavaScript equivalents
    latex = latex
        .replace(/\\alpha/g, 'alpha')
        .replace(/\\theta/g, 'theta')
        .replace(/\\pi/g, 'Math.PI')
        .replace(/\\exp/g, 'Math.exp')
        .replace(/\\sin/g, 'Math.sin')
        .replace(/\\cos/g, 'Math.cos')
        .replace(/\\tan/g, 'Math.tan')
        .replace(/\\log/g, 'Math.log')
        .replace(/\\ln/g, 'Math.log')
        .replace(/\\sqrt/g, 'Math.sqrt')
        .replace(/\^/g, '**')
        .replace(/e\^/g, 'Math.exp');
    
    // Handle complex exponential notation e^{θi}
    const expPattern = /Math\.exp\{([^}]+)i\}/g;
    latex = latex.replace(expPattern, (match, angle) => {
        return `{real: Math.cos(${angle}), imag: Math.sin(${angle})}`;
    });
    
    // Handle complex multiplication
    function multiplyComplex(a, b) {
        return {
            real: a.real * b.real - a.imag * b.imag,
            imag: a.real * b.imag + a.imag * b.real
        };
    }
    
    // Handle complex addition
    function addComplex(a, b) {
        return {
            real: a.real + b.real,
            imag: a.imag + b.imag
        };
    }
    
    // Create a safe evaluation context
    const context = {
        z: z,
        alpha: window.plotShower.variables.alpha || { real: 1, imag: 0 },
        theta: window.plotShower.variables.theta || 2,
        Math: Math,
        multiplyComplex: multiplyComplex,
        addComplex: addComplex
    };
    
    try {
        // Convert the LaTeX expression to a JavaScript function
        let jsExpr = latex;
        
        // Handle complex multiplication (e.g., αz)
        jsExpr = jsExpr.replace(/(\w+)(\w+)/g, 'multiplyComplex($1,$2)');
        
        // Handle complex addition
        jsExpr = jsExpr.replace(/\+/g, ',addComplex(');
        if (jsExpr.includes('addComplex')) {
            jsExpr = `addComplex(${jsExpr})`;
        }
        
        // Create and execute the function
        const fn = new Function('z', 'alpha', 'theta', 'Math', 'multiplyComplex', 'addComplex',
            `return ${jsExpr};`);
        
        return fn(context.z, context.alpha, context.theta, Math, multiplyComplex, addComplex);
    } catch (error) {
        console.error('Error parsing function:', error);
        return { real: 0, imag: 0 };
    }
} 