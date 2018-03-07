/*
Author: Ian Coleman - ian.coleman@sitepoint.com

Handles the navigation of the page through scroll events, which then cascade to
listener functions for bind('scroll') in the sale and story frameworks

*/


// Cache the jquery objects so scroll is as fast as possible
var $window = $(window);
var $document = $(document);
var $body_html = $('html, body');
var $body = $('body');

var ONE_DAY_IN_S = 24*60*60;
var ONE_DAY_IN_MS = 24*60*60*1000;


// IE stuff

if (!Array.prototype.indexOf) {
	Array.prototype.indexOf = function(obj, start) {
		for (var i = (start || 0), j = this.length; i < j; i++) {
			if (this[i] === obj) { return i; }
		}
		return -1;
	}
};



// MODELS

var Config = Backbone.Model.extend({
	defaults: {
		do_animations: true,
		total_sale_days: 24,
		is_story_only: true
	},
	initialize: function() {
		this.initialize_from_cookie("do_animations");
		if (this.get("is_story_only")) {
			this.set({"do_animations": true}); // NB does not set cookies so the setting on the real sale site is preserved
		}
	},
	initialize_from_cookie: function(config_option) {
		var option_value = Utils.readCookie(config_option);
		if (option_value) {
			params = {};
			params[config_option] = option_value == "true";
			this.set(params)
		}
		else {
			Utils.createCookie(config_option, this.get(config_option), 365);
		}
	},
	save_to_cookie: function(config_option) {
		Utils.createCookie(config_option, this.get(config_option), 365);
	}
});

var config = new Config();

init_page();


// VIEWS


// The top left of the page which toggles animation and north/south hemisphere.
var Config_View = Backbone.View.extend({
	el: $("header"),
	initialize: function() {
		this.render();
		var view = this;
		this.model.bind("change", function() {
			view.render();
		});
	},
	render: function() {
		this.update_animation_button_display();
		if (config.get("is_story_only")) {
			$("#discuss").detach();
			$("#faqs").detach();
			$("#toggle-animations").detach();
		}
	},
	events: {
		"click #toggle-animations": "toggle_animations"
	},
	toggle_animations: function(e) {
		var new_setting = !(this.model.get("do_animations"));
		this.model.set( { "do_animations": new_setting } );
		this.model.save_to_cookie("do_animations");
	},
	update_animation_button_display: function() {
		var do_animations = this.model.get("do_animations");
		var class_to_add = do_animations ? "on" : "off";
		var class_to_remove = do_animations ? "off" : "on";
		var text = do_animations ? "Animations on" : "Animations off";
		$("#toggle-animations").removeClass(class_to_remove).addClass(class_to_add).find('span').text(text);
	}
});


var Nav_Bar_View = Backbone.View.extend({
	initialize: function() {
		var $daysNav = $('#daysNav');
		var total_sale_days = config.get("total_sale_days");
		$.each(_.range(total_sale_days), function(i) { // a bit of underscore trickery here...
			button_ui = new Nav_Bar_Button_View({day: i+1});
			$daysNav.append(button_ui.el);
		});
		if (config.get("is_story_only")) {
			$daysNav.detach();
			$(".next-arrow").click(function() {
				nav_bar.move_to_day(Math.min(window.day_of_sale+1, stories.maximum_day));
			})
			.css("display", "block");

			$(".prev-arrow").click(function() {
				nav_bar.move_to_day(Math.max(window.day_of_sale-1, 0));
			})
			.css("display", "block");
		}
	},
	move_to_day: function(day, animate) {
		var day_index = day - 1; // first day is at index 0
		if (typeof(stories) != "undefined") {
			//console.log("Moving to day " + day);

			var percent_to_scroll = (day_index) / (stories.total_days_to_display);
			var scroll_position = Math.ceil($document.width() * percent_to_scroll);
			if(scroll_position == $window.scrollLeft()) {
				$document.scroll(); // Need to simulate a scroll event if there is none, so listeners will trigger
			};
			if (typeof(animate) == "undefined") {
				animate = config.get("do_animations");
			}
			if(animate) {
				$body_html.animate({scrollLeft: scroll_position}, 1000,
					function() { $document.scroll() }); // For IE8
			}
			else {
				$body_html.scrollLeft(scroll_position);
			}
		}
	},
	set_page_title_with_day: function(title_day) {
		if (document.title.search(/Day \d+/) == 0) {
			document.title = document.title.replace(/Day \d+/, "Day " + title_day);
		}
		else {
			document.title = "Day " + title_day + " - " + document.title;
		}
	},
	activate_valid_sale_days: function() {
		// Enable the days that are active.
		$("#daysNav li:lt(" + (sale_periods.total_days_to_display) + ")")
		.addClass("allowed");
	}
});


