/*
Author: Ian Coleman - ian.coleman@sitepoint.com

Handles the data and display for the sales

*/



var markdown_interpreter = new Showdown.converter();

/* Models */

var Sale_Period = Backbone.Model.extend({
	defaults: {
		day_of_month: 0,
		sale_type: "",
		data: {}
	}
});





/* Collections */

var Sale_Period_Collection = Self_Fetching_Collection.extend({
	model: Sale_Period,
	url: "/data/sales.json",
	init: function() {
		if (!config.get("is_story_only")) {
			this.set_constants();
			this.set_initial_sale_data();
			nav_bar.activate_valid_sale_days();
			render_time_remaining();
			this.preload_cover_images();
		}
		else {
			preload_screen_remover.todays_covers_are_loaded = true;
			preload_screen_remover.try_to_remove_preload_screen();
			$("#info-wrap").detach();
		}
	},
	preload_cover_images: function() {
		var view = this;
		var todays_covers_preload_waiter = new Preload_Waiter();
		todays_covers_preload_waiter.add_callback(function() {
			preload_screen_remover.todays_covers_are_loaded = true;
			preload_screen_remover.try_to_remove_preload_screen();
			view.preload_all_covers_other_than_today();
		});
		
		var todays_model = this.get_current_sale_day_model();
		var covers = this.get_days_covers(todays_model);
		for (var i=0; i<covers.length; i++) {
			todays_covers_preload_waiter.add_image(covers[i]);
		}
	},
	preload_all_covers_other_than_today: function() {
		var day_models = this.models.reverse();
		for (var i=0; i<day_models.length; i++) {
			var day_covers = this.get_days_covers(day_models[i]);
			for (var j=0; j<day_covers.length; j++) {
				this.preload_cover(day_covers[j]);
			}
		}
		this.models.reverse(); // reverse them back
	},
	get_days_covers: function(day_model) {
		var preloaded_cover_srcs = [];
		var dealtype = day_model.get("type");
		var data = day_model.get("data");
		if (dealtype == "bundledeals") {
			for (var i=0; i<data.length; i++) {
				var bundledeal = data[i];
				for (var j=0; j<bundledeal.items.length; j++) {
					var image_src = bundledeal.items[j].image;
					if (preloaded_cover_srcs.indexOf(image_src) == -1) {
						preloaded_cover_srcs.push("/img/covers/" + image_src);
					}
				}
			}
		}
		else if (dealtype == "pickdeal") {
			for (var i=0; i<data.items.length; i++) {
				var image_src = data.items[i].image;
				if (preloaded_cover_srcs.indexOf(image_src) == -1) {
					preloaded_cover_srcs.push("/img/covers/" + image_src);
				}
			}
		}
		else {
			var image_src = data.image;
			if (preloaded_cover_srcs.indexOf(image_src) == -1) {
				preloaded_cover_srcs.push("/img/covers/" + image_src);
			}
		}
		return preloaded_cover_srcs;
	},
	preload_cover: function(image_src) {
		////console.log("Preloading image from sale_framework.js - " + image_src);
		var image = $(document.createElement("img"));
		image.attr("src", image_src);
		image.addClass("preload-image");
		$body.append(image); // This will cause the image to preload
	},
	set_constants: function() {
		var days = this.pluck("day");
		this.earliest_time = _.min(days);
		this.latest_time = _.max(days);
		this.total_sale_period = this.latest_time - this.earliest_time + ONE_DAY_IN_S - 1;
		this.total_days_to_display = Math.round(this.total_sale_period / ONE_DAY_IN_S);
		if (window.day_of_sale > this.total_days_to_display) {
			window.day_of_sale = this.total_days_to_display;
			router.navigate("day/" + window.day_of_sale, {replace: true});
		}
	},
	set_initial_sale_data: function() {
		// If the page starts at day 1, there is no scroll event, so we must
		// trigger the events that are normally triggered by a scroll so that
		// the product info is displayed
		if (typeof(window.day_of_sale) == "undefined") {
			window.day_of_sale = this.total_days_to_display;
		}
		/*if ($window.scrollLeft() == 0) {
			sale_view.update_sale_view_with_current_days_data();
			$('#daysNav a:first').addClass('active');
			nav_bar.set_page_title_with_day();
		}*/
		sale_view.update_sale_view_with_current_days_data();
		$('#daysNav a:eq(' + (window.day_of_sale-1) + ')').addClass('active');
		nav_bar.set_page_title_with_day(window.day_of_sale);
	},
	current_deal_is_for_dealfuel: function() {
		return window.day_of_sale == this.total_days_to_display - 1;
	},
	get_current_sale_day_model: function() {
		var day_as_unix_time = sale_periods.earliest_time + (window.day_of_sale-1) * ONE_DAY_IN_S;
		var models = sale_periods.where({day: day_as_unix_time});
		var model = null;
		if (models.length > 0) {
			model = models[0];
		}
		return model;
	},
	get_current_sale_day_twitter_text: function() {
		var text = "Check out this bargain on the SitePoint Christmas sale.";
		var model = this.get_current_sale_day_model();
		if (model) {
			possible_text = model.get("twitterText");
			if (typeof(possible_text) != "undefined" && possible_text != "") {
				text = possible_text;
			}
		}
		return text;
	}
});

