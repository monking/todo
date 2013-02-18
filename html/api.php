<?php
require_once('../config.php');

header('Content-type: application/json');

function handleException($error_name, $error_description) {
	$response = array(
		'error' => $error_name,
		'message' => $error_description
	);
	die(json_encode($response));
}

$response = array();
if (!isset($_GET['action'])) {
	handleException('action', 'no action specified');
}
switch($_GET['action']) {
case 'punch':
	$punch_dir = $todo->user->dir . '/timeclock';
	if (!file_exists($punch_dir))
		die('');

	$files = scandir($punch_dir);
	$last_file = $punch_dir . '/' . $files[count($files) - 1];
	$data = file($last_file);
	$latest = $data[count($data) - 1];
	$latest = explode('", "', substr($latest, 1, strlen($latest) - 3));
	// heavenspot -- coachella_acct   oauth2 r/d   14:44 (0:36)
	$time = preg_replace('/.*?(\d+:\d\d):\d\d.*/', '$1', $latest[1]);
	echo "{$latest[3]} -- {$latest[4]}  {$latest[5]}  $time  ({$latest[0]})";
	exit;
case 'inbox':
	if (!isset($_GET['changes'])
		|| !$_GET['changes']
		|| !$changes = json_decode(stripslashes($_GET['changes']))) {
		handleException('empty', 'no data to save');
	}
	if (isset($changes->inbox)) {
		foreach ($changes->inbox as $task) {
			$todo->addToInboxOTL($task);
		}
	}
	echo json_encode(array('status' => 'ok'));
	exit;
case 'save':
	if (!isset($_POST['data']) || !$_POST['data']) {
		handleException('empty', 'no data to save');
	}

	$todo->data = json_decode( str_replace( '\\\\', '\\', $_POST['data'] ) );
	$todo->saveJSON();
	$todo->saveOTL();
	echo json_encode(array('status' => 'ok'));
	exit;
case 'json':
	$force_update = isset($_GET['f']);
	echo $todo->load($force_update);
	if ($force_update) {
		$todo->saveJSON();
	}
	exit;
default:
	handleException('action', 'invalid action specified');
}
