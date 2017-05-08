package brian151.riff;
import js.html.DataView;

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

//to-do: recover lost progress

/**
 * ...
 * @author Brian151
 */
@:expose
#if (compileLvl=="libRIFF")
@:keep
#end
class SectionHandler 
{
	private var target:Section;
	private var view:DataView;
	public function new(src:Section):Void {
		target = src;
		view = target.get_view();
	}
}