window.unix_time_of_page_load = new Date().getTime() / 1000;
render_time_remaining = function() {
	var unix_time_now = new Date().getTime() / 1000;
	var open = sale_periods.where({open: false}).length == 0;
	var seconds_remaining = sale_periods.latest_time - unix_time_now + ONE_DAY_IN_S;
	var page_is_at_least_one_minute_old = unix_time_now - window.unix_time_of_page_load > 60;
	if (seconds_remaining < 0 && page_is_at_least_one_minute_old && !open) {
		var max_seconds_to_wait_before_triggering_reload = 10;
		setTimeout(function() {
			window.location.href = window.location.origin;
		}, Math.random()*max_seconds_to_wait_before_triggering_reload*1000);
		$("#timer").text("Reloading...");
	}
	else if (open) {
		$(".timer h3").text("Ending...")
		$("#timer").text("...soon!");
	}
	else {
		var timer_text = seconds_remaining.toTimeString();
		$("#timer").html(timer_text);
		setTimeout(render_time_remaining, 1000);
	}
};





/* Views */

var Sale_View = Backbone.View.extend({
	initialize: function() {
		this.day_of_sale_currently_displayed = 0;
		this.detail_view = new Detail_View();
		this.cache_views();
	},
	cache_views: function() {
		this.views = {};
		this.views["item"] = new Item_View();
		this.views["bundledeals"] = new Bundle_Deal_View();
		this.views["pickdeal"] = new Pick_Deal_View();
		this.views["index"] = new Index_View();
	},
	render: function() {
		this.display_view_for_deal_type();
	},
	display_view_for_deal_type: function() {
		var sale_type = this.model.get("type");
		if (sale_type in this.views) {
			var view = this.views[sale_type];
			view.model = this.model;
			view.render();
			if (sale_type != "index") {
				this.set_deal_as_open_or_closed(view);
				$("#all-info").css("display", "block");
				$("#pricing").css("display", "block");
				$("#checkout").css("display", "block");
				$("#index").css("display", "none");
			}
			else {
				$("#all-info").css("display", "none");
				$("#pricing").css("display", "none");
				$("#checkout").css("display", "none");
				$("#index").css("display", "block");
			}
		}
	},
	set_deal_as_open_or_closed: function(view) {
		if(this.model.get("open")) {
			view.show_day_as_enabled();
		}
		else if (sale_periods.current_deal_is_for_dealfuel()) {
			view.show_day_as_dealfuel();
		}
		else {
			view.show_day_as_disabled();
		}
	},
	update_sale_view_with_current_days_data: function() {
		var model = sale_periods.get_current_sale_day_model();
		if (model != null) {
			//console.log("Updating the sale info to day " + window.day_of_sale + " at time " + model.get("day"));
			sale_view.model = model;
			sale_view.render();
		}
		sale_view.day_of_sale_currently_displayed = window.day_of_sale;
	}
});

