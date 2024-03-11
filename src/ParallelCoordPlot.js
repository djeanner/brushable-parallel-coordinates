class ParallelCoordPlot {
	constructor(csvFilePath, containerSelector) {
    this.containerSelector = containerSelector;
    d3.csv(csvFilePath, d3.autoType).then(data => {
      this.data = data;
      this.keys = Object.keys(data[0]).filter(d => d !== "name" && d !== "year");
      // Set up dimensions here or in init method
      this.margin = { top: 30, right: 10, bottom: 10, left: 0 };
      this.width = 960 - this.margin.left - this.margin.right;
      this.height = 500 - this.margin.top - this.margin.bottom;
      this.createDropdown();
      this.setColorAxis(this.keys[0]); // Initially set color axis to the first key
    });
}

  createDropdown() {
    const plot = this;
    const dropdown = d3.select(this.containerSelector)
      .append("select")
      .attr("class", "color-axis-selector")
      .on("change", function() {
        plot.setColorAxis(this.value);
      });

    dropdown.selectAll("option")
      .data(this.keys)
      .enter().append("option")
      .text(d => d)
      .attr("value", d => d);
  }
setColorAxis(newAxis) {
    this.colorAxis = newAxis;
    const colorExtent = d3.extent(this.data, d => +d[newAxis]);
    this.color = d3.scaleSequential([colorExtent[0], colorExtent[1]], d3.interpolateInferno);
    this.init();
  }


  init() {
    // Clear any existing content
    d3.select(this.containerSelector).select("svg").remove();


    const svg = d3.select(this.containerSelector)
      .append("svg")
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height + this.margin.top + this.margin.bottom)
      .append("g")
      .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

    this.x = d3.scalePoint().range([0, this.width]).padding(1).domain(this.keys);
    this.y = {};
    this.keys.forEach(key => {
      this.y[key] = d3.scaleLinear()
        .domain(d3.extent(this.data, d => +d[key]))
        .range([this.height, 0]);
    });

    this.drawLines(svg);
    this.setupAxes(svg);
  }

  drawLines(svg) {
    const plot = this;
    svg.selectAll("myPath")
      .data(this.data)
      .enter().append("path")
      .attr("d", function(d) {
        return d3.line()(plot.keys.map(function(p) { return [plot.x(p), plot.y[p](d[p])]; }));
      })
      .attr("stroke", d => this.color(d[this.colorAxis]))
      .style("fill", "none")
      .style("stroke-width", 1.5)
      .style("opacity", 0.8);
  }

setupAxes(svg) {
  const plot = this;
  // Correctly positioning the axes along the x-axis
  this.keys.forEach(key => {
    const axis = svg.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(${plot.x(key)},0)`) // Correctly position each axis
      .call(d3.axisLeft(plot.y[key])); // Assuming vertical axes

    axis.append("text")
      .style("text-anchor", "middle")
      .attr("y", -9)
      .text(key)
      .style("fill", "black");

    // Setting up brushes correctly
    const brush = d3.brushY() // Brush along the x-axis for parallel coordinates
      .extent([[plot.x(key) - 10, 0], [plot.x(key) + 10, plot.height]]) // Adjust extent
      .on("start brush end", (event) => plot.brushed(event, key));

    svg.append("g")
      .attr("class", "brush")
      .attr("transform", `translate(0,0)`) // Apply transformation if needed
      .call(brush);
  });
}

brushed(event, key) {
  if (event.selection) {
    // Store brush extents in a way that they can be used to filter data
    this.brushes.set(key, event.selection);
  } else {
    this.brushes.delete(key);
  }
  this.updateLines();
}

updateLines() {
  const svg = d3.select(this.containerSelector).select("svg");
  svg.selectAll("path")
    .style("opacity", d => {
      return Array.from(this.brushes).every(([key, [min, max]]) => {
        const value = d[key];
        return value >= min && value <= max;
      }) ? 0.8 : 0.1; // Highlight or dim based on brush selections
    });
}
}