package brian151.riff;
import js.html.ArrayBuffer;
import js.html.DataView;
import js.Browser;
/*
 Copyright {2017} {Brian151 (https://github.com/Brian151)}

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

/**
 * ...
 * @author Brian151
 */
@:expose
#if (compileLvl=="libRIFF")
@:keep
#end
class File
{
	private var formats:Array<String>;
	private var formatByteOrder:Array<Array<String>>;
	private var currentFormat:Int;
	//private var index:Array<Array>;
	private var length:Int;
	private var view:DataView;
	public function new(datasrc:ArrayBuffer) {
		view = new DataView(datasrc);
		length = view.byteLength;
		formats = ["RIFF", "RIFX", "XFIR"/*,"FORM"*/];
		formatByteOrder = [
		["B","L"],
		["B","B"],
		["L","L"]
		];
		currentFormat  = 0; 
	}
	public function getSectionAt(offset:Int):Section {
		var id = this.getFourCCAt(offset);
		var len = this.getUIntAt(offset + 4, 0);
		return new Section(view.buffer, offset, len, id);
	}
	public function getFourCCAt(offset:Int):String {
		var off:Int = offset;
		var byteOrder:Bool = (formatByteOrder[currentFormat][0] == "L");
		var str:Array<String> = [];
		var hasErrored:Bool = false;
		for (i in 0...4) {
			var curr:Int = getUByteAt(off + i);
			if (curr >= 32) {
				str.push(String.fromCharCode(curr));
			} else {
				hasErrored = true;
				str = ["E", "R", "R", " "];
				break;
			}
		}
		if (byteOrder && !hasErrored) {
			str.reverse();
		}
		var out:String = str.join("");
		return out;
	}
	public function setFourCCAt(offset:Int, fourCC:String) {
		var isString:Bool = untyped __js__("typeof fourCC == \"string\"");
		if (isString && fourCC.length == 4) {
			var str:Array<String> = fourCC.split("");
			var byteOrder:Bool = (formatByteOrder[currentFormat][0] == "L");
			if (byteOrder) {
				str.reverse();
			}
			for (i in 0...4) {
				var curr:Int = str[i].charCodeAt(0);
				var currS:String = str[i];
				if (curr == 32 && curr <= 255) {
					setUByteAt(offset + i,curr);
				} else {
					setUByteAt(offset + i, 32);
					Browser.window.console.log(
						"WARNING! : " + 
						currS + " | " + 
						curr + 
						" is not a valid printable ASCII character! space written to fourCC at offset " + 
						toHex(offset, "U32") + 
						" | " + 
						toHex(offset + i, "U32")
					);
				}
			}
		}
	}
	public function getUIntAt(offset:Int, byteOrderID:Int):Int {
		var byteOrder:Bool = false;
		switch (byteOrderID) {
			case 1:
				byteOrder = false;
			case 2:
				byteOrder = true;
			// case 0: //haxe switch cases do not fall through!
			default:
				byteOrder = formatByteOrder[currentFormat][0] == "L";
		}
		return view.getUint32(offset,byteOrder);
	}
	public function setUintAt(offset:Int, value:Int, byteOrderID):Void {
		var byteOrder:Bool = false;
		switch (byteOrderID) {
			case 1:
				byteOrder = false;
			case 2:
				byteOrder = true;
			// case 0: //haxe switch cases do not fall through!
			default:
				byteOrder = formatByteOrder[currentFormat][0] == "L";
		}
		view.setUint32(offset, value, byteOrder);
	}
	public function getUShortAt(offset:Int, byteOrder:Bool):Int {
		return view.getUint16(offset, byteOrder);
	}
	public function setUShortAt(offset:Int,value:Int,byteOrder:Bool):Void {
		view.setUint16(offset,value, byteOrder);
	}
	public function getUByteAt(offset:Int):Int {
		return view.getUint8(offset);
	}
	public function setUByteAt(offset:Int,value:Int):Void {
		view.setUint8(offset, value);
	}
	public function getIntAt(offset:Int, byteOrder:Bool):Int {
		return view.getUint32(offset, byteOrder);
	}
	public function setIntAt(offset:Int, value:Int, byteOrder:Bool):Void {
		view.setUint32(offset, value, byteOrder);
	}
	public function getShortAt(offset:Int, byteOrder:Bool):Int {
		return view.getInt16(offset, byteOrder);
	}
	public function setShortAt(offset:Int, value:Int, byteOrder:Bool):Void {
		view.setInt16(offset, value, byteOrder);
	}
	public function getByteAt(offset:Int):Int {
		return view.getInt8(offset);
	}
	public function setByteAt(offset:Int, value:Int):Void {
		view.setInt8(offset, value);
	}
	public function getFloatAt(offset:Int, byteOrder:Bool):Float {
		return view.getFloat32(offset, byteOrder);
	}
	public function setFloatAt(offset:Int, value:Float, byteOrder:Bool):Void {
		view.setFloat32(offset, value, byteOrder);
	}
	public function getDoubleAt(offset:Int, byteOrder:Bool):Float {
		return view.getFloat64(offset, byteOrder);
	}
	public function setDoubleAt(offset:Int, value:Float, byteOrder:Bool):Void {
		view.setFloat64(offset, value, byteOrder);
	}
	public function toHex(value:Dynamic,type:String):String {
		var isNum = untyped __js__("typeof value == \"number\"");
		var out:String = "";
		if (isNum) {
			out = untyped __js__("value.toString(16)");
			var len:Int = 0;
			switch(type) {
				case "U16":
					len = untyped __js__("16 / 4");
				case "U8": {
					len = untyped __js__("8 / 4");
				}
				// case "U32": //haxe switch cases do not fall through!
				default:
					len = untyped __js__("32 / 4");
			}
			if (out.length < len) {
				var pad:Int = len - out.length;
				for (i in 0...pad) {
					var temp:String = "0" + out;
					out = temp;
				}
			} else if (out.length > len) {
				Browser.window.console.log("ERROR HEX-ENCODING " + value + " as " + type + " !");
				toHex(0,type);
			}
		} else {
			Browser.window.console.log(value + " is not a number!");
		}
		return out;
	}
	public function setFormat(f:String):Void {
		if (f.length == 0) {
			f = "RIFF";
		}
		for (i in 0...formats.length) {
			var curr = formats[i];
			if (curr == f) {
				currentFormat = i;
				break;
			}
		}
	}
}