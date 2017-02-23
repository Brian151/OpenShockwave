var RIFFParser = function(data) {
	this.view = new DataView(data);
	this.formats = ["RIFF","RIFX","XFIR"];
	//ENDIANESS OF : fourCC , length, data
	//(not sure if right, probably isn't entirely)
	//B[ig] L[ittle]
	this.ends = [
		["L","L","L"],
		["B","B","B"],
		["L","L","B"],
	];
	this.format = 0;
	this.returnType = "binary";
}
RIFFParser.prototype.getChunkAt = function(offset,getForm) {
	var head = this.getFourCCAt(offset);
	var length = this.getLengthAt(offset + 4);
	console.log(head + " : 0x" + length.toString(16));
	//var data = this.getDataBytes(offset + 8,length);
	var data = [];
	if (getForm) {
		var type = this.getFourCCAt(offset += 8);
		console.log(type);
	}
	return [head,data];
}
RIFFParser.prototype.getFourCCAt = function(offset) {
	var off = offset || 0;
	var end = this.ends[this.format][0] == "L";
	var str = []
	var out = "";
	for (var i=0; i < 4; i++) {
		str.push(String.fromCharCode(this.view.getUint8(off + i)));
	}
	if (end) str.reverse();
	out = str.join("");
	return out;
}
RIFFParser.prototype.getLengthAt = function(offset) {
	var off = offset || 0;
	var end = this.ends[this.format][1] == "L";
	return this.view.getUint32(off,end);
}
RIFFParser.prototype.setFormat = function(f) {
	f = f || 0;
	if (f >= this.formats.length) f = (this.formats.length - 1);
	this.format = f;
}
RIFFParser.prototype.getDataBytes = function(offset,length) {
	var off = offset;
	var l = length;
	var out = [];
	for (var i=0; i < l; i++) {
		out.push(this.view.getUint8(off + i));
	}
	return out;
}