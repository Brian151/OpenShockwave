package brian151.earthquake.castlib;

/**
 * ...
 * @author Brian151
 */
@:expose
#if (compileLvl=="libShockwave")
@:keep
#end
class Cast 
{
	private var storageType:String;
	private var name:String;
	public function new(type:String,nameText:String) {
		storageType = type;
		name = nameText;
	}
}