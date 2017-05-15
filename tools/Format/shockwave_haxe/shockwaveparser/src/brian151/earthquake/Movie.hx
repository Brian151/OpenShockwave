package brian151.earthquake;
import brian151.earthquake.filesystem.CompressedFile;
import brian151.earthquake.filesystem.DirectorFile;
import brian151.earthquake.filesystem.ProtectedFile;
import brian151.riff.File;
import js.html.ArrayBuffer;
import js.html.Uint8Array;
import js.html.DataView;

/**
 * ...
 * @author Brian151
 */
@:expose
#if (compileLvl=="libShockwave")
@:keep
#end
class Movie 
{
	private var isProtected:Bool;
	private var isCompressed:Bool;
	private var isValid:Bool;
	private var isProjector:Bool;
	private var isExternalCast:Bool;
	private var riffType:String;
	private var castCount:Int;
	private var dataFile:Dynamic;
	public function new(src:ArrayBuffer):Void 
	{
		var header = new DataView(src, 0, 12);
		getType(header);
		if (isValid) {
			if (isCompressed) {
				dataFile = new CompressedFile(src);
			} else if (isProtected || isProjector) {
				dataFile = new ProtectedFile(src);
				if (isProjector) {
					dataFile.setProjector();
				}
			} else {
				dataFile = new DirectorFile(src);
			}
			isExternalCast = dataFile.checkCast();
			if (isExternalCast && isProjector) {
				isValid = false;
			}
		}
	}
	private function getType(hint:DataView):Void {
		var head:Int = hint.getUint32(0);
		var formType:Int = hint.getUint32(8);
		var len:Int = 0;
		isValid = true;
		//yep, ugly hard-coding
		switch(head) {
			//XFIR and RIFX
			case 0x58464952:
				riffType = "XFIR";
				len = hint.getUint32(4, true);
			case 0x52494658:
				riffType = "RIFX";
				len = hint.getUint32(4, false);
			default:
				isValid = false;
		}
		if ((hint.buffer.byteLength - 8) != len) {
			isValid = false;
		}
		isCompressed = false;
		isProtected = false;
		isProjector = false;
		switch(formType) {
			//39VM and MV93
			case 0x3339564D:
				if (riffType != "XFIR") {
					isValid = false;
				}
			case 0x4D563933:
				if (riffType != "RIFX") {
					isValid = false;
				}
			//MDGF and FGDM
			case 0x4D444746:
				if (riffType != "XFIR") {
					isValid = false;
				}
				isCompressed = true;
			case 0x4647444D:
				if (riffType != "RIFX") {
					isValid = false;
				}
				isCompressed = true;
			//LPPA and APPL
			case 0x4C505041:
				if (riffType != "XFIR") {
					isValid = false;
				}
				isProjector = true;
			case 0x4150504C:
				if (riffType != "RIFX") {
					isValid = false;
				}
				isProjector = true;
			default:
				isValid = false;
		}
	}
	
}