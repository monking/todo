/*
 * author: Christopher Lovejoy <lovejoy.chris@gmail.com>
 * copyright 2013 under an Attribution Creative Commons license
 * http://creativecommons.org/licenses/by/3.0
 */

/*
 * Takes any number of arguments. Behaves differently for Functions and all
 * other Objects.
 *
 * Each Function argument inherits its next argument as its new prototype, and
 * the `_super` property is added as a reference to that parent function. All
 * but the last argument will be altered.
 *
 * Object arguments are layered onto the first argument so that earlier
 * arguments take precedent, and only the first argument is altered.
 */
function Extends() {
	var i, len;
	len = arguments.length;
	if (typeof arguments[0] === "function") {// affects all arguments
		for (i = len - 1; i >= 1; i--) {
			Extends.prototype.inheritFunction(arguments[i-1], arguments[i]);
		}
	} else {
		for (i = 1; i < len; i++) {// affects only the first argument
			arguments[0] = Extends.prototype.inheritObject(arguments[0], arguments[i]);
		}
	}
	return arguments[0];
}
Extends.prototype.inheritFunction = function(_child, _parent) {
	_child.prototype = new _parent();
	_child.prototype.constructor = _child;
	_child.prototype._super = _parent;
	_child.prototype._doSuper = function(methodName, args) {
		_parent.prototype[methodName].apply(this, args);
	};
	_child.prototype._superName = function() {
		return this._super.toString().replace(/^function ([^\(]+)(.|\s|\r|\n)*/, "$1");
	};
	return _child;
};
Extends.prototype.inheritObject = function(_child, _parent) {
	if (typeof _child === "undefined") {
		_child = _parent;
	} else {
		var key;
		for (key in _parent) {
			if (typeof _child[key] === "undefined")
				_child[key] = _parent[key];
		}
	}
	return _child;
};

// String.pad
if (!String.prototype.pad) {
	String.prototype.pad = function(length, char) {
		var newString = this;
		while (newString.length < length) newString = (char.toString() || ' ') + newString;
		return newString.toString();
	}
}

// toggleClass
$.fn.toggleClass = function(className, add) {
	if (typeof add === "undefined") {
		add = !this.hasClass(className);
	}
	add ? this.addClass(className) : this.removeClass(className);
	return this;
};

// Controller
var TodoController = function() {};
TodoController.prototype = {
	init: function() {
		var I = this;
		this.state = {
			changes: null
		};
		this.setupKeyboardShortcuts();
		if (!this.restoreState()) {
			this.setupNotifications();
			this.setupUI();
			this.fetchData();
		}
		$(window).unload(function() {
			I.clear();
		});
	},
	clear: function() {
		for(var id in this.notifications.open) {
			if (typeof this.notifications.open[id] !== "function") {
				// FIXME: counter-hack for 'extends' being enumerable
				this.notifications.open[id].close();
			}
		}
	},
	add: function(parent, data) {
		if (! parent.hasOwnProperty('contains') || ! types.hasOwnProperty(parent.contains)) return;
		var I = this;
		var types = {
			event: function(data) {
				return Extends(data, { name: 'Untitled', start: I.uTime, segments: [] });
			},
			segment: function(data) {
				return Extends(data, { start: I.uTime, end: I.uTime, type: '' });
			},
			task: function(data) {
				return Extends(data, { name: 'Untitled' });
			},
			project: function(data) {
				return Extends(data, { name: 'Untitled' });
			}
		};
		parent.children.push(types[parent.contains](data));
		// mark new item for next sync
	},
	edit: function(options) {
		if (!options) return;
		Extends(options, {
			address: [0], // array of children indices, or 
			changes: {}
		});
		var item = this.data;
		for (var i = 0; i < options.address.length; i++) {
			if (isNaN(options.address[i])) {
				item = item[options.address[i]];
			} else {
				item = item.children[options.address[i]];
			}
		}
		console.log(item);
		Extends(item, options.changes, true);
		console.log(item);
		// mark edited item for next sync
	},
	saveState: function(options) {
		if (window.localStorage) {
			window.localStorage.state = JSON.stringify(this.state);
			if (options) {
				if (options.data)
					window.localStorage.indexedData = JSON.stringify(this.data);
				if (options.body)
					window.localStorage.bodyState = $('body').html();
			}
		}
	},
	restoreState: function() {
		if (window.localStorage
		&& window.localStorage.state ) {
			this.state = JSON.parse(window.localStorage.state);
			if (window.localStorage.indexedData
			&& window.localStorage.bodyState) {
				this.data = JSON.parse(window.localStorage.indexedData);
				$('body').html(window.localStorage.bodyState);
				this.setupNotifications();
				this.setupUI();
				this.ui.tick.element = $('#tick');
				this.connectCalendarUI();
				this.setupTags();
				this.setupTasks();
				this.tick();
			} else {
				this.fetchData();
			}
			return true;
		}
		return false;
	},
	setupUI: function() {
		var I = this, i, j, optGroup, buttons, button;

		this.ui = {
			body:{ element: $('body') },
			punch:{ element: $('#punch') },
			scheduleContainer:{ element: $('#schedule-container') },
			schedule:{
				element: $('#schedule'),
				dayWidth: 480
			},
			tick:         { element: null }, // this is generated later
			todayTitle:   { element: $('#today-title') },
			tasks:        { element: $('#tasks') },
			calendar:     { element: $('#calendar') },
			calendarWrap: { element: $('#calendar-wrap') },
			calendarBody: { element: $('#calendar-body') },
			inbox:        { element: $('#inbox') },
			inboxButton:  { element: $('#inbox-button') },
			optionsButton:{ element: $('#options-button') },
			updateButton: { element: $('#update-button') },
			menuContainer:{ element: $('#menu-container') },
			optionsMenu:  { element: $('#options-menu') },
			updateMenu:   { element: $('#update-menu') },
			contextMenu:  { element: $('#context-menu') }
		};
		this.ui.punch.data = this.ui.punch.element.html().replace(/<[^>]+>/g, '');

		// Update Menu
		this.ui.updateButton.element.click(function() {
			I.toggleMenu(I.ui.updateMenu);
		});
		this.ui.updateMenu.buttons = $("button", this.ui.updateMenu.element);
		for (i = 0; i < this.ui.updateMenu.buttons.length; i++) {
			button = this.ui.updateMenu.buttons[i];
			button.click(function() {
				switch (this.attributes.name.value) {
					case 'load':
						I.loadUpdated();
						break;
					case 'save':
						I.flushChanges();
						break;
				}
				I.toggleMenu(false);
			});
		}

		// Options Menu
		this.ui.optionsButton.element.click(function() {
			I.toggleMenu(I.ui.optionsMenu);
		});
		$optGroups = $(".opt-group", this.ui.optionsMenu.element);
		$optGroups.each(function() {
			buttons = $("button", $(this));
			switch ($(this).attr("name")) {
				case "options":
					$("button[name=notifications]", this).click(function() {
						I.toggleNotifications();
						I.toggleMenu(I.ui.optionsMenu, false);
					});
					break;
				case "styles":
					I.ui.optionsMenu.styles = [];
					$("button", this).each(function() {
						I.ui.optionsMenu.styles.push($(this).attr(name));
						$(this).click(function() {
							I.switchStyle($(this).val());
							I.toggleMenu(I.ui.optionsMenu, false);
						});
					});
					break;
			}
		});
		if (window.localStorage && window.localStorage.style) {
			this.switchStyle(window.localStorage.style);
		} else {
			this.switchStyle('dark');
		}

		// inbox prompt
		$('#inbox-title').click(function() {
			I.toggleInbox();
		});
		this.ui.inboxButton.element.click(function() {
			if (/\bdisabled\b/.test(this.className)) return;
			I.addToInbox();
		});

		// Schedule
		if (this.state.scheduleScroll)
			this.ui.scheduleContainer.element.scrollLeft = this.state.scheduleScroll;
	},
	setupNotifications: function() {
		this.notifications = {
			open:{},
			log:{}
		};
		if (typeof this.state.notifications === "undefined") {
			this.state.notifications = !!(window.webkitNotifications && !window.webkitNotifications.checkPermission());
		}
	},
	toggleNotifications: function() {
		var I = this;
		if (this.state.notifications) {
			this.state.notifications = false;
		} else {
			if (window.webkitNotifications) {
				if (window.webkitNotifications.checkPermission()) {
					window.webkitNotifications.requestPermission(function() {
						I.state.notifications = true;
						I.remind();
					});
				} else {
					this.state.notifications = true;
				}
			}
		}
	},
	notify: function(id, message, title, force) {
		var I = this, openId, count = 0, first;
		if (
			!this.state.notifications
			|| (!force
				&& typeof this.notifications.open[id] === "undefined"
				&& typeof this.notifications.log[id] !== "undefined")
			) {
			return;
		}

		if (typeof title === "undefined")
			title = "TODO";

		if (window.webkitNotifications && !window.webkitNotifications.checkPermission()) {
			/*
			if (typeof this.notifications.open[id] !== "undefined") {
				// FIXME: delay of close event deletes the entry for the new
				// notification about to be created, not the old one being
				// closed
				this.notifications.open[id].onclose = function() {};
				this.notifications.open[id].close();
				delete this.notifications.open[id];
			}
			*/
			for (openId in this.notifications.open) {
				// FIXME: accounting for enumerable `extends` function
				if (typeof this.notifications.open[openId] === "function") continue;
				if (!first) first = this.notifications.open[openId];
				count++;
			}
			if (count > 3) {
				first.close();
			}

			this.notifications.open[id] = window.webkitNotifications.createNotification("/favicon.ico", title, message);
			this.notifications.open[id].onclose = function() {
				delete I.notifications.open[id];
			};
			this.notifications.open[id].show();
		}
		this.notifications.log[id] = true;
	},
	setupKeyboardShortcuts: function() {
		var I = this;
		var responders = {
			32:  /* SPACE */ 'addToInbox',
			37:  /* LEFT  */ 'reverseDay',
			39:  /* RIGHT */ 'advanceDay',
			67:  /* c     */ 'toggleCalendar',
			72:  /* h     */ 'reverseDay',
			73:  /* i     */ 'toggleInbox',
			74:  /* j     */ 'advanceMonth',
			75:  /* k     */ 'reverseMonth',
			76:  /* l     */ 'advanceDay',
			84:  /* t     */ 'gotoToday',
			85:  /* u     */ 'loadUpdated'
		};
		$(document.body).keydown(function(event) {
			console.log(event.keyCode);
			// ignore keys with modifiers
			if (event.metaKey || event.altKey || event.shiftKey || event.ctrlKey)
				return true;
			if (responders.hasOwnProperty(event.keyCode)) {
				I[responders[event.keyCode]]();
				return false;
			}
			return true;
		});
	},
	fetchData: function(options) {
		var I = this;
		if (!options) options = {};
		Extends(options, {
			disk: false,
			callback: null
		});

		var fetched = {
			todo: false,
			punch: false
		};
		var setFetched = function(name) {
			fetched[name] = true;
			for (key in fetched) {
				if (!fetched[key]) return;
			}
			if (!I.data) return;
			I.draw();
			if (typeof options.callback === 'function') {
				options.callback();
			}
		};

		// fetch todo data
		var parseTodo = function(data) {
			if (!data) return;
			if (window.localStorage) {
				window.localStorage.todo = JSON.stringify(data);
			}
			var i = 0;
			var makeIndex = function(object) {
				object.tmpKey = i++;
				for (var key in object) {
					if (typeof object[key] === 'object' && object[key]) {
						makeIndex(object[key]);
					}
				}
				return object;
			};
			I.data = makeIndex(data);
		};
		if (JSON) {
			if (window.localStorage && window.localStorage.todo && !options.disk) {
				parseTodo(window.localStorage.todo);
				setFetched('todo');
			} else {
				if (this.state.changes && !confirm("changes queued, load anyway?"))
					return false;
				$.ajax({
					url: 'api.php?action=json' + (options.disk ? '&f' : ''),
					dataType: 'json',
					success: function(data) {
						parseTodo(data);
					},
					complete: function() {
						setFetched('todo');
					}
				});
			}
		} else {
			alert('Please use a browser which supports JSON.');
		}

		// fetch punch data
		var parsePunch = function(data) {
			if (window.localStorage) {
				window.localStorage.punch = data;
			}
			I.ui.punch.data = data;
		};
		if (window.localStorage && window.localStorage.punch && !options.disk) {
			parsePunch(window.localStorage.punch);
			setFetched('punch');
		} else {
			$.ajax({
				url: 'api.php?action=punch',
				success: function(data) {
					parsePunch(data);
				},
				complete: function() {
					setFetched('punch');
				}
			});
		}
	},
	loadUpdated: function() {
		this.fetchData({ disk:true });
	},
	/*
	saveData: function() {
		var I = this;
		var data = JSON.parse(JSON.stringify(this.data));
		var stripIndex = function(object) {
			if (object.hasOwnProperty('tmpKey'))
				delete object.tmpKey;
			for (var key in object) {
				if (typeof object[key] === 'object' && object[key]) {
					stripIndex(object[key]);
				}
			}
		};
		stripIndex(data);
		var json = JSON.stringify(data);
		window.getAjax({
			url: 'api.php?action=save',
			method: 'POST',
			data: 'data=' + encodeURIComponent(json),
			success: function(data) {
				try {
					data = JSON.parse(data);
					if (data.status == 'ok') {
						var button = $('.save', I.ui.updateMenu.element);
						button.addClass('success');
						setTimeout(function() {
							button.removeClass('success');
							I.toggleMenu(I.ui.updateMenu, false);
						}, 1000);
					} else {
						alert(data);
					}
				} catch(e) {}
			},
			complete: function(data) {
			}
		});
	},
	*/
	lookupObject: function(indexKey) {
		var crawl = function(object) {
			if (typeof object === 'object') {
				if (object.tmpKey == indexKey) {
					return object;
				} else {
					for (var prop in object) {
						// prop;
						if (object[prop] && typeof object[prop] === "object") {
							var result = crawl(object[prop]);
							if (typeof result !== 'undefined') return result;
						}
					}
				}
			}
		};
		return crawl(this.data, indexKey);
	},
	markupSchedule: function(day, todayTime) {
		var i, j, k, markup = '', event, classes, duration, durationFormatted, eventEnd, left, segment, width, nameLeft, reminderTooltip;

		if (!todayTime)
			todayTime = day.time

		if (day.hasOwnProperty('schedule')) {
			for (i = 0; i < day.schedule.length; i++) {
				event = day.schedule[i];

				eventEnd = event.children[event.children.length - 1].end;
				left = this.secondsToPixels(event.start - todayTime);
				classes = ["event"];
				markup += '<div class="event" start="' + event.start + '" end="' + eventEnd + '" style="'
						+ 'margin-left:' + left + 'px;'
					+ '">';
				for (j = 0; j < event.children.length; j++) {
					segment = event.children[j];
					duration = segment.end - segment.start;
					left = this.secondsToPixels(segment.start - event.start);
					width = this.secondsToPixels(duration);
					durationFormatted = (duration < 3600?
						Math.floor(duration / 60) + " min.":
						Math.floor(duration / 3600) + " hrs."
					);
					markup += '<div class="segment ' + segment.type + '" title="' + durationFormatted + '"'
						+ ' style="left:' + left + 'px;width:' + width + 'px"'
						+ ' start="' + segment.start + '" end="' + segment.end + '"><div class="remaining"></div></div>'
				}
				nameLeft = this.secondsToPixels(eventEnd - event.start);
				markup += '<div class="name" style="left:' + nameLeft + 'px">';
				if (typeof event.remind !== "undefined") {
					reminderTooltip = "";
					for (k = 0; k < event.remind.length; k++) {
						if (k) reminderTooltip += ", ";
						reminderTooltip += Math.ceil(event.remind[k] / 60);
					}
					reminderTooltip += " min.";
					markup += '<div class="icon remind" title="' + reminderTooltip + '"></div>';
				}
				markup += this.formatTime(new Date(event.start * 1000)) + ' '
							+ this.markupTags(event.name)
						+ '</div>'
					+ '</div>';
			}
		}

		return markup;
	},
	formatTime: function(time) {
		var time, hours, minutes;
		hours = time.getHours().toString();
		if (hours.length < 2) hours = '0' + hours;
		minutes = time.getMinutes().toString();
		if (minutes.length < 2) minutes = '0' + minutes;
		return hours + ':' + minutes;
	},
	markupCalendar: function(activeDate) {
		var I = this,
			time,
			markup = '<tr>',
			today = new Date(),
			todayString = this.dateString(today);
		today.setHours(0);
		today.setMinutes(0);
		today.setSeconds(0);
		today.setMilliseconds(0);

		if (!activeDate) {
			activeDate = new Date();
		}
		var activeMonth = activeDate.getMonth();
		activeDate.setHours(0);
		activeDate.setMinutes(0);
		activeDate.setSeconds(0);
		activeDate.setMilliseconds(0);
		activeDateString = this.dateString(activeDate);

		var startDate = new Date(activeDate.getTime());
		startDate.setDate(1); // start on first of the month
		startDate = new Date(startDate.getTime() - 86400000 * (startDate.getDay() % 7)); // start on the prior Sunday
		var firstTimestamp = Math.round(startDate.getTime() / 1000);

		var markingActiveMonthDay = false;
		var markupCalendarDay = function(day) {
			var markup = '';
			if (day) {
				var date = new Date(day.time * 1000);
				var note = day.name.replace(/^\d{4}-\d\d-\d\d [A-z]{3}( - )?/, '');

				markingActiveMonthDay = (activeMonth == date.getMonth());
				var classes = ['calendar-date'];
				if (I.dateString(date) == todayString)
					classes.push('today');
				if (I.dateString(date) == activeDateString)
					classes.push('active');
				if (markingActiveMonthDay) {
					classes.push('active-month');
				}
				markup = '<td class="' + classes.join(' ') + '" key="' + day.tmpKey + '">'
						+ '<div class="date">' + date.getDate() + '</div>'
						+ '<div>' + note.split(', ').join('</div><div>') + '</div>'
					+ '</td>';
			} else {
				markup = '<td class="calendar-date disabled"></td>';
			}
			return markup;
		};
		var periods = [
			this.data.children[0].children[3].children,
			this.data.children[0].children[0].children,
			this.data.children[0].children[1].children,
			this.data.children[0].children[2].children
		];
		var list = [], listIndex = 0;
		while(periods.length && ! list.length) {
			list = periods.shift();
		}
		var nextDay = function() {
			if (! list || ! list.hasOwnProperty(listIndex)) {
				list = periods.shift();
				listIndex = 0;
			}
			return list[listIndex++];
		};

		var i = 0;
		if (list[0].time > firstTimestamp) {
			var leadCount = Math.ceil((list[0].time - firstTimestamp) / 86400);
			for (i; i < leadCount; i++) {
				if (i !== 0 && i % 7 == 0) {
					markup += '</tr><tr>';
				}
				markup += markupCalendarDay(null);
			}
		} else {
			var trailCount = Math.ceil((firstTimestamp - list[0].time) / 86400);
			for (var j = 0; j < trailCount; j++) {
				nextDay();
			}
		}
		for (i; i < 42; i++) {
			var dayMarkup = markupCalendarDay(nextDay());
			if (i !== 0 && i % 7 == 0) {
				if (!markingActiveMonthDay) break; // last week of the month, stop marking up
				markup += '</tr><tr>';
			}
			markup += dayMarkup;
		}
		markup += '</tr>';
		return markup;
	},
	markupProjects: function(day) {
		var i, j, markup = '';
		if (day.hasOwnProperty('children')) {
			markup += '<div class="tasks">'
			for (i = 0; i < day.children.length; i++) {
				var project = day.children[i];
				markup += '<div class="project collapsed">'
					+ this.markupTags(project.name);
				if (project.hasOwnProperty('comment')) {
					markup += '<pre class="comment">'
						+ this.markupTags(project.comment)
						+ '</pre>'; // end comment
				}
				if (project.hasOwnProperty('children')) {
					for (j = 0; j < project.children.length; j++) {
						markup += this.markupTask(project.children[j]);
					}
				}
				markup += '</div>'; // end project
			}
			markup += '</div>'; // end tasks
		}

		return markup;
	},
	markupTask: function(task) {
		var markup = '';
		var tagged = this.markupTags(task.name);
		markup += '<div class="task collapsed ' + task.status + '" data-key="' + task.tmpKey + '">'
			+ tagged;
		if (task.hasOwnProperty('comment')) {
			markup += '<pre class="comment">'
				+ this.markupTags(task.comment)
				+ '</pre>'; // end comment
		}
		markup += '</div>'; // end task

		return markup;
	},
	markupInbox: function() {
		var i, j, markup = '';
		if (this.data.children[2].children[3].hasOwnProperty('children')) {
			var inbox = this.data.children[2].children[3].children;
			for (i = 0; i < inbox.length; i++) {
				markup += this.markupTask(inbox[i]);
			}
		}

		return markup;
	},
	draw: function() {
		var I = this, today, tomorrow, scheduleMarkup, tasksMarkup;
		today = this.data.children[0].children[0].children[0];
		tomorrow = this.data.children[0].children[1].children[0];

		this.ui.todayTitle.element.html(today.name);

		// Schedule
		this.state.scheduleScroll = this.ui.scheduleContainer.element.scrollLeft;
		scheduleMarkup = '';
		scheduleMarkup += '<div id="tick"></div>';
		scheduleMarkup += this.markupSchedule(today);
		scheduleMarkup += this.markupSchedule(tomorrow, today.time);
		this.ui.schedule.element.html(scheduleMarkup);
		this.ui.tick.element = $('#tick');
		this.ui.scheduleContainer.element.scrollLeft = this.state.scheduleScroll;

		// Calendar
		this.ui.calendarBody.element.html(this.markupCalendar(new Date(today.time * 1000)));
		this.connectCalendarUI();

		// Tasks
		this.ui.tasks.element.html(this.markupProjects(today));

		// Inbox
		this.ui.inbox.element.html(this.markupInbox());
		
		this.setupTags();
		this.setupTasks();
		this.tick();
		this.saveState({body:true,data:true});
	},
	update: function() {
		this.checkRollover();
		this.remind();
		this.updateSchedule();
		this.updatePunch();
	},
	remind: function() {
		var today, event, i, j, minutes, minutesDepart, timeLeft, departTime, notificationId, isOpen, title, message;
		today = this.findDay(this.now);
		if (!today.schedule) return;

		for (i = 0; i < today.schedule.length; i++) {
			event = today.schedule[i];
			if (!event.remind) continue;

			for (j = 0; j < event.remind.length; j++) {
				notificationId = event.tmpKey.toString() + "_" + j;
				isOpen = (typeof this.notifications.open[notificationId] !== "undefined");
				minutes = Math.ceil((event.start - this.uTime) / 60);
				minutesDepart = Math.ceil((event.children[0].start - this.uTime) / 60);
				if (!isOpen && minutes >= 0 && minutes * 60 <= event.remind[j]) {
					if (minutes > 0) {
						timeLeft = "in " + minutes + " min.";
					} else if (minutes < 0) {
						timeLeft = Math.abs(minutes) + " min. ago";
					} else {
						timeLeft = "NOW";
					}
					if (minutesDepart < 0 || minutesDepart >= minutes) {
						departTime = "";
					} else if (minutesDepart > 0) {
						departTime = ", leave in " + minutesDepart + " min.";
					} else {
						departTime = ", leave NOW";
					}
					title = this.formatTime(new Date(event.start * 1000)) + " - " + event.name;
					message = timeLeft + departTime;
					this.notify(notificationId, message, title);
					break;
				}
			}
		}
	},
	connectCalendarUI: function() {
		var I = this;
		$('.calendar-date').click(function() {
			var key = $(this).attr("key");
			if (!key) return true;
			I.gotoDay(I.lookupObject(key));
		});
		this.ui.todayTitle.element.click(function() {
			I.toggleCalendar();
		});
	},
	highlightTags: function(tagName) {
		$('.tag').each(function() {
			$(this).toggleClass('highlight', $(this).hasClass("tag-" + tagName));
		});
	},
	setupTags: function() {
		var I;
		I = this;
		// interactive tags
		$('.tag').click(function() {
			var highlighted, tagName;
			highlighted = $(this).toggleClass('highlight').hasClass("highlight");
			I.highlightTags(highlighted ? $(this)[0].className.replace(/.*tag-([^ ]+).*$/, '$1') : false);
		});
	},
	setupTasks: function() { // would be private
		var I = this;
		$(".task").click(function(event) {
			var labels, task;
			task = I.lookupObject($(this).attr("data-key"));
			I.ui.contextMenu.element.css({
				left: event.clientX + "px",
				top: event.clientY + "px"
			}).fadeIn("fast");
			options = $("input", I.ui.contextMenu.element);
			options.unbind("click").click(function(event) {
				task.status = $(this).val();
				I.draw();
				I.ui.contextMenu.element.hide();
			});
		});
		$(".comment").click(function() {
			$(this).parent().toggleClass("collapsed");
		});
	},
	checkRollover: function() { // check if the schedule needs to advance to the next day, and do it
		// stub
	},
	shiftDay: function(count) {
		if (!count) return true;
		var periods = [
			this.data.children[0].children[3].children,
			this.data.children[0].children[0].children,
			this.data.children[0].children[1].children,
			this.data.children[0].children[2].children
		];

		var advanceOne = function() {
			if (! periods[3].length) {
				return false;
			}
			for (var i = 0; i < periods.length - 1; i++) {
				periods[i].push(periods[i + 1].splice(0,1)[0]);
			}
		}

		var reverseOne = function() {
			if (! periods[0].length) {
				return false;
			}
			for (var i = 0; i < periods.length - 1; i++) {
				periods[i + 1].unshift(periods[i].splice(periods[i].length - 1,1)[0]);
			}
		}

		if (count > 0) {
			for (var i = 0; i < count; i++) {
				advanceOne();
			}
		} else if (count < 0) {
			for (var i = 0; i < -count; i++) {
				reverseOne();
			}
		}

		this.draw();
		return true;
	},
	advanceDay: function() {
		this.shiftDay(1);
	},
	reverseDay: function(count) {
		this.shiftDay(-1);
	},
	advanceMonth: function() {
		this.shiftDay(28);
	},
	reverseMonth: function() {
		this.shiftDay(-28);
	},
	gotoDay: function(day) {
		if (! day || ! day.time) return;
		var today = this.data.children[0].children[0].children[0];
		var diff = Math.round((day.time - today.time) / 86400);
		if (diff === 0) {
			this.draw();
		} else {
			this.shiftDay(diff);
		}
	},
	gotoToday: function() {
		this.gotoDay(this.findDay(this.now));
	},
	findDay: function(time) { // (Date)
		var timestamp = Math.floor(time.getTime() / 1000),
			periods = [
				this.data.children[0].children[3].children,
				this.data.children[0].children[0].children,
				this.data.children[0].children[1].children,
				this.data.children[0].children[2].children
			];
		var day;
		for (var i = 0; i < periods.length; i++) {
			for (var j = 0; j < periods[i].length; j++) {
				if (periods[i][j].time > timestamp)
					return day; // matching last date BEFORE time
				day = periods[i][j];
			}
		}
	},
	updateSchedule: function() {
		var I, docTimezoneOffset, today, i, j, now, $segments, start,
			end, $remaining, maxWidth, offset, left, hours, minutes;
		I = this;
		docTimezoneOffset = -7 * 3600;
		today = this.data.children[0].children[0].children[0];
		now = Math.round(this.now.getTime() / 1000);
		$(".event").each(function() {
			start = parseInt($(this).attr("start"));
			end = parseInt($(this).attr("end"));
			$(this).toggleClass("now", (now >= start && now <= end));
		});
		$segments = $('.segment');
		$segments.each(function() {
			start = parseInt($(this).attr("start"));
			end = parseInt($(this).attr("end"));
			if (now >= start && now <= end) {
				$remaining = $('.remaining', this);
				maxWidth = I.secondsToPixels(end - start) - 2; // leave 2 px for left inset border
				$remaining.css({width: Math.min(maxWidth, I.secondsToPixels(end - now) - 1) + 'px'}); // leave 1px for tick border
			}
		});

		if (Math.abs(this.now - (today.time + 86400) * 1000) < 86400000) { // within 24 hours of midnight
			offset = -docTimezoneOffset - new Date().getTimezoneOffset() * 60;
			console.log(offset / 3600);
			left = this.secondsToPixels(now - today.time + offset);
			hours = this.now.getHours().toString();
			if (hours.length < 2) hours = '0' + hours;
			minutes = this.now.getMinutes().toString();
			if (minutes.length < 2) minutes = '0' + minutes;
			this.ui.tick.element.html('<span class="current-time">' + hours + ':' + minutes + '</span');
			this.ui.tick.element.css({
				left: left + 'px'
			}).show();
		} else {
			this.ui.tick.element.hide();
		}

		if (!this.ui.scheduleContainer.element.scrollLeft) 
			this.ui.scheduleContainer.element.scrollLeft = left - 70;
	},
	updatePunch: function() {
		var timestampPattern = /\((\d{10,})\)$/;
		var matches = this.ui.punch.data.match(timestampPattern);
		if (! matches || ! matches.length) return;
		var punchTime = new Date(parseInt(matches[1]) * 1000);
		var minutesSince = Math.floor((this.now.getTime() - punchTime.getTime()) / 60000);
		var hoursSince = Math.floor(minutesSince / 60);
		minutesSince =  minutesSince % 60;
		this.ui.punch.element.html(this.ui.punch.data.replace(timestampPattern, '(' + hoursSince + ':' + (minutesSince < 10 ? '0' : '') + minutesSince + ')'));
	},
	tick: function(suppressRepeat) {
		var I = this;
		this.now = new Date();
		this.uTime = Math.round(this.now.getTime() / 1000);
		if (this.interval) this.stopTick();
		if (!suppressRepeat)
			this.interval = setTimeout(function() { I.tick(); }, 60010 - (this.now).getTime() % 60000);
		this.update();
	},
	stopTick: function() {
		clearTimeout(this.interval);
		this.interval = null;
	},
	markupTags: function(string) {
		if (string) {
			// string = string.replace(/\b([#@]([a-zA-Z][a-zA-Z0-9_]+))/g, '<span class="tag $2">$1</span>');
			string = string.replace(/([#@]([a-zA-Z][a-zA-Z0-9_'-]+))/g, function(matches, full, tag){
				return '<span class="tag tag-' + tag.toLowerCase().replace("'", '').replace(/[_]/,'-') + '">' + full + '</span>';
			});
			string = string.replace(/(https?:\/\/[^\s]*)/g, '<a href="$1" target="_blank">$1</a>');
			string = string.replace(/((\+?1[ -])?\(?[0-9]{3}(\) |-|.)[0-9]{3}[-.][0-9]{4})/g, '<a href="tel:$1">$1</a>');
		}
		return string;
	},
	switchStyle: function(style) {
		if (window.localStorage) {
			window.localStorage.style = style;
		}
		for (var i = 0; i < this.ui.optionsMenu.styles.length; i++) {
			this.ui.body.element.toggleClass(
				this.ui.optionsMenu.styles[i],
				this.ui.optionsMenu.styles[i] == style
			);
		}
	},
	toggleMenu: function(menuObject, override) {
		var isOpen;
		// hide the other menus
		menuObject.element
			.toggleClass('open', override)
			.siblings().removeClass('open');

		// show menu container if selected menu is open
		this.ui.menuContainer.element
			.toggleClass('open', menuObject.element.hasClass("open"))
			.scrollTop(0);
	},
	toggleCalendar: function() {
		this.ui.calendarWrap.element.toggleClass('open');
		this.saveState({body:true});
	},
	toggleInbox: function() {
		this.ui.inbox.element.toggleClass('open');
		this.saveState({body:true});
	},
	addToInbox: function(task) {
		if (this.lockChanges)
			return;
		var I = this;

		if (!task) {
			task = window.prompt('task for inbox');
		}
		if (!task)
			return;

		this.ui.updateButton.element.addClass('changed');
		I.queueChange('inbox', task);
		I.data.children[2].children[3].children.push({name: task});
		I.draw();
		I.flushChanges();
	},
	queueChange: function(address, data) {
		// so far only works for inbox
		if (!this.state.changes)
			this.state.changes = {};
		if (!this.state.changes[address])
			this.state.changes[address] = [];
		this.state.changes[address].push(data);
		this.ui.updateButton.element.addClass("changed");
		this.saveState();
	},
	flushChanges: function() {
		// only inbox so far
		var I = this,
			button = this.ui.updateButton.element;
		this.lockChanges = true;
		$.ajax({
			method: 'POST',
			url: 'api.php?action=inbox&changes=' + encodeURIComponent(JSON.stringify(this.state.changes)),
			complete: function() {
				I.lockChanges = false;
			},
			dataType: 'json',
			success: function(data) {
				if (data.status == 'ok') {
					I.state.changes = null;
					I.saveState();
					button
						.addClass("success")
						.removeClass("changed")
						.delay(1000, function() {
							button.removeClass("success");
						});
				}
			}
		});
	},
	secondsToPixels: function(seconds) {
		return Math.round(seconds / 86400 * this.ui.schedule.dayWidth);
	},
	dateString: function(date) {
		if (!date) {
			date = new Date();
		} else if (!date.getTime) {
			date = new Date(date)
		}
		return date.getFullYear().toString()
			+ '-' + (date.getMonth() + 1).toString().pad(2, 0)
			+ '-' + date.getDate().toString().pad(2, 0);
	}
};

$(function(){
	window.controller = new TodoController()
	window.controller.init();
})
