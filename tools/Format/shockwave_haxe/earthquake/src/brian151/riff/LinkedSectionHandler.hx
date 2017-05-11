package brian151.riff;
import js.html.DataView;

@:native("$hx_scope.brian151.riff.LinkedSectionHandler")
extern class LinkedSectionHandler 
{
	private var target:Section;
	private var view:DataView;
	private var parentFile:File;
	public function new(src:Section, parent:File):Void;
	public function checkBounds(offset:Int, length:Int):Bool;
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
}