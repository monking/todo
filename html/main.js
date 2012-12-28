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
		request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		request.setRequestHeader("Content-length", options.data.length);
		request.setRequestHeader("Connection", "close");
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
	if (typeof added !== "undefined")
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
		this.state = {};
		if (!this.restoreState()) {
			this.setupUI();
			this.setupKeyboardShortcuts();
			this.fetchData();
		}
	},
	add: function(parent, data) {
		if (! parent.hasOwnProperty('contains') || ! types.hasOwnProperty(parent.contains)) return;
		var $this = this;
		var now = this.now.getTime();
		var types = {
			event: function(data) {
				return data.extends({ name: 'Untitled', start: now, segments: [] });
			},
			segment: function(data) {
				return data.extends({ start: now, end: now, type: '' });
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
	saveState: function() {
		if (window.localStorage) {
			window.localStorage.state = JSON.stringify(this.state);
			window.localStorage.indexedData = JSON.stringify(this.data);
			window.localStorage.bodyState = document.getElementsByTagName("body")[0].innerHTML;
		}
	},
	restoreState: function() {
		if (window.localStorage
		&& window.localStorage.state
		&& window.localStorage.indexedData
		&& window.localStorage.bodyState) {
			this.data = JSON.parse(window.localStorage.indexedData);
			document.getElementsByTagName("body")[0].innerHTML = window.localStorage.bodyState;
			this.state = JSON.parse(window.localStorage.state);
			this.setupUI();
			this.ui.tick.element = document.getElementById('tick');
			this.connectCalendarUI();
			this.setupTags();
			this.setupComments();
			this.tick();
			return true;
		}
		return false;
	},
	setupUI: function() {
		var $this = this;

		this.ui = {
			body:{ element: document.getElementsByTagName('body')[0] },
			punch:{ element: document.getElementById("punch") },
			scheduleContainer:{ element: document.getElementById('schedule-container') },
			schedule:{
				element: document.getElementById('schedule'),
				dayWidth: 480
			},
			tick:{ element: null }, // this is generated later
			todayTitle:{ element: document.getElementById("today-title") },
			tasks:{ element: document.getElementById("tasks") },
			calendar:{ element: document.getElementById("calendar") },
			calendarWrap:{ element: document.getElementById("calendar-wrap") },
			calendarBody:{ element: document.getElementById("calendar-body") },
			inbox:{ element: document.getElementById("inbox") },
			inboxButton:{ element: document.getElementById("inbox-button") },
			styleButton:{ element: document.getElementById("style-button") },
			updateButton:{ element: document.getElementById("update-button") },
			menuContainer:{ element: document.getElementById("menu-container") },
			styleMenu:{ element: document.getElementById("style-menu") },
			updateMenu:{ element: document.getElementById("update-menu") }
		};
		this.ui.punch.data = this.ui.punch.element.innerHTML.replace(/<[^>]+>/g, '');

		// Update Menu
		this.ui.updateButton.element.onclick = function() {
			$this.toggleMenu($this.ui.updateMenu);
		};
		this.ui.updateMenu.children = this.ui.updateMenu.element.children;
		this.ui.updateMenu.options = [];
		for (var i = 0; i < this.ui.updateMenu.children.length; i++) {
			var option = this.ui.updateMenu.children[i];
			this.ui.updateMenu.options.push(option.attributes.name.value);
			option.onclick = function() {
				switch (this.attributes.name.value) {
					case 'load':
						$this.fetchData({ disk:true });
						$this.toggleMenu(false);
						break;
					case 'save':
						$this.saveData();
						break;
				}
			};
		}

		// Style Menu
		this.ui.styleButton.element.onclick = function() {
			$this.toggleMenu($this.ui.styleMenu);
		};
		this.ui.styleMenu.children = this.ui.styleMenu.element.children;
		this.ui.styleMenu.options = [];
		for (var i = 0; i < this.ui.styleMenu.children.length; i++) {
			var option = this.ui.styleMenu.children[i];
			this.ui.styleMenu.options.push(option.attributes.name.value);
			option.onclick = function() {
				$this.switchStyle(this.attributes.name.value);
			};
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
			$this.inboxPrompt();
		};

		// Schedule
		if (this.state.scheduleScroll)
			this.ui.scheduleContainer.element.scrollLeft = this.state.scheduleScroll;
	},
	setupKeyboardShortcuts: function() {
		var $this = this;
		var responders = {
			32:  /* SPACE */ "inboxPrompt",
			37:  /* LEFT  */ "reverseDay",
			39:  /* RIGHT */ "advanceDay",
			67:  /* c     */ "toggleCalendar",
			72:  /* h     */ "reverseDay",
			73:  /* i     */ "toggleInbox",
			74:  /* j     */ "advanceMonth",
			75:  /* k     */ "reverseMonth",
			76:  /* l     */ "advanceDay",
			84:  /* t     */ "gotoToday"
		};
		document.body.onkeydown = function(event) {
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
				if (! fetched[key]) return
			}
			$this.draw();
			if (typeof options.callback === "function") {
				options.callback();
			}
		};

		// fetch todo data
		var parseTodo = function(json) {
			if (window.localStorage) {
				window.localStorage.todo = json;
			}
			var data = JSON.parse(json);
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
				getAjax({
					url: 'todo.json.php' + (options.disk ? '?f' : ''),
					success: function(data) {
						parseTodo(data);
					},
					complete: function() {
						setFetched('todo');
					}
				});
			}
		} else {
			alert("Please use a browser which supports JSON.");
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
				url: 'punch.php',
				success: function(data) {
					parsePunch(data);
				},
				complete: function() {
					setFetched('punch');
				}
			});
		}
	},
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
			url: 'save.php',
			method: 'POST',
			data: 'data=' + encodeURIComponent(json),
			success: function(data) {
				if (data == 'ok') {
					var button = filterChildren($this.ui.updateMenu.element, 'save')[0];
					toggleClass(button, 'success', true);
					setTimeout(function() {
						toggleClass(button, 'success', false);
						$this.toggleMenu($this.ui.updateMenu, false);
					}, 1000);
				} else {
					alert(data);
				}
			},
			complete: function(data) {
			}
		});
	},
	lookupObject: function(indexKey) {
		var crawl = function(object) {
			if (typeof object === "object") {
				if (object.tmpKey == indexKey) {
					return object;
				} else {
					for (var prop in object) {
						if (object[prop] && object[prop].hasOwnProperty('tmpKey')) {
							var result = crawl(object[prop]);
							if (typeof result !== "undefined") return result;
						}
					}
				}
			}
		};
		return crawl(this.data, indexKey);
	},
	markupSchedule: function(day, todayTime) {
		var i, j, markup = '';

		if (!todayTime)
			todayTime = day.time

		if (day.hasOwnProperty('schedule')) {
			for (i = 0; i < day.schedule.length; i++) {
				var event = day.schedule[i];

				var time = new Date(event.start * 1000);
				var hours = time.getHours().toString();
				if (hours.length < 2) hours = '0' + hours;
				var minutes = time.getMinutes().toString();
				if (minutes.length < 2) minutes = '0' + minutes;
				var eventEnd = event.children[event.children.length - 1].end;
				var left = this.secondsToPixels(event.start - todayTime);
				markup += '<div class="event" start="' + event.start + '" end="' + eventEnd + '" style="'
						+ 'margin-left:' + left + 'px;'
					+ '">';
				for (j = 0; j < event.children.length; j++) {
					var segment = event.children[j];
					var left = this.secondsToPixels(segment.start - event.start);
					var width = this.secondsToPixels(segment.end - segment.start);
					markup += '<div class="segment ' + segment.type + '"'
						+ ' style="left:' + left + 'px;width:' + width + 'px"'
						+ ' start="' + segment.start + '" end="' + segment.end + '"><div class="remaining"></div></div>'
				}
				var nameLeft = this.secondsToPixels(eventEnd - event.start);
				markup += '<div class="name" style="left:' + nameLeft + 'px">'
							+ hours + ':' + minutes + ' '
							+ this.markupTags(event.name)
						+ '</div>'
					+ '</div>';
			}
		}

		return markup;
	},
	markupCalendar: function(activeDate) {
		var time, markup = '<tr>';
		var today = new Date();
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
		this.state.activeDate = activeDate.getTime();

		var startDate = new Date(activeDate.getTime());
		startDate.setDate(1); // start on first of the month
		startDate = new Date(startDate.getTime() - 86400000 * ((startDate.getDay() + 6) % 7)); // start on the prior Monday
		var firstTimestamp = Math.round(startDate.getTime() / 1000);

		var markingActiveMonthDay = false;
		var markupCalendarDay = function(day) {
			var markup = '';
			if (day) {
				var date = new Date(day.time * 1000);
				var note = day.name.replace(/^\d\d-\d\d-\d{4} [A-z]{3}( - )?/, '');

				markingActiveMonthDay = (activeMonth == date.getMonth());
				var classes = ['calendar-date'];
				if (today.getTime() === date.getTime())
					classes.push('today');
				if (activeDate.getTime() === date.getTime())
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
			this.data.children[0].children[4].children,
			this.data.children[0].children[0].children,
			this.data.children[0].children[1].children,
			this.data.children[0].children[2].children,
			this.data.children[0].children[3].children
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
				markup += '<div class="project">'
					+ this.markupTags(project.name);
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
		if (this.data.children[3].hasOwnProperty('children')) {
			var inbox = this.data.children[3].children;
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
		this.saveState();
	},
	update: function() {
		this.checkRollover();
		this.updateSchedule();
		this.updatePunch();
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
		var $task = document.getElementsByClassName('task');
		for (var i = 0; i < $task.length; i++) {
			$task[i].onclick = function(event) {
				if (/^[aA]$/.test(event.target.tagName) || /\b(tag|link)\b/.test(event.target.className)) {
					return true;
				} else {
					toggleClass(this, 'collapsed');
				}
			}
		}
	},
	checkRollover: function() { // check if the schedule needs to advance to the next day, and do it
		// stub
	},
	shiftDay: function(count) {
		if (!count) return true;
		var periods = [
			this.data.children[0].children[4].children,
			this.data.children[0].children[0].children,
			this.data.children[0].children[1].children,
			this.data.children[0].children[2].children,
			this.data.children[0].children[3].children
		];

		var advanceOne = function() {
			if (! periods[4].length) {
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
				this.data.children[0].children[4].children,
				this.data.children[0].children[0].children,
				this.data.children[0].children[1].children,
				this.data.children[0].children[2].children,
				this.data.children[0].children[3].children
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
		var today = this.data.children[0].children[0].children[0];
		var $events = document.getElementsByClassName('event');
		var i, j;
		var now = this.now.getTime() / 1000;
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
			var left = this.secondsToPixels(now - today.time);
			var hours = this.now.getHours().toString();
			if (hours.length < 2) hours = '0' + hours;
			var minutes = this.now.getMinutes().toString();
			if (minutes.length < 2) minutes = '0' + minutes;
			this.ui.tick.element.innerHTML = '<span class="current-time">' + hours + minutes + '</span';
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
		// string = string.replace(/\b([#@]([a-zA-Z][a-zA-Z0-9_]+))/g, '<span class="tag $2">$1</span>');
		string = string.replace(/([#@]([a-zA-Z][a-zA-Z0-9_]+))/g, '<span class="tag $2">$1</span>');
		string = string.replace(/(https?:\/\/[^\s]*)/g, '<a href="$1">$1</a>');
		return string;
	},
	switchStyle: function(style) {
		if (window.localStorage) {
			window.localStorage.style = style;
		}
		for (var i = 0; i < this.ui.styleMenu.options.length; i++) {
			toggleClass(
				this.ui.body.element,
				this.ui.styleMenu.options[i],
				this.ui.styleMenu.options[i] == style
			);
		}
		this.toggleMenu(this.ui.styleMenu, false);
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
	},
	toggleInbox: function() {
		toggleClass(this.ui.inbox.element, 'open');
	},
	inboxPrompt: function() {
		var $this = this;
		var button = this.ui.inboxButton.element;
		var task = window.prompt('task for inbox');
		if (!task) return;

		toggleClass(button, 'disabled', true);
		getAjax({
			method: 'POST',
			url: 'inbox.php?task=' + encodeURIComponent(task),
			complete: function() {
				toggleClass(button, 'disabled', false);
			},
			success: function(data) {
				if (data == 'ok') {
					toggleClass(button, 'success', true);
					setTimeout(function() {
						toggleClass(button, 'success', false);
					}, 1000);
					$this.data.children[3].children.push({name: task});
					$this.draw();
				} else {
					alert(data);
				}
			}
		});
	},
	secondsToPixels: function(seconds) {
		return Math.round(seconds / 86400 * this.ui.schedule.dayWidth);
	}
};

window.onload = function(){
	window.controller = new TodoController()
	window.controller.init();
}
