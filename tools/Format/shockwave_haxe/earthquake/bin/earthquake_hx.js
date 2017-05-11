(function (console, $hx_exports) { "use strict";
var brian151 = $hx_exports.brian151 = $hx_exports.brian151 || {};
$hx_exports.brian151.earthquake = $hx_exports.brian151.earthquake || {};
$hx_exports.brian151.earthquake.filesystem = $hx_exports.brian151.earthquake.filesystem || {};
function $extend(from, fields) {
	function Inherit() {} Inherit.prototype = from; var proto = new Inherit();
	for (var name in fields) proto[name] = fields[name];
	if( fields.toString !== Object.prototype.toString ) proto.toString = fields.toString;
	return proto;
}
var brian151_earthquake_Cast = $hx_exports.brian151.earthquake.Cast = function() {
};
var brian151_earthquake_CastMember = $hx_exports.brian151.earthquake.CastMember = function() {
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
	}
};
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
	$hx_scope.brian151.riff.File.call(this,src);
	this.isProjector = false;
};
brian151_earthquake_filesystem_CompressedFile.__super__ = $hx_scope.brian151.riff.File;
brian151_earthquake_filesystem_CompressedFile.prototype = $extend($hx_scope.brian151.riff.File.prototype,{
	checkCast: function() {
		return false;
	}
	,setProjector: function() {
		this.isProjector = true;
	}
});
var brian151_earthquake_filesystem_DirectorFile = $hx_exports.brian151.earthquake.filesystem.DirectorFile = function(src) {
	$hx_scope.brian151.riff.File.call(this,src);
	this.isProjector = false;
};
brian151_earthquake_filesystem_DirectorFile.__super__ = $hx_scope.brian151.riff.File;
brian151_earthquake_filesystem_DirectorFile.prototype = $extend($hx_scope.brian151.riff.File.prototype,{
	checkCast: function() {
		return false;
	}
	,setProjector: function() {
		this.isProjector = true;
	}
	,findMap: function() {
		var mapIndexChunk = this.getSectionAt(12);
		var mapIndexHandler = new $hx_scope.brian151.riff.LinkedSectionHandler(mapIndexChunk,this);
		return mapIndexHandler.getUIntAt(8,2);
	}
	,parseMap: function(offset) {
		var mapChunk = this.getSectionAt(offset);
		var id = mapChunk.get_ID();
		if(id == "mmap") {
			var handler = new $hx_scope.brian151.riff.LinkedSectionHandler(mapChunk,this);
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
				var offset3 = handler.getUIntAt(offset2 + 8,2);
				if(id1 != "free") {
					this.ptrs1[i0] = offset3;
					i0++;
				}
				this.ptrs2[i] = offset3;
			}
		}
	}
});
var brian151_earthquake_filesystem_ProtectedFile = $hx_exports.brian151.earthquake.filesystem.ProtectedFile = function(src) {
	$hx_scope.brian151.riff.File.call(this,src);
	this.isProjector = false;
};
brian151_earthquake_filesystem_ProtectedFile.__super__ = $hx_scope.brian151.riff.File;
brian151_earthquake_filesystem_ProtectedFile.prototype = $extend($hx_scope.brian151.riff.File.prototype,{
	checkCast: function() {
		return false;
	}
	,setProjector: function() {
		this.isProjector = true;
	}
});
})(typeof console != "undefined" ? console : {log:function(){}}, typeof $hx_scope != "undefined" ? $hx_scope : $hx_scope = {});
