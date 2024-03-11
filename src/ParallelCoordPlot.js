class ParallelCoordPlot {
	constructor(csvFilePath) {
		d3.csv(csvFilePath).then((data) => this.init(data));
	}

	init(data) {
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

		// Setup dimensions and scales
		const width = 928;
		const height = keys.length * 120 + 20; // Height adjusted for margin
		const marginTop = 20;
		const marginRight = 50;
		const marginBottom = 20;
		const marginLeft = 110;

		const x = new Map(
			keys.map((key) => [
				key,
				d3.scaleLinear(
					d3.extent(data, (d) => d[key]),
					[marginLeft, width - marginRight]
				),
			])
		);
		const y = d3
			.scalePoint()
			.domain(keys)
			.range([marginTop, height - marginBottom]);
		const color = d3.scaleSequential(
			d3.extent(data, (d) => d[keyz]),
			d3.interpolateBrBG
		);

		// Initialize SVG container

		const svg = d3
			.select("body")
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
		svg
			.append("g")
			.selectAll("path")
			.data(data)
			.enter()
			.append("path")
			.attr("d", (d) => line(d3.cross(keys, [d], (key, d) => [key, d[key]])))
			.attr("stroke", (d) => color(d[keyz]))
			.attr("fill", "none")
			.attr("stroke-width", 1.5)
			.attr("stroke-opacity", 0.4)
			.on("mouseover", function (event, d) {
				d3.select(this).attr("stroke-width", 3);
				tooltip.transition().duration(200).style("opacity", 0.9);
				tooltip
					.html(
						`Year: ${d.year}<br/>` +
							keys.map((key) => `${key}: ${d[key]}`).join("<br/>")
					)
					.style("left", event.pageX + "px")
					.style("top", event.pageY - 28 + "px");
			})
			.on("mouseout", function () {
				d3.select(this).attr("stroke-width", 1.5);
				tooltip.transition().duration(500).style("opacity", 0);
			});




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
		keys.forEach((key) => {
			const axis = svg
				.append("g")
				.attr("class", "axis")
				.attr("transform", `translate(0,${y(key)})`);

			axis.call(d3.axisBottom(x.get(key))); // Draw the axis

 // Append labels at the top of each axis
            axis.append("text")
                .attr("class", "axis-label")
                .attr("transform", "translate(" + (marginLeft) + ", -10)") // Position at the top, adjust as needed
                .attr("text-anchor", "end")
                .attr("fill", "currentColor") // Adjust text color as needed
                .text(key);

			// Append the brush for each axis
			axis
				.append("g")
				.attr("class", "brush")
				.call(
					d3
						.brushX()
						.extent([
							[marginLeft, -8],
							[width - marginRight, 8],
						])
						.on("start brush end", (event) => brushed(event, key))
				);
		});
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
	}
}

// Usage example:
// new ParallelCoordPlot("path/to/your/data.csv");
