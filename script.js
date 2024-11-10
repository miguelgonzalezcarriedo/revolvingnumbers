document.addEventListener('DOMContentLoaded', () => {
    const complexPlane = document.getElementById('complexPlane');
    const angleInput = document.getElementById('angle');
    const toggleDirectionButton = document.getElementById('toggleDirection');
    const visualization = document.getElementById('visualization');

    const complexValue = document.getElementById('complexValue');
    const angleValue = document.getElementById('angleValue');

    let numberDirection = 'contracting';
    let alpha = { real: 1, imag: 1 };
    let isDragging = false;
    let touchStartedInsideCanvas = false;

    // Function to generate a random light color
    function getRandomLightColor() {
        const r = Math.floor(Math.random() * 156 + 100); // 100-255 for light colors
        const g = Math.floor(Math.random() * 156 + 100);
        const b = Math.floor(Math.random() * 156 + 100);
        return `rgb(${r}, ${g}, ${b})`;
    }

    // Function to generate a random dark color
    function getRandomDarkColor() {
        const r = Math.floor(Math.random() * 100); // 0-99 for dark colors
        const g = Math.floor(Math.random() * 100);
        const b = Math.floor(Math.random() * 100);
        return `rgb(${r}, ${g}, ${b})`;
    }

    // Apply random colors to elements
    document.body.style.backgroundColor = getRandomLightColor();
    document.querySelector('header').style.backgroundColor = getRandomLightColor();
    document.querySelector('footer').style.backgroundColor = getRandomLightColor();
    document.getElementById('controls').style.backgroundColor = getRandomLightColor();
    document.getElementById('canvasContainer').style.backgroundColor = getRandomLightColor();
    document.getElementById('complexPlaneContainer').style.backgroundColor = getRandomLightColor();
    document.getElementById('visualizationContainer').style.backgroundColor = getRandomLightColor();

    // Apply random dark colors to borders
    const header = document.querySelector('header');
    header.style.borderBottomColor = getRandomDarkColor();
    header.style.borderTopColor = getRandomDarkColor(); // Random top border color

    const footer = document.querySelector('footer');
    footer.style.borderTopColor = getRandomDarkColor();
    footer.style.borderBottomColor = getRandomDarkColor(); // Random bottom border color

    document.getElementById('controls').style.borderColor = getRandomDarkColor();
    document.getElementById('canvasContainer').style.borderColor = getRandomDarkColor();
    document.getElementById('complexPlaneContainer').style.borderColor = getRandomDarkColor();
    document.getElementById('visualizationContainer').style.borderColor = getRandomDarkColor();
    complexPlane.style.borderColor = getRandomDarkColor();
    visualization.style.borderColor = getRandomDarkColor();

    // Apply random color to the image container
    document.getElementById('imageContainer').style.backgroundColor = getRandomLightColor();
    document.getElementById('imageContainer').style.borderColor = getRandomDarkColor();

    // Apply random dark border to each image
    const images = document.querySelectorAll('.responsive-image');
    images.forEach(image => {
        image.style.border = `2px solid ${getRandomDarkColor()}`;
    });

    function drawGrid() {
        const ctx = complexPlane.getContext('2d');
        ctx.clearRect(0, 0, complexPlane.width, complexPlane.height);

        const width = complexPlane.width;
        const height = complexPlane.height;
        const step = 30;

        ctx.strokeStyle = '#ccc';
        ctx.beginPath();
        for (let x = step; x < width; x += step) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }
        for (let y = step; y < height; y += step) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }
        ctx.stroke();

        // Draw axes
        ctx.strokeStyle = '#000';
        ctx.beginPath();
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width / 2, height);
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        // Add axis labels
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.fillText('Real', width - 30, height / 2 - 10); // Real axis label
        ctx.fillText('Imaginary', width / 2 + 10, 15); // Imaginary axis label

        // Draw tick marks on the axes
        ctx.beginPath();
        for (let x = step; x < width; x += step) {
            ctx.moveTo(x, height / 2 - 5);
            ctx.lineTo(x, height / 2 + 5);
        }
        for (let y = step; y < height; y += step) {
            ctx.moveTo(width / 2 - 5, y);
            ctx.lineTo(width / 2 + 5, y);
        }
        ctx.stroke();
    }

    function drawPoint() {
        const ctx = complexPlane.getContext('2d');
        const x = (alpha.real * (complexPlane.width / 2)) + (complexPlane.width / 2);
        const y = (complexPlane.height / 2) - (alpha.imag * (complexPlane.height / 2));

        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fill();

        // Position the label
        positionLabel(x, y);
    }

    function positionLabel(x, y) {
        const label = document.getElementById('complexValue');
        label.style.position = 'absolute';

        // Determine whether to place the label above or below
        if (y > complexPlane.height / 2) {
            label.style.top = `${y + complexPlane.offsetTop - label.offsetHeight - 10}px`; // Place above
        } else {
            label.style.top = `${y + complexPlane.offsetTop + 10}px`; // Place below
        }

        // Determine whether to place the label to the left or right
        if (x < complexPlane.width / 2) {
            label.style.left = `${x + complexPlane.offsetLeft + 10}px`; // Place to the right
        } else {
            label.style.left = `${x + complexPlane.offsetLeft - label.offsetWidth - 10}px`; // Place to the left
        }
    }

    function updateImage() {
        let angle = parseInt(angleInput.value, 10);
        if (angle === 0) {
            angle = angleInput.value > 0 ? 1 : -1; // Skip 0
            angleInput.value = angle;
        }
        angleValue.textContent = angle;

        // Format alpha values to ensure 0, 1, and -1 become 0.0, 1.0, and -1.0
        const realFormatted = (parseFloat(alpha.real) === 0 || parseFloat(alpha.real) === 1 || parseFloat(alpha.real) === -1) 
            ? parseFloat(alpha.real).toFixed(1) 
            : parseFloat(alpha.real).toString();
        const imagFormatted = (parseFloat(alpha.imag) === 0 || parseFloat(alpha.imag) === 1 || parseFloat(alpha.imag) === -1) 
            ? parseFloat(alpha.imag).toFixed(1) 
            : parseFloat(alpha.imag).toString();

        const baseFolder = `alpha=${realFormatted}+${imagFormatted}i`;
        const angleFolder = `angle=piDividedBy${angle}`;
        const directionFolder = numberDirection;
        const imageName = 'figureMax.png';

        const imagePath = `visualizations/${directionFolder}/${angleFolder}/${baseFolder}/${imageName}`;
        visualization.src = imagePath;

        updateFavicon(imagePath);
    }

    function updateFavicon(imagePath) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = imagePath;
    }

    function updateButtonText() {
        toggleDirectionButton.textContent = numberDirection === 'contracting' ? 'Show Expanding' : 'Show Contracting';
    }

    function updateAlphaFromEvent(event) {
        const rect = complexPlane.getBoundingClientRect();
        let x, y;

        if (event.touches) {
            x = event.touches[0].clientX - rect.left;
            y = event.touches[0].clientY - rect.top;
        } else {
            x = event.clientX - rect.left;
            y = event.clientY - rect.top;
        }

        // Clamp x and y to the canvas boundaries
        x = Math.max(0, Math.min(x, complexPlane.width));
        y = Math.max(0, Math.min(y, complexPlane.height));

        // Calculate real and imaginary parts, snapping to nearest 0.05
        alpha.real = (Math.round(((x - complexPlane.width / 2) / (complexPlane.width / 2)) / 0.05) * 0.05).toFixed(2);
        alpha.imag = (Math.round(((complexPlane.height / 2 - y) / (complexPlane.height / 2)) / 0.05) * 0.05).toFixed(2);

        // Determine the sign and absolute value for the imaginary part
        const imagSign = alpha.imag < 0 ? '-' : '+';
        const imagAbs = Math.abs(alpha.imag).toFixed(2);

        // Update the label text in the format x ± |y|i
        complexValue.textContent = `${alpha.real} ${imagSign} ${imagAbs}i`;
    }

    function handleMouseDown(event) {
        isDragging = true;
        updateAlphaFromEvent(event);
        drawGrid();
        drawPoint();
        updateImage();
    }

    function handleMouseMove(event) {
        if (isDragging) {
            updateAlphaFromEvent(event);
            drawGrid();
            drawPoint();
            updateImage();
        }
    }

    function handleMouseUp() {
        isDragging = false;
        touchStartedInsideCanvas = false;
    }

    function handleTouchStart(event) {
        const rect = complexPlane.getBoundingClientRect();
        const touchX = event.touches[0].clientX - rect.left;
        const touchY = event.touches[0].clientY - rect.top;

        if (touchX >= 0 && touchX <= complexPlane.width && touchY >= 0 && touchY <= complexPlane.height) {
            touchStartedInsideCanvas = true;
            handleMouseDown(event);
        }
    }

    function handleTouchMove(event) {
        if (touchStartedInsideCanvas) {
            event.preventDefault(); // Prevent scrolling
            handleMouseMove(event);
        }
    }

    complexPlane.addEventListener('mousedown', handleMouseDown);
    complexPlane.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleMouseUp);

    angleInput.addEventListener('input', updateImage);
    toggleDirectionButton.addEventListener('click', () => {
        numberDirection = numberDirection === 'contracting' ? 'expanding' : 'contracting';
        updateImage();
        updateButtonText();
    });

    document.getElementById('saveImage').addEventListener('click', () => {
        const visualization = document.getElementById('visualization');
        const link = document.createElement('a');
        link.href = visualization.src;
        link.download = 'visualization.png';
        link.click();
    });

    drawGrid();
    drawPoint();
    updateImage(); // Initial load
    updateButtonText(); // Set initial button text
});
