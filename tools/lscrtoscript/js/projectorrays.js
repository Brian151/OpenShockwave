/* Utilities */

function el(tagName, attributes, children) {
	var e = document.createElement(tagName);
	function addChild(child) {
		if (Array.isArray(child)) {
			for (var i = 0, l = child.length; i < l; i++) {
				addChild(child[i]);
			}
		} else if (child != null) {
			if (!(child instanceof Node)) {
				child = new Text(child);
			}
			e.appendChild(child);
		}
	}

	if (attributes) {
		for (var attr in attributes) {
			e.setAttribute(attr, attributes[attr]);
		}
	}
	if (children != null) {
		addChild(children);
	}
	return e;
}

function formatBytes(num) {
	var hex = num.toString(16).toUpperCase();
	if (hex.length % 2 === 1) hex = '0' + hex;
	if (hex.length === 2) return hex;
	return hex.match(/.{2}/g).join(' ');
}

/* Error Handling */

InvalidDirectorFileError = function(message) {
	this.name = "InvalidDirectorFileError";
	this.message = message;
	this.stack = (new Error()).stack;
}
InvalidDirectorFileError.prototype = new Error;

PathTooNewError = function(message) {
	this.name = "PathTooNewError";
	this.message = message;
	this.stack = (new Error()).stack;
}
PathTooNewError.prototype = new Error;

/* DataStream */

DataStream.prototype.readStringEndianness = function() {
	var result = this.readString(4);
	if (this.endianness) result = result.split("").reverse().join("");
	return result;
}

/* OpenShockwaveMovie */

function OpenShockwaveMovie(file) {
	this.chunkArray = null;
	this.chunkPointers = null;
	this.differenceImap = null;

	if (file != null) {
		this.readFile(file);
	}
	// in the case that multiple files are chosen we can't draw more than one
	// however, if the user wants to convert files we can do more than one at once
}

OpenShockwaveMovie.prototype.readFile = function(file) {
	if (loggingEnabled) console.log("Constructing Open Shockwave Movie");

	this.chunkArray = [];
	this.chunkArray.RIFX = [];
	this.chunkArray.imap = [];
	this.chunkArray.mmap = [];

	var reader = new FileReader();
	reader.onload = e => {
			if (loggingEnabled) console.log("ShockwaveMovieReader onLoad");
			var dataStream = new DataStream(e.target.result);
			dataStream.endianness = false; // we set this properly when we create the RIFX chunk
			this.lookupMmap(dataStream);
	};
	reader.readAsArrayBuffer(file);
};

// at the beginning of the file, we need to break some of the typical rules. We don't know names, lengths and offsets yet.
OpenShockwaveMovie.prototype.lookupMmap = function(DirectorFileDataStream) {
	if (loggingEnabled) console.log("Looking Up mmap");

	// valid length is undefined because we have not yet reached mmap
	// however, it will be filled automatically in chunk's constructor
	this.chunkPointers = [];
	this.chunkArray.RIFX[0] = this.readChunk(DirectorFileDataStream, "RIFX");
	// we can only open DIR or DXR
	// we'll read OpenShockwaveMovie from DirectorFileDataStream because OpenShockwaveMovie is an exception to the normal rules
	if (this.chunkArray.RIFX[0].codec != "MV93") {
		throw PathTooNewError("Codec " + this.chunkArray.RIFX[0].codec + " unsupported.");
	}
	// the next chunk should be imap
	// this HAS to be DirectorFileDataStream for the OFFSET check to be correct
	// we will continue to use it because in this implementation RIFX doesn't contain it
	this.chunkArray.imap[0] = this.readChunk(DirectorFileDataStream, "imap", undefined, 12);
	this.differenceImap = 0;
	// sanitize mmaps
	if (this.chunkArray.imap[0].memoryMapArray[0] - 0x2C) {
		this.differenceImap = this.chunkArray.imap[0].memoryMapArray[0] - 0x2C;
		for(var i=0,len=this.chunkArray.imap[0].memoryMapArray.length;i<len;i++) {
			this.chunkArray.imap[0].memoryMapArray[i] -= this.differenceImap;
		}
	}
	// go to where imap says mmap is (ignoring the possibility of multiple mmaps for now)
	DirectorFileDataStream.seek(this.chunkArray.imap[0].memoryMapArray[0]);
	// interpret the numbers in the mmap - but don't actually find the chunks in it yet
	this.chunkArray.mmap.push(this.readChunk(DirectorFileDataStream, "mmap", undefined, this.chunkArray.imap[0].memoryMapArray[0]));
	// add chunks in the mmap to the chunkArray HERE
	// make sure to account for chunks with existing names, lengths and offsets
	DirectorFileDataStream.position = 0;
	for(var i=0,len=this.chunkArray.mmap[0].mapArray.length;i<len;i++) {
		if (this.chunkArray.mmap[0].mapArray[i].name != "mmap") {
			DirectorFileDataStream.seek(this.chunkArray.mmap[0].mapArray[i].offset);
			if (!this.chunkArray[this.chunkArray.mmap[0].mapArray[i].name]) {
				this.chunkArray[this.chunkArray.mmap[0].mapArray[i].name] = [];
			}
			this.chunkArray[this.chunkArray.mmap[0].mapArray[i].name].push(this.readChunk(DirectorFileDataStream, this.chunkArray.mmap[0].mapArray[i].name, this.chunkArray.mmap[0].mapArray[i].len, this.chunkArray.mmap[0].mapArray[i].offset, this.chunkArray.mmap[0].mapArray[i].padding, this.chunkArray.mmap[0].mapArray[i].unknown0, this.chunkArray.mmap[0].mapArray[i].link));
			this.chunkPointers.push(this.chunkArray[this.chunkArray.mmap[0].mapArray[i].name]);
		} else {
			DirectorFileDataStream.position += this.chunkArray.mmap[0].len + 8;
		}
	}
	// uncomment for a demo
	if (!this.chunkArray.Lscr) {
	} else {
		var container = parent.right.document.getElementById("Lscrtables");
		for (var i = 0, l = this.chunkArray.Lscr.length; i < l; i++) {
			container.appendChild(this.chunkArray.Lscr[i].toHTML());
			if (i < l - 1) container.appendChild(el('hr'));
		}
	}
}

