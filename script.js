/*
#-----------------------------------------------------------------------------------------STUDENT INFO----------------------------------------------------------------------------------------------
# Student Name: Ciprian-Florin Ifrim
# Student Number: 21202592
# Date: 04/2023

#-------------------------------------------------------------------------------------REFERENCES & RESEARCH-----------------------------------------------------------------------------------------
# Note: Coursework project code for KCL Simulation and Data Analysis
# References: 
        Stackoverflow: https://stackoverflow.com/questions/18824684/how-do-i-hide-the-text-labels-in-d3-when-the-nodes-are-too-small
        Stackoverflow: https://stackoverflow.com/questions/46005546/d3-v4-get-current-zoom-scale
        Stackoverflow: https://stackoverflow.com/questions/69400340/d3-shift-color-scheme-to-pastels
        Stackoverflow: https://stackoverflow.com/questions/46982376/how-to-change-alignment-of-nodes-in-a-sankey-diagram-using-d3
        Stackoverflow: https://stackoverflow.com/questions/47054789/d3-sankey-diagram-changing-the-link-color-and-moving-the-node
        Stackoverflow: https://stackoverflow.com/questions/64588912/d3-sankey-display-by-groups-and-drag-doesnt-work
        Stackoverflow: https://stackoverflow.com/questions/47005388/change-color-of-links-for-sankey-diagram-in-d3-javascript
#		GitHub: https://gist.github.com/d3noob/c2637e28b79fb3bfea13
#		GitHub: https://gist.github.com/micahstubbs/3c0cb0c0de021e0d9653032784c035e9#file-data-json-L72
        YouTube: https://www.youtube.com/watch?v=htGfnF1zN4g

*/


// script.js
// HERE IS THE CODE FOR THE BACKGROUND GRADIENT
let isRadial = false;
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
const slider1 = document.getElementById('range1');
const slider2 = document.getElementById('range2');
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
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            processWorkbook(workbook);
        };
        reader.readAsArrayBuffer(file);
    }
});

