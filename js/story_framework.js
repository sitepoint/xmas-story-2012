/*
Author: Ian Coleman - ian.coleman@sitepoint.com

Handles the display of the storyline

*/


var Story = Backbone.Model.extend({
	defaults: {
		start_time: 0,
		end_time: 0
	}
});

var Story_Collection = Self_Fetching_Collection.extend({
	model: Story,
	url: "/data/stories.json",
	init: function() {
		this.maximum_day = _.max(this.pluck("day"));

		this.animated_class_name = "animated";

		// display_story() will be called from navigation_framework once sale_periods
		// has also loaded.
	},
	toggle_animations: function() {
		if (this.do_animations) {
			this.add_animation_classes_to_correct_days();
		}
		else {
			$(".day .inner").removeClass(this.animated_class_name);
		}
	},
	display_story: function() {
		// Called from navigation_framework because it depends on sale_periods
		// having been loaded.

		var collection = this;
		this.day_divs = [];

		
		// TODO line below depends on sale_periods, it's a bit messy
		this.total_days_to_display = _.max([sale_periods.total_days_to_display, this.maximum_day]);
		//console.log(this.total_days_to_display + " " + sale_periods.total_days_to_display + " " + this.maximum_day);

		this.set_page_size();

		var $days = $("#days");
		var day_div_height = $window.height() - $("footer").height();
		var day_div_width = $window.width();
		for (var i=0; i<this.total_days_to_display; i++) {
			var day_div = $("<div class='day' id='day-" + (i+1) + "'><div class='inner'></div></div>");
			day_div.height(day_div_height).width(day_div_width);
			$days.append(day_div);
			this.day_divs.push(day_div.find(".inner"));
		}
		this.each(function(story) {
			var story_ui = new Story_View({model: story});
			var day_index = Math.floor(story.get("day")-1);
			collection.day_divs[day_index].append(story_ui.el);
		});

		this.listen_for_animations();
		this.init_page_scroll_position();

		if (config.get("do_animations")) {
			this.add_animation_classes_to_correct_days();
		}

	},
	listen_for_animations: function() {
		// Add the animate class to this day and the day after it so that not
		// all the days are animating for no particular reason.
		var view = this;
		$document.scroll(function() {
			if (window.day_of_sale != view.currently_displayed_story_day &&
				view.do_animations) {
				view.add_animation_classes_to_correct_days();
				view.currently_displayed_story_day = window.day_of_sale;
			}
		});
	},
	add_animation_classes_to_correct_days: function() {
		var previous_day_index = window.day_of_sale-2;
		var current_day_index = window.day_of_sale-1;
		var next_day_index = window.day_of_sale;
		$(".day .inner").removeClass(this.animated_class_name);
		$(".day .inner:eq(" + current_day_index + ")").addClass(this.animated_class_name);
		$(".day .inner:eq(" + next_day_index + ")").addClass(this.animated_class_name);
		if (previous_day_index > -1) {
			$(".day .inner:eq(" + previous_day_index + ")").addClass(this.animated_class_name);
		}
	},
	/*init_background: function() {
		$('#hemisphere').attr('href', 'css/north.css'); // TODO should be right from default
	},*/
	init_page_scroll_position: function() {

		// TODO this contains some navigation code, would be good to return
		// those pieces of code to the nav framework

		var day_number = parseInt(window.location.hash.replace("#day/", ""));
		// scroll to the appropriate day - predefined or latest
		if (isNaN(day_number)) {
			var is_story_only = config.get("is_story_only");
			day_number = is_story_only ? 1 : stories.total_days_to_display;
			//console.log("No day specified - will move to last day");
		}

		//$body.scrollLeft($window.scrollLeft()); // Without this the first
		// animation will start from 0, since $body scrollLeft does not match
		// $window scrollLeft... strange but true.

		nav_bar.move_to_day(day_number, false);
	},
	set_page_size: function() {
		var daysWidth = (stories.total_days_to_display) * $window.width();
		var daysHeight = $window.height() - $("footer").height();
		$('#days').width(daysWidth).height(daysHeight);
		$(".day").height(daysHeight);
		$(".day").width($window.width());
	}
});


var Story_View = Backbone.View.extend({
	initialize: function() {
		this.add_element_to_storyline();
	},
	add_element_to_storyline: function() {
		this.set_id();
		this.set_content();
		this.start_scroll_listener();
	},
	set_id: function() {
		this.$el.attr("id", this.model.get("divId"));
	},
	set_content: function() {
		var story_el_content = this.model.get("content");
		if (story_el_content) {
			this.$el.html(story_el_content);
		}
	},
	start_scroll_listener: function() {
		var display_rules = this.model.get("displayRules");
		if (display_rules) {
			for (var i=0; i<display_rules.length; i++) {
				this.add_scroll_listener(display_rules[i]);
			}
		}
	},
	add_scroll_listener: function(rule) {
		var this_rule = new rule_evaluator(rule, this.$el);
		$document.scroll(this_rule.evaluate);
	}
});

var stories = new Story_Collection();