var Base_Sale_View = Backbone.View.extend({
	// Every sale deal will need to render the description, the checkout, and
	// the price. The common parts of this are encapsulated in this base class.
	// The detail of specific rendering depending on the deal type is managed by
	// subclasses
	initialize: function() {
		// TODO look into _.bindAll()
		var view = this;
		this.cache_elements();
	},
	cache_elements: function() {
		this.pricing_div = $("#pricing");
		this.new_price = $(".new-price");
		this.new_price_parent = this.new_price.parent();
		this.original_price = $(".original-price");
		this.original_price_parent = this.original_price.parent().parent();
		this.save_percent = $(".save-percent");
		this.save_percent_parent = this.save_percent.parent().parent();
		this.timer = $(".timer");
		this.deal_fuel = $(".dealfuel-link");
		this.deal_closed = $(".deal-closed");

		this.description_div = $("#all-info");

		this.checkout_div = $("#checkout");
		this.checkout_heading = $("#checkout h2");
		this.checkout_inputs = $("#checkout .inputs-container");
		this.checkout_form = $("#checkout-form");
		this.buy_button = $("#buy-button");
		this.current_deal_link = $(".current-deal");
		this.hamper_line = $(".hamper-line");
		this.helper_text = $(".click-helper");
	},
	calculate_you_save_value: function(original_price, new_price) {
		var you_save = Math.round((original_price - new_price) / original_price * 100) + "%";
		if (new_price == 0 && original_price != 0) {
			you_save = original_price.toMoneyString();
		}
		else if (new_price == 0) {
			you_save = "-";
		}
		else if (new_price == original_price) {
			you_save = "";
		}
		return you_save;
	},
	render_price: function() {
		//var new_price_prefix = this.model.get("open") ? "Now " : ""; // Always show, in html
		var pricing_json = this.get_pricing_params();
		this.new_price.text(pricing_json.new_price);
		this.original_price.text(pricing_json.original_price);
		this.save_percent.text(pricing_json.you_save);

		if (pricing_json.you_save == "" || pricing_json.original_price == "Free!") {
			this.original_price_parent.css("display", "none");
			this.save_percent_parent.css("display", "none");
		}
		else {
			this.original_price_parent.css("display", "block");
			this.save_percent_parent.css("display", "block");
		}

		if(pricing_json.new_price == "-") {
			this.new_price_parent.css("display", "none");
		}
		else {
			this.new_price_parent.css("display", "block");
		}
	},
	show_day_as_disabled: function() {
		this.set_sale_opacity(0.7);

		this.pricing_div.addClass("closed-deal");
		this.new_price_parent.addClass("new-price-disabled");

		this.timer.css("display", "none");
		this.deal_fuel.css("display", "none");
		this.deal_closed.css("display", "block");

		this.unset_new_price_div_to_perform_form_submission();

		this.buy_button.attr("disabled", "disabled");
		this.buy_button.attr("value", "TOO LATE!");
		this.buy_button.removeClass("buy-button-dealfuel");
		this.buy_button.addClass("button-disabled");

		this.buy_button.css("display", "none");
		this.hamper_line.css("display", "none");


		this.current_deal_link.css("display", "block");
		this.current_deal_link.text("Check out today's deal though!");
		this.current_deal_link.attr("href", "#day/" + sale_periods.total_days_to_display);
	},
	show_day_as_dealfuel: function() {
		this.show_day_as_disabled();

		this.new_price.text(this.new_price.text());

		this.buy_button.attr("value", "BUY ON DEAL FUEL!");
		this.buy_button.addClass("buy-button-dealfuel");

		this.current_deal_link.css("display", "block");
		this.current_deal_link.text("Or check out today's deal");
		this.current_deal_link.attr("href", "#day/" + sale_periods.total_days_to_display);
		// TODO set this.buy_button value to the right value
		this.deal_fuel.attr("href", this.model.get("dealFuelUrl"));

		this.timer.css("display", "none");
		this.deal_fuel.css("display", "block");
		this.deal_closed.css("display", "none");
	},
	show_day_as_enabled: function() {
		this.set_sale_opacity(1);

		this.pricing_div.removeClass("closed-deal");
		this.new_price.text(this.new_price.text());
		this.new_price_parent.removeClass("new-price-disabled");

		this.buy_button.removeAttr("disabled");
		this.buy_button.removeClass("buy-button-dealfuel button-disabled");
		this.buy_button.attr("value", "BUY NOW!");

		this.set_new_price_div_to_perform_form_submission();

		this.current_deal_link.css("display", "none");
		this.current_deal_link.text("");
		this.current_deal_link.attr("href", "");

		this.buy_button.css("display", "block");
		this.hamper_line.css("display", "block");

		this.timer.css("display", "block");
		this.deal_fuel.css("display", "none");
		this.deal_closed.css("display", "none");
	},
	set_sale_opacity: function(opacity) {
		this.description_div.css("opacity", opacity);
		this.new_price_parent.css("opacity", opacity);
		this.original_price_parent.css("opacity", opacity);
		this.save_percent_parent.css("opacity", opacity);
		this.deal_closed.css("opacity", 1);

		this.checkout_div.css("background-color", "rgba(255, 255, 255, " + opacity + ")");
		this.checkout_div.find("h2").css("opacity", opacity);
		this.checkout_div.find(".inner div").css("opacity", opacity);
		this.checkout_div.find(".inner p").css("opacity", opacity);
		this.checkout_div.find(".current-deal").parent().css("opacity", 1);
	},
	set_new_price_div_to_perform_form_submission: function() {
		var view = this;
		this.new_price_parent.off("click");
		this.new_price_parent.css("cursor", "pointer");
		this.new_price_parent.click(function() { 
			view.checkout_form[0].submit();
		});
	},
	unset_new_price_div_to_perform_form_submission: function() {
		this.new_price_parent.off("click");
		this.new_price_parent.css("cursor", "default");
	},
	show_helper_text: function() {
		this.helper_text.css("display", "block");
	},
	hide_hepler_text: function() {
		this.helper_text.css("display", "none");
	}
});


var Index_View = Base_Sale_View.extend({
	template: _.template($("#sale_index").html()),
	render: function() {
		var params = {days: sale_periods};
		this.content = this.template(params);
		$("#index").html(this.content);
		$("#index li").click(this.go_to_day);
	},
	go_to_day: function(e) {
		var day = $("#index li").index($(e.target.parentNode)) + 1;
		nav_bar.move_to_day(day);
	}
});

