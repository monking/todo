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
		<link rel="apple-touch-icon" href="/apple-touch-icon.png"/>

		<link rel="apple-touch-startup-image" href="/apple-touch-icon.png" />

		<link rel="shortcut icon" href="/favicon.ico" type="image/x-icon">
		<link rel="icon" href="/favicon.ico" type="image/x-icon">
		<meta name="robots" content="noindex, nofollow" />
		<!-- <link href="http://fonts.googleapis.com/css?family=Droid+Sans+Mono" rel="stylesheet" type="text/css"> -->
		<link href="main.css" rel='stylesheet' type='text/css'>
		<script type="text/javascript" src="main.js"></script>
	</head>
	<body class="dark">
		<div id="punch"></div>
		<h2 id="today-title"></h2>
		<div id="calendar-wrap">
			<table id="calendar">
				<thead>
					<tr>
						<td>Mon</td>
						<td>Tue</td>
						<td>Wed</td>
						<td>Thu</td>
						<td>Fri</td>
						<td>Sat</td>
						<td>Sun</td>
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
			<div id="update-menu" class="menu">
				<div class="button save" name="save">SAVE</div>
				<div class="button load" name="load">LOAD</div>
				<div class="button load" name="load">EDIT</div>
			</div>
			<div id="style-menu" class="menu">
				<div class="button sample-dark" name="dark">DARK</div>
				<div class="button sample-light" name="light">LIGHT</div>
				<div class="button sample-black" name="black">BLACK</div>
				<div class="button sample-night" name="night">NIGHT</div>
			</div>
		</div>
		<div class="footer">
			<div class="button" id="inbox-button">INBOX</div>
			<div class="button" id="style-button">STYLE</div>
			<div class="button" id="update-button">UPDATE</div>
		</div>
	</body>
</html>
