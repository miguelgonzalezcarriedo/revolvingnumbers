import tkinter as tk
import os
import matplotlib.pyplot as plt
import numpy as np
from tkinter import filedialog
from PIL import Image, ImageTk, ImageSequence

class PlotShower:
    def __init__(self, root):
        self.root = root
        self.root.title("Playing with Revolving Numbers")
        
        # Initialize variables
        self.point_size = 0.5
        self.image = None
        self.is_there_a_max_term_limit = False
        self.max_term_limit = 0
        self.number_direction = 'contracting'
        self.denom = 2
        self.alpha = complex(1,1)
        self.window_boundary = 2
        
        # Data arrays
        self.x_data = []
        self.y_data = []
        self.colors = []
        
        # Previous values for change detection
        self.previous_point_size = 1
        self.previous_alpha = complex(1,1)
        self.previous_denom = 0
        self.previous_max_term_limit = 0
        
        # Initialize plot
        plt.ion()
        self.fig, self.ax = plt.subplots(figsize=(6, 6))
        self.scatter = self.ax.scatter([], [], s=self.point_size)
        plt.xlim(-2, 2)
        plt.ylim(-2, 2)
        
        self.setup_ui()
        self.start_polling()

    def setup_ui(self):
        # Frame for controls
        controls_frame = tk.Frame(self.root)
        controls_frame.pack(fill=tk.X, padx=10, pady=10)

        # Sliders
        self.base_real_slider = tk.Scale(controls_frame, from_=-1, to_=1, resolution=0.1, 
                                       orient=tk.HORIZONTAL, label="Real Base")
        self.base_real_slider.set(1)
        self.base_real_slider.pack(side=tk.LEFT, padx=5)

        self.base_imaginary_slider = tk.Scale(controls_frame, from_=-1, to_=1, resolution=0.1,
                                            orient=tk.VERTICAL, label="Imaginary Base")
        self.base_imaginary_slider.set(1)
        self.base_imaginary_slider.pack(side=tk.LEFT, padx=5)

        self.angle_slider = tk.Scale(controls_frame, from_=-20, to_=20, resolution=1,
                                   orient=tk.VERTICAL, label="Angle pi/")
        self.angle_slider.set(2)
        self.angle_slider.pack(side=tk.LEFT, padx=5)

        self.term_limit_slider = tk.Scale(controls_frame, from_=1, to_=20, resolution=1,
                                        orient=tk.VERTICAL, label="Max Terms")
        self.term_limit_slider.pack(side=tk.LEFT, padx=5)

        self.point_size_slider = tk.Scale(controls_frame, from_=-5, to_=5, resolution=1,
                                        orient=tk.VERTICAL, label="Point Size")
        self.point_size_slider.pack(side=tk.LEFT, padx=5)

        # Buttons
        tk.Button(controls_frame, text="Toggle Max Terms", 
                 command=self.flip_max).pack(side=tk.LEFT, padx=5)
        
        tk.Button(controls_frame, text="Expanding/Contracting", 
                 command=self.flip_number_direction).pack(side=tk.LEFT, padx=5)
        
        tk.Button(controls_frame, text="Animate Construction",
                 command=self.animate_construction).pack(side=tk.LEFT, padx=5)

        # Canvas
        self.canvas = tk.Canvas(self.root, bg='white')
        self.canvas.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

    def get_file_paths(self):
        """Setup file paths based on current parameters"""
        angle_folder = f"angle=piDividedBy{self.denom}"
        base_folder = f"alpha={self.alpha.real}+{self.alpha.imag}i"
        
        data_path = os.path.join(self.number_direction, angle_folder, base_folder)
        
        return {
            'data_file': os.path.join(data_path, 'coordinates.npz'),
            'coords_file': os.path.join(data_path, 'coordinates.txt'),
            'max_image': os.path.join(data_path, 'figureMax.png'),
            'limited_image': os.path.join(data_path, f'figure{self.max_term_limit}.png')
        }

    def load_data(self):
        """Load data from files"""
        paths = self.get_file_paths()
        if os.path.exists(paths['data_file']):
            data = np.load(paths['data_file'])
            self.x_data = data['x_data'].tolist()
            self.y_data = data['y_data'].tolist()
            self.colors = data['colors'].tolist()
            try:
                self.window_boundary = float(data['window_boundary'])
            except:
                self.window_boundary = 2
            return True
        return False

    def draw_plot(self):
        """Update the matplotlib plot"""
        plt.xlim(-self.window_boundary, self.window_boundary)
        plt.ylim(-self.window_boundary, self.window_boundary)
        
        self.scatter.set_offsets(np.column_stack((self.x_data, self.y_data)))
        self.scatter.set_facecolor(self.colors)
        
        plt.title(f"{self.number_direction} revolving numbers\nangle π/{self.denom} and base α = {self.alpha.real} + {self.alpha.imag}i")
        self.fig.canvas.draw()

    def load_image(self):
        """Load and display the appropriate image"""
        paths = self.get_file_paths()
        image_path = paths['limited_image'] if self.is_there_a_max_term_limit else paths['max_image']
        
        self.canvas.delete("all")
        if os.path.exists(image_path):
            try:
                self.image = Image.open(image_path)
                self.image = self.image.resize((self.canvas.winfo_width(), self.canvas.winfo_height()))
                self.tk_image = ImageTk.PhotoImage(self.image)
                self.canvas.create_image(0, 0, anchor=tk.NW, image=self.tk_image)
            except Exception as e:
                print(f"Error loading image: {e}")

    def flip_max(self):
        self.is_there_a_max_term_limit = not self.is_there_a_max_term_limit
        self.load_image()

    def flip_number_direction(self):
        self.number_direction = 'expanding' if self.number_direction == 'contracting' else 'contracting'
        self.load_data()
        self.load_image()

    def check_slider_changes(self):
        """Check for changes in slider values"""
        new_alpha = complex(self.base_real_slider.get(), self.base_imaginary_slider.get())
        new_denom = self.angle_slider.get()
        new_point_size = 10 ** self.point_size_slider.get()
        new_max_term_limit = self.term_limit_slider.get()
        
        if (new_alpha != self.alpha or 
            new_denom != self.denom or 
            new_point_size != self.point_size or 
            new_max_term_limit != self.max_term_limit):
            
            self.alpha = new_alpha
            self.denom = new_denom
            self.point_size = new_point_size
            self.max_term_limit = new_max_term_limit
            
            self.load_data()
            self.draw_plot()
            self.load_image()

    def start_polling(self):
        """Start checking for slider changes"""
        self.check_slider_changes()
        self.root.after(100, self.start_polling)

    def animate_construction(self):
        """Create animation from existing figure files"""
        paths = self.get_file_paths()
        base_path = os.path.dirname(paths['data_file'])
        
        # Collect all figure files
        figure_files = [f for f in os.listdir(base_path) if f.startswith('figure') and f.endswith('.png')]
        figure_files.sort(key=lambda x: int(''.join(filter(str.isdigit, x))) if any(c.isdigit() for c in x) else 0)
        
        if figure_files:
            # Create animation
            images = [Image.open(os.path.join(base_path, f)) for f in figure_files]
            animation_path = os.path.join(base_path, 'construction_animation.gif')
            images[0].save(animation_path, save_all=True, append_images=images[1:], duration=500, loop=0)
            print(f"Animation saved to {animation_path}")

if __name__ == "__main__":
    root = tk.Tk()
    app = PlotShower(root)
    root.mainloop() 