var Nav_Bar_Button_View = Backbone.View.extend({
	tagName: "li",
	initialize: function() {
		var content = "<a>" + this.options.day + "</a>";
		this.$el.html(content);

		var view = this;
		this.$el.click(function() {
			nav_bar.move_to_day(view.options.day);
			$document.scroll(); // For IE8
		});
	}
});

var config_view = new Config_View({model: config});
var nav_bar = new Nav_Bar_View();

var Show_Sales_View = Backbone.View.extend({
	className: "show-sales",
	initialize: function() {
		this.render();
	},
	events: {
		"click": "close_dialog"
	},
	render: function() {
		this.$el.text("Click to view sales");
		$("#fixed").append(this.$el);
	},
	close_dialog: function () {
		this.remove();
		$("#info-wrap").css("display", "block");
	}
});



// COLLECTIONS

var Self_Fetching_Collection = Backbone.Collection.extend({
	initialize: function() {
		var collection = this;
		this.are_fetched = false;
		this.fetch({
			success: function() {
				collection.are_fetched = true;
				if (collection.init) {
					collection.init();
					collection.is_initialised = true;
					run_dependencies_for_both_sale_and_story();
				}
			},
			error: function(a,b,c,d) {
				//console.log("ERROR FETCHING COLLECTION");
			}
		});
	}
});

run_dependencies_for_both_sale_and_story = function() {
	if (typeof(stories) != "undefined") {
		if(stories.is_initialised) { // doesn't feel quite the right place for this
			stories.do_animations = config.get("do_animations");
			config.bind("change", function() {
				stories.do_animations = config.get("do_animations");
				stories.toggle_animations();
			});
		}
		if(sale_periods.is_initialised && stories.is_initialised) {
			stories.display_story();
		}
	}
	if(typeof(sale_periods) != "undefined") {
		set_social_buttons();
	}
};


// ROUTERS

var Router = Backbone.Router.extend({
	routes: {
		"day/:day": "handle_day_hash",
	},
	handle_day_hash: function(day) {
		window.day_of_sale = day;
		nav_bar.move_to_day(day);
	},
	initialize: function() {
		var router = this;
		$document.scroll(function() {
			window.scrollPercent = $window.scrollLeft() / ($document.width());
			var total_days = stories.total_days_to_display;
			var calculated_day_of_sale_fractional = window.scrollPercent * total_days + 1;
			var calculated_day_of_sale_fractional_rounded = Math.round(calculated_day_of_sale_fractional * 10e6) / 10e6;
			var calculated_day_of_sale_rounded = Math.round(calculated_day_of_sale_fractional);
			var calculated_day_of_sale_integer = Math.floor(calculated_day_of_sale_rounded);


			if (calculated_day_of_sale_rounded != window.day_of_sale) {
				$('#daysNav a.active').removeClass('active');
				$('#daysNav a:eq(' + (calculated_day_of_sale_rounded - 1) + ')').addClass('active');
				nav_bar.set_page_title_with_day(calculated_day_of_sale_rounded);
				router.navigate("day/" + calculated_day_of_sale_rounded, {replace: true});
				window.day_of_sale = calculated_day_of_sale_rounded;
				set_social_buttons();
			}
			window.day_of_sale_fractional = calculated_day_of_sale_fractional;
		});
	}
});

var router = new Router();
Backbone.history.start();


// ON PAGE LOAD

