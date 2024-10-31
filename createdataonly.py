import math
import os
import numpy as np


class FractalSimulator:
    def __init__(self):
        self.number_direction = 'contracting'
        self.denom = 2
        self.number_of_deltas = 0
        self.possible_deltas = []
        self.alpha = complex(1,1)
        self.coords_file_path = ''
        self.data_file_path = ''
        self.n = 0
        self.largest_known_n = 0
        self.angle_folder = ''
        self.base_folder = ''
        self.places = 0
        self.subsequent_places = 0
        self.window_boundary = 0
        self.current_places = 1


        # Define colors for different possible deltas
        self.color_possibilities = [
            'blue', 'red', 'green', 'orange', 'black', 'purple', 'cyan', 'magenta', 'yellow', 'brown',
            'lime', 'teal', 'pink', 'lavender', 'maroon', 'olive', 'navy', 'aquamarine', 'gold', 'coral']
        
        self.x_data = []
        self.y_data = []
        self.colors = []

        

    def clear_points(self):
        self.window_boundary = 0
        
        self.x_data = []
        self.y_data = []
        self.colors = []
        self.n = 0
        self.places = 0
        self.subsequent_places = 0

    def navigate_and_extract(self):
        self.angle_folder = f"angle=piDividedBy{self.denom}"
        self.base_folder = f"alpha={self.alpha.real}+{self.alpha.imag}i"

        os.makedirs(os.path.join(self.number_direction, self.angle_folder, self.base_folder), exist_ok=True)

        self.data_file_path = os.path.join(self.number_direction, self.angle_folder, self.base_folder, 'coordinates.npz')
        self.coords_file_path = os.path.join(self.number_direction, self.angle_folder, self.base_folder, 'coordinates.txt')


        # Create the file if it doesn't exist and write headers
        if not os.path.exists(self.coords_file_path):
            try:
                with open(self.coords_file_path, 'w') as file:
                    file.write("n, binary, revolving, gaussian, color\n")
            except Exception as e:
                print(f"Error creating coordinates.txt: {e}")

        # Check if the data file exists
        if os.path.exists(self.data_file_path):
            try:
                data = np.load(self.data_file_path)
                self.x_data = data['x_data'].tolist()
                self.y_data = data['y_data'].tolist()
                self.colors = data['colors'].tolist()
                self.n = int(data['n'])
                self.places = math.floor(math.log2(self.n))+1
                self.subsequent_places = math.floor(math.log2(self.n + 1))+1
                self.window_boundary = float(data['window_boundary'])
            except Exception as e:
                print(f"theres no data: {e}")
            
        else:
            # If the file does not exist
            print(f"no data file exists")
            self.x_data = []
            self.y_data = []
            self.colors = []
            self.n = 0
            self.places = 0
            self.subsequent_places = 0
            self.window_boundary = 0
            
            
    def list_possible_deltas(self):
        self.number_of_deltas = int(2 * abs(self.denom))    # Number of deltas (p) is the amount of times it takes for the angle given to make one full revolution around unit circle
        self.possible_deltas = []
        for k in range(self.number_of_deltas):
            theta = k * math.pi / self.denom # Angle of rotation
            complex_number = math.e ** (1j * theta) # Use Euler's formula to get the value of the point on the unit circle in the complex plane
            rounded_number = complex(round(complex_number.real, 5), round(complex_number.imag, 5))
            self.possible_deltas.append(rounded_number)  #Add the newly found angle value delta to the list
        print(f"angle pi/{self.denom} -> {self.possible_deltas}")
        

    def generate_next_number(self):
        self.n += 1
        
        MIN_ALPHA = 1e-30
        if abs(self.alpha) < MIN_ALPHA:
            self.alpha = complex(MIN_ALPHA, MIN_ALPHA)

        #print(f"n = {self.n}")

        ####n to binary
            
            
            
        # write an explicit expression f from int to int where f(n) = (1 if n is in [0,1]), (2 if n is in [2,3]), (3 if n is in [4,7]), (4 if n is in [8,15])...#
        self.places = math.floor(math.log2(self.n))+1
        self.subsequent_places = math.floor(math.log2(self.n + 1))+1

        #print(f"{self.places} places")  
            
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
        #print(binary)
            
            
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

            #print(revolving)
            
            color = self.color_possibilities[starting_index % len(self.color_possibilities)]
            
            ####revolving to gaussian
            
            if self.number_direction == 'contracting':
                gaussian = sum(delta * ((self.alpha) ** (-1 * (k + 1))) for k, delta in enumerate(revolving))
            elif self.number_direction == 'expanding':
                gaussian = sum(delta * ((self.alpha) ** (len(revolving) - 1 - k)) for k, delta in enumerate(revolving))

            else:
                print("PANIC PANIC 'NUMBER_DIRECTION' IS NOT A VALID STRING IN REVOLVING-TO-GAUSSIAN-")

            #print(gaussian)
            
            
            ####gaussian to coordinate
            
            coordinate = (gaussian.real,gaussian.imag)
            
            #####plot new coordinate

            #check for new farthest points
            if abs(gaussian.real) >= self.window_boundary:
                self.window_boundary = abs(gaussian.real)
            if abs(gaussian.imag) >= self.window_boundary:
                self.window_boundary = abs(gaussian.imag)

            
            # Write to the files
            try:
                with open(self.coords_file_path, 'a') as file:
                    file.write(f"{self.n}, {binary}, {revolving}, {gaussian}, {color}\n")
            except Exception as e:
                print(f"Error writing to {self.coords_file_path}: {e}")
            
            self.x_data.append(coordinate[0])
            self.y_data.append(coordinate[1])
            self.colors.append(color)
            
        np.savez(self.data_file_path, x_data=self.x_data, y_data=self.y_data, colors=self.colors, n=self.n, window_boundary = self.window_boundary)
            
            
            
    def generate_all_data(self):
        self.current_places = 1
        while True:
            for self.denom in np.arange(-5, 6, 1):  # increment integer angle from -5 to 5 skipping zero
                self.list_possible_deltas()
                for direction in ["expanding", "contracting"]:
                    self.number_direction = direction
                    # Use numpy's arange for floating point steps
                    for x in np.arange(-1.0, 1.1, 0.1).round(1):  # round to 1 decimal place
                        for y in np.arange(-1.0, 1.1, 0.1).round(1):
                            self.clear_points()  # Clear existing points
                            self.alpha = complex(x, y)
                            self.navigate_and_extract()

                            while self.places < self.current_places:
                                # Generate numbers until we reach the next place value
                                while True:
                                    self.generate_next_number()
                                    if self.subsequent_places > self.places:
                                        print(f"for {self.number_direction} direction, angle pi/{self.denom}, base {self.alpha.real} + {self.alpha.imag}i, {self.n} is the last number with {self.places} terms")
                                        break

            self.current_places += 1

if __name__ == "__main__":
    simulator = FractalSimulator()
    simulator.generate_all_data()
