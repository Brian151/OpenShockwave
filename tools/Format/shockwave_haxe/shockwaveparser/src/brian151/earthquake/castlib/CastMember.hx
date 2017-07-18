package brian151.earthquake.castlib;

/**
 * ...
 * @author Brian151
 */
@:expose
#if (compileLvl=="libShockwave")
@:keep
#end
class CastMember 
{
	static var types:Array<String> = [
		"Invalid" ,         // 0x00 | 0
		"Bitmap" ,          // 0x01 | 1
		"Film Loop" ,       // 0x02 | 2
		"Styled Text" ,     // 0x03 | 3
		"Palette" ,         // 0x04 | 4
		"Picture" ,         // 0x05 | 5
		"Sound" ,           // 0x06 | 6
		"Button" ,          // 0X07 | 7
		"Vector Shape" ,    // 0x08 | 8
		"Movie" ,           // 0x09 | 9
		"Digital Video" ,   // 0x0A | 10
		"Script" ,          // 0x0B | 11
		"Rich Text (RTF)" , // 0x0C | 12
		"OLE" ,             // 0x0D | 13
		"Transition" ,      // 0x0E | 14
		"Xtra" ,            // 0x0F | 15
	];
	private var name:String;
	private var typeID:Int;
	public function new(type:String,nameText:String) {
		typeID = resolveType(type);
		name = nameText;
	}
	private function resolveType(type:String):Int {
		var out = 15; // just default to xtra...
		for (i in 0...CastMember.types.length) {
			var curr = CastMember.types[i];
			if (curr == type) {
				out = i;
				break;
			}
		}
		return out;
	}
	public function getType():String {
		return CastMember.types[typeID];
	}
}