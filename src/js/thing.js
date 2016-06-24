// NPM modules
var $ = require('jquery');
var d3 = require('d3');
var request = require('d3-request');
var _ = require('lodash');
var rangeslider = require('rangeslider.js');

// Local modules
var features = require('./detectFeatures')();
var fm = require('./fm');
var utils = require('./utils');

// Globals
var DEFAULT_WIDTH = 940;
var MOBILE_BREAKPOINT = 600;

var BUCKETS = [
    [0, 17],
    [18, 24],
    [25, 49],
    [50, 64],
    [65, 100]
]

var indexData = null;
var ukData = {};
var isMobile = false;
var ages = [];

/**
 * Initialize the graphic.
 *
 * Fetch data, format data, cache HTML references, etc.
 */
function init() {
	for (var i = 0; i <= 100; i++) {
		ages.push(i)
	}

	request.json('data/countries/826.json', function(error, data) {
		ukData = [];

		for (var b = 0; b < BUCKETS.length; b++) {
			ukData.push([0, 0]);
		}

		for (var i = 0; i <= 100; i++) {
			var m = data[2016][i][0];
			var f = data[2016][i][1];

			for (var b = 0; b < BUCKETS.length; b++) {
				var x0 = BUCKETS[b][0];
				var x1 = BUCKETS[b][1];

				if (i >= x0 && i <= x1) {
					ukData[b][0] += m;
					ukData[b][1] += f;

					break;
				}
			}
		}

		render();

		$(window).resize(utils.throttle(onResize, 250));
	});
}

/**
 * Respond to browser resize.
 */
function onResize() {
    render();
}

/**
 * Figure out the current frame size and render the graphic.
 */
function render() {
	var width = $('#interactive-content').width();

	if (width <= MOBILE_BREAKPOINT) {
		isMobile = true;
	} else {
		isMobile = false;
	}

	renderGraphic({
		container: '#uk',
		width: width,
		data: ukData
	});

	// Inform parent frame of new height
	fm.resize()
}

/*
 * Render the graphic.
 */
function renderGraphic(config) {
	// Configuration
	var aspectRatio = 1;

	var margins = {
		top: 30,
		right: 30,
		bottom: 50,
		left: 60
	};

	// Calculate actual chart dimensions
	var width = config['width'];
	var height = width / aspectRatio;

	var chartWidth = width - (margins['left'] + margins['right']);
	var chartHeight = height - (margins['top'] + margins['bottom']);

	// Clear existing graphic (for redraw)
	var containerElement = d3.select(config['container']);
	containerElement.html('');

	// Create the root SVG element
	var chartWrapper = containerElement.append('div')
		.attr('class', 'graphic-wrapper');

	var chartElement = chartWrapper.append('svg')
		.attr('width', chartWidth + margins['left'] + margins['right'])
		.attr('height', chartHeight + margins['top'] + margins['bottom'])
		.append('g')
		.attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

	/*
	 * Create D3 scales
	 */
	var xScale = d3.scale.linear()
		.domain([-12000, 12000])
		.range([0, chartWidth]);

	var yScale = d3.scale.ordinal()
		.domain(_.range(BUCKETS.length))
		.rangeBands([0, chartWidth]);

	/*
	 * Create D3 axes.
	 */
	var xAxis = d3.svg.axis()
		.scale(xScale)
		.orient('bottom')
		.ticks(isMobile ? 5 : 7)
		.tickFormat(function(d, i) {
			if (d == 0) {
				return d;
			}

			return Math.abs(d) / 1000 + 'm';
		});

	var yAxis = d3.svg.axis()
		.scale(yScale)
		.orient('left')
		.tickFormat(function(d, i) {
			var bucket = BUCKETS[i];

			if (bucket[1] == 100) {
				return '65+';
			}

			return bucket[0] + "-" + bucket[1];
		});

	/*
	 * Render axes to chart.
	 */
	xAxisElement = chartElement.append('g')
		.attr('class', 'x axis')
		.attr('transform', utils.makeTranslate(0, chartHeight))
		.call(xAxis);


	chartElement.append('g')
	   .attr('class', 'y axis')
	   .call(yAxis);

	/*
	 * Render grid to chart.
	 */
	var xAxisGrid = function() {
		return xAxis;
	};

	xAxisElement.append('g')
		.attr('class', 'x grid')
		// .attr('transform', utils.makeTranslate(0, chartHeight))
		.call(xAxisGrid()
			.tickSize(-chartHeight, 0)
			.tickFormat('')
		);

	/*
	 * Render bars to chart.
	 */
	var genders = ['male', 'female'];

	for (var gender in genders) {
		var direction = (gender == 0) ? -1 : 1;

		chartElement.append('g')
			.attr('class', 'bars')
			.selectAll('rect')
			.data(config['data'])
			.enter()
			.append('rect')
				.attr('x', function(d) {
					var x = d[gender] * direction;

					if (x >= 0) {
						return xScale(0);
					}

					return xScale(x);
				})
				.attr('width', function(d) {
					var x = d[gender] * direction;

					return Math.abs(xScale(0) - xScale(x));
				})
				.attr('y', function(d, i) {
					return yScale(i);
				})
				.attr('height', yScale.rangeBand())
				.attr('class', function(d) {
					var cls = 'age-' + d + ' gender-' + genders[gender];

					return cls;
				});
	}

	chartElement.append('text')
        .attr('class', 'left')
        .attr('x', xScale(0) - 5)
        .attr('y', -5)
        .attr('text-anchor', 'end')
        .text('◀ Men');

    chartElement.append('text')
        .attr('class', 'left')
        .attr('x', xScale(0) + 5)
        .attr('y', -5)
        .text('Women ▶');
}


// Bind on-load handler
$(document).ready(function() {
	init();
});
