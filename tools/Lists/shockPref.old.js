//input, output : textareas

/*
TODO:
Missunderstood lists...
	Two types: Linear,Property
	Linear is essentially an array [value,value,...]
	Property is essentially an object [#foo:"bar"] (e.g. {foo:"bar"})
	That said, some not-so-great things about the export format can be changed.
	The downside is this will still be fairly tedious and subject to error.
	(and is another problem to fix before fixing the current problems with this tool).
	This also confirms that minus some syntactical differences and a 'special' data type, the symbol (e.g. #foobar),
	property lists actually are very much like JSON objects and can be losslessly converted.
Fix errors/crashes...somehow
*/
function convertToJSON() {
	var src = trimWhiteSpace(input.value);
	var out = parseSegment(src);
	output.value = JSON.stringify(out);
}

function parseSegment(seg) {
	var s = trimOuterBrackets(seg,false);
	//output.value = s;
	var children = getChildren(s);
	var hasChildren = (trimOuterBrackets(seg,true).isComplex);
	//console.log(s);
	console.log(s + " | has children : " + hasChildren);
	console.log("[  " + children.join("  ,  ") + "  ]");
	var isSymbol = (detectSymbol(s) && !hasChildren);
	var isSimple = !hasChildren;
	if (isSimple) {
		//console.log("is simple data : " + isSimple);
		//console.log("is symbol : " + isSymbol);
		//console.log(s);
		if (isSymbol) {
			var out = s; //fine as-is
			//console.log("symbol!");
		} else {
			var type = getType(s);
			console.log(type);
			switch (type) {
				case "number" : {
					var out = Number(s);
					break;
				}
				case "string" : {
					var out = writeString(s);
					break;
				}
			}
		}
	} else {
		var out = {list:[],props:{}};
		appendChildren(out,children);
	}
	//console.log(out);
	return out;
}

//broken...

function trimOuterBrackets(dat,checkComplex) {
	var d = dat;
	var out = d;
	var bracketPairs = [];
	var currPair = -1;
	var hasFailed = false;
	for (var i=0; i < d.length; i++) {
		var currChar = d.charAt(i);
		if (currChar == "[") {
			var ID = bracketPairs.length;
			bracketPairs.push({s:i,e:null,p:currPair});
			currPair = ID;
		}
		if (currChar == "]") {
			if (currPair == -1) {
				throw new Error("INCORRECTLY NESTED BRACKETS DETECTED, ABORTING!");
				hasFailed = true;
				break;
			}
			var pair = bracketPairs[currPair];
			currPair = pair.p;
			pair.e = i;
		}
	}
	if (!hasFailed) {
		var lim = d.length - 1;
		if (checkComplex) {
			out = {isComplex:false};
		}
		for (var i=0; i < bracketPairs.length; i++) {
			var test = bracketPairs[i];
			if (test.s == 0 && test.e == lim) {
				if (checkComplex) {
					out.isComplex = true;
					break;
				} else {
					out = d.slice(1);
					out = out.slice(0,-1);
					break;
				}
			}
		}
	}
	bracketPairs = null;
	return out;
}

/*
function trimOuterBrackets(dat) {
	var d = dat;
	var out = dat;
	var bracketPairs = [];
	var currPair = -1;
	var hasFailed = false;
	for (var i=0; i < d.length; i++) {
		var currChar = d.charAt(i);
		if (currChar == "[") {
			var ID = bracketPairs.length;
			bracketPairs.push({s:i,e:null,p:currPair});
			currPair = ID;
		}
		if (currChar == "]") {
			if (currPair == -1) {
				throw new Error("INCORRECTLY NESTED BRACKETS DETECTED, ABORTING!");
				hasFailed = true;
				break;
			}
			var pair = bracketPairs[currPair];
			currPair = pair.p;
			pair.e = i;
		}
	}
	if (!hasFailed) {
		var lim = d.length - 1;
		for (var i=0; i < bracketPairs.length; i++) {
			var test = bracketPairs[i];
			if (test.s == 0 && test.e == lim) {
				out = d.slice(1);
				out = out.slice(0,-1);
				break;
			}
		}
	}
	return out;
}*/