function rule_evaluator(rule, $el) {
	var is_currently_active = false;
	var parsed_rule = parse_rule();
	
	function parse_rule() {
		var parsed_rule = {
			triggers: [],
			classes_to_add: [],
			classes_to_remove: [],
			callbacks: []
		};
		var trigger_functions = {
			"lt": function(x,y) { return x < y },
			"lte": function(x,y) { return x <= y },
			"gt": function(x,y) { return x > y },
			"gte": function(x,y) { return x >= y }
		};
		for (var key in rule) {
			var value = rule[key];
			if (key in trigger_functions) {
				parsed_rule.triggers.push({
					"fn": trigger_functions[key],
					"val": value
				});
			}
			else if (key == "addClass") {
				add_value_to_array(value, parsed_rule.classes_to_add);
			}
			else if (key == "removeClass") {
				add_value_to_array(value, parsed_rule.classes_to_remove);
			}
			else if (key == "callback") {
				add_value_to_array(value, parsed_rule.callbacks);
			}
		}
		return parsed_rule;
	};

	function add_value_to_array(value, array) {
		if (Object.prototype.toString.call(value) == "[object String]" ||
			Object.prototype.toString.call(value) == "[object Number]") {
			array.push(value);
		}
		else if (Object.prototype.toString.call(value) == "[object Array]") {
			for (var i=0; i<value.length; i++) {
				array.push(value[i]);
			}
		}
	};

	function test_if_should_be_active() {
		var should_be_active = true;
		for (var i=0; i<parsed_rule.triggers.length; i++) {
			var fn = parsed_rule.triggers[i].fn;
			var val = parsed_rule.triggers[i].val;
			should_be_active = should_be_active && fn(window.day_of_sale_fractional, val);
			if (!should_be_active) {
				break;
			}
		}
		return should_be_active;
	};

	function apply_actions() {
		for (var i=0; i<parsed_rule.classes_to_add.length; i++) {
			var class_to_add = parsed_rule.classes_to_add[i];
			$el.addClass(class_to_add);
			//console.log("adding class '." + class_to_add + "' to element '#" + $el.attr("id") + "'");
		}
		for (var i=0; i<parsed_rule.classes_to_remove.length; i++) {
			var class_to_remove = parsed_rule.classes_to_remove[i];
			$el.removeClass(class_to_remove);
			//console.log("removing class '." + class_to_remove + "' from element '#" + $el.attr("id") + "'");
		}
		for (var i=0; i<parsed_rule.callbacks.length; i++) {
			var function_name = parsed_rule.callbacks[i];
			try {
				eval(function_name).call($el);
				//console.log("calling " + function_name + "($el)");
			}
			catch (err) {
				// Don't evaluate this undefined function call
			}
		}
	};

	this.evaluate = function() {
		var should_be_active = test_if_should_be_active();
		if (should_be_active && !is_currently_active) {
			apply_actions();
			is_currently_active = true;
		}
		else if (!should_be_active) {
			is_currently_active = false;
		}
	};
};

function init_parallax(){
	$.scrollingParallax('/img/front-clouds.png', {
		bgWidth : '4961px',
		bgHeight : '288px',
		bgRepeat: true,
		enableHorizontal : true,
		enableVertical : false,
		staticSpeedX : .2,
		loopItX : true,
		appendInFront : true,
		objID : "front-clouds",
		zIndex : 1
	});
	$.scrollingParallax('/img/back-clouds.png', {
		bgWidth : '4961px',
		bgHeight : '288px',
		bgRepeat: true,
		enableHorizontal : true,
		enableVertical : false,
		staticSpeedX : .1,
		loopItX : true,
		appendInFront : true,
		objID : "front-clouds",
		zIndex : 1
	});
	$.scrollingParallax('/img/front-trees.png', {
		bgWidth : '4975px',
		bgHeight : '214px',
		bgRepeat: true,
		enableHorizontal : true,
		enableVertical : false,
		staticSpeedX : 1,
		loopItX : true,
		appendInFront : true,
		objID : "front-trees",
		zIndex : 3
	});
	$.scrollingParallax('/img/back-trees.png', {
		bgWidth : '4968px',
		bgHeight : '132px',
		bgRepeat: true,
		enableHorizontal : true,
		enableVertical : false,
		staticSpeedX : 0.7,
		loopItX : true,
		appendInFront : true,
		objID : "back-trees",
		zIndex : 2
	});
	$.scrollingParallax('/img/mountains.png', {
		bgWidth : '4977px',
		bgHeight : '176px',
		bgRepeat: true,
		enableHorizontal : true,
		enableVertical : false,
		staticSpeedX : 0.4,
		loopItX : true,
		appendInFront : true,
		objID : "back-trees",
		zIndex : 1
	});
};

function set_background_position() {

	$body.css("overflow-x", "scroll");
	var groundHeight = $('#ground').position().top;

	//var windowHeight = $window.height();
	$('.parallax').each(function(){

		var $this = $(this);
		//var calculatedTop = windowHeight - groundHeight - $this.height();
		var calculatedTop = groundHeight - $this.height();
		$this.css('top', calculatedTop + "px");
		//console.log("Setting #" + $this.attr("id") + " " + calculatedTop + "px from top");
	});

};

var background_preload_waiter = new Preload_Waiter();
background_preload_waiter.add_callback(function() {
	init_parallax();
	set_background_position();
});
background_preload_waiter.add_callback(function() {
	preload_screen_remover.backgrounds_are_loaded = true;
	preload_screen_remover.try_to_remove_preload_screen();
});

background_preload_waiter.add_image("/img/front-clouds.png");
background_preload_waiter.add_image("/img/back-clouds.png");
background_preload_waiter.add_image("/img/front-trees.png");
background_preload_waiter.add_image("/img/back-trees.png");
background_preload_waiter.add_image("/img/mountains.png");