var Book_Cover_View = Backbone.View.extend({
	template: _.template($("#book_cover_image_template").html()),
	className: "book-cover-container",
	initialize: function() {
		// Used to determine whether to display a sash or not. eg poster being
		// commented out means there's no sash for poster yet, so any 'poster'
		// items won't have a sash. Without this, the poster elements would have
		// an incorrect default sash
		this.sash_classes = {
			print: "print",
			digital: "digital",
			bundle: "bundle",
			poster: "poster",
			course: "course"
		};
		this.render();
	},
	render: function() {
		var template_params = this.convert_model_to_template_parameters();
		var content = this.template(template_params);
		this.$el.html(content);
		this.set_class_for_sash();
		this.set_cursor_style();
	},
	events: {
		"click": "show_more_detail"
	},
	set_class_for_sash: function() {
		if (this.should_show_product_type_sash()) {
			this.$el.removeAttr("class");
			this.$el.addClass("book-cover-container " + this.model.get("type"));
		}
		else {
			this.$el.removeAttr("class");
			this.$el.addClass("book-cover-container");
		}
	},
	set_cursor_style: function() {
		if (this.can_show_more_detail())
		{
			this.$el.css("cursor", "pointer");
		}
		else {
			this.$el.css("cursor", "default");
		}
	},
	convert_model_to_template_parameters: function() {
		// toJSON isn't enough here, things are too flexible at the moment, so
		// am making my own version of toJSON for the template
		var template_params = {
			image_src: 'blank_pickchoose_cover.png'
		};
		if (!(this.should_show_blank_image())) {
			template_params = { image_src: this.model.get("image") };
		}
		return template_params;
	},
	should_show_product_type_sash: function() {
		return "model" in this && this.model != null && this.model.get("type") in this.sash_classes;
	},
	should_show_blank_image: function() {
		return typeof("this.model") == "undefined" || this.model == null;
	},
	can_show_more_detail: function() {
		return ("model" in this) && !("do_not_show_more_detail" in this.options) && this.model != null;
	},
	show_more_detail: function() {
		if (this.can_show_more_detail()) {
			var less_detail_el = $("#all-info .inner");

			//console.log("Showing more detail for item");

			var more_detail_view = new More_Detail_View({
				model: this.model,
				less_detail_el: less_detail_el
			});
		}
	}
});

var Detail_View = Backbone.View.extend({
	initialize: function() {
		this.setElement(document.getElementById("all-info"));
	},
	show_more_detail: function(more_detail_el) {
		this.transition_element = more_detail_el;
		this.flip_forward();
	},
	show_less_detail: function(less_detail_el, use_flip) {
		this.transition_element = less_detail_el;
		if (use_flip) {
			this.flip_backward();
		}
		else {
			this.$el.children().detach();
			this.$el.append(this.transition_element);
		}
	},
	flip_forward: function() {
		//this.$el.addClass("flipped");
		this.switch_content_midflip();
	},
	flip_backward: function() {
		//this.$el.removeClass("flipped");
		this.switch_content_midflip();
	},
	switch_content_midflip: function() {
		/*var view = this;
		setTimeout(function() { view.$el.children().detach(); }, 400);
		setTimeout(function() { view.$el.append(view.transition_element); }, 400);*/
		this.$el.children().detach();
		this.$el.append(this.transition_element);
	}
});

var More_Detail_View = Backbone.View.extend({
	template: _.template($("#more_detail_template").html()),
	className: "inner",
	initialize: function() {
		this.render();
	},
	render: function() {
		var image_view = new Book_Cover_View({
			model: this.model,
			do_not_show_more_detail: true
		});
		var params = {
			heading: this.model.get("name"),
			text: markdown_interpreter.makeHtml(this.model.get("description")),
			type: this.model.get("type")
		};

		var content = this.template(params);
		this.$el.html(content);

		this.$(".more-detail-image").append(image_view.el);

		sale_view.detail_view.show_more_detail(this.el);
	},
	events: {
		"click .less-detail-button": "show_less_detail"
	},
	show_less_detail: function() {
		sale_view.detail_view.show_less_detail(this.options.less_detail_el, true);
	}
});

var Less_Detail_View_Base = Backbone.View.extend({
	template: _.template($("#less_detail_template").html()),
	className: "inner",
	initialize: function() {
		this.render();
	},
	render: function() {
		// override in subclass
	},
	set_less_detail_image_layout: function(images) {
		if (images.length == 1) {
			var image = $(images[0]);
			var display_wide_image = this.image_should_be_displayed_full_width(image);
			if (display_wide_image) {
				this.set_single_image_to_full_width(image);
				this.set_image_to_link_to_description_href(image);
			}
		}
		else if (images.length > 1) {
			this.fan_images(images);
		}
	},
	image_should_be_displayed_full_width: function(image) {
		// Bit of a hack but is a nice reliable quick-fix for the time being
		var img_src = image.find("img").attr("src");
		return img_src.indexOf("mega-resource-image.png") > -1 ||
				img_src.indexOf("dealfuel-bestsellers.png") > -1 ||
				img_src.indexOf("XMASMEGARESOURCES1PDF.png") > -1 ||
				img_src.indexOf("XMASDEALFUELBESTOF1PDF.png") > -1 ||
				img_src.indexOf("XMASFREEBIES1PDF.png") > -1 ||
				img_src.indexOf("LRN1YEAR.png") > -1 ||
				img_src.indexOf("LRN6MTH.png") > -1;
	},
	set_single_image_to_full_width: function(image) {
		image.css("width", "95%");
		image.css("height", "auto");
		image.css("max-height", "500px");
		image.parent().css("height", "auto");
	},
	set_image_to_link_to_description_href: function(image) {
		var link = this.$el.find("a:last");
		if (link.length > 0) {
			// TODO would prefer to wrap in href
			image.click(function() {
				window.open(link.attr("href"));
			});
			this.$(".click-helper").css("display", "block");
			this.$(".click-helper").text("Click image for more detail");
		}
	},
	fan_images: function(images) {
		var halfway_index = (images.length - 1) / 2.0;
		var fan_angle = 30 / images.length;
		images.each(function(i, e) {
			var image_angle = (i - halfway_index) * fan_angle;
			var marginTop = Math.abs(halfway_index - i) * Math.abs(halfway_index - i) * fan_angle;
			// TODO need to account for parent width in the margin_adjustment below to prevent wrapping
			var margin_adjustment = -0.4 * images.length * images.length + "px";
			$(e).css({
				"transform": "rotate(" + image_angle + "deg)",
				"-ms-transform": "rotate(" + image_angle + "deg)",
				"-o-transform": "rotate(" + image_angle + "deg)",
				"-moz-transform": "rotate(" + image_angle + "deg)",
				"-webkit-transform": "rotate(" + image_angle + "deg)",
				"margin-top": marginTop,
				"margin-left": margin_adjustment,
				"margin-right": margin_adjustment,
				"z-index": images.length - i,
				"position": "relative", // TODO move the static css into css file
				"vertical-align": "top"
			});
		});
	},
	hide_nav_buttons: function() {
		this.$(".bundle-nav .next").css("display", "none");

		if (sale_periods.get_current_sale_day_model().get("open")) {
			this.$(".bundle-nav .buy").click(function() {
				$("#checkout-form").submit();
			});
		}
		else {
			this.$(".bundle-nav .buy").css("display", "none");
		}
	},
	parse_markdown: function(unparsed_markdown) {
		//console.log("parsing markdown");
		var markdown = markdown_interpreter.makeHtml(unparsed_markdown);
		return markdown;
	},
	show: function(use_flip) {
		sale_view.detail_view.show_less_detail(this.el, use_flip);
	}
});

