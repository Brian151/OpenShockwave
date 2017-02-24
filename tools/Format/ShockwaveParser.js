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
		if (foundKeys) {
			this.parseKeyTable(keyOffset);
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
		//console.log((offset + 0x20).toString(16));
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
	console.log("keys @" + offset.toString(16));
	var dataOffset = (offset + 8 + 0xc);
	for (i = dataOffset; i < length i += 0xc) {
		var parentID = this.structParser.getLengthAt(i);
		var childID = this.structParser.getLengthAt(i + 4);
		var childSecIS = this.structParser.getFourCCAt(i + 8);
	}
}