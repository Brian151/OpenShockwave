(function (console, $hx_exports) { "use strict";
var brian151 = $hx_exports.brian151 = $hx_exports.brian151 || {};
$hx_exports.brian151.riff = $hx_exports.brian151.riff || {};
;$hx_exports.brian151.earthquake = $hx_exports.brian151.earthquake || {};
$hx_exports.brian151.earthquake.filesystem = $hx_exports.brian151.earthquake.filesystem || {};
function $extend(from, fields) {
	function Inherit() {} Inherit.prototype = from; var proto = new Inherit();
	for (var name in fields) proto[name] = fields[name];
	if( fields.toString !== Object.prototype.toString ) proto.toString = fields.toString;
	return proto;
}
Math.__name__ = true;
var Std = function() { };
Std.__name__ = true;
Std.string = function(s) {
	return js_Boot.__string_rec(s,"");
};
var brian151_earthquake_Cast = $hx_exports.brian151.earthquake.Cast = function() {
};
brian151_earthquake_Cast.__name__ = true;
var brian151_earthquake_CastMember = $hx_exports.brian151.earthquake.CastMember = function() {
};
brian151_earthquake_CastMember.__name__ = true;
var brian151_earthquake_Movie = $hx_exports.brian151.earthquake.Movie = function(src) {
	var header = new DataView(src,0,12);
	this.getType(header);
	if(this.isValid) {
		if(this.isCompressed) this.dataFile = new brian151_earthquake_filesystem_CompressedFile(src); else if(this.isProtected || this.isProjector) {
			this.dataFile = new brian151_earthquake_filesystem_ProtectedFile(src);
			if(this.isProjector) this.dataFile.setProjector();
		} else this.dataFile = new brian151_earthquake_filesystem_DirectorFile(src);
		this.dataFile.setFormat(this.riffType);
		var mapO = this.dataFile.findMap();
		this.dataFile.parseMap(mapO);
		this.isExternalCast = this.dataFile.checkCast();
		if(this.isExternalCast && this.isProjector) this.isValid = false;
		if(this.isValid) this.dataFile.parseSectionAssociationTable();
	}
};
brian151_earthquake_Movie.__name__ = true;
brian151_earthquake_Movie.prototype = {
	getType: function(hint) {
		var head = hint.getUint32(0);
		var formType = hint.getUint32(8);
		var len = 0;
		this.isValid = true;
		switch(head) {
		case 1481001298:
			this.riffType = "XFIR";
			len = hint.getUint32(4,true);
			break;
		case 1380533848:
			this.riffType = "RIFX";
			len = hint.getUint32(4,false);
			break;
		default:
			this.isValid = false;
		}
		if(hint.buffer.byteLength - 8 != len) this.isValid = false;
		this.isCompressed = false;
		this.isProtected = false;
		this.isProjector = false;
		switch(formType) {
		case 859395661:
			if(this.riffType != "XFIR") this.isValid = false;
			break;
		case 1297496371:
			if(this.riffType != "RIFX") this.isValid = false;
			break;
		case 1296320326:
			if(this.riffType != "XFIR") this.isValid = false;
			this.isCompressed = true;
			break;
		case 1179075661:
			if(this.riffType != "RIFX") this.isValid = false;
			this.isCompressed = true;
			break;
		case 1280331841:
			if(this.riffType != "XFIR") this.isValid = false;
			this.isProjector = true;
			break;
		case 1095782476:
			if(this.riffType != "RIFX") this.isValid = false;
			this.isProjector = true;
			break;
		default:
			this.isValid = false;
		}
	}
};
var brian151_earthquake_filesystem_CompressedFile = $hx_exports.brian151.earthquake.filesystem.CompressedFile = function(src) {
	brian151.riff.File.call(this,src);
	this.isProjector = false;
};
brian151_earthquake_filesystem_CompressedFile.__name__ = true;
brian151_earthquake_filesystem_CompressedFile.__super__ = brian151.riff.File;
brian151_earthquake_filesystem_CompressedFile.prototype = $extend(brian151.riff.File.prototype,{
	checkCast: function() {
		return false;
	}
	,setProjector: function() {
		this.isProjector = true;
	}
});
var brian151_earthquake_filesystem_DirectorFile = $hx_exports.brian151.earthquake.filesystem.DirectorFile = function(src) {
	brian151.riff.File.call(this,src);
	this.isProjector = false;
	this.state = 0;
};
brian151_earthquake_filesystem_DirectorFile.__name__ = true;
brian151_earthquake_filesystem_DirectorFile.__super__ = brian151.riff.File;
brian151_earthquake_filesystem_DirectorFile.prototype = $extend(brian151.riff.File.prototype,{
	checkCast: function() {
		var out = true;
		if(this.state >= 1) {
			var _g1 = 0;
			var _g = this.ptrs1.length;
			while(_g1 < _g) {
				var i = _g1++;
				var id = this.getFourCCAt(this.ptrs1[i]);
				if(id == "MCsL") {
					out = false;
					break;
				}
			}
		} else window.console.log("cannot check as external cast, mmap not parsed");
		window.console.log("is external cast : " + (out == null?"null":"" + out));
		return out;
	}
	,setProjector: function() {
		this.isProjector = true;
	}
	,findMap: function() {
		var mapIndexChunk = this.getSectionAt(12);
		var mapIndexHandler = new brian151.riff.LinkedSectionHandler(mapIndexChunk,this);
		return mapIndexHandler.getUIntAt(4,2);
	}
	,parseMap: function(offset) {
		var mapChunk = this.getSectionAt(offset);
		var id = mapChunk.get_ID();
		window.console.log("assumed memory map ID: " + id);
		window.console.log("selected format: " + this.formats[this.currentFormat]);
		if(id == "mmap") {
			var handler = new brian151.riff.LinkedSectionHandler(mapChunk,this);
			var count = handler.getUIntAt(4,2);
			var usedCount = handler.getUIntAt(8,2);
			this.ptrBuffer = new ArrayBuffer(usedCount * 4 + count * 4);
			this.ptrs1 = new Uint32Array(this.ptrBuffer,0,usedCount);
			this.ptrs2 = new Uint32Array(this.ptrBuffer,usedCount,count);
			var i0 = 0;
			var _g = 0;
			while(_g < count) {
				var i = _g++;
				var offset2 = i * 20 + 24;
				var id1 = handler.getFourCCAt(offset2);
				if(i == 0) window.console.log("current mapped chunk(0): " + id1);
				var offset3 = handler.getUIntAt(offset2 + 8,2);
				if(id1 != "free") {
					this.ptrs1[i0] = offset3;
					i0++;
				}
				this.ptrs2[i] = offset3;
				$hx_scope.ptrs1 = this.ptrs1;
				$hx_scope.ptrs2 = this.ptrs2;
				this.state = 1;
			}
		}
	}
	,parseSectionAssociationTable: function() {
		var aTabOffset = 0;
		var foundATab = false;
		var out = [];
		var _g1 = 0;
		var _g = this.ptrs1.length;
		while(_g1 < _g) {
			var i = _g1++;
			var curr = this.getFourCCAt(this.ptrs1[i]);
			if(curr == "KEY*") {
				foundATab = true;
				aTabOffset = this.ptrs1[i];
				break;
			}
		}
		if(foundATab) {
			window.console.log("KEY* found at : " + this.toHex(aTabOffset,"U32"));
			var aTab = this.getSectionAt(aTabOffset);
			var aTabHandler = new brian151.riff.LinkedSectionHandler(aTab,this);
			var sectionCount = aTabHandler.getUIntAt(4,2);
			var count2 = aTabHandler.getUIntAt(8,2);
			var _g2 = 0;
			while(_g2 < sectionCount) {
				var i1 = _g2++;
				var baseOffset = i1 * 12 + 12;
				var flag = aTabHandler.getUShortAt(baseOffset + 4,true) == 1024;
				var sectionID = aTabHandler.getUIntAt(baseOffset,2);
				if(!flag) {
					var parentOffset = this.ptrs1[aTabHandler.getUIntAt(baseOffset + 4,2)];
					var foundParent = false;
					var pointer = 0;
					var _g21 = 0;
					var _g11 = out.length;
					while(_g21 < _g11) {
						var i2 = _g21++;
						if(out[i2][0] == parentOffset) {
							pointer = i2;
							foundParent = true;
							break;
						}
					}
					if(!foundParent) {
						pointer = out.length;
						out.push([parentOffset]);
					}
					out[pointer].push(this.ptrs2[sectionID]);
				}
			}
		} else window.console.log("error ! cannot find KEY*");
		$hx_scope.shockwaveKeys = out;
		return out;
	}
});
var brian151_earthquake_filesystem_ProtectedFile = $hx_exports.brian151.earthquake.filesystem.ProtectedFile = function(src) {
	brian151.riff.File.call(this,src);
	this.isProjector = false;
};
brian151_earthquake_filesystem_ProtectedFile.__name__ = true;
brian151_earthquake_filesystem_ProtectedFile.__super__ = brian151.riff.File;
brian151_earthquake_filesystem_ProtectedFile.prototype = $extend(brian151.riff.File.prototype,{
	checkCast: function() {
		return false;
	}
	,setProjector: function() {
		this.isProjector = true;
	}
});
var js_Boot = function() { };
js_Boot.__name__ = true;
js_Boot.__string_rec = function(o,s) {
	if(o == null) return "null";
	if(s.length >= 5) return "<...>";
	var t = typeof(o);
	if(t == "function" && (o.__name__ || o.__ename__)) t = "object";
	switch(t) {
	case "object":
		if(o instanceof Array) {
			if(o.__enum__) {
				if(o.length == 2) return o[0];
				var str2 = o[0] + "(";
				s += "\t";
				var _g1 = 2;
				var _g = o.length;
				while(_g1 < _g) {
					var i1 = _g1++;
					if(i1 != 2) str2 += "," + js_Boot.__string_rec(o[i1],s); else str2 += js_Boot.__string_rec(o[i1],s);
				}
				return str2 + ")";
			}
			var l = o.length;
			var i;
			var str1 = "[";
			s += "\t";
			var _g2 = 0;
			while(_g2 < l) {
				var i2 = _g2++;
				str1 += (i2 > 0?",":"") + js_Boot.__string_rec(o[i2],s);
			}
			str1 += "]";
			return str1;
		}
		var tostr;
		try {
			tostr = o.toString;
		} catch( e ) {
			return "???";
		}
		if(tostr != null && tostr != Object.toString && typeof(tostr) == "function") {
			var s2 = o.toString();
			if(s2 != "[object Object]") return s2;
		}
		var k = null;
		var str = "{\n";
		s += "\t";
		var hasp = o.hasOwnProperty != null;
		for( var k in o ) {
		if(hasp && !o.hasOwnProperty(k)) {
			continue;
		}
		if(k == "prototype" || k == "__class__" || k == "__super__" || k == "__interfaces__" || k == "__properties__") {
			continue;
		}
		if(str.length != 2) str += ", \n";
		str += s + k + " : " + js_Boot.__string_rec(o[k],s);
		}
		s = s.substring(1);
		str += "\n" + s + "}";
		return str;
	case "function":
		return "<function>";
	case "string":
		return o;
	default:
		return String(o);
	}
};
String.__name__ = true;
Array.__name__ = true;
})(typeof console != "undefined" ? console : {log:function(){}}, typeof $hx_scope != "undefined" ? $hx_scope : $hx_scope = {});