var Less_Detail_View_Item = Less_Detail_View_Base.extend({
	render: function() {
		var params = {
			heading: this.model.get("name"),
			text: this.parse_markdown(this.model.get("description")),
			subtitle: "" // doesn't exist for items so will be blank in template
		};
		var content = this.template(params);
		this.$el.html(content);

		var image_view = new Book_Cover_View({
			model: this.model,
			do_not_show_more_detail: true
		});
		this.$(".less-detail-image").append(image_view.el);
		this.$(".click-helper").css("display", "none");

		this.hide_nav_buttons();
		this.show();
	}
});

var Item_View = Base_Sale_View.extend({
	get_pricing_params: function() {
		var data = this.model.get("data");
		return {
			original_price: data.price.toMoneyString(),
			new_price: data.salePrice.toMoneyString(),
			you_save: this.calculate_you_save_value(data.price, data.salePrice)
		};
	},
	render: function() {
		this.render_detail();
		this.render_checkout();
		this.render_price();
		this.hide_hepler_text();
	},
	render_detail: function() {
		var item = this.model.get("data");
		var item_model = new Backbone.Model(item);
		var less_detail_view = new Less_Detail_View_Item({model: item_model});

		var images = less_detail_view.$(".book-cover-container");
		less_detail_view.set_less_detail_image_layout(images);
	},
	render_checkout: function() {
		this.checkout_heading.text("Buy Now!");
		var data = this.model.get("data");
		var item_view_model = new Backbone.Model({
			id: 0,
			name: data.name,
			price: data.salePrice,
			inStock: data.inStock,
			subtitle: data.subtitle
		});
		var item_checkout_view = new Bundle_Deal_Radiobutton_View({
			model: item_view_model,
			parent_view: this,
			do_not_display_radio: true,
			do_not_display_price: true,
			checked: true
		});
		this.checkout_form.attr("action", data.url);
		this.checkout_inputs.empty();
		this.checkout_inputs.append(item_checkout_view.el);
	}
});


var Less_Detail_View_Bundle = Less_Detail_View_Base.extend({
	render: function() {

		var params = {
			heading: this.model.get("name"),
			text: this.parse_markdown(this.model.get("description")),
			subtitle: this.model.get("subtitle")
		};
		var content = this.template(params);
		this.$el.html(content);

		var image_views = [];
		var items = this.model.get("items");
		var less_detail_images = this.$(".less-detail-image");
		for (var i=0; i<items.length; i++) {
			var item = items[i];
			var image_view = new Book_Cover_View({
				model: new Backbone.Model(item)
			});
			less_detail_images.append(image_view.el);
		}
		var images = less_detail_images.find(".book-cover-container");
		this.set_less_detail_image_layout(images);

		if (items.length > 1) {
			this.set_nav_buttons();
		}
		else {
			this.hide_nav_buttons();
		}

		this.show();
	},
	set_nav_buttons: function() {
		var view = this;
		this.$(".bundle-nav .next").click(function() {
			view.set_next_radio();
		});
		if (sale_periods.get_current_sale_day_model().get("open")) {
			this.$(".bundle-nav .buy").click(function() {
				$("#checkout-form").submit();
			});
		}
		else {
			this.$(".bundle-nav .buy").css("display", "none");
		}
	},
	set_next_radio: function() {
		var selected_radio = this.get_selected_input();
		var all_radios = this.get_all_radios();
		var selected_index = all_radios.index(selected_radio);
		var new_index = selected_index == all_radios.length-1 ? 0 : selected_index+1;
		this.set_radio_as_selected_by_index(new_index);
	},
	set_prev_radio: function() {
		var selected_radio = this.get_selected_input();
		var all_radios = this.get_all_radios();
		var selected_index = all_radios.index(selected_radio);
		var new_index = selected_index == 0 ? all_radios.length-1 : selected_index-1;
		this.set_radio_as_selected_by_index(new_index);
	},
	get_selected_input: function() {
		return $(".inputs-container input[type=radio]:checked");
	},
	get_all_radios: function() {
		return $(".inputs-container input[type=radio]");
	},
	set_radio_as_selected_by_index: function(index) {
		var target_radio = $(".inputs-container input[type=radio]:eq(" + index +")");
		target_radio.attr("checked", true);
		target_radio.change();
	}
});

