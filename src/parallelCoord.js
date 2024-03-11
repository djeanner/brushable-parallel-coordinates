d3.csv("files/data.csv").then(data => {
    const keys = Object.keys(data[0]).filter(d => d !== "name" && d !== "year"); // Adjusted to exclude 'name' and 'year'
    const keyz = "year"; // Using "year" as the key for coloring
    
    // Handle missing values and convert strings to numbers where appropriate
    data.forEach(d => {
        keys.forEach(key => {
            d[key] = d[key] === "" ? null : +d[key];
        });
    });

    // Specify the chart's dimensions
    const width = 928;
    const height = keys.length * 120;
    const marginTop = 20;
    const marginRight = 10;
    const marginBottom = 20;
    const marginLeft = 10;

    // Create horizontal (x) scale for each key
    const x = new Map(keys.map(key => [key, d3.scaleLinear(d3.extent(data, d => d[key]), [marginLeft, width - marginRight])]));

    // Create the vertical (y) scale
    const y = d3.scalePoint(keys, [marginTop, height - marginBottom]);

    // Create the color scale
    const color = d3.scaleSequential(d3.extent(data, d => d[keyz]), d3.interpolateBrBG);

    // Create the SVG container
    const svg = d3.select("body").append("svg")
        .attr("viewBox", [0, 0, width, height])
        .attr("width", width)
        .attr("height", height)
        .attr("style", "max-width: 100%; height: auto;");

    // Append the lines
    const line = d3.line()
        .defined(([, value]) => value != null)
        .x(([key, value]) => x.get(key)(value))
        .y(([key]) => y(key));

    const path = svg.append("g")
        .attr("fill", "none")
        .attr("stroke-width", 1.5)
        .attr("stroke-opacity", 0.4)
        .selectAll("path")
        .data(data.slice().sort((a, b) => d3.ascending(a[keyz], b[keyz])))
        .join("path")
        .attr("stroke", d => color(d[keyz]))
        .attr("d", d => line(d3.cross(keys, [d], (key, d) => [key, d[key]])))
        .call(path => path.append("title")
            .text(d => d.name));

    // Append the axis for each key
    const axes = svg.append("g")
        .selectAll("g")
        .data(keys)
        .join("g")
        .attr("transform", d => `translate(0,${y(d)})`)
        .each(function(d) { d3.select(this).call(d3.axisBottom(x.get(d))); })
        .call(g => g.append("text")
            .attr("x", marginLeft)
            .attr("y", -6)
            .attr("text-anchor", "start")
            .attr("fill", "currentColor")
            .text(d => d))
        .call(g => g.selectAll("text")
            .clone(true).lower()
            .attr("fill", "none")
            .attr("stroke-width", 5)
            .attr("stroke-linejoin", "round")
            .attr("stroke", "white"));


  // Create the brush behavior.
  const deselectedColor = "#ddd";
  const brushHeight = 50;
  const brush = d3.brushX()
      .extent([
        [marginLeft, -(brushHeight / 2)],
        [width - marginRight, brushHeight / 2]
      ])
      .on("start brush end", brushed);

  axes.call(brush);

  const selections = new Map();

  function brushed({selection}, key) {
    if (selection === null) selections.delete(key);
    else selections.set(key, selection.map(x.get(key).invert));
    const selected = [];
    path.each(function(d) {
      const active = Array.from(selections).every(([key, [min, max]]) => d[key] >= min && d[key] <= max);
      d3.select(this).style("stroke", active ? color(d[keyz]) : deselectedColor);
      if (active) {
        d3.select(this).raise();
        selected.push(d);
      }
    });
    svg.property("value", selected).dispatch("input");
  }
});