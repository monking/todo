<?php

/**
 * Class to make edits to a JSON file and translate to and from a Vim Outliner 
 * file.
 *
 * Copyright 2012 Christopher Lovejoy <c@lovejoyinteractive.com>
 */

class Todo {

	/**
	 * indent hierarchy of the todo document
	 */
	public static $hierarchies = array(
		'schedule' => array(
			array('section'),
			array('period'),
			array('date', array(
				'event',
				'segment',
			)),
			array('project'),
			array('task'),
		),
		'backlog' => array(
			array('section'),
			array('status'),
			array('category'),
			array('project'),
			array('task'),
		),
		'notes' => array(
			array('section'),
			array('subject')
		),
		'inbox' => array(
			array('section'),
			null,
			null,
			array('task'),
		),
	);

	/**
	 * a key to translate the status prefixes on tasks
	 */
	public static $status_key = array(
		'|' => 'comment',
		'--' => 'next',
		'==' => 'now',
		'__' => 'paused',
		'//' => 'done',
		'..' => 'hold',
		'xx' => 'canceled',
		'??' => 'question',
		'!!' => 'urgent',
		'::' => 'note',
	);

	/**
	 * a key to translate marks in the schedule
	 */
	public static $event_key = array(
		'>' => 'to',
		'~' => 'to',
		'|' => 'busy',
		'?' => 'maybe',
		'x' => 'canceled',
		'-' => true, // a special type, continues whatever comes before
	);

	public $data,
		$user;

	private $lines,
		$line_count,
		$line_num,
		$next_line_comment,
		$depth,
		$section;

	public function __construct($options = null) {
		if (!isset($options['user']))
			die('No username given');
		
		$this->user = $options['user'];
	}

	/**
	 * see if the given string contains a timezone code, and switch if it does
	 */
	static function checkTimezone($string) {
		/**
		 * disabled for now: assuming device local time
		 *
		$timezone = preg_replace('/^(.*?TZ > ([a-zA-Z\/_]+))?.*$/', '$2', $string);
		if ($timezone) {
			date_default_timezone_set($timezone);
		}
		 */
	}

	/**
	 * parse each line, and recurse on indented lines
	 */
	private function parseLine(&$parent_object = null, $force_depth = null) { // stack should only be as deep as indent depth
		$line = $this->lines[$this->line_num];

		if ($force_depth === null) {
			preg_match('/^\t+/', $line, $indent);
			$line_depth = strlen(@$indent[0]);
		} else {
			$line_depth = $force_depth;
		}

		$next_line = @$this->lines[$this->line_num + 1];
		preg_match('/^\t+/', $next_line, $next_indent);
		$next_line_depth = strlen(@$next_indent[0]);

		$diff = $next_line_depth - $line_depth;
		$this->next_line_comment = preg_match('/^\t+\|/', $next_line);
		$this->depth = $next_line_depth;

		$content = substr($line, ($line_depth > -1 ? $line_depth : 0));
		if ($line_depth == 0) {
			$this->section = $content;
		}
		$status_mark = preg_replace('/^(\||[=_\/:x\.!?-]{2})?.*/', '$1', $content);
		if ($status_mark) {
			$status = self::$status_key[$status_mark];
			$content = substr($content, strlen($status_mark)); // remove space after status mark
		} else {
			$status = null;
		}
		if ($status == 'comment') { // the document must not begin with a comment, else only the first line is parsed
			if ($parent_object === null) {
				return $content;
			} else {
				if ($parent_object->type == 'date') { // comment on a date is a schedule
                    if (substr($content, 0, 1) === '_') return // this is the schedule ruler, ignore

					$content = substr($content, 1);

					$event = (object) array(// TODO: parse this data with ~1 RegExp pattern
						'name' => preg_replace('/^.*?[x\~>?\| -]*(\d{4})?/', '', $content),
						'start' => preg_replace('/^(.*? (\d{4}))?.*$/', '$2', $content),
						'contains' => 'segment', // TODO: $hierarchies contains this type, but the structure is not linear, not using it yet
                        'children' => array(),
					);
					if ($event->start) {
						self::checkTimezone($content);
						$event->start = date_timestamp_get(DateTime::createFromFormat('d-m-Y Hi', $parent_object->date . ' ' . $event->start));
					}
					preg_match('/ !([0-9,]+)/', $event->name, $reminders);
					if ($reminders) {
						$reminders = explode(',', $reminders[1]);
						$event->remind = array();
						foreach($reminders as $reminder) {
							$event->remind[] = intval($reminder) * 60;
						}
					}
					$event->name = preg_replace('/ !\d+(,\d+)*/', '', $event->name);
                    preg_match('/^.*?[|x\~>?][|x\~>? -]*/', $content, $segments);
                    if ($segments) {
                        $segments = substr($segments[0], 1); // drop leading space in formatting

                        // parse segment durations
						$start_types = array('|', '?', '~');
						$start_type_index = 0;
						$start_offset = false;
						foreach ($start_types as $type) {
                            $start_offset = strpos($segments, $type);
							if ($start_offset !== false) break;
						}
						if ($start_offset === false) return; // no start time, don't parse this line

                        if (! $event->start) {
							$event->start = $parent_object->time + ($start_offset / 2) * 3600;
						}
                        $prev_type = null;
                        for ($step = 0; $step <= strlen($segments); $step++) {
							if ($step == strlen($segments)) {
								$type = null;
							} else {
								$type = @self::$event_key[substr($segments, $step, 1)];
							}
                            if ($type === true) $type = $prev_type;
                            if ($type !== $prev_type) {
								$step_time = $event->start + ($step - $start_offset) / 2 * 3600;
                                if ($prev_type && !empty($event->children)) {
                                    $event->children[count($event->children) - 1]->end = $step_time;
                                }
                                if ($type) {
									if ($event->start && $step == $start_offset)
										$step_time = $event->start;
                                    if (empty($event->children))
                                        $event->children = array();
                                    $event->children[] = (object) array(
                                        'start' => $step_time,
                                        'end' => $step_time,
                                        'type' => $type,
                                   );
                                }
                            }
                            $prev_type = $type;
                        }

                        // add event to schedule
						if (!isset($parent_object->schedule)) {
							$parent_object->schedule = array();
						}
						$parent_object->schedule[] = $event;
                    }
				} else {
					if (!isset($parent_object->comment)) {
						$parent_object->comment = $content;
					} else {
						$parent_object->comment .= "\n" . $content;
					}
				}
			}
		} else {
			$contains = @self::$hierarchies[strtolower($this->section)][$line_depth + 1];
			$object = (object) array(
				'name' => $content,
				'type' => @self::$hierarchies[strtolower($this->section)][$line_depth][0],
				'contains' => $contains[0],
			);
			if ($object->type == 'date') {
				$object->date = preg_replace('/^.*(\d{2}-\d{2}-\d{4}).*$/', '$1', $content);
				$object->time = date_timestamp_get(DateTime::createFromFormat('d-m-Y Hi', $object->date . ' 0000'));
				self::checkTimezone($content);
			}
			if ($status) $object->status = $status;
			if ($diff > 0 || $this->next_line_comment) {
				while ($this->depth > $line_depth - ($this->next_line_comment ? 1 : 0) && $this->line_num < $this->line_count - 1) {
					$this->line_num++;
					$this->parseLine($object);
				}
			}
			unset($object->type);
			unset($object->date);
			if (!isset($object->children)) {
				unset($object->contains);
			}
			if ($parent_object === null) {
				return $object;
			} else {
				if (!isset($parent_object->children)) {
					$parent_object->children = array();
				}
				$parent_object->children[] = $object;
			}
		}
	}