var Bundle_Deal_View = Base_Sale_View.extend({
	get_pricing_params: function() {
		var params = {
			original_price: "-",
			new_price: "-",
			you_save: "-"
		};
		if ("selected_bundle" in this) {
			var new_price = this.selected_bundle.get("price");
			var original_price = 0;
			var items = this.selected_bundle.get("items");
			for (var i=0; i<items.length; i++) {
				original_price += items[i].price;
			}
			params.original_price = original_price.toMoneyString();
			params.new_price = new_price.toMoneyString();
			params.you_save = this.calculate_you_save_value(original_price, new_price);
		}
		return params;
	},
	render: function() {

		this.render_checkout();
		this.render_price();

		this.set_initial_bundle();
		this.set_freebie_text();
	},
	set_initial_bundle: function() {
		var bundles = this.model.get("data");
		var default_bundledeal = this.get_default_bundle();
		if (default_bundledeal != null) {
			this.set_currently_selected_bundle(default_bundledeal);
			this.show_helper_text();
		}

		var default_bundle_is_first_in_list = bundles[0].selected;
		if (default_bundle_is_first_in_list) {
			this.checkout_inputs.find(".bundle-radio:first").addClass("down-arrow");
		}
	},
	set_freebie_text: function() {
		var freebie_text = this.model.get("freebie");
		if (typeof(freebie_text) == "string" && freebie_text.length > 0) {
			var freebie_html = markdown_interpreter.makeHtml(freebie_text);
			this.hamper_line.html(freebie_html);
		}
		else {
			this.hamper_line.html("With every purchase, you get a <strong>FREE</strong> <a class='fancybox fancybox.ajax' href='/pages/hamper.php'>Bonus Coupon Hamper</a>!")
		}
	},
	render_checkout: function() {
		if (this.model.get("data").length > 1) {
			this.checkout_heading.text("Pick One and Buy Now!");
		}
		else {
			this.checkout_heading.text("Buy Now!");
		}
		this.checkout_inputs.empty();
		// Add radios to checkout
		var view = this;
		var bundles = this.model.get("data");
		var total_bundles = bundles.length;
		var bundle_to_select = this.get_default_bundle();
		_.each(bundles, function(bundle, index) {
			bundle["id"] = index;
			var bundle_model = new Backbone.Model(bundle);
			var radio = new Bundle_Deal_Radiobutton_View({
				model: bundle_model,
				parent_view: view,
				do_not_display_radio: total_bundles == 1,
				do_not_display_price: total_bundles == 1,
				checked: bundle_model.get("id") == bundle_to_select.get("id")
			});
			view.checkout_inputs.append(radio.el);
		});
	},
	get_default_bundle: function() {
		var bundle_to_select = null;
		var first_bundle_in_stock = null;
		var index_of_first_bundle_in_stock = null;
		var default_bundle_is_out_of_stock = false;
		var bundles = this.model.get("data");
		var index_of_selected_bundle = null;
		// Find the default bundle
		for (var i=0; i<bundles.length; i++) {
			var bundle = bundles[i];
			if (bundle.selected) {
				if (bundle.inStock) {
					bundle_to_select = bundle;
					index_of_selected_bundle = i;
				}
				else {
					default_bundle_is_out_of_stock = true;
				}
			}
			if (default_bundle_is_out_of_stock &&
				bundle_to_select == null &&
				bundle.inStock) {
				bundle_to_select = bundle;
				index_of_selected_bundle = i;
			}
			if (bundle.inStock && first_bundle_in_stock == null) {
				first_bundle_in_stock = bundle;
				index_of_first_bundle_in_stock = i;
			}
		}
		// If none of the bundles after the default one are in stock, set it to
		// the first bundle that is in stock, or if none in stock, the first one
		// in the list
		if (bundle_to_select == null) {
			if (first_bundle_in_stock == null) {
				bundle_to_select = bundles[0];
				index_of_selected_bundle = 0;
			}
			else {
				bundle_to_select = first_bundle_in_stock;
				index_of_selected_bundle = index_of_first_bundle_in_stock;
			}
		}
		bundle_to_select["id"] = index_of_selected_bundle;
		var bundle_model = new Backbone.Model(bundle_to_select);
		return bundle_model;
	},
	set_currently_selected_bundle: function(bundle_model) {

		////console.log("Updating details to bundle option " + bundle_model.get("id"));

		this.selected_bundle = bundle_model;

		var form_action_url = bundle_model.get("url");
		this.checkout_form.attr("action", form_action_url);

		new Less_Detail_View_Bundle({model: this.selected_bundle});

		this.checkout_div.find(".highlighted").removeClass("highlighted");
		this.checkout_div.find("input[type=radio]:checked").parent().parent().addClass("highlighted");


		this.render_price();
	}
});

