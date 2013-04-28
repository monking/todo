// XHR
window.getAjax = function(options) {
	var request = new XMLHttpRequest();
	if (!options) options = {};
	options.extends({
		url:	  null,
		method:   'GET',
		data:     '',
		async:	  true,
		complete: null,
		success:  null
	});
	if (!options.url) {
		if (typeof options.complete === 'function') {
			options.complete(false);
		}
		return false;
	}
	request.open(options.method, options.url, options.async);
	request.onreadystatechange = function() {
		if (request.readyState == 4) {
			var data = null;
			if (request.status == 200 && typeof options.success === 'function') {
				data = request.responseText;
				options.success(data);
			}
			if (typeof options.complete === 'function') {
				options.complete(data);
			}
		}
	}
	if (options.method === 'POST' && options.data) {
		request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		request.setRequestHeader('Content-length', options.data.length);
		request.setRequestHeader('Connection', 'close');
		request.send(options.data);
	} else {
		request.send();
	}
};

// extends
if (!Object.prototype.extends) { // BUG: when used, this method is included in the loop and added as a property
	Object.prototype.extends = function(parent, overwrite) {
		if (this) {
			for (var key in parent) {
				if (!this.hasOwnProperty(key) || overwrite)
					this[key] = parent[key];
			}
		} else {
			this = parent;
		}
	}
}

// String.pad
if (!String.prototype.pad) {
	String.prototype.pad = function(length, char) {
		var newString = this;
		while (newString.length < length) newString = (char.toString() || ' ') + newString;
		return newString.toString();
	}
}

// toggleClass
var toggleClass = function(element, className, override) {
	var added = override,
		classes = element.className.match(/([^\s]+)/g) || [],
		classIndex = classes.indexOf(className);

	if (classIndex > -1) {
		if (!override) {
			classes.splice(classIndex, 1);
			added = false;
		}
	} else if (override !== false) {
		classes.push(className);
		added = true;
	}
	if (typeof added !== 'undefined')
		element.className = classes.join(' ');
	return added;
};

// filterChildren
var filterChildren = function(element, className) {
	var pattern = new RegExp('\\b' + className.replace(/, ?/, '\\b|\\b').replace(/ +/, '\\b.*\\b') + '\\b');
	var matches = [];
	for (var i = 0; i < element.children.length; i++) {
		var child = element.children[i];
		if (pattern.test(child.className)) {
			matches.push(child);
		}
	}
	return matches;
}

