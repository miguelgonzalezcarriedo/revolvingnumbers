import matplotlib.pyplot as plt
import numpy as np
import math
from matplotlib import font_manager
from PIL import Image
import os

def create_single_plot(angle_denom, save_path):
    """
    Create and save a single plot for a given denominator
    """
    # Set up mathematical font (Computer Modern)
    plt.rcParams['font.family'] = ['DejaVu Serif']
    plt.rcParams['mathtext.fontset'] = 'cm'
    
    # Create figure and axis with increased height for title
    fig, ax = plt.subplots(figsize=(8, 10))  # Increased height from 8 to 10
    
    # Plot unit circle
    theta = np.linspace(0, 2*np.pi, 100)
    x = np.cos(theta)
    y = np.sin(theta)
    ax.plot(x, y, 'k--', alpha=0.3, label='Unit Circle')
    
    # Calculate and plot points
    number_of_points = int(2 * abs(angle_denom))
    points = []
    
    for k in range(number_of_points):
        theta = k * math.pi / angle_denom
        # Use Euler's formula to get point on unit circle
        complex_point = math.e ** (1j * theta)
        points.append(complex_point)
        
        # Plot point
        ax.plot(complex_point.real, complex_point.imag, 'bo', markersize=8)
        
        # Add text label showing Euler's formula with matplotlib's math notation
        label = f'$e^{{i{k}\pi/{angle_denom}}}$'
        ax.annotate(label, 
                   (complex_point.real * 1.1, complex_point.imag * 1.1),
                   fontsize=32)
    
    # Set equal aspect ratio and limits
    ax.set_aspect('equal')
    ax.set_xlim(-1.5, 1.5)
    ax.set_ylim(-1.5, 1.5)
    
    # Add grid and axes
    ax.grid(True, alpha=0.3)
    ax.axhline(y=0, color='k', alpha=0.3)
    ax.axvline(x=0, color='k', alpha=0.3)
    
    # Add title and labels with proper LaTeX theta
    ax.set_title('Points on Unit Circle Separated by\n Angle $\\theta = \\pi/%d$' % angle_denom, 
                fontsize=32, pad=40)  # Increased pad from 20 to 40
    ax.set_xlabel('Real', fontsize=32)
    ax.set_ylabel('Imaginary', fontsize=32)
    
    # Adjust layout to prevent title cutoff
    plt.tight_layout()
    
    # Save the plot
    plt.savefig(save_path, dpi=150, bbox_inches='tight')  # Added bbox_inches='tight' for better spacing
    image = Image.open(save_path)
    image = image.resize((1252, 1345))
    image.save(save_path)
    plt.close()

def create_animation():
    # Create temporary directory for frames
    os.makedirs('temp_frames', exist_ok=True)
    
    # Generate frames for the sequence [1, 8], [9, 1], [-1, -8], [-9, -1]
    frames = []
    sequence = list(range(1, 9)) + list(range(9, 0, -1)) + list(range(-1, -9, -1)) + list(range(-9, 0))
    
    for denom in sequence:
        frame_path = f'temp_frames/frame_{denom}.png'
        create_single_plot(denom, frame_path)
        frames.append(frame_path)
    
    # Create GIF
    images = [Image.open(frame) for frame in frames]
    
    images[0].save(
        'unit_circle_animation.gif',
        save_all=True,
        append_images=images[1:],
        duration=500,  # 0.5 seconds per frame
        loop=0
    )
    
    # Clean up temporary files
    for frame in frames:
        if os.path.exists(frame):
            os.remove(frame)
    os.rmdir('temp_frames')

if __name__ == "__main__":
    create_animation()
