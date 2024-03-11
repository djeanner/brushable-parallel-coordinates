class ParallelCoordPlot {
	constructor(csvFilePath, containerSelector) {
    this.containerSelector = containerSelector;
    d3.csv(csvFilePath, d3.autoType).then(data => {
      this.data = data;
      this.keys = Object.keys(data[0]).filter(d => d !== "name" && d !== "year");
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

    const margin = { top: 30, right: 10, bottom: 10, left: 0 };
    const width = 960 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svg = d3.select(this.containerSelector)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    this.x = d3.scalePoint().range([0, width]).padding(1).domain(this.keys);
    this.y = {};
    this.keys.forEach(key => {
      this.y[key] = d3.scaleLinear()
        .domain(d3.extent(this.data, d => +d[key]))
        .range([height, 0]);
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
    // Draw the axis:
    this.keys.forEach(function(key) {
      svg.append("g")
        .attr("transform", `translate(${plot.x(key)},0)`)
        .each(function() { d3.select(this).call(d3.axisLeft(plot.y[key])); })
        .append("text")
        .style("text-anchor", "middle")
        .attr("y", -9)
        .text(key)
        .style("fill", "black");
    });
  }
}