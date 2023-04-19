// script.js
// HERE IS THE CODE FOR THE BACKGROUND GRADIENT
let isRadial = true;
const updateBackground = (event) => {
    const x = event.clientX / window.innerWidth;
    const y = event.clientY / window.innerHeight;
    const r = Math.floor(255 * x);
    const g = Math.floor(255 * y);
    const b = Math.floor(255 * (1 - x));

    const gradientType = isRadial
        ? `radial-gradient(circle closest-side at ${x * 100}% ${y * 100}%, rgb(${r}, ${g}, ${b}), #000)`
        : `linear-gradient(90deg, rgb(${r}, ${g}, ${b}), #000)`;

    document.body.style.background = gradientType;
};

document.addEventListener('mousemove', updateBackground);

const toggleGradient = document.getElementById('toggleGradient');
toggleGradient.addEventListener('click', () => {
    isRadial = !isRadial;
});

// Get references to the input and select elements
const slider = document.getElementById('range');
const pastelRange = document.getElementById('pastelRange');
const valentineScheme = document.getElementById('valentineScheme');
const staticModern = document.getElementById('staticModern');

// Define a variable to store the selected color scheme
let selectedColorScheme = 'staticModern';

// document selection code
const fileInput = document.getElementById('fileInput');
const fileUploadBtn = document.querySelector('.file-upload-btn');
let filePath = '';

fileUploadBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        filePath = URL.createObjectURL(file);
        console.log('File path:', filePath);
    }
});



// Create event listeners for the input and select elements
slider.addEventListener('input', (event) => {
    // remove current visualisation before generating the update
    updateSankey(event.target.value, selectedColorScheme);
});

// event listeners for the anchor elements
pastelRange.addEventListener('click', (event) => {
    event.preventDefault();
    selectedColorScheme = 'pastelRange';
    updateSankey(slider.value, selectedColorScheme);
});

valentineScheme.addEventListener('click', (event) => {
    event.preventDefault();
    selectedColorScheme = 'valentineScheme';
    updateSankey(slider.value, selectedColorScheme);
});

staticModern.addEventListener('click', (event) => {
    event.preventDefault();
    selectedColorScheme = 'staticModern';
    updateSankey(slider.value, selectedColorScheme);
});

updateSankey(slider.value, selectedColorScheme);

// save diagram as PNG
async function svg2canvas(svg, width, height) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        const img = new Image();

        const svgString = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            ctx.drawImage(img, 0, 0, width, height);
            URL.revokeObjectURL(url);
            resolve(canvas);
        };

        img.onerror = (err) => {
            URL.revokeObjectURL(url);
            reject(err);
        };

        img.src = url;
    });
}

// this entire function is needed because the bar chart gets saved without the colour scheme applied to the bars
// will improve later (probably not)
function cloneSvgWithStyles(svgElement) {
    const clonedSvg = svgElement.cloneNode(true);
    const styleSheets = Array.from(document.styleSheets);

    let styleText = '';

    for (const styleSheet of styleSheets) {
        if (styleSheet.cssRules) {
            try {
                const cssRules = Array.from(styleSheet.cssRules);
                cssRules.forEach((rule) => {
                    if (rule.selectorText && rule.selectorText.includes('.bar')) {
                        styleText += rule.cssText + '\n';
                    }
                });
            } catch (error) {
                console.warn('Error accessing CSS rules:', error);
            }
        }
    }

    const styleElement = document.createElement('style');
    styleElement.innerHTML = styleText;
    clonedSvg.insertBefore(styleElement, clonedSvg.firstChild);

    return clonedSvg;
}

const saveAsPngBtn = document.getElementById('saveAsPng');

