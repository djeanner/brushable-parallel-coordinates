class ParallelCoordPlot {
	constructor(containerSelector, options = {}, dataFromHtml = {}) {
		const defaults = {
			width: 2400,
			height: 500,
			colorMap: "Warm", // Example options for the color map
			margin: { top: 50, right: 10, bottom: 20, left: 0 },
			showFactor: 0.8, // Factor visibility lines
			darkFactor: 0.0,
			pointInitialSpaceColumns: 100,
			pointIncrementSpaceColumns: 100,
		};
		this.dataFromHtml = dataFromHtml;
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
				dataInput = this.dataFromHtml;
			}

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

	// Transmit highlighted lines
	transmitHighlight(data, element) {
		let content = {};

		// Find the index of the highlighted element within dataNoIdenticalValue
		const index = this.dataNoIdenticalValue.findIndex((d) => d === data);

		for (let key in data) {
			let value =
				this.keyTypes[key] === "string"
					? Object.keys(this.stringTables[key]).find(
							(keyStr) => this.stringTables[key][keyStr] === data[key]
					  )
					: data[key];
			content[key] = value;
			if (this.keyTypes[key] === "string")
				content[key + "_keyIndex"] = data[key];
		}
		const color = d3.select(element).style("stroke");

		var returnedObject = {};
		returnedObject["data"] = content;
		returnedObject["color"] = color;
		returnedObject["index"] = index;

		// Log the content
		console.log("Highlighted cont:", returnedObject);
	}

	transmitSelection() {
		const selectedData = this.dataNoIdenticalValue.filter((d) => {
			return Array.from(this.brushes.entries()).every(([key, [min, max]]) => {
				const val = d[key];
				if (min > max) {
					return val >= max && val <= min; // Handle inverted selections
				}
				return val >= min && val <= max;
			});
		});

		const selectedObjects = selectedData.map((data) => {
			let content = {};

			// Find the index of each selected element within dataNoIdenticalValue
			const index = this.dataNoIdenticalValue.findIndex((d) => d === data);

			for (let key in data) {
				let value =
					this.keyTypes[key] === "string"
						? Object.keys(this.stringTables[key]).find(
								(keyStr) => this.stringTables[key][keyStr] === data[key]
						  )
						: data[key];
				content[key] = value;

				if (this.keyTypes[key] === "string")
					content[key + "_keyIndex"] = data[key];
			}

			// Get the corresponding path element for this data point
			const lineElement = d3
				.selectAll("path.data-line")
				.filter((dLine) => dLine === data)
				.node();

			// Get the color of the selected line from the SVG element
			const color = lineElement ? d3.select(lineElement).style("stroke") : null;

			var returnedObject = {};
			returnedObject["data"] = content;
			returnedObject["color"] = color; // Now getting the color from the SVG path
			returnedObject["index"] = index;

			return returnedObject;
		});

		// Logging the selected data objects to the console
		if (selectedObjects.length > 0) {
			console.log("Selected objects:", selectedObjects);
			console.log("Selected length:", selectedObjects.length);
		} else {
			console.log("No data selected.");
		}
	}

	shouldUseLogScale(values) {
		// Convert Set to Array, sort numerically, and remove duplicates
		const sortedValues = [...values].sort((a, b) => a - b);

		if (sortedValues.some((val) => val <= 0)) {
			// Contains non-positive values, leaning towards linear
			return false;
		}

		let differences = sortedValues
			.slice(1)
			.map((value, index) => value - sortedValues[index]);
		let logDifferences = sortedValues
			.slice(1)
			.map(
				(value, index) => Math.log10(value) - Math.log10(sortedValues[index])
			);

		let maxDiff = Math.max(...differences);
		let minDiff = Math.min(...differences);
		let maxLogDiff = Math.max(...logDifferences);
		let minLogDiff = Math.min(...logDifferences);

		let ratio = maxDiff / minDiff;
		let logRatio = maxLogDiff / minLogDiff;

		return logRatio < ratio;
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

		keyNoIdenticalValue.forEach((key) => {
			if (fieldTypes[key].includes("number")) {
				const useLogScale = this.shouldUseLogScale(allValues[key]);
				const replaceValuesNoLogScale = true;
				fieldTypes[key] = useLogScale ? "numberLog" : "numberLin";
			}
			keyTypes[key] = fieldTypes[key];
		});
		// console.log("fieldTypes : ", fieldTypes);

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
		this.createControlsContainer();
		this.createSetColorMapDropdown();
		this.keyUsedForColor = this.keyNoIdenticalValue[0];
		this.setColorAxis(this.keyUsedForColor);
		this.resetButton();
		this.svgToDownload();
		this.svgToImageAndCopyButton();
		this.colorMapMenu();
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

	colorMapMenu() {
		const plot = this;

		const dropdown = this.controlsContainer
			.append("select")
			.attr("class", "color-axis-selector")
			.on("change", (event) => {
				this.settings.colorMap = event.target.value;
				plot.setColorAxis(plot.keyUsedForColor);
			});
		dropdown
			.selectAll("option")
			.data(["Viridis", "Plasma", "Cividis", "Cool", "Warm", "Inferno"])
			.enter()
			.append("option")
			.text((d) => d)
			.attr("value", (d) => d);
	}

	createControlsContainer() {
		// Append a div for controls inside the parent container
		this.controlsContainer = d3
			.select(this.containerSelector)
			.append("div")
			.attr("class", "controls-container"); // For styling and structure
	}
	// Assuming this method is part of your class where `this.svg` is your main SVG selection
	appendCommentToSvg(svg) {
		let cleanedString = this.rejectedKeys.replace(/<br\s*\/?>/gi, " ");
		cleanedString = cleanedString.replace(/<[^>]*>/g, "");

		// Calculate the position for the comment. You may adjust these values as needed.
		const commentX = 100; // Horizontal position of the comment from the left edge of the SVG
		const commentY = this.height + 15; // Positioning the comment near the bottom of the SVG

		// Append the text element for the comment at the calculated position
		svg
			.append("text")
			.attr("x", commentX)
			.attr("y", commentY)
			.attr("class", "comment-label") // You can use this class to style the text if desired
			.text(cleanedString)
			.attr("font-family", "sans-serif") // Specify the font family if desired
			.attr("font-size", "12px") // Specify the font size
			.attr("fill", "black"); // Specify the text color
	}

	createSetColorMapDropdown() {
		// Append a label for the dropdown to the controls container
		this.controlsContainer
			.append("label")
			.attr("class", "color-axis-selector-label")
			.text("Select colors according to ");

		const dropdown = this.controlsContainer
			.append("select")
			.attr("class", "color-axis-selector")
			.on("change", (event) => {
				// Using D3 version 6 or later, the event is the first argument
				this.keyUsedForColor = event.target.value;
				this.setColorAxis(this.keyUsedForColor);
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
		this.setColorMap();
		this.updateLineColors();
	}

	getPositionForKey(
		keyIndex,
		startPosition = this.settings.pointInitialSpaceColumns,
		step = this.settings.pointIncrementSpaceColumns
	) {
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
			.style("border-radius", "6px")
			.style("padding", "6px");

		this.appendCommentToSvg(svg);
	}

	drawLines(svg) {
		const plot = this;
		const line = d3
			.line()
			.defined((d) => d[1] !== null && !isNaN(d[1]))
			.x((d) => plot.getPositionForKey(plot.keyNoIdenticalValue.indexOf(d[0])))
			.y((d) => {
				if (plot.keyTypes[d[0]] === "string") {
					return plot.y[d[0]](d[1]) + plot.y[d[0]].bandwidth() / 2;
				} else {
					return plot.y[d[0]](d[1]);
				}
			})
			.curve(d3.curveCatmullRom.alpha(1));

		svg
			.selectAll("path.line")
			.data(plot.dataNoIdenticalValue)
			.join("path")
			.attr("class", "data-line")
			.attr("d", (d) =>
				line(plot.keyNoIdenticalValue.map((key) => [key, d[key]]))
			)
			.attr("stroke", (d) => plot.color(d[plot.colorAxis]))
			.style("fill", "none")
			.style("stroke-width", "1.5px")
			.style("opacity", this.settings.showFactor)
			.on("mouseover", function (event, d) {
				const opacity = d3.select(this).style("opacity");

				// Only show tooltip and highlight the line if it's visible (i.e., opacity > darkFactor)
				if (opacity > plot.settings.darkFactor) {
					d3.select(this)
						.transition()
						.duration(200)
						.style("stroke-width", "4px")
						.style("stroke", "black");

					plot.tooltip.style("visibility", "visible").html(() => {
						let content = "";
						for (let key in d) {
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

					// Transmit the highlighted data
					plot.transmitHighlight(d, this);
				}
			})
			.on("mousemove", function (event) {
				plot.tooltip
					.style("top", event.pageY - 10 + "px")
					.style("left", event.pageX + 10 + "px");
			})
			.on("mouseout", function () {
				d3.select(this)
					.transition()
					.duration(200)
					.style("stroke-width", "1.5px")
					.style("stroke", (d) => plot.color(d[plot.colorAxis]));

				plot.tooltip.style("visibility", "hidden");
			});

		svg.selectAll(".data-line").lower();
	}

	setupAxes(svg) {
		const newWidth = this.getPositionForKey(this.keyNoIdenticalValue.length);
		d3.select(this.containerSelector).select("svg").attr("width", newWidth);

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

				axisGenerator = d3.axisLeft(this.y[key]).tickFormat((d) => {
					const fullLabel = invertedTable[d];
					const { trimmedLabel, tooLarge } = this.trimLabel(fullLabel, 15);
					return trimmedLabel + "...";
				});
				svg.append("g");
			} else {
				// Setup for non-string fields
				if (this.keyTypes[key] === "numberLog") {
					const positiveValues = this.data
						.filter((d) => d[key] > 0)
						.map((d) => +d[key]);
					const domain = d3.extent(positiveValues);
					this.y[key] = d3.scaleLog().domain(domain).range([this.height, 0]);
					// axisGenerator = d3.axisLeft(this.y[key]).ticks(5, ".0s");
					axisGenerator = d3.axisLeft(this.y[key]);
				} else {
					this.y[key] = d3
						.scaleLinear()
						.domain(d3.extent(this.data, (d) => +d[key]))
						.range([this.height, 0]);

					axisGenerator = d3.axisLeft(this.y[key]);
				}
				if (this.keyTypes[key] === "numberLog") {
				}
			}

			// Append and position the axis
			const axisGroup = svg
				.append("g")
				.attr("class", `axis-${key}`)
				.attr("transform", `translate(${axisPosition}, 0)`)
				.call(axisGenerator);

			// add titles for full text
			if (this.keyTypes[key] === "string") {
				const invertedTable = Object.entries(this.stringTables[key]).reduce(
					(acc, [str, index]) => {
						acc[index] = str;
						return acc;
					},
					{}
				);
				svg
					.append("g")
					.attr("class", `axis-${key}`)
					.attr("transform", `translate(${axisPosition}, 0)`)
					.call(axisGenerator)
					.selectAll(".tick text") // Select all text elements for ticks
					.each(function (d) {
						// For each tick text, add a title element
						const fullLabel = invertedTable[d]; // Assuming invertedTable is accessible here
						d3.select(this).append("title").text(fullLabel); // The title text will be shown on hover
					});
			} else {
				const axisGroup = svg
					.append("g")
					.attr("class", `axis-${key}`)
					.attr("transform", `translate(${axisPosition}, 0)`)
					.call(axisGenerator);
			}

			// Append axis name on top

			const { trimmedLabel, tooLarge } = this.trimLabel(key, 20); // Use the corrected property name
			const axisLabel = axisGroup
				.append("text")
				.attr("transform", `translate(0, -15)`) // Move it slightly above the axis
				.attr("fill", "#000") // Text color
				.attr("text-anchor", "middle") // Center the text
				.attr("dy", ".71em") // Adjust the distance from the axis
				.text(trimmedLabel)
				.each(function (d) {
					d3.select(this).append("title").text(key);
				});
			//if (tooLarge) axisLabel.append("title").text(key);

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

	trimLabel(label, maxLength = 25) {
		// Improve by looking at the true size of the text...
		const isTrimmed = label.length > maxLength;
		const trimmedLabel = isTrimmed
			? label.substring(0, maxLength - 3) + "..."
			: label;
		return {
			trimmedLabel,
			isTrimmed,
		};
	}

	setupSelector(svg) {
		const plot = this;

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

			if (plot.keyTypes[key] === "string") {
				const dropdown = axisContainer
					.append("foreignObject")
					.attr("width", 600) // Set appropriate width
					.attr("height", 25) // Set appropriate height
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

				dropdown.append("option").text("Select ...").attr("value", "");

				Object.entries(plot.stringTables[key]).forEach(([str, index]) => {
					dropdown.append("option").text(str).attr("value", index); // Use index or str according to your needs
				});
			}
		});
	}

	brushed(event, key) {
		if (event.selection) {
			let selection;
			if (this.keyTypes[key] === "string") {
				const [y0, y1] = event.selection;
				const selectedBands = this.y[key]
					.domain()
					.filter(
						(d) =>
							this.y[key](d) + 0.5 * this.y[key].bandwidth() > y0 &&
							this.y[key](d) + 0.5 * this.y[key].bandwidth() < y1
					);
				let maxDiff = Math.max(...selectedBands);
				let minDiff = Math.min(...selectedBands);
				this.brushes.set(key, [minDiff, maxDiff]);
			} else {
				selection = event.selection.map(this.y[key].invert, this.y[key]);
				this.brushes.set(key, selection);
			}
		} else {
			this.brushes.delete(key);
		}
		this.updateLines();

		// Transmit the selected data points when brushing
		this.transmitSelection();
	}

	updateLines() {
		const svg = d3.select(this.containerSelector).select("svg");
		svg.selectAll("path.data-line").style("opacity", (d) => {
			// Assuming d is correctly populated for each path
			if (!d) {
				return darkFactor; // Fallback opacity for missing data
			}
			let isVisible = Array.from(this.brushes.entries()).every(
				([key, [min, max]]) => {
					const val = d[key];
					if (min > max) return val >= max && val <= min;
					else return val >= min && val <= max;
				}
			);

			return isVisible ? this.settings.showFactor : this.settings.darkFactor;
		});
	}

	updateLineColors() {
		const svg = d3.select(this.containerSelector).select("svg");
		// Target only the paths with the "line" class for updating colors
		svg
			.selectAll("path.data-line") // Use the class to specifically target lines
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

	svgToDownload() {
		const controlsContainer = d3
			.select(this.containerSelector)
			.select(".controls-container");

		controlsContainer
			.append("button")
			.text("Download SVG")
			.attr("class", "download-svg-button")
			.on("click", () => {
				const svgElement = this.containerSelector
					? document.querySelector(`${this.containerSelector} svg`)
					: document.querySelector("svg");

				// Clone the SVG element
				const clonedSvgElement = svgElement.cloneNode(true);

				// Adjust the selector here to exclude comment-label from removal
				// Remove buttons, menus, or other elements by class or ID from the clone
				// Exclude the 'comment-label' class from the removal
				const elementsToRemove = clonedSvgElement.querySelectorAll(
					".button-class, .menu-class, #button-id, #menu-id, select:not(.comment-label), .color-axis-selector-label, [class*='dropdown-']"
				);
				elementsToRemove.forEach((el) => el.parentNode.removeChild(el));

				// Proceed with serialization and download logic as before
				const serializer = new XMLSerializer();
				const svgString = serializer.serializeToString(clonedSvgElement);
				const svgBlob = new Blob([svgString], {
					type: "image/svg+xml;charset=utf-8",
				});
				const DOMURL = self.URL || self.webkitURL || self;
				const url = DOMURL.createObjectURL(svgBlob);

				// Generate a timestamp for the filename
				const date = new Date();
				const dateString = date.toISOString().split("T")[0]; // Format: YYYY-MM-DD
				const timeString = date.toTimeString().split(" ")[0].replace(/:/g, "-"); // Format: HH-MM-SS
				const fileName = `plot_${dateString}_${timeString}.svg`;

				// Create a link and trigger the download
				const downloadLink = document.createElement("a");
				downloadLink.href = url;
				downloadLink.download = fileName;
				document.body.appendChild(downloadLink);
				downloadLink.click();
				document.body.removeChild(downloadLink);
			});
	}

	svgToImageAndCopyButton() {
		const controlsContainer = d3
			.select(this.containerSelector)
			.select(".controls-container");

		controlsContainer
			.append("button")
			.text("Download image as .png")
			.attr("class", "download-button")
			.on("click", () => {
				const svgElement = this.containerSelector
					? document.querySelector(`${this.containerSelector} svg`)
					: document.querySelector("svg");
				if (!svgElement) {
					console.error("SVG element not found.");
					return;
				}
				const serializer = new XMLSerializer();
				const svgString = serializer.serializeToString(svgElement);
				const svgBlob = new Blob([svgString], {
					type: "image/svg+xml;charset=utf-8",
				});
				const DOMURL = self.URL || self.webkitURL || self;
				const url = DOMURL.createObjectURL(svgBlob);

				const img = new Image();
				img.onload = function () {
					const rect = svgElement.getBoundingClientRect();
					const canvas = document.createElement("canvas");
					canvas.width = rect.width;
					canvas.height = rect.height;
					const ctx = canvas.getContext("2d");

					// Fill the canvas with a white background
					ctx.fillStyle = "white";
					ctx.fillRect(0, 0, canvas.width, canvas.height);

					// Then draw the image
					ctx.drawImage(img, 0, 0, rect.width, rect.height);

					canvas.toBlob(function (blob) {
						const date = new Date();
						const dateString = date.toISOString().split("T")[0]; // Format: YYYY-MM-DD
						const timeString = date
							.toTimeString()
							.split(" ")[0]
							.replace(/:/g, "-"); // Format: HH-MM-SS
						const fileName = `plot_${dateString}_${timeString}.png`;

						const downloadLink = document.createElement("a");
						downloadLink.href = URL.createObjectURL(blob);
						downloadLink.download = fileName;
						document.body.appendChild(downloadLink);
						downloadLink.click();
						document.body.removeChild(downloadLink);
					}, "image/png");
				};
				img.src = url;
			});
	}

	resetButton() {
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
			if (this.keyTypes[this.colorAxis] === "numberLog")
				this.color = d3.scaleSequentialLog(interpolator).domain(colorExtent);
			else this.color = d3.scaleSequential(interpolator).domain(colorExtent);
		} else {
			console.error("Invalid color map specified. Falling back to default.");
			this.color = d3
				.scaleSequential(d3.interpolateInferno)
				.domain(colorExtent);
		}
	}
}