// Controller
var TodoController = function() {};
TodoController.prototype = {
	init: function() {
		var $this = this;
		this.state = {
			changes: null
		};
		this.setupKeyboardShortcuts();
		if (!this.restoreState()) {
			this.setupNotifications();
			this.setupUI();
			this.fetchData();
		}
		window.onunload = function() {
			$this.clear();
		};
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
		var $this = this;
		var types = {
			event: function(data) {
				return data.extends({ name: 'Untitled', start: $this.uTime, segments: [] });
			},
			segment: function(data) {
				return data.extends({ start: $this.uTime, end: $this.uTime, type: '' });
			},
			task: function(data) {
				return data.extends({ name: 'Untitled' });
			},
			project: function(data) {
				return data.extends({ name: 'Untitled' });
			}
		};
		parent.children.push(types[parent.contains](data));
		// mark new item for next sync
	},
	edit: function(options) {
		if (!options) return;
		options.extends({
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
		item.extends(options.changes, true);
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
					window.localStorage.bodyState = document.getElementsByTagName('body')[0].innerHTML;
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
				document.getElementsByTagName('body')[0].innerHTML = window.localStorage.bodyState;
				this.setupNotifications();
				this.setupUI();
				this.ui.tick.element = document.getElementById('tick');
				this.connectCalendarUI();
				this.setupTags();
				this.setupComments();
				this.tick();
			} else {
				this.fetchData();
			}
			return true;
		}
		return false;
	},
	setupUI: function() {
		var $this = this, i, j, optGroup, buttons, button;

		this.ui = {
			body:{ element: document.getElementsByTagName('body')[0] },
			punch:{ element: document.getElementById('punch') },
			scheduleContainer:{ element: document.getElementById('schedule-container') },
			schedule:{
				element: document.getElementById('schedule'),
				dayWidth: 480
			},
			tick:{ element: null }, // this is generated later
			todayTitle:{ element: document.getElementById('today-title') },
			tasks:{ element: document.getElementById('tasks') },
			calendar:{ element: document.getElementById('calendar') },
			calendarWrap:{ element: document.getElementById('calendar-wrap') },
			calendarBody:{ element: document.getElementById('calendar-body') },
			inbox:{ element: document.getElementById('inbox') },
			inboxButton:{ element: document.getElementById('inbox-button') },
			optionsButton:{ element: document.getElementById('options-button') },
			updateButton:{ element: document.getElementById('update-button') },
			menuContainer:{ element: document.getElementById('menu-container') },
			optionsMenu:{ element: document.getElementById('options-menu') },
			updateMenu:{ element: document.getElementById('update-menu') }
		};
		this.ui.punch.data = this.ui.punch.element.innerHTML.replace(/<[^>]+>/g, '');

		// Update Menu
		this.ui.updateButton.element.onclick = function() {
			$this.toggleMenu($this.ui.updateMenu);
		};
		this.ui.updateMenu.buttons = this.ui.updateMenu.element.getElementsByTagName("button");
		for (i = 0; i < this.ui.updateMenu.buttons.length; i++) {
			button = this.ui.updateMenu.buttons[i];
			button.onclick = function() {
				switch (this.attributes.name.value) {
					case 'load':
						$this.loadUpdated();
						break;
					case 'save':
						$this.flushChanges();
						break;
				}
				$this.toggleMenu(false);
			};
		}

		// Options Menu
		this.ui.optionsButton.element.onclick = function() {
			$this.toggleMenu($this.ui.optionsMenu);
		};
		optGroups = this.ui.optionsMenu.element.getElementsByClassName("opt-group");
		for (i = 0; i < optGroups.length; i++) {
			buttons = optGroups[i].getElementsByTagName("button");
			var groupName = optGroups[i].attributes.name.value;
			switch (optGroups[i].attributes.name.value) {
				case "options":
					for (j = 0; j < buttons.length; j++) {
						button = buttons[j];
						if (button.attributes.name.value === "notifications") {
							button.onclick = function() {
								$this.toggleNotifications();
								$this.toggleMenu($this.ui.optionsMenu, false);
							};
						}
					}
					break;
				case "styles":
					this.ui.optionsMenu.styles = [];
					for (j = 0; j < buttons.length; j++) {
						button = buttons[j];
						this.ui.optionsMenu.styles.push(button.attributes.name.value);
						button.onclick = function() {
							$this.switchStyle(this.attributes.name.value);
							$this.toggleMenu(this.ui.optionsMenu, false);
						};
					}
					break;
			}
		}
		if (window.localStorage && window.localStorage.style) {
			this.switchStyle(window.localStorage.style);
		} else {
			this.switchStyle('dark');
		}

		// inbox prompt
		document.getElementById('inbox-title').onclick = function() {
			$this.toggleInbox();
		};
		this.ui.inboxButton.element.onclick = function() {
			if (/\bdisabled\b/.test(this.className)) return;
			$this.addToInbox();
		};

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
		var $this = this;
		if (this.state.notifications) {
			this.state.notifications = false;
		} else {
			if (window.webkitNotifications) {
				if (window.webkitNotifications.checkPermission()) {
					window.webkitNotifications.requestPermission(function() {
						$this.state.notifications = true;
						$this.remind();
					});
				} else {
					this.state.notifications = true;
				}
			}
		}
	},
	notify: function(id, message, title, force) {
		var $this = this, openId, count = 0, first;
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
				delete $this.notifications.open[id];
			};
			this.notifications.open[id].show();
		}
		this.notifications.log[id] = true;
	},
	setupKeyboardShortcuts: function() {
		var $this = this;
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
		document.body.onkeydown = function(event) {
			console.log(event.keyCode);
			// ignore keys with modifiers
			if (event.metaKey || event.altKey || event.shiftKey || event.ctrlKey)
				return true;
			if (responders.hasOwnProperty(event.keyCode)) {
				$this[responders[event.keyCode]]();
				return false;
			}
			return true;
		};
	},
	fetchData: function(options) {
		var $this = this;
		if (!options) options = {};
		options.extends({
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
			if (!$this.data) return;
			$this.draw();
			if (typeof options.callback === 'function') {
				options.callback();
			}
		};

		// fetch todo data
		var parseTodo = function(json) {
			if (!json) return;
			if (window.localStorage) {
				window.localStorage.todo = json;
			}
			var data = JSON.parse(json);
			if (!data) return;
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
			$this.data = makeIndex(data);
		};
		if (JSON) {
			if (window.localStorage && window.localStorage.todo && !options.disk) {
				parseTodo(window.localStorage.todo);
				setFetched('todo');
			} else {
				if (this.state.changes && !confirm("changes queued, load anyway?"))
					return false;
				getAjax({
					url: 'api.php?action=json' + (options.disk ? '&f' : ''),
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
			$this.ui.punch.data = data;
		};
		if (window.localStorage && window.localStorage.punch && !options.disk) {
			parsePunch(window.localStorage.punch);
			setFetched('punch');
		} else {
			getAjax({
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
		var $this = this;
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
						var button = filterChildren($this.ui.updateMenu.element, 'save')[0];
						toggleClass(button, 'success', true);
						setTimeout(function() {
							toggleClass(button, 'success', false);
							$this.toggleMenu($this.ui.updateMenu, false);
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
		var $this = this,
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
				if ($this.dateString(date) == todayString)
					classes.push('today');
				if ($this.dateString(date) == activeDateString)
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
		markup += '<div class="task collapsed ' + task.status + '">'
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
		var $this = this, today, tomorrow, scheduleMarkup, tasksMarkup;
		today = this.data.children[0].children[0].children[0];
		tomorrow = this.data.children[0].children[1].children[0];

		this.ui.todayTitle.element.innerHTML = today.name;

		// Schedule
		this.state.scheduleScroll = this.ui.scheduleContainer.element.scrollLeft;
		scheduleMarkup = '';
		scheduleMarkup += '<div id="tick"></div>';
		scheduleMarkup += this.markupSchedule(today);
		scheduleMarkup += this.markupSchedule(tomorrow, today.time);
		this.ui.schedule.element.innerHTML = scheduleMarkup;
		this.ui.tick.element = document.getElementById('tick');
		this.ui.scheduleContainer.element.scrollLeft = this.state.scheduleScroll;

		// Calendar
		this.ui.calendarBody.element.innerHTML = this.markupCalendar(new Date(today.time * 1000));
		this.connectCalendarUI();

		// Tasks
		this.ui.tasks.element.innerHTML = this.markupProjects(today);

		// Inbox
		this.ui.inbox.element.innerHTML = this.markupInbox();
		
		this.setupTags();
		this.setupComments();
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
		var $this = this;
		var dates = document.getElementsByClassName('calendar-date');
		for (var i = 0; i < dates.length; i++) {
			dates[i].onclick = function() {
				if (! this.attributes.key) return true;
				var key = this.attributes.key.value;
				$this.gotoDay($this.lookupObject(key));
			};
		}
		this.ui.todayTitle.element.onclick = function() {
			$this.toggleCalendar();
		};
	},
	setupTags: function() {
		// interactive tags
		var $tags = document.getElementsByClassName('tag');
		window.highlightTags = function(tagName) {
			var tagPattern = tagName ? new RegExp(' *' + tagName + ' *') : false;
			for (var i = 0; i < $tags.length; i++) {
				toggleClass($tags[i], 'highlight', !!tagName && tagPattern.test($tags[i].className));
			}
		};
		for (var i = 0; i < $tags.length; i++) {
			$tags[i].onclick = function() {
				highlightTags(toggleClass(this, 'highlight') ? this.className.replace(/\b(tag|highlight| +)\b/g, '') : false);
			};
		}
	},
	setupComments: function() { // would be private
		// toggle comments
		var $this = this,
			$projects = document.getElementsByClassName('project'),
			$tasks = document.getElementsByClassName('task');
		function onCommentClick(event) {
			if (/^[aA]$/.test(event.target.tagName) || /\b(tag|link)\b/.test(event.target.className)) {
				return true;
			} else {
				toggleClass(this, 'collapsed');
				$this.saveState({body: true});
				event.stopImmediatePropagation();
			}
		}
		for (var i = 0; i < $tasks.length; i++) {
			$tasks[i].onclick = onCommentClick;
		}
		for (var i = 0; i < $projects.length; i++) {
			$projects[i].onclick = onCommentClick;
		}
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
		var docTimezoneOffset = -7 * 3600;
		var today = this.data.children[0].children[0].children[0];
		var $events = document.getElementsByClassName('event');
		var i, j;
		var now = Math.round(this.now.getTime() / 1000);
		for (i = 0; i < $events.length; i++) {
			var start = parseInt($events[i].attributes.start.value);
			var end = parseInt($events[i].attributes.end.value);
			toggleClass($events[i], 'now', (now >= start && now <= end));
		}
		var $segments = document.getElementsByClassName('segment');
		for (i = 0; i < $segments.length; i++) {
			var start = parseInt($segments[i].attributes.start.value);
			var end = parseInt($segments[i].attributes.end.value);
			if (now >= start && now <= end) {
				var $remaining = filterChildren($segments[i], 'remaining')[0];
				var maxWidth = this.secondsToPixels(end - start) - 2; // leave 2 px for left inset border
				$remaining.style.width = Math.min(maxWidth, this.secondsToPixels(end - now) - 1) + 'px'; // leave 1px for tick border
			}
		}

		if (Math.abs(this.now - (today.time + 86400) * 1000) < 86400000) { // within 24 hours of midnight
			var offset = -docTimezoneOffset - new Date().getTimezoneOffset() * 60;
			console.log(offset / 3600);
			var left = this.secondsToPixels(now - today.time + offset);
			var hours = this.now.getHours().toString();
			if (hours.length < 2) hours = '0' + hours;
			var minutes = this.now.getMinutes().toString();
			if (minutes.length < 2) minutes = '0' + minutes;
			this.ui.tick.element.innerHTML = '<span class="current-time">' + hours + ':' + minutes + '</span';
			this.ui.tick.element.style.left = left + 'px';
			this.ui.tick.element.style.display = 'block';
		} else {
			this.ui.tick.element.style.display = 'none';
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
		this.ui.punch.element.innerHTML = this.ui.punch.data.replace(timestampPattern, '(' + hoursSince + ':' + (minutesSince < 10 ? '0' : '') + minutesSince + ')');
	},
	tick: function(suppressRepeat) {
		var $this = this;
		this.now = new Date();
		this.uTime = Math.round(this.now.getTime() / 1000);
		if (this.interval) this.stopTick();
		if (!suppressRepeat)
			this.interval = setTimeout(function() { $this.tick(); }, 60010 - (this.now).getTime() % 60000);
		this.update();
	},
	stopTick: function() {
		clearTimeout(this.interval);
		this.interval = null;
	},
	markupTags: function(string) {
		if (string) {
			// string = string.replace(/\b([#@]([a-zA-Z][a-zA-Z0-9_]+))/g, '<span class="tag $2">$1</span>');
			string = string.replace(/([#@]([a-zA-Z][a-zA-Z0-9_-]+))/g, function(matches, full, tag){
				return '<span class="tag ' + tag.toLowerCase() + '">' + full + '</span>';
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
			toggleClass(
				this.ui.body.element,
				this.ui.optionsMenu.styles[i],
				this.ui.optionsMenu.styles[i] == style
			);
		}
	},
	toggleMenu: function(menuObject, override) {
		var isOpen;
		// hide the other menus
		var otherMenus = this.ui.menuContainer.element.children;
		for (var i = 0; i < otherMenus.length; i++) {
			if (otherMenus[i] !== menuObject.element) {
				toggleClass(otherMenus[i], 'open', false);
			}
		}

		// toggle selected menu
		if (menuObject) {
			isOpen = toggleClass(menuObject.element, 'open', override);
		} else {
			isOpen = false;
		}

		// show menu container if selected menu is open
		toggleClass(this.ui.menuContainer.element, 'open', isOpen);

		this.ui.menuContainer.element.scrollTop = 0;
	},
	toggleCalendar: function() {
		toggleClass(this.ui.calendarWrap.element, 'open');
		this.saveState({body:true});
	},
	toggleInbox: function() {
		toggleClass(this.ui.inbox.element, 'open');
		this.saveState({body:true});
	},
	addToInbox: function(task) {
		if (this.lockChanges)
			return;
		var $this = this;

		if (!task) {
			task = window.prompt('task for inbox');
		}
		if (!task)
			return;

		toggleClass(this.ui.updateButton.element, 'changed', true);
		$this.queueChange('inbox', task);
		$this.data.children[2].children[3].children.push({name: task});
		$this.draw();
		$this.flushChanges();
	},
	queueChange: function(address, data) {
		// so far only works for inbox
		if (!this.state.changes)
			this.state.changes = {};
		if (!this.state.changes[address])
			this.state.changes[address] = [];
		this.state.changes[address].push(data);
		toggleClass(this.ui.updateButton.element, "changed", true);
		this.saveState();
	},
	flushChanges: function() {
		// only inbox so far
		var $this = this,
			button = this.ui.updateButton.element;
		this.lockChanges = true;
		getAjax({
			method: 'POST',
			url: 'api.php?action=inbox&changes=' + encodeURIComponent(JSON.stringify(this.state.changes)),
			complete: function() {
				$this.lockChanges = false;
			},
			success: function(data) {
				try {
					data = JSON.parse(data);
					if (data.status == 'ok') {
						$this.state.changes = null;
						$this.saveState();
						toggleClass(button, 'success', true);
						toggleClass(button, "changed", false);
						setTimeout(function() {
							toggleClass(button, 'success', false);
						}, 1000);
					}
				} catch(e) {}
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

window.onload = function(){
	window.controller = new TodoController()
	window.controller.init();
}