OpenShockwaveMovie.prototype.readChunk = function(mainDataStream, name, len, offset, padding, unknown0, link) {
	if (loggingEnabled) console.log("Constructing Chunk: " + name);

	// check if this is the chunk we are expecting
	// we're using this instead of readString because we need to respect endianness
	var validName = mainDataStream.readStringEndianness(4);
	if (name == "RIFX") {
		//if (validName.substring(0, 2) == "MZ") {
			// handle Projector HERE
		//}
		if (validName == "XFIR") {
			mainDataStream.endianness = true;
			validName = "RIFX";
		}
	}
	// check if it has the length the mmap table specifies
	var validLen = mainDataStream.readUint32();
	// the offset is checked against, well, our offset
	var validOffset = mainDataStream.position - 8;
	// if we don't know what to expect, grab the name of the chunk
	if (name == null) {
		name = validName;
	}
	// ignore validation if we have not yet reached the mmap section
	if (len == null) {
		len = validLen;
	}
	// use our current offset if we have not yet reached the mmap section
	if (offset == null) {
		offset = validOffset;
	}
	// padding can't be checked, so let's give it a default value if we don't yet know it
	if (padding == null) {
		// padding is usually zero
		if (name != "free" && name != "junk") {
			padding = 0;
		} else {
			padding = 12;
		}
	}
	if (unknown0 == null) {
		unknown0 = undefined;
	}
	if (link == null) {
		link = undefined;
	}

	// validate chunk
	if (name != validName || len != validLen || offset != validOffset) {
		throw new InvalidDirectorFileError("At offset " + validOffset + ", expected '" + name + "' chunk with a length of " + len + " and offset of " + offset + " but found an '" + validName + "' chunk with a length of " + validLen + ".");
	}

	if (name != "RIFX") {
	} else {
		// we're going to pretend RIFX is only 12 bytes long
		// this is because offsets are relative to the beginning of the file
		// whereas everywhere else they're relative to chunk start
		len = 4;
	}

	// copy the contents of the chunk to a new DataStream (minus name/length as that's not what offsets are usually relative to)
	var chunkDataStream = new DataStream();
	chunkDataStream.endianness = mainDataStream.endianness;
	chunkDataStream.writeUint8Array(mainDataStream.mapUint8Array(len));
	chunkDataStream.seek(0);

	var result;
	switch (name) {
		case "RIFX":
			result = new Meta(this);
			result.read(chunkDataStream);
			break;
		case "imap":
			result = new IdealizedMap(this);
			result.read(chunkDataStream);
			break;
		case "mmap":
			result = new MemoryMap(this);
			result.read(chunkDataStream);
			break;
		case "Lscr":
			result = new LingoScript(this);
			result.read(chunkDataStream);
			break;
	}
	return result;
}

/* Meta */

function Meta(main) {
	this.main = main;

	this.codec = null;
}

Meta.prototype.read = function(dataStream) {
	this.codec = dataStream.readStringEndianness(4);
}

/* IdealizedMap */