function saveJSONData(jsonData, fileName) {
    const jsonString = JSON.stringify(jsonData, null, 2);
    const fileBlob = new Blob([jsonString], { type: 'application/json' });
    const fileUrl = URL.createObjectURL(fileBlob);

    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function processWorkbook(workbook) {
    // Get the first sheet in the workbook
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Select specific rows and columns
    const rows = [...Array(289 - 281).keys()].map(i => i + 281); // Select rows 281 to 289
    const cols = [...Array(56 - 3).keys()].map(i => XLSX.utils.encode_col(i + 2)); // Select columns C to BD

    // Create a dataframe-like structure from the selected rows and columns
    const cellData = rows.map(row => cols.map(col => sheet[col + row]?.v));
    const rowNames = rows.map(row => sheet['A' + row]?.v);

    // Process the data and create the JSON object
    const jsonData = processData(cellData, rowNames);
    //console.log(jsonData);
    //updateSankey(slider1.value, slider2.value, selectedColorScheme, jsonData);                                           // pass the processed json to d3 sankey (has issues)

    // Save JSON data as a file and prompt the user to choose a location
    saveJSONData(jsonData, 'curated_dataset.json');
}

function processData(cellData, rowNames) {
    // Prepare the DataFrame structure
    const df = cellData.slice(1).map((row, index) => {
        return { index: rowNames[index + 1], data: row };
    });

    // Update column names
    df.forEach((row, rowIndex) => {
        row.data.forEach((value, colIndex) => {
            if (value === null) {
                row.data[colIndex] = df[0].data[colIndex - 1];
            }
        });
    });

    // Define the hardcoded column names
    const hardcodedColumnNames = [
        "Female", "Male", "18-24", "25-34", "35-49", "50-54", "65+", "18-34",
        "35+", "ABC1", "C2DE", "White", "Asian", "Black", "Other/Mixed",
        "Refused", "Inner London", "Outer London", "Employed", "Unemployed",
        "Full-Time", "Part-Time", "Student", "Retired", "Unoccupied",
        "Other[1]", "Self-Employed", "Private Sector", "Public Sector",
        "Charity Sector", "Other[2]", "Never Worked", "<20,000",
        "20,000-39,999", "40,000-69,999", ">70,000", "Unaware", "No answer",
        "Own w/ Part Own", "Own - Outright", "Own - Mortgage",
        "Own - Shared", "All Rent Types", "Rent - Landlord", "Rent - HA & LA",
        "Rent - LA", "Rent - HA", "Living w/ F&F", "Other[3]", "Limited",
        "Highly Limited", "Mildly Limited", "No Disabilities"
    ];

    // Update the first row of the DataFrame with hardcoded column names
    df[0].data = hardcodedColumnNames;

    // Prepare nodes and links for the JSON object
    const mainLabels = Array.from(new Set(df[0].data));
    const subLabels = df[0].data;
    const rowLabels = rowNames.slice(1, 6);
    const allLabels = mainLabels.concat(subLabels, rowLabels);

    const nodes = allLabels.map((name, index) => ({ node: index, name }));

    const links = [];
    df[0].data.forEach((item, idx) => {
        const value = df[5].data[idx];
        const colName = df[0].data[idx];
        let sourceIdx, targetIdx;

        for (const node of nodes) {
            if (node.name === colName) {
                sourceIdx = node.node;
            }
            if (node.name === item) {
                targetIdx = node.node;
            }
        }
        links.push({ source: sourceIdx, target: targetIdx, value });
    });

    df[0].data.forEach((item, idx) => {
        let sourceIdx;

        for (const node of nodes) {
            if (node.name === item) {
                sourceIdx = node.node;
                break;
            }
        }

        for (let i = 0; i < 5; i++) {
            const value = Math.round(df[5].data[idx] * df[1 + i].data[idx]);
            const targetIdx = 64 + i;
            links.push({ source: sourceIdx, target: targetIdx, value });
        }
    });

    // Return the JSON object
    return { nodes, links };
}

// FUNCTION TO CALL PYTHON SCRIPT WITH LOADED XLSX IN JAVASCRIPT AND PASSED AS JSON (has issues, leave commented)
// browsers have security measures enabled, therefore, javascript cannot just run external scripts
/*async function main() {
    const pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.18.1/full/' });

    // Install pandas
    await pyodide.loadPackage('pandas');

    // document selection code
    const fileInput = document.getElementById('fileInput');
    const fileUploadBtn = document.querySelector('.file-upload-btn');

    fileUploadBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) {
            // Read the XLSX file content
            const fileReader = new FileReader();
            fileReader.onload = async (e) => {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Convert workbook to JSON
                const workbookJson = {};
                workbook.SheetNames.forEach((sheetName) => {
                    workbookJson[sheetName] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
                });

                // Fetch the Python script
                const response = await fetch('test.py');
                const pythonScript = await response.text();
                const workbookDataJson = JSON.stringify(workbookJson).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
                console.log("Workbook data JSON:", workbookDataJson);
                // Run your Python script with the workbook data as input
                pyodide.runPython(`from js import window workbook_data_json = """${workbookDataJson}""" ${pythonScript}`);
            };
            fileReader.readAsArrayBuffer(file);
        }
    });
}

// Load the Pyodide library
(async () => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/pyodide/v0.18.1/full/pyodide.js';
    script.onload = () => main();
    document.body.appendChild(script);
})();*/

// Create event listeners for the input and select elements
slider1.addEventListener('input', (event) => {
    // remove current visualisation before generating the update
    updateSankey(event.target.value, slider2.value, selectedColorScheme);
});

slider2.addEventListener('input', (event) => {
    // remove current visualisation before generating the update
    updateSankey(slider1.value, event.target.value, selectedColorScheme);
});

// event listeners for the anchor elements
pastelRange.addEventListener('click', (event) => {
    event.preventDefault();
    selectedColorScheme = 'pastelRange';
    updateSankey(slider1.value, slider2.value, selectedColorScheme);
});

valentineScheme.addEventListener('click', (event) => {
    event.preventDefault();
    selectedColorScheme = 'valentineScheme';
    updateSankey(slider1.value, slider2.value, selectedColorScheme);
});

staticModern.addEventListener('click', (event) => {
    event.preventDefault();
    selectedColorScheme = 'staticModern';
    updateSankey(slider1.value, slider2.value, selectedColorScheme);
});

updateSankey(slider1.value, slider2.value, selectedColorScheme);

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

function toggleColour() {
    const currentColour = d3.select(".axis text").style("fill");
    const newColour = currentColour === "black" ? "white" : "black";
    d3.selectAll(".axis text").style("fill", newColour);
    d3.selectAll(".axis line").style("stroke", newColour);
    d3.selectAll(".axis path").style("stroke", newColour);
    d3.selectAll(".grid line").style("stroke", newColour);
    d3.selectAll(".grid path").style("stroke", newColour);
}

// Add event listener for the toggle button
document.getElementById("toggleColour").addEventListener("click", toggleColour);

function updateSankey(slider1Value, slider2Value, colourScheme, align, toggleSwitchValue) {
    d3.select('#alignment-dropdown').on('change', function () {
        const align = this.value;
        updateSankey(slider1Value, slider2Value, colourScheme, align, toggleSwitchValue);
    });
    
    const toggleSwitch = document.querySelector('#toggle');
    toggleSwitch.addEventListener('change', function () {
        updateSankey(slider1Value, slider2Value, colourScheme, align, this.checked);
    });
    
    d3.select('svg').remove();
    d3.select("#bar-chart").remove();

    // define diagram constants
    const units = '';
    const margin = {top: 10, right: 10, bottom: 10, left: 10};
    const width = 2000 - margin.left - margin.right;
    const height = 2000 - margin.top - margin.bottom;

    // zero decimal places
    const formatNum  = d3.format(',.0f') ;
    const formatPerc = d3.format(',.2f') ;
    
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
        .nodeWidth(slider1Value*2)
        .nodePadding(slider2Value/10)
        .size([width, height]);

    const path = sankey.link();

    // append a defs (for definition) element to your SVG
    const defs = svg.append('defs');
    
    // text smoothing with Gaussian Blur 
    var filter = defs.append("filter")
        .attr("id", "drop")
        .attr("height", "130%");

    filter.append("feGaussianBlur")
        .attr("in", "SourceGraphic")
        .attr("stdDeviation", .5)
        .attr("result", "blur");

    filter.append("feOffset")
        .attr("in", "blur")
        .attr("dx", 0)
        .attr("dy", 0)
        .attr("result", "offsetBlur");

    var feMerge = filter.append("feMerge");

    feMerge.append("feMergeNode")
        .attr("in", "offsetBlur")
    feMerge.append("feMergeNode")
        .attr("in", "SourceGraphic");

    // load the data
    d3.json('/datasets/dataset_curated.json', (error, graph) => {
        // Determine the maximum x value among nodes
        const maxX = d3.max(graph.nodes, d => d.x);

        // Create a custom sankey layout - this is the only way I've been able to set alignment in D3 V4 
        // V6 and over have an internal alignment function not available to me
        function customSankeyLayout(sankey, graph, align) {
            sankey.nodes(graph.nodes).links(graph.links).layout(13);

            if (align === "right" || align === "justified") {
                const maxX = d3.max(graph.nodes, d => d.x);
                const nodeColumns = {};

                graph.nodes.forEach(node => {
                    if (!nodeColumns[node.x]) {
                        nodeColumns[node.x] = [];
                    }
                    nodeColumns[node.x].push(node);
                });

                Object.keys(nodeColumns).forEach(column => {
                    nodeColumns[column].sort((a, b) => a.y - b.y);
                });

                graph.nodes.forEach(node => {
                    if (align === "right") {
                        node.x = maxX - node.x;
                    } else {
                        const proportion = node.x / maxX;
                        node.x = maxX * proportion;
                    }
                });
            }
        }

        customSankeyLayout(sankey, graph, align);

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
                } else if (i >= 11 && i <= 63) {
                    genColours[i] = '#185b7f'; // red
                } else if (i > 63) {
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

        // animation duration
        const tDuration = 1000; // 750 ms for each transition


// add in the links
        const link = svg.append('g').selectAll('.link')
            .data(graph.links)
            .enter().append('path')
            .attr('class', 'link')
            .attr('d', path)
            .style('stroke-width', d => Math.max(1, d.dy))
            .style('fill', 'none')
            .style('stroke-opacity', 0)
            .sort((a, b) => b.dy - a.dy)
            .on('mouseover', function() {
                d3.select(this).style('stroke-opacity', 0.7);
            })
            .on('mouseout', function() {
                d3.select(this).style('stroke-opacity', 0.3);
            });

// add transition to links
        link.transition()
            .duration(100) // set the duration of the transition
            .delay((d, i) => i * 20) // set a delay for each link based on its index
            .style('stroke-opacity', 0.3) // animate the stroke opacity from 0.18 to 0.8
            .style('stroke-width', d => Math.max(1, d.dy * 0.8)); // animate the stroke width based on the link's thickness

        // append text on mouse hover
        link.append('title')
            .text(function(d) {
                let val = d.target.value/d.source.value;
                if (val < 1) {
                    return `${d.source.name} → ${d.target.name}\n${formatNum(d.value)} (${formatPerc(d.target.value/d.source.value*100)}%)`;
                } else {
                    return `${d.source.name} → ${d.target.name}\n${formatNum(d.value)}`;
                }
            });

// create a closure function that takes in the highlightToggle variable
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
            .on('mouseout', d => unhighlightNodeConnections(d, toggleSwitchValue));                                                                                                      // Add the mouseout event for unhighlighting connections



        var nodesOfInterest = ["Very worried", "Fairly worried", "Not very worried",
            "Not at all worried", "Don\u2019t know"];

        var lastNodesSum = 0;
        sankey.links().forEach(function(link) {
            for (var i = 0; i < nodesOfInterest.length; i++) {
                if (link.source.name === nodesOfInterest[i] || link.target.name === nodesOfInterest[i]) {
                    lastNodesSum += link.value;
                    break;
                }
            }
        });

        // add the rectangles for the nodes
        node.append('rect')
            .attr('height', 0) // Set initial height to 0
            .attr('width', sankey.nodeWidth())
            .style('fill', d => {
                if (color.domain().indexOf(d.name) > -1) {
                    return d.color = color(d.name);
                } else {
                    return d.color = '#ccc';
                }
            })
            .append('title')
            .text(function(d) {
                if (d.x < (width - sankey.nodeWidth())) {
                    return `${d.name}\n${formatNum(d.value)}`;
                } else {
                    return `${d.name}\n${formatPerc(d.value/lastNodesSum*100)}%`;
                }
            } );



        // Animate the nodes by transitioning height
        node.select('rect')
            .transition()
            .duration(tDuration)
            .attr('height', d => d.dy);
        
        
        
        // add in the title for the nodes
        const nodeText = node.append('text')
            .attr('x', d => sankey.nodeWidth() / 2)
            .attr('y', d => d.dy / 2)
            .attr('dy', '.35em')
            .attr('text-anchor', 'middle')
            .attr('transform', null)
            .text(d => d.name)
            .style('fill', 'white')
            .style('font-size', '11px');

        // Hide the text if the box is smaller
        nodeText.each(function(d) {
            const textBBox = this.getBBox();
            const textWidth = textBBox.width;
            const textHeight = textBBox.height;
            const nodeWidth = sankey.nodeWidth();
            const nodeHeight = d.dy;

            if (textWidth > nodeWidth || textHeight > nodeHeight) {
                d3.select(this).attr("display", "none");
            }
        });

        // add in the values for the nodes (only for the right-most nodes)
        node.filter(d => d.x === maxX)
            .append('text')
            .attr('x', d => sankey.nodeWidth() / 2)
            .attr('y', d => d.dy / 2 + 7)
            .attr('dy', '.85em')
            .attr('text-anchor', 'middle')
            .attr('transform', null)
            .text(d => `${formatPerc(d.value/lastNodesSum*100)}%`)
            .style('fill', 'white')
            .style('font-size', '10px', 'bold');

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

        function highlightNodeConnections(d) {
            // Highlight incoming links
            d.targetLinks.forEach(link => {
                svg.selectAll('.link')
                    .filter(l => l.source === link.source && l.target === link.target)
                    .style('stroke-opacity', 0.7);
            });

            // Highlight outgoing links
            d.sourceLinks.forEach(link => {
                svg.selectAll('.link')
                    .filter(l => l.source === link.source && l.target === link.target)
                    .style('stroke-opacity', 0.7);
            });
        }

        function unhighlightNodeConnections(d, toggleSwitchValue) {
            const strokeOpacity = toggleSwitchValue ? 0.7 : 0.3;
            // Unhighlight incoming links
            if (d.targetLinks) {
                d.targetLinks.forEach(link => {
                    svg.selectAll('.link')
                        .filter(l => l.source === link.source && l.target === link.target)
                        .style('stroke-opacity', strokeOpacity);
                });
            }

            // Unhighlight outgoing links
            if (d.sourceLinks) {
                d.sourceLinks.forEach(link => {
                    svg.selectAll('.link')
                        .filter(l => l.source === link.source && l.target === link.target)
                        .style('stroke-opacity', strokeOpacity);
                });
            }

        }

        // Toggle color function
        function handleContextMenu(d, i) {

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

            // make grid lines for bar chart
            function make_x_gridlines() {
                return d3.axisBottom(x)
                    .ticks(5);
            }

            function make_y_gridlines() {
                return d3.axisLeft(y)
                    .ticks(5);
            }
            
            
            d3.event.preventDefault();                                                                                   // Prevent the default context menu from appearing
            d3.select("#bar-chart").remove();                                                                            // Remove any existing bar chart

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
                value: link.value,
                type: 'source'
            }));

            const outgoingValues = d.sourceLinks.map(link => ({
                category: link.target.name,
                value: link.value,
                type: 'target'
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
                .call(xAxis);

            // Add the y-axis
            barSvg.append("g")
                .attr("class", "axis axis--y")
                .call(yAxis);

            // Add the X gridlines
            barSvg.append("g")
                .attr("class", "grid grid-x")
                .attr("transform", "translate(0," + barHeight + ")")
                .call(make_x_gridlines()
                    .tickSize(-barHeight)
                    .tickFormat("")
                );

            // Add the Y gridlines
            barSvg.append("g")
                .attr("class", "grid grid-y")
                .call(make_y_gridlines()
                    .tickSize(-barWidth)
                    .tickFormat("")
                );

            function interpolateColor(color1, color2, factor) {
                const r = color1.r + factor * (color2.r - color1.r);
                const g = color1.g + factor * (color2.g - color1.g);
                const b = color1.b + factor * (color2.b - color1.b);

                return d3.rgb(r, g, b);
            }

            const minSourceColor = d3.rgb("#1f77b4");
            const maxSourceColor = d3.rgb("#0a3d7a"); // Darker shade of the source color
            const minTargetColor = d3.rgb("#ff7f0e");
            const maxTargetColor = d3.rgb("#b35806"); // Darker shade of the target color

            const maxSourceValue = d3.max(barData, d => d.type === 'source' ? d.value : 0);
            const maxTargetValue = d3.max(barData, d => d.type === 'target' ? d.value : 0);


            barSvg.selectAll(".bar")
                .data(barData)
                .enter().append("rect")
                .attr("class", d => d.type === 'source' ? "bar-source" : "bar-target")
                .attr("y", d => y(d.category))
                .attr("x", 0)
                .attr("height", y.bandwidth())
                .attr("width", d => x(d.value))
                .attr("fill", d => {
                    const factor = d.type === 'source' ? d.value / maxSourceValue : d.value / maxTargetValue;
                    const color = d.type === 'source' ? interpolateColor(minSourceColor, maxSourceColor, factor) :
                        interpolateColor(minTargetColor, maxTargetColor, factor);
                    return color;
                });

            d3.selectAll(".axis text").style("fill", 'white');
            d3.selectAll(".axis line").style("stroke", 'white');
            d3.selectAll(".axis path").style("stroke", 'white');
        }

    });
}