function set_social_buttons() {
	var social = new Social();

	var facebook_button = document.getElementById("share-to-facebook");
	/*var facebook_params = {
		link: 'https://developers.facebook.com/docs/reference/dialogs/',
		picture: 'http://fbrell.com/f8.jpg',
		name: 'Facebook Dialogs',
		caption: 'Reference Documentation',
		description: 'Using Dialogs to interact with users.'
	};*/

	// TODO set facebook correctly for is_story_only... this is tough cause
	// facebook depends on php includes etc. so doing it just in js is possibly
	// a bit of a pest or not possible.
	social.facebook.set_element_to_post_to_feed_on_click_simple(facebook_button);

	var twitter_text = "Check out this bargain on the SitePoint Christmas sale.";
	if (typeof(sale_periods) != "undefined") {
		twitter_text = sale_periods.get_current_sale_day_twitter_text();
	}
	if (config && config.get("is_story_only")) {
		twitter_text = "Have you seen the 'Story of Christmas' with all its CSS magic fairy dust?";
	}
	var twitter_button = document.getElementById("share-to-twitter");
	var twitter_params = {
		url: window.location.href,
		text: twitter_text
	};
	social.twitter.set_element_to_post_to_twitter_on_click(twitter_button, twitter_params);
};

function set_body_to_scroll_horizontally() {
	// see http://css-tricks.com/snippets/jquery/horz-scroll-with-mouse-wheel/
	// Make the mousewheel do horizontal scrolling by default instead of having
	// to hold down shift while scrolling
	//console.log("Scrolling horizontally");
	$body.on("mousewheel", function(event, delta) {
		this.scrollLeft -= (delta * 60);
		event.preventDefault();
	});
};

function set_body_to_scroll_normally() {
	//console.log("Scrolling vertically");
	$body.off("mousewheel");
}


function init_page() {

	// Copied from original prototype
	set_loading_text();
	set_fixed_elements_width();
	set_window_resize_listener();
	set_body_to_scroll_horizontally();
	switch_on_fancybox();
	set_social_buttons();
	sendSupportEmail();
	if (config.get("is_story_only")) {
		set_heading();
		set_podling_link();
	}
	else {
		subscribe_to_newsletter();
		hide_podling_button();
	}

	function set_loading_text() {
		if (config.get("is_story_only")) {
			$("#preloader h2").text("Loading The Story of Christmas (in CSS)...");
			$("title").text("The Story of Christmas (in CSS)");
		}
	};

	function set_fixed_elements_width() {
		if (config.get("is_story_only")) {
			$("#fixed").css("height", $("#share-to-facebook").height());
		}
		else {
			var width = $window.width();
			$('#fixed').width(width);
		}
	};

	function set_window_resize_listener() {
		$window.resize(function() {
			//console.log("Page resized");
			if(typeof(stories) != "undefined") {
				stories.set_page_size();
			}
			set_background_position();
			set_fixed_elements_width();
		});
	};

	function switch_on_fancybox(){

		$('.fancybox').fancybox({
			beforeShow: set_body_to_scroll_normally,
			afterShow: set_melbourne_clock,
			afterClose: set_body_to_scroll_horizontally
		});

	};

	function set_melbourne_clock() {
		var melb_utc_offset = 11;
		var hour_24 = (new Date().getUTCHours() + melb_utc_offset) % 24;
		var is_pm = hour_24 > 11;
		var hour_12 = is_pm ? hour_24 - 12 : hour_24;
		var hour_12 = hour_12 == 0 ? 12 : hour_12;
		$(".clock .h").text(hour_12.rightPad("0", 2));
		$(".clock .m").text(new Date().getUTCMinutes().rightPad("0", 2));
		$(".clock .d").text(is_pm ? "pm" : "am");
	};

	function subscribe_to_newsletter(){

		$('#sub-loading').hide();
		$('#subscribe-to-email').click(function(){
		//console.log('click?');
			$('#subscribe-to-deals .original-text span').fadeOut(300);

			$('#sub-loading').delay(300).fadeIn();

			var email = $('#subscribe-to-deals input[type=text]').val();

			var success_text = '<p class="success">Thanks for subscribing! You\'ll now get daily emails until the sale is over. You can opt-out any time though.</p>';

			var valid = Utils.validateEmail(email);

			if(valid){

				$.ajax({
                    type: 'post',
					url: "/subscribe-to-list",
					data: {email: email},
                    success: function(data){

                        if(data === "success"){
                            $('footer .more-info').remove();
                            $('#subscribe-to-deals .original-text').fadeOut(300, function(){
                                $('#subscribe-to-deals').append(success_text);
                                $(success_text).hide().delay(300).fadeIn(300);
                            });
                        } else {
                            alert(data);
                        }
                    }
                });

			} else {
				$('#sub-loading').delay(400).fadeOut();
				$('#subscribe-to-deals .error').show().delay(3000).fadeOut();
			}

		});

	};

	function set_heading() {
		$("header h1").addClass("heading-story-only");
	};

	function set_podling_link() {
		$(".original-text").empty();

		var more_info_text = "Chat with Alex Walker about the CSS he used to create all this magic. Simply click below, and you'll join him and others in podling (our new group chat tool) discussing how he sprinkled so much CSS fairy dust!";
		$("#subscribe-to-deals .more-info").text(more_info_text);

		var href = "https://podling.com/invitations/233-the-christmas-css-animation-pod/243/wWBTfBO8ho ";
		var text = "Chat about this on <img src='https://podling.com/assets/podling-144x49-9bcfe41c9daaf343d494493d8b9755db.png' alt='podling' style='height:1.4em; padding-bottom: 0.13em; margin-left: -0.15em'>";
		$(".original-text").html("<a href='" + href + "' class='podling-footer' target='_blank'>" + text + "</a>");

		var heading_button = $(".podlings");
		heading_button.attr("href", href);
	};

	function hide_podling_button() {
		$(".podlings").css("display", "none");
	}

	function sendSupportEmail(){

		$('#support-message-button').live("click",function(e){

			e.preventDefault();

			var $form = $('#support-message');
			var email = $form.find('#support-email').val();
			var valid = Utils.validateEmail(email);

			//console.log('valid email gotten: ' + valid);

			if(valid){
				var data = {
					email: email,
					subject: $('#support-subject').val(),
					message: $('#support-message-text').val()
				};

				$.ajax({
					type: 'post',
					url: '/support-email',
					data: data,
					success: function(data){

						$('#support-message').slideUp(300, function(){

							$('#support-success').slideDown();

						});

						$('.fancybox-inner').delay(500).animate({scrollTop: 1000}, 300);

					}
				});

			} else {

				$('#support-email').addClass('error');

			}

		});

	};

};




