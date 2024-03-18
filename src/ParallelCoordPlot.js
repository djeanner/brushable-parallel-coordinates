class ParallelCoordPlot {
	constructor(containerSelector, options = {}, dataFromHtml = {}) {
		const defaults = {
			width: 2000,
			height: 500,
			colorMap: "Warm", // Example options for the color map
			margin: { top: 50, right: 10, bottom: 10, left: 0 },
		};

		this.settings = { ...defaults, ...options };
		this.containerSelector = containerSelector;
		this.brushes = new Map(); // Initialize the brushes map here
		this.width =
			this.settings.width -
			this.settings.margin.left -
			this.settings.margin.right;
		this.height =
			this.settings.height -
			this.settings.margin.top -
			this.settings.margin.bottom;
		this.loadData();
	}

	async loadData() {
		try {
			let dataInput;
			if ("csvPath" in this.settings) {
				dataInput = await d3.csv(this.settings.csvPath, d3.autoType);
			} else if ("jsonPath" in this.settings) {
				dataInput = await d3.json(this.settings.jsonPath);
			} else {
				dataInput = dataFromHtml;
			}

			// Correctly destructure the object returned by transformDataEnhanced
			const {
				dataNumbered,
				stringTables,
				keyTypes,
				keyNoIdenticalValue,
				dataNoIdenticalValue,
				rejectedKeys,
			} = this.transformDataEnhanced(dataInput);

			this.setDataProperties(
				dataNumbered,
				stringTables,
				keyTypes,
				keyNoIdenticalValue,
				dataNoIdenticalValue,
				rejectedKeys
			);
		} catch (error) {
			console.error("Failed to load data:", error);
		}
	}

	transformDataEnhanced(data) {
		let fieldTypes = {};
		let dataNumbered = [];
		let stringTables = {};
		let keyTypes = {};

		// Step 1: Determine the types for each field
		data.forEach((item) => {
			Object.keys(item).forEach((key) => {
				let value = item[key];
				if (typeof value === "string") {
					fieldTypes[key] = "string";
				} else if (!fieldTypes[key]) {
					// Mark as number or boolean for now, can be overridden by string later
					fieldTypes[key] = typeof value;
				}
			});
		});

		// Step 2: Transform the data
		const allValues = {}; // To track values for each key across all items

		// Initial transformation and tracking values for testAllEqualValue
		data.forEach((item) => {
			let transformedItem = {};

			Object.keys(item).forEach((key) => {
				let value = item[key];
				allValues[key] = allValues[key] || new Set();
				allValues[key].add(value);

				if (fieldTypes[key] === "string") {
					value = String(value); // Convert numbers/booleans to strings
					if (!stringTables[key]) {
						stringTables[key] = {};
					}
					if (!(value in stringTables[key])) {
						stringTables[key][value] = Object.keys(stringTables[key]).length;
					}
					transformedItem[key] = stringTables[key][value];
				} else if (fieldTypes[key] === "number") {
					transformedItem[key] = value;
				} else if (fieldTypes[key] === "boolean") {
					transformedItem[key] = value ? 1 : 0;
				}
				keyTypes[key] = fieldTypes[key];
			});

			dataNumbered.push(transformedItem);
		});

		let keysWithNoIdenticalValues = [];
		let dataNoIdenticalValue = [];

		// Identifying keys with identical values
		Object.keys(allValues).forEach((key) => {
			if (allValues[key].size === 1) {
				keysWithNoIdenticalValues.push(key);
			}
		});

		dataNoIdenticalValue = dataNumbered.map((item) => {
			let filteredItem = {};
			Object.keys(item).forEach((key) => {
				if (!keysWithNoIdenticalValues.includes(key)) {
					filteredItem[key] = item[key];
				}
			});
			return filteredItem;
		});

		let rejectedKeys = `<br>`;
		let item = dataNumbered[0];
		Object.keys(item).forEach((key) => {
			if (keysWithNoIdenticalValues.includes(key)) {
				let value;
				if (keyTypes[key] === "string") {
					// Find the original string value from stringTables
					value = Object.keys(stringTables[key]).find(
						(keyStr) => stringTables[key][keyStr] === item[key]
					);
				} else {
					// For non-string values, use the value directly
					value = item[key];
				}
				// Append the key and its original value to the rejectedKeys string
				rejectedKeys += `<strong><i>${key}:</i></strong> ${value}<br>`;
			}
		});
		let keyNoIdenticalValue = Object.keys(keyTypes).filter(
			(key) => !keysWithNoIdenticalValues.includes(key)
		);
		return {
			dataNumbered,
			stringTables,
			keyTypes,
			keyNoIdenticalValue,
			dataNoIdenticalValue,
			rejectedKeys,
		};
	}

	setDataProperties(
		dataNumbered,
		stringTables,
		keyTypes,
		keyNoIdenticalValue,
		dataNoIdenticalValue,
		rejectedKeys
	) {
		this.data = dataNumbered;
		this.stringTables = stringTables;
		this.keyTypes = keyTypes;

		this.originalData = dataNoIdenticalValue;
		this.keyTypes = keyTypes;
		this.keyNoIdenticalValue = keyNoIdenticalValue;
		this.dataNoIdenticalValue = dataNoIdenticalValue;
		this.rejectedKeys = rejectedKeys;
		this.processData();
	}

	processData() {
		this.keys = Object.keys(this.dataNoIdenticalValue[0]); // filtering out columns
		this.createSetColorMapDropdown();
		this.setColorAxis(this.keyNoIdenticalValue[0]); // Initially set color axis to the first key
		this.resetButton();
		this.init();
		this.setColorMap(); // Ensure the color map is updated according to the processed data
	}

	getStringForKeyAndNumber(key, number, stringTables) {
		let invertedTable = Object.keys(stringTables[key]).reduce((acc, cur) => {
			acc[stringTables[key][cur]] = cur;
			return acc;
		}, {});

		return invertedTable[number] || "Unknown";
	}

	createSetColorMapDropdown() {
		const plot = this;

		// Ensure there's a controls container below the SVG
		const controlsContainer = d3
			.select(this.containerSelector)
			.append("div") // This div will hold controls like dropdowns
			.attr("class", "controls-container"); // For styling and structure

		// Append a label for the dropdown to the controls container
		controlsContainer
			.append("label")
			.attr("class", "color-axis-selector-label")
			.text("Select colors according to ");

		// Append the dropdown to the controls container
		const dropdown = controlsContainer
			.append("select")
			.attr("class", "color-axis-selector")
			.on("change", function () {
				plot.setColorAxis(this.value);
			});

		dropdown
			.selectAll("option")
			.data(this.keyNoIdenticalValue)
			.enter()
			.append("option")
			.text((d) => d)
			.attr("value", (d) => d);
	}

	setColorAxis(newAxis) {
		this.colorAxis = newAxis;
		// Now, instead of setting the color scale directly here,
		// ensure the existing color scale is correctly applied or updated.
		this.setColorMap(); // This ensures the color scale is updated according to the current settings and data extent.
		this.updateLineColors();
	}

	getPositionForKey(keyIndex, startPosition = 220, step = 100) {
		return startPosition + keyIndex * step;
	}

	init() {
		// Clear any existing content
		d3.select(this.containerSelector).select("svg").remove();

		let svg = d3
			.select(this.containerSelector)
			.append("svg")
			.attr(
				"width",
				this.width + this.settings.margin.left + this.settings.margin.right
			)
			.attr(
				"height",
				this.height + this.settings.margin.top + this.settings.margin.bottom
			)
			.append("g")
			.attr(
				"transform",
				`translate(${this.settings.margin.left},${this.settings.margin.top})`
			);

		this.x = d3
			.scalePoint()
			.range([0, this.width])
			.padding(1)
			.domain(this.keyNoIdenticalValue);

		this.y = {};

		this.setupAxes(svg);
		this.setupSelector(svg);
		this.drawLines(svg);

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
	}

	drawLines(svg) {
		const plot = this;
		// Define the line generator with spline interpolation
		const line = d3
			.line()
			.defined((d) => d[1] !== null && !isNaN(d[1])) // Check for both null and NaN
			.x((d) => plot.getPositionForKey(plot.keyNoIdenticalValue.indexOf(d[0]))) // Update x position to match axis
			.y((d) => {
				// Adjust y-value computation based on field type
				if (plot.keyTypes[d[0]] === "string") {
					// For string fields, use the middle of the band
					return plot.y[d[0]](d[1]) + plot.y[d[0]].bandwidth() / 2;
				} else {
					// For numerical fields, use the linear scale as before
					return plot.y[d[0]](d[1]);
				}
			})
			.curve(d3.curveCatmullRom.alpha(1)); // Adjust alpha for different smoothing levels

		// Draw lines
		svg
			.selectAll("path.line")
			.data(plot.dataNoIdenticalValue)
			.join("path")
			.attr("class", "line")
			.attr("d", (d) =>
				line(plot.keyNoIdenticalValue.map((key) => [key, d[key]]))
			)
			.attr("stroke", (d) => plot.color(d[plot.colorAxis]))
			.style("fill", "none")
			.style("stroke-width", "1.5px")
			.style("opacity", "0.8")
			.on("mouseover", function (event, d) {
				plot.tooltip.style("visibility", "visible").html(() => {
					let content = "";
					for (let key in d) {
						// Use stringTables to show original string values in the tooltip
						let value =
							plot.keyTypes[key] === "string"
								? Object.keys(plot.stringTables[key]).find(
										(keyStr) => plot.stringTables[key][keyStr] === d[key]
								  )
								: d[key];
						content += `<strong>${key}:</strong> ${value}<br>`;
					}
					content += plot.rejectedKeys;
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
		this.keyNoIdenticalValue.forEach((key, index) => {
			let axisPosition = this.getPositionForKey(index);
			let axisGenerator;

			if (this.keyTypes[key] === "string") {
				// Setup for string fields
				const invertedTable = Object.entries(this.stringTables[key]).reduce(
					(acc, [str, index]) => {
						acc[index] = str;
						return acc;
					},
					{}
				);

				this.y[key] = d3
					.scaleBand()
					.domain(
						Object.keys(this.stringTables[key]).map(
							(k) => this.stringTables[key][k]
						)
					)
					.range([this.height, 0])
					.paddingInner(0.1);

				axisGenerator = d3
					.axisLeft(this.y[key])
					.tickFormat((d) => invertedTable[d]);
			} else {
				// Setup for non-string fields
				this.y[key] = d3
					.scaleLinear()
					.domain(d3.extent(this.dataNoIdenticalValue, (d) => +d[key]))
					.range([this.height, 0]);

				axisGenerator = d3.axisLeft(this.y[key]);
			}

			// Append and position the axis
			const axisGroup = svg
				.append("g")
				.attr("class", `axis-${key}`)
				.attr("transform", `translate(${axisPosition}, 0)`)
				.call(axisGenerator);

			// Append axis name on top
			axisGroup
				.append("text")
				.attr("transform", `translate(0, -15)`) // Move it slightly above the axis
				.attr("fill", "#000") // Text color
				.attr("text-anchor", "middle") // Center the text
				.attr("dy", ".71em") // Adjust the distance from the axis
				.text(key);

			// Setup and append the corresponding brush
			const brush = d3
				.brushY()
				.extent([
					[-10, 0],
					[10, this.height],
				])
				.on(
					"start brush end",
					((k) => (event) => {
						this.brushed(event, k);
					})(key)
				);

			svg
				.append("g")
				.attr("class", `brush-${key}`)
				.attr("transform", `translate(${axisPosition}, 0)`)
				.call(brush);
		});
	}

	setupSelector(svg) {
		const plot = this;

		// Loop over each key to set up axes and potentially dropdowns
		this.keyNoIdenticalValue.forEach((key, index) => {
			let axisPosition = this.getPositionForKey(index);
			let axisGenerator = d3.axisLeft(plot.y[key]);

			// Container for the axis and potentially a dropdown
			const axisContainer = svg
				.append("g")
				.attr("class", `axis-container-${key}`)
				.attr("transform", `translate(${axisPosition}, 0)`);

			axisContainer
				.append("g")
				.attr("class", `axis-${key}`)
				.call(axisGenerator);

			// Check if this key is of type string to add a dropdown
			if (plot.keyTypes[key] === "string") {
				const dropdown = axisContainer
					.append("foreignObject")
					.attr("width", 100) // Set appropriate width
					.attr("height", 30) // Set appropriate height
					.attr("x", -50) // Adjust X to align, may need tweaking
					.attr("y", -45) // Adjust Y to position above the axis
					.append("xhtml:body")
					.style("margin", 0) // Remove default margin
					.append("select")
					.attr("class", `dropdown-${key}`)
					.on("change", function () {
						plot.updateData(this, key);
					})
					.on("change", function () {
						plot.updateData(this, key);
					});

				// Populate dropdown options
				dropdown.append("option").text("Select").attr("value", "");

				Object.entries(plot.stringTables[key]).forEach(([str, index]) => {
					dropdown.append("option").text(str).attr("value", index); // Use index or str according to your needs
				});
			}

			// Setup brush logic remains unchanged
			// ...
		});
	}

	brushed(event, key) {
		if (event.selection) {
			let selection;
			if (this.keyTypes[key] === "string") {
				// Handle selection for string fields differently
				const [y0, y1] = event.selection;
				const selectedBands = this.y[key]
					.domain()
					.filter(
						(d) =>
							this.y[key](d) + this.y[key].bandwidth() > y0 &&
							this.y[key](d) < y1
					);
				this.brushes.set(key, selectedBands);
			} else {
				// Convert pixel selection to data values for numerical/boolean fields
				selection = event.selection.map(this.y[key].invert, this.y[key]);
				this.brushes.set(key, selection);
			}
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
			let isVisible = Array.from(this.brushes.entries()).every(
				([key, [min, max]]) => {
					const val = d[key];
					if (min > max) return val >= max && val <= min;
					else return val >= min && val <= max;
				}
			);

			return isVisible ? 0.8 : 0.1;
		});
	}

	updateLineColors() {
		const svg = d3.select(this.containerSelector).select("svg");
		// Target only the paths with the "line" class for updating colors
		svg
			.selectAll("path.line") // Use the class to specifically target lines
			.transition()
			.duration(200)
			.attr("stroke", (d) => this.color(d[this.colorAxis]));
	}

	updateData(input, key) {
		const selectedValue = d3.select(input).property("value");
		const filteredData = this.dataNoIdenticalValue.filter(
			(d) => d[key] == selectedValue
		);
		this.dataNoIdenticalValue = filteredData;
		const stringInMenu = this.getStringForKeyAndNumber(
			key,
			selectedValue,
			this.stringTables
		);
		this.init();
		this.brushes.clear();
	}

	resetButton() {
		this.x;
		const controlsContainer = d3
			.select(this.containerSelector)
			.select(".controls-container");

		controlsContainer
			.append("button")
			.text("Reset Data")
			.attr("class", "reset-button")
			.on("click", () => {
				this.dataNoIdenticalValue = this.originalData; // Reset this.dataNoIdenticalValue to the original data
				this.setColorAxis(this.keyNoIdenticalValue[0]); // Optionally reset color axis to the first key
				this.init(); // Re-initialize the visualization
				this.brushes.clear(); // Clear any active brushes
			});
	}

	setColorMap() {
		const colorExtent = d3.extent(this.originalData, (d) => +d[this.colorAxis]);
		const interpolators = {
			Viridis: d3.interpolateViridis,
			Plasma: d3.interpolatePlasma,
			Cividis: d3.interpolateCividis,
			Cool: d3.interpolateCool,
			Warm: d3.interpolateWarm,
			Inferno: d3.interpolateInferno, // Default
		};

		const interpolator = interpolators[this.settings.colorMap];

		if (interpolator) {
			this.color = d3.scaleSequential(interpolator).domain(colorExtent);
		} else {
			console.error("Invalid color map specified. Falling back to default.");
			this.color = d3
				.scaleSequential(d3.interpolateInferno)
				.domain(colorExtent);
		}
	}
}