function IdealizedMap(main) {
	this.main = main;

	this.memoryMapCount = null;
	this.memoryMapArray = null;
}

IdealizedMap.prototype.read = function(dataStream) {
	this.memoryMapCount = dataStream.readUint32();
	this.memoryMapArray = dataStream.readUint32Array(this.memoryMapCount);
}

/* MemoryMap */

function MemoryMap(main) {
	this.main = main;

	this.unknown0 = null;
	this.unknown1 = null;
	this.chunkCountMax = null;
	this.chunkCountUsed = null;
	this.junkPointer = null;
	this.unknown2 = null;
	this.freePointer = null;
	this.mapArray = null;
}

MemoryMap.prototype.read = function(dataStream) {
	this.unknown0 = dataStream.readUint16();
	this.unknown1 = dataStream.readUint16();
	// possible one of the unknown mmap entries determines why an unused item is there?
	// it also seems code comments can be inserted after mmap after chunkCount is over, it may warrant investigation
	this.chunkCountMax = dataStream.readInt32();
	this.chunkCountUsed = dataStream.readInt32();
	this.junkPointer = dataStream.readInt32();
	this.unknown2 = dataStream.readInt32();
	this.freePointer = dataStream.readInt32();
	this.mapArray = [];
	// seems chunkCountUsed is used here, so what is chunkCount for?
	// EDIT: chunkCountMax is maximum allowed chunks before new mmap created!
	var entry;
	for(var i=0,len=this.chunkCountUsed;i<len;i++) {
		// don't actually generate new chunk objects here, just read in data
		var entry = new MemoryMapEntry(this);
		entry.read(dataStream);
		// we don't care about free or junk chunks
		if (entry.name !== 'free' && entry.name !== 'junk') {
			this.mapArray.push(entry);
		}
	}
}

/* MemoryMapEntry */

function MemoryMapEntry(map) {
	this.map = map;
}

MemoryMapEntry.prototype.read = function(dataStream) {
	this.name = dataStream.readStringEndianness(4);
	this.len = dataStream.readUint32();
	this.offset = dataStream.readUint32();
	this.offset -= this.map.main.differenceImap;
	this.padding = dataStream.readInt16();
	this.unknown0 = dataStream.readInt16();
	this.link = dataStream.readInt32();
};

/* LingoScript */

function LingoScript(main) {
	this.main = main;

	this.totalLength = null;
	this.totalLength2 = null;
	this.headerLength = null;
	this.scriptNumber = null;
	this.scriptBehaviour = null;
	this.map = null;
	this.handlers = null;
	this.literals = null;
}

LingoScript.prototype.read = function(dataStream) {
	var i, l, handler, literal;

	dataStream.seek(8);
	// Lingo scripts are always big endian regardless of file endianness
	dataStream.endianness = false;
	this.totalLength = dataStream.readUint32();
	this.totalLength2 = dataStream.readUint32();
	this.headerLength = dataStream.readUint16();
	this.scriptNumber = dataStream.readUint16();
	dataStream.seek(38);
	this.scriptBehaviour = dataStream.readUint32();
	dataStream.seek(50);
	this.map = {};
	this.map.handlervectors = new LscrChunk(dataStream.readUint16(), dataStream.readUint32(), dataStream.readUint32());
	this.map.properties = new LscrChunk(dataStream.readUint16(), dataStream.readUint32());
	this.map.globals = new LscrChunk(dataStream.readUint16(), dataStream.readUint32());
	this.map.handlers = new LscrChunk(dataStream.readUint16(), dataStream.readUint32());
	this.map.literals = new LscrChunk(dataStream.readUint16(), dataStream.readUint32());
	this.map.literalsdata = new LscrChunk(dataStream.readUint32(), dataStream.readUint32());

	dataStream.seek(this.map.handlers.offset);
	this.handlers = [];
	for (i = 0, l = this.map.handlers.len; i < l; i++) {
		handler = new Handler(this);
		handler.readRecord(dataStream);
		this.handlers[i] = handler;
	}
	for (i = 0, l = this.handlers.length; i < l; i++) {
		this.handlers[i].readBytecode(dataStream);
	}

	dataStream.seek(this.map.literals.offset);
	this.literals = [];
	for (i = 0, l = this.map.literals.len; i < l; i++) {
		literal = new Literal(this);
		literal.readRecord(dataStream);
		this.literals[i] = literal;
	}
	for (i = 0, l = this.literals.length; i < l; i++) {
		this.literals[i].readValue(dataStream, this.map.literalsdata.offset);
	}
}

LingoScript.prototype.stack = [];
//this.LingoScript.prototype.stack.push(this.val);
//this.val = this.LingoScript.prototype.stack.pop();

