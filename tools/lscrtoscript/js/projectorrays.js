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
	//var self = this;
	this.bytecodeToOpcode = function(bytecode) {
		!loggingEnabled||console.log("Bytecode to Opcode: " + bytecode);
		var opcode = "";
		// see the documentation for notes on these opcodes
		switch (bytecode[0]) {
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
				opcode = "op_1e";
				break; //TEMP NAME
			case 0x1f:
				opcode = "unflattenlist";
				break;
			/* Two Byte Instructions */
			/*
			To-do: handle special cases that determine context of the opcode,
			or what values it is reading/writing
			*/
			case 0x41:
				opcode = "pushint8";
				break;
			case 0x42:
				opcode = "popargs";
				break;
			case 0x43:
				opcode = "pushlist";
				break;
			case 0x44:
				opcode = "push";
				break;
			case 0x45:
				opcode = "pushsymb";
				break;
			case 0x46:
				opcode = "nop";
				break;
			case 0x47:
				opcode = "nop";
				break;
			case 0x48:
				opcode = "nop";
				break;
			case 0x49:
				opcode = "pushg";
				break;
			case 0x4a:
				opcode = "nop";
				break;
			case 0x4b:
				opcode = "pushparams";
				break;
			case 0x4c:
				opcode = "pushl";
				break;
			case 0x4d:
				opcode = "nop";
				break;
			case 0x4e:
				opcode = "nop";
				break;
			case 0x4f:
				opcode = "popg";
				break;
			case 0x50:
				opcode = "nop";
				break;
			case 0x51:
				opcode = "nop";
				break;
			case 0x52:
				opcode = "popl";
				break;
			case 0x53:
				opcode = "nop";
				break;
			case 0x54:
				opcode = "endrepeat";
				break;
			case 0x55:
				opcode = "nop";
				break;
			case 0x56:
				opcode = "calll";
				break;
			case 0x57:
				opcode = "calle";
				break;
			case 0x58:
				opcode = "callobj";
				break;
			case 0x59:
				opcode = "op_59xx";
				break; //TEMP NAME
			case 0x5a:
				opcode = "nop";
				break;
			case 0x5b:
				opcode = "op_5bxx";
				break; //TEMP NAME
			case 0x5c:
				opcode = "get";
				break; //needs values from stack to determine what it's getting
				//that said, dissassembly of this instruction is not yet complete
			case 0x5d:
				opcode = "set";
				break; //needs values from stack to determine what it's setting
				//that said, dissassembly of this instruction is not yet complete
			case 0x5e:
				opcode = "nop";
				break;
			case 0x5f:
				opcode = "getprop";
				break;
			
			case 0x60:
				opcode = "setprop";
				break;
			case 0x61:
				opcode = "getobjprop";
				break;
			case 0x63:
				opcode = "setobjprop";
				break;
			case 0x64:
				opcode = "op_64xx";
				break;
			case 0x65:
				opcode = "op_65xx";
				break;
			case 0x66:
				opcode = "op_66xx";
				break;
			/* Three Byte Instructions */
			/*
			To-do: decode the bytes XX YY as a ushort to complete instruction dissassembly
			*/
			case 0x81:
				opcode = "pushint16";
				break;
			case 0x82:
				opcode = "popargs";
				break;
			case 0x83:
				opcode = "poplist";
				break;
			case 0x93:
				opcode = "jmp";
				break;
			case 0x95:
				opcode = "whiletrue";
				break;
			default:
				opcode = "analysis failed";
			}
		return opcode.toUpperCase();
	}
	
	this.chunk = function(MainDataStream, name, len, offset, padding, unknown0, link) {
		!loggingEnabled||console.log("Constructing Chunk: " + name);
		// check if this is the chunk we are expecting
		// we're using this instead of readString because we need to respect endianness
		var validName = DataStream.createStringFromArray(MainDataStream.readUint8Array(4));
		if (name == "RIFX") {
			//if (validName.substring(0, 2) == "MZ") {
				// handle Projector HERE
			//}
			if(validName == "XFIR") {
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
			throw new InvalidDirectorFileError("Expected '" + this.name + "' with a length of " + this.len + " and offset of " + this.offset + " chunk but found an '" + validName + "' chunk with a length of " + validLen + " and offset of " + validOffset + ".");
		}
		if (this.name != "RIFX") {
		} else {
			// we're going to pretend RIFX is only 12 bytes long
			// this is because offsets are relative to the beginning of the file
			// whereas everywhere else they're relative to chunk start
			this.len = 12;
		}
		// copy the contents of the chunk to a new DataStream (minus name/length as that's not what offsets are usually relative to)
		this.ChunkDataStream = new DataStream();
		this.ChunkDataStream.endianness = MainDataStream.endianness;
		this.ChunkDataStream.writeUint8Array(MainDataStream.mapUint8Array(this.len - 8));
		this.ChunkDataStream.seek(0);
		
		// read in the values pertaining to this chunk
		// this will be a huge part of the code
		// TODO: insert notes from FormatNotes.txt here for a quicker reference
		switch (name) {
			case "RIFX":
				this.codec = DataStream.createStringFromArray(this.ChunkDataStream.readUint8Array(4));
				break;
			case "imap":
				this.mmapCount = this.ChunkDataStream.readUint32();
				this.mmapArray = this.ChunkDataStream.readUint32Array(this.mmapCount);
				break;
			case "mmap":
				// read in mmap here
				// these names are taken from Schockabsorber, I don't know what they do
				this.unknown0 = this.ChunkDataStream.readUint16();
				this.unknown1 = this.ChunkDataStream.readUint16();
				// possible one of the unknown mmap entries determines why an unused item is there?
				// it also seems code comments can be inserted after mmap after chunkCount is over, it may warrant investigation
				this.chunkCount = this.ChunkDataStream.readInt32();
				this.chunkCountUsed = this.ChunkDataStream.readInt32();
				this.junkPointer = this.ChunkDataStream.readInt32();
				this.unknown2 = this.ChunkDataStream.readInt32();
				this.freePointer = this.ChunkDataStream.readInt32();
				this.mapArray = new Array();
				// seems chunkCountUsed is used here, so what is chunkCount for?
				for(var i=0,len=this.chunkCountUsed;i<len;i++) {
					// don't actually generate new chunk objects here, just read in data
					this.mapArray[i] = [];
					this.mapArray[i]["name"] = DataStream.createStringFromArray(this.ChunkDataStream.readUint8Array(4));
					alert(i + " " + len + " " + this.mapArray[i]["name"]);
					this.mapArray[i]["len"] = this.ChunkDataStream.readUint32();
					this.mapArray[i]["offset"] = this.ChunkDataStream.readUint32();
					this.mapArray[i]["padding"] = this.ChunkDataStream.readInt16();
					this.mapArray[i]["unknown0"] = this.ChunkDataStream.readInt16();
					this.mapArray[i]["link"] = this.ChunkDataStream.readInt32();
					// we don't care about free or junk chunks, go back and overwrite them
					// don't move this if block up - the cursor has to be in the right position to read the next chunk
					if (this.mapArray[i]["name"] == "free" || this.mapArray[i]["name"] == "junk") {
						// delete this chunk
						this.mapArray.splice(i, 1);
						i--;
						len--;
					}
				}
				break;
		}
	}
	
	this.chunk.prototype.validate = function(name, validName, len, validLen, offset, validOffset) {
		!loggingEnabled||console.log("Validating Chunk: " + name);
		if (name != validName || len != validLen || offset != validOffset) {
			return false;
		} else {
			return true;
		}
	}
	
	// at the beginning of the file, we need to break some of the typical rules. We don't know names, lengths and offsets yet.
	this.lookupMmap = function(ShockwaveMovieDataStream) {
		!loggingEnabled||console.log("Looking Up mmap");
		// valid length is undefined because we have not yet reached mmap
		// however, it will be filled automatically in chunk's constructor
		this.chunkArray["RIFX"][0] = new this.chunk(ShockwaveMovieDataStream, "RIFX");
		// we can only open DIR or DXR
		// we'll read OpenShockwaveMovie from ShockwaveMovieDataStream because OpenShockwaveMovie is an exception to the normal rules
		if (this.chunkArray["RIFX"][0].codec != "MV93") {
			throw this.PathTooNewError("Codec " + this.chunkArray["RIFX"][0].codec + " unsupported.");
		}
		// the next chunk should be imap
		// this HAS to be ShockwaveMovieDataStream for the OFFSET check to be correct
		// we will continue to use it because in this implementation RIFX doesn't contain it
		this.chunkArray["imap"][0] = new this.chunk(ShockwaveMovieDataStream, "imap", undefined, 12);
		// go to where imap says mmap is (ignoring the possibility of multiple mmaps for now)
		ShockwaveMovieDataStream.seek(this.chunkArray["imap"][0].mmapArray[0]);
		// interpret the numbers in the mmap - but don't actually find the chunks in it yet
		this.chunkArray["mmap"].push(new this.chunk(ShockwaveMovieDataStream, "mmap", undefined, this.chunkArray["imap"][0].mmapArray[0]));
		// add chunks in the mmap to the chunkArray HERE
		// make sure to account for chunks with existing names, lengths and offsets
	}
	
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
			window.parent.right.document.getElementById("Lscrtable").innerHTML = "<tr><th>bytecode</th><th>opcode</th></tr>";
			// with DataStream.js
			var ShockwaveMovieDataStream = new DataStream(e.target.result);
			// we set this properly when we create the RIFX chunk
			ShockwaveMovieDataStream.endianness = false;
			// for some reason this is passed as a reference, I guess my brain is melting
			OpenShockwaveMovie.lookupMmap(ShockwaveMovieDataStream);
			// OpenShockwaveMovie should be the offset for mmap
			//if (typeof chunkArray[name] === 'undefined') {
			//chunkArray[name] = new Array();
			//}
			return;
			// OpenShockwaveMovie is for Lscr chunk
			// seeks to the offset of the handlers. Currently only grabs the first handler in the script.
			ShockwaveMovieDataStream.seek(74);
			var HandlersOffset = ShockwaveMovieDataStream.readUint32();
			ShockwaveMovieDataStream.seek(HandlersOffset+4);
			// the length of the code in the handler and the offset to it (ignoring scripts can have multiple handlers for now)
			var HandlerLength = ShockwaveMovieDataStream.readUint32();
			var HandlerOffset = ShockwaveMovieDataStream.readUint32();
			ShockwaveMovieDataStream.seek(HandlerOffset);
			// loop while there's still more code left
			var script = new Array();
			while (ShockwaveMovieDataStream.position < HandlerOffset + HandlerLength) {
				// read the first byte to convert to an opcode
				var bytecode = ShockwaveMovieDataStream.readUint8();
				// instructions can be one, two or three bytes
				var bytecodelength = 1;
				if (bytecode > 128) {
					bytecodelength = 3;
				} else {
					if (bytecode > 64) {
						//if (bytecode != 68) {
							bytecodelength = 2;
						//} else {
							// 0x44 is always six bytes long because it's a rebel
							//bytecodelength = 6;
						//}
					}
				}
				// now make OpenShockwaveMovie an array of all bytes in the instruction
				bytecode = [bytecode];
				while (bytecode.length < bytecodelength) {
					bytecode.push(ShockwaveMovieDataStream.readUint8());
				}
				script.push(bytecode);
				parent.right.document.getElementById("Lscrtable").innerHTML += "<tr><td>" + bytecode.join(" ") + "</td><td>" + convertBytecodeToOpcode(bytecode) + "</td></tr>";
			}
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
	// in the case that multiple files are chosen we can't draw more than one
	// however, if the user wants to convert files we can do more than one at once
}

// Draw as RAWRGB555, the way the format is on the CD. It also can draw the image to the canvas while it's hidden and use that to save it as a JPEG.
// It's best to implement it this way, as BGR533 can convert to RGB555 with no quality loss, but not vice versa.
// Also 3D Groove went on to use JPEG in this format's place making it the best format to save out to, so it'll be compatible with the later versions of the Groove Xtra.
var movie = null;
function createNewOpenShockwaveMovie() {
	!loggingEnabled||console.log("Creating New Shockwave Movie");
	if (!!files) {
		movie = new OpenShockwaveMovie(files[0]);
	} else {
		window.alert("You need to choose a file first.");
	}
}

document.form1.Lscr.onchange = setFiles;