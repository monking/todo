<?php
if (!isset($_POST['data']) || !$_POST['data']) {
    die('error: empty');
}

require_once('../config.php');
$todo->data = json_decode( str_replace( '\\\\', '\\', $_POST['data'] ) );
$todo->saveJSON();
$todo->saveOTL();
die('ok');
