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
@:native("$hx_scope.brian151.riff.File")
extern class File
{
	private var formats:Array<String>;
	private var formatByteOrder:Array<Array<String>>;
	private var currentFormat:Int;
	//private var index:Array<Array>;
	private var length:Int;
	private var view:DataView;
	public function new(datasrc:ArrayBuffer):Void;
	public function getSectionAt(offset:Int):Section;
	public function getFourCCAt(offset:Int):String;
	public function setFourCCAt(offset:Int, fourCC:String):Void;
	public function getUIntAt(offset:Int, byteOrderID:Int):Int;
	public function setUintAt(offset:Int, value:Int, byteOrderID:Int):Void;
	public function getUShortAt(offset:Int, byteOrder:Bool):Int;
	public function setUShortAt(offset:Int, value:Int, byteOrder:Bool):Void;
	public function getUByteAt(offset:Int):Int;
	public function setUByteAt(offset:Int, value:Int):Void;
	public function getIntAt(offset:Int, byteOrder:Bool):Int;
	public function setIntAt(offset:Int, value:Int, byteOrder:Bool):Void;
	public function getShortAt(offset:Int, byteOrder:Bool):Int;
	public function setShortAt(offset:Int, value:Int, byteOrder:Bool):Void;
	public function getByteAt(offset:Int):Int;
	public function setByteAt(offset:Int, value:Int):Void;
	public function getFloatAt(offset:Int, byteOrder:Bool):Float;
	public function setFloatAt(offset:Int, value:Float, byteOrder:Bool):Void;
	public function getDoubleAt(offset:Int, byteOrder:Bool):Float;
	public function setDoubleAt(offset:Int, value:Float, byteOrder:Bool):Void;
	public function toHex(value:Dynamic, type:String):String;
	public function setFormat(f:String):Void;
}