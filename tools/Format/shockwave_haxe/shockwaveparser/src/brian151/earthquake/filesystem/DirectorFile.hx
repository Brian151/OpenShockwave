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
	private var state:Int;
	public function new(src:ArrayBuffer):Void {
		super(src);
		isProjector = false;
		state = 0;
	}
	public function checkCast():Bool{
		var out:Bool = true;
		if (state >= 1) {
			for (i in 0...ptrs1.length) {
				var id = getFourCCAt(ptrs1[i]);
				if (id == "MCsL") {
					out = false;
					break;
				}
			}
		} else {
			Browser.window.console.log("cannot check as external cast, mmap not parsed");
		}
		Browser.window.console.log("is external cast : " + out);
		return out;
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
				state = 1;
			}
		}
	}
	public function parseSectionAssociationTable():/*Array<Section>*/Array<Dynamic> {
		//TODO: figure out how to handle stuff besides cast members
		var aTabOffset:Int = 0;
		var foundATab:Bool = false;
		var out:Dynamic = [];
		for (i in 0...ptrs1.length) {
			var curr = getFourCCAt(ptrs1[i]);
			if (curr == "KEY*") {
				foundATab = true;
				aTabOffset = ptrs1[i];
				break;
			}
		}
		if (foundATab) {
			Browser.window.console.log("KEY* found at : " + toHex(aTabOffset, "U32"));
			var aTab:Section = getSectionAt(aTabOffset);
			var aTabHandler:LinkedSectionHandler = new LinkedSectionHandler(aTab, this);
			var sectionCount:Int = aTabHandler.getUIntAt(4, 2);
			var count2:Int = aTabHandler.getUIntAt(8, 2);
			for (i in 0...sectionCount) {
				var baseOffset:Int = (i * 0xc) + 0xc;
				var flag:Bool = (aTabHandler.getUShortAt(baseOffset + 4, true) == 1024);
				var sectionID:Int = aTabHandler.getUIntAt(baseOffset, 2);
				if (!flag) {
					var parentOffset:Int = ptrs1[aTabHandler.getUIntAt(baseOffset + 4, 2)];
					var foundParent:Bool = false;
					var pointer:Int = 0;
					for (i2 in 0...out.length) {
						if (out[i2].parent == parentOffset) {
							pointer = i2;
							foundParent = true;
							break;
						}
					}
					if (!foundParent) {
						pointer = out.length;
						out.push({
							parent : parentOffset,
							children : []
						});
					}
					out[pointer].children.push(ptrs2[sectionID]);
				} else {
					var libID:Int = aTabHandler.getUShortAt(baseOffset + 6, true);
					var foundLib:Bool = false;
					var pointer:Int = 0;
					for (i2 in 0...out.length) {
						if (out[i2].libID == libID) {
							pointer = i2;
							foundLib = true;
							break;
						}
					}
					if (!foundLib) {
						pointer = out.length;
						out.push({
							libID : libID,
							children : []
						});
					}
					out[pointer].children.push(ptrs2[sectionID]);
				}
			}
		} else {
			Browser.window.console.log("error ! cannot find KEY*");
		}
		untyped __js__("$hx_scope.shockwaveKeys = out");
		return out;
	}
}