	/**
	 * load and parse Vim Outliner formatted data
	 */
	public function loadOTL() {
		$file_path = $this->user->dir . '/todo.otl';
		if (!file_exists($file_path))
			return false;
		$otl = file_get_contents($file_path);

		$this->lines = explode("\n", $otl);
		$this->line_count = count($this->lines);
		$this->line_num = 0;
		$this->next_line_comment = false;
		$this->depth = -1;
		$this->section = '';

		$this->data = (object) array(
			'name' => 'todo',
			'contains' => 'section',
		);
		$this->line_num = -1;
		while ($this->line_num < $this->line_count - 1) {
			$this->line_num++;
			$this->parseLine($this->data);
		}
		$this->lines = null;
		return json_encode($this->data);
	}

	/**
	 * encode JSON object as OTL document
	 */
	private function encodeOTL($object, $type = 'todo') {
		$otl = $indent . $object->name;
		
		if (isset($object->comment)) {
			$otl .= preg_replace('/(^|\n)/m', '| $1', $object->comment);
		}

		return $otl;
	}

	/**
	 * encode and save data in Vim Outliner format
	 */
	public function saveOTL() {
		// $otl = $this->encodeOTL();
		// file_put_contents($otl, $this->user->dir . '/todo.otl');
	}

	/**
	 * load JSON data
	 */
	public function loadJSON() {
		$file_path = $this->user->dir . '/todo.json';
		if (file_exists($file_path)) {
			$json = file_get_contents($file_path);
			$this->data = json_decode($json);
			return $json;
		}
		return false;
	}

	/**
	 * save JSON data
	 */
	public function saveJSON() {
		$file_path = $this->user->dir . '/todo.json';
		file_put_contents($file_path, json_encode($this->data));
	}

	/**
	 * load data in various formats
	 */
	public function load($force_update = false) {
		$file_path = $this->user->dir . '/todo.json';
		if (($this->user->settings->use_otl && $force_update) || !file_exists($file_path)) {
			return $this->loadOTL();
		} else {
			return $this->loadJSON();
		}
	}

	/**
	 * add directly to OTL inbox
	 */
	public function addToInboxOTL($task) {
		$todo_file = fopen($this->user->dir . '/todo.otl', 'a');
		$task_otl = "\t\t\t\t" . str_replace(' |', "\n\t\t\t\t|", $task) . "\n";
		fwrite($todo_file, $task_otl);
		fclose($todo_file);
	}
}
