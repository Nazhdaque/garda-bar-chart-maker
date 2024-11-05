import Chart, { scales } from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { FetchWrapper, getCustomPropsValues } from "./helpers.js";
import { getNav } from "./getNav.js";
import { slide, chartSection, li } from "./html.js";
import { render } from "lit-html";

let palette = [
	"#0bbafa",
	"#b657ff",
	"#0081cc",
	"#863dc6",
	"#b7d8fe",
	"#dfb5ff",
	"#f9b232",
	"#1cbab3",
	"#a4897a",
];

const mobile = 576;
const altMode = [1];

const toggleMode = (std, alt, mode) => (mode ? alt : std);

const swapImages = (img, theme = "white") => {
	let alt = "";
	theme !== "black"
		? (alt = img.replace("-w.", "-b."))
		: (alt = img.replace("-b.", "-w."));
	return alt;
};

const toggleLogo = theme => {
	document
		.querySelectorAll(".brand-logo img")
		.forEach(item => item.setAttribute("src", swapImages(item.src, theme)));
};

const getTheme = () => document.documentElement.getAttribute("data-theme");

const setTheme = theme => {
	document.documentElement.setAttribute("data-theme", theme);
	toggleLogo(theme);
};

const toggleTheme = theme =>
	theme !== "black" ? setTheme("black") : setTheme("white");

const setChartTheme = chart => {
	const gridColor = getCustomPropsValues(
		["--clr-grid"],
		document.querySelector(".chart")
	);
	chart.config.options.scales.x.grid.color = gridColor;
	chart.config.options.scales.y.grid.color = gridColor;

	chart.update();
};

const getPairs = (legends, values, total) => {
	const pairs = {};

	// if (items)
	// 	for (const [i, key] of items.entries())
	// 		pairs[key] = (values[i][0] * 100) / values[i][1];

	if (legends)
		legends.forEach((key, i) => (pairs[key] = (values[i] * 100) / total[i]));

	return pairs;
};

const sortPairs = items => {
	const pairs = new Map();
	Object.keys(items)
		.sort((a, b) => items[a] - items[b])
		.forEach(key => pairs.set(key, items[key]));
	return pairs;
};

const sortDescending = json => {
	const values = [];
	const sortedJson = [];
	json.forEach(dataset => {
		const { title, values: vals, total, legends } = dataset;
		const sortedDataset = {
			title,
			values: [],
			legends: [],
		};

		for (const [legend, value] of sortPairs(getPairs(legends, vals, total))) {
			sortedDataset.values.unshift(Number.parseInt(value, 10));
			sortedDataset.legends.unshift(legend);
		}

		sortedJson.push(sortedDataset);
		values.push(sortedDataset.values);
	});

	return {
		sortedJson,
		values,
	};
};

const getSlides = (json, sections) => {
	const slides = [];

	json.forEach(dataset => slides.push(slide()));
	render(slides, document.querySelector(".main-content"));

	document
		.querySelectorAll(".slide")
		.forEach((slide, i) => render(sections[i], slide));

	document
		.querySelectorAll(".toggle")
		.forEach(toggle =>
			toggle.addEventListener("click", () => toggleTheme(getTheme()))
		);
};

const getSections = sortedData => {
	const legends = [];
	const sections = [];
	const colors = [...palette];

	sortedData.sortedJson.forEach((entry, index) => {
		const { title, values, legends: descrs } = entry;
		const chartLegends = [];
		values.forEach((value, i) => {
			value === sortedData.values[index][i - 1] &&
				palette.splice(i, palette[i], palette[i - 1]);
			chartLegends.push(li(palette, value, descrs[i], i));
		});
		legends.push(chartLegends);
		sections.push(chartSection(title, legends[index], index));
		palette = [...colors];
	});

	return sections;
};

const chartData = (items, slides, index) => {
	const values = [];
	const legends = [];
	const colors = [getCustomPropsValues(["--clr-solid"])];

	items.forEach((item, i) => {
		const { value, color } = item.dataset;
		legends.push(item.textContent);
		values.push(Number.parseFloat(value, 10));
		colors.splice(i, colors[i], color);
		item.style.setProperty("--segment-color", color);
	});
	return { values, colors, legends };
};

const API = new FetchWrapper("data/");
const getChartData = async () => {
	const json = await API.get("charts-data.json");
	const sortedData = sortDescending(json);
	const sections = getSections(sortedData);

	getSlides(json, sections);
	getNav();

	const data = [];
	const canvas = [];

	document.querySelectorAll(".chart").forEach((item, i) => {
		data.push(
			chartData(
				item.querySelectorAll(".chart-legend > *"),
				document.querySelectorAll(".slide"),
				i
			)
		);
		canvas.push(item.querySelector(".chart canvas"));

		const toggleTheme = {
			id: "toggleTheme",
			beforeDatasetsDraw(chart) {
				setChartTheme(chart);
			},
		};

		// const fontSettings = ctx => {
		// 	return {
		// 		family: "Proxima Nova",
		// 		size: window.outerWidth <= mobile ? ctx.chart.width / 28 : 22,
		// 		weight: window.outerWidth <= mobile ? 400 : 700,
		// 	};
		// };

		let mode;
		const modeHandler = slideNumbers => {
			slideNumbers.forEach(num => {
				if (num === i) {
					mode = 1;
					item.classList.add("alt");
				}
			});
		};
		modeHandler(altMode);

		const config = {
			type: "bar",
			plugins: [toggleTheme, toggleMode(0, ChartDataLabels, mode)],
			options: {
				scales: {
					x: {
						ticks: {
							color: getCustomPropsValues(["--clr-solid"]),
							callback: value => `${value}%`,
							display: false,
						},
					},
					y: {
						ticks: {
							font: ctx => {
								return {
									family: "Proxima Nova",
									size: window.outerWidth <= mobile ? ctx.chart.width / 28 : 22,
									weight: window.outerWidth <= mobile ? 400 : 700,
								};
							},
							color: data[i].colors,
							callback: function (value) {
								return `${
									this.getLabelForValue(value) + toggleMode("%", "", mode)
								}`;
							},
						},
					},
				},
				indexAxis: "y",
				animations: { colors: false },
				plugins: {
					tooltip: { enabled: false },
					legend: { display: false },
					colors: { enabled: true },
					datalabels: {
						anchor: "end",
						align: "end",
						formatter: value => value + "%",
						font: ctx => {
							return {
								family: "Proxima Nova",
								size: window.outerWidth <= mobile ? ctx.chart.width / 28 : 22,
								weight: window.outerWidth <= mobile ? 400 : 700,
							};
						},
						color: data[i].colors,
					},
				},
				maintainAspectRatio: false,
				layout: {
					padding: {
						top: toggleMode(window.outerWidth <= mobile && 0, 25, mode),
						left: toggleMode(50, 0, mode),
						right: 50,
						bottom: toggleMode(window.outerWidth <= mobile && 0, 0, mode),
					},
				},
			},

			data: {
				labels: toggleMode(data[i].values, data[i].legends, mode),
				datasets: [
					{
						data: data[i].values,
						backgroundColor: data[i].colors,
					},
				],
			},
		};

		new Chart(canvas[i], config);
	});
};

getChartData();

// [
// 	[610, 1000],
// 	[377, 1000],
// 	[233, 1000],
// 	[144, 1000],
// 	[144, 1000],
// 	[89, 1000],
// 	[55, 1000],
// 	[34, 1000],
// 	[987, 1000]
// ],
