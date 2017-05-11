package brian151.earthquake.filesystem.sections;
import brian151.earthquake.CastMember;
import brian151.riff.LinkedSectionHandler;
import brian151.riff.Section;
import brian151.riff.SectionHandler;
import brian151.riff.Section;

/**
 * ...
 * @author Brian151
 */
@:expose
#if (compileLvl=="libShockwave")
@:keep
#end
class CastMemberHeader extends LinkedSectionHandler
{
	public function new(src:Section):Void{
		super(src);
	}
	public function fromStandard():CastMember{
		return new CastMember();
		onComplete();
	}
	public function fromProtected():CastMember{
		return new CastMember();
		onComplete();
	}
	public function fromCompressed():CastMember{
		return new CastMember();
		onComplete();
	}
}