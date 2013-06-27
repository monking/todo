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
		<link type="text/css" rel="stylesheet" href="css/main.css" />
		<script type="text/javascript" src="js/vendor/jquery-2.0.0.min.js"></script>
		<!-- <script type="text/javascript" src="//code.jquery.com/mobile/1.3.1/jquery.mobile-1.3.1.js"></script> -->
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
		<nav>
			<div id="menu-container">
				<div class="menu options">
					<div class="opt-group cf" name="options">
						<label>Options</label>
						<button rel="toggle-notifications">Enable Notifications</button>
					</div>
					<div class="opt-group cf" name="styles">
						<label>Styles</label>
						<button class="sample-dark" rel="colorscheme" data-value="dark">DARK</button>
						<button class="sample-light" rel="colorscheme" data-value="light">LIGHT</button>
						<button class="sample-black" rel="colorscheme" data-value="black">BLACK</button>
						<button class="sample-night" rel="colorscheme" data-value="night">NIGHT</button>
					</div>
				</div>
			</div>
			<button rel="inbox">INBOX</button>
			<button rel="menu" data-value="options">OPTIONS</button>
			<button rel="update">UPDATE</button>
		</nav>
<!--
		<div id="context-menu">
			<div class="option note" rel="status" data-value="note" />## note</div>
			<div class="option canceled" rel="status" data-value="canceled" />xx canceled</div>
			<div class="option hold" rel="status" data-value="hold" />.. hold</div>
			<div class="option paused" rel="status" data-value="paused" />:: paused</div>
			<div class="option done" rel="status" data-value="done" />// done</div>
			<div class="option now" rel="status" data-value="now" />&gt;&gt; now</div>
			<div class="option next" rel="status" data-value="next" />== next</div>
			<div class="option normal" rel="status" data-value="normal" />__ normal</div>
			<div class="option urgent" rel="status" data-value="urgent" />!! urgent</div>
			<div class="option question" rel="status" data-value="question" />?? question</div>
		</div>
-->
	</body>
</html>
