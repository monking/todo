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
		'notes' => array(
			array('section'),
			array('subject')
		),
		'backlog' => array(
			array('section'),
			array('status'),
			array('category'),
			array('project'),
			array('task'),
		)
	);

	/**
	 * a key to translate the status prefixes on tasks
	 */
	public static $status_keys = array(
		'|' => 'comment',
		'__' => 'normal',
		'==' => 'next',
		'>>' => 'now',
		'~~' => 'background',
		'::' => 'paused',
		'//' => 'done',
		'..' => 'hold',
		'xx' => 'canceled',
		'??' => 'question',
		'!!' => 'urgent',
		'##' => 'note'
	);

	public static $status_codes = array();

	/**
	 * a key to translate marks in the schedule
	 */
	public static $event_key = array(
		'~' => 'while',
		'>' => 'to',
		'<' => 'from',
		'|' => 'busy',
		'?' => 'maybe',
		'x' => 'canceled'
	);

	public static $event_codes = array();

	public $data,
		$user;

	private $lines,
		$line_count,
		$line_num,
		$next_line_comment,
		$depth,
		$section;

	/*
	 * @param array $options [
	 *   $user BasicUser
	 *   ]
	 */
	public function __construct($options = array()) {
		if (!isset($options['user']))
			die('No username given');
		self::$status_codes = array_flip(self::$status_keys);
		self::$event_codes = array_flip(self::$event_key);
		
		$this->user = $options['user'];
	}

	/**
	 * see if the given string contains a timezone code, and switch if it does
	 *
	 * @param string $line the text to search for a timezone declaration
	 */
	static function checkTimezone($line) {
		/**
		 * disabled for now: assuming device local time
		 *
		$timezone = preg_replace('/^(.*?TZ > ([a-zA-Z\/_]+))?.*$/', '$2', $line);
		if ($timezone) {
			date_default_timezone_set($timezone);
		}
		 */
	}

	/**
	 * parse each line, and recurse on indented lines
	 *
	 * @param stdClass $parent_object the object on which to add this line as a 
	 *   child, comment, or however it is parsed. Leave NULL when calling 
	 *   explicitly.
	 * @param number $force_depth depth in the data tree, to override apparent 
	 *   depth based on line indentation.
	 * @return stdClass if $parent_object is NULL, otherwise void
	 *
	 * NOTE: meant to be called recursively, the stack will be as deep as the 
	 * object.
	 */
	private function parseLine(&$parent_object = null, $force_depth = null) {
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
		$status_mark = preg_replace('/^(\||[=_>\/:x\.!?]{2})?.*/', '$1', $content);
		if ($status_mark) {
			$status = self::$status_keys[$status_mark];
			$content = substr($content, strlen($status_mark)); // remove status mark and following space
		} else {
			$status = null;
		}
		if ($status == 'comment') { // the document must not begin with a comment, else only the first line is parsed
			if ($parent_object === null) {
				return $content;
			} else {
				if ($parent_object->type == 'date') { // comment on a date is a schedule
					if (substr($content, 0, 1) === '_') { // this is the schedule ruler, ignore
						return;
					} else if (substr($content, 0, 1) === '-') { // this is a divider in the schedule
						$parent_object->schedule[] = (object) array(
							'type' => 'divider',
							'name' => preg_replace('/^-+\s*|\s*-+$/', '', $content)
						);
					} else {
						// $content = substr($content, 1); // trim leading space from comment

						$event = (object) array(// TODO: parse this data with ~1 RegExp pattern
							'name' => preg_replace('/^.*?[x\~>?\| -]*(\d\d:?\d\d )?/', '', $content),
							'start' => preg_replace('/^(.*? ((\d\d):?(\d\d) ))?.*$/', '$3$4', $content),
							'contains' => 'segment', // TODO: $hierarchies contains this type, but the structure is not linear, not using it yet
							'children' => array(),
						);
						if ($event->start) {
							self::checkTimezone($content);
							$event->start = date_timestamp_get(DateTime::createFromFormat('Y-m-d Hi', $parent_object->date . ' ' . $event->start));
						}
						preg_match('/ +!\[?([0-9,]+)/', $event->name, $reminders);
						if ($reminders) {
							$event->name = preg_replace('/ +!\d+(,\d+)*/', '', $event->name);
							$reminders = explode(',', $reminders[1]);
							$event->remind = array();
							foreach($reminders as $reminder) {
								$event->remind[] = intval($reminder) * 60;
							}
						}
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

							if (!$event->start) {
								$event->start = $parent_object->time + ($start_offset / 2) * 3600;
							}
							$prev_type = null;
							for ($step = 0; $step <= strlen($segments); $step++) {
								if ($step == strlen($segments)) {
									$type = null;
								} else if ('-' === substr($segments, $step, 1)) {
									$type = $type = $prev_type;
								} else {
									$type = @self::$event_key[substr($segments, $step, 1)];
								}
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
				$object->date = preg_replace('/^.*(\d{4}-\d{2}-\d{2}).*$/', '$1', $content);
				$object->time = date_timestamp_get(DateTime::createFromFormat('Y-m-d Hi', $object->date . ' 0000'));
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
	 *
	 * @return string JSON todo data
	 */
	public function loadOTL() {
		$file_path = $this->user->dir . DS . 'todo.otl';
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
	 * encode a period of time in text
	 *
	 * @param stdClass $segment [
	 *   int $start timestamp, NULL assumes 00:00 on the date of ->end
	 *   int $end timestamp
	 *   string $type name of the segment type, NULL for spaces
	 *   ]
	 * @param string $timezone Unix-compatible timezone name
	 */
	private function textSegment($segment, $timezone = 'America/Los_Angeles') {
		date_default_timezone_set($timezone);
		$end_half_hours = date('G', $segment->end) * 2 + round(date('i', $segment->end) / 30);
		if ($segment->start === NULL) {
			$start_half_hours = 0;
		} else {
			$start_half_hours = date('G', $segment->start) * 2 + round(date('i', $segment->start) / 30);
		}
		if ($start_half_hours > $end_half_hours) {
			$end_half_hours += 48;
		}
		$type_code = ($segment->type === NULL ? ' ' : self::$event_codes[$segment->type]);
		$duration_half_hours = $end_half_hours - $start_half_hours - 1;
		if ($duration_half_hours < 1) {
			$duration = '';
		} else {
			$duration = str_repeat(($segment->type === NULL ? ' ' : '-'), $duration_half_hours);
		}
		return $type_code . $duration;
	}

	/**
	 * encode object as OTL document
	 *
	 * @param stdClass $object entire todo data tree
	 * @param string $indent indent to start with
	 * @return string OTL-encoded text data
	 *
	 * NOTE: calls itself recursively on the contents of the `children` 
	 *   property of $object, if it exists.
	 */
	private function encodeOTL($object, $indent = '') {
		$otl = $indent;
		if (isset($object->status)) {
			$otl .= self::$status_codes[$object->status] . ' ';
		}
		if (isset($object->name)) {
			$otl .= $object->name;
		}
		$otl .= "\n";
		if (isset($object->schedule)) {
			$otl .= $indent . '|_| . . : . . | . . : . . | . . : . . | . . : . . | . . : . .' . "\n";
			foreach ($object->schedule as $event) {
				$otl .= $indent . '|';
				$last_end_time = NULL;
				if (isset($event->type) && $event->type == 'divider') {
					$otl .= '- ' . $event->name;
				} else {
					$otl .= ' ';
					foreach ($event->children as $segment) {
						if ($segment->start !== $last_end_time) {
							$otl .= $this->textSegment((object) array(
								'start' => $last_end_time,
								'end' => $segment->start,
								'type' => NULL
							));
						}
						$last_end_time = $segment->end;
						$otl .= $this->textSegment($segment);
					}
					$otl .= ' ' . date('H:i', $event->start) . ' ' . $event->name;
					if (isset($event->remind)) {
						$reminders = array();
						foreach ($event->remind as $seconds) {
							$reminders[] = intval($seconds / 60);
						}
						$otl .= '  !' . implode(',', $reminders);
					}
				}
				$otl .= "\n";
			}
		}
		if (isset($object->comment)) {
			$otl .= $indent . '| ' . preg_replace('/\n/m', "\n$indent|", $object->comment);
			$otl .= "\n";
		}
		if (isset($object->children)) { foreach ($object->children as $object) {
				$otl .= $this->encodeOTL($object, $indent . "\t");
			}
		}
		return $otl;
	}

	/**
	 * encode and save data in Vim Outliner format
	 */
	public function saveOTL() {
		$otl = '';
		foreach ($this->data->children as $object) {
			$otl .= $this->encodeOTL($object, '');
		}
		file_put_contents($this->user->dir . '/todo.otl', $otl);
	}

	/**
	 * load JSON data
	 *
	 * @return string JSON-encoded data, or FALSE if none loaded.
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
	 *
	 * @param boolean $force_update if the user has the `use_otl` option set to 
	 *   TRUE, the text version of the data is interpreted and the JSON file is 
	 *   updated
	 * @return string JSON-encoded data, or FALSE if none loaded.
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
	 *
	 * @param string $task new line to add to the inbox
	 */
	public function addToInboxOTL($task) {
		$todo_file = fopen($this->user->dir . '/todo.otl', 'a');
		$task_otl = "\t\t\t\t" . str_replace(' |', "\n\t\t\t\t|", $task) . "\n";
		fwrite($todo_file, $task_otl);
		fclose($todo_file);
	}
}
