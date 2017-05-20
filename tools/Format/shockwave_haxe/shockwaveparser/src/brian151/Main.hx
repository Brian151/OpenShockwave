package brian151;
import brian151.earthquake.Movie;
import js.Lib;
import js.html.XMLHttpRequest;
import js.Browser;

/**
 * ...
 * @author Brian151
 */

class Main 
{
	static var mov:Movie;
	static var xhr:XMLHttpRequest;
	static var test:Bool;
	static function main() {
		test = false;
		xhr = new XMLHttpRequest();
		untyped __js__("brian151_Main.xhr.responseType = \"arraybuffer\"");
		xhr.open("GET", "spybot_0807_sw.dir", true);
		xhr.send();
		xhr.onreadystatechange = function () {
			if (xhr.readyState == 4) {
				if (xhr.status == 200) {
					mov = new Movie(xhr.response);
				}
			}
		}
	}
	
}