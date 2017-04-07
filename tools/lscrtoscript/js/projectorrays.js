// When a user uploads a file, or if the user refreshes the page and a file is still loaded, send it to a variable.
var files = null;
if (!!document.form1.Lscr.files[0]) {
	files = document.form1.Lscr.files;
}

function setFiles(e) {
	e=e||event;
	files = e.target.files;
}

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

function OpenShockwaveMovie(file) {
	// you know you want to
	var Main = this;
	
	this.chunk = function(MainDataStream, name, len, offset, padding, unknown0, link) {
		!loggingEnabled||console.log("Constructing Chunk: " + name);
		// check if this is the chunk we are expecting
		// we're using this instead of readString because we need to respect endianness
		var validName = DataStream.createStringFromArray(MainDataStream.readUint8Array(4));
		if (name == "RIFX") {
			//if (validName.substring(0, 2) == "MZ") {
				// handle Projector HERE
			//}
			if (validName == "XFIR") {
				MainDataStream.endianness = true;
			}
		}
		// check if it has the length the mmap table specifies
		var validLen = MainDataStream.readUint32();
		// the offset is checked against, well, our offset
		var validOffset = MainDataStream.position - 8;
		// if we don't know what to expect, grab the name of the chunk
		if (typeof name !== 'undefined') {
			this.name = name;
		} else {
			this.name = validName;
		}
		// ignore validation if we have not yet reached the mmap section
		if (typeof len !== 'undefined') {
			this.len = len;
		} else {
			this.len = validLen;
		}
		// use our current offset if we have not yet reached the mmap section
		if (typeof offset !== 'undefined') {
			this.offset = offset;
		} else {
			this.offset = validOffset;
		}
		// padding can't be checked, so let's give it a default value if we don't yet know it
		if (typeof padding !== 'undefined') {
			this.padding = padding;
		} else {
			// padding is usually zero
			if (this.name != "free" && this.name != "junk") {
				this.padding = 0;
			} else {
				this.padding = 12;
			}
		}
		if (typeof unknown0 !== 'undefined') {
			this.unknown0 = unknown0;
		} else {
			this.unknown0 = undefined;
		}
		if (typeof link !== 'undefined') {
			this.link = link;
		} else {
			this.link = undefined;
		}
		if (!this.validate(this.name, validName, this.len, validLen, this.offset, validOffset)) {
			throw new InvalidDirectorFileError("At offset " + validOffset + ", expected '" + this.name + "' chunk with a length of " + this.len + " and offset of " + this.offset + " but found an '" + validName + "' chunk with a length of " + validLen + ".");
		}
		if (this.name != "RIFX") {
		} else {
			// we're going to pretend RIFX is only 12 bytes long
			// this is because offsets are relative to the beginning of the file
			// whereas everywhere else they're relative to chunk start
			this.len = 4;
		}
		// copy the contents of the chunk to a new DataStream (minus name/length as that's not what offsets are usually relative to)
		this.ChunkDataStream = new DataStream();
		this.ChunkDataStream.endianness = MainDataStream.endianness;
		this.ChunkDataStream.writeUint8Array(MainDataStream.mapUint8Array(this.len/* - 8*/));
		this.ChunkDataStream.seek(0);
		
		// read in the values pertaining to this chunk
		// this will be a huge part of the code
		// TODO: insert notes from FormatNotes.txt here for a quicker reference
		this.read = function() {
			var result;
			switch (this.name) {
				case "RIFX":
					result = new Main.Meta();
					result.codec = DataStream.createStringFromArray(this.ChunkDataStream.readUint8Array(4));
					break;
				case "imap":
					result = new Main.iMap();
					result.mmapCount = this.ChunkDataStream.readUint32();
					result.mmapArray = this.ChunkDataStream.readUint32Array(result.mmapCount);
					break;
				case "mmap":
					result = new Main.mMap();
					// read in mmap here
					// these names are taken from Schockabsorber, I don't know what they do
					result.unknown0 = this.ChunkDataStream.readUint16();
					result.unknown1 = this.ChunkDataStream.readUint16();
					// possible one of the unknown mmap entries determines why an unused item is there?
					// it also seems code comments can be inserted after mmap after chunkCount is over, it may warrant investigation
					result.chunkCount = this.ChunkDataStream.readInt32();
					result.chunkCountUsed = this.ChunkDataStream.readInt32();
					result.junkPointer = this.ChunkDataStream.readInt32();
					result.unknown2 = this.ChunkDataStream.readInt32();
					result.freePointer = this.ChunkDataStream.readInt32();
					result.mapArray = new Array();
					// seems chunkCountUsed is used here, so what is chunkCount for?
					for(var i=0,len=result.chunkCountUsed;i<len;i++) {
						// don't actually generate new chunk objects here, just read in data
						result.mapArray[i] = [];
						result.mapArray[i]["name"] = DataStream.createStringFromArray(this.ChunkDataStream.readUint8Array(4));
						//alert(i + " " + len + " " + this.mapArray[i]["name"]);
						result.mapArray[i]["len"] = this.ChunkDataStream.readUint32();
						result.mapArray[i]["offset"] = this.ChunkDataStream.readUint32();
						result.mapArray[i]["padding"] = this.ChunkDataStream.readInt16();
						result.mapArray[i]["unknown0"] = this.ChunkDataStream.readInt16();
						result.mapArray[i]["link"] = this.ChunkDataStream.readInt32();
						// we don't care about free or junk chunks, go back and overwrite them
						// don't move this if block up - the cursor has to be in the right position to read the next chunk
						if (result.mapArray[i]["name"] == "free" || result.mapArray[i]["name"] == "junk") {
							// delete this chunk
							result.mapArray.splice(i, 1);
							i--;
							len--;
						}
					}
					break;
				case "Lscr":
					result = new Main.LingoScript();
					this.ChunkDataStream.seek(74);
					result.map = new Array();
					result.map["handlers"] = this.ChunkDataStream.readUint32();
					this.ChunkDataStream.seek(result.map["handlers"] + 4);
					// the length of the code in the handler and the offset to it (ignoring scripts can have multiple handlers for now)
					result.handlers = new Array();
					result.handlers[0] = new result.handler();
					result.handlers[0].len = this.ChunkDataStream.readUint32();
					result.handlers[0].offset = this.ChunkDataStream.readUint32();
					this.ChunkDataStream.seek(result.handlers[0].offset);
					result.handlers[0].bytecodeArray = new Array();
					// seeks to the offset of the handlers. Currently only grabs the first handler in the script.
					// loop while there's still more code left
					var pos = null;
					while (this.ChunkDataStream.position < result.handlers[0].offset + result.handlers[0].len) {
						// read the first byte to convert to an opcode
						pos = new result.handlers[0].bytecode(this.ChunkDataStream.readUint8());
						// instructions can be one, two or three bytes
						if (pos.val >= 192) {
						pos.obj = this.ChunkDataStream.readUint24();
						} else {
							if (pos.val >= 128) {
								pos.obj = this.ChunkDataStream.readUint16();
							} else {
								if (pos.val >= 64) {
									pos.obj = this.ChunkDataStream.readUint8();
								}
							}
						}
						result.handlers[0].bytecodeArray.push(pos);
					}
					break;
			}
			return result;
		}
		return this.read();
	}
	
	this.chunk.prototype.validate = function(name, validName, len, validLen, offset, validOffset) {
		!loggingEnabled||console.log("Validating Chunk: " + name);
		if (name != validName || len != validLen || offset != validOffset) {
			return false;
		} else {
			return true;
		}
	}
	
	this.Meta = function() {
	}
	
	this.iMap = function() {
	}
	
	this.mMap = function() {
	}
	
	this.cast = function() {
	}
	
	this.LingoScript = function() {
		// add handlers, variables...
		
		this.handler = function() {
			this.bytecodeArray = new Array();
		}
		
		this.handler.prototype.bytecode = function(val, obj) {
			if (typeof val !== 'undefined') {
				this.val = val;
			} else {
				this.val = 0;
			}
			if (typeof obj !== 'undefined') {
				this.obj = obj;
			} else {
				this.obj = null;
			}
		}
		
		this.handler.prototype.bytecode.prototype.toOpcode = function() {
			!loggingEnabled||console.log("Bytecode to Opcode: " + bytecode);
			var opcode = "";
			// see the documentation for notes on these opcodes
			switch (this.val) {
				// TODO: copy the comments from OP.txt into the code for a quicker reference
				/* Single Byte Instructions */
				case 0x1:
					opcode = "ret";
					break;
				case 0x2:
					opcode = "nop";
					break;
				case 0x3:
					opcode = "pushint0";
					break;
				case 0x4:
					opcode = "mul";
					break;
				case 0x5:
					opcode = "add";
					break;
				case 0x6:
					opcode = "sub";
					break;
				case 0x7:
					opcode = "div";
					break;
				case 0x8:
					opcode = "mod";
					break;
				case 0x9:
					opcode = "inv";
					break;
				case 0xa:
					opcode = "joinstr";
					break;
				case 0xb:
					opcode = "joinpadstr";
					break;
				case 0xc:
					opcode = "lt";
					break;
				case 0xd:
					opcode = "lteq";
					break;
				case 0xe:
					opcode = "nteq";
					break;
				case 0xf:
					opcode = "eq";
					break;
				case 0x10:
					opcode = "gt";
					break;
				case 0x11:
					opcode = "gteq";
					break;
				case 0x12:
					opcode = "and";
					break;
				case 0x13:
					opcode = "or";
					break;
				case 0x14:
					opcode = "not";
					break;
				case 0x15:
					opcode = "containsstr";
					break;
				case 0x16:
					opcode = "contains0str";
					break;
				case 0x17:
					opcode = "splitstr";
					break;
				case 0x18:
					opcode = "lightstr";
					break;
				case 0x19:
					opcode = "ontospr";
					break;
				case 0x1a:
					opcode = "intospr";
					break;
				case 0x1b:
					opcode = "caststr";
					break;
				case 0x1c:
					opcode = "startobj";
					break;
				case 0x1d:
					opcode = "stopobj";
					break;
				case 0x1e:
					opcode = "wraplist";
					break; // NAME NOT CERTAINLY SET IN STONE JUST YET...
				case 0x1f:
					opcode = "newproplist";
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
					break;
				case 0x81:
					opcode = "pushshort";
					break;
				case 0xc1:
					opcode = "pushint24";
					break;
				case 0x42:
				case 0x82:
				case 0xc2:
					opcode = "newarglist";
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
					opcode = "pushglob";
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
					break;
				case 0x4c:
				case 0x8c:
				case 0xcc:
					opcode = "pushloc";
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
					opcode = "popglob";
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
					opcode = "poploc";
					break;
				case 0x53:
				case 0x93:
				case 0xd3:
					opcode = "jmp";
					break;
				case 0x54:
				case 0x94:
				case 0xd4:
					opcode = "endrepeat";
					break;
				case 0x55:
				case 0x95:
				case 0xd5:
					opcode = "iftrue";
					break;
				case 0x56:
				case 0x96:
				case 0xd6:
					opcode = "call_loc";
					break;
				case 0x57:
				case 0x97:
				case 0xd7:
					opcode = "calle";
					break;
				case 0x58:
				case 0x98:
				case 0xd8:
					opcode = "callobj";
					break;
				case 0x59:
					opcode = "op_59xx";
					break; //TEMP NAME
				/*
				case 0x5a:
				case 0x9a:
				case 0xda:
					opcode = "nop";
					break;
				*/
				/*
				case 0x5b:
				case 0x9b:
				case 0xdb:
					opcode = "op_5bxx";
					break; //TEMP NAME
				*/
				case 0x5c:
				case 0x9c:
				case 0xdc:
					opcode = "get";
					break; // needs values from stack to determine what it's getting
						   // that said, dissassembly of this instruction is not yet complete
				case 0x5d:
				case 0x9d:
				case 0xdd:
					opcode = "set";
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
					break;
				case 0x60:
				case 0xa0:
				case 0xe0:
					opcode = "setprop";
					break;
				case 0x61:
				case 0xa1:
				case 0xe1:
					opcode = "getobjprop";
					break;
				case 0x63:
				case 0xa3:
				case 0xe3:
					opcode = "setobjprop";
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
			return opcode.toUpperCase();
		}
		
		// needs serious work within new model
		!loggingEnabled||console.log("Constructing Lingo Script");
		this.handler.prototype.write = function() {
			var towrite = "<tr><th>bytecode</th><th>opcode</th></tr>";
			for(var i=0,len=this.bytecodeArray.length;i<len;i++) {
				towrite += "<tr><td>" + this.bytecodeArray[i].val + "" + (this.bytecodeArray[i].obj!==null?" "+this.bytecodeArray[i].obj:"") + "</td><td>" + this.bytecodeArray[i].toOpcode() + "" + (this.bytecodeArray[i].obj!==null?" "+this.bytecodeArray[i].obj:"") + "</td></tr>";
			}
			return towrite;
		}
	}
	
	this.LingoScript.prototype = this.cast;
	
	// at the beginning of the file, we need to break some of the typical rules. We don't know names, lengths and offsets yet.
	this.lookupMmap = function(DirectorFileDataStream) {
		!loggingEnabled||console.log("Looking Up mmap");
		// valid length is undefined because we have not yet reached mmap
		// however, it will be filled automatically in chunk's constructor
		this.chunkArray["RIFX"][0] = new this.chunk(DirectorFileDataStream, "RIFX");
		// we can only open DIR or DXR
		// we'll read OpenShockwaveMovie from DirectorFileDataStream because OpenShockwaveMovie is an exception to the normal rules
		if (this.chunkArray["RIFX"][0].codec != "MV93") {
			throw PathTooNewError("Codec " + this.chunkArray["RIFX"][0].codec + " unsupported.");
		}
		// the next chunk should be imap
		// this HAS to be DirectorFileDataStream for the OFFSET check to be correct
		// we will continue to use it because in this implementation RIFX doesn't contain it
		this.chunkArray["imap"][0] = new this.chunk(DirectorFileDataStream, "imap", undefined, 12);
		// go to where imap says mmap is (ignoring the possibility of multiple mmaps for now)
		DirectorFileDataStream.seek(this.chunkArray["imap"][0].mmapArray[0]);
		// interpret the numbers in the mmap - but don't actually find the chunks in it yet
		this.chunkArray["mmap"].push(new this.chunk(DirectorFileDataStream, "mmap", undefined, this.chunkArray["imap"][0].mmapArray[0]));
		// add chunks in the mmap to the chunkArray HERE
		// make sure to account for chunks with existing names, lengths and offsets
		DirectorFileDataStream.position = 0;
		for(var i=0,len=this.chunkArray["mmap"][0].mapArray.length;i<len;i++) {
			if (this.chunkArray["mmap"][0].mapArray[i]["name"] != "mmap") {
				DirectorFileDataStream.seek(this.chunkArray["mmap"][0].mapArray[i]["offset"]);
				if (!!!this.chunkArray[this.chunkArray["mmap"][0].mapArray[i]["name"]]) {
					this.chunkArray[this.chunkArray["mmap"][0].mapArray[i]["name"]] = new Array();
				}
				this.chunkArray[this.chunkArray["mmap"][0].mapArray[i]["name"]].push(new this.chunk(DirectorFileDataStream, this.chunkArray["mmap"][0].mapArray[i]["name"], this.chunkArray["mmap"][0].mapArray[i]["len"], this.chunkArray["mmap"][0].mapArray[i]["offset"], this.chunkArray["mmap"][0].mapArray[i]["padding"], this.chunkArray["mmap"][0].mapArray[i]["unknown0"], this.chunkArray["mmap"][0].mapArray[i]["link"]));
			} else {
				DirectorFileDataStream.position += this.chunkArray["mmap"][0].len + 8;
			}
		}
		// uncomment for a demo
		if (!this.chunkArray["Lscr"]) {
		} else {
			parent.right.document.getElementById("Lscrtable").innerHTML = this.chunkArray["Lscr"][0].handlers[0].write();
		}
	}
	
	if (typeof file !== 'undefined') {
		!loggingEnabled||console.log("Constructing Open Shockwave Movie");
		this.chunkArray = new Array();
		this.chunkArray["RIFX"] = new Array();
		this.chunkArray["imap"] = new Array();
		this.chunkArray["mmap"] = new Array();

		var ShockwaveMovieReader = new FileReader();
		// the file takes a while to upload so you have to do this.
		// files[i] which exists because of the for loop, looping through each uploaded file, is passed into this onload function
		// as well as the save variable, as the actual desicion is made later
		ShockwaveMovieReader.onload = (function(OpenShockwaveMovie, file) {
			return function(e) {
				e=e||event;
				!loggingEnabled||console.log("ShockwaveMovieReader onLoad");
				// we'll be displaying content in the right frame
				// with DataStream.js
				var DirectorFileDataStream = new DataStream(e.target.result);
				// we set this properly when we create the RIFX chunk
				DirectorFileDataStream.endianness = false;
				// for some reason this is passed as a reference, I guess my brain is melting
				OpenShockwaveMovie.lookupMmap(DirectorFileDataStream);
				// OpenShockwaveMovie should be the offset for mmap
				//if (typeof chunkArray[name] === 'undefined') {
				//chunkArray[name] = new Array();
				//}
				/*
				if (save) {
					var link = document.createElement('a');
					link.href = cvs.toDataURL("image/jpeg");
					link.setAttribute('download', file.name + ".JPG");
					document.getElementsByTagName("body")[0].appendChild(link);
					// Firefox
					if (document.createEvent) {
						var event = document.createEvent("MouseEvents");
						event.initEvent("click", true, true);
						link.dispatchEvent(event);
					}
					// IE
					else if (link.click) {
						link.click();
					}
					link.parentNode.removeChild(link);
				}
				*/
			};
		})(this, file);
		ShockwaveMovieReader.readAsArrayBuffer(file);
	}
	// in the case that multiple files are chosen we can't draw more than one
	// however, if the user wants to convert files we can do more than one at once
}

// Draw as RAWRGB555, the way the format is on the CD. It also can draw the image to the canvas while it's hidden and use that to save it as a JPEG.
// It's best to implement it this way, as BGR533 can convert to RGB555 with no quality loss, but not vice versa.
// Also 3D Groove went on to use JPEG in this format's place making it the best format to save out to, so it'll be compatible with the later versions of the Groove Xtra.
var movie = null;
function createNewOpenShockwaveMovie() {
	!loggingEnabled||console.log("Creating New Open Shockwave Movie");
	if (!!files) {
		movie = new OpenShockwaveMovie(files[0]);
	} else {
		window.alert("You need to choose a file first.");
	}
}

document.form1.Lscr.onchange = setFiles;