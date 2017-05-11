package brian151.riff;
import js.html.DataView;

/**
 * ...
 * @author Brian151
 */
class LinkedSectionHandler 
{
	private var target:Section;
	private var view:DataView;
	private var parentFile:File;
	public function new(src:Section,parent:File):Void {
		target = src;
		view = target.get_view();
		parentFile = parent;
	}
	public function checkBounds(offset:Int, length:Int):Bool {
		return ((offset + length) >= (view.byteLength));
	}
	public function getFourCCAt(offset:Int):String {
		if (!checkBounds(offset, 4)) {
			return parentFile.getFourCCAt(view.byteOffset + offset);
		} else {
			return "ERR ";
		}
	}
	public function setFourCCAt(offset:Int, fourCC:String):Void {
		if (!checkBounds(offset, 4)) {
			parentFile.setFourCCAt(view.byteOffset + offset, fourCC);
		}
	}
	public function getUIntAt(offset:Int, byteOrderID:Int):Int {
		if (!checkBounds(offset, 4)) {
			return parentFile.getUIntAt(view.byteOffset + offset);
		}
	}
	public function setUintAt(offset:Int, value:Int, byteOrderID:Int):Void {
		if (!checkBounds(offset, 4)) {
			parentFile.setUintAt(view.byteOffset + offset, value, byteOrderID);
		}
	}
	public function getUShortAt(offset:Int, byteOrder:Bool):Int {
		if (!checkBounds(offset, 2)) {
			return parentFile.getUShortAt(view.byteOffset, byteOrder);
		}
	}
	public function setUShortAt(offset:Int,value:Int,byteOrder:Bool):Void {
		if (!checkBounds(offset, 2)) {
			parentFile.getUShortAt(view.byteOffset, value, byteOrder);
		}
	}
	public function getUByteAt(offset:Int):Int {
		if (!checkBounds(offset, 1)) {
			return parentFile.getUByteAt(view.byteOffset, byteOrder);
		}
	}
	public function setUByteAt(offset:Int,value:Int):Void {
		if (!checkBounds(offset, 1)) {
			parentFile.setUByteAt(view.byteOffset, value, byteOrder);
		}
	}
	public function getIntAt(offset:Int, byteOrder:Bool):Int {
		if (!checkBounds(offset, 4)) {
			return parentFile.getIntAt(view.byteOffset, byteOrder);
		}
	}
	public function setIntAt(offset:Int, value:Int, byteOrder:Bool):Void {
		if (!checkBounds(offset, 4)) {
			parentFile.setIntAt(view.byteOffset, value, byteOrder);
		}
	}
	public function getShortAt(offset:Int, byteOrder:Bool):Int {
		if (!checkBounds(offset, 2)) {
			return parentFile.getShortAt(view.byteOffset, byteOrder);
		}
	}
	public function setShortAt(offset:Int, value:Int, byteOrder:Bool):Void {
		if (!checkBounds(offset, 2)) {
			parentFile.setShortAt(view.byteOffset, value, byteOrder);
		}
	}
	public function getByteAt(offset:Int):Int {
	if (!checkBounds(offset, 1)) {
			return parentFile.getByteAt(view.byteOffset, byteOrder);
		}
	}
	public function setByteAt(offset:Int, value:Int):Void {
		if (!checkBounds(offset, 1)) {
			parentFile.setByteAt(view.byteOffset, value, byteOrder);
		}
	}
	public function getFloatAt(offset:Int, byteOrder:Bool):Float {
		if (!checkBounds(offset, 4)) {
			return parentFile.getFloatAt(view.byteOffset, byteOrder);
		}
	}
	public function setFloatAt(offset:Int, value:Float, byteOrder:Bool):Void {
		if (!checkBounds(offset, 4)) {
			parentFile.setFloatAt(view.byteOffset, value, byteOrder);
		}
	}
	public function getDoubleAt(offset:Int, byteOrder:Bool):Float {
		if (!checkBounds(offset, 8)) {
			return parentFile.getDoubleAt(view.byteOffset, byteOrder);
		}
	}
	public function setDoubleAt(offset:Int, value:Float, byteOrder:Bool):Void {
		if (!checkBounds(offset, 8)) {
			parentFile.setDoubleAt(view.byteOffset, value, byteOrder);
		}
	}
}