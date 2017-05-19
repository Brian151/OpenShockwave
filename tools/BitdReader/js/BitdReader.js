// SeismoGRAPH: Bitmap NUU to PNG
// Scripted by TOMYSSHADOW
// Version 1.1.0
var loggingEnabled = false;

// When a user uploads a file, or if the user refreshes the page and a file is still loaded, send it to a variable.
function NUU2PNG() {
var files = null;
if (!!document.getElementById("NUU").files[0]) {
	files = document.getElementById("NUU").files;
}

function setFiles(e) {
	e=e||event;
	files = e.target.files;
	if (!!((cvs = document.getElementById("NUUcanvas")) && (ctx = cvs.getContext("2d")))) {
		cvs.style.visibility = "hidden";
	} else {
		window.alert("Your browser does not support the HTML5 canvas element.");
	}
}

// Draw as NUU, the way the format is on the CD. It also can draw the image to the canvas while it's hidden and use that to save it as a PNG.
this.drawNUU = function(save) {
	if (!!files) {
		for (i=0;i<files.length;i++) {
			var NUUReader = new FileReader();
			// the file takes a while to upload so you have to do this.
			// files[i] which exists because of the for loop, looping through each uploaded file, is passed into this onload function
			// as well as the save variable, as the actual desicion is made later
			NUUReader.onload = (function(file, save) {
				// I don't know why but this needs to be here to work
				return function(e) {
					e=e||event;
					// with DataStream.js
					var NUUDataStream = new DataStream(e.target.result);
					// this is always big endian afaik but hey that's just a theory a FILE FORMAT THEORY
					NUUDataStream.endianness = false;
					if (!!((cvs = document.getElementById("NUUcanvas")) && (ctx = cvs.getContext("2d")))) {
						// if the user just wants to save this image out to PNG, don't show the canvas
						if (!save) {
							cvs.style.visibility = "visible";
						} else {
							cvs.style.visibility = "hidden";
						}
						// width
						var width = parseInt(document.getElementById("width").value);
						var height = parseInt(document.getElementById("height").value);
						if (!width || !height) {
							window.alert("Please enter the width and height of the image.");
							return;
						}
						var bitdepth = document.getElementById("bitdepth").selectedIndex;
						var hasalpha = bitdepth == 4;
						// it would seem alpha values are reversed if every alpha value is transparent
						var reversealpha = true;
						// for bits
						var bit = 0;
						// length of next literal run or run length
						var len = 0;
						// variable to contain colour for RLE
						var rgbColour = 0;
						// array containing rgba
						var rgbColours = new Array(new Array(), new Array(), new Array(), new Array());
						// for rendering the image to the canvas, the current position
						var x = 0;
						var y = 0;
						// the channel we're dealing with
						var channel = 0;
						// the length of the current line, which will help us determine which channel we're dealing with
						var i = 0;
						// loop through the rest of the file, taking each colour, breaking it down into RGB and drawing each pixel to the canvas
						while (!NUUDataStream.isEof()) {
							len = NUUDataStream.readUint8();
							switch (bitdepth) {
								case 0:
								for(var j=0;j<8;j++) {
									bit = ((len & (1 << (7 - j))) >> (7 - j));
									!loggingEnabled||console.log("Raw - len " + len + " - bit " + bit);
									rgbColours[0].push(bit?255:0);
								}
								break;
								default:
								var widthFix = (((bitdepth==1||bitdepth==2)&&width%2)?width-1:width);
								if (0x101 - len - (bitdepth == 1 || bitdepth == 2) > 0x7F) {
									// literal run
									len++;
									!loggingEnabled||console.log("LR - channel " + channel + " - len " + len);
									for(var j=0;j<len;j++) {
										if(NUUDataStream.isEof()){break;}
										// continually read the next colours for this channel
										rgbColour = NUUDataStream.readUint8();
										if (hasalpha && reversealpha && !channel && rgbColour) {
											reversealpha = false;
										}
										rgbColours[channel].push(rgbColour);
										// once we've found the value for all pixels in the line for this channel, move to next channel
										if (++i >= widthFix) {
											channel = (++channel % (3 + hasalpha));
											i=0;
										}
									}
								} else {
									// run length encoding
									len = 0x101 - len;
									!loggingEnabled||console.log("RLE - channel " + channel + " - len " + len);
									if(NUUDataStream.isEof()){break;}
									// read the next colour for this channel once, then repeat it len times
									rgbColour = NUUDataStream.readUint8();
									if (hasalpha && reversealpha && !channel && rgbColour) {
										reversealpha = false;
									}
									for(var j=0;j<len;j++) {
										rgbColours[channel].push(rgbColour);
										// once we've found the value for all pixels in the line for this channel, move to next channel
										if (++i >= widthFix) {
											channel = (++channel % (3 + hasalpha));
											i=0;
										}
									}
								}
							}
						}
						if (!bitdepth) {
							rgbColours[1] = rgbColours[2] = rgbColours[0];
						}
						//!loggingEnabled||console.log(rgbColours);
						cvs.width = width;
						// any channel - they should be the same length
						cvs.height = height;
						//cvs.height = Math.ceil(Math.min(rgbColours[0].length, rgbColours[1].length, rgbColours[2].length, rgbColours[3].length) / width);
						for(var j=0,len2=Math.min(rgbColours[0].length, rgbColours[1].length, rgbColours[2].length);j<len2;j++) {
							// sometimes I think alpha is reversed where 0 means opaque and 255 means transparent?
							if (reversealpha) {
								rgbColours[0][j] = 255 - rgbColours[0][j];
							}
							ctx.fillStyle = "rgba(" + (rgbColours[0 + hasalpha][j]) + ", " + (rgbColours[1 + hasalpha][j]) + ", " + (rgbColours[2 + hasalpha][j]) + ", " + (hasalpha?rgbColours[0][j]:255) + ")";
							// paint the current pixel
							ctx.fillRect(x, y, 1, 1);
							x++;
							if (x >= width) {
								y++;
								x = 0;
							}
							// these files have no metadata
							if (y >= height/* && document.getElementById("useRealHeight").checked*/) {
								break;
							}
						}
						if (save) {
							var link = document.createElement('a');
							link.href = cvs.toDataURL("image/png");
							link.setAttribute('download', file.name + ".PNG");
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
					} else {
						window.alert("Your browser does not support the HTML5 canvas element.");
					}
				};
			})(files[i], save);
			NUUReader.readAsArrayBuffer(files[i]);
			// in the case that multiple files are chosen we can't draw more than one
			// however, if the user wants to convert files we can do more than one at once
			if (i + 1 != files.length && !save) {
				window.alert("You chose more than one file but only the first one will be drawn.");
				break;
			}
		}
	} else {
		window.alert("You need to choose a file first.");
	}
}

/*
this.convertPNGtoNUU = function() {
	if (!!files) {
		for (i=0;i<files.length;i++) {
			var PNGReader = new FileReader();
			PNGReader.onload = (function(file) {
				return function(e) {
					e=e||event;
					if (!!((cvs = document.getElementById("NUUcanvas")) && (ctx = cvs.getContext("2d")))) {
						cvs.style.visibility = "hidden";
						var img = document.createElement("img");
						img.style.visibility = "hidden";
						document.getElementsByTagName("body")[0].appendChild(img);
						img.onload = function() {
							cvs.width = this.width;
							cvs.height = this.height;
							thisNoonLoad = this;
							thisNoonLoad.onload = undefined;
							ctx.drawImage(thisNoonLoad, 0, 0, this.width, this.height);
							var rgbColours = new Array();
							var x = 0;
							var y = 0;
							var NUUDataStream = new DataStream();
							NUUDataStream.endianness = NUUDataStream.LITTLE_ENDIAN;
							NUUDataStream.writeString("RAW RGB ");
							NUUDataStream.writeUint16(this.width);
							NUUDataStream.writeUint16(this.height);
							// this loop is fairly slow. I don't know why.
							// I guess getImageData is the culprit, seeing as the other methods used here are used elsewhere and go faster.
							while (y < this.height) {
								rgbColours = ctx.getImageData(x, y, 1, 1).data;
								// ignore rgbColours[3] - it exists but NUU does not support alpha transparency
								NUUDataStream.writeUint16(((Math.round(rgbColours[0]/255*31) << 10)*1)+((Math.round(rgbColours[1]/255*31) << 5)*1)+((Math.round(rgbColours[2]/255*31))*1));
								x++;
								if (x >= this.width) {
									y++;
									x = 0;
								}
							}
							NUUDataStream.save(file.name + ".RGB");
						}
						img.src = e.target.result;
						img.parentNode.removeChild(img);
					} else {
						window.alert("Your browser does not support the HTML5 canvas element.");
					}
				}
			})(files[i]);
			PNGReader.readAsDataURL(files[i]);
		}
	} else {
		window.alert("You need to choose a file first.");
	}
}
*/
document.getElementById("NUU").onchange = setFiles;
}
/*
Here is a little true story about a boy and his trip to Wendys for a #2 no pickles.


It was a splended sunday when a boy named Pimpin' Fresh decided he would take a trip to Wendy's in the mall for his lunch break. The transaction started normal, he ordered a #2 without pickles and a diet coke. While standing at the counter a large women comes around from the back grill and throws (not sets down, not tosses, not places) THROWS his order on to the counter. He then asks her for ketchup but she ignores Pimpin Fresh and walks away. This angers our brave yet smart friend of all animals Pimpin Fresh. He then returns to his store and calls Wendys to voice his displeasure with the way he was treated. Here is that phone call word for word:

Rando Wendys Employee: Hello, Thank you for calling Wendys.

Pimpin Fresh: Hi may I speak to your manager?

Rando Wendys Employee: Hold one minute.

Wendys Manager: This is the manager.

Pimpin Fresh: Hi I was just there and a bigger blonde woman threw my order at me and ignored me when I asked for ketchup. Im not looking for the best service but it was very rude.

Wendys Manager: Sir that was me and yes I did throw your bag down and I shouldnt have done that. And I didnt hear you ask for ketchup. And thanks for calling me bigger!

CLICK!

Did she just hang up on Pimpen Fresh???? That fat !@#$%^&*!!!! This means that Pimpin Fresh must now go up there and confront the fat angry Wendys manager. Here is how that part of this story went.

Pimpin Fresh: Did you just hang up on me?

Fat Wendys Manager: You offended me.

Pimpin Fresh: But you did hang up on me right?

Fat Wendys Manager: Yes cause you offended me.

Pimpin Fresh: So there will be no misunderstanding when I tell your corporate office that I was hung up on. Second of all Ive been called bigger and it is not offensive. And to be honest with you there are 3 stages of fat. Bigger, Fat, and Oh my god dude you have to come see this!!!! Thats which one you are!

at that point he walks away.

In the end our hero Pimpin Fresh got his point across the the evil fat wendys manager and the evil fat wendys manager learned that if you are mean to people you will hate yourself at the end of a day.

The end

-PLWEB.NET
*/