LingoScript.prototype.toHTML = function() {
	var container = container, table, i, l;

	container = el('section');
	container.appendChild(el('h2', null, 'Script ' + this.main.chunkArray.Lscr.indexOf(this)));
	if (this.literals.length > 0) {
		container.appendChild(el('h3', null, 'Literals'));
		table = el('table', null, [
			el('tr', null, [
				el('th', null, 'index'),
				el('th', null, 'type'),
				el('th', null, 'value')
			])
		]);
		for (i = 0, l = this.literals.length; i < l; i++) {
			table.appendChild(this.literals[i].toHTML());
		}
		container.appendChild(table);
	}
	if (this.handlers.length > 0) {
		container.appendChild(el('h3', null, 'Handlers'));
		for (i = 0, l = this.handlers.length; i < l; i++) {
			container.appendChild(this.handlers[i].toHTML());
		}
	}
	return container;
}

/* LscrChunk */

function LscrChunk(len, offset, flags) {
	this.len = len;
	this.offset = offset;
	if (flags != null) {
		this.flags = flags;
	}
}

/* NameValuePair */

function NameValuePair(val, name) {
	if (val != null) {
		this.val = val;
	} else {
		this.val = 0;
	}
	if (name != null) {
		this.name = name;
	} else {
		this.name = this.val;
	}
}

/* Handler */

function Handler(script) {
	this.script = script;
	this.bytecodeArray = [];

	this.name = null;
	this.handlervectorpos = null;
	this.compiledlen = null;
	this.compiledoffset = null;
	this.argumentcount = null;
	this.argumentoffset = null;
	this.localscount = null;
	this.localsoffset = null;
	this.unknown0count = null;
	this.unknown0offset = null;
	this.unknown1 = null;
	this.unknown2 = null;
	// unknown3 doesn't seem to exist...
	// this.unknown3 = null;
	this.linecount = null;
	this.lineoffset = null;
	this.stackheight = null;
}

Handler.prototype.readRecord = function(dataStream) {
	this.name = dataStream.readUint16();
	this.handlervectorpos = dataStream.readUint16();
	this.compiledlen = dataStream.readUint32();
	this.compiledoffset = dataStream.readUint32();
	this.argumentcount = dataStream.readUint16();
	this.argumentoffset = dataStream.readUint32();
	this.localscount = dataStream.readUint16();
	this.localsoffset = dataStream.readUint32();
	this.unknown0count = dataStream.readUint16();
	this.unknown0offset = dataStream.readUint32();
	this.unknown1 = dataStream.readUint32();
	this.unknown2 = dataStream.readUint16();
	// this.unknown3 = dataStream.readUint16();
	this.linecount = dataStream.readUint16();
	this.lineoffset = dataStream.readUint32();
	// yet to implement
	this.stackheight = dataStream.readUint32();
}

Handler.prototype.readBytecode = function(dataStream) {
	dataStream.seek(this.compiledoffset);
	this.bytecodeArray = [];
	// seeks to the offset of the handlers. Currently only grabs the first handler in the script.
	// loop while there's still more code left
	var op, obj = null, pos = null;
	while (dataStream.position < this.compiledoffset + this.compiledlen) {
		var op = dataStream.readUint8();
		// instructions can be one, two or three bytes
		if (op >= 192) {
			obj = dataStream.readUint24();
		} else if (op >= 128) {
			obj = dataStream.readUint16();
		} else if (op >= 64) {
			obj = dataStream.readUint8();
		}
		// read the first byte to convert to an opcode
		pos = new Bytecode(this, op, obj);
		this.bytecodeArray.push(pos);
	}
}

Handler.prototype.toHTML = function() {
	var fragment = document.createDocumentFragment();
	fragment.appendChild(el('h4', null, this.script.handlers.indexOf(this)));
	var table = el('table', null, [
		el('tr', null, [
			el('th', null, 'bytecode'),
			el('th', null, 'opcode'),
			el('th', null, 'pseudocode')
		])
	]);
	var translation;
	for (var i = 0, l = this.bytecodeArray.length; i < l; i++) {
		translation = this.bytecodeArray[i].translate();
		table.appendChild(el('tr', null, [
			el('td', null, formatBytes(this.bytecodeArray[i].val) + "" + (this.bytecodeArray[i].obj !== null ? " " + formatBytes(this.bytecodeArray[i].obj) : "")),
			el('td', null, translation[0]),
			el('td', null, translation[1])
		]));
	}
	fragment.appendChild(table);
	return fragment;
}

/* Literal */

function Literal(script) {
	this.script = script;

	this.type = null;
	this.offset = null;
	this.length = null;
	this.value = null;
}

