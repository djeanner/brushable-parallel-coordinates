class ParallelCoordPlot {
	constructor(csvFilePath, containerSelector) {
    this.containerSelector = containerSelector;
    this.brushes = new Map(); // Initialize the brushes map here
    d3.csv(csvFilePath, d3.autoType).then((data) => {
        this.data = data;
        // Dynamically determine if each key is numerical or categorical
        this.keys = Object.keys(data[0]);
        this.keyTypes = {}; // Object to store the type of each key
        this.keys.forEach(key => {
            // Assume the key is numerical initially
            let isNumerical = true;
            for (let i = 0; i < data.length; i++) {
                // Check if value is not null and is not a number
                if (data[i][key] !== null && isNaN(Number(data[i][key]))) {
                    isNumerical = false;
                    break;
                }
            }
            this.keyTypes[key] = isNumerical ? 'numerical' : 'categorical';
        });
        this.margin = { top: 30, right: 10, bottom: 10, left: 0 };
        this.width = 960 - this.margin.left - this.margin.right;
        this.height = 500 - this.margin.top - this.margin.bottom;
        this.createDropdown();
        this.setColorAxis(this.keys[0]); // Initially set color axis to the first key
        this.init();
    });
}


  


	createDropdown() {
		const plot = this;
		const dropdown = d3
			.select(this.containerSelector)
			.append("select")
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
		this.color = d3.scaleSequential(
			[colorExtent[0], colorExtent[1]],
			d3.interpolateInferno
		);
		this.updateLineColors();
	}

	init() {
		// Clear any existing content
		d3.select(this.containerSelector).select("svg").remove();

		const svg = d3
			.select(this.containerSelector)
			.append("svg")
			.attr("width", this.width + this.margin.left + this.margin.right)
			.attr("height", this.height + this.margin.top + this.margin.bottom)
			.append("g")
			.attr("transform", `translate(${this.margin.left},${this.margin.top})`);

		this.x = d3
			.scalePoint()
			.range([0, this.width])
			.padding(1)
			.domain(this.keys);
		this.y = {};

		this.keys.forEach((key) => {
        if (this.keyTypes[key] === 'categorical') {
            const categories = Array.from(new Set(this.data.map(d => d[key])));
            this.y[key] = d3.scaleBand()
                            .domain(categories)
                            .range([this.height, 0])
                            .paddingInner(0.1);
        } else { // Numerical
            this.y[key] = d3.scaleLinear()
                            .domain(d3.extent(this.data, d => +d[key]))
                            .range([this.height, 0]);
        }
    });
		// Tooltip setup
		this.tooltip = d3
			.select(this.containerSelector)
			.append("div")
			.style("position", "absolute")
			.style("visibility", "hidden")
			.style("background-color", "white")
			.style("border", "solid")
			.style("border-width", "1px")
			.style("border-radius", "5px")
			.style("padding", "10px");

		this.drawLines(svg);
		this.setupAxes(svg);
	}

	drawLines(svg) {
    const plot = this;
    const line = d3.line()
        .defined(([key, value]) => !isNaN(value)) // Check if the value is a number
        .x(([key, value]) => plot.x(key)) // Use key to determine x position
        .y(([key, value]) => {
            // Ensure value is numeric before mapping to y position
            const numericValue = parseFloat(value);
            return !isNaN(numericValue) ? plot.y[key](numericValue) : null;
        })
        .curve(d3.curveCatmullRom.alpha(1)); // Smooth curve

    // Example: Log the SVG path string for the first data point
    const firstDataPoint = this.data[0];
    const firstDataPointKeyValues = this.keys.map(key => [key, firstDataPoint[key]]);
    console.log("SVG Path for first data point:", line(firstDataPointKeyValues));

    // Continue with drawing lines as before
    svg.selectAll("path")
        .data(this.data)
        .join("path")
        .attr("d", d => {
            const keyValuePairs = this.keys.map(key => [key, d[key]]);
            return line(keyValuePairs); // Generates the "d" attribute for path
        })
        .attr("fill", "none")
        .attr("stroke", d => this.color(d[this.colorAxis]))
        .attr("stroke-width", 1.5)
        .attr("opacity", 0.8)
			// Mouseover event to show tooltip
			.on("mouseover", function (event, d) {
				plot.tooltip.style("visibility", "visible").html(() => {
					let content = "";
					for (let key in d) {
						content += `<strong>${key}:</strong> ${d[key]}<br>`;
					}
					return content;
				});
			})
			// Mousemove event to position the tooltip
			.on("mousemove", function (event) {
				plot.tooltip
					.style("top", event.pageY - 10 + "px")
					.style("left", event.pageX + 10 + "px");
			})
			// Mouseout event to hide the tooltip
			.on("mouseout", function () {
				plot.tooltip.style("visibility", "hidden");
			});
	}

	setupAxes(svg) {
		const plot = this;
		// Correctly positioning the axes along the x-axis
		this.keys.forEach((key) => {
			const axis = svg
				.append("g")
				.attr("class", "axis")
				.attr("transform", `translate(${plot.x(key)},0)`) // Correctly position each axis
				.call(d3.axisLeft(plot.y[key])); // Assuming vertical axes

			axis
				.append("text")
				.style("text-anchor", "middle")
				.attr("y", -9)
				.text(key)
				.style("fill", "black");

			// Setting up brushes correctly
			const brush = d3
				.brushY() // Brush along the x-axis for parallel coordinates
				.extent([
					[plot.x(key) - 10, 0],
					[plot.x(key) + 10, plot.height],
				]) // Adjust extent
				.on("start brush end", (event) => plot.brushed(event, key));

			svg
				.append("g")
				.attr("class", "brush")
				.attr("transform", `translate(0,0)`) // Apply transformation if needed
				.call(brush);
		});
	}
	brushed(event, key) {
		if (event.selection) {
			// Convert pixel selection to data values if necessary
			const selection = event.selection.map(this.y[key].invert, this.y[key]);
			this.brushes.set(key, selection);
		} else {
			this.brushes.delete(key);
		}
		this.updateLines();
	}

	updateLines() {
		const svg = d3.select(this.containerSelector).select("svg");
		svg.selectAll("path").style("opacity", (d) => {
			// Assuming d is correctly populated for each path
			if (!d) {
				return 0.1; // Fallback opacity for missing data
			}

			// Check if the line is within all brushes' extents
			let isVisible = Array.from(this.brushes.entries()).every(
				([key, [min, max]]) => {
					const val = d[key];
					if (min > max) return val >= max && val <= min;
					else return val >= min && val <= max;
				}
			);

			return isVisible ? 0.8 : 0.03;
		});
	}

	updateLineColors() {
		const svg = d3.select(this.containerSelector).select("svg");
		// Ensure we only select paths that have data bound to them.
		const pathsWithData = svg.selectAll("path").data(this.data); // Re-bind the data to ensure alignment.

		pathsWithData
			.transition()
			.duration(200)
			.attr("stroke", (d) => this.color(d[this.colorAxis]));
	}
}
