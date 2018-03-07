/*
Author: Harley Alexander - harley@sitepoint.com

Holds all the Javascript callbacks specified in day items

*/

var Callbacks = {

	dogsledLegsMovingTimeout: null,
	crankarmMovingTimeout: null,
	cssPrefixes: ["", "-moz-", "-ms-", "-o-", "-webkit-"],

	dogsled: function(dogsled){

		Callbacks.calcDogsledEndPos();
		$window.bind({
			'resize': Callbacks.calcDogsledEndPos,
			'scroll': Callbacks.dogSledMoving
		});

		Callbacks.setDogSledMovementDelay();
		Callbacks.addAnimationSettingListenerForDogsled();
	},

	addAnimationSettingListenerForDogsled: function() {
		config.bind("change", Callbacks.setDogSledMovementDelay);
	},

	setDogSledMovementDelay: function() {
		// TODO would be nicer to set the dog to position:fixed if no animation,
		// it would be less jerky. In this case 'the simplest thing that works'
		// won the day (with compromise to definition of the word 'works').
		if (config.get("do_animations")) {
			Callbacks.applyCss($("#dog-sled"), "transition", "left 5s ease-in-out");
		}
		else {
			Callbacks.applyCss($("#dog-sled"), "transition", "left 0s ease-in-out");
		}
	},

	applyCss: function($el, cssProperty, cssValue) {
		for (var i=0; i<Callbacks.cssPrefixes.length; i++) {
			var prefix = Callbacks.cssPrefixes[i];
			$el.css(prefix + cssProperty, cssValue);
		}
	},

	dogSledMoving: function () {

		var sled = $('.dogsled-fixed-to-screen');

		if(sled.length > 0){

			var sledStartOffset = $('#day-4 .inner').offset().left;
			var dayW = $('#day-4 .inner').width();
			var windowW = $(window).width();
			var side = (windowW - dayW) / 2;
			var scrollL = $window.scrollLeft();

			var sledLeft = scrollL - sledStartOffset + side + 100;

			var style = '<style type="text/css" id="sled-fixed-to-screen-style">#dog-sled.dogsled-fixed-to-screen{left: '+sledLeft+'px!important;}</style>';

			$('#sled-fixed-to-screen-style').remove();

			$('head').append(style);

			// Make the dog legs move while they catch up to the scroll
			if (config.get("do_animations")) {
				$('#dog-sled').addClass('dogs-legs-moving');
				clearTimeout(this.dogsledLegsMovingTimeout);
				var sled_animation_delay = 4000; // ms
				this.dogsledLegsMovingTimeout = setTimeout(function() { $('#dog-sled').removeClass('dogs-legs-moving'); }, sled_animation_delay);
			}
		}

	},

	calcDogsledEndPos: function(){

		if(Utils.elExists('#day-6')){

			var sledStartOffset = $('#day-4 .inner').offset().left;
			var sledEndOffset = $('#day-6 .inner').offset().left;
			var sledEndPos = sledEndOffset - sledStartOffset + 100;
			var style = '<style type="text/css" id="sled-fixed-to-end-postition-style">#dog-sled.dogsled-fixed-to-end{left: '+sledEndPos+'px!important;}</style>';

			$('#sled-fixed-to-end-postition-style').remove();

			$('head').append(style);

		}

	},

	trainCb: function(){

		Callbacks.calcTrainStuff();
		$window.bind({
			'resize': Callbacks.calcTrainStuff,

		});
		$window.scroll(Callbacks.trainMoving);

		Callbacks.setTrainMovementDelay();
		Callbacks.addAnimationSettingListenerForTrain();
		Callbacks.startSmokeListener();
	},

	addAnimationSettingListenerForTrain: function() {
		config.bind("change", Callbacks.setTrainMovementDelay)
	},

	setTrainMovementDelay: function() {
		// TODO would be nicer to set the dog to position:fixed if no animation,
		// it would be less jerky. In this case 'the simplest thing that works'
		// won the day (with compromise to definition of the word 'works').
		if (config.get("do_animations")) {
			Callbacks.applyCss($("#train"), "transition", "left 4s ease-in-out");
			var puff_content = stories.where({divId: "train-track"})[0].get("content");
			$("#train-track").html(puff_content);
			Callbacks.startSmokeListener()
		}
		else {
			Callbacks.applyCss($("#train"), "transition", "left 0s ease-in-out");
			$("#train-track").html("");
			clearInterval(Callbacks.puffEvents);
		}
	},

	calcTrainStuff: function(tracks){
		var maxDays = stories.maximum_day;
		var times = 3;

		var windowWidth = $(window).width();
		var innerWidth = $('#day-1 .inner').width();
		var margin = (windowWidth-innerWidth);

		var trackWidth = windowWidth*times;
		$('#train-track').width(trackWidth);

		if(Utils.elExists('#arrive-station')){

			var start_station_left = $('#express-station').offset().left;
			var end_station_left = $('#arrive-station').offset().left;

			var train_end_offset = end_station_left - start_station_left + 50;

			var style = '<style type="text/css" id="train-fixed-to-end-station-style">#train.train-fixed-to-end-station{left: '+train_end_offset+'px!important;}</style>';

			$('#train-fixed-to-end-station-style').remove();

			$('head').append(style);


		}

	},

	startSmokeListener: function() {
		// Waits till the smoke is at the top of it's rise, then sets the
		// visibility to hidden so when it goes back down on animation loop
		// it doesn't show yg at the old offset. The offset gets set after the
		// animation loop repeats, detected by a drop in height, and the smoke
		// is made visible so it can rise again, RIIIIIIISE.
		var smokeIsBillowing = false;
		var trainStackOffset = 0; //px
		var puffEvents = [];
		var previousPuffHeights = []
		setInterval(function() {
			var trainIsMoving = $(".train-fixed-to-screen").length > 0;
			if (trainIsMoving && !smokeIsBillowing) {
				smokeIsBillowing = true;
				$(".puff").each(function(i,e) {
					var puffEvent = setInterval(function() {
						var puff = $(e);
						var puffPosition = puff.position();
						var puffHeight = puffPosition.top; // -210 to -410
						var previousPuffHeight = previousPuffHeights[i];
						if (puffHeight < -400) { // Sad little magic number
							puff.css("visibility", "hidden");
						}
						if (puffHeight > previousPuffHeight) {
							puff.css("left", ($("#train").position().left + trainStackOffset) + "px");
							puff.css("visibility", "visible");
						}
						previousPuffHeights[i] = puffHeight;
					}, 50);
					puffEvents.push(puffEvent);
				});
			}
			else if (!trainIsMoving && smokeIsBillowing) {
				smokeIsBillowing = false;
				for (var i=0; i<puffEvents.length; i++) {
					clearInterval(puffEvents[i]);
				}
				puffEvents = [];
			}
		}, 50);
	},

	trainMoving: function () {

		var train = $('.train-fixed-to-screen');

		if(train.length > 0){

			var tStartOffset = $('#day-7 .inner').offset().left;
			var dayW = $('#day-7 .inner').width();
			var windowW = $(window).width();
			var side = (windowW - dayW) / 2;
			var scrollL = $window.scrollLeft();

			var tLeft = scrollL - tStartOffset + side + 200;

			var style = '<style type="text/css" id="train-fixed-to-screen-style">#train.train-fixed-to-screen{left: '+tLeft+'px!important;}</style>';

			$('#train-fixed-to-screen-style').remove();

			$('head').append(style);

			// Make the crank arm move while the train catches up to the scroll
			$('#train').addClass('crankarm-moving');
			clearTimeout(this.crankarmMovingTimeout);
			var train_animation_delay = 4000; // ms
			this.crankarmMovingTimeout = setTimeout(function() { $('#train').removeClass('crankarm-moving'); }, train_animation_delay);
		}
	},

	water: function(){

		Callbacks.calcWaterWidth();
		$window.bind({
			'resize': Callbacks.calcWaterWidth,

		});

	},

	calcWaterWidth: function(water){

		var windowWidth = $(window).width();
		var waterWidth = windowWidth*3;

		$('#water').width(waterWidth);
		$('#hide-background-for-water').width(waterWidth + 400);

	},

	slideLength: function(){

		Callbacks.calcSlideLength();
		$window.bind({
			'resize': Callbacks.calcSlideLength,

		});

	},

	calcSlideLength: function(){

		if(Utils.elExists('#water')){

			var slideLeft = $('#slide .slide').offset().left;
			var waterLeft = $('#water').offset().left;
			var slideLength = waterLeft - slideLeft;

			var style = '<style type="text/css" id="slide-length-style">#slide{width: '+slideLength+'px!important;}</style>';

			$('#slide-length-style').remove();

			$('head').append(style);


		}

	}




}