var Bundle_Deal_Radiobutton_View = Backbone.View.extend({
	className: 'bundle-radio',
	template: _.template($("#checkout_radiobutton").html()),
	initialize: function() {
		this.render();
	},
	render: function() {
		var template_params = this.model.toJSON();
		template_params['checked'] = this.options.checked;
		template_params['oldprice'] = this.get_old_price().toMoneyString();
		var content = this.template(template_params);
		this.$el.html(content);

		var bundle_model = this.model;
		var parent_view = this.options.parent_view;
		this.$el.change(function() {
			parent_view.set_currently_selected_bundle(bundle_model);
		});

		if (this.options.do_not_display_radio) {
			this.$el.find("input").css("display", "none");
			this.$el.find("label").css("cursor", "default");
		}
		if (this.options.do_not_display_price) {
			this.$el.find(".radio-col-80").removeClass("radio-col-80");
			this.$el.find(".radio-label-price").css("display", "none");
		}
	},
	get_old_price: function() {
		// This method belongs in a model, but we have no appropriate model.
		var items = this.model.get("items");
		var total = 0;
		if (typeof(items) != "undefined") {
			for (var i=0; i<items.length; i++) {
				total += items[i].price;
			}
		}
		else {
			total = this.model.get("price");
		}
		return total;
	}
});

var Less_Detail_View_Pickchoose_Open = Less_Detail_View_Base.extend({
	render: function() {
		var params = {
			heading: this.model.get("data").name,
			text: this.parse_markdown(this.model.get("description")),
			subtitle: this.model.get("subtitle")
		};
		var content = this.template(params);
		this.$el.html(content);

		this.book_cover_views = [];
		var less_detail_image = this.$(".less-detail-image");
		var number_of_covers = this.model.get("data").amountMultiple;
		for (var i=0; i<number_of_covers; i++) {
			var blank_book_cover_view = new Book_Cover_View({});
			less_detail_image.append(blank_book_cover_view.el);
			this.book_cover_views.push(blank_book_cover_view);
		}
		
		var images = less_detail_image.find(".book-cover-container");
		this.set_less_detail_image_layout(images);

		this.hide_nav_buttons();
		this.show();
	}
});

var Less_Detail_View_Pickchoose_Closed = Less_Detail_View_Base.extend({
	render: function() {
		var params = {
			heading: this.model.get("data").name,
			text: this.parse_markdown(this.model.get("description")),
			subtitle: this.model.get("subtitle")
		};
		var content = this.template(params);
		this.$el.html(content);

		var book_cover_view = new Book_Cover_View({
			model: this.model,
			do_not_show_more_detail: true
		});
		this.$(".less-detail-image").append(book_cover_view.el);

		this.hide_nav_buttons();
		this.show();
	}
});

