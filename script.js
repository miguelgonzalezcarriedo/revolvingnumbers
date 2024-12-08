class PlotShower {
    constructor() {
        this.canvas = document.getElementById('plotCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Initialize parameters
        this.initialPointSize = 10;  // Starting point size
        this.minPointSize = 0.1;     // Minimum point size
        this.angleDenominator = 2;
        this.numberOfDeltas = 0;
        this.possibleDeltas = [];
        this.alpha = { real: 0.5, imag: -0.5 };
        this.windowBoundary = 2;
        
        this.points = [{ real: 1, imag: 0 }];
        this.newPoints = [];
        this.iterations = 0;
        
        // Colors for different deltas
        this.colorPossibilities = [
            '#0000FF', '#FF0000', '#00FF00', '#FFA500', '#000000', 
            '#800080', '#00FFFF', '#FF00FF', '#FFFF00', '#A52A2A'
        ];
        
        // Calculate initial deltas before starting
        this.calculatePossibleDeltas();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize canvas size after all setup is complete
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Start animation loop
        this.startAnimation();
    }
    
    resizeCanvas() {
        const size = Math.min(window.innerWidth - 40, window.innerHeight - 150);
        this.canvas.width = size;
        this.canvas.height = size;
        if (this.possibleDeltas) {  // Only draw if initialization is complete
            this.draw();
        }
    }
    
    setupEventListeners() {
        const sliders = {
            'baseReal': value => this.alpha.real = parseFloat(value),
            'baseImaginary': value => this.alpha.imag = parseFloat(value),
            'angle': value => {
                this.angleDenominator = parseFloat(value);
                if (this.angleDenominator === 0) this.angleDenominator = 0.5;
            }
        };
        
        Object.entries(sliders).forEach(([id, callback]) => {
            const slider = document.getElementById(id);
            const valueDisplay = document.getElementById(`${id}Value`);
            
            slider.addEventListener('input', (e) => {
                const value = e.target.value;
                valueDisplay.textContent = value;
                callback(value);
                this.reset();
            });
        });
    }
    
    getCurrentPointSize() {
        // Calculate point size that decreases with each iteration
        const size = this.initialPointSize * Math.pow(0.8, this.iterations);
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
        
        equationsDiv.innerHTML = `\\[
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