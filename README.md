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

To view the example visualization, open the index.html file in a web browser. This file is located at the root of this repository and will render the Parallel Coordinates Plot using the sample data provided. For a live version, you might consider hosting index.html on a web server or using services like GitHub Pages to easily share your visualization online.

[Example](./demo.html)

[Example reading from server](./demoFromServer.html)

## Contributing

Feel free to fork the repository and submit pull requests with enhancements or fixes. If you encounter any issues or have suggestions for improvement, please open an issue.

git tag -a v0.0.2 -m "Release version 0.0.2"
  git push origin v0.0.2