<?php
if (!isset($_GET['changes'])
	|| !$_GET['changes']
	|| !$changes = json_decode(stripslashes($_GET['changes']))) {
    die('error: empty');
}
require_once('../config.php');
if (isset($changes->inbox)) {
	foreach ($changes->inbox as $task) {
		$todo->addToInboxOTL($task);
	}
}
die('ok');
