<?php
// copy to config.php

define('APPROOT', __DIR__);

date_default_timezone_set('America/Los_Angeles');
// date_default_timezone_set('Asia/Hong_Kong');
// date_default_timezone_set('Asia/Ho_Chi_Minh');
// date_default_timezone_set('Asia/Tokyo');
// date_default_timezone_set('Europe/Zagreb');
// date_default_timezone_set('America/New_York');
// date_default_timezone_set('Pacific/Honolulu');

// Authentication
require_once('libs/basic_user.php');
$user = new BasicUser(array(
	'credentials_path' => constant('APPROOT') . '/credentials.json',
	'user_dir' => constant('APPROOT') . '/users',
	'user_default_settings' => array(
		'use_otl' => false
	),
));
if (isset($_GET['logout'])) {
	$user->logout();
} else {
	$user->authenticate();
	$user->loadSettings();
}

// Todo
require_once('libs/todo.php');
$todo = new Todo(array(
	'user' => $user
));
