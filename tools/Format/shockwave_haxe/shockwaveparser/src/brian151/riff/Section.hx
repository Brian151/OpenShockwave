package brian151.riff;
import js.html.ArrayBuffer;
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
class Section 
{
	private var secID:String;
	private var view:DataView;
	private var length:Int;
	private var realLength:Int;
	public function new(src:ArrayBuffer,offset,len:Int,id:String):Void {
		view = new DataView(src, offset + 8, len);
		length = view.byteLength;
		realLength = length + 8;
		secID = id;
	}
	public function get_length():Int{
		return length;
	}
	public function get_realLength():Int{
		return realLength;
	}
	public function get_view():DataView{
		return view;
	}
	public function get_ID():String{
		return secID;
	}
	
}