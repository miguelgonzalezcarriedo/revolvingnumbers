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
        this.point = { ...this.options.initialPoint };
        
        // Create input element for direct coordinate entry
        this.createCoordinateInput();
        
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
}

class PlotShower {
    constructor() {
        this.canvas = document.getElementById('plotCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Initialize parameters
        this.initialPointSize = 10;
        this.minPointSize = 0.1;
        this.angleDenominator = 2;
        this.numberOfDeltas = 0;
        this.possibleDeltas = [];
        this.alpha = { real: 0.5, imag: -0.5 };
        this.windowBoundary = 2;
        
        this.points = [{ real: 1, imag: 0 }];
        this.newPoints = [];
        this.iterations = 0;
        
        this.colorPossibilities = [
            '#0000FF', '#FF0000', '#00FF00', '#FFA500', '#000000', 
            '#800080', '#00FFFF', '#FF00FF', '#FFFF00', '#A52A2A'
        ];
        
        // Initialize complex plane selector
        this.complexSelector = new PointSelector('complexPlane', {
            initialPoint: { x: 0.5, y: -0.5 },
            onChange: (point) => {
                this.alpha.real = point.x;
                this.alpha.imag = point.y;
                this.reset();
            }
        });
        
        this.calculatePossibleDeltas();
        this.setupEventListeners();
        this.resizeCanvas();
        this.drawAngleSelector();
        
        window.addEventListener('resize', () => this.resizeCanvas());
        this.startAnimation();
    }
    
    setupEventListeners() {
        // Only angle selector events now
        const angleSelector = document.getElementById('angleSelector');
        angleSelector.addEventListener('mousedown', (e) => {
            this.updateAngleFromEvent(e);
        });
        
        angleSelector.addEventListener('mousemove', (e) => {
            if (e.buttons === 1) { // Left mouse button is pressed
                this.updateAngleFromEvent(e);
            }
        });
    }
    
    drawAngleSelector() {
        const canvas = document.getElementById('angleSelector');
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const armLength = 100;
        
        // Clear canvas
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        
        // Calculate angle based on denominator
        const angle = Math.PI / Math.abs(this.angleDenominator);
        const direction = Math.sign(this.angleDenominator);
        
        // Set all lines to black
        ctx.strokeStyle = '#000';
        
        // Draw right arm (fixed)
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
        
        // Draw arc - Modified for negative angles
        const arcRadius = 30;
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
        ctx.arc(intersectionX, intersectionY, 6, 0, 2 * Math.PI);
        ctx.fill();
        
        // Add angle label as vertical fraction - Adjusted for negative angles
        ctx.fillStyle = 'black';
        const labelAngle = direction > 0 ? -angle/2 : angle/2;
        const labelX = centerX + (arcRadius + 20) * Math.cos(labelAngle);
        const labelY = centerY + (direction > 0 ? 1 : -1) * (arcRadius + 20) * Math.sin(labelAngle);
        
        // Draw minus sign for negative angles
        if (direction < 0) {
            ctx.font = '14px serif';
            ctx.textAlign = 'right';
            ctx.fillText('-', labelX - 10, labelY - 6);
        }
        
        // Draw π
        ctx.font = '14px serif';
        ctx.textAlign = 'center';
        ctx.fillText('π', labelX, labelY - 6);
        
        // Draw fraction line
        ctx.beginPath();
        ctx.moveTo(labelX - 8, labelY);
        ctx.lineTo(labelX + 8, labelY);
        ctx.stroke();
        
        // Draw denominator
        ctx.fillText(Math.abs(this.angleDenominator).toString(), labelX, labelY + 12);
    }

    updateAngleFromEvent(event) {
        const canvas = document.getElementById('angleSelector');
        const rect = canvas.getBoundingClientRect();
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        const x = event.clientX - rect.left - centerX;
        const y = -(event.clientY - rect.top - centerY);
        
        // Calculate angle from horizontal
        let angle = Math.atan2(y, x);
        
        // Convert angle to denominator (π/n)
        // Ensure the denominator snaps to integer values
        let denominator = Math.round(Math.PI / angle);
        
        // Limit the denominator range
        denominator = Math.max(-20, Math.min(20, denominator));
        if (denominator === 0) denominator = 1;
        
        this.angleDenominator = denominator;
        document.getElementById('angleValue').textContent = denominator;
        
        this.drawAngleSelector();
        this.reset();
    }
    
    resizeCanvas() {
        const size = Math.min(window.innerWidth - 40, window.innerHeight - 150);
        this.canvas.width = size;
        this.canvas.height = size;
        if (this.possibleDeltas) {  // Only draw if initialization is complete
            this.draw();
        }
    }
    
    getCurrentPointSize() {
        // Calculate point size that decreases with each iteration
        const size = this.initialPointSize * Math.pow(0.85, this.iterations);
        return Math.max(size, this.minPointSize);
    }
    
    reset() {
        this.points = [{ real: 1, imag: 0 }];
        this.iterations = 0;
        this.calculatePossibleDeltas();
    }
    
    calculatePossibleDeltas() {
        this.numberOfDeltas = Math.floor(2 * Math.abs(this.angleDenominator));
        this.possibleDeltas = [];
        
        for (let k = 0; k < this.numberOfDeltas; k++) {
            const theta = k * Math.PI / this.angleDenominator;
            const real = Math.cos(theta);
            const imag = Math.sin(theta);
            this.possibleDeltas.push({ real, imag });
        }
    }
    
    complexMult(a, b) {
        return {
            real: a.real * b.real - a.imag * b.imag,
            imag: a.real * b.imag + a.imag * b.real
        };
    }
    
    complexAdd(a, b) {
        return {
            real: a.real + b.real,
            imag: a.imag + b.imag
        };
    }
    
    generateNextIteration() {
        if (this.iterations >= 15) return;
        
        this.iterations++;
        this.newPoints = [];
        this.windowBoundary = 0;
        
        const theta = Math.PI / this.angleDenominator;
        const rotation = { real: Math.cos(theta), imag: Math.sin(theta) };
        
        for (const point of this.points) {
            const point1 = this.complexMult(this.alpha, point);
            const point2 = this.complexAdd(
                this.complexMult(this.alpha, this.complexMult(rotation, point)),
                this.alpha
            );
            
            this.windowBoundary = Math.max(
                this.windowBoundary,
                Math.abs(point1.real),
                Math.abs(point1.imag),
                Math.abs(point2.real),
                Math.abs(point2.imag)
            );
            
            this.newPoints.push(point1, point2);
        }
        
        this.points = this.newPoints;
    }
    
    draw() {
        const ctx = this.ctx;
        const canvas = this.canvas;
        
        // Clear canvas
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw coordinate axes
        ctx.strokeStyle = '#ccc';
        ctx.beginPath();
        ctx.moveTo(canvas.width/2, 0);
        ctx.lineTo(canvas.width/2, canvas.height);
        ctx.moveTo(0, canvas.height/2);
        ctx.lineTo(canvas.width, canvas.height/2);
        ctx.stroke();
        
        // Scale factor for converting mathematical coordinates to canvas coordinates
        const scale = (canvas.width/2) / this.windowBoundary;
        const currentPointSize = this.getCurrentPointSize();
        
        // Count total points being plotted
        const totalPoints = this.points.length * this.possibleDeltas.length;
        
        // Batch drawing points by color for better performance
        this.possibleDeltas.forEach((delta, colorIndex) => {
            ctx.fillStyle = this.colorPossibilities[colorIndex % this.colorPossibilities.length];
            ctx.beginPath();
            
            for (const point of this.points) {
                const rotatedPoint = this.complexMult(delta, point);
                const x = rotatedPoint.real * scale + canvas.width/2;
                const y = -rotatedPoint.imag * scale + canvas.height/2;
                
                ctx.moveTo(x, y);
                ctx.arc(x, y, currentPointSize, 0, 2 * Math.PI);
            }
            
            ctx.fill();
        });
        
        // Update LaTeX equations
        const equationsDiv = document.getElementById('equations');
        const alpha = `(${this.alpha.real.toFixed(2)} ${this.alpha.imag >= 0 ? '+' : ''} ${this.alpha.imag.toFixed(2)}i)`;
        const theta = `\\frac{\\pi}{${this.angleDenominator}}`;
        
        equationsDiv.innerHTML = `
        \\[
            \\begin{cases}
            f_1(z) = ${alpha}z \\\\
            f_2(z) = ${alpha}e^{${theta}i}z + ${alpha}
            \\end{cases}
        \\]`;
        
        // Add iteration and point count info
        const infoDiv = document.getElementById('info');
        infoDiv.textContent = `Iteration ${this.iterations} - Points plotted: ${totalPoints}`;
        
        // Trigger MathJax to process the new equations
        if (window.MathJax) {
            MathJax.typesetClear([equationsDiv]);
            MathJax.typesetPromise([equationsDiv]);
        }
    }
    
    startAnimation() {
        const animate = () => {
            this.generateNextIteration();
            this.draw();
            requestAnimationFrame(animate);
        };
        animate();
    }
}

// Initialize when the page loads
window.addEventListener('load', () => {
    new PlotShower();
}); 