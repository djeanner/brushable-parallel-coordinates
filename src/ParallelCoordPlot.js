class ParallelCoordPlot {
	constructor(containerSelector, options = {}, dataFromHtml = {}) {
		const defaults = {
			types: ["toCen"],
			extract: "array",
			selectionKeyTrue: "",
			atomNumberKey: "molAtomIndices",
		};
		this.settings = { ...defaults, ...options };
		// Override defaults with passed values
		this.containerSelector = containerSelector;
		this.brushes = new Map(); // Initialize the brushes map here

		this.margin = { top: 50, right: 10, bottom: 10, left: 0 };
		this.width = 960 - this.margin.left - this.margin.right;
		this.height = 500 - this.margin.top - this.margin.bottom;

		function transformDataEnhanced(data) {
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
			data.forEach((item) => {
				let transformedItem = {};

				Object.keys(item).forEach((key) => {
					let value = item[key];
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

			return { dataNumbered, stringTables, keyTypes };
		}

		if ("csvPath" in this.settings) {
			d3.csv(this.settings.csvPath, d3.autoType).then((dataInput) => {
				let { dataNumbered, stringTables, keyTypes } =
					transformDataEnhanced(dataInput);

				this.data = dataNumbered;
				this.originalData = dataNumbered;
				this.stringTables = stringTables;
				this.keyTypes = keyTypes;
				this.processData();
			});
		} else {
			if ("jsonPath" in this.settings) {
				d3.json(this.settings.jsonPath).then((dataInput) => {
					let { dataNumbered, stringTables, keyTypes } =
						transformDataEnhanced(dataInput);

					this.data = dataNumbered;
					this.originalData = dataNumbered;
					this.stringTables = stringTables;
					this.keyTypes = keyTypes;
					this.processData();
				});
			} else {
				let { dataNumbered, stringTables, keyTypes } =
					transformDataEnhanced(dataFromHtml);

				this.data = dataNumbered;
				this.originalData = dataNumbered;
				this.stringTables = stringTables;
				this.keyTypes = keyTypes;
				this.processData();
			}
		}
	}

	processData() {
		this.keys = Object.keys(this.data[0]); // filtering out columns
		this.createSetColorMapDropdown();
		this.setColorAxis(this.keys[0]); // Initially set color axis to the first key
		this.resetButton();
		this.init();
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

		// Append a label before the dropdown
		d3.select(this.containerSelector)
			.append("label")
			.attr("class", "color-axis-selector-label") // Optional: for styling the label
			.text("Select colors according to "); // The text content for the label

		// Continue with the dropdown creation as before
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

	getPositionForKey(keyIndex, startPosition = 220, step = 100) {
		return startPosition + keyIndex * step;
	}

	init() {
		// Clear any existing content
		d3.select(this.containerSelector).select("svg").remove();

		let svg = d3
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
			.x((d) => plot.getPositionForKey(plot.keys.indexOf(d[0]))) // Update x position to match axis
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
			.data(plot.data)
			.join("path")
			.attr("class", "line")
			.attr("d", (d) => line(plot.keys.map((key) => [key, d[key]])))
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
		this.keys.forEach((key, index) => {
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
					.domain(d3.extent(this.data, (d) => +d[key]))
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
		this.keys.forEach((key, index) => {
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
		const filteredData = this.data.filter((d) => d[key] == selectedValue);
		this.data = filteredData;
		const stringInMenu = this.getStringForKeyAndNumber(
			key,
			selectedValue,
			this.stringTables
		);
		this.init();
		this.brushes.clear();
	}

	resetButton() {
		d3.select(this.containerSelector) // Select the container where you want to place the button
			.append("button") // Append a button element
			.text("Reset Data") // Set the button text
			.attr("class", "reset-button") // Optionally, add a class for styling
			.on("click", () => {
				this.data = this.originalData; // Reset this.data to the original data, use slice for a shallow copy if needed
				this.setColorAxis(this.keys[0]); // Initially set color axis to the first key
				this.init(); // Call the method that updates your visualization with the new data
				this.brushes.clear();
			});
	}
}
