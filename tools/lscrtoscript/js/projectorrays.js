
// When a user uploads a file, or if the user refreshes the page and a file is still loaded, send it to a variable.
var files = null;
if (!!document.form1.Lscr.files[0]) {
	files = document.form1.Lscr.files;
}

function setFiles(e) {
	e=e||event;
	files = e.target.files;
}

function convertBytecodeToOpcode(bytecode) {
	var opcode = "";
	// see the documentation for notes on these opcodes
	switch (bytecode[0]) {
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

// Draw as RAWRGB555, the way the format is on the CD. It also can draw the image to the canvas while it's hidden and use that to save it as a JPEG.
// It's best to implement it this way, as BGR533 can convert to RGB555 with no quality loss, but not vice versa.
// Also 3D Groove went on to use JPEG in this format's place making it the best format to save out to, so it'll be compatible with the later versions of the Groove Xtra.
function convertLscrToLingoScript(save) {
	if (!!files) {
		for (i=0;i<files.length;i++) {
			var LscrReader = new FileReader();
			// the file takes a while to upload so you have to do this.
			// files[i] which exists because of the for loop, looping through each uploaded file, is passed into this onload function
			// as well as the save variable, as the actual desicion is made later
			LscrReader.onload = (function(file, save) {
				// when I first wrote a converter in JS I didn't even know what a "closure" was, lol
				return function(e) {
					e=e||event;
					parent.right.document.getElementById("Lscrtable").innerHTML = "<tr><th>bytecode</th><th>opcode</th></tr>";
					// with DataStream.js
					var LscrDataStream = new DataStream(e.target.result);
					// this is always little endian afaik but hey that's just a theory a FILE FORMAT THEORY
					LscrDataStream.endianness = false;
					// seeks to the offset of the handlers. Currently only grabs the first handler in the script.
					LscrDataStream.seek(74);
					var HandlersOffset = LscrDataStream.readUint32();
					LscrDataStream.seek(HandlersOffset+4);
					// the length of the code in the handler and the offset to it (ignoring scripts can have multiple handlers for now)
					var HandlerLength = LscrDataStream.readUint32();
					var HandlerOffset = LscrDataStream.readUint32();
					LscrDataStream.seek(HandlerOffset);
					// loop while there's still more code left
					var script = new Array();
					while (LscrDataStream.position < HandlerOffset + HandlerLength) {
						// read the first byte to convert to an opcode
						var bytecode = LscrDataStream.readUint8();
						// instructions can be one, two or three bytes
						var bytecodelength = 1;
						if (bytecode > 128) {
							bytecodelength = 3;
						} else {
							if (bytecode > 64) {
								if (bytecode != 68) {
									bytecodelength = 2;
								} else {
									// 0x44 is always six bytes long because it's a rebel
									bytecodelength = 2;
								}
							}
						}
						// now make this an array of all bytes in the instruction
						bytecode = [bytecode];
						while (bytecode.length < bytecodelength) {
							bytecode.push(LscrDataStream.readUint8());
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
			})(files[i], save);
			LscrReader.readAsArrayBuffer(files[i]);
			// in the case that multiple files are chosen we can't draw more than one
			// however, if the user wants to convert files we can do more than one at once
			if (i + 1 != files.length && !save) {
				window.alert("You chose more than one file but only the first one will be converted.");
				break;
			}
		}
	} else {
		window.alert("You need to choose a file first.");
	}
}

document.form1.Lscr.onchange = setFiles;