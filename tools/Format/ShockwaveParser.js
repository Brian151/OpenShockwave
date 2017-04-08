/*
	this needs a LOT of work...
*/
var ShockwaveParser = function(data) {
	this.structParser = new RIFF(data); //create the RIFF object from RIFF.js
	this.length = 0; //we don't know this yet
	this.map = []; //store the processed contents of mmap
	this.castLib = []; //store the casts
	this.castMemberLib = []; //temporary place to store the cast members
	this.scriptLib = []; //store the scripts
}
ShockwaveParser.prototype.parse = function() {
	var head = this.structParser.getFourCCAt(0x00); //get main chunkID
	this.structParser.setFormat(head); // get the format, should be RIFX or XFIR for now
	this.length = this.structParser.getUIntAt(0x04,0);
	var mapIndexHead = this.structParser.getFourCCAt(0x0c); //find the imap (mmap offset)
	var mapOffset = 0;
	if (mapIndexHead == "imap") {
		/*
			We found the mmap's offset
			Let's parse the mmap section, now!
		*/
		mapOffset = this.structParser.getUIntAt(0x18,0);
		console.log("map @" + mapOffset.toString(16));
		this.parseMappingTable(mapOffset);
		/*
			Now let's scan for the KEY* section
		*/
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
		//lets get the compiled bytecode linked together so it's ready for us use(decompile, interpret,etc...)
		this.linkScripts();
		this.parseNameTables();
		if (foundKeys) {
			/*
				If we found the KEY* section, we need to parse it
				This is currently disabled because it's not working yet,
				and it's a fairly intensive process
			*/
			this.parseKeyTable(keyOffset);
		} else {
			console.error("cannot locate the key table"); //well crap, we NEED KEY*, throw error
		}
	} else {
		console.error("cannot locate the mapping table!"); //well crap, we NEED mmap, throw error
	}
}
ShockwaveParser.prototype.parseMappingTable = function(offset) {
	var head = this.structParser.getFourCCAt(offset); //double-check the section header
	var length = this.structParser.getUIntAt(offset + 4,0) + offset; //length of mmap
	// [v1,v2,nElems,nUsed,junkPtr,v3,freePtr] from Schocklabsorber, v1 and v2 are shorts
	var count = this.structParser.getUIntAt(offset + 12,2);
	var usedCount = this.structParser.getUIntAt(offset + 16,2);
	/*
		create:
		ArrayBuffer to store enough bytes for 4 pointer arrays (2 U32 and 2 U8)
		Uint8Array indexing a certain chunk type entry in the map table for ALL entries
		Uint8Array indexing a certain chunk type entry in the map table for used entries (e.g. not free)
		Uint32Array indexing the entry for ALL entries
		Uint32Array indexing the entry for used entries
		
		TO-DO: explain it better
		(and apparently make it even WORK...)
	*/
	/*this.Buffptrs = new ArrayBuffer(usedCount + count + (usedCount * 4) + (count * 4));
	this.ptrMapT = new Uint8Array(this.Buffptrs,0,count);
	this.ptrMapU = new Uint8Array(this.Buffptrs,count,usedCount);
	this.ptrT = new Uint32Array(this.Buffptrs,(count + usedCount),count);
	this.ptrU = new Uint32Array(this.Buffptrs,(count + usedCount) + (count * 4),usedCount);
	console.log(length.toString(16));*/
	if (head == "mmap") {
		var i0 = 0; // num ID (total)
		var i1 = 0; // num ID (used)
		/*
			a temporary string array with FourCCs,
			used to check if we already found chunks with
			this ID
		*/
		var lookup = [];
		/*
			entries start at offset + 0x20 bytes, 
			entries are 20 bytes in size,
			Let's read them till we've met or exceeded the length of mmap!
			
			TO-DO : 
				use counts...
				implement pointer arrays
		*/
		for (var i= (offset + 0x20); i < length; i+=20) {
			var id = this.structParser.getFourCCAt(i); //this is the ID of a mapped chunk
			var len = this.structParser.getUIntAt(i + 4,0); //this is the length of a mapped chunk
			var off = this.structParser.getUIntAt(i + 8,0); //this is the offset of a mapped chunk
			//we may or may not find this ID in the lookup table, so we default Boolean 'found' to false
			var found = false;
			
			var done = (length - i) < 20; // needs work...
			if (/*id == "ERR "*/done) {
				console.log(i0  + " | " + i1);
				break;
			}
			
			/*
				We run lookup on lookup
			*/
			for (var i2 = 0; i2 < lookup.length; i2++) {
				var curr = lookup[i2];
				if (curr == id) {
					found = true;
					break;
				}
			}
			if (!found && id != "ERR ") {
				//We didn't find this ID in lookup, let's create an entry in our [parsed] mapping table
				this.map.push({
					tagName : id,
					instances : []
				});
				lookup.push(id);
			}
			for (var i2=0; i2 < this.map.length; i2++) {
				//We need to add the mapped section to our table
				var curr = this.map[i2];
				if (curr.tagName == id) {
					this.map[i2].instances.push([len,off,i0,i1]);
					break;
				}
			}
			//increment our counters... i1 ignores free
			i0++;
			if (id != "free") {
				i1++;
			}
		}
	}
}
ShockwaveParser.prototype.parseKeyTable = function(offset) {
	/*
		this function isn't working right yet...so I won't doument it properly for now...
	*/
	var dbgNonCast = false; 
	var head = this.structParser.getFourCCAt(offset)
	var length = this.structParser.getUIntAt(offset + 4,0);
	var max = offset + length;
	var total = this.structParser.getUIntAt(offset + 0xc,0);
	console.log("keys @" + offset.toString(16));
	var dataOffset = (offset + 8 + 0xc);
	var i0 = 0;
	var i1 = 0;
	var i3 = 0;
	var foundTags = [];
	for (var i = dataOffset; i < max; i += 0xc) {
		var childID = this.structParser.getUIntAt(i,0);
		var parentID = this.structParser.getUIntAt(i + 4,0);
		var childSecID = this.structParser.getFourCCAt(i + 8);
		var flag = (this.structParser.getUShortAt(i + 4,true) == 1024);
		
		/* if (i == dataOffset) {
			console.log("--=first key entry=--");
			console.log(parentID.toString(16));
			console.log(childID.toString(16));
			console.log(childSecID);
			console.log(this.doMapLookup(0,parentID))
			console.log(this.doMapLookup(1,childID))
			console.log("-end trace-");
		} */
		// still doesn't work fully
		if (!flag) {
			var temp = this.doCastMemberLookup(parentID);
			if (temp == -1)
				temp = this.addCastMember(this.doMapLookup(0,parentID));
			this.castMemberLib[temp].parts.push(this.doMapLookup(1,childID));
		} else {
			/*
				TODO...
			*/
			var i4 = this.structParser.getUShortAt(i + 6,true)
			// larger files could cause lag/crashes by spamming web console... 
			if (dbgNonCast) {
				console.log("found section not associated with a CASt! : " + childSecID + " | " + i4);
			}
		}
	}
}
ShockwaveParser.prototype.doMapLookup = function(mode,id) {
	/*
		A utitlity function for feteching data from the mapping table generated from mmap
		Its use isn't yet standardized
		It can do the following searches:
			lookup by ID ignoring free (0,id)
			lookup by ID including free (1,id)
			lookup by chunkID (2,FourCCDID)
		If it fails, we return [@ERR,[0,0,0,0]] , e.g. null/error
	*/
	//some quick checks the mode ID isn't set too high or too low
	if (mode > 2) {
		mode = 2;
	} else if (mode < 0) {
		mode = 0;
	}
	//exclude free chunks
	if (mode == 0) {
		for (var i=0; i < this.map.length; i++) {
			var curr = this.map[i];
			if (curr.tagName != "free") {
				for (var i2=0; i2 < curr.instances.length; i2++) {
					var curr2 = curr.instances[i2][3];
					if (curr2 == id) {
						return [curr.tagName,curr.instances[i2]];
					}
				}
			}
		}
	}
	//include free chunks
	if (mode == 1) {
		for (var i=0; i < this.map.length; i++) {
			var curr = this.map[i];
			for (var i2=0; i2 < curr.instances.length; i2++) {
				var curr2 = curr.instances[i2][2];
				if (curr2 == id) {
					return [curr.tagName,curr.instances[i2]];
				}
			}
		}
	}
	//lookup by tag ID
	if (mode == 2) {
		for (var i=0; i < this.map.length; i++) {
			var curr = this.map[i];
			if (curr.tagName == id) {
				return [curr.tagName,curr.instances];
			}
		}
	}
	//default, return something suggesting error
	return ["@ERR",[0,0,0,0]];
}
ShockwaveParser.prototype.addCastMember = function(mapping) {
	/*
		let's create the empty shell of a cast member
	*/
	var out = this.castMemberLib.length;
	this.castMemberLib.push({
		name : "", //we don't yet know its name, it sometimes won't have one
		type : "Cast_Member", //we don't yet know its type
		parts : [], //we haven't associated the CASt with the sections containg the "meat" yet
		mapping : mapping //we copy the mapping table entry for this CASt
	});
	return out;
}
ShockwaveParser.prototype.doCastMemberLookup = function(id) {
	/*
		This utility function is specifically for finding entries in the
		cast members table, it looks them up by their ID, and returns
		-1 if failed
	*/
	var out = -1;
	for (var i=0; i < this.castMemberLib.length; i++) {
		var curr = this.castMemberLib[i];
		if (curr.mapping[1][3] == id) {
			out = i;
			break;
		}
	}
	return out;
}
ShockwaveParser.prototype.linkScripts = function() {
	/*
		Before we can do anything with the bytecode sections (Lscr), 
		we have to link each with a name table (Lnam) , and a script collection (LctX)
	*/
	var scrCollects = this.doMapLookup(2,"LctX"); //let's fetch the LctX mappings, first
	var scrNames = this.doMapLookup(2,"Lnam"); //let's also fetch the Lnam mappings
	for (var i=0; i < scrCollects[1].length; i++) {
		var curr = scrCollects[1][i];
		var off = curr[1]; //lets get the offset of the current LctX
		/*
			LctX contain a lot more data, but right now I'm focused on
			linking the scripts, so we're focued on the ID,
			found at offset 0x28 from the start of the section (includes section header)
		*/
		var id = this.structParser.getUIntAt(off + 0x28,1);
		/*
			Now we iterate the names table list and try to find an Lnam
			that was ID's with ID, we're using the free-inclusive IDs
		*/
		for (var i2 =0; i2 < scrNames[1].length; i2++) {
			var curr2 = scrNames[1][i2];
			var id2 = curr2[2];
			if (id == id2) {
				/*
					if we managed to find a Lnam (better!), 
					we add a script collection to our
					script library, feeding it not only the offset of the
					LctX section, but the offset of the Lnam
				*/	
				this.addScriptCollection(off,curr2[1])
				break;
			}
		}
	}
	//now we need to link the Lscr sections to the LctX!
	this.linkByteCode();
}
ShockwaveParser.prototype.addScriptCollection = function(off,off2) {
	this.scriptLib.push ({
		offset : off, //offset of LctX
		offsetName : off2, //offset of Lnam
		/*
			will contain the data from Lscr,
			they start as empty shells like everything else, however
		*/
		scripts : [],
		names : [], //will contain every name from the Lnam section, starts empty
		/*
			debugging information, currently just offsets as hex so developers can find the data in the file with
			a hex editor
		*/
		dbg : [off.toString(16),off2.toString(16)]
	});
}
ShockwaveParser.prototype.parseNameTables = function() {
	/*
		This function parses the Lnam section into an array of strings
	*/
	/*
		typical array iteration...
		We're iterating the script library
	*/
	for (var i=0; i < this.scriptLib.length; i++) {
		var curr = this.scriptLib[i];
		var off = curr.offsetName;
		/*
			lengths, why this format has a thing for sepcifying them multiple times
			is beyond me...
		*/
		var l = this.structParser.getUIntAt(off + 0x10,1);
		var l2 = this.structParser.getUIntAt(off + 0x14,1);
		var o2 = this.structParser.getUShortAt(off + 0x18,false); //offset within section to th actual names table
		var nameCount = this.structParser.getUShortAt(off + 0x1A,false); //how many names?
		var pointer = off + 8 + o2; //a base offset since we're working with the file's full address space
		/*
			for each name, parse the name from the table
		*/
		for (var i2 = 0; i2 < nameCount; i2++) {
			var nameLen = this.structParser.getUByteAt(pointer);
			/*if (i == 0 && i2 < 10) {
				console.log("nameLen : " + nameLen.toString(16));
				console.log(pointer.toString(16));
			}*/
			/*
				call a utility function to parse the name
				push the result to the current script collection's [parsed] name table/array
			*/
			var name = this.parseStringASCII(pointer + 1,nameLen);
			this.scriptLib[i].names.push(name);
			//I don't like the math here, but this increments our pointer to the next nameLength byte
			pointer += nameLen + 1;
		}
	}
}
ShockwaveParser.prototype.parseStringASCII = function(offset,length) {
	/*
		parse an ASCII/ANSI encoded string
		This function requires the length to be specified
	*/
	var out = "";
	for (var i=0; i < length; i++) {
		//could use some error checking for invalid values
		out += String.fromCharCode(this.structParser.getUByteAt(offset + i));
	}
	return out;
}
ShockwaveParser.prototype.linkByteCode = function() {
	/*
		We need to link the bytecode sections (Lscr)
		to our script library
	*/
	/*
		First, let's fetch the Lscr mappings from the mapping table
	*/
	var bytecodes = this.doMapLookup(2,"Lscr")
	/*
		these were used for debugging some stuff,
		this function didn't go together easy
	*/
	console.log(bytecodes.length);
	var hasfound = false;
	/*
		Iterate the script library
	*/
	for (var i=0; i < this.scriptLib.length; i++) {
		var off = this.scriptLib[i].offset; //offset of the current LctX
		var entryCount = this.structParser.getUIntAt(off + 0x10,1); //how many script entries?
		var entryCount2 = this.structParser.getUIntAt(off + 0x14,1);
		var off2 = this.structParser.getUShortAt(off + 0x18,false); //offset of the script entries
		/*
			Let's parse the script entries
		*/
		for (var i2=0; i2 < entryCount; i2++) {
			var baseOffset = off + 8 + off2 + (i2 * 12); //another pointer to stay aligned in full file address space
			var used = this.structParser.getUShortAt(baseOffset + 8,false); //used entries have a Uint16 = 04
			if (used == 4) {
				var id = this.structParser.getUIntAt(baseOffset + 4,1); //this is the mapping ID (including free) of the Lscr
				if (!hasfound) {
					/*
						the debugger for this, because spamming web console by running this on EVERY
						entry could prove to be a mistake...
					*/
					hasfound = true;
					console.log(i);
					console.log("LctX offset : " + off.toString(16));
					console.log("script id : " + id.toString(16));
					console.log("script entry offset : " + off2.toString(16));
					console.log(
						"raw id hex : " + " " +
						this.structParser.toHex(id,"U32")
					);
				}
				/*
					Iterate the bytecode table, and try to find the right Lscr
					
				*/
				for (var i3=0; i3 < bytecodes[1].length; i3++) {
					var curr = bytecodes[1][i3];
					/*
						We found the correct Lscr, so let's push the
						empty shell of a script object to the current collection's
						script table
					*/
					if (curr[2] == id) {
						this.scriptLib[i].scripts.push({
							offset : curr[1]
						});
						break;
					}
				}
			}
		}
		
	}
}