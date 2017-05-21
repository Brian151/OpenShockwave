package brian151.earthquake.filesystem;
import brian151.riff.File;
import brian151.riff.LinkedSectionHandler;
import brian151.riff.Section;
import js.html.ArrayBuffer;
import js.html.Uint32Array;
import js.Browser;

/**
 * ...
 * @author Brian151
 */
@:expose
#if (compileLvl=="libShockwave")
@:keep
#end
class DirectorFile extends File
{
	private var isProjector:Bool;
	private var ptrBuffer:ArrayBuffer;
	private var ptrs1:Uint32Array;
	private var ptrs2:Uint32Array;
	public function new(src:ArrayBuffer):Void {
		super(src);
		isProjector = false;
	}
	public function checkCast():Bool{
		return false;
	}
	public function setProjector():Void{
		isProjector = true;
	}
	public function findMap():Int {
		var mapIndexChunk:Section = getSectionAt(0xc);
		var mapIndexHandler:LinkedSectionHandler = new LinkedSectionHandler(mapIndexChunk,this);
		return mapIndexHandler.getUIntAt(4,2);
	}
	public function parseMap(offset:Int):Void{
		var mapChunk:Section = getSectionAt(offset);
		var id = mapChunk.get_ID();
		Browser.window.console.log("assumed memory map ID: " + id);
		Browser.window.console.log("selected format: " + formats[currentFormat]);
		if (id == "mmap") {
			var handler:LinkedSectionHandler = new LinkedSectionHandler(mapChunk,this);
			var count:Int = handler.getUIntAt(4, 2);
			var usedCount:Int = handler.getUIntAt(8, 2);
			ptrBuffer = new ArrayBuffer((usedCount * 4) + (count * 4));
			ptrs1 = new Uint32Array(ptrBuffer, 0, usedCount);
			ptrs2 = new Uint32Array(ptrBuffer, usedCount, count);
			var i0:Int = 0;
			for (i in 0...count) {
				var offset2:Int = (i * 0x14) + 0x18;
				var id:String = handler.getFourCCAt(offset2);
				if (i == 0) {
					Browser.window.console.log("current mapped chunk(0): " + id);
				}
				var offset3:Int = handler.getUIntAt(offset2 + 8, 2);
				if (id != "free") {
					ptrs1[i0] = offset3;
					i0++;
				}
				ptrs2[i] = offset3;
				//temporary exposure of pointer arrays to global scope,
				//for debugging purposes
				untyped __js__("$hx_scope.ptrs1 = this.ptrs1");
				untyped __js__("$hx_scope.ptrs2 = this.ptrs2");
			}
		}
	}
}