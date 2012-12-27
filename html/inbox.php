<?php
if (!isset($_GET['task']) || !$_GET['task']) {
    die('error: empty');
}
require_once('../config.php');
$todo->addToInboxOTL( stripslashes( $_GET['task'] ) );
die('ok');
