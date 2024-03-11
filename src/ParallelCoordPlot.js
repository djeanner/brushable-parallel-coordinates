class ParallelCoordPlot {
	constructor(csvFilePath, containerSelector) {
    this.containerSelector = containerSelector;
    this.brushes = new Map(); // Initialize the brushes map here
    d3.csv(csvFilePath, d3.autoType).then(data => {
      this.data = data;
      this.keys = Object.keys(this.data[0]).filter(d => d !== "name" ); // filtering out columns
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

 // Tooltip setup
  this.tooltip = d3.select(this.containerSelector)
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
  svg.selectAll("myPath")
    .data(this.data)
    .enter().append("path")
    .attr("d", function(d) {
      return d3.line()(plot.keys.map(function(p) { return [plot.x(p), plot.y[p](d[p])]; }));
    })
    .attr("stroke", d => plot.color(d[plot.colorAxis]))
    .style("fill", "none")
    .style("stroke-width", "1.5px")
    .style("opacity", "0.8")
    // Mouseover event to show tooltip
    .on("mouseover", function(event, d) {
      plot.tooltip.style("visibility", "visible")
        .html(() => {
          // Adding name and year to the tooltip content
          let content = `<strong>Name:</strong> ${d.name}<br><strong>Year:</strong> ${d.year}<br><br><strong>Values:</strong><br>`;
          plot.keys.forEach(key => {
            content += `${key}: ${d[key]}<br>`;
          });
          return content;
        });
    })
    // Mousemove event to position the tooltip
    .on("mousemove", function(event) {
      plot.tooltip.style("top", (event.pageY - 10) + "px")
        .style("left", (event.pageX + 10) + "px");
    })
    // Mouseout event to hide the tooltip
    .on("mouseout", function() {
      plot.tooltip.style("visibility", "hidden");
    });
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
  svg.selectAll("path")
    .style("opacity", d => {
      // Assuming d is correctly populated for each path
      if (!d) {
        return 0.1; // Fallback opacity for missing data
      } 

      // Check if the line is within all brushes' extents
      let isVisible = Array.from(this.brushes.entries()).every(([key, [min, max]]) => {
        const val = d[key];
    if (min > max)
        return val >= max && val <= min;
      else
        return val >= min && val <= max;
      });

      return isVisible ? 0.8 : 0.03;
    });
}


}