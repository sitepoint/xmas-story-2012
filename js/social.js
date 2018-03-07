/*

Author: Ian Coleman - ian.coleman@sitepoint.com

Wrapper for making social stuff easier - no dependencies on any external libraries

Usage examples:
s = new Social();
s.facebook.set_element_to_post_to_feed_on_click(my_facebook_element, my_facebook_parameters);
s.twitter.set_element_to_post_to_twitter_on_click(my_twitter_element, my_twitter_parameters);


References:
	Twitter:
		https://web.archive.org/web/20140522195941/https://dev.twitter.com/docs/intents

	Facebook:
		https://developers.facebook.com/docs/guides/web/
		https://developers.facebook.com/docs/reference/javascript/FB.login/

*/


Social = function() {


Facebook = function() {

	/*
	If they pass all the tests required for your site / app to interact with
	facebook, we show them the status of what we did to their feed via the
	function 'display_success_status'.

	If they fail any of the tests along the way to performing an action, we
	need to show a dialog which allows them to approve our app or login or
	whatever. This is done via the function 'display_click_to_proceed_dialog'

	If something fails, the status / reason is shown via the function
	'display_error_status'



	You can override the default behaviour for displaying stuff by setting
	whichever of these properties you want to display differently from default:

	social.facebook.set_options({
		display_click_to_proceed_dialog: function(login_button_handler) {
			// Do whatever you want, eg $("#login_button").click(login_button_handler);
		},
		display_success_status: function() {
			// Do whatever you want, eg $("#status").text("Post was successful").addClass("green");
		},
		display_error_status: function(msg) {
			// Do whatever you want, eg $("#status").text("msg").addClass("red");
		}
	})

	Note that these are all optional, and some decent default behaviour will be
	used if these properties are not provided. But sometimes it's nice to
	override this with your own dialog displays and actions.
	*/



	// Private properties

	var facebook = this;

	// Public functions

	this.set_element_to_post_to_feed_on_click_simple = function(element) {
		// Uses sharer.php to share the current url. Also see
		// set_element_to_post_to_feed_on_click_sharer_php
		// for a more customisable version of this sharing technique.
		if(element) {
			// TODO warn if no metadata found
			// TODO warn if not an element, eg jquery object
			var u = encodeURIComponent(window.location.href);
			var url = 'https://www.facebook.com/sharer.php?u='+u;
			var anchor = wrap_element_in_anchor(element, url);
			anchor.setAttribute("target", "_blank");
		}
		else {
			//console.log("No element specified for set_element_to_post_to_feed_on_click_simple")
		}
	};

	this.set_element_to_post_to_feed_on_click_sharer_php = function(element, post_params) {
		// Uses sharer.php with extra parameters.
		// see https://web.archive.org/web/20140212224448/http://www.therykers.net/?p=37
		var possible_params = ["url", "images", "title", "summary"];
		if(element) {
			var url = "https://www.facebook.com/sharer.php?s=100";
			for (var i=0; i<possible_params.length; i++) {
				var possible_param_key = possible_params[i];
				if (possible_param_key in post_params) {
					if (possible_param_key != "images") {
						var val = encodeURIComponent(post_params[possible_param_key]);
						url += "&p[" + possible_param_key + "]=" + val;
					}
					else {
						for (var j=0; j<post_params.images.length; j++) {
							var val = encodeURIComponent(post_params[possible_param_key][j]);
							url += "&p[" + possible_param_key + "][" + j + "]=" + val;
						}
					}
				}
			}
			var anchor = wrap_element_in_anchor(element, url);
			anchor.setAttribute("target", "_blank");
		}
		else {
			//console.log("No element specified for set_element_to_post_to_feed_on_click_sharer_php")
		}
		/*&p[url]=the url you want to share
		&p[images][0]=the image you want to share
		&p[title]=the title you want to share
		&p[summary]=the description/summary you want to share*/
	};

	this.set_element_to_post_to_feed_on_click = function(element, post_params) {
		post_params.permissions = ["publish_stream"];
		bind_element_to_facebook_url(element, post_params, '/me/feed');
		// See http://developers.facebook.com/docs/reference/dialogs/feed/
	};

	this.set_element_to_post_to_photos_on_click = function(element, post_params) {
		post_params.permissions = ["user_photos", "publish_stream"];
		bind_element_to_facebook_url(element, post_params, '/me/photos');
	};

	this.set_options = function(options) {
		/* Accepts:
		display_success_status
		display_error_status
		display_click_to_proceed_dialog
		*/
		facebook.options = options;
		init_facebook();
	};

	// Private functions

	function bind_element_to_facebook_url(element, post_params, url, retry_timeout) {
		if(facebook.FB_is_initialised) {
			//console.log("Successfully bound facebook url to element");
			bind(element, "click", function() {
				facebook.post_params = post_params;
				post_to_facebook_via_url(url, post_params);
			});
		}
		else {
			if (typeof(retry_timeout) == "undefined") {
				retry_timeout = 100;
			}
			if (retry_timeout < 60000) {
				//console.log("Facebook API hasn't loaded yet, will retry binding to element in " + (retry_timeout / 1000) + " seconds");
				setTimeout(function() {
					bind_element_to_facebook_url(element, post_params, url, retry_timeout * 2);
				}, retry_timeout * 2);
			}
		}
	};

	function post_to_facebook_via_url(url, post_params) {
		facebook.action_if_user_passes_all_tests = function() {
			//console.log("User has passed all tests");
			FB.api(url, 'post', post_params, handle_post_to_feed_response);
		}
		try_to_post_to_facebook();
	};

	function try_to_post_to_facebook() {
		// Tests if the user
		//	 is logged in
		//	 has given the app the required permissions
		// It's asynchronous so a little bit of a pain in the butt to make it
		// simple to follow the logic.
		FB.getLoginStatus(function (response) {
			//console.log("response to FB.getLoginStatus is below")
			//console.log(response)
			if (response.status === 'connected') {
				check_for_permissions();
			}
			else {
				display_click_to_proceed_dialog();
			}
		});
	};

	function handle_post_to_feed_response(response) {
		//console.log("Response to handle_post_to_feed_response is below")
		//console.log(response)
		if (!response) {// || response.error_code == "453") {
			display_click_to_proceed_dialog();
		}
		else if (response.error_code) {
			display_error_status("Facebook had a problem: "+ response.error_msg +" (code "+ response.error_code +")", 'alert-error', 6500);
		}
		else {
			if (response.id) {
				display_success_status();
			}
			else {
				display_error_status("The user pressed cancel at the 'accept permissions' prompt for your app");
			}
		}
	};

	function property_is_in_facebook_options(property) {
		return "options" in facebook && property in facebook.options;
	};

	function display_success_status() {
		if (property_is_in_facebook_options("display_success_status")) {
			facebook.options.display_success_status();
		}
		else {
			display_default_success_status();
		}
	};

	function display_default_success_status() {
		display_spammy_success_status();
		//console.log("Successful post was made");
	};

	function display_error_status(msg) {
		if (property_is_in_facebook_options("display_error_status")) {
			facebook.options.display_error_status(msg);
		}
		else {
			display_default_error_status(msg);
		}
	};

	function display_default_error_status(msg) {
		display_spammy_error_status(msg);
		//console.log(msg);
	};

	function check_for_permissions() {
		FB.api('/me/permissions', function (response) {
			//console.log("response to /me/permissions is below");
			//console.log(response);
			if (response.error) {
				display_error_status("Facebook had a problem: "+ response.error.message +" (code "+ response.error.code +")");
			}
			var perms = response.data[0];
			var failed = false;
			for(var i in facebook.post_params.permissions) {
				if (!perms[facebook.post_params.permissions[i]]) {
					failed = true;
					display_click_to_proceed_dialog();
				}
			}
			if (!failed) {
				facebook.action_if_user_passes_all_tests();
			}
		});
	};

	function display_click_to_proceed_dialog() {
		// Some things require a click to proceed. This handles that.
		if (property_is_in_facebook_options("display_click_to_proceed_dialog")) {
			facebook.options.display_click_to_proceed_dialog(facebook.login);
		}
		else {
			display_default_click_to_proceed_dialog();
		}
	};

	function display_default_click_to_proceed_dialog() {
		show_spammy_facebook_dialog();
	};

	function login() {
		// see https://developers.facebook.com/docs/reference/javascript/FB.login/
		var login_params = {};
		if (facebook.post_params && "permissions" in facebook.post_params) {
			login_params = { scope: facebook.post_params.permissions.join() };
		}
		FB.login(handle_login_response, login_params);
	};

	function handle_login_response(response) {
		//console.log("Response to handle_login_response is below")
		//console.log(response)
		if (!response.authResponse) {
			// TODO this can be improved
			//console.log("The user did not authorize your application to access their profile");
			display_error_status("This site wasn't given permission to access your facebook profile.");
		}
		else {
			facebook.action_if_user_passes_all_tests();
		}
	};

	function init_facebook() {
		// This mumbo-jumbo is adapted from
		// https://developers.facebook.com/docs/guides/web/
		facebook.FB_is_initialised = typeof(FB) != "undefined";
		if (!(facebook.FB_is_initialised)) {

			if (typeof(facebook.options) == "undefined" || !("appId" in facebook.options)) {
				//console.log("If you want to use facebook you need to provide your facebook appId to Social (via social.facebook.set_options), or initialise the facebook SDK yourself by implementing the code at https://developers.facebook.com/docs/guides/web/");
				return;
			}

			var div = document.createElement("div");
			div.id = "fb-root";
			document.body.appendChild(div);

			window.fbAsyncInit = function() {
			FB.init({
				appId      : facebook.options.appId, // App ID - default to the test app for this library
				channelUrl : facebook.options.channelUrl || "", // Channel File - TODO check blank string works same as not including channelUrl in options at all
				status     : true, // check login status
				cookie     : true, // enable cookies to allow the server to access the session
				xfbml      : true  // parse XFBML
				});
			FB.getLoginStatus(function() {
				facebook.FB_is_initialised = true;
			});
			};
			// Load the SDK Asynchronously
			(function(d){
				var js, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
				if (d.getElementById(id)) {return;}
				js = d.createElement('script'); js.id = id; js.async = true;
				js.src = "//connect.facebook.net/en_US/all.js";
				ref.parentNode.insertBefore(js, ref);
			}(document));

			// TODO look for open graph meta tags and if none exist, show a warning
			// that when someone shares the page via the direct url facebook won't
			// show their pretty shit.

			// TODO consider pumping some stuff through facebook debugger
		}
	}



	// HERE DOWN FOR FACEBOOK IS UGLY HTML MANIPULATION USING JAVASCRIPT - IT
	// WORKS BUT ANYTHING WITH 'spammy' IN IT IS UP FOR IMPROVEMENT LATER

	// Public method for testing
	this.test_spammy_facebook_dialog = function() {
		show_spammy_facebook_dialog();
	}

	// This uses pure js so is pretty long and tedious, but will work on all
	// browsers

	var spammy_namespace = "ridiculous_css_namespace_for_social_that_wont_clash"; // ok, ok, this can be shorter.
	var spammy = {
		ok_text: "OK",
		cancel_text: "Cancel",
		background_id: spammy_namespace + "-dialog_background",
		dialog_id: spammy_namespace + "-dialog",
		dialog_text_id: spammy_namespace + "-heading",
		ok_button_id: spammy_namespace + "-ok_button",
		cancel_button_id: spammy_namespace + "-cancel_button"
	};

	function show_spammy_facebook_dialog() {

		var dialog_text = "You need to let Facebook know you want to continue";

		var background = get_spammy_dialog_background();
		var dialog = get_spammy_dialog();

		var dialog_p = document.createElement("p");
		dialog_p.id = spammy.dialog_text_id;
		dialog_p.innerHTML = dialog_text;
		dialog.appendChild(dialog_p);

		var dialog_buttons = document.createElement("div");
		dialog.appendChild(dialog_buttons);

		var dialog_ok_button = document.createElement("button");
		dialog_ok_button.id = spammy.ok_button_id;
		dialog_ok_button.innerHTML = spammy.ok_text;
		bind(dialog_ok_button, "click", function() {
			login();
			close_spammy_dialog();
		});
		dialog_buttons.appendChild(dialog_ok_button);

		var dialog_cancel_button = document.createElement("button");
		dialog_cancel_button.id = spammy.cancel_button_id;
		dialog_cancel_button.innerHTML = spammy.cancel_text;
		bind(dialog_cancel_button, "click", close_spammy_dialog);
		dialog_buttons.appendChild(dialog_cancel_button);

		document.body.appendChild(background);
		document.body.appendChild(dialog);

		set_spammy_dialog_position(dialog);
	};

	function display_spammy_error_status(msg) {
		display_spammy_status(msg, "red");
	};

	function display_spammy_success_status() {
		display_spammy_status("Successful post was made", "green");
	};

	function display_spammy_status(msg, color) {
		var background = get_spammy_dialog_background();
		var dialog = get_spammy_dialog();

		var dialog_p = document.createElement("p");
		dialog_p.id = spammy.dialog_text_id;
		dialog_p.innerHTML = msg;
		dialog_p.style.color = color;
		dialog.appendChild(dialog_p);

		var dialog_buttons = document.createElement("div");
		dialog.appendChild(dialog_buttons);

		var dialog_ok_button = document.createElement("button");
		dialog_ok_button.id = spammy.ok_button_id;
		dialog_ok_button.innerHTML = spammy.ok_text;
		bind(dialog_ok_button, "click", function() {
			close_spammy_dialog();
		});
		dialog_buttons.appendChild(dialog_ok_button);

		document.body.appendChild(background);
		document.body.appendChild(dialog);

		set_spammy_dialog_position(dialog);
	};

	function get_spammy_dialog_background() {
		var background = document.createElement("div");
		background.style.position = "absolute";
		background.style.left = 0;
		background.style.top = 0;
		background.style.opacity = 0.5;
		background.style.backgroundColor = "#999";
		background.style.height = window.innerHeight + "px";
		background.style.width = window.innerWidth + "px";
		background.id = spammy.background_id;
		return background;
	};

	function get_spammy_dialog() {
		var dialog = document.createElement("div");
		dialog.id = spammy.dialog_id;
		dialog.style.position = "absolute";
		dialog.style.opacity = 1;
		dialog.style.textAlign = "center";
		dialog.style.padding = "20px";
		dialog.style.borderRadius = "15px";
		dialog.style.backgroundColor = "#FFF";
		return dialog;
	};

	function set_spammy_dialog_position(dialog) {
		dialog.style.left = ((document.body.clientWidth - dialog.clientWidth) / 2) + "px";
		dialog.style.top = ((document.body.clientHeight - dialog.clientHeight) / 2) + "px";
	};

	function close_spammy_dialog() {
		var dialog_background = document.getElementById(spammy.background_id);
		document.body.removeChild(dialog_background);

		var dialog = document.getElementById(spammy.dialog_id);
		document.body.removeChild(dialog);
	};

};





Twitter = function() {

	// Public functions

	var twitter = this;
	initialise();

	this.set_element_to_post_to_twitter_on_click = function(element, post_params) {
		// see https://dev.twitter.com/docs/intents#tweet-intent
		var url_params = parameterise(post_params);
		var url = "https://twitter.com/intent/tweet?" + url_params;
		if (element.tagName.toLowerCase() == "a") {
			element.href = url;
		}
		else {
			wrap_element_in_anchor(element, url);
		}
	};

	function initialise() {
		if (typeof(__twttrlr) == "undefined") {
			var twitter_widgets = document.createElement("script");
			twitter_widgets.src = "//platform.twitter.com/widgets.js";
			document.body.appendChild(twitter_widgets);
		}
	};

};


this.facebook = new Facebook();
this.twitter = new Twitter();





function wrap_element_in_anchor(element, url) {
	var anchor = document.createElement("a");
	anchor.setAttribute("href", url);
	var parent_el = element.parentNode;
	var children = parent_el.children;
	for (var i=0; i<children.length; i++) {
		if (children[i] == element) {
			var next_element = children[i+1];
			var detached_element = parent_el.removeChild(element);
			anchor.appendChild(detached_element);
			if (next_element != null) {
				parent_el.insertBefore(anchor, next_element);
			}
			else {
				parent_el.appendChild(anchor);
			}
			break;
		}
	}
	return anchor;
}

function parameterise( a ) {
	// Simplified jQuery.param()
	var s = [],
		add = function( key, value ) {
			s[ s.length ] = encodeURIComponent( key ) + "=" + encodeURIComponent( value );
		};

	// If an array was passed in, assume that it is an array of form elements.
	for (var key in a) {
		add( key, a[key] );
	};

	// Return the resulting serialization
	return s.join( "&" ).replace( /%20/g, "+" );
};

function bind( elem, evt, cb ) {
	// from https://web.archive.org/web/20121016001923/http://www.creativemeat.com/development/2012-01-10-oneupweb-cross-browser-event-binding-without-jquery/
	if ( elem.addEventListener ) {
		elem.addEventListener(evt,cb,false);
	}
	else if ( elem.attachEvent ) {
		elem.attachEvent('on' + evt, function(){
			cb.call(event.srcElement,event);
		});
	}
};



};
