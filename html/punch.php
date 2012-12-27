<?php
require_once('../config.php');
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