function detectSymbol(s) {
	var suspect = s;
	var out = false;
	if (suspect.charAt(0) == "#") {
		out = true;
		for (var i=1; i < suspect.length; i++) {
			var curr = suspect.charAt(i);
			if (curr == ":") {
				out = false;
				break;
			}
			if (curr == "[" || curr == "#" || curr == "]" || curr == ",") {
				throw new Error("the value : " + s + "does not seem to be a valid data type!","detectSymbol");
				break;
			}
		}
	}
	//console.log("detected symbol : " + out);
	return out;
}

function detectProperty(s) {
	var suspect = s;
	var out = false;
	if (suspect.charAt(0) == "#") {
		for (var i=1; i < suspect.length; i++) {
			var curr = suspect.charAt(i);
			if (curr == ":") {
				out = true;
				break;
			}
			if (curr == "[" || curr == "#" || curr == "]" || curr == ",") {
				throw new Error("the value : " + s + "does not seem to be a valid data type!","detectProperty");
				break;
			}
		}
	}
	return out;
}

function getChildren(s) {
	var section = s;
	var limit = section.length - 1;
	var out = [];
	var inString = false;
	var pending = "";
	var nestLevel = 0;
	for (var i=0; i < section.length; i++) {
		var curr = section.charAt(i);
			if (curr == "[")
				nestLevel++;
			if (curr == "]")
				nestLevel--;
			if (curr == "\"")
				inString = !inString;
			if (curr == "," && nestLevel == 0 && !inString) {
				out.push(pending);
				pending = "";
				continue;
			}
			pending += curr;
			if (i == limit)
				out.push(pending);
	}
	return out;
}

function trimWhiteSpace(s) {
	var str = s;
	var inString = false;
	var quoteTotals = 0;
	var out = "";
	for (var i=0; i < str.length; i++) {
		var curr = str.charAt(i);
		if (curr == " " || curr == "\n" || curr == "\t") {
			if (!inString)
				continue;
		}
		if (curr == "\"") {
			inString = !inString;
			quoteTotals++;
		}
		out += curr;
	}
	var test = quoteTotals - ((Math.floor(quoteTotals/2)) * 2)
	if (test > 0) throw new Error("uneven quotes detected!");
	return out;
}

function getType(s) {
	var suspect = s;
	if (suspect.charAt(0) == "\"")
		return "string";
	if (!isNaN(Number(s)))
		return "number";
}

function writeNumber (s) {
	return Number(s);
}

function writeString(s) {
	var out = s.slice(1);
	out = out.slice(0,-1);
	return String(out);
}

function getPropertyName(p) {
	var out = "";
	for (var i=0; i < p.length; i++) {
		var curr = p.charAt(i);
		if (curr == "#")
			continue;
		if (curr == ":")
			break;
		out += curr;
	}
	if (out == "") {
		throw new Error("invalid property name detected!");
	}
	return out;
}

function getPropertyValue(p) {
	var out = "";
	var prop = p;
	//console.log("parsing property : " + prop);
	for (var i=0; i < prop.length; i++) {
		var curr = prop.charAt(i);
		if (curr == ":") {
			out = prop.slice(i + 1);
			break;
		}
	}
	//console.log("retrieved property value : " + out);
	return out;
}

function appendChildren(obj,children) {
	for (i=0; i < children.length; i++) {
		var curr = children[i];
		var isProperty = detectProperty(curr);
		if (isProperty) {
			var ID1 = obj.list.length;
			var ID2 = getPropertyName(curr);
			var data = getPropertyValue(curr);
			console.log(data);
			//var data2 = parseSegment(data);
			obj.list.push(null);
			obj.props[ID2] = ID1;
		} else {
			var data = parseSegment(curr);
			obj.list.push(data);
		}
	}
}