saveAsPngBtn.addEventListener('click', async () => {
    const sankeySvg = document.querySelector('svg'); // Sankey diagram
    const barChartSvg = document.querySelector('#bar-chart'); // Bar chart

    if (sankeySvg) {
        saveSvgAsPng(sankeySvg, "sankey.png", { backgroundColor: "transparent" });
    }

    if (barChartSvg) {
        saveSvgAsPng(barChartSvg, "bar-chart.png", { backgroundColor: "transparent" });
    }

    if (sankeySvg && barChartSvg) {
        const sankeyWidth = sankeySvg.clientWidth;
        const sankeyHeight = sankeySvg.clientHeight;
        const barChartWidth = barChartSvg.clientWidth;
        const barChartHeight = barChartSvg.clientHeight;

        const totalWidth = sankeyWidth + barChartWidth;
        const totalHeight = Math.max(sankeyHeight, barChartHeight);

        const canvas = document.createElement('canvas');
        canvas.width = totalWidth;
        canvas.height = totalHeight;
        const ctx = canvas.getContext('2d');

        const clonedSankeySvg = cloneSvgWithStyles(sankeySvg);
        const clonedBarChartSvg = cloneSvgWithStyles(barChartSvg);

        const sankeyCanvas = await svg2canvas(clonedSankeySvg, sankeyWidth, sankeyHeight);
        ctx.drawImage(sankeyCanvas, 0, 0);

        const barChartCanvas = await svg2canvas(clonedBarChartSvg, barChartWidth, barChartHeight);
        ctx.drawImage(barChartCanvas, sankeyWidth, 0);

        const dataURL = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = 'combined.png';
        link.click();
    }
});