Literal.prototype.readRecord = function(dataStream) {
	this.type = dataStream.readUint32();
	this.offset = dataStream.readUint32();
}

Literal.prototype.readValue = function(dataStream, literalsOffset) {
	dataStream.seek(literalsOffset + this.offset);
	this.length = dataStream.readUint32();
	if (this.type === 1) {
		this.value = dataStream.readString(this.length - 1); // minus null terminator
	} else if (this.type === 9) {
		this.value = dataStream.readFloat32();
	}
}

Literal.prototype.toHTML = function() {
	return el('tr', null, [
		el('td', null, this.script.literals.indexOf(this)),
		el('td', null, this.type === 1 ? 'string' : this.type === 9 ? 'double' : '?'),
		el('td', null, this.value)
	]);
}

/* Bytecode */	

function Bytecode(handler, val, obj) {
	if (val != null) {
		this.val = val;
	} else {
		this.val = 0;
	}
	if (obj != null) {
		this.obj = obj;
	} else {
		this.obj = null;
	}
	this.handler = handler;
}

Bytecode.prototype.operate11 = function(val) {
	var opcode, operator, result, pseudocode = '';
	var x = LingoScript.prototype.stack.pop();
	switch (val) {
		case 0x9:
			opcode = "inv";
			operator = "-";
			result = -x.val;
			break;
		case 0x14:
			opcode = "not";
			operator = "!";
			result = !x.val;
	}
	pseudocode = "projectorrraystemp_" + operator + "" + x.name + " = (" + operator + "" + x.name + ")";
	LingoScript.prototype.stack.push(new NameValuePair(result), "projectorrraystemp_" + operator + "" + x.name + "");
	return [opcode.toUpperCase(), pseudocode];
}

Bytecode.prototype.operate21 = function(val) {
	var opcode, operator, result, pseudocode = '';
	var x = LingoScript.prototype.stack.pop();
	var y = LingoScript.prototype.stack.pop();
	switch (val) {
		case 0x4:
			opcode = "mul";
			operator = "*";
			result = x.val * y.val;
			break;
		case 0x5:
			opcode = "add";
			operator = "+";
			result = (x.val * 1) + (y.val * 1);
			break;
		case 0x6:
			opcode = "sub";
			operator = "-";
			result = x.val - y.val;
			break;
		case 0x7:
			opcode = "div";
			operator = "/";
			result = x.val / y.val;
			break;
		case 0x8:
			opcode = "mod";
			operator = "mod";
			result = x.val % y.val;
		case 0xa:
			opcode = "joinstr";
			operator = "&";
			result = x.val.toString() + y.val.toString();
			break;
		case 0xb:
			opcode = "joinpadstr";
			operator = "&&";
			result = x.val.toString() + " " + y.val.toString();
			break;
		case 0xc:
			opcode = "lt";
			operator = "<";
			result = x.val < y.val;
			break;
		case 0xd:
			opcode = "lteq";
			operator = "<=";
			result = x.val <= y.val;
			break;
		case 0xe:
			opcode = "nteq";
			operator = "!=";
			result = x.val != y.val;
			break;
		case 0xf:
			opcode = "eq";
			operator = "==";
			result = x.val == y.val;
			break;
		case 0x10:
			opcode = "gt";
			operator = ">";
			result = x.val > y.val;
			break;
		case 0x11:
			opcode = "gteq";
			operator = ">=";
			result = x.val >= y.val;
			break;
		case 0x12:
			opcode = "and";
			operator = "and";
			result = x.val && y.val;
			break;
		case 0x13:
			opcode = "or";
			operator = "or";
			result = x.val || y.val;
			break;
		case 0x15:
			opcode = "containsstr";
			operator = "contains";
			result = ~x.val.indexOf(y.val);
			break;
		case 0x16:
			opcode = "contains0str";
			operator = "starts";
			result = !x.val.indexOf(y.val);
	}
	pseudocode = "projectorrraystemp_" + x.name + "" + operator + "" + y.name + " = (" + x.name + " " + operator + " " + y.name + ")";
	LingoScript.prototype.stack.push(new NameValuePair(result, "projectorrraystemp_" + x.name + "" + pseudocode + "" + y.name + ""));
	return [opcode.toUpperCase(), pseudocode];
}

