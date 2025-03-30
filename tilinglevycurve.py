import math
import tkinter as tk
import matplotlib.pyplot as plt
import numpy as np



class PlotShower:
    def __init__(self, root):
        self.root = root
        
        self.root.title("Playing with Revolving Numbers")
        
        
        self.point_size = 0.5

        self.angle_denominator = 2
        self.number_of_deltas = 0
        self.possible_deltas = []
        self.alpha = complex(.5,-.5)
        self.shift = complex(-.5,.5)
        self.window_boundary = 0

        self.points = [1]
        self.new_points = []

        
        # Define colors for different possible deltas
        self.color_possibilities = [
            'blue', 'red', 'green', 'orange', 'black', 'purple', 'cyan', 'magenta', 'yellow', 'brown',
            'lime', 'teal', 'pink', 'lavender', 'maroon', 'olive', 'navy', 'aquamarine', 'gold', 'coral']
        
        self.x_data = []
        self.y_data = []
        self.colors = []
        self.iterations = 0

        # Store last known values for sliders
        self.previous_point_size = 1
        self.previous_alpha = complex(.5,-.5)
        self.previous_denom = 0
        
        
        
        # Initialize the plot
        plt.ion()  # Enable interactive mode
        self.fig, self.ax = plt.subplots(figsize=(6, 6))
        self.scatter = self.ax.scatter([], [], s = self.point_size)  # Initialize empty scatter plot
        plt.xlim(-2, 2)  # Set limits as needed
        plt.ylim(-2, 2)  # Set limits as needed
             
        self.setup_ui()
        self.start_polling()
        

    def setup_ui(self):
        # Frame for buttons and sliders
        controls_frame = tk.Frame(self.root)
        controls_frame.pack(fill=tk.X, padx=10, pady=10)

        # Sliders for scaling and origin positions
        self.base_real_slider = tk.Scale(controls_frame, from_=-1, to_=1, resolution=0.05, orient=tk.HORIZONTAL, label="Real Base", bg=self.root.cget('bg'), highlightthickness=0)
        self.base_real_slider.set(.5)  # Set default to .5
        self.base_real_slider.pack(side=tk.LEFT, padx=5)

        self.base_imaginary_slider = tk.Scale(controls_frame, from_=-1, to_=1, resolution=0.05, orient=tk.VERTICAL, label="Imaginary Base", bg=self.root.cget('bg'), highlightthickness=0)
        self.base_imaginary_slider.set(-.5)  # Set default to -.5
        self.base_imaginary_slider.pack(side=tk.LEFT, padx=5)

        self.angle_slider = tk.Scale(controls_frame, from_=-20, to_=20, resolution=1, orient=tk.VERTICAL, label="Angle pi/", bg=self.root.cget('bg'), highlightthickness=0)
        self.angle_slider.set(2)  # Set default to 2
        self.angle_slider.pack(side=tk.LEFT, padx=5)

        self.point_size_slider = tk.Scale(controls_frame, from_=-5, to_=5, resolution=1, orient=tk.VERTICAL, label="Point Size", bg=self.root.cget('bg'), highlightthickness=0)
        self.point_size_slider.set(0)  # Set default to 1
        self.point_size_slider.pack(side=tk.LEFT, padx=5)
        
        # Canvas
        self.canvas = tk.Canvas(self.root, bg='white')
        self.canvas.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)


    def start_polling(self):
        """Start a loop to check for slider changes."""
        self.check_slider_changes()
        self.root.after(100, self.start_polling)  # Check every 100 ms

    def check_slider_changes(self):        
        """Check if slider values have changed and call appropriate functions."""
        
        self.alpha = complex(self.base_real_slider.get(), self.base_imaginary_slider.get())
        self.angle_denominator = self.angle_slider.get()
        self.point_size = 10 ** self.point_size_slider.get()
        if self.angle_denominator == 0:
            self.angle_denominator = .5

        if (self.previous_alpha != self.alpha or self.angle_denominator != self.previous_denom or self.previous_point_size != self.point_size):
            self.previous_alpha = self.alpha
            self.previous_denom = self.angle_denominator
            self.previous_point_size = self.point_size
            print("A Slider has been changed")
            
            self.clear_points()  # Clear existing points
            self.generate_next_iteration()
        else:
            self.generate_next_iteration()


    def clear_points(self):
        # Re-initialize the scatter plot
        self.scatter.remove()  # Remove the current scatter plot
        self.scatter = self.ax.scatter([], [], s = self.point_size)  # Create a new empty scatter plot
        self.fig.canvas.draw()  # Redraw the canvas

        self.iterations = 0
        self.points = [1]  # Reset initial points

        self.number_of_deltas = int(2 * abs(self.angle_denominator))    # Number of deltas (p) is the amount of times it takes for the angle given to make one full revolution around unit circle
        self.possible_deltas = []
        for k in range(self.number_of_deltas):
            theta = k * math.pi / self.angle_denominator # Angle of rotation
            complex_number = math.e ** (1j * theta) # Use Euler's formula to get the value of the point on the unit circle in the complex plane
            rounded_number = complex(round(complex_number.real, 5), round(complex_number.imag, 5))
            self.possible_deltas.append(rounded_number)  #Add the newly found angle value delta to the list
        print(self.possible_deltas)

    def generate_next_iteration(self):
        if self.iterations == 15:
            return
        self.iterations += 1
        
        # Reset lists for new iteration
        self.new_points = []
        self.x_data = []
        self.y_data = []
        self.colors = []
        self.window_boundary = 0  # Reset window boundary
        
        # Store current points
        current_points = self.points.copy()
        print(f"Starting iteration {self.iterations} with {len(current_points)} points")
        
        # First generate all new points through IFS
        for point in current_points:
            # Calculate new points
            point1 = (self.alpha * (point - self.shift)) + self.shift
            point2 = (self.alpha * math.e ** (1j * math.pi / self.angle_denominator) * (point - self.shift) + self.alpha) + self.shift
            
            # Update window boundary
            self.window_boundary = max(self.window_boundary,
                                abs(point1.real),
                                abs(point1.imag),
                                abs(point2.real),
                                abs(point2.imag))
        
            # Add points to new_points list
            self.new_points.extend([point1, point2])

        # Now rotate all points by each delta and add to plotting data
        for point in self.new_points:
            for p, delta in enumerate(self.possible_deltas):
                # Create a 3x3 grid by shifting the pattern
                for x_shift in [-1, 0, 1]:
                    for y_shift in [-1, 0, 1]:
                        shift = complex(x_shift, y_shift)
                        rotated_point = delta * point + shift
                        self.x_data.append(rotated_point.real)
                        self.y_data.append(rotated_point.imag)
                        self.colors.append(self.color_possibilities[p])
    
        # Update points after the loop
        self.points = self.new_points
        print(f"Finished iteration {self.iterations} with {len(self.points)} points")

        self.draw_points()

    def draw_points(self):
        # Set wider limits to show the 3x3 grid
        boundary = max(2, self.window_boundary + 1)  # Add 1 to account for the shifts
        plt.xlim(-boundary, boundary)
        plt.ylim(-boundary, boundary)

        # Update scatter plot with new data and color
        self.scatter.set_offsets(np.column_stack((self.x_data, self.y_data)))
        self.scatter.set_facecolor(self.colors)
        
        plt.title(f"complex transformations of angle π/{self.angle_denominator} and base = {self.alpha.real} + {self.alpha.imag}i\nThis is iteration {self.iterations}")

           
        # Redraw the canvas
        self.fig.canvas.draw()

  
            
if __name__ == "__main__":
    root = tk.Tk()
    app = PlotShower(root)
    root.mainloop()