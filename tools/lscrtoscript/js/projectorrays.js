'use strict';

/* Utilities */

function el(tagName, attributes, children) {
	var e = document.createElement(tagName);
	function addChild(child) {
		if (Array.isArray(child)) {
			for (let c of child) {
				addChild(c);
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

function InvalidDirectorFileError(message) {
	this.name = "InvalidDirectorFileError";
	this.message = message;
	this.stack = (new Error()).stack;
}
InvalidDirectorFileError.prototype = new Error();

function PathTooNewError(message) {
	this.name = "PathTooNewError";
	this.message = message;
	this.stack = (new Error()).stack;
}
PathTooNewError.prototype = new Error();

/* DataStream */

DataStream.prototype.readStringEndianness = function(length) {
	var result = this.readString(length);
	if (this.endianness) result = result.split("").reverse().join("");
	return result;
}

DataStream.prototype.skip = function(n) {
	this.seek(this.position + n);
}

/* OpenShockwaveMovie */

function OpenShockwaveMovie(file) {
	this.chunkArrays = null;
	this.chunkMap = null;
	this.differenceImap = null;

	if (file != null) {
		this.readFile(file);
	}
	// in the case that multiple files are chosen we can't draw more than one
	// however, if the user wants to convert files we can do more than one at once
}

OpenShockwaveMovie.prototype.readFile = function(file) {
	if (loggingEnabled) console.log("Constructing Open Shockwave Movie");

	this.chunkArrays = {};
	this.chunkArrays.RIFX = [];
	this.chunkArrays.imap = [];
	this.chunkArrays.mmap = [];

	var reader = new FileReader();
	reader.onload = e => {
		if (loggingEnabled) console.log("ShockwaveMovieReader onLoad");
		var dataStream = new DataStream(e.target.result);
		dataStream.endianness = false; // we set this properly when we create the RIFX chunk
		this.lookupMmap(dataStream);
		this.linkScripts();

		console.log(this.chunkArrays);

		if (this.chunkArrays.LctX) {
			var container = parent.right.document.getElementById("Lscrtables");
			for (let i = 0, l = this.chunkArrays.LctX.length; i < l; i++) {
				container.appendChild(this.chunkArrays.LctX[i].toHTML());
				if (i < l - 1) container.appendChild(el('hr'));
			}
		}
	};
	reader.readAsArrayBuffer(file);
};

// at the beginning of the file, we need to break some of the typical rules. We don't know names, lengths and offsets yet.
OpenShockwaveMovie.prototype.lookupMmap = function(dataStream) {
	if (loggingEnabled) console.log("Looking Up mmap");

	// valid length is undefined because we have not yet reached mmap
	// however, it will be filled automatically in chunk's constructor
	this.chunkMap = [];
	this.chunkArrays.RIFX[0] = this.readChunk(dataStream, "RIFX");
	// we can only open DIR or DXR
	// we'll read OpenShockwaveMovie from dataStream because OpenShockwaveMovie is an exception to the normal rules
	if (this.chunkArrays.RIFX[0].codec != "MV93") {
		throw new PathTooNewError("Codec " + this.chunkArrays.RIFX[0].codec + " unsupported.");
	}
	// the next chunk should be imap
	// this HAS to be dataStream for the OFFSET check to be correct
	// we will continue to use it because in this implementation RIFX doesn't contain it
	var imap = this.chunkArrays.imap[0] = this.readChunk(dataStream, "imap", undefined, 12);
	this.differenceImap = 0;
	// sanitize mmaps
	if (imap.memoryMapArray[0] - 0x2C) {
		this.differenceImap = imap.memoryMapArray[0] - 0x2C;
		for (let i = 0, l = imap.memoryMapArray.length; i < l; i++) {
			imap.memoryMapArray[i] -= this.differenceImap;
		}
	}
	// go to where imap says mmap is (ignoring the possibility of multiple mmaps for now)
	dataStream.seek(imap.memoryMapArray[0]);
	// interpret the numbers in the mmap - but don't actually find the chunks in it yet
	this.chunkArrays.mmap.push(this.readChunk(dataStream, "mmap", undefined, this.chunkArrays.imap[0].memoryMapArray[0]));
	// add chunks in the mmap to the chunkArrays HERE
	// make sure to account for chunks with existing names, lengths and offsets
	dataStream.position = 0;
	for (let mapEntry of this.chunkArrays.mmap[0].mapArray) {
		if (mapEntry.name != "mmap") {
			dataStream.seek(mapEntry.offset);
			if (!this.chunkArrays[mapEntry.name]) {
				this.chunkArrays[mapEntry.name] = [];
			}
			let chunk = this.readChunk(dataStream, mapEntry.name, mapEntry.len, mapEntry.offset, mapEntry.padding, mapEntry.unknown0, mapEntry.link);
			this.chunkArrays[mapEntry.name].push(chunk);
			this.chunkMap[mapEntry.index] = chunk;
		} else {
			dataStream.position += this.chunkArrays.mmap[0].len + 8;
		}
	}
}

OpenShockwaveMovie.prototype.linkScripts = function() {
	if (this.chunkArrays.LctX) {
		for (let scriptContext of this.chunkArrays.LctX) {
			let scriptNames = this.chunkMap[scriptContext.lnamSectionID];
			scriptContext.scriptNames = scriptNames;
			for (let section of scriptContext.sections) {
				if (section.sectionID > -1) {
					let script = this.chunkMap[section.sectionID];
					script.context = scriptContext;
					script.readNames();
					scriptContext.scripts.push(script);
				}
			}
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
		case "LctX":
			result = new ScriptContext(this);
			result.read(chunkDataStream);
			break;
		case "Lnam":
			result = new ScriptNames(this);
			result.read(chunkDataStream);
			break;
		case "Lscr":
			result = new LingoScript(this);
			result.read(chunkDataStream);
			break;
		default:
			result = null;
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
		var entry = new MemoryMapEntry(this, i);
		entry.read(dataStream);
		// we don't care about free or junk chunks
		if (entry.name !== "free" && entry.name !== "junk") {
			this.mapArray.push(entry);
		}
	}
}

/* MemoryMapEntry */

function MemoryMapEntry(map, index) {
	this.map = map;
	this.index = index;

	this.name = null;
	this.len = null;
	this.offset = null;
	this.padding = null;
	this.unknown0 = null;
	this.link = null;
}

MemoryMapEntry.prototype.read = function(dataStream) {
	this.name = dataStream.readStringEndianness(4);
	this.len = dataStream.readUint32();
	this.offset = dataStream.readUint32() - this.map.main.differenceImap;
	this.padding = dataStream.readInt16();
	this.unknown0 = dataStream.readInt16();
	this.link = dataStream.readInt32();
};

/* ScriptContext */

function ScriptContext(main) {
	this.main = main;

	this.unknown0 = null;
	this.unknown1 = null;
	this.entryCount = null;
	this.entryCount2 = null;
	this.entriesOffset = null;
	this.unknown2 = null;
	this.unknown3 = null;
	this.unknown4 = null;
	this.unknown5 = null;
	this.lnamSectionID = null;
	this.validCount = null;
	this.flags = null;
	this.freePointer = null;

	this.sections = null;

	this.scriptNames = null;
	this.scripts = [];
}

ScriptContext.prototype.read = function(dataStream) {
	// Lingo scripts are always big endian regardless of file endianness
	dataStream.endianness = false;

	this.unknown0 = dataStream.readInt32();
	this.unknown1 = dataStream.readInt32();
	this.entryCount = dataStream.readUint32();
	this.entryCount2 = dataStream.readUint32();
	this.entriesOffset = dataStream.readUint16();
	this.unknown2 = dataStream.readInt16();
	this.unknown3 = dataStream.readInt32();
	this.unknown4 = dataStream.readInt32();
	this.unknown5 = dataStream.readInt32();
	this.lnamSectionID = dataStream.readInt32();
	this.validCount = dataStream.readUint16();
	this.flags = dataStream.readUint16();
	this.freePointer = dataStream.readInt16();

	dataStream.seek(this.entriesOffset);
	this.sections = [];
	for (let i = 0, l = this.entryCount; i < l; i++) {
		let section = new ScriptContextSection(this);
		section.read(dataStream);
		this.sections.push(section);
	}
}

ScriptContext.prototype.toHTML = function() {
	var container = el('div');
	container.appendChild(el('h1', null, 'LctX ' + this.main.chunkMap.indexOf(this)));
	for (let script of this.scripts) {
		container.appendChild(script.toHTML());
	}
	return container;
}

/* ScriptContextSection */

function ScriptContextSection(scriptContext) {
	this.scriptContext = scriptContext;

	this.unknown0 = null;
	this.sectionID = null;
	this.unknown1 = null;
	this.unknown2 = null;
}

ScriptContextSection.prototype.read = function(dataStream) {
	this.unknown0 = dataStream.readInt32();
	this.sectionID = dataStream.readInt32();
	this.unknown1 = dataStream.readUint16();
	this.unknown2 = dataStream.readUint16();
}

/* ScriptNames */

function ScriptNames(main) {
	this.main = main;

	this.unknown0 = null;
	this.unknown1 = null;
	this.len1 = null;
	this.len2 = null;
	this.namesOffset = null;
	this.nameCount = null;

	this.names = null;
}

ScriptNames.prototype.read = function(dataStream) {
	// Lingo scripts are always big endian regardless of file endianness
	dataStream.endianness = false;

	this.unknown0 = dataStream.readInt32();
	this.unknown1 = dataStream.readInt32();
	this.len1 = dataStream.readUint32();
	this.len2 = dataStream.readUint32();
	this.namesOffset = dataStream.readUint16();
	this.nameCount = dataStream.readUint16();

	dataStream.seek(this.namesOffset);
	this.names = [];
	for (let i = 0, l = this.nameCount; i < l; i++) {
		let length = dataStream.readUint8();
		let name = dataStream.readString(length);
		this.names.push(name);
	}
}

/* LingoScript */

function LingoScript(main) {
	this.main = main;

	this.totalLength = null;
	this.totalLength2 = null;
	this.headerLength = null;
	this.scriptNumber = null;
	this.scriptBehaviour = null;
	this.map = null;

	this.propertyNameIDs = null;
	this.globalNameIDs = null;

	this.propertyNames = null;
	this.globalNames = null;
	this.handlers = null;
	this.literals = null;
	this.context = null;

	this.stack = [];
	this.stack.pop = function() {
		return this.length > 0 ? Array.prototype.pop.apply(this) : new StackValue("error", "error");
	};
	this.stack.clear = function() {
		this.splice(0, this.length);
	};
}

LingoScript.prototype.read = function(dataStream) {
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

	this.propertyNameIDs = this.readVarnamesTable(dataStream, this.map.properties.len, this.map.properties.offset);
	this.globalNameIDs = this.readVarnamesTable(dataStream, this.map.globals.len, this.map.globals.offset);

	dataStream.seek(this.map.handlers.offset);
	this.handlers = [];
	for (let i = 0, l = this.map.handlers.len; i < l; i++) {
		let handler = new Handler(this);
		handler.readRecord(dataStream);
		this.handlers.push(handler);
	}
	for (let handler of this.handlers) {
		handler.readBytecode(dataStream);
	}

	dataStream.seek(this.map.literals.offset);
	this.literals = [];
	for (let i = 0, l = this.map.literals.len; i < l; i++) {
		let literal = new Literal(this);
		literal.readRecord(dataStream);
		this.literals.push(literal);
	}
	for (let literal of this.literals) {
		literal.readValue(dataStream, this.map.literalsdata.offset);
	}
}

LingoScript.prototype.readVarnamesTable = function (dataStream, count, offset) {
	dataStream.seek(offset);
	var nameIDs = [];
	for (let i = 0; i < count; i++) {
		nameIDs.push(dataStream.readUint16());
	}
	return nameIDs;
};

LingoScript.prototype.readNames = function() {
	var nameList = this.context.scriptNames.names;
	this.propertyNames = this.propertyNameIDs.map(nameID => nameList[nameID]);
	this.globalNames = this.globalNameIDs.map(nameID => nameList[nameID]);
	for (let handler of this.handlers) {
		handler.readNames();
	}
}

LingoScript.prototype.toHTML = function() {
	var fragment = document.createDocumentFragment();
	fragment.appendChild(el('h2', null, 'Lscr ' + this.main.chunkMap.indexOf(this)));
	if (this.propertyNames.length > 0) {
		fragment.appendChild(el('h3', null, 'Properties'));
		let table = el('table', null, [
			el('tr', null, [
				el('th', null, 'index'),
				el('th', null, 'name'),
			])
		]);
		for (let i = 0, l = this.propertyNames.length; i < l; i++) {
			table.appendChild(el('tr', null, [
				el('td', null, i),
				el('td', null, this.propertyNames[i])
			]));
		}
		fragment.appendChild(table);
	}
	if (this.globalNames.length > 0) {
		fragment.appendChild(el('h3', null, 'Globals'));
		let table = el('table', null, [
			el('tr', null, [
				el('th', null, 'index'),
				el('th', null, 'name'),
			])
		]);
		for (let i = 0, l = this.globalNames.length; i < l; i++) {
			table.appendChild(el('tr', null, [
				el('td', null, i),
				el('td', null, this.globalNames[i])
			]));
		}
		fragment.appendChild(table);
	}
	if (this.literals.length > 0) {
		fragment.appendChild(el('h3', null, 'Literals'));
		let table = el('table', null, [
			el('tr', null, [
				el('th', null, 'index'),
				el('th', null, 'type'),
				el('th', null, 'value')
			])
		]);
		for (let literal of this.literals) {
			table.appendChild(literal.toHTML());
		}
		fragment.appendChild(table);
	}
	if (this.handlers.length > 0) {
		fragment.appendChild(el('h3', null, 'Handlers'));
		for (let handler of this.handlers) {
			fragment.appendChild(handler.toHTML());
		}
	}
	return fragment;
}

/* LscrChunk */

function LscrChunk(len, offset, flags) {
	this.len = len;
	this.offset = offset;
	if (flags != null) {
		this.flags = flags;
	}
}

/* Handler */

function Handler(script) {
	this.script = script;

	this.nameID = null;
	this.handlerVectorPos = null;
	this.compiledLen = null;
	this.compiledOffset = null;
	this.argumentCount = null;
	this.argumentOffset = null;
	this.localsCount = null;
	this.localsOffset = null;
	this.unknown0Count = null;
	this.unknown0Offset = null;
	this.unknown1 = null;
	this.unknown2 = null;
	// unknown3 doesn't seem to exist...
	// this.unknown3 = null;
	this.lineCount = null;
	this.lineOffset = null;
	this.stackHeight = null;

	this.argumentNameIDs = [];
	this.localNameIDs = [];

	this.bytecodeArray = [];
	this.argumentNames = [];
	this.localNames = [];
	this.name = null;
}

Handler.prototype.readRecord = function(dataStream) {
	this.nameID = dataStream.readUint16();
	this.handlerVectorPos = dataStream.readUint16();
	this.compiledLen = dataStream.readUint32();
	this.compiledOffset = dataStream.readUint32();
	this.argumentCount = dataStream.readUint16();
	this.argumentOffset = dataStream.readUint32();
	this.localsCount = dataStream.readUint16();
	this.localsOffset = dataStream.readUint32();
	this.unknown0Count = dataStream.readUint16();
	this.unknown0Offset = dataStream.readUint32();
	this.unknown1 = dataStream.readUint32();
	this.unknown2 = dataStream.readUint16();
	// this.unknown3 = dataStream.readUint16();
	this.lineCount = dataStream.readUint16();
	this.lineOffset = dataStream.readUint32();
	// yet to implement
	this.stackHeight = dataStream.readUint32();
}

Handler.prototype.readBytecode = function(dataStream) {
	dataStream.seek(this.compiledOffset);
	this.bytecodeArray = [];
	// seeks to the offset of the handlers. Currently only grabs the first handler in the script.
	// loop while there's still more code left
	this.script.stack.clear();
	var op, obj = null, pos = null;
	while (dataStream.position < this.compiledOffset + this.compiledLen) {
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

	this.argumentNameIDs = this.readVarnamesTable(dataStream, this.argumentCount, this.argumentOffset);
	this.localNameIDs = this.readVarnamesTable(dataStream, this.localsCount, this.localsOffset);
}

Handler.prototype.readVarnamesTable = LingoScript.prototype.readVarnamesTable;

Handler.prototype.readNames = function() {
	var nameList = this.script.context.scriptNames.names;
	this.name = nameList[this.nameID];
	this.argumentNames = this.argumentNameIDs.map(nameID => nameList[nameID]);
	this.localNames = this.localNameIDs.map(nameID => nameList[nameID]);
}

Handler.prototype.toHTML = function() {
	var fragment = document.createDocumentFragment();
	fragment.appendChild(
		el(
			'h4', null,
			this.script.handlers.indexOf(this) + ': ' + this.name + '('
			+ this.argumentNames.join(', ') + ')'
		)
	);
	if (this.localNames.length > 0) {
		fragment.appendChild(el('h5', null, 'Local Variables'));
		let table = el('table', null, [
			el('tr', null, [
				el('th', null, 'index'),
				el('th', null, 'name'),
			])
		]);
		for (let i = 0, l = this.localNames.length; i < l; i++) {
			table.appendChild(el('tr', null, [
				el('td', null, i),
				el('td', null, this.localNames[i])
			]));
		}
		fragment.appendChild(table);
	}
	fragment.appendChild(el('h5', null, 'Bytecode'));
	let table = el('table', null, [
		el('tr', null, [
			el('th', null, 'bytecode'),
			el('th', null, 'opcode'),
			el('th', null, 'pseudocode')
		])
	]);
	for (let bytecode of this.bytecodeArray) {
		let translation = bytecode.translate();
		table.appendChild(el('tr', null, [
			el('td', null, formatBytes(bytecode.val) + "" + (bytecode.obj !== null ? " " + formatBytes(bytecode.obj) : "")),
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
		this.value = dataStream.readString(this.length - 1);
	} else if (this.type === 4) {
		this.value = this.offset;
	} else if (this.type === 9) {
		this.value = dataStream.readFloat64();
	}
}

Literal.prototype.toHTML = function() {
	return el('tr', null, [
		el('td', null, this.script.literals.indexOf(this)),
		el('td', null, Literal.types[this.type] || '?'),
		el('td', null, JSON.stringify(this.value))
	]);
}

Literal.types = {
	1: 'string',
	4: 'int',
	9: 'double'
};

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
	var opcode, operator, result, pseudocode = "";
	var script = this.handler.script;
	var nameList = script.context.scriptNames.names;
	var x = script.stack.pop();
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
	pseudocode = "" + operator + x;
	script.stack.push(new StackValue(pseudocode, "pseudocode"));
	return [opcode.toUpperCase(), pseudocode];
}

Bytecode.prototype.operate21 = function(val) {
	var opcode, operator, result, pseudocode = "";
	var script = this.handler.script;
	var nameList = script.context.scriptNames.names;
	var y = script.stack.pop();
	var x = script.stack.pop();
	switch (val) {
		case 0x4:
			opcode = "mul";
			operator = "*";
			break;
		case 0x5:
			opcode = "add";
			operator = "+";
			break;
		case 0x6:
			opcode = "sub";
			operator = "-";
			break;
		case 0x7:
			opcode = "div";
			operator = "/";
			break;
		case 0x8:
			opcode = "mod";
			operator = "mod";
		case 0xa:
			opcode = "joinstr";
			operator = "&";
			break;
		case 0xb:
			opcode = "joinpadstr";
			operator = "&&";
			break;
		case 0xc:
			opcode = "lt";
			operator = "<";
			break;
		case 0xd:
			opcode = "lteq";
			operator = "<=";
			break;
		case 0xe:
			opcode = "nteq";
			operator = "<>";
			break;
		case 0xf:
			opcode = "eq";
			operator = "=";
			break;
		case 0x10:
			opcode = "gt";
			operator = ">";
			break;
		case 0x11:
			opcode = "gteq";
			operator = ">=";
			break;
		case 0x12:
			opcode = "and";
			operator = "and";
			break;
		case 0x13:
			opcode = "or";
			operator = "or";
			break;
		case 0x15:
			opcode = "containsstr";
			operator = "contains";
			break;
		case 0x16:
			opcode = "contains0str";
			operator = "starts";
	}
	pseudocode = "" + x + " " + operator + " ";
	script.stack.push(new StackValue(pseudocode, "pseudocode"));
	return [opcode.toUpperCase(), pseudocode];
}

Bytecode.prototype.translate = function() {
	if (loggingEnabled) console.log("Translate Bytecode: " + bytecode);
	var opcode = "";
	var pseudocode = "";
	var script = this.handler.script;
	var nameList = script.context.scriptNames.names;
	// script.stack = [];
	// see the documentation for notes on these opcodes
	switch (this.val) {
		// TODO: copy the comments from OP.txt into the code for a quicker reference
		/* Single Byte Instructions */
		case 0x1:
			(() => {
				opcode = "ret";
				pseudocode = "exit";
			})();
			break;
		case 0x3:
			(() => {
				opcode = "pushint0";
				pseudocode = "0";
				script.stack.push(new StackValue(0, "int"));
			})();
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
			(() => {
				opcode = "splitstr";
				var string = script.stack.pop();
				var lastLine = script.stack.pop();
				var firstLine = script.stack.pop();
				var lastItem = script.stack.pop();
				var firstItem = script.stack.pop();
				var lastWord = script.stack.pop();
				var firstWord = script.stack.pop();
				var lastChar = script.stack.pop();
				var firstChar = script.stack.pop();
				if (firstChar !== 0) {
					if (lastChar === 0) {
						pseudocode = "char " + firstChar + " of " + string;
					} else {
						pseudocode = "char " + firstChar + " to " + lastChar + " of " + string;
					}
				} else if (firstWord !== 0) {
					if (lastWord === 0) {
						pseudocode = "word " + firstWord + " of " + string;
					} else {
						pseudocode = "word " + firstWord + " to " + lastWord + " of " + string;
					}
				} else if (firstItem !== 0) {
					if (lastItem === 0) {
						pseudocode = "item " + firstItem + " of " + string;
					} else {
						pseudocode = "word " + firstItem + " to " + lastItem + " of " + string;
					}
				} else if (firstLine !== 0) {
					if (lastLine === 0) {
						pseudocode = "item " + firstLine + " of " + string;
					} else {
						pseudocode = "word " + firstLine + " to " + lastLine + " of " + string;
					}
				}
				script.stack.push(new StackValue(pseudocode, "pseudocode"));
			})();
			break;
		case 0x18:
			(() => {
				opcode = "lightstr";
				var field = script.stack.pop();
				var lastLine = script.stack.pop();
				var firstLine = script.stack.pop();
				var lastItem = script.stack.pop();
				var firstItem = script.stack.pop();
				var lastWord = script.stack.pop();
				var firstWord = script.stack.pop();
				var lastChar = script.stack.pop();
				var firstChar = script.stack.pop();
				if (firstChar !== 0) {
					if (lastChar === 0) {
						pseudocode = "hilite char " + firstChar + " of " + field;
					} else {
						pseudocode = "hilite char " + firstChar + " to " + lastChar + " of " + field;
					}
				} else if (firstWord !== 0) {
					if (lastWord === 0) {
						pseudocode = "hilite word " + firstWord + " of " + field;
					} else {
						pseudocode = "hilite word " + firstWord + " to " + lastWord + " of " + field;
					}
				} else if (firstItem !== 0) {
					if (lastItem === 0) {
						pseudocode = "hilite item " + firstItem + " of " + field;
					} else {
						pseudocode = "hilite word " + firstItem + " to " + lastItem + " of " + field;
					}
				} else if (firstLine !== 0) {
					if (lastLine === 0) {
						pseudocode = "hilite item " + firstLine + " of " + field;
					} else {
						pseudocode = "hilite word " + firstLine + " to " + lastLine + " of " + field;
					}
				}
			})();
			break;
		case 0x19:
			(() => {
				opcode = "ontospr";
				var firstSprite = script.stack.pop();
				var secondSprite = script.stack.pop();
				pseudocode = "sprite " + firstSprite + " intersects " + secondSprites;
				script.stack.push(new StackValue(pseudocode, "pseudocode"));
			})();
			break;
		case 0x1a:
			(() => {
				opcode = "intospr";
				var firstSprite = script.stack.pop();
				var secondSprite = script.stack.pop();
				pseudocode = "sprite " + firstSprite + " within " + secondSprite;
				script.stack.push(new StackValue(pseudocode, "pseudocode"));
			})();
			break;
		case 0x1b:
			(() => {
				opcode = "caststr";
				pseudocode = "field " + script.stack.pop();
				script.stack.push(new StackValue(pseudocode, "pseudocode"));
			})();
			break;
		case 0x1c:
			(() => {
				opcode = "startobj";
				script.stack.pop();
				pseudocode = "TODO";
			})();
			break;
		case 0x1d:
			(() => {
				opcode = "stopobj";
				pseudocode = "TODO";
			})();
			break;
		case 0x1e:
			(() => {
				opcode = "wraplist";
				script.stack.pop();
				script.stack.push(new StackValue("TODO", "pseudocode"));
			})();
			break; // NAME NOT CERTAINLY SET IN STONE JUST YET...
		case 0x1f:
			(() => {
				opcode = "newproplist";
				script.stack.pop();
				script.stack.push(new StackValue("TODO", "pseudocode"));
			})();
			break;
		/* Multi - Byte Instructions */
		/*
			To-do: 
			handle special cases like getting names from name table,
			or opcodes that determine context through other means
			than their operands.
		*/
		case 0x41:
			(() => {
				opcode = "pushbyte";
				pseudocode = this.obj;
				script.stack.push(new StackValue(this.obj, "int"));
			})();
			break;
		case 0x81:
			(() => {
				opcode = "pushshort";
				pseudocode = this.obj;
				script.stack.push(new StackValue(this.obj, "int"));
			})();
			break;
		case 0xc1:
			(() => {
				opcode = "pushint24";
				pseudocode = this.obj;
				script.stack.push(new StackValue(this.obj, "int"));
			})();
			break;
		case 0x42:
		case 0x82:
		case 0xc2:
			(() => {
				opcode = "newarglist";
				var args = script.stack.splice(script.stack.length - this.obj, this.obj);
				script.stack.push(new StackValue(args, "arglist"));
			})();
			break;
		case 0x43:
		case 0x83:
		case 0xc3:
			(() => {
				opcode = "newlist";
				var items = script.stack.splice(script.stack.length - this.obj, this.obj);
				script.stack.push(new StackValue(items, "list"));
			})();
			break;
		case 0x44:
		case 0x84:
		case 0xc4:
			(() => {
				var literal = script.literals[this.obj]
				var type = Literal.types[literal.type];
				opcode = "push" + type;
				pseudocode = JSON.stringify(literal.value);
				script.stack.push(new StackValue(literal.value, type));
			})();
			break; 
		case 0x45:
		case 0x85:
		case 0xc5:
			(() => {
				opcode = "pushsymb";
				pseudocode = "#" + nameList[this.obj];
				script.stack.push(new StackValue(pseudocode, "symbol"));
			})();
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
			(() => {
				opcode = "push_global";
				pseudocode = script.globalNames[this.obj];
				script.stack.push(new StackValue(pseudocode, "globalvar"));
			})();
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
			(() => {
				opcode = "pushparams";
				pseudocode = this.handler.argumentNames[this.obj];
				script.stack.push(new StackValue(pseudocode, "param"));
			})();
			break;
		case 0x4c:
		case 0x8c:
		case 0xcc:
			(() => {
				opcode = "push_local";
				pseudocode = this.handler.localNames[this.obj];
				script.stack.push(new StackValue(pseudocode, "localvar"));
			})();
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
			(() => {
				opcode = "pop_global";
				var value = script.stack.pop();
				pseudocode = "set " + script.globalNames[this.obj] + " = " + value.toString(true);
			})();
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
			(() => {
				opcode = "pop_local";
				var value = script.stack.pop();
				pseudocode = "set " + this.handler.localNames[this.obj] + " = " + value.toString(true);
			})();
			break;
		case 0x53:
		case 0x93:
		case 0xd3:
			(() => {
				opcode = "jmp";
				// do something
			})();
			break;
		case 0x54:
		case 0x94:
		case 0xd4:
			(() => {
				opcode = "endrepeat";
				pseudocode = "end repeat";
			})();
			break;
		case 0x55:
		case 0x95:
		case 0xd5:
			(() => {
				opcode = "iftrue";
				pseudocode = "if (" + this.obj + ")";
			})();
			break;
		case 0x56:
		case 0x96:
		case 0xd6:
			(() => {
				opcode = "call_local";
				(() => {
					var arglist = script.stack.pop();
					var argliststring = "";
					if (arglist.type === "arglist" || arglist.type === "list") {
						argliststring = arglist.value.map(arg => arg.toString(true)).join(", ")
					}
					pseudocode = script.handlers[this.obj].name + "(" + argliststring + ")";
					if (arglist.type === "list") {
						script.stack.push(new StackValue(pseudocode, "pseudocode"));
					}
				})();
			})();
			break;
		case 0x57:
		case 0x97:
		case 0xd7:
			(() => {
				opcode = "call_external";
				(() => {
					var arglist = script.stack.pop();
					var argliststring = "";
					if (arglist.type === "arglist" || arglist.type === "list") {
						argliststring = arglist.value.map(arg => arg.toString(true)).join(", ")
					}
					pseudocode = nameList[this.obj] + "(" + argliststring + ")";
					if (arglist.type === "list") {
						script.stack.push(new StackValue(pseudocode, "pseudocode"));
					}
				})();
			})();
			break;
		case 0x58:
		case 0x98:
		case 0xd8:
			(() => {
				opcode = "callobj";
				var argslist = script.stack.pop();
				var poppedobject = script.stack.pop();
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
			script.stack.pop();
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
			(() => {
				opcode = "op_5bxx";
				script.stack.pop();
			})();
			break; //TEMP NAME
		case 0x5c:
		case 0x9c:
		case 0xdc:
			(() => {
				opcode = "get";
				switch (this.obj) {
					case 0x00:
						(() => {
							const options = {
								0x00: "floatPrecision",
								0x01: "mouseDownScript",
								0x02: "mouseUpScript",
								0x03: "keyDownScript",
								0x04: "keyUpScript",
								0x05: "timeoutScript",
								0x06: "short time",
								0x07: "abbr time",
								0x08: "long time",
								0x09: "short date",
								0x0a: "abbr date",
								0x0b: "long date",
								0x0c: "char",
								0x0d: "word",
								0x0e: "item",
								0x0f: "line"
							};

							var id = script.stack.pop();
							if (id < 0x0c) {
								pseudocode = "the " + options[id];
							} else {
								var string = script.stack.pop();
								pseudocode = "the last " + options[id] + " in " + string;
							}
						})();
						break;
					case 0x01:
						(() => {
							const options = {
								0x01: "chars",
								0x02: "words",
								0x03: "items",
								0x04: "lines"
							};

							var statID = script.stack.pop();
							var string = script.stack.pop();
							pseudocode = "the number of " + options[statID.value] + " in " + string;
						})();
						break;
					case 0x02:
						(() => {
							const options = {
								0x01: "name",
								0x02: "number of menuItems"
							};

							var menuID = script.stack.pop();
							var propertyID = script.stack.pop();
							pseudocode = "the " + options[propertyID.value] + " of menu " + menuID;
						})();
						break;
					case 0x03:
						(() => {
							const options = {
								0x01: "name",
								0x02: "checkMark",
								0x03: "enabled",
								0x04: "script"
							};

							var itemID = script.stack.pop();
							var menuID = script.stack.pop();
							var propertyID = script.stack.pop();
							pseudocode = "the " + options[propertyID.value] + " of menuItem " + itemID + " of menu " + menuID;
						})();
						break;
					case 0x04:
						(() => {
							const options = {
								0x01: "volume"
							};

							var soundID = script.stack.pop();
							var propertyID = script.stack.pop();
							pseudocode = "the " + options[propertyID.value] + " of sound " + soundID;
						})();
						break;
					case 0x06:
						(() => {
							const options = {
								0x01: "type",
								0x02: "backColor",
								0x03: "bottom",
								0x04: "castNum",
								0x05: "constraint",
								0x06: "cursor",
								0x07: "foreColor",
								0x08: "height",
								0x0a: "ink",
								0x0b: "left",
								0x0c: "lineSize",
								0x0d: "locH",
								0x0e: "locV",
								0x0f: "movieRate",
								0x10: "movieTime",
								0x12: "puppet",
								0x13: "right",
								0x14: "startTime",
								0x15: "stopTime",
								0x16: "stretch",
								0x17: "top",
								0x18: "trails",
								0x19: "visible",
								0x1a: "volume",
								0x1b: "width",
								0x1d: "scriptNum",
								0x1e: "moveableSprite",
								0x20: "scoreColor"
							};

							var spriteID = script.stack.pop();
							var propertyID = script.stack.pop();
							pseudocode = "the " + options[propertyID.value] + " of sprite " + spriteID;
						})();
						break;
					case 0x07:
						(() => {
							const options = {
								0x01: "beepOn",
								0x02: "buttonStyle",
								0x03: "centerStage",
								0x04: "checkBoxAccess",
								0x05: "checkboxType",
								0x06: "colorDepth",
								0x08: "exitLock",
								0x09: "fixStageSize",
								0x13: "timeoutLapsed",
								0x17: "selEnd",
								0x18: "selStart",
								0x19: "soundEnabled",
								0x1a: "soundLevel",
								0x1b: "stageColor",
								0x1d: "stillDown",
								0x1e: "timeoutKeyDown",
								0x1f: "timeoutLength",
								0x20: "timeoutMouse",
								0x21: "timeoutPlay",
								0x22: "timer"
							};

							var settingID = script.stack.pop();
							pseudocode = "the " + options[settingID.value];
						})();
						break;
					case 0x08:
						(() => {
							const options = {
								0x01: "the perFrameHook",
								0x02: "number of castMembers",
								0x03: "number of menus"
							};

							var statID = script.stack.pop();
							pseudocode = options[statID.value];
						})();
						break;
					case 0x09:
						(() => {
							const options = {
								0x01: "name",
								0x02: "text",
								0x08: "picture",
								0x0a: "number",
								0x0b: "size",
								0x11: "foreColor",
								0x12: "backColor"
							};

							var castID = script.stack.pop();
							var propertyID = script.stack.pop();
							pseudocode = "the " + options[propertyID.value] + " of cast " + castID;
						})();
						break;
					case 0x0c:
						(() => {
							const options = {
								0x03: "textStyle",
								0x04: "textFont",
								0x05: "textHeight",
								0x06: "textAlign",
								0x07: "textSize"
							};

							var fieldID = script.stack.pop();
							var propertyID = script.stack.pop();
							pseudocode = "the " + options[propertyID.value] + " of field " + fieldID;
						})();
						break;
					case 0x0d:
						(() => {
							const options = {
								0x10: "sound"
							};

							var castID = script.stack.pop();
							var propertyID = script.stack.pop();
							pseudocode = "the " + options[propertyID.value] + " of cast " + castID;
						})();
				}
				script.stack.push(new StackValue(pseudocode, "pseudocode"));
			})();
			break;
		case 0x5d:
		case 0x9d:
		case 0xdd:
			opcode = "set";
			(val => {
				// make a switch later
				script.stack.pop();
				script.stack.pop();
				if (val == 3) {
					script.stack.pop();
					script.stack.pop();
				}
				if (val != 0 && val != 3 && val != 7) {
					script.stack.pop();
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
			(() => {
				opcode = "getprop";
				pseudocode = "the " + nameList[this.obj];
				script.stack.push(new StackValue(pseudocode, "pseudocode"));
			})();
			break;
		case 0x60:
		case 0xa0:
		case 0xe0:
			(() => {
				opcode = "setprop";
				pseudocode = "set the " + nameList[this.obj] + " to " + script.stack.pop();
			})();
			break;
		case 0x61:
		case 0xa1:
		case 0xe1:
			(() => {
				opcode = "getobjprop";
				script.stack.pop();
				script.stack.push(new StackValue("TODO", "pseudocode"));
				pseudocode = "(the prop of x)";
			})();
			break;
		case 0x62:
		case 0xa2:
		case 0xe2:
			(() => {
				opcode = "setobjprop";
				script.stack.pop();
				script.stack.pop();
				pseudocode = "set the prop of x to y";
			})();
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
			script.stack.clear();
		}
		opcode += " " + (this.obj!==null?" "+this.obj:"");
	return [opcode.toUpperCase(), pseudocode];
}

/* StackValue */

function StackValue(value, type) {
	this.value = value;
	this.type = type;
}

StackValue.prototype.toString = function(noParentheses) {
	if (this.type === "pseudocode" && !noParentheses) {
		return "(" + this.value + ")";
	}
	if (["string", "int", "double", "arglist", "list"].includes(this.type)) {
		return JSON.stringify(this.value);
	}
	return this.value;
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