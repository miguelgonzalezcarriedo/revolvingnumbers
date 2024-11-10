import os
import numpy as np
import matplotlib.pyplot as plt
from PIL import Image
import math
import io

class VisualizationCreator:
    def __init__(self):
        self.n = 0
        self.places = 0
        self.number_of_deltas = 0
        self.number_direction = 'contracting'
        self.angle_denominator = 2
        self.alpha = complex(1, 1)
        self.window_boundary = 0
        self.x_data = np.array([])
        self.y_data = np.array([])
        self.colors = np.array([])
        self.color_possibilities = [
            'blue', 'red', 'green', 'orange', 'black', 'purple', 'cyan', 'magenta', 'yellow', 'brown',
            'lime', 'teal', 'pink', 'lavender', 'maroon', 'olive', 'navy', 'aquamarine', 'gold', 'coral']
        
        # Initialize the plot
        # plt.ion()  # Turn off interactive mode
        self.fig, self.ax = plt.subplots(figsize=(6, 6))
        self.scatter = self.ax.scatter([], [], s=1)  # Initialize empty scatter plot
        plt.xlim(-2, 2)  # Set limits as needed
        plt.ylim(-2, 2)  # Set limits as needed

    def generate_max_images(self):
        try:
            for self.angle_denominator in np.arange(-6, 7, 1):
                if self.angle_denominator == 0:
                    continue
                self.number_of_deltas = int(2 * abs(self.angle_denominator))
                for direction in ["expanding", "contracting"]:
                    self.number_direction = direction
                    for x in np.arange(-1.0, 1.05, 0.05).round(2):
                        for y in np.arange(-1.0, 1.05, 0.05).round(2):
                            self.alpha = complex(x, y)
                            self.clear_points()
                            self.navigate_and_extract()
                            self.draw_points()
                            self.save_max_image()
        except KeyboardInterrupt:
            print("\nProgram terminated by user")

    def generate_animations(self):
        try:
            for self.angle_denominator in np.arange(-6, 7, 1):
                if self.angle_denominator == 0:
                    continue
                self.number_of_deltas = int(2 * abs(self.angle_denominator))
                for direction in ["expanding", "contracting"]:
                    self.number_direction = direction
                    for x in np.arange(-1.0, 1.05, 0.05).round(2):
                        for y in np.arange(-1.0, 1.05, 0.05).round(2):
                            self.alpha = complex(x, y)
                            self.clear_points()
                            self.navigate_and_extract()
                            self.animate_construction()
        except KeyboardInterrupt:
            print("\nProgram terminated by user")          

    def clear_points(self):
        self.x_data = np.array([])
        self.y_data = np.array([])
        self.colors = np.array([])
        self.window_boundary = 0

    def navigate_and_extract(self):
        self.angle_folder = f"angle=piDividedBy{self.angle_denominator}"
        self.base_folder = f"alpha={self.alpha.real}+{self.alpha.imag}i"
        os.makedirs(os.path.join('data', self.number_direction, self.angle_folder, self.base_folder), exist_ok=True)
        os.makedirs(os.path.join('visualizations', self.number_direction, self.angle_folder, self.base_folder), exist_ok=True)
        self.data_file_path = os.path.join('data', self.number_direction, self.angle_folder, self.base_folder, 'coordinates.npz')

        if os.path.exists(self.data_file_path):
            data = np.load(self.data_file_path)
            self.x_data = np.append(self.x_data, data['x_data'].tolist())
            self.y_data = np.append(self.y_data, data['y_data'].tolist())
            self.colors = np.append(self.colors, data['colors'].tolist())
            self.window_boundary = float(data['window_boundary'])
            self.n = int(data['n'])
            self.places = math.floor(math.log2(self.n))+1

    def draw_points(self):
        plt.xlim(-self.window_boundary, self.window_boundary)  # Set limits as needed
        plt.ylim(-self.window_boundary, self.window_boundary)  # Set limits as needed   

        self.scatter.set_offsets(np.column_stack((self.x_data, self.y_data)))
        self.scatter.set_facecolor(self.colors)

        plt.title(f"{self.number_direction} revolving numbers of angle π/{self.angle_denominator} and base {self.alpha.real} + {self.alpha.imag}i\n{int(((2 ** self.places) - 1) * self.number_of_deltas)} numbers have been plotted to {self.places} terms")

        self.fig.canvas.draw()

    def save_max_image(self):
        max_image_file_path = os.path.join('visualizations', self.number_direction, self.angle_folder, self.base_folder, 'figureMax.png')
        try:
            self.fig.savefig(max_image_file_path)
            print(f"Image saved as {max_image_file_path}")
        except Exception as e:
            print(f"Error saving image: {e}")

    def animate_construction(self):
        frames = []
        for p in range(self.places):
            # Summon the data
            x_data = self.x_data[:int(((2 ** p) - 1) * self.number_of_deltas)]
            y_data = self.y_data[:int(((2 ** p) - 1) * self.number_of_deltas)]
            colors = self.colors[:int(((2 ** p) - 1) * self.number_of_deltas)]
            
            # Update scatter plot with new data and color
            self.scatter.set_offsets(np.column_stack((x_data, y_data)))
            self.scatter.set_facecolor(colors)
            
            plt.title(f"{self.number_direction} revolving numbers of angle π/{self.angle_denominator} and base = {self.alpha.real} + {self.alpha.imag}i\n{int(((2 ** p) - 1) * self.number_of_deltas)} numbers have been plotted to {p} terms")

            # Redraw the canvas
            self.fig.canvas.draw()

            # Save the figure to a BytesIO object
            buf = io.BytesIO()
            self.fig.savefig(buf, format='png')
            buf.seek(0)
            frames.append(Image.open(buf))

        # Create a GIF from the images in memory
        animated_construction_file_path_writing = os.path.join(self.number_direction, self.angle_folder, self.base_folder, "animatedConstruction.gif")
        
        os.makedirs(os.path.dirname(animated_construction_file_path_writing), exist_ok=True)

        frames[0].save(animated_construction_file_path_writing, save_all=True, append_images=frames[1:], duration=500, loop=0)
        print(f"GIF saved as {animated_construction_file_path_writing}")

        # Close all frames to free memory
        for frame in frames:
            frame.close()

if __name__ == "__main__":
    creator = VisualizationCreator()
    creator.generate_max_images()
    creator.generate_animations()
    print("DONE :)")