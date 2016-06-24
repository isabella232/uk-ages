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

var PLAYBACK_SPEED = 100;
var FIRST_YEAR = 2017;
var LAST_YEAR = 2050;

var indexData = null;
var ukData = {};
var isMobile = false;
var ages = [];
var year = FIRST_YEAR;

var playbackYear = FIRST_YEAR;
var isPlaying = false;
var hasPlayed = false;
var restarting = false;

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
		ukData = data;

		initSlider();
		renderAll();
		d3.select('.play').on('click', onPlayButtonClicked);

		$(window).resize(utils.throttle(onResize, 250));
	});
}

function initSlider() {
	d3.select('.slider').append('input')
		.attr('type', 'range')
		.attr('min', FIRST_YEAR)
		.attr('max', LAST_YEAR)
		.attr('value', playbackYear)

	$('input[type="range"]').rangeslider().on('change', onYearSlide);
}

/**
 * Respond to browser resize.
 */
function onResize() {
    if (!isPlaying) {
        renderAll();
    }
}

function onPlayButtonClicked() {
    d3.event.preventDefault();

    if (playbackYear == LAST_YEAR) {
        restarting = true;
    }

    playbackYear = FIRST_YEAR;
    isPlaying = true;
    renderAll();
}

function onYearSlide() {
	playbackYear = d3.select(this).node().value.toString();

	renderAll();
}

/**
 * Calculate the max value in this country dataset.
 */
function calculateMax(data) {
	var m = 0;

	for (var year in data) {
		var ages = data[year];

		for (var i in ages) {
			m = Math.max(m, ages[i][0], ages[i][1]);
		}
	}

	return m;
}

/**
 * Invoke on resize. Rerenders the graphics
 */
function renderAll() {
	var width = $('#interactive-content').width();

	if (width <= MOBILE_BREAKPOINT) {
		isMobile = true;
	} else {
		isMobile = false;
	}

	if (isPlaying) {
        // Don't immediately advance if just showing first year
        if (restarting) {
            restarting = false;
        } else {
            playbackYear = playbackYear + 1;

            if (playbackYear == LAST_YEAR) {
                isPlaying = false;
                hasPlayed = true;
            }
        }
    }

	d3.select('.year').text(playbackYear);
	$('input[type="range"]').val(playbackYear);

	var men = 0;
	var women = 0;
	var total_men = 0;
	var total_women = 0;

	for (var y = 0; y <= 100; y++) {
		total_men += ukData[playbackYear][y][0] * 1000;
		total_women += ukData[playbackYear][y][1] * 1000;

		if ((2016 - playbackYear) + y < 18) {
			men += ukData[playbackYear][y][0] * 1000;
			women += ukData[playbackYear][y][1] * 1000;
		}
	}

	d3.select('.count-men').text(men);
	d3.select('.count-women').text(women);
	d3.select('.pct-men').text(Math.round(men / total_men * 100));
	d3.select('.pct-women').text(Math.round(men / total_men * 100));

	render('#uk', ukData[playbackYear]);

	if (isPlaying) {
		_.delay(renderAll, PLAYBACK_SPEED);
	}
}

/**
 * Figure out the current frame size and render the graphic.
 */
function render(container, data, highlightAge) {
	var width = $(container).width();

	renderGraphic({
		container: container,
		width: width,
		data: data,
		highlightAge: highlightAge
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
		top: 10,
		right: 30,
		bottom: 50,
		left: 50
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
		.domain([-500, 500])
		.range([0, chartWidth]);

	var yScale = d3.scale.ordinal()
		.domain(ages)
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

			return d + ',000';
		});

	var yAxis = d3.svg.axis()
		.scale(yScale)
		.orient('left')
		.tickFormat(function(d, i) {
			var interval = isMobile ? 20 : 10;

			if (i % interval == 0) {
				if (i == 100) {
					return 100 + '+';
				}

				return d;
			}

			return null;
		});

	/*
	 * Render axes to chart.
	 */
	chartElement.append('g')
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

	chartElement.append('g')
		.attr('class', 'x grid')
		.attr('transform', utils.makeTranslate(0, chartHeight))
		.call(xAxisGrid()
			.tickSize(-chartHeight, 0, 0)
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
			.data(ages)
			.enter()
			.append('rect')
				.attr('x', function(d) {
					var x = config['data'][d][gender] * direction;

					if (x >= 0) {
						return xScale(0);
					}

					return xScale(x);
				})
				.attr('width', function(d) {
					var x = config['data'][d][gender] * direction;

					return Math.abs(xScale(0) - xScale(x));
				})
				.attr('y', function(d) {
					return yScale(d);
				})
				.attr('height', yScale.rangeBand())
				.attr('class', function(d) {
					var cls = 'age-' + d + ' gender-' + genders[gender];

					if ((2016 - playbackYear) + d < 18) {
						cls += ' highlight';
					}

					return cls;
				});
	}
}


// Bind on-load handler
$(document).ready(function() {
	init();
});
