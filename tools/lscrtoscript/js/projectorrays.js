
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
		case 1:
			opcode = "end";
			break;
		case 2:
			opcode = "nop";
			break;
		case 3:
			opcode = "pushint0";
			break;
		case 4:
			opcode = "mul";
			break;
		case 5:
			opcode = "add";
			break;
		case 6:
			opcode = "sub";
			break;
		case 7:
			opcode = "div";
			break;
		case 8:
			opcode = "mod";
			break;
		case 9:
			opcode = "inv";
			break;
		case 10:
			opcode = "joinstr";
			break;
		case 11:
			opcode = "joinpadstr";
			break;
		case 12:
			opcode = "lt";
			break;
		case 13:
			opcode = "lteq";
			break;
		case 14:
			opcode = "nteq";
			break;
		case 15:
			opcode = "eq";
			break;
		case 16:
			opcode = "gt";
			break;
		case 17:
			opcode = "gteq";
			break;
		case 18:
			opcode = "and";
			break;
		case 19:
			opcode = "or";
			break;
		case 20:
			opcode = "not";
			break;
		case 21:
			opcode = "containsstr";
			break;
		case 22:
			opcode = "contains0str";
			break;
		case 23:
			opcode = "splitstr";
			break;
		case 24:
			opcode = "lightstr";
			break;
		case 25:
			opcode = "ontospr";
			break;
		case 26:
			opcode = "intospr";
			break;
		case 27:
			opcode = "caststr";
			break;
		case 28:
			opcode = "startobj";
			break;
		case 29:
			opcode = "stopobj";
			break;
		case 31:
			opcode = "unflattenlist";
			break;
		/* Two Byte Instructions */
		case 65:
			opcode = "pushint8";
			break;
		case 66:
			opcode = "popargs";
			break;
		case 67:
			opcode = "pushlist";
			break;
		case 68:
			opcode = "push";
			break;
		case 69:
			opcode = "pushsymb";
			break;
		case 70:
			opcode = "nop";
			break;
		case 71:
			opcode = "nop";
			break;
		case 72:
			opcode = "nop";
			break;
		case 73:
			opcode = "pushg";
			break;
		case 74:
			opcode = "nop";
			break;
		case 75:
			opcode = "pushparams";
			break;
		case 76:
			opcode = "pushl";
			break;
		case 77:
			opcode = "nop";
			break;
		case 78:
			opcode = "nop";
			break;
		case 79:
			opcode = "popg";
			break;
		case 80:
			opcode = "nop";
			break;
		case 81:
			opcode = "nop";
			break;
		case 82:
			opcode = "popl";
			break;
		case 83:
			opcode = "nop";
			break;
		case 84:
			opcode = "endrepeat";
			break;
		case 85:
			opcode = "nop";
			break;
		case 86:
			opcode = "calll";
			break;
		case 87:
			opcode = "calle";
			break;
		case 88:
			opcode = "callobj";
			break;
		case 90:
			opcode = "nop";
			break;
		case 94:
			opcode = "nop";
			break;
		/* Three Byte Instructions */
		case 129:
			opcode = "pushint16";
			break;
		case 130:
			opcode = "popargs";
			break;
		case 131:
			opcode = "poplist";
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
									bytecodelength = 6;
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