Bytecode.prototype.translate = function() {
	LingoScript.prototype.stack = [];
	if (loggingEnabled) console.log("Translate Bytecode: " + bytecode);
	var opcode = "";
	var pseudocode = "";
	// see the documentation for notes on these opcodes
	switch (this.val) {
		// TODO: copy the comments from OP.txt into the code for a quicker reference
		/* Single Byte Instructions */
		case 0x1:
			opcode = "ret";
			pseudocode = "exit";
			break;
		case 0x3:
			opcode = "pushint0";
			LingoScript.prototype.stack.push(new NameValuePair(0));
			break;
		case 0x4:
		case 0x5:
		case 0x6:
		case 0x7:
		case 0x8:
		case 0xa:
		case 0xb:
		case 0xc:
		case 0xd:
		case 0xe:
		case 0xf:
		case 0x10:
		case 0x11:
		case 0x12:
		case 0x13:
		case 0x15:
		case 0x16:
			return this.operate21(this.val);
			break;
		case 0x9:
		case 0x14:
			return this.operate11(this.val);
			break;
		case 0x17:
			opcode = "splitstr";
			(() => {
				var firstchar = LingoScript.prototype.stack.pop();
				var lastchar = LingoScript.prototype.stack.pop();
				var firstchar = LingoScript.prototype.stack.pop();
				var firstword = LingoScript.prototype.stack.pop();
				var lastword = LingoScript.prototype.stack.pop();
				var firstitem = LingoScript.prototype.stack.pop();
				var lastitem = LingoScript.prototype.stack.pop();
				var firstline = LingoScript.prototype.stack.pop();
				var lastline = LingoScript.prototype.stack.pop();
				var strsplit = LingoScript.prototype.stack.pop();
				// lazy
				LingoScript.prototype.stack.push(new NameValuePair(strsplit));
				pseudocode = "char " + firstchar + " of " + lastchar;
			})();
			break;
		case 0x18:
			opcode = "lightstr";
			(() => {
				var firstchar = LingoScript.prototype.stack.pop();
				var lastchar = LingoScript.prototype.stack.pop();
				var firstchar = LingoScript.prototype.stack.pop();
				var firstword = LingoScript.prototype.stack.pop();
				var lastword = LingoScript.prototype.stack.pop();
				var firstitem = LingoScript.prototype.stack.pop();
				var lastitem = LingoScript.prototype.stack.pop();
				var firstline = LingoScript.prototype.stack.pop();
				var lastline = LingoScript.prototype.stack.pop();
				var strsplit = LingoScript.prototype.stack.pop();
				// lazy
				LingoScript.prototype.stack.push(new NameValuePair(strsplit));
				pseudocode = "hilite " + firstchar + " of " + lastchar;
			})();
			break;
		case 0x19:
			opcode = "ontospr";
			(() => {
				var firstspr = LingoScript.prototype.stack.pop();
				var secondspr = LingoScript.prototype.stack.pop();
				// lazy
				LingoScript.prototype.stack.push(new NameValuePair(0));
				pseudocode = "sprite " + firstspr + " intersects " + secondspr;
			})();
			break;
		case 0x1a:
			opcode = "intospr";
			(() => {
				var firstspr = LingoScript.prototype.stack.pop();
				var secondspr = LingoScript.prototype.stack.pop();
				// lazy
				LingoScript.prototype.stack.push(new NameValuePair(0));
				pseudocode = "sprite " + firstspr + " within " + secondspr;
			})();
			break;
		case 0x1b:
			opcode = "caststr";
			LingoScript.prototype.stack.push(LingoScript.prototype.stack.pop());
			pseudocode = "(field 1)";
			break;
		case 0x1c:
			opcode = "startobj";
			LingoScript.prototype.stack.pop();
			pseudocode = "tell obj to go to frame x";
			break;
		case 0x1d:
			opcode = "stopobj";
			pseudocode = "tell obj to go to frame x";
			break;
		case 0x1e:
			opcode = "wraplist";
			LingoScript.prototype.stack.push(LingoScript.prototype.stack.pop());
			break; // NAME NOT CERTAINLY SET IN STONE JUST YET...
		case 0x1f:
			opcode = "newproplist";
			LingoScript.prototype.stack.push(LingoScript.prototype.stack.pop());
			break;
		/* Multi - Byte Instructions */
		/*
			To-do: 
			handle special cases like getting names from name table,
			or opcodes that determine context through other means
			than their operands.
		*/
		case 0x41:
			opcode = "pushbyte";
			LingoScript.prototype.stack.push(new NameValuePair(this.obj));
			break;
		case 0x81:
			opcode = "pushshort";
			LingoScript.prototype.stack.push(new NameValuePair(this.obj));
			break;
		case 0xc1:
			opcode = "pushint24";
			LingoScript.prototype.stack.push(new NameValuePair(this.obj));
			break;
		case 0x42:
		case 0x82:
		case 0xc2:
			opcode = "newarglist";
			(obj => {
				var args = LingoScript.prototype.stack.splice(LingoScript.prototype.stack.length - obj, obj).reverse();
				// we now have nameValuePair inside of
				LingoScript.prototype.stack.push(new NameValuePair(args));
				// pseudocode is "silent," this is just to sort out the stack
			})(this.obj);
			break;
		case 0x43:
		case 0x83:
		case 0xc3:
			opcode = "newlist";
			break;
		case 0x44:
		case 0x84:
		case 0xc4:
			opcode = "push";
			LingoScript.prototype.stack.push(new NameValuePair(this.obj));
			break; 
			/* 
				likely to be re-named to:
				pushstring
				pushint
				pushfloat,
				based on the type of constant record referenced by this instruction
			*/
		case 0x45:
		case 0x85:
		case 0xc5:
			opcode = "pushsymb";
			LingoScript.prototype.stack.push(new NameValuePair(this.obj));
			break;
		/*
		case 0x46:
		case 0x86:
		case 0xc6:
			opcode = "nop"; // POSSIBLY RELATED TO NEWARGLIST
			break;
		case 0x47:
		case 0x87:
		case 0xc7:
			opcode = "nop";
			break;
		case 0x48:
		case 0x88:
		case 0xc8:
			opcode = "nop";
			break;
		*/
		case 0x49:
			opcode = "push_global";
			LingoScript.prototype.stack.push(new NameValuePair(this.obj));
			break;
		/*
		case 0x4a:
		case 0x8a:
		case 0xca:
			opcode = "nop";
			break;
		*/
		case 0x4b:
		case 0x8b:
		case 0xcb:
			opcode = "pushparams";
			LingoScript.prototype.stack.push(new NameValuePair(this.obj));
			break;
		case 0x4c:
		case 0x8c:
		case 0xcc:
			opcode = "push_local";
			LingoScript.prototype.stack.push(new NameValuePair(this.obj));
			break;
		/*
		case 0x4d:
		case 0x8d:
		case 0xcd:
			opcode = "nop";
			break;
		case 0x4e:
		case 0x8e:
		case 0xce:
			opcode = "nop";
			break;
		*/
		case 0x4f:
		case 0x8f:
		case 0xcf:
			opcode = "pop_global";
			(obj => {
				var popped = LingoScript.prototype.stack.pop();
				var poppedstring = popped.val;
				// go to Lnam and set that global
				pseudocode = poppedstring + " = " + obj;
			})(this.obj);
			break;
		/*
		case 0x50:
		case 0x90
		case 0xd0
			opcode = "nop";
			break;
		case 0x51:
		case 0x91:
		case 0xd1:
			opcode = "nop";
			break;
		*/
		case 0x52:
		case 0x92:
		case 0xd2:
			opcode = "pop_local";
			(obj => {
				var popped = LingoScript.prototype.stack.pop();
				var poppedstring = popped.val;
				pseudocode = poppedstring + " = " + obj;
			})(this.obj);
			break;
		case 0x53:
		case 0x93:
		case 0xd3:
			opcode = "jmp";
			// do something
			break;
		case 0x54:
		case 0x94:
		case 0xd4:
			opcode = "endrepeat";
			pseudocode = "end repeat";
			break;
		case 0x55:
		case 0x95:
		case 0xd5:
			opcode = "iftrue";
			pseudocode = "if (" + this.obj + ")";
			break;
		case 0x56:
		case 0x96:
		case 0xd6:
			opcode = "call_local";
			(obj => {
				var argslist = LingoScript.prototype.stack.pop();
				var argsliststring = "";
				for (var i=0,len=argslist.val.length;i<len;i++) {
					argsliststring += argslist.val[i].val;
					if (i < len - 1) {
						argsliststring += ", ";
					}
				}
				pseudocode = obj + "(" + argsliststring + ")";
			})(this.obj);
			break;
		case 0x57:
		case 0x97:
		case 0xd7:
			opcode = "call_external";
			(obj => {
				var argslist = LingoScript.prototype.stack.pop();
				var argsliststring = "";
				for (var i=0,len=argslist.val.length;i<len;i++) {
					argsliststring += argslist.val[i].val;
					if (i < len - 1) {
						argsliststring += ", ";
					}
				}
				pseudocode = obj + "(" + argsliststring + ")";
			})(this.obj);
			break;
		case 0x58:
		case 0x98:
		case 0xd8:
			opcode = "callobj";
			(() => {
				var argslist = LingoScript.prototype.stack.pop();
				var poppedobject = LingoScript.prototype.stack.pop();
				var argsliststring = "";
				for (var i=0,len=argslist.val.length;i<len;i++) {
					argsliststring += argslist.val[i].val;
					if (i < len - 1) {
						argsliststring += ", ";
					}
				}
				pseudocode = poppedobject.obj + "(" + argsliststring + ")";
			})();
			break;
		case 0x59:
			opcode = "op_59xx";
			LingoScript.prototype.stack.pop();
			break; //TEMP NAME
		/*
		case 0x5a:
		case 0x9a:
		case 0xda:
			opcode = "nop";
			break;
		*/
		case 0x5b:
		case 0x9b:
		case 0xdb:
			opcode = "op_5bxx";
			LingoScript.prototype.stack.pop();
			break; //TEMP NAME
		case 0x5c:
		case 0x9c:
		case 0xdc:
			opcode = "get";
			LingoScript.prototype.stack.pop();
			if (this.val >= 0x0C) {
				LingoScript.prototype.stack.pop();
			}
			LingoScript.prototype.stack.push(new NameValuePair("TODO"));
			break; // needs values from stack to determine what it's getting
				   // that said, dissassembly of this instruction is not yet complete
		case 0x5d:
		case 0x9d:
		case 0xdd:
			opcode = "set";
			(val => {
				// make a switch later
				LingoScript.prototype.stack.pop();
				LingoScript.prototype.stack.pop();
				if (val == 3) {
					LingoScript.prototype.stack.pop();
					LingoScript.prototype.stack.pop();
				}
				if (val != 0 && val != 3 && val != 7) {
					LingoScript.prototype.stack.pop();
				}
			})(this.val);
			break; // needs values from stack to determine what it's setting
				   // that said, dissassembly of this instruction is not yet complete
		/*
		case 0x5e:
		case 0x9e:
		case 0xde:
			opcode = "nop";
			break;
		*/
		case 0x5f:
		case 0x9f:
		case 0xdf:
			opcode = "getprop";
			LingoScript.prototype.stack.push(new NameValuePair("TODO"));
			pseudocode = "(the prop)";
			break;
		case 0x60:
		case 0xa0:
		case 0xe0:
			opcode = "setprop";
			LingoScript.prototype.stack.pop();
			pseudocode = "set the prop to x";
			break;
		case 0x61:
		case 0xa1:
		case 0xe1:
			opcode = "getobjprop";
			LingoScript.prototype.stack.pop();
			LingoScript.prototype.stack.push(new NameValuePair("TODO"));
			pseudocode = "(the prop of x)";
			break;
		case 0x62:
		case 0xa2:
		case 0xe2:
			opcode = "setobjprop";
			LingoScript.prototype.stack.pop();
			LingoScript.prototype.stack.pop();
			pseudocode = "set the prop of x to y";
			break;
		case 0x64:
		case 0xa4:
		case 0xe4:
			//opcode = "op_64xx";
			//break;
		case 0x65:
		case 0xa5:
		case 0xe5:
			//opcode = "op_65xx";
			//break;
		case 0x66:
		case 0xa6:
		case 0xe6:
			//opcode = "op_66xx";
			opcode = "op_" + this.val.toString(16);
			break;
		/* anything not yet indentitifed/discovered goes here */
		default:
			opcode = "UNK_" + this.val.toString(16);
			/*
				if we return values prefixed with "UNK_" (e.g. unknown), that means we have encountered
				an op code hasn't yet been discovered and needs to be understood for a complete dissassembly 
				and/or decompilation. If the decompiler is created before all the opcodes are known 
				(and this might just happen), it should return source code with comments saying decompilation failed,
				listing the opcodes and their offsets.
			*/
		}
		opcode += " " + (this.obj!==null?" "+this.obj:"");
	return [opcode.toUpperCase(), pseudocode];
}

/* Weird array thing... */

var oldpop = Array.prototype.pop;
Array.prototype.pop = function() {
	return this.length?oldpop():new NameValuePair("", "");
}

/* Initialization */

// When a user uploads a file, or if the user refreshes the page and a file is still loaded, send it to a variable.
var files = null;
if (document.form1.Lscr.files[0]) {
	files = document.form1.Lscr.files;
}

function setFiles(e) {
	e=e||event;
	files = e.target.files;
}

document.form1.Lscr.onchange = setFiles;

// Draw as RAWRGB555, the way the format is on the CD. It also can draw the image to the canvas while it's hidden and use that to save it as a JPEG.
// It's best to implement it this way, as BGR533 can convert to RGB555 with no quality loss, but not vice versa.
// Also 3D Groove went on to use JPEG in this format's place making it the best format to save out to, so it'll be compatible with the later versions of the Groove Xtra.
var movie = null;
function createNewOpenShockwaveMovie() {
	if (loggingEnabled) console.log("Creating New Open Shockwave Movie");
	if (files) {
		movie = new OpenShockwaveMovie(files[0]);
	} else {
		window.alert("You need to choose a file first.");
	}
}