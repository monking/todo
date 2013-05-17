<?php
$params = explode('/', preg_replace('@^/@', '', $_SERVER['REQUEST_URI']));
require_once('../config.php');
?>
<!DOCTYPE html>
<html manifest="appcache.manifest">
	<head>
		<title>TODO</title>

		<meta name="viewport" content="user-scalable=no, width=device-width, initial-scale=1.0, maximum-scale=1.0"/>
		<meta name="apple-mobile-web-app-capable" content="yes" />

		<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
		<link rel="apple-touch-icon" href="/img/apple-touch-icon.png"/>

		<link rel="apple-touch-startup-image" href="/img/apple-touch-icon.png" />

		<link rel="shortcut icon" href="/favicon.ico" type="image/x-icon">
		<link rel="icon" href="/favicon.ico" type="image/x-icon">
		<meta name="robots" content="noindex, nofollow" />
		<!-- <link href="http://fonts.googleapis.com/css?family=Droid+Sans+Mono" rel="stylesheet" type="text/css"> -->
		<link href="css/main.css" rel='stylesheet' type='text/css'>
		<script type="text/javascript" src="js/vendor/jquery-2.0.0.min.js"></script>
		<script type="text/javascript" src="js/main.js"></script>
	</head>
	<body class="dark">
		<div id="punch"></div>
		<h2 id="today-title"></h2>
		<div id="calendar-wrap">
			<table id="calendar">
				<thead>
					<tr>
						<td>Sun</td>
						<td>Mon</td>
						<td>Tue</td>
						<td>Wed</td>
						<td>Thu</td>
						<td>Fri</td>
						<td>Sat</td>
					</tr>
				</thead>
				<tbody id="calendar-body"></tbody>
			</table>
		</div>
		<div id="schedule-container">
			<div id="schedule"></div>
		</div>
		<div id="tasks"></div>
		<h2 id="inbox-title">Inbox</h2>
		<div id="inbox"></div>
		<div id="menu-container">
		</div>
		<nav>
			<button rel="inbox">INBOX</button>
			<button rel="menu" data-menu="options">OPTIONS</button>
			<button rel="update">UPDATE</button>
			<div class="menu options">
				<div class="opt-group cf" name="options">
					<label>Options</label>
					<button rel="toggle-notifications">Enable Notifications</button>
				</div>
				<div class="opt-group cf" name="styles">
					<label>Styles</label>
					<button class="sample-dark" rel="colorscheme" name="dark">DARK</button>
					<button class="sample-light" rel="colorscheme" name="light">LIGHT</button>
					<button class="sample-black" rel="colorscheme" name="black">BLACK</button>
					<button class="sample-night" rel="colorscheme" name="night">NIGHT</button>
				</div>
			</div>
		</nav>
		<div id="context-menu">
			<label class="done"><input type="radio" rel="status" name="status" value="done" /> // done</label>
			<label class="normal"><input type="radio" rel="status" name="status" value="normal" /> __ normal</label>
			<label class="next"><input type="radio" rel="status" name="status" value="next" /> == next</label>
			<label class="now"><input type="radio" rel="status" name="status" value="now" /> &gt;&gt; now</label>
			<label class="paused"><input type="radio" rel="status" name="status" value="paused" /> :: paused</label>
			<label class="hold"><input type="radio" rel="status" name="status" value="hold" /> .. hold</label>
			<label class="canceled"><input type="radio" rel="status" name="status" value="canceled" /> xx canceled</label>
			<label class="question"><input type="radio" rel="status" name="status" value="question" /> ?? question</label>
			<label class="urgent"><input type="radio" rel="status" name="status" value="urgent" /> !! urgent</label>
			<label class="note"><input type="radio" rel="status" name="status" value="note" /> ## note</label>
		</div>
	</body>
</html>