function Preload_Waiter() {
	var images = [];
	var callbacks = [];

	this.add_image = function(image_src) {
		var image = {
			is_loaded: false,
			src: image_src
		};
		images.push(image);
		preload_image(image);
	};

	this.add_callback = function(callback) {
		callbacks.push(callback);
	};

	function preload_image(image) {
		//console.log("Preloading image from preload_waiter - " + image.src);
		var image_el = $(document.createElement("img"));
		image_el.addClass("preload-image");
		image_el.load(function() {
			if (!image.is_loaded) {
				image.is_loaded=true;
				check_all_images_are_complete();
			}
		});
		image_el.error(function() {
			if (!image.is_loaded) {
				//console.log("ERROR PRELOADING IMAGE - " + image.src);
				image.is_loaded=true;
				check_all_images_are_complete();
			}
		});
		image_el.attr("src", image.src);
		$body.append(image_el);
	};

	function check_all_images_are_complete() {
		var are_all_complete = true;
		for (var i=0; i<images.length; i++) {
			if (images[i].is_loaded == false) {
				are_all_complete = false;
				break;
			}
		}
		if (are_all_complete) {
			run_callbacks();
		}
	};

	function run_callbacks() {
		//console.log("Running preload_waiter callbacks");
		for (var i=0; i<callbacks.length; i++) {
			callbacks[i].call();
		}
	};
};

function Preload_Screen_Remover() {
	this.backgrounds_are_loaded = false;
	this.todays_covers_are_loaded = false;
	this.todays_story_is_loaded = true; // Nothing being preloaded yet!!

	this.try_to_remove_preload_screen = function() {
		if (this.backgrounds_are_loaded &&
			this.todays_covers_are_loaded &&
			this.todays_story_is_loaded) {
			remove_preload_screen();
		}
	};

	function remove_preload_screen() {
		//console.log("Removing preload screen");
		$("#preloader").delay(700).fadeOut(500); // delay 700 is for handling train/sled animation, wish it could be removed by not animating sled/train on first load...
	};
};

var preload_screen_remover = new Preload_Screen_Remover();
