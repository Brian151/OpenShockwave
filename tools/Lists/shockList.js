// input, output : textareas

/*
TODO:
	Nothing, for now...
	detailed comments actually explaining how it works...
*/

var ShockwaveListParser = function() {}
ShockwaveListParser.prototype.parseList = function(listTxt) {
	var listMin = this.trimWhiteSpace(listTxt);
	return this.parseSegment(listMin);
}
ShockwaveListParser.prototype.trimWhiteSpace = function(s) {
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
ShockwaveListParser.prototype.parseSegment = function(seg) {
	var len1 = seg.length;
	var s = this.trimOuterBrackets(seg);
	var len2 = s.length;
	var hasChildren = (len2 < len1);
	if (hasChildren) {
		var children = this.getChildren(s);
		var isPropList = this.detectProperty(children[0]);
		if (isPropList) {
			var out = {};
			this.appendChildren(out,children,true);
			return out;
		} else {
			var out = [];
			this.appendChildren(out,children,false);
			return out;
		}
	} else {
		var isSymbol = this.detectSymbol(s);
		if (isSymbol) {
			return s;
		} else {
			var type = this.getType(s);
			switch (type) {
				case "number" :
					return this.writeNumber(s);
				case "string" :
					return this.writeString(s);
			}
		}
	}
}
ShockwaveListParser.prototype.getChildren = function(s) {
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
ShockwaveListParser.prototype.detectProperty = function(s) {
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
ShockwaveListParser.prototype.appendChildren = function(obj,children,isPropList) {
	for (var i=0; i < children.length; i++) {
		var curr = children[i];
		if (isPropList) {
			var ID = this.getPropertyName(curr);
			var data = this.getPropertyValue(curr);
			var data2 = this.parseSegment(data);
			obj[ID] = data2;
		} else {
			var data = this.parseSegment(curr);
			obj.push(data);
		}
	}
}
ShockwaveListParser.prototype.trimOuterBrackets = function(dat,checkComplex) {
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
ShockwaveListParser.prototype.detectSymbol = function(s) {
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
ShockwaveListParser.prototype.getType = function(s) {
	var suspect = s;
	if (suspect.charAt(0) == "\"")
		return "string";
	if (!isNaN(Number(s)))
		return "number";
}
ShockwaveListParser.prototype.writeNumber = function(s) {
	return Number(s);
}
ShockwaveListParser.prototype.writeString = function(s) {
	var out = s.slice(1);
	out = out.slice(0,-1);
	return String(out);
}
ShockwaveListParser.prototype.getPropertyName = function(p) {
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
ShockwaveListParser.prototype.getPropertyValue = function(p) {
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