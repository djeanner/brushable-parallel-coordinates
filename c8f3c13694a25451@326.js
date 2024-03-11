import define1 from "./a33468b95d0b15b0@817.js";

function _1(md){return(
md`# Brushable parallel coordinates`
)}

function _2(selection){return(
selection
)}

function _keyz(html,keys)
{
  const form = html`<form>${Object.assign(html`<select name=select>${keys.map(key => Object.assign(html`<option>`, {value: key, textContent: key}))}</select>`, {value: "weight (lb)"})} <i style="font-size:smaller;">color encoding</i>`;
  form.select.onchange = () => (form.value = form.select.value, form.dispatchEvent(new CustomEvent("input")));
  form.select.onchange();
  return form;
}


function _legend(Legend,$0,keyz){return(
Legend({color: ($0).scales.color, title: keyz})
)}

function _selection(keys,d3,data,keyz)
{

  // Specify the chart’s dimensions.
  const width = 928;
  const height = keys.length * 120;
  const marginTop = 20;
  const marginRight = 10;
  const marginBottom = 20;
  const marginLeft = 10;

  // Create an horizontal (*x*) scale for each key.
  const x = new Map(Array.from(keys, key => [key, d3.scaleLinear(d3.extent(data, d => d[key]), [marginLeft, width - marginRight])]));

  // Create the vertical (*y*) scale.
  const y = d3.scalePoint(keys, [marginTop, height - marginBottom]);

  // Create the color scale.
  const color = d3.scaleSequential(x.get(keyz).domain(), t => d3.interpolateBrBG(1 - t));

  // Create the SVG container.
  const svg = d3.create("svg")
      .attr("viewBox", [0, 0, width, height])
      .attr("width", width)
      .attr("height", height)
      .attr("style", "max-width: 100%; height: auto;");

  // Append the lines.
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

  // Append the axis for each key.
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

  return Object.assign(svg.property("value", data).node(), {scales: {color}});
}


function _data(FileAttachment){return(
FileAttachment("cars.csv").csv({typed: true})
)}

function _keys(data){return(
data.columns.slice(1)
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  function toString() { return this.url; }
  const fileAttachments = new Map([
    ["cars.csv", {url: new URL("./files/4cb40b94ee98c9296d28913c84e041a1bba5e6821131116b506dcbbfa383592985d94310ad25deb564b61d14ed20fd17c014ed38ab465d0a717dd81e4ea5759e.csv", import.meta.url), mimeType: "text/csv", toString}]
  ]);
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  main.variable(observer()).define(["md"], _1);
  main.variable(observer()).define(["selection"], _2);
  main.variable(observer("viewof keyz")).define("viewof keyz", ["html","keys"], _keyz);
  main.variable(observer("keyz")).define("keyz", ["Generators", "viewof keyz"], (G, _) => G.input(_));
  main.variable(observer("legend")).define("legend", ["Legend","viewof selection","keyz"], _legend);
  main.variable(observer("viewof selection")).define("viewof selection", ["keys","d3","data","keyz"], _selection);
  main.variable(observer("selection")).define("selection", ["Generators", "viewof selection"], (G, _) => G.input(_));
  main.variable(observer("data")).define("data", ["FileAttachment"], _data);
  main.variable(observer("keys")).define("keys", ["data"], _keys);
  const child1 = runtime.module(define1);
  main.import("legend", "Legend", child1);
  return main;
}
