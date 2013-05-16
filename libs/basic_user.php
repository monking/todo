<?php
/**
 * A class to enable prolonged user sessions with HTTP Basic Auth
 */
class BasicUser {

	public $username,
		$dir,
		$settings;

	private $user_dir,
		$settings_dir,
		$credentials,
		$signatures;

	public function __construct($options) {
		$defaults = array(
			'credentials_path' => __DIR__,
			'user_dir' => __DIR__,
			'realm' => 'Restricted area',
			'user_default_settings' => array(),
			'sig_expire' => 60 * 60 * 24 * 30 // 30 days
		);
		foreach ($defaults as $key => $value) {
			$this->$key = (isset($options[$key]) ? $options[$key] : $defaults[$key]);
		}
	}

	/**
	 * a stop-gap solution for authentication
	 */
	public function declareUser($username) {
		$this->loadCredentials();
		$this->username = $username;
		$this->issueSignature();
	}

	public function authenticate($force_password = false) {
		$this->loadCredentials();
		// check if they have a cookie to match the uniqid on file
		if (!$force_password && isset($_COOKIE['sig']) && isset($this->signatures[$_COOKIE['sig']])) {
			$this->username = $this->signatures[$_COOKIE['sig']];
		} else {
			if ($force_password || empty($_SERVER['PHP_AUTH_DIGEST'])) {
				header('HTTP/1.1 401 Unauthorized');
				header('WWW-Authenticate: Digest realm="'.$this->realm.
					   '",qop="auth",nonce="'.uniqid().'",opaque="'.md5($this->realm).'"');

				die('You must log in.');
			}

			// analyze the PHP_AUTH_DIGEST variable
			if (!($data = $this->http_digest_parse($_SERVER['PHP_AUTH_DIGEST'])) ||
				!isset($this->credentials->{$data['username']}))
				die('Wrong Credentials!');

			// generate the valid response
			$A1 = md5($data['username'] . ':' . $this->realm . ':' . $this->credentials->{$data['username']}->pass);
			$A2 = md5($_SERVER['REQUEST_METHOD'].':'.$data['uri']);
			$valid_response = md5($A1.':'.$data['nonce'].':'.$data['nc'].':'.$data['cnonce'].':'.$data['qop'].':'.$A2);

			if ($data['response'] != $valid_response)
				die('Wrong Credentials!');

			$this->username = $data['username'];
			$this->issueSignature();
		}
	}

	public function logout() {
		header('HTTP/1.1 401 Unauthorized');
		header('WWW-Authenticate: Digest realm="'.$this->realm.
			   '",qop="auth",nonce="'.uniqid().'",opaque="'.md5($this->realm).'"');
		setcookie('sig', null);
		$_COOKIE['sig'] = null;
		header('Location:/');
		die('You have been logged out.');
	}

	public function loadSettings() {
		$this->dir = $this->user_dir . DS . $this->username;
		$this->settings_file = $this->dir . DS . 'settings.json';
		if (file_exists($this->settings_file)) {
			$this->settings = json_decode(file_get_contents($this->settings_file));
		} else {
			$this->settings = (object) $this->user_default_settings;
			if (!file_exists($this->dir))
				mkdir($this->dir);
			file_put_contents($this->settings_file, json_encode($this->settings));
		}
	}

	private function loadCredentials() {
		$this->credentials = json_decode(file_get_contents($this->credentials_path));
		$this->signatures = array();
		foreach ($this->credentials as $username => $credentials) {
			if (!isset($credentials->sig)) continue;
			$this->signatures[$credentials->sig] = $username;
		}
	}

	private function saveCredentials() {
		file_put_contents($this->credentials_path, json_encode($this->credentials));
	}

	private function issueSignature() {
		if (!isset($this->credentials->{$this->username}->sig)) {
			$this->credentials->{$this->username}->sig = uniqid();
			$this->saveCredentials();
		}
		setcookie('sig', $this->credentials->{$this->username}->sig, time() + $this->sig_expire, '/');
		$_COOKIE['sig'] = $this->credentials->{$this->username}->sig;
	}

	// function to parse the http auth header
	private function http_digest_parse($txt) {
		// protect against missing data
		$needed_parts = array('nonce'=>1, 'nc'=>1, 'cnonce'=>1, 'qop'=>1, 'username'=>1, 'uri'=>1, 'response'=>1);
		$data = array();
		$keys = implode('|', array_keys($needed_parts));

		preg_match_all('@(' . $keys . ')=(?:([\'"])([^\2]+?)\2|([^\s,]+))@', $txt, $matches, PREG_SET_ORDER);

		foreach ($matches as $m) {
			$data[$m[1]] = $m[3] ? $m[3] : $m[4];
			unset($needed_parts[$m[1]]);
		}

		return $needed_parts ? false : $data;
	}

}
