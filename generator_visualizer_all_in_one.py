import math
import tkinter as tk
import os
import matplotlib.pyplot as plt
import numpy as np
from tkinter import filedialog
from PIL import Image, ImageTk, ImageDraw, ImageSequence



class PlotShower:
    def __init__(self, root):
        self.root = root
        
        self.root.title("Playing with Revolving Numbers")
        
        
        self.point_size = 0.5
        
        
        
        self.image = None
        self.number_direction = 'contracting'
        self.angle_denominator = 2
        self.number_of_deltas = 0
        self.possible_deltas = []
        self.alpha = complex(1,1)
        self.limited_image_file_path_reading = ''
        self.limited_image_file_path_writing = ''
        self.max_image_file_path = ''
        self.data_file_path = ''
        self.n = 0
        self.largest_known_n = 0
        self.angle_folder = ''
        self.base_folder = ''
        self.places = 0
        self.subsequent_places = 0
        self.window_boundary = 0
        self.window_boundaries = []

        
        # Define colors for different possible deltas
        self.color_possibilities = [
            'blue', 'red', 'green', 'orange', 'black', 'purple', 'cyan', 'magenta', 'yellow', 'brown',
            'lime', 'teal', 'pink', 'lavender', 'maroon', 'olive', 'navy', 'aquamarine', 'gold', 'coral']
        
        self.x_data = []
        self.y_data = []
        self.colors = []

        # Store last known values for sliders
        self.previous_point_size = 1
        self.previous_alpha = complex(1,1)
        self.previous_denom = 0
        self.previous_max_term_limit = 0
        self.is_there_a_max_term_limit = False
        self.max_term_limit = 0
        
        
        
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
        self.base_real_slider.set(1)  # Set default to 1
        self.base_real_slider.pack(side=tk.LEFT, padx=5)

        self.base_imaginary_slider = tk.Scale(controls_frame, from_=-1, to_=1, resolution=0.05, orient=tk.VERTICAL, label="Imaginary Base", bg=self.root.cget('bg'), highlightthickness=0)
        self.base_imaginary_slider.set(1)  # Set default to 1
        self.base_imaginary_slider.pack(side=tk.LEFT, padx=5)

        self.angle_slider = tk.Scale(controls_frame, from_=-20, to_=20, resolution=1, orient=tk.VERTICAL, label="Angle pi/", bg=self.root.cget('bg'), highlightthickness=0)
        self.angle_slider.set(2)  # Set default to 2
        self.angle_slider.pack(side=tk.LEFT, padx=5)

        self.term_limit_slider = tk.Scale(controls_frame, from_=1, to_=20, resolution=1, orient=tk.VERTICAL, label="Max Terms in Number", bg=self.root.cget('bg'), highlightthickness=0)
        self.term_limit_slider.pack(side=tk.LEFT, padx=5)
        
        self.point_size_slider = tk.Scale(controls_frame, from_=-5, to_=5, resolution=1, orient=tk.VERTICAL, label="Point Size", bg=self.root.cget('bg'), highlightthickness=0)
        self.point_size_slider.set(0)  # Set default to 1
        self.point_size_slider.pack(side=tk.LEFT, padx=5)
        
        
        # Max Terms Button
        max_term_limit_button = tk.Button(controls_frame, text="IndividualGeneration/BroadImaging", command=self.flip_max)
        max_term_limit_button.pack(side=tk.LEFT, padx=5)
        
        # Number Direction Button
        number_direction_button = tk.Button(controls_frame, text="Expanding/Contracting", command=self.flip_number_direction)
        number_direction_button.pack(side=tk.LEFT, padx=5)
        
        # Construct Button
        construct_button = tk.Button(controls_frame, text="Animate Construction", command=self.animate_construction)
        construct_button.pack(side=tk.LEFT, padx=5)      

        # Canvas
        self.canvas = tk.Canvas(self.root, bg='white')
        self.canvas.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        
    def animate_construction(self):
        frames = []
        for p in range(self.places):
            # Summon the data

            # Check if the data file exists
            if os.path.exists(self.data_file_path):
                data = np.load(self.data_file_path)
                x_data = data['x_data'].tolist()[:int(((2 ** p) - 1) * self.number_of_deltas)]
                y_data = data['y_data'].tolist()[:int(((2 ** p) - 1) * self.number_of_deltas)]
                colors = data['colors'].tolist()[:int(((2 ** p) - 1) * self.number_of_deltas)]
            else:
                # If the file does not exist
                print(f"ERROR2356432 No data file exists")
            
            # Save temporary figure as PNG
            temporary_image_file_path_writing = os.path.join('visualizations', self.number_direction, self.angle_folder, self.base_folder, f"temporaryfigure{p}.png")
            plt.xlim(-self.window_boundary, self.window_boundary)  # Set limits as needed
            plt.ylim(-self.window_boundary, self.window_boundary)  # Set limits as needed   

            # Update scatter plot with new data and color
            self.scatter.set_offsets(np.column_stack((x_data, y_data)))
            self.scatter.set_facecolor(colors)
            
            plt.title(f"{self.number_direction} revolving numbers of angle π/{self.angle_denominator} and base = {self.alpha.real} + {self.alpha.imag}i\n{int(((2 ** p) - 1) * self.number_of_deltas)} numbers have been plotted to {p} terms")

               
            # Redraw the canvas
            self.fig.canvas.draw() 

            
            try:
                self.fig.savefig(temporary_image_file_path_writing)
                print(f"Image saved as {temporary_image_file_path_writing}")
            except Exception as e:
                print(f"Error saving temporary image: {e}")
                    
            frames.append(temporary_image_file_path_writing)

        # Open images and create a GIF
        animated_construction_file_path_writing = os.path.join('visualizations', self.number_direction, self.angle_folder, self.base_folder, f"{self.number_direction}_animated_construction_of_(piDividedBy{self.angle_denominator})_and_{self.alpha.real}+{self.alpha.imag}i).gif")
        
        os.makedirs(os.path.dirname(animated_construction_file_path_writing), exist_ok=True)

        images = [Image.open(frame) for frame in frames]
        images[0].save(animated_construction_file_path_writing, save_all=True, append_images=images[1:], duration=500, loop=0)
        print(f"GIF saved as {animated_construction_file_path_writing}")
        
        # After creating the GIF, clean up temporary files
        for frame in frames:
            try:
                os.remove(frame)
                print(f"Removed temporary file: {frame}")
            except Exception as e:
                print(f"Error removing temporary file {frame}: {e}")

        # Cover tracks
        self.clear_points()
        self.navigate_and_extract()
        self.load_image()
        self.list_possible_deltas()
        self.generate_next_number()
        
        
    def flip_max(self):
        if self.is_there_a_max_term_limit:
            self.is_there_a_max_term_limit = False
        else:
            self.is_there_a_max_term_limit = True
            
        self.clear_points()  # Clear existing points
        
        self.navigate_and_extract()
        self.load_image()
        self.list_possible_deltas()
        self.generate_next_number()
        
    def flip_number_direction(self):
        if self.number_direction == 'expanding':
            self.number_direction = 'contracting'
        elif self.number_direction == 'contracting':
            self.number_direction = 'expanding'
        else:
            print("ERROR ERROR NUMBER DIRECTION IS NOT EITHER STRING")
        
        self.clear_points()  # Clear existing points
            
        self.navigate_and_extract()
        self.load_image()
        self.list_possible_deltas()
        self.generate_next_number()


    def start_polling(self):
        """Start a loop to check for slider changes."""
        self.check_slider_changes()
        self.root.after(100, self.start_polling)  # Check every 100 ms

    def check_slider_changes(self):        
        """Check if slider values have changed and call appropriate functions."""
        self.max_term_limit = self.term_limit_slider.get()
        
        self.alpha = complex(self.base_real_slider.get(), self.base_imaginary_slider.get())
        self.angle_denominator = self.angle_slider.get()
        self.point_size = 10 ** self.point_size_slider.get()
        if self.angle_denominator == 0:
            self.angle_denominator = .5

        if (self.previous_alpha != self.alpha or self.angle_denominator != self.previous_denom or self.max_term_limit != self.previous_max_term_limit or self.previous_point_size != self.point_size):
            self.previous_alpha = self.alpha
            self.previous_denom = self.angle_denominator
            self.previous_max_term_limit = self.max_term_limit
            self.previous_point_size = self.point_size
            print("A Slider has been changed")
            
            self.clear_points()  # Clear existing points
            
            self.navigate_and_extract()
            self.load_image()
            self.list_possible_deltas()
            self.generate_next_number()
        else:
            self.generate_next_number()

    def clear_points(self):
        # Re-initialize the scatter plot
        self.scatter.remove()  # Remove the current scatter plot
        self.scatter = self.ax.scatter([], [], s = self.point_size)  # Create a new empty scatter plot
        self.fig.canvas.draw()  # Redraw the canvas
        
        self.window_boundary = 0
        
        self.x_data = []
        self.y_data = []
        self.colors = []
        self.n = 0
        self.possible_deltas = []
        self.places = 0


    def load_image(self):
        """Load and display the image on the canvas."""
        self.canvas.delete("all")  # Clear the canvas before loading a new image
        if self.max_image_file_path or self.limited_image_file_path_reading:
            if self.is_there_a_max_term_limit:
                try:
                    self.image = Image.open(self.limited_image_file_path_reading)
                    # Convert the image to a format compatible with Tkinter
                    self.image = self.image.resize((self.canvas.winfo_width(), self.canvas.winfo_height()), Image.LANCZOS)
                    self.tk_image = ImageTk.PhotoImage(self.image)  # Create a PhotoImage instance
                    # Display the image on the canvas
                    self.canvas.create_image(0, 0, anchor=tk.NW, image=self.tk_image)
                    self.canvas.image = self.tk_image  # Keep a reference to avoid garbage collection
                except Exception as e:
                    print(f"Error loading image: {e}")
            else:
                try:
                    self.image = Image.open(self.max_image_file_path)
                    # Convert the image to a format compatible with Tkinter
                    if self.canvas.winfo_width() < self.canvas.winfo_height():
                        self.image = self.image.resize((self.canvas.winfo_width(), self.canvas.winfo_width()), Image.LANCZOS)
                    else:
                        self.image = self.image.resize((self.canvas.winfo_height(), self.canvas.winfo_height()), Image.LANCZOS)
                    self.tk_image = ImageTk.PhotoImage(self.image)  # Create a PhotoImage instance
                    # Display the image on the canvas
                    self.canvas.create_image(0, 0, anchor=tk.NW, image=self.tk_image)
                    self.canvas.image = self.tk_image  # Keep a reference to avoid garbage collection
                except Exception as e:
                    print(f"Error loading image: {e}")


    def navigate_and_extract(self):
        self.angle_folder = f"angle=piDividedBy{self.angle_denominator}"
        self.base_folder = f"alpha={self.alpha.real}+{self.alpha.imag}i"
 
        os.makedirs(os.path.join('visualizations', self.number_direction, self.angle_folder, self.base_folder), exist_ok=True)
        os.makedirs(os.path.join('data', self.number_direction, self.angle_folder, self.base_folder), exist_ok=True)

        self.limited_image_file_path_reading = os.path.join('visualizations', self.number_direction, self.angle_folder, self.base_folder, f"figure{self.max_term_limit}.png")
        self.max_image_file_path = os.path.join('visualizations', self.number_direction, self.angle_folder, self.base_folder, 'figureMax.png')
        self.data_file_path = os.path.join('data', self.number_direction, self.angle_folder, self.base_folder, 'coordinates.npz')


        # Check if the data file exists
        if os.path.exists(self.data_file_path):
            data = np.load(self.data_file_path)
            self.x_data = data['x_data'].tolist()
            self.y_data = data['y_data'].tolist()
            self.colors = data['colors'].tolist()
            self.n = int(data['n'])
            try:
                self.window_boundary = float(data['window_boundary'])
            except Exception as e:
                print(f"theres no window boundary data: {e}")
                
        else:
            # If the file does not exist
            print(f"no data file exists")
            self.x_data = []
            self.y_data = []
            self.colors = []
            self.n = 0
            self.window_boundary = 0
            


    def draw_point(self):
        plt.xlim(-self.window_boundary, self.window_boundary)  # Set limits as needed
        plt.ylim(-self.window_boundary, self.window_boundary)  # Set limits as needed   

        # Update scatter plot with new data and color
        self.scatter.set_offsets(np.column_stack((self.x_data, self.y_data)))
        self.scatter.set_facecolor(self.colors)
        
        plt.title(f"{self.number_direction} revolving numbers of angle π/{self.angle_denominator} and base = {self.alpha.real} + {self.alpha.imag}i\n{self.alpha.imag}i\n{int(((2 ** self.places) - 1) * self.number_of_deltas)} numbers have been plotted to {self.places} terms")

           
        # Redraw the canvas
        self.fig.canvas.draw()

        
    def save_max_image(self):
        """Save the current plot as an image file."""
        try:
            # Define the image filename based on the current value of n
            self.fig.savefig(self.max_image_file_path)
            print(f"Image saved as {self.max_image_file_path}")
        except Exception as e:
            print(f"Error saving image: {e}")
            
            
            
    def save_limited_image(self):
        """Save the current plot as an image file."""
        self.limited_image_file_path_writing = os.path.join("visualizations", self.number_direction, self.angle_folder, self.base_folder, f"figure{self.places}.png")

        
        try:
            # Define the image filename based on the current value of n
            self.fig.savefig(self.limited_image_file_path_writing)
            print(f"Image saved as {self.limited_image_file_path_writing}")
        except Exception as e:
            print(f"Error saving image: {e}")
            
            
    def list_possible_deltas(self):
        self.number_of_deltas = int(2 * abs(self.angle_denominator))    # Number of deltas (p) is the amount of times it takes for the angle given to make one full revolution around unit circle
        self.possible_deltas = []
        for k in range(self.number_of_deltas):
            theta = k * math.pi / self.angle_denominator # Angle of rotation
            complex_number = math.e ** (1j * theta) # Use Euler's formula to get the value of the point on the unit circle in the complex plane
            rounded_number = complex(round(complex_number.real, 5), round(complex_number.imag, 5))
            self.possible_deltas.append(rounded_number)  #Add the newly found angle value delta to the list
        print(self.possible_deltas)
        
    

    def generate_next_number(self):
        self.n += 1
        
        #the computer does not like it when alpha = 0 ... since then the gauss is infinity, so
        MIN_ALPHA = 1e-30
        if abs(self.alpha) < MIN_ALPHA:
            self.alpha = complex(MIN_ALPHA, MIN_ALPHA)

        print(f"n = {self.n}")

        ####n to binary
            
            
            
        # write an explicit expression f from int to int where f(n) = (1 if n is in [0,1]), (2 if n is in [2,3]), (3 if n is in [4,7]), (4 if n is in [8,15])...#
        self.places = math.floor(math.log2(self.n))+1
        self.subsequent_places = math.floor(math.log2(self.n + 1))+1

        print(f"{self.places} places")  
            
        binary = []
        
        if self.number_direction == 'contracting':
            for i in range(1, self.places + 1):
                #print(i)
                binary.append(math.floor(self.n % (2 ** i)/(2 ** (i-1))))
        elif self.number_direction == 'expanding':
            for i in range(1, self.places + 1):
                #print(i)
                binary.insert(0, math.floor(self.n % (2 ** i)/(2 ** (i-1))))
        else:
            print("PANIC PANIC 'NUMBER_DIRECTION' IS NOT A VALID STRING IN N-TO-BINARY")
        print(binary)
            
            
        ####binary to revolving
            
        for starting_index in range(len(self.possible_deltas)):
            revolving = binary[:]
            
            first_value = True
            first_value_index = 0 
                
            x = starting_index
            #print(f"starting index = {x}")
            for i in range(len(binary)):
                if binary[i] == 1:
                    revolving[i] = self.possible_deltas[x]  # Replace '1' with the next value in possible_deltas
                    #print(f"current delta = {self.possible_deltas[x]}")
                    #print(f"current rev = {revolving}")

                    x = (x + 1) % len(self.possible_deltas)  # Increment index and wrap around if needed
                    #print(f"next delta = {self.possible_deltas[x]}")
                        
                    #to get the color of the branch the index of first value is stored
                    if first_value:
                        first_value_index = i
                        first_value = False

            print(revolving)
            
            color = self.color_possibilities[starting_index % len(self.color_possibilities)]
            
            ####revolving to gaussian
            
            if self.number_direction == 'contracting':
                gaussian = sum(delta * ((self.alpha) ** (-1 * (k + 1))) for k, delta in enumerate(revolving))
            elif self.number_direction == 'expanding':
                gaussian = sum(delta * ((self.alpha) ** (len(revolving) - 1 - k)) for k, delta in enumerate(revolving))

            else:
                print("PANIC PANIC 'NUMBER_DIRECTION' IS NOT A VALID STRING IN REVOLVING-TO-GAUSSIAN-")

            print(gaussian)
            
            
            ####gaussian to coordinate
            
            coordinate = (gaussian.real,gaussian.imag)
            
            #####plot new coordinate

            #check for new farthest points
            if abs(gaussian.real) >= self.window_boundary:
                self.window_boundary = abs(gaussian.real)
            if abs(gaussian.imag) >= self.window_boundary:
                self.window_boundary = abs(gaussian.imag)
            
            # Write to the file
            self.x_data.append(coordinate[0])
            self.y_data.append(coordinate[1])
            self.colors.append(color)
            
        np.savez(self.data_file_path, x_data=self.x_data, y_data=self.y_data, colors=self.colors, n=self.n, window_boundary = self.window_boundary)
            
        self.draw_point()
            
        if self.subsequent_places > self.places:
            self.save_limited_image()
            self.animate_construction()
            self.save_max_image()
        else:
            self.save_max_image()
                
        if self.is_there_a_max_term_limit is False:
            self.load_image()
  
            
if __name__ == "__main__":
    root = tk.Tk()
    app = PlotShower(root)
    root.mainloop()