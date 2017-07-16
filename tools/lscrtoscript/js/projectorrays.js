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
				child = document.createTextNode(child);
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

function formatBytes(num, length) {
	var hex = num.toString(16).toUpperCase();
	if (hex.length < length * 2) {
		hex = "0".repeat(length * 2 - hex.length) + hex;
	}
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
					script.translate();
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

	this.stack = new Stack();
	this.blockEnds = [];
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

LingoScript.prototype.translate = function() {
	for (let handler of this.handlers) {
		handler.translate();
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
	this.ast = null;
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
	while (dataStream.position < this.compiledOffset + this.compiledLen) {
		let pos = dataStream.position;
		let op = dataStream.readUint8();
		// instructions can be one, two or three bytes
		let obj = null, objLength = 0;
		if (op >= 0xc0) {
			obj = dataStream.readUint24();
			objLength = 3;
		} else if (op >= 0x80) {
			obj = dataStream.readUint16();
			objLength = 2;
		} else if (op >= 0x40) {
			obj = dataStream.readUint8();
			objLength = 1;
		}
		// read the first byte to convert to an opcode
		let bytecode = new Bytecode(this, op, obj, objLength, pos);
		this.bytecodeArray.push(bytecode);
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

Handler.prototype.translate = function() {
	this.script.stack = new Stack();
	this.ast = new AST(new AST.Handler(this.name, this.argumentNames));
	for (let bytecode of this.bytecodeArray) {
		let pos = bytecode.pos;
		if (this.script.blockEnds.length > 0) {
			if (pos === this.script.blockEnds[this.script.blockEnds.length - 1]) {
				this.ast.exitBlock();
				this.script.blockEnds.pop();
			}
		}
		bytecode.translate();
	}
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
		table.appendChild(el('tr', null, [
			el('td', null, formatBytes(bytecode.val, 1) + (bytecode.obj != null ? " " + formatBytes(bytecode.obj, bytecode.objLength) : "")),
			el('td', null, bytecode.opcode.toUpperCase() + (bytecode.obj != null ? " " + bytecode.obj : "")),
			el('td', null, bytecode.translation ? bytecode.translation.toPseudocode() : null)
		]));
	}
	fragment.appendChild(table);
	fragment.appendChild(el('h5', null, 'Lingo Code'));
	fragment.appendChild(el('pre', null, this.ast.toString()));
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
	9: 'float'
};

/* Bytecode */	

function Bytecode(handler, val, obj, objLength, pos) {
	this.handler = handler;
	this.val = val || 0;
	this.obj = obj != null ? obj : null;
	this.objLength = objLength;
	this.pos = pos;

	this.opcode = this.getOpcode(this.val);
	this.translation = null;
}

Bytecode.prototype.getOpcode = function(val) {
	const oneByteCodes = {
		0x01: "ret",
		0x03: "pushint0",
		0x04: "mul",
		0x05: "add",
		0x06: "sub",
		0x07: "div",
		0x08: "mod",
		0x09: "inv",
		0x0a: "joinstr",
		0x0b: "joinpadstr",
		0x0c: "lt",
		0x0d: "lteq",
		0x0e: "nteq",
		0x0f: "eq",
		0x10: "gt",
		0x11: "gteq",
		0x12: "and",
		0x13: "or",
		0x14: "not",
		0x15: "containsstr",
		0x16: "contains0str",
		0x17: "splitstr",
		0x18: "lightstr",
		0x19: "ontospr",
		0x1a: "intospr",
		0x1b: "caststr",
		0x1c: "startobj",
		0x1d: "stopobj",
		0x1e: "wraplist",
		0x1f: "newproplist"
	};

	const multiByteCodes = {
		0x01: "pushint",
		0x02: "newarglist",
		0x03: "newlist",
		0x04: "pushcons",
		0x05: "pushsymb",
		0x09: "push_global",
		0x0a: "push_prop",
		0x0b: "push_param",
		0x0c: "push_local",
		0x0f: "pop_global",
		0x10: "pop_prop",
		0x11: "pop_param",
		0x12: "pop_local",
		0x13: "jmp",
		0x14: "endrepeat",
		0x15: "iftrue",
		0x16: "call_local",
		0x17: "call_external",
		0x18: "callobj_old?",
		0x19: "op_59xx",
		0x1b: "op_5bxx",
		0x1c: "get",
		0x1d: "set",
		0x1f: "getmovieprop",
		0x20: "setmovieprop",
		0x21: "getobjprop",
		0x22: "setobjprop",
		0x27: "callobj",
		0x2e: "pushint"
	};

	var opcode = val < 0x40 ? oneByteCodes[val] : multiByteCodes[val % 0x40];
	return opcode || "unk_" + val.toString(16);
}

Bytecode.prototype.translate = function() {
	if (loggingEnabled) console.log("Translate Bytecode: " + bytecode);
	var translation = null;
	var script = this.handler.script;
	var nameList = script.context.scriptNames.names;
	var ast = this.handler.ast;

	const handleBinaryOperator = () => {
		const operators = {
			"mul": "*",
			"add": "+",
			"sub": "-",
			"div": "/",
			"mod": "mod",
			"joinstr": "&",
			"joinpadstr": "&&",
			"lt": "<",
			"lteq": "<=",
			"nteq": "<>",
			"eq": "=",
			"gt": ">",
			"gteq": ">=",
			"and": "and",
			"or": "or",
			"containsstr": "contains",
			"contains0str": "starts"
		};
		var y = script.stack.pop();
		var x = script.stack.pop();
		translation = new AST.BinaryOperator(operators[this.opcode], x, y);
		script.stack.push(translation);
	};

	const bytecodeHandlers = {
		"ret": () => {
			translation = new AST.ExitStatement();
			ast.addStatement(translation);
		},
		"pushint0": () => {
			translation = new AST.IntLiteral(0);
			script.stack.push(translation);
		},
		"mul": handleBinaryOperator,
		"add": handleBinaryOperator,
		"sub": handleBinaryOperator,
		"div": handleBinaryOperator,
		"mod": handleBinaryOperator,
		"inv": () => {
			var x = script.stack.pop();
			translation = new AST.InverseOperator(x);
			script.stack.push(translation);
		},
		"joinstr": handleBinaryOperator,
		"joinpadstr": handleBinaryOperator,
		"lt": handleBinaryOperator,
		"lteq": handleBinaryOperator,
		"nteq": handleBinaryOperator,
		"eq": handleBinaryOperator,
		"gt": handleBinaryOperator,
		"gteq": handleBinaryOperator,
		"or": handleBinaryOperator,
		"not": () => {
			var x = script.stack.pop();
			translation = new AST.NotOperator(x);
			script.stack.push(translation);
		},
		"containsstr": handleBinaryOperator,
		"contains0str": handleBinaryOperator,
		"splitstr": () => {
			var string = script.stack.pop();
			var lastLine = script.stack.pop();
			var firstLine = script.stack.pop();
			var lastItem = script.stack.pop();
			var firstItem = script.stack.pop();
			var lastWord = script.stack.pop();
			var firstWord = script.stack.pop();
			var lastChar = script.stack.pop();
			var firstChar = script.stack.pop();
			if (firstChar.getValue() !== 0) {
				translation = new AST.StringSplitExpression("char", firstChar, lastChar, string);
			} else if (firstWord.getValue() !== 0) {
				translation = new AST.StringSplitExpression("word", firstWord, lastWord, string);
			} else if (firstItem.getValue() !== 0) {
				translation = new AST.StringSplitExpression("item", firstItem, lastItem, string);
			} else if (firstLine.getValue() !== 0) {
				translation = new AST.StringSplitExpression("line", firstLine, lastLine, string);
			}
			script.stack.push(translation);
		},
		"lightstr": () => {
			var field = script.stack.pop();
			var lastLine = script.stack.pop();
			var firstLine = script.stack.pop();
			var lastItem = script.stack.pop();
			var firstItem = script.stack.pop();
			var lastWord = script.stack.pop();
			var firstWord = script.stack.pop();
			var lastChar = script.stack.pop();
			var firstChar = script.stack.pop();
			if (firstChar.getValue() !== 0) {
				translation = new AST.StringHilightCommand("char", firstChar, lastChar, field);
			} else if (firstWord.getValue() !== 0) {
				translation = new AST.StringHilightCommand("word", firstWord, lastWord, field);
			} else if (firstItem.getValue() !== 0) {
				translation = new AST.StringHilightCommand("item", firstItem, lastItem, field);
			} else if (firstLine.getValue() !== 0) {
				translation = new AST.StringHilightCommand("line", firstItem, lastItem, field);
			}
			ast.addStatement(translation);
		},
		"ontospr": () => {
			var firstSprite = script.stack.pop();
			var secondSprite = script.stack.pop();
			translation = new AST.SpriteIntersectsExpression(firstSprite, secondSprite);
			script.stack.push(translation);
		},
		"intospr": () => {
			var firstSprite = script.stack.pop();
			var secondSprite = script.stack.pop();
			translation = new AST.SpriteWithinExpression(firstSprite, secondSprite);
			script.stack.push(translation);
		},
		"caststr": () => {
			var fieldID = script.stack.pop();
			translation = new AST.FieldReference(fieldID);
			script.stack.push(translation);
		},
		"startobj": () => {
			script.stack.pop();
			// TODO
		},
		"stopobj": () => {
			// TODO
		},
		"wraplist": () => {
			var list = script.stack.pop();
			script.stack.push(list);
		},
		"newproplist": () => {
			script.stack.pop();
			script.stack.push(new AST.TODO());
		},
		"pushint": () => {
			translation = new AST.IntLiteral(this.obj);
			script.stack.push(translation);
		},
		"newarglist": () => {
			var args = script.stack.splice(script.stack.length - this.obj, this.obj);
			translation = new AST.ArgListLiteral(args);
			script.stack.push(translation);
		},
		"newlist": () => {
			var items = script.stack.splice(script.stack.length - this.obj, this.obj);
			translation = new AST.ListLiteral(items);
			script.stack.push(translation);
		},
		"pushcons": () => {
			var literal = script.literals[this.obj]
			var type = Literal.types[literal.type];
			if (type === "string") {
				translation = new AST.StringLiteral(literal.value);
			} else if (type === "int") {
				translation = new AST.IntLiteral(literal.value);
			} else if (type === "float") {
				translation = new AST.FloatLiteral(literal.value);
			}
			script.stack.push(translation);
		},
		"pushsymb": () => {
			translation = new AST.SymbolLiteral(nameList[this.obj]);
			script.stack.push(translation);
		},
		"push_global": () => {
			translation = new AST.GlobalVarReference(nameList[this.obj]);
			script.stack.push(translation);
		},
		"push_prop": () => {
			translation = new AST.PropertyReference(nameList[this.obj]);
			script.stack.push(translation);
		},
		"push_param": () => {
			translation = new AST.ParamReference(this.handler.argumentNames[this.obj]);
			script.stack.push(translation);
		},
		"push_local": () => {
			translation = new AST.LocalVarReference(this.handler.localNames[this.obj]);
			script.stack.push(translation);
		},
		"pop_global": () => {
			var value = script.stack.pop();
			translation = new AST.AssignmentStatement(new AST.GlobalVarReference(nameList[this.obj]), value);
			ast.addStatement(translation);
		},
		"pop_prop": () => {
			var value = script.stack.pop();
			translation = new AST.AssignmentStatement(new AST.PropertyReference(nameList[this.obj]), value);
			ast.addStatement(translation);
		},
		"pop_param": () => {
			var value = script.stack.pop();
			translation = new AST.AssignmentStatement(new AST.ParamReference(this.handler.argumentNames[this.obj]), value);
			ast.addStatement(translation);
		},
		"pop_local": () => {
			var value = script.stack.pop();
			translation = new AST.AssignmentStatement(new AST.LocalVarReference(this.handler.localNames[this.obj]), value);
			ast.addStatement(translation);
		},
		"jmp": () => {},
		"endrepeat": () => {
			var parentStatement = ast.currentChunkParent;
			if (parentStatement && lastStatement.constructor === AST.IfStatement) {
				lastStatement.setType("repeat_while");
			}
		},
		"iftrue": () => {
			var condition = script.stack.pop();
			translation = new AST.IfStatement("if", condition);
			ast.addStatement(translation);
			ast.enterBlock(translation.children.block1)
			script.blockEnds.push(this.pos + this.obj);
		},
		"call_local": () => {
			var argList = script.stack.pop();
			translation = new AST.LocalCallStatement(script.handlers[this.obj].name, argList);
			if (argList.constructor === AST.ListLiteral) {
				script.stack.push(translation);
			} else {
				ast.addStatement(translation);
			}
		},
		"call_external": () => {
			var argList = script.stack.pop();
			translation = new AST.ExternalCallStatement(nameList[this.obj], argList);
			if (argList.constructor === AST.ListLiteral) {
				script.stack.push(translation);
			} else {
				ast.addStatement(translation);
			}
		},
		"callobj_old?": () => {
			// Possibly used by old Director versions?
			var object = script.stack.pop();
			var argList = script.stack.pop();
			// TODO
		},
		"op_59xx": () => {
			script.stack.pop();
			// TODO
		},
		"op_5bxx": () => {
			script.stack.pop();
			// TODO
		},
		"get": () => {
			switch (this.obj) {
				case 0x00:
					(() => {
						var id = script.stack.pop().getValue();
						if (id <= 0x05) {
							translation = new AST.MoviePropertyReference(lib.moviePropertyNames00[id]);
						} else if (id <= 0x0b) {
							translation = new AST.TimeExpression(lib.timeNames[id - 0x05]);
						} else {
							var string = script.stack.pop();
							translation = new AST.LastStringChunkExpression(lib.chunkTypeNames[id - 0x0b]);
						}
					})();
					break;
				case 0x01:
					(() => {
						var statID = script.stack.pop().getValue();
						var string = script.stack.pop();
						translation = new AST.StringChunkCountExpression(lib.chunkTypeNames[statID], string);
					})();
					break;
				case 0x02:
					(() => {
						var propertyID = script.stack.pop().getValue();
						var menuID = script.stack.pop();
						translation = new AST.MenuPropertyReference(menuID, lib.menuPropertyNames[propertyID]);
					})();
					break;
				case 0x03:
					(() => {
						var propertyID = script.stack.pop().getValue();
						var menuID = script.stack.pop();
						var itemID = script.stack.pop();
						translation = new AST.MenuItemPropertyReference(menuID, itemID, lib.menuItemPropertyNames[propertyID]);
					})();
					break;
				case 0x04:
					(() => {
						var propertyID = script.stack.pop().getValue();
						var soundID = script.stack.pop();
						translation = new AST.SoundPropertyReference(soundID, lib.soundPropertyNames[propertyID]);
					})();
					break;
				case 0x06:
					(() => {
						var propertyID = script.stack.pop().getValue();
						var spriteID = script.stack.pop();
						translation = new AST.SpritePropertyReference(spriteID, lib.spritePropertyNames[propertyID]);
					})();
					break;
				case 0x07:
					(() => {
						var settingID = script.stack.pop().getValue();
						translation = new AST.MoviePropertyReference(lib.moviePropertyNames07[settingID]);
					})();
					break;
				case 0x08:
					(() => {
						var statID = script.stack.pop().getValue();
						if (statID === 0x01) {
							transltion = new AST.MoviePropertyReference("perFrameHook");
						} else {
							translation = new AST.ObjCountExpression(lib.countableObjectNames[statID]);
						}
					})();
					break;
				case 0x09:
					(() => {
						var propertyID = script.stack.pop().getValue();
						var castID = script.stack.pop();
						translation = new AST.SpritePropertyReference(castID, lib.castPropertyNames09[propertyID]);
					})();
					break;
				case 0x0c:
					(() => {
						var propertyID = script.stack.pop().getValue();
						var fieldID = script.stack.pop();
						translation = new AST.FieldPropertyReference(fieldID, lib.fieldPropertyNames[propertyID]);
					})();
					break;
				case 0x0d:
					(() => {
						var propertyID = script.stack.pop().getValue();
						var castID = script.stack.pop();
						translation = new AST.SpritePropertyReference(castID, lib.castPropertyNames0d[propertyID]);
					})();
			}
			script.stack.push(translation);
		},
		"set": () => {
			switch (this.obj) {
				case 0x00:
					(() => {
						var id = script.stack.pop().getValue();
						var value = script.stack.pop();
						if (id <= 0x05) {
							translation = new AST.AssignmentStatement(
								new AST.MoviePropertyReference(lib.moviePropertyNames00[id]),
								value
							);
						}
					})();
					break;
				case 0x03:
					(() => {
						var propertyID = script.stack.pop().getValue();
						var value = script.stack.pop();
						var menuID = script.stack.pop();
						var itemID = script.stack.pop();
						translation = new AST.AssignmentStatement(
							new AST.MenuItemPropertyReference(menuID, itemID, lib.menuItemPropertyNames[propertyID]),
							value
						);
					})();
					break;
				case 0x04:
					(() => {
						var propertyID = script.stack.pop().getValue();
						var value = script.stack.pop();
						var soundID = script.stack.pop();
						translation = new AST.AssignmentStatement(
							new AST.SoundPropertyReference(soundID, lib.soundPropertyNames[propertyID]),
							value
						);
					})();
					break;
				case 0x06:
					(() => {
						var propertyID = script.stack.pop().getValue();
						var spriteID = script.stack.pop();
						translation = new AST.AssignmentStatement(
							new AST.SpritePropertyReference(spriteID, lib.spritePropertyNames[propertyID]),
							value
						);
					})();
					break;
				case 0x07:
					(() => {
						var settingID = script.stack.pop().getValue();
						var value = script.stack.pop();
						translation = new AST.AssignmentStatement(
							new AST.MoviePropertyReference(lib.moviePropertyNames07[settingID]),
							value
						);
					})();
					break;
				case 0x09:
					(() => {
						var propertyID = script.stack.pop().getValue();
						var value = script.stack.pop();
						var castID = script.stack.pop();
						translation = new AST.AssignmentStatement(
							new AST.SpritePropertyReference(castID, lib.castPropertyNames09[propertyID]),
							value
						);
					})();
					break;
				case 0x0c:
					(() => {
						var propertyID = script.stack.pop().getValue();
						var value = script.stack.pop();
						var fieldID = script.stack.pop();
						translation = new AST.AssignmentStatement(
							new AST.FieldPropertyReference(fieldID, lib.fieldPropertyNames[propertyID]),
							value
						);
					})();
					break;
				case 0x0d:
					(() => {
						var propertyID = script.stack.pop().getValue();
						var value = script.stack.pop();
						var castID = script.stack.pop();
						translation = new AST.AssignmentStatement(
							new AST.SpritePropertyReference(castID, lib.castPropertyNames0d[propertyID]),
							value
						);
					})();
			}
			ast.addStatement(translation);
		},
		"getmovieprop": () => {
			translation = new AST.MoviePropertyReference(nameList[this.obj]);
			script.stack.push(translation);
		},
		"setmovieprop": () => {
			var value = script.stack.pop();
			translation = new AST.AssignmentStatement(new AST.MoviePropertyReference(nameList[this.obj]), value);
			ast.addStatement(translation);
		},
		"getobjprop": () => {
			var object = script.stack.pop();
			translation = new AST.ObjPropertyReference(object, nameList[this.obj]);
			script.stack.push(translation);
		},
		"setobjprop": () => {
			var value  = script.stack.pop();
			var object = script.stack.pop();
			translation = new AST.AssignmentStatement(new AST.ObjPropertyReference(object, nameList[this.obj]), value);
			ast.addStatement(translation);
		},
		"callobj": () => {
			var argList = script.stack.pop();
			var obj = argList.shift();
			translation = new AST.ObjCallStatement(obj, nameList[this.obj], argList);
			if (argList.constructor === AST.ListLiteral) {
				script.stack.push(translation);
			} else {
				ast.addStatement(translation);
			}
		}
	};

	if (typeof bytecodeHandlers[this.opcode] === "function") {
		bytecodeHandlers[this.opcode]();
	} else {
		translation = new AST.ERROR();
		script.stack = new Stack(); // Clear stack so later bytecode won't be too screwed up
	}
	this.translation = translation;
}

/* Stack */

function Stack() {}
Stack.prototype = [];

Stack.prototype.pop = function() {
	return this.length > 0 ? Array.prototype.pop.apply(this) : new AST.ERROR();
};

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