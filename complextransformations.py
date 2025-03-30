import math
import tkinter as tk
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
import numpy as np
import plotly.graph_objects as go
from tkinter import filedialog
import os



class PlotShower:
    def __init__(self, root):
        self.root = root
        
        self.root.title("Binary Expansion Curve Generator")
        
        self.point_size = 0.5
        self.alpha = complex(.5,-.5)  # Fixed value
        self.gamma = complex(.5,.5)   # Fixed value
        self.window_boundary = 0

        self.points = [1]
        self.new_points = []
        self.show_tiling = False
        self.show_3d = False
        self.max_iterations = 5  # Default max iterations

        # Add save button state
        self.can_save = False  # Only allow saving when there's data and in 3D mode

        # Define colors for different possible deltas
        self.color_possibilities = [
            'blue', 'red', 'green', 'orange', 'black', 'purple', 'cyan', 'magenta', 'yellow', 'brown',
            'lime', 'teal', 'pink', 'lavender', 'maroon', 'olive', 'navy', 'aquamarine', 'gold', 'coral']
        
        self.x_data = []
        self.y_data = []
        self.z_data = []  # For 3D plotting
        self.colors = []
        self.iterations = 0

        # Store last known values for sliders
        self.previous_point_size = 1
        self.previous_max_iterations = 5
        
        # Initialize the plot
        plt.ion()  # Enable interactive mode
        self.fig = plt.figure(figsize=(6, 6))
        self.create_plot()
        self.setup_ui()
        self.start_polling()

    def create_plot(self):
        """Create either 2D or 3D plot based on current mode"""
        plt.clf()  # Clear the figure
        if self.show_3d:
            self.ax = self.fig.add_subplot(111, projection='3d')
            self.scatter = self.ax.scatter([], [], [], s=self.point_size)
        else:
            self.ax = self.fig.add_subplot(111)
            self.scatter = self.ax.scatter([], [], s=self.point_size)
        
        # Set initial limits
        if self.show_3d:
            self.ax.set_xlim(-2, 2)
            self.ax.set_ylim(-2, 2)
            self.ax.set_zlim(0, 1)
        else:
            plt.xlim(-2, 2)
            plt.ylim(-2, 2)

    def setup_ui(self):
        # Frame for buttons and sliders
        controls_frame = tk.Frame(self.root)
        controls_frame.pack(fill=tk.X, padx=10, pady=10)

        # Left frame for horizontal sliders
        left_frame = tk.Frame(controls_frame)
        left_frame.pack(side=tk.LEFT, padx=5)

        # Iterations slider (horizontal)
        self.iterations_slider = tk.Scale(left_frame, from_=1, to_=15, resolution=1, orient=tk.HORIZONTAL,
                                        label="Max Iterations", bg=self.root.cget('bg'), highlightthickness=0)
        self.iterations_slider.set(5)
        self.iterations_slider.pack(side=tk.TOP, pady=2)

        # Point size slider (horizontal)
        self.point_size_slider = tk.Scale(left_frame, from_=-5, to_=5, resolution=1, orient=tk.HORIZONTAL,
                                        label="Point Size", bg=self.root.cget('bg'), highlightthickness=0)
        self.point_size_slider.set(0)
        self.point_size_slider.pack(side=tk.TOP, pady=2)

        # Toggle buttons frame
        buttons_frame = tk.Frame(controls_frame)
        buttons_frame.pack(side=tk.LEFT, padx=5)

        # Tiling toggle button
        self.tiling_button = tk.Button(buttons_frame, text="Toggle Tiling", command=self.toggle_tiling)
        self.tiling_button.pack(side=tk.TOP, pady=2)

        # 3D toggle button
        self.plot_3d_button = tk.Button(buttons_frame, text="Toggle 3D", command=self.toggle_3d)
        self.plot_3d_button.pack(side=tk.TOP, pady=2)

        # Save 3D model button
        self.save_button = tk.Button(buttons_frame, text="Save 3D Model", command=self.save_3d_model, state='disabled')
        self.save_button.pack(side=tk.TOP, pady=2)
        
        # Canvas
        self.canvas = tk.Canvas(self.root, bg='white')
        self.canvas.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

    def toggle_tiling(self):
        self.show_tiling = not self.show_tiling
        self.clear_points()
        self.generate_next_iteration()

    def toggle_3d(self):
        """Toggle between 2D and 3D plotting"""
        self.show_3d = not self.show_3d
        self.create_plot()
        self.clear_points()
        self.generate_next_iteration()
        # Update save button state
        self.save_button.config(state='normal' if self.show_3d else 'disabled')

    def start_polling(self):
        """Start a loop to check for slider changes."""
        self.check_slider_changes()
        self.root.after(100, self.start_polling)  # Check every 100 ms

    def check_slider_changes(self):        
        """Check if slider values have changed and call appropriate functions."""
        self.point_size = 10 ** self.point_size_slider.get()
        self.max_iterations = self.iterations_slider.get()

        if (self.previous_point_size != self.point_size or
            self.max_iterations != self.previous_max_iterations):
            
            self.previous_point_size = self.point_size
            self.previous_max_iterations = self.max_iterations
            print("A Slider has been changed")
            
            self.clear_points()  # Clear existing points
            self.generate_next_iteration()
        else:
            self.generate_next_iteration()

    def w_n(self, binary_str, n):
        """Get the nth binary digit after the decimal point (1-indexed)
        For x = 0.101010..., w_1(x) = 1, w_2(x) = 0, w_3(x) = 1, etc."""
        if n <= len(binary_str):
            return int(binary_str[n-1])
        return 0

    def q_n(self, binary_str, n):
        """Sum of first n binary digits after the decimal point"""
        return sum(self.w_n(binary_str, i) for i in range(1, n+1))

    def evaluate_function(self, binary_str):
        """Implements G(x) = 1/2 * sum((-1)^(w_1(x)-1) * alpha^(n-1-q_(n-1)) * gamma^q_(n-1))
        where x is treated as 0.x1x2x3... and binary_str represents the digits after decimal point"""
        k = len(binary_str)
        
        # Calculate the sum
        result = complex(0, 0)
        for n in range(1, k):  # Sum from n=1 to k-1
            # Calculate w_n(x)-1 for the power of -n
            # w_n is the nth digit after the decimal point
            w_n_minus_1 = self.w_n(binary_str, n) - 1
            
            # Calculate q_(n-1) for the powers of alpha and gamma
            q_n_minus_1 = self.q_n(binary_str, n-1)
            
            # Calculate the term: (-1)^(w_1(x)-1) * alpha^(n-1-q_(n-1)) * gamma^q_(n-1)
            term = ((-1) ** w_n_minus_1) * (self.alpha ** (n-1-q_n_minus_1)) * (self.gamma ** q_n_minus_1)
            result += term

        # Multiply by 1/2
        return 0.5 * result

    def generate_binary_strings(self, length):
        """Generate all binary strings of given length."""
        return [format(i, f'0{length}b') for i in range(2**length)]

    def clear_points(self):
        # Re-initialize the scatter plot
        self.scatter.remove()  # Remove the current scatter plot
        self.scatter = self.ax.scatter([], [], s = self.point_size)  # Create a new empty scatter plot
        self.fig.canvas.draw()  # Redraw the canvas

        self.iterations = 0
        self.points = [1]  # Reset initial points

    def generate_next_iteration(self):
        if self.iterations >= self.max_iterations:
            return
        self.iterations += 1
        
        # Reset lists for new iteration
        self.new_points = []
        self.x_data = []
        self.y_data = []
        self.z_data = []  # For 3D plotting
        self.colors = []
        self.window_boundary = 0
        
        # Generate all binary strings of current length
        binary_strings = [format(i, f'0{self.iterations}b') for i in range(2**self.iterations)]
        points = [self.evaluate_function(binary_str) for binary_str in binary_strings]
        
        # Calculate z values (binary to decimal conversion)
        z_values = [int(binary, 2) / (2**self.iterations) for binary in binary_strings]
        
        # Update window boundary
        for point in points:
            self.window_boundary = max(self.window_boundary,
                                    abs(point.real),
                                    abs(point.imag))

        # Handle points based on tiling mode
        if self.show_tiling:
            # Apply rotations and shifts
            for point, z in zip(points, z_values):
                for p in range(4):  # Four rotations for square symmetry
                    rotation = 1j ** p  # Rotate by multiples of 90 degrees
                    for x_shift in [-1, 0, 1]:
                        for y_shift in [-1, 0, 1]:
                            shift = complex(x_shift, y_shift)
                            rotated_point = rotation * point + shift
                            self.x_data.append(rotated_point.real)
                            self.y_data.append(rotated_point.imag)
                            self.z_data.append(z)
                            self.colors.append(self.color_possibilities[p])
        else:
            # Just plot the single curve
            for point, z in zip(points, z_values):
                self.x_data.append(point.real)
                self.y_data.append(point.imag)
                self.z_data.append(z)
                self.colors.append('blue')
    
        # Update points after the loop
        self.points = self.new_points
        print(f"Generated {len(self.x_data)} points at iteration {self.iterations}")

        self.draw_points()

    def draw_points(self):
        # Set appropriate limits based on view mode
        boundary = max(2, self.window_boundary + 1) if self.show_tiling else max(1.5, self.window_boundary)
        
        if self.show_3d:
            self.scatter.remove()
            self.scatter = self.ax.scatter(self.x_data, self.y_data, self.z_data, 
                                         c=self.colors, s=self.point_size)
            self.ax.set_xlim(-boundary, boundary)
            self.ax.set_ylim(-boundary, boundary)
            self.ax.set_zlim(0, 1)
        else:
            self.scatter.set_offsets(np.column_stack((self.x_data, self.y_data)))
            self.scatter.set_facecolor(self.colors)
            plt.xlim(-boundary, boundary)
            plt.ylim(-boundary, boundary)
        
        title = f"Binary Expansion Curve - Iteration {self.iterations}\n"
        title += f"({'Tiled' if self.show_tiling else 'Single Curve'}, {'3D' if self.show_3d else '2D'})"
        self.ax.set_title(title)
           
        # Redraw the canvas
        self.fig.canvas.draw()

        # Update save button state based on whether we have data in 3D mode
        self.save_button.config(state='normal' if self.show_3d and len(self.x_data) > 0 else 'disabled')

    def save_3d_model(self):
        """Save the current 3D model as an interactive HTML file"""
        if not self.show_3d or len(self.x_data) == 0:
            return

        # Create Plotly figure
        fig = go.Figure(data=[go.Scatter3d(
            x=self.x_data,
            y=self.y_data,
            z=self.z_data,
            mode='markers',
            marker=dict(
                size=self.point_size/10,  # Adjust size for Plotly
                color=self.z_data,  # Color by z value
                colorscale='Viridis',
                opacity=0.8
            )
        )])

        # Update layout
        fig.update_layout(
            title=f"Binary Expansion Curve - Iteration {self.iterations}",
            scene=dict(
                xaxis_title="X",
                yaxis_title="Y",
                zaxis_title="Binary Value",
                aspectmode='cube'
            ),
            width=800,
            height=800
        )

        # Ask user where to save the file
        file_path = filedialog.asksaveasfilename(
            defaultextension=".html",
            filetypes=[("HTML files", "*.html")],
            title="Save 3D Model As"
        )

        if file_path:
            # Save the figure as an HTML file
            fig.write_html(file_path)
            print(f"Saved 3D model to {file_path}")

  
            
if __name__ == "__main__":
    root = tk.Tk()
    app = PlotShower(root)
    root.mainloop()