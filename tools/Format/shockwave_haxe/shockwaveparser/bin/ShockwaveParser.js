(function (console, $hx_exports) { "use strict";
$hx_exports.brian151 = $hx_exports.brian151 || {};
$hx_exports.brian151.riff = $hx_exports.brian151.riff || {};
;$hx_exports.brian151.earthquake = $hx_exports.brian151.earthquake || {};
$hx_exports.brian151.earthquake.filesystem = $hx_exports.brian151.earthquake.filesystem || {};
function $extend(from, fields) {
	function Inherit() {} Inherit.prototype = from; var proto = new Inherit();
	for (var name in fields) proto[name] = fields[name];
	if( fields.toString !== Object.prototype.toString ) proto.toString = fields.toString;
	return proto;
}
var HxOverrides = function() { };
HxOverrides.__name__ = true;
HxOverrides.cca = function(s,index) {
	var x = s.charCodeAt(index);
	if(x != x) return undefined;
	return x;
};
Math.__name__ = true;
var Std = function() { };
Std.__name__ = true;
Std.string = function(s) {
	return js_Boot.__string_rec(s,"");
};
var brian151_Main = function() { };
brian151_Main.__name__ = true;
brian151_Main.main = function() {
	brian151_Main.test = false;
	brian151_Main.xhr = new XMLHttpRequest();
	brian151_Main.xhr.responseType = "arraybuffer";
	brian151_Main.xhr.open("GET","spybot_0807_sw.dir",true);
	brian151_Main.xhr.send();
	brian151_Main.xhr.onreadystatechange = function() {
		if(brian151_Main.xhr.readyState == 4) {
			if(brian151_Main.xhr.status == 200) brian151_Main.mov = new brian151_earthquake_Movie(brian151_Main.xhr.response);
		}
	};
};
var brian151_earthquake_Movie = $hx_exports.brian151.earthquake.Movie = function(src) {
	var header = new DataView(src,0,12);
	this.getType(header);
	if(this.isValid) {
		if(this.isCompressed) this.dataFile = new brian151_earthquake_filesystem_CompressedFile(src); else if(this.isProtected || this.isProjector) {
			this.dataFile = new brian151_earthquake_filesystem_ProtectedFile(src);
			if(this.isProjector) this.dataFile.setProjector();
		} else this.dataFile = new brian151_earthquake_filesystem_DirectorFile(src);
		this.isExternalCast = this.dataFile.checkCast();
		if(this.isExternalCast && this.isProjector) this.isValid = false;
		this.dataFile.setFormat(this.riffType);
		var mapO = this.dataFile.findMap();
		this.dataFile.parseMap(mapO);
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
var brian151_riff_File = $hx_exports.brian151.riff.File = function(datasrc) {
	this.view = new DataView(datasrc);
	this.length = this.view.byteLength;
	this.formats = ["RIFF","RIFX","XFIR"];
	this.formatByteOrder = [["B","L"],["B","B"],["L","L"]];
	this.currentFormat = 0;
};
brian151_riff_File.__name__ = true;
brian151_riff_File.prototype = {
	getSectionAt: function(offset) {
		var id = this.getFourCCAt(offset);
		var len = this.getUIntAt(offset + 4,0);
		return new brian151_riff_Section(this.view.buffer,offset,len,id);
	}
	,getFourCCAt: function(offset) {
		var off = offset;
		var byteOrder = this.formatByteOrder[this.currentFormat][0] == "L";
		var str = [];
		var hasErrored = false;
		var _g = 0;
		while(_g < 4) {
			var i = _g++;
			var curr = this.getUByteAt(off + i);
			if(curr >= 32) str.push(String.fromCharCode(curr)); else {
				hasErrored = true;
				str = ["E","R","R"," "];
				break;
			}
		}
		if(byteOrder && !hasErrored) str.reverse();
		var out = str.join("");
		return out;
	}
	,setFourCCAt: function(offset,fourCC) {
		var isString = typeof fourCC == "string";
		if(isString && fourCC.length == 4) {
			var str = fourCC.split("");
			var byteOrder = this.formatByteOrder[this.currentFormat][0] == "L";
			if(byteOrder) str.reverse();
			var _g = 0;
			while(_g < 4) {
				var i = _g++;
				var curr = HxOverrides.cca(str[i],0);
				var currS = str[i];
				if(curr == 32 && curr <= 255) this.setUByteAt(offset + i,curr); else {
					this.setUByteAt(offset + i,32);
					window.console.log("WARNING! : " + currS + " | " + curr + " is not a valid printable ASCII character! space written to fourCC at offset " + this.toHex(offset,"U32") + " | " + this.toHex(offset + i,"U32"));
				}
			}
		}
	}
	,getUIntAt: function(offset,byteOrderID) {
		var byteOrder = false;
		switch(byteOrderID) {
		case 1:
			byteOrder = false;
			break;
		case 2:
			byteOrder = true;
			break;
		default:
			byteOrder = this.formatByteOrder[this.currentFormat][0] == "L";
		}
		return this.view.getUint32(offset,byteOrder);
	}
	,setUintAt: function(offset,value,byteOrderID) {
		var byteOrder = false;
		switch(byteOrderID) {
		case 1:
			byteOrder = false;
			break;
		case 2:
			byteOrder = true;
			break;
		default:
			byteOrder = this.formatByteOrder[this.currentFormat][0] == "L";
		}
		this.view.setUint32(offset,value,byteOrder);
	}
	,getUShortAt: function(offset,byteOrder) {
		return this.view.getUint16(offset,byteOrder);
	}
	,setUShortAt: function(offset,value,byteOrder) {
		this.view.setUint16(offset,value,byteOrder);
	}
	,getUByteAt: function(offset) {
		return this.view.getUint8(offset);
	}
	,setUByteAt: function(offset,value) {
		this.view.setUint8(offset,value);
	}
	,getIntAt: function(offset,byteOrder) {
		return this.view.getUint32(offset,byteOrder);
	}
	,setIntAt: function(offset,value,byteOrder) {
		this.view.setUint32(offset,value,byteOrder);
	}
	,getShortAt: function(offset,byteOrder) {
		return this.view.getInt16(offset,byteOrder);
	}
	,setShortAt: function(offset,value,byteOrder) {
		this.view.setInt16(offset,value,byteOrder);
	}
	,getByteAt: function(offset) {
		return this.view.getInt8(offset);
	}
	,setByteAt: function(offset,value) {
		this.view.setInt8(offset,value);
	}
	,getFloatAt: function(offset,byteOrder) {
		return this.view.getFloat32(offset,byteOrder);
	}
	,setFloatAt: function(offset,value,byteOrder) {
		this.view.setFloat32(offset,value,byteOrder);
	}
	,getDoubleAt: function(offset,byteOrder) {
		return this.view.getFloat64(offset,byteOrder);
	}
	,setDoubleAt: function(offset,value,byteOrder) {
		this.view.setFloat64(offset,value,byteOrder);
	}
	,toHex: function(value,type) {
		var isNum = typeof value == "number";
		var out = "";
		if(isNum) {
			out = value.toString(16);
			var len = 0;
			switch(type) {
			case "U16":
				len = 16 / 4;
				break;
			case "U8":
				len = 8 / 4;
				break;
			default:
				len = 32 / 4;
			}
			if(out.length < len) {
				var pad = len - out.length;
				var _g = 0;
				while(_g < pad) {
					var i = _g++;
					var temp = "0" + out;
					out = temp;
				}
			} else if(out.length > len) {
				window.console.log("ERROR HEX-ENCODING " + Std.string(value) + " as " + type + " !");
				this.toHex(0,type);
			}
		} else window.console.log(Std.string(value) + " is not a number!");
		return out;
	}
	,setFormat: function(f) {
		if(f.length == 0) f = "RIFF";
		var _g1 = 0;
		var _g = this.formats.length;
		while(_g1 < _g) {
			var i = _g1++;
			var curr = this.formats[i];
			if(curr == f) {
				this.currentFormat = i;
				break;
			}
		}
	}
};
var brian151_earthquake_filesystem_CompressedFile = $hx_exports.brian151.earthquake.filesystem.CompressedFile = function(src) {
	brian151_riff_File.call(this,src);
	this.isProjector = false;
};
brian151_earthquake_filesystem_CompressedFile.__name__ = true;
brian151_earthquake_filesystem_CompressedFile.__super__ = brian151_riff_File;
brian151_earthquake_filesystem_CompressedFile.prototype = $extend(brian151_riff_File.prototype,{
	checkCast: function() {
		return false;
	}
	,setProjector: function() {
		this.isProjector = true;
	}
});
var brian151_earthquake_filesystem_DirectorFile = $hx_exports.brian151.earthquake.filesystem.DirectorFile = function(src) {
	brian151_riff_File.call(this,src);
	this.isProjector = false;
};
brian151_earthquake_filesystem_DirectorFile.__name__ = true;
brian151_earthquake_filesystem_DirectorFile.__super__ = brian151_riff_File;
brian151_earthquake_filesystem_DirectorFile.prototype = $extend(brian151_riff_File.prototype,{
	checkCast: function() {
		return false;
	}
	,setProjector: function() {
		this.isProjector = true;
	}
	,findMap: function() {
		var mapIndexChunk = this.getSectionAt(12);
		var mapIndexHandler = new brian151_riff_LinkedSectionHandler(mapIndexChunk,this);
		return mapIndexHandler.getUIntAt(4,2);
	}
	,parseMap: function(offset) {
		var mapChunk = this.getSectionAt(offset);
		var id = mapChunk.get_ID();
		window.console.log("assumed memory map ID: " + id);
		window.console.log("selected format: " + this.formats[this.currentFormat]);
		if(id == "mmap") {
			var handler = new brian151_riff_LinkedSectionHandler(mapChunk,this);
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
			}
		}
	}
});
var brian151_earthquake_filesystem_ProtectedFile = $hx_exports.brian151.earthquake.filesystem.ProtectedFile = function(src) {
	brian151_riff_File.call(this,src);
	this.isProjector = false;
};
brian151_earthquake_filesystem_ProtectedFile.__name__ = true;
brian151_earthquake_filesystem_ProtectedFile.__super__ = brian151_riff_File;
brian151_earthquake_filesystem_ProtectedFile.prototype = $extend(brian151_riff_File.prototype,{
	checkCast: function() {
		return false;
	}
	,setProjector: function() {
		this.isProjector = true;
	}
});
var brian151_riff_LinkedSectionHandler = $hx_exports.brian151.riff.LinkedSectionHandler = function(src,parent) {
	this.target = src;
	this.view = this.target.get_view();
	this.parentFile = parent;
};
brian151_riff_LinkedSectionHandler.__name__ = true;
brian151_riff_LinkedSectionHandler.prototype = {
	checkBounds: function(offset,length) {
		return offset + length >= this.view.byteLength;
	}
	,getFourCCAt: function(offset) {
		if(!this.checkBounds(offset,4)) return this.parentFile.getFourCCAt(this.view.byteOffset + offset); else return "ERR ";
	}
	,setFourCCAt: function(offset,fourCC) {
		if(!this.checkBounds(offset,4)) this.parentFile.setFourCCAt(this.view.byteOffset + offset,fourCC);
	}
	,getUIntAt: function(offset,byteOrderID) {
		if(!this.checkBounds(offset,4)) return this.parentFile.getUIntAt(this.view.byteOffset + offset,byteOrderID); else return 0;
	}
	,setUintAt: function(offset,value,byteOrderID) {
		if(!this.checkBounds(offset,4)) this.parentFile.setUintAt(this.view.byteOffset + offset,value,byteOrderID);
	}
	,getUShortAt: function(offset,byteOrder) {
		if(!this.checkBounds(offset,2)) return this.parentFile.getUShortAt(this.view.byteOffset + offset,byteOrder); else return 0;
	}
	,setUShortAt: function(offset,value,byteOrder) {
		if(!this.checkBounds(offset,2)) this.parentFile.getUShortAt(this.view.byteOffset + offset,byteOrder);
	}
	,getUByteAt: function(offset) {
		if(!this.checkBounds(offset,1)) return this.parentFile.getUByteAt(this.view.byteOffset + offset); else return 0;
	}
	,setUByteAt: function(offset,value) {
		if(!this.checkBounds(offset,1)) this.parentFile.setUByteAt(this.view.byteOffset + offset,value);
	}
	,getIntAt: function(offset,byteOrder) {
		if(!this.checkBounds(offset,4)) return this.parentFile.getIntAt(this.view.byteOffset + offset,byteOrder); else return 0;
	}
	,setIntAt: function(offset,value,byteOrder) {
		if(!this.checkBounds(offset,4)) this.parentFile.setIntAt(this.view.byteOffset + offset,value,byteOrder);
	}
	,getShortAt: function(offset,byteOrder) {
		if(!this.checkBounds(offset,2)) return this.parentFile.getShortAt(this.view.byteOffset + offset,byteOrder); else return 0;
	}
	,setShortAt: function(offset,value,byteOrder) {
		if(!this.checkBounds(offset,2)) this.parentFile.setShortAt(this.view.byteOffset + offset,value,byteOrder);
	}
	,getByteAt: function(offset) {
		if(!this.checkBounds(offset,1)) return this.parentFile.getByteAt(this.view.byteOffset + offset); else return 0;
	}
	,setByteAt: function(offset,value) {
		if(!this.checkBounds(offset,1)) this.parentFile.setByteAt(this.view.byteOffset + offset,value);
	}
	,getFloatAt: function(offset,byteOrder) {
		if(!this.checkBounds(offset,4)) return this.parentFile.getFloatAt(this.view.byteOffset + offset,byteOrder); else return 0;
	}
	,setFloatAt: function(offset,value,byteOrder) {
		if(!this.checkBounds(offset,4)) this.parentFile.setFloatAt(this.view.byteOffset + offset,value,byteOrder);
	}
	,getDoubleAt: function(offset,byteOrder) {
		if(!this.checkBounds(offset,8)) return this.parentFile.getDoubleAt(this.view.byteOffset + offset,byteOrder); else return 0;
	}
	,setDoubleAt: function(offset,value,byteOrder) {
		if(!this.checkBounds(offset,8)) this.parentFile.setDoubleAt(this.view.byteOffset + offset,value,byteOrder);
	}
};
var brian151_riff_Section = $hx_exports.brian151.riff.Section = function(src,offset,len,id) {
	this.view = new DataView(src,offset + 8,len);
	this.length = this.view.byteLength;
	this.realLength = this.length + 8;
	this.secID = id;
};
brian151_riff_Section.__name__ = true;
brian151_riff_Section.prototype = {
	get_length: function() {
		return this.length;
	}
	,get_realLength: function() {
		return this.realLength;
	}
	,get_view: function() {
		return this.view;
	}
	,get_ID: function() {
		return this.secID;
	}
};
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
brian151_Main.main();
})(typeof console != "undefined" ? console : {log:function(){}}, typeof window != "undefined" ? window : exports);
