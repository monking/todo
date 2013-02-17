<?php
require_once('../config.php');
$force_update = isset($_GET['f']);
header('Content-type: application/json');
echo $todo->load($force_update);
if ($force_update) {
	$todo->saveJSON();
}
