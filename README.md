# Parallel Coordinates Plot
## Overview

This repository contains the code for creating a Parallel Coordinates Plot using D3.js. It is designed to visualize multidimensional data, allowing users to explore patterns and correlations between different variables. The visualization is implemented in HTML and JavaScript, leveraging D3.js for dynamic data binding and interactive capabilities.
## Contents

index.html: The main HTML file that hosts the visualization. It includes references to the D3.js library and custom styles for the visualization layout.
src/ParallelCoordPlot.js: The JavaScript class that defines the Parallel Coordinates Plot. It handles data loading, SVG creation, axes setup, and interactivity such as brushing for filtering.
files/data.csv: Sample CSV data file used to populate the visualization. You can replace this file with your own data.

## Features

Dynamic Data Loading: Automatically loads and parses CSV data.
Interactive Axes: Users can select which data dimension to color the lines by using a dropdown menu.
Brushing and Filtering: Interactively filter data by dragging along the axes.
Customizable Styling: Easy to customize dimensions, margins, and styles.

## Setup and Usage

Clone the repository to your local machine.
Replace files/data.csv with your own data file, if desired.
Open index.html in a modern web browser to view the visualization.

Make sure your CSV file follows the format expected by the script, with column headers matching the data dimensions you wish to visualize.

## Visualization Example

To view the [example](./demo.html) visualization, open the index.html file in a web browser. This file is located at the root of this repository and will render the Parallel Coordinates Plot using the sample data provided. For a live version, you might consider hosting index.html on a web server or using services like GitHub Pages to easily share your visualization online.

We use the jsdelivr.net CDN (Content Delivery Network) service for this [Example](./demoFromServer.html).

```zsh
git tag -a v0.1.0 -m "Release version 0.1.0"
git push origin v0.1.0
```

## Usage

Example of implementation with data stored in a file:

```html
<body>
    <div id="plot1" class="plot-container"></div>
    <script src="https://cdn.jsdelivr.net/gh/djeanner/brushable-parallel-coordinates@latest/src/ParallelCoordPlot.js"></script>
    <script>
        document.addEventListener("DOMContentLoaded", function () {
            const plot1 = new ParallelCoordPlot("#plot1", { csvPath: "./files/data.csv" });
        })
    </script>
</body>
```

Example of implementation with in-line data:

```html
<body>
    <div id="plot2" class="plot-container"></div>
    <script src="https://cdn.jsdelivr.net/gh/djeanner/brushable-parallel-coordinates@latest/src/ParallelCoordPlot.js"></script>
    <script>
        document.addEventListener("DOMContentLoaded", function () {
            const plot2 = new ParallelCoordPlot("#plot2", {},
                [
                    { "name": "AMC Ambassador Brougham", "economy (mpg)": 13, "cylinders": 8, "displacement (cc)": 360, "power (hp)": 175, "weight (lb)": 3821, "0-60 mph (s)": 11, "year": 73 },
                    { "name": "AMC Ambassador DPL", "economy (mpg)": 15, "cylinders": 8, "displacement (cc)": 390, "power (hp)": 190, "weight (lb)": 3850, "0-60 mph (s)": 8.5, "year": 70 },
                    { "name": "AMC Ambassador DPL 3", "economy (mpg)": 15.4, "cylinders": 4, "displacement (cc)": 330, "power (hp)": 110, "weight (lb)": 3550, "0-60 mph (s)": 8.5, "year": 72 }
                ]
            );
        })
    </script>
</body>
```

## Contributing

Feel free to fork the repository and submit pull requests with enhancements or fixes. If you encounter any issues or have suggestions for improvement, please open an issue.

