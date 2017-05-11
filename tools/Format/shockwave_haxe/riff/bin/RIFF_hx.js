(function (console, $hx_exports) { "use strict";
var brian151 = $hx_exports.brian151 = $hx_exports.brian151 || {};
$hx_exports.brian151.riff = $hx_exports.brian151.riff || {};
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
		var len = this.getUIntAt(offset,0);
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
		if(!byteOrder && !hasErrored) str.reverse();
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
var brian151_riff_Section = $hx_exports.brian151.riff.Section = function(src,offset,len,id) {
	this.view = new DataView(src,offset + 8,len);
	this.length = this.view.byteLength;
	this.realLength = this.length + 8;
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
var brian151_riff_SectionHandler = $hx_exports.brian151.riff.SectionHandler = function(src) {
	this.target = src;
	this.view = this.target.get_view();
};
brian151_riff_SectionHandler.__name__ = true;
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
