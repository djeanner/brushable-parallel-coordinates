class ParallelCoordPlot {
	constructor(csvFilePath, containerSelector) {
		this.containerSelector = containerSelector;
		d3.csv(csvFilePath).then((data) => {
			this.data = data;
			// Filter keys to exclude non-numeric and specific fields you don't want to visualize
			this.keys = Object.keys(data[0]).filter((d) => d !== "name");
			this.createDropdown();
			this.setColorAxis(this.keys[0]); // Initialize with the first key as the color axis
		});
	}

	createDropdown() {
		const plot = this;
		const dropdown = d3
			.select(this.containerSelector)
			.insert("select", ":first-child")
			.attr("class", "color-axis-selector")
			.on("change", function () {
				plot.setColorAxis(this.value);
			});

		dropdown
			.selectAll("option")
			.data(this.keys)
			.enter()
			.append("option")
			.text((d) => d)
			.attr("value", (d) => d);
	}
	setColorAxis(newAxis) {
		this.colorAxis = newAxis;
		const colorExtent = d3.extent(this.data, (d) => +d[newAxis]);
		this.color = d3.scaleSequential(d3.interpolateBrBG).domain(colorExtent);
		this.init(); // Redraw the plot with the new color axis
	}

	

	init() {
		const container = d3.select(this.containerSelector);
		container.select("svg").remove(); // Clear previous SVG
		this.svg = container
			.append("svg")
			.attr("viewBox", [0, 0, 928, this.keys.length * 120 + 20])
			.style("max-width", "100%")
			.style("height", "auto");

		const data = this.data;
		const containerSelector = this.containerSelector;
		// Ensure we clear any existing SVG before creating a new one
		d3.select(containerSelector).select("svg").remove();

		// Preliminary setup based on the data
		const keys = Object.keys(data[0]).filter(
			(d) => d !== "name" && d !== "year"
		);
		const keyz = "year"; // Assuming 'year' is used for coloring

		// Adjust each non-categorical and non-'year' data field as needed
		data.forEach((d) => {
			keys.forEach((key) => {
				d[key] = d[key] === "" ? null : +d[key];
			});
		});

		// Initialize SVG container
		const svg = d3
			.select(containerSelector)
			.append("svg")
			.attr("viewBox", [0, 0, width, height])
			.attr("width", width)
			.attr("height", height)
			.style("max-width", "100%")
			.style("height", "auto");

		const tooltip = d3
			.select("body")
			.append("div")
			.style("position", "absolute")
			.style("background-color", "white")
			.style("padding", "5px")
			.style("border", "1px solid #000")
			.style("border-radius", "5px")
			.style("opacity", 0)
			.style("pointer-events", "none");
		// Line generator
		const line = d3
			.line()
			.defined(([, value]) => value != null)
			.x(([key, value]) => x.get(key)(value))
			.y(([key]) => y(key))
			.curve(d3.curveCatmullRom.alpha(0.0)); // Adjust alpha for different smoothing

		// Draw lines
		// Apply mouse events for the paths, ensuring tooltip functionality

		const selections = new Map();

		// Updates the opacity of each path based on whether it falls within the selections on all brushed axes
		const updatePaths = () => {
			svg.selectAll("path").style("stroke-opacity", (d) => {
				// Check every selection to see if the current data point falls within the selected range
				for (let [key, [min, max]] of selections) {
					const scale = x.get(key); // Get the scale function for the current dimension
					// If the data point is outside the selection for any dimension, dim the line
					if (scale(d[key]) < scale(min) || scale(d[key]) > scale(max)) {
						return 0.1; // Data point does not fall within the brush region
					}
				}
				return 1; // Data point falls within all brush regions
			});
		};

		// Draw axes and add brush to each
		svg
			.selectAll(".axis")
			.data(keys)
			.enter()
			.append("g")
			.attr("class", "axis")
			.attr("transform", (d) => `translate(0,${y(d)})`)
			.each(function (key) {
				const axis = d3.axisBottom(x.get(key)).ticks(6);
				d3.select(this).call(axis);

				const brush = d3
					.brushX()
					.extent([
						[marginLeft, y(key) - 10],
						[width - marginRight, y(key) + 10],
					])
					.on("start brush end", (event) => brushed(event, key));

				// Append the brush to the axis
				svg
					.append("g")
					.attr("class", "brush")
					.attr("transform", `translate(0,${y(key)})`)
					.call(brush);
			});

		const brushed = (event, key) => {
			if (event.selection) {
				const [start, end] = event.selection.map(x.get(key).invert);
				selections.set(key, [start, end]);
			} else {
				selections.delete(key);
			}
			updatePaths(); // Call to update the paths based on the new brush selection
		};

		//
		this.drawLines(); // Ensure this method draws lines based on the current state
	}

	drawLines(svg) {
		const lineGenerator = d3
			.line()
			.defined(([, value]) => value != null)
			.x(([key, value]) => this.x.get(key)(value))
			.y(([key]) => this.y(key))
			.curve(d3.curveCatmullRom.alpha(0.5)); // Adjust for smoothing

		svg
			.selectAll("path")
			.data(this.data)
			.join("path")
			.attr("d", (d) =>
				lineGenerator(d3.cross(this.keys, [d], (key, d) => [key, d[key]]))
			)
			.attr("stroke", (d) => this.color(+d[this.colorAxis]))
			.attr("fill", "none")
			.attr("stroke-width", 1.5)
			.attr("stroke-opacity", 0.7);
	}

	setupAxes(svg) {
		const width = 928;
		const height = this.keys.length * 120 + 20; // Height adjusted for margin
		const marginTop = 20;
		const marginRight = 50;
		const marginBottom = 20;
		const marginLeft = 110;

		// Setup the x scale for each axis
		this.x = new Map(
			this.keys.map((key) => [
				key,
				d3
					.scaleLinear()
					.domain(d3.extent(this.data, (d) => +d[key]))
					.range([marginLeft, width - marginRight]),
			])
		);

		// Setup the y scale for placing each axis
		this.y = d3
			.scalePoint()
			.domain(this.keys)
			.range([marginTop, height - marginBottom]);

		// Draw each axis and its brush
		this.keys.forEach((key, index) => {
			const axis = svg
				.append("g")
				.attr("transform", `translate(0,${this.y(key)})`)
				.attr("class", "axis");

			// Draw the axis
			axis.call(d3.axisBottom(this.x.get(key)));

			// Add axis label
			axis
				.append("text")
				.attr("class", "axis-label")
				.attr("transform", `translate(${width - marginRight}, 0)`)
				.attr("fill", "currentColor")
				.attr("text-anchor", "end")
				.attr("dy", "-0.5em")
				.text(key);

			// Setup brush for this axis (if needed)
			const brush = d3
				.brushX()
				.extent([
					[marginLeft, -8],
					[width - marginRight, 8],
				])
				.on("start brush end", (event) => this.brushed(event, key));

			axis.append("g").attr("class", "brush").call(brush);
		});
	}
}