var Pick_Deal_View = Base_Sale_View.extend({
	get_pricing_params: function() {
		var params = {
			original_price: "-",
			new_price: "-",
			you_save: ""
		};
		var original_price = 0;
		var number_of_slots_filled = 0;
		for (var i=0; i<this.less_detail_view.book_cover_views.length; i++) {
			var selected_item_view = this.less_detail_view.book_cover_views[i];
			if (!selected_item_view.should_show_blank_image()) {
				number_of_slots_filled++;
				original_price += selected_item_view.model.get("price");
			}
		}
		var new_price = this.model.get("data").priceMultiple;
		if (number_of_slots_filled > 0 && number_of_slots_filled < this.model.get("data").amountMultiple) {
			new_price = this.model.get("data").priceSingle * number_of_slots_filled;
		}
		if (number_of_slots_filled > 0) {
			params.original_price = original_price.toMoneyString();
			params.new_price = new_price.toMoneyString();
			params.you_save = this.calculate_you_save_value(original_price, new_price);
		}
		return params;
	},
	render: function() {

		var deal_is_open = this.model.get("open");
		var deal_is_dealfuel = sale_periods.current_deal_is_for_dealfuel();

		if (deal_is_open) {
			this.render_open_detail();
			this.render_open_checkout();
		}
		else if (deal_is_dealfuel) {
			this.render_open_detail();
			this.render_open_checkout();
		}
		else {
			this.render_open_detail();
			this.render_open_checkout();
		}
		this.render_price();
		this.show_helper_text();
	},
	render_open_detail: function() {
		this.less_detail_view = new Less_Detail_View_Pickchoose_Open({
			model: this.model
		});
	},
	render_closed_detail: function(item_model) {
		new Less_Detail_View_Pickchoose_Closed({model: item_model});
	},
	render_open_checkout: function() {
		this.checkout_heading.text("Pick " + this.model.get("data").amountMultiple + " for " + this.model.get("data").priceMultiple.toMoneyString() + "!");
		var checkout_inputs = $("#checkout .inputs-container");
		checkout_inputs.empty();

		// Add selects to checkout
		var view = this;
		var pickdeal_data = this.model.get("data");

		var index_of_first_item_which_is_in_stock = null;
		for (var i=0; i< pickdeal_data.items.length; i++) {
			var item = pickdeal_data.items[i];
			if (index_of_first_item_which_is_in_stock == null && item.inStock) {
				index_of_first_item_which_is_in_stock = i;
				break;
			}
		}

		var number_of_selects = pickdeal_data.amountMultiple;
		for (var i=0; i<number_of_selects; i++) {
			pickdeal_data["id"] = i;
			var pickdeal_model = new Backbone.Model(pickdeal_data);
			var select = new Pickdeal_Select_View({
				model: pickdeal_model,
				parent: this,
				index_of_first_item_which_is_in_stock: index_of_first_item_which_is_in_stock
			});
			checkout_inputs.append(select.el);
		}

		$('#current-day-hidden').val(this.model.get('day'));

		this.checkout_form.attr("action", '/data/pick-choose');
	},
	render_closed_checkout: function() {
		// TODO this isn't very backboney
		var view = this;
		this.checkout_heading.text("Pick n Choose");
		this.checkout_inputs.empty();
		var items = this.model.get("data").items;
		for (var i=0; i<items.length; i++) {
			var template = _.template($("#checkout_radiobutton").html());
			var $el = $(template({
				id: i,
				name: items[i].name,
				price: -1
			}));
			var $radio = $el.find("input");
			$radio.data("item", items[i]);
			$radio.change(function() {
				var item_json = $(this).data("item");
				var item_model = new Backbone.Model(item_json);
				view.render_closed_detail(item_model);
			});
			if (i == 0) {
				$radio.attr("checked", "checked");
			}
			this.checkout_inputs.append($el);
		}
	}
});

var Pickdeal_Select_View = Backbone.View.extend({
	tagName: "p",
	template: _.template($("#pickdeal_select").html()),
	initialize: function() {
		this.render();
	},
	events: {
		"change": "display_book_cover"
	},
	render: function() {
		var template_params = this.model.toJSON();
		template_params.index_of_first_item_which_is_in_stock = this.options.index_of_first_item_which_is_in_stock;
		var content = this.template(template_params);
		this.$el.html(content);
		this.display_book_cover();
	},
	display_book_cover: function() {
		var item_model = this.get_item_model_from_select_value();

		var parent = this.options.parent;

		var i = this.model.get("id");
		var book_cover_view = parent.less_detail_view.book_cover_views[i];
		book_cover_view.model = item_model;
		book_cover_view.render();

		parent.less_detail_view.show();
		parent.render_price();
	},
	get_item_model_from_select_value: function() {
		var item_model = null;
		var val = this.$("select").val();
		if (val != "") {
			var items = this.model.get("items");
			for (var i=0; i<items.length; i++) {
				var item = items[i];
				if (item.sku == val) {
					item_model = new Backbone.Model(item);
				}
			}
		}
		return item_model;
	}
});



var sale_periods = new Sale_Period_Collection();
var sale_view = new Sale_View();


$document.scroll(function() {
	if (Math.round(window.day_of_sale_fractional) != sale_view.day_of_sale_currently_displayed) {
		sale_view.update_sale_view_with_current_days_data();
	}
});


Number.prototype.toMoneyString = function() {
	var val = this.valueOf();
	var is_not_a_number = isNaN(parseFloat(val));
	if (is_not_a_number) {
		return val;
	}
	var corrected_value = Math.round(val * 100) / 100.0;
	if (corrected_value == 0) {
		return "Free!";
	}
	var unpadded_string = corrected_value.toString();
	var index_of_decimal = unpadded_string.indexOf(".");
	var padded_string = unpadded_string;
	if (index_of_decimal == 0) { // No leading 0 on a <1 value - toString adds this anyhow
		padded_string = "0" + unpadded_string;
	}
	if (index_of_decimal == unpadded_string.length - 2 && index_of_decimal != -1) { // No trailing 0 on a .X0 value
		padded_string = unpadded_string + "0";
	}
	return "$" + padded_string;
};
Number.prototype.toTimeString = function() {
	hours_remaining = Math.floor(this / 3600);
	minutes_remaining = Math.floor((this - hours_remaining*3600) / 60);
	seconds_remaining = Math.floor(this - hours_remaining*3600 - minutes_remaining*60);
	return hours_remaining + "h " + minutes_remaining + "m " + seconds_remaining + "s";
};
Number.prototype.rightPad = function(char, total_length) {
	var number_string = this.toString();
	var split_at_decimal_point = number_string.split(".");
	var integer_portion = split_at_decimal_point[0];
	var decimal_portion = "";
	if (split_at_decimal_point.length > 1) {
		decimal_portion = "." + split_at_decimal_point[1];
	}
	while(integer_portion.length < total_length) {
		integer_portion = char + integer_portion;
	}
	return integer_portion + decimal_portion;
};

