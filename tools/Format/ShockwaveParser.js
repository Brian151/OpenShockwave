var ShockwaveParser = function(data) {
	this.structParser = new RIFFParser(data);
	this.length = 0;
	this.map = [];
	this.castLib = [];
	this.castMemberLib = [];
	this.scriptLib = [];
}
ShockwaveParser.prototype.parse = function() {
	var head = this.structParser.getFourCCAt(0x00); //get main chunk
	this.structParser.setFormat(2); //XFIR
	this.length = this.structParser.getLengthAt(0x04);
	var mapIndexHead = this.structParser.getFourCCAt(0x0c);
	var mapOffset = 0;
	if (mapIndexHead == "imap") {
		mapOffset = this.structParser.getLengthAt(0x18);
		console.log("map @" + mapOffset.toString(16));
		this.parseMappingTable(mapOffset);
		var foundKeys = false;
		var keyOffset = 0;
		for (var i=0; i < this.map.length; i++) {
			var curr = this.map[i].tagName;
			if (curr == "KEY*") {
				foundKeys = true;
				keyOffset = this.map[i].instances[0][1];
				break;
			}
				
		}
		this.linkScripts();
		this.parseNameTables();
		if (foundKeys) {
			//this.parseKeyTable(keyOffset);
		} else {
			console.error("cannot locate the key table");
		}
	} else {
		console.error("cannot locate the mapping table!");
	}
}
ShockwaveParser.prototype.parseMappingTable = function(offset) {
	var head = this.structParser.getFourCCAt(offset);
	var length = this.structParser.getLengthAt(offset + 4);
	if (head == "mmap") {
		var i0 = 0; //full range num ID
		var i1 = 0; //limited range (ignore free) num ID
		var lookup = [];
		for (var i= (offset + 0x20); i < length; i+=20) {
			var id = this.structParser.getFourCCAt(i);
			var len = this.structParser.getLengthAt(i + 4);
			var off = this.structParser.getLengthAt(i + 8);
			var found = false;
			for (var i2 = 0; i2 < lookup.length; i2++) {
				var curr = lookup[i2];
				if (curr == id) {
					found = true;
					break;
				}
			}
			if (!found) {
				this.map.push({
					tagName : id,
					instances : []
				});
				lookup.push(id);
			}
			for (var i2=0; i2 < this.map.length; i2++) {
				var curr = this.map[i2];
				if (curr.tagName == id) {
					this.map[i2].instances.push([len,off,i0,i1]);
					break;
				}
			}
			i0++;
			if (id != "free")
				i1++;
		}
	}
}
ShockwaveParser.prototype.parseKeyTable = function(offset) {
	var head = this.structParser.getFourCCAt(offset)
	var length = this.structParser.getLengthAt(offset + 4);
	var max = offset + length;
	var total = this.structParser.getLengthAt(offset + 0xc);
	console.log("keys @" + offset.toString(16));
	var dataOffset = (offset + 8 + 0xc);
	var i0 = 0;
	var i1 = 0;
	var i3 = 0;
	var foundTags = [];
	for (var i = dataOffset; i < max; i += 0xc) {
		var childID = this.structParser.getLengthAt(i);
		var parentID = this.structParser.getLengthAt(i + 4);
		var childSecID = this.structParser.getFourCCAt(i + 8);
		if (i == dataOffset) {
			console.log("--=first key entry=--");
			console.log(parentID.toString(16));
			console.log(childID.toString(16));
			console.log(childSecID);
			console.log(this.doMapLookup(0,parentID))
			console.log(this.doMapLookup(1,childID))
			console.log("-end trace-");
		}
		//not always CASt...WHY?
		//also, still doesn't work fully
		var pIDStr = this.doMapLookup(0,parentID)[0];
		if (pIDStr == "CASt") {
			var temp = this.doCastMemberLookup(parentID);
			if (temp == -1)
				temp = this.addCastMember(this.doMapLookup(0,parentID));
			this.castMemberLib[temp].parts.push(this.doMapLookup(1,childID));
		}
	}
}
ShockwaveParser.prototype.doMapLookup = function(mode,id) {
	if (mode > 2) {
		mode = 2;
	} else if (mode < 0) {
		mode = 0;
	}
	//exclude free chunks
	if (mode == 0) {
		for (var i=0; i < this.map.length; i++) {
			var curr = this.map[i];
			if (curr.tagName != "free") {
				for (var i2=0; i2 < curr.instances.length; i2++) {
					var curr2 = curr.instances[i2][3];
					if (curr2 == id) {
						return [curr.tagName,curr.instances[i2]];
					}
				}
			}
		}
	}
	//include free chunks
	if (mode == 1) {
		for (var i=0; i < this.map.length; i++) {
			var curr = this.map[i];
			for (var i2=0; i2 < curr.instances.length; i2++) {
				var curr2 = curr.instances[i2][2];
				if (curr2 == id) {
					return [curr.tagName,curr.instances[i2]];
				}
			}
		}
	}
	//lookup by tag ID
	if (mode == 2) {
		for (var i=0; i < this.map.length; i++) {
			var curr = this.map[i];
			if (curr.tagName == id) {
				return [curr.tagName,curr.instances];
			}
		}
	}
	//default, return something suggesting error
	return ["@ERR",[0,0,0,0]];
}
ShockwaveParser.prototype.addCastMember = function(mapping) {
	var out = this.castMemberLib.length;
	this.castMemberLib.push({
		name : "",
		type : "Cast_Member",
		parts : [],
		mapping : mapping,
	});
	return out;
}
ShockwaveParser.prototype.doCastMemberLookup = function(id) {
	var out = -1;
	for (var i=0; i < this.castMemberLib.length; i++) {
		var curr = this.castMemberLib[i];
		if (curr.mapping[1][3] == id) {
			out = i;
			break;
		}
	}
	return out;
}
ShockwaveParser.prototype.linkScripts = function() {
	var scrCollects = this.doMapLookup(2,"LctX");
	var scrNames = this.doMapLookup(2,"Lnam");
	for (var i=0; i < scrCollects[1].length; i++) {
		var curr = scrCollects[1][i];
		var off = curr[1];
		var id = this.structParser.view.getUint32(off + 0x28);
		for (var i2 =0; i2 < scrNames[1].length; i2++) {
			var curr2 = scrNames[1][i2];
			var id2 = curr2[2];
			if (id == id2) {
				this.addScriptCollection(off,curr2[1])
				break;
			}
		}
	}
	this.linkByteCode();
}
ShockwaveParser.prototype.addScriptCollection = function(off,off2) {
	this.scriptLib.push ({
		offset : off,
		offsetName : off2,
		scripts : [],
		names : [],
		dbg : [off.toString(16),off2.toString(16)]
	});
}
ShockwaveParser.prototype.parseNameTables = function() {
	for (var i=0; i < this.scriptLib.length; i++) {
		var curr = this.scriptLib[i];
		var off = curr.offsetName;
		var l = this.structParser.view.getUint32(off + 0x10);
		var l2 = this.structParser.view.getUint32(off + 0x14);
		var o2 = this.structParser.view.getUint16(off + 0x18);
		var nameCount = this.structParser.view.getUint16(off + 0x1A);
		var pointer = off + 8 + o2;
		for (var i2 = 0; i2 < nameCount; i2++) {
			var nameLen = this.structParser.view.getUint8(pointer);
			/*if (i == 0 && i2 < 10) {
				console.log("nameLen : " + nameLen.toString(16));
				console.log(pointer.toString(16));
			}*/
			var name = this.parseStringASCII(pointer + 1,nameLen);
			this.scriptLib[i].names.push(name);
			pointer += nameLen + 1;
		}
	}
}
ShockwaveParser.prototype.parseStringASCII = function(offset,length) {
	var out = "";
	for (var i=0; i < length; i++) {
		out += String.fromCharCode(this.structParser.view.getUint8(offset + i));
	}
	return out;
}
ShockwaveParser.prototype.linkByteCode = function() {
	var bytecodes = this.doMapLookup(2,"Lscr")
	console.log(bytecodes.length);
	var hasfound = false;
	for (var i=0; i < this.scriptLib.length; i++) {
		var off = this.scriptLib[i].offset;
		var entryCount = this.structParser.view.getUint32(off + 0x10);
		var entryCount2 = this.structParser.view.getUint32(off + 0x14);
		var off2 = this.structParser.view.getUint16(off + 0x18);
		for (var i2=0; i2 < entryCount; i2++) {
			var baseOffset = off + 8 + off2 + (i2 * 12);
			var used = this.structParser.view.getUint16(baseOffset + 8);
			if (used == 4) {
				var id = this.structParser.view.getUint32(baseOffset + 4);
				if (!hasfound) {
					hasfound = true;
					console.log(i);
					console.log("LctX offset : " + off.toString(16));
					console.log("script id : " + id.toString(16));
					console.log("script entry offset : " + off2.toString(16));
					console.log(
						"raw id hex : " + " " +
						this.structParser.view.getUint8(baseOffset + 4).toString(16) + " " +
						this.structParser.view.getUint8(baseOffset + 5).toString(16) + " " +
						this.structParser.view.getUint8(baseOffset + 6).toString(16) + " " +
						this.structParser.view.getUint8(baseOffset + 7).toString(16)
					);
				}
				for (var i3=0; i3 < bytecodes[1].length; i3++) {
					var curr = bytecodes[1][i3];
					if (curr[2] == id) {
						this.scriptLib[i].scripts.push({
							offset : curr[1]
						});
						break;
					}
				}
			}
		}
		
	}
}