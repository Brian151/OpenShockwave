(function (console, $hx_exports) { "use strict";
var brian151 = $hx_exports.brian151 = $hx_exports.brian151 || {};
$hx_exports.brian151.riff = $hx_exports.brian151.riff || {};
;$hx_exports.brian151.earthquake = $hx_exports.brian151.earthquake || {};
$hx_exports.brian151.earthquake.filesystem = $hx_exports.brian151.earthquake.filesystem || {};
var brian151_Main = function() { };
brian151_Main.main = function() {
	brian151_Main.test = false;
	brian151_Main.xhr = new XMLHttpRequest();
	brian151_Main.xhr.responseType = "arraybuffer";
	brian151_Main.xhr.open("GET","spybot_0807_sw.dir",true);
	brian151_Main.xhr.send();
	brian151_Main.xhr.onreadystatechange = function() {
		if(brian151_Main.xhr.readyState == 4) {
			if(brian151_Main.xhr.status == 200) brian151_Main.mov = new brian151.earthquake.Movie(brian151_Main.xhr.response);
		}
	};
};
brian151_Main.main();
})(typeof console != "undefined" ? console : {log:function(){}}, typeof $hx_scope != "undefined" ? $hx_scope : $hx_scope = {});