function updateSankey(sliderValue, colourScheme) {
    d3.select('svg').remove();
    d3.select("#bar-chart").remove();

    // define diagram constants
    const units = '%';
    const margin = {top: 10, right: 10, bottom: 10, left: 10};
    const width = 2000 - margin.left - margin.right;
    const height = 2000 - margin.top - margin.bottom;

    // zero decimal places
    const formatNumber = d3.format(',.2f') ;

    const format = d => `${formatNumber(d)} ${units}`;

    d3.select('#chart')
        .style('visibility', 'visible');

    // Add zoom behavior
    function zoomed() {
        svg.attr('transform', d3.event.transform);
    }

    const zoom = d3.zoom()
        .scaleExtent([1, 4]) // Define the minimum and maximum zoom scale
        .on('zoom', zoomed);

// append the svg canvas to the page
    const svg = d3.select('#chart').append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .call(zoom) // Add the zoom behavior here
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // set the sankey diagram properties
    const sankey = d3.sankey()
        .nodeWidth(100 * (sliderValue/10))
        .nodePadding(sliderValue)
        .size([width, height]);

    const path = sankey.link();

    // append a defs (for definition) element to your SVG
    const defs = svg.append('defs');

    // load the data
    d3.json('datasets/dataset_curated.json', (error, graph) => {
        sankey
            .nodes(graph.nodes)
            .links(graph.links)
            .layout(13); // any value > 13 breaks the link gradient

        // function used too generate random value for colour generation
        function getRandomInt(min, max) {
            min = Math.ceil(min);
            max = Math.floor(max);
            return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
        }

        // extract the node names from the JSON file (parsed through the graph)
        let nodeNames = [];
        let genColours = [];
        for (let i = 0; i < graph.nodes.length; i++) {
            nodeNames.push(graph.nodes[i]["name"]);

            const minValue = 0xF8D9AB;
            const maxValue = 0xCBEFE3;
            let randomValue = getRandomInt(minValue, maxValue + 1);
            let randomColor = "#" + randomValue.toString(16);

            genColours.push(randomColor);
        }

        if (colourScheme === 'staticModern'){
            //genColours = ['#2995bf','#185b7f','#fe007f']
            nodeNames.forEach((nodeName, i) => {
                if (i <= 10) {
                    genColours[i] = '#2995bf'; // blue
                } else if (i >= 11 && i <= 57) {
                    genColours[i] = '#185b7f'; // red
                } else if (i >= 58) {
                    genColours[i] = '#fe007f'; // pink
                }
            });
        } else if (colourScheme === 'valentineScheme') {
            genColours = ['#C118C7', '#E01FB3', '#FF66CC', '#FFA6E2', '#FFD6F3', '#DD9BFA']
        }

        // create scale of colors for the different node names
        const color = d3.scaleOrdinal()
            .domain(nodeNames)
            .range(genColours);

        // add in the links
        const link = svg.append('g').selectAll('.link')
            .data(graph.links)
            .enter().append('path')
            .attr('class', 'link')
            .attr('d', path)
            .style('stroke-width', d => Math.max(1, d.dy))
            .style('fill', 'none')
            .style('stroke-opacity', 0.18)
            .sort((a, b) => b.dy - a.dy)
            .on('mouseover', function () {
                d3.select(this).style('stroke-opacity', 0.5);
            })
            .on('mouseout', function () {
                d3.select(this).style('stroke-opacity', 0.2);
            });

        // add the link titles
        link.append('title')
            .text(d => `${d.source.name} → ${d.target.name}\n${format(d.value * 100)}`);

        // add in the nodes
        const node = svg.append('g').selectAll('.node')
            .data(graph.nodes)
            .enter().append('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${d.x},${d.y})`)
            .call(d3.drag()
                .subject(d => d)
                .on('start', function () {
                    this.parentNode.appendChild(this);
                })
                .on('drag', dragmove))
            .on('contextmenu', handleContextMenu) // Add the right-click event
            .on('mouseover', highlightNodeConnections) // Add the mouseover event for highlighting connections
            .on('mouseout', unhighlightNodeConnections); // Add the mouseout event for unhighlighting connections

        // add the rectangles for the nodes
        node.append('rect')
            .attr('height', d => d.dy)
            .attr('width', sankey.nodeWidth())
            .style('fill', d => {
                if (color.domain().indexOf(d.name) > -1) {
                    return d.color = color(d.name);
                } else {
                    return d.color = '#ccc';
                }
            })
            .append('title')
            .text(d => `${d.name}\n${format(d.value)}`);


        // add in the title for the nodes
        node.append('text')
            .attr('x', d => sankey.nodeWidth() / 2)
            .attr('y', d => d.dy / 2)
            .attr('dy', '.35em')
            .attr('text-anchor', 'middle')
            .attr('transform', null)
            .text(d => d.name)
            .style('fill', 'black')
            .style('font-size', '11px');

        // Determine the maximum x value among nodes
        const maxX = d3.max(graph.nodes, d => d.x);

        // add in the values for the nodes (only for the right-most nodes)
        node.filter(d => d.x === maxX)
            .append('text')
            .attr('x', d => sankey.nodeWidth() / 2)
            .attr('y', d => d.dy / 2 + 10)
            .attr('dy', '.35em')
            .attr('text-anchor', 'middle')
            .attr('transform', null)
            .text(d => format(d.value))
            .style('fill', 'black')
            .style('font-size', '11px');

        // add gradient to links
        link.style('stroke', (d, i) => {
            // make unique gradient ids
            const gradientID = `gradient${i}`;

            const startColor = d.source.color;
            const stopColor = d.target.color;


            const linearGradient = defs.append('linearGradient')
                .attr('id', gradientID);

            linearGradient.selectAll('stop')
                .data([
                    {offset: '10%', color: startColor},
                    {offset: '90%', color: stopColor}
                ])
                .enter().append('stop')
                .attr('offset', d => {
                    return d.offset;
                })
                .attr('stop-color', d => {
                    return d.color;
                });

            return `url(#${gradientID})`;
        })

        // the function for moving the nodes
        function dragmove(d) {
            d3.select(this).attr('transform',
                `translate(${d.x = Math.max(0, Math.min(width - d.dx, d3.event.x))},${d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))})`);
            sankey.relayout();
            link.attr('d', path);
        }

        function handleContextMenu(d, i) {
            function styleAxisColour(axisSelection, scale) {
                axisSelection.selectAll('text')
                    .style('fill', 'white')

                axisSelection.selectAll('path')
                    .style('stroke', 'white');

                axisSelection.selectAll('line')
                    .style('stroke', 'white');
            }

            function handleZoom() {
                const transform = d3.event.transform || d3.zoomIdentity;
                barSvg.attr('transform', transform.toString());
            }
            function handleMouseDown() {
                // Check if the middle mouse button (button code 1) is pressed
                if ((d3.event.button === 1) || (d3.event.button === 0 && d3.event.ctrlKey)) {
                    // Prevent the default behavior for the middle mouse button
                    d3.event.preventDefault();

                    // Reset the zoom to 100% (scale = 1) and call handleZoom with the identity transform
                    const transform = d3.zoomIdentity.scale(1.0);
                    zoom.transform(barSvgContainer, transform);
                }
            }
            
            // Prevent the default context menu from appearing
            d3.event.preventDefault();

            d3.select("#bar-chart").remove();                                                 // Remove any existing bar chart

            // Define bar chart dimensions and margins
            const barMargin = { top: 30, right: 20, bottom: 10, left: 150 };
            const barWidth = 1800 - barMargin.left - barMargin.right;
            const barHeight = 2000 - barMargin.top - barMargin.bottom;

            const barSvgContainer = d3.select("#chart").append("svg")
                .attr("id", "bar-chart")
                .attr("width", barWidth + barMargin.left + barMargin.right)
                .attr("height", barHeight + barMargin.top + barMargin.bottom);

            // Add the zoom behavior
            const zoom = d3.zoom().on('zoom', handleZoom);
            
            // Add the zoom behavior and mousedown event listener
            barSvgContainer.call(zoom);
            barSvgContainer.call(zoom).on('mousedown', handleMouseDown);

            const barSvg = barSvgContainer.append("g")
                .attr("transform", `translate(${barMargin.left},${barMargin.top})`);


            // Extract the incoming and outgoing values from the clicked node
            const incomingValues = d.targetLinks.map(link => ({
                category: link.source.name,
                value: link.value
            }));

            const outgoingValues = d.sourceLinks.map(link => ({
                category: link.target.name,
                value: link.value
            }));

            // Combine incoming and outgoing values into one dataset
            const barData = incomingValues.concat(outgoingValues);

            // Set up scales and axes
            const x = d3.scaleLinear().rangeRound([0, barWidth]);
            const y = d3.scaleBand().rangeRound([barHeight, 0]).padding(0.1);

            const xAxis = d3.axisTop(x);
            const yAxis = d3.axisLeft(y);

            x.domain([0, d3.max(barData, d => d.value)]);
            y.domain(barData.map(d => d.category));

            // Add the x-axis
            barSvg.append("g")
                .attr("class", "axis axis--x")
                .call(xAxis)
                .call(styleAxisColour);

            // Add the y-axis
            barSvg.append("g")
                .attr("class", "axis axis--y")
                .call(yAxis)
                .call(styleAxisColour);

            // Add the bars
            barSvg.selectAll(".bar")
                .data(barData)
                .enter().append("rect")
                .attr("class", "bar")
                .attr("y", d => y(d.category))
                .attr("x", 0)
                .attr("height", y.bandwidth())
                .attr("width", d => x(d.value));
        }

        function highlightNodeConnections(d) {
            // Highlight incoming links
            d.targetLinks.forEach(link => {
                svg.selectAll('.link')
                    .filter(l => l.source === link.source && l.target === link.target)
                    .style('stroke-opacity', 0.5);
            });

            // Highlight outgoing links
            d.sourceLinks.forEach(link => {
                svg.selectAll('.link')
                    .filter(l => l.source === link.source && l.target === link.target)
                    .style('stroke-opacity', 0.5);
            });
        }

        function unhighlightNodeConnections(d) {
            // Unhighlight incoming links
            d.targetLinks.forEach(link => {
                svg.selectAll('.link')
                    .filter(l => l.source === link.source && l.target === link.target)
                    .style('stroke-opacity', 0.2);
            });

            // Unhighlight outgoing links
            d.sourceLinks.forEach(link => {
                svg.selectAll('.link')
                    .filter(l => l.source === link.source && l.target === link.target)
                    .style('stroke-opacity', 0.2);
            });
        }
    });
}
