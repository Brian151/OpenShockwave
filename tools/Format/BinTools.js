/*
Imported from code I (Brian151) wrote here : https://jsfiddle.net/721c2py0/2/
Also imported further from : https://github.com/Brian151/UnNamed-html5-Game-Library/blob/master/GameLib/util/BinTools.js
*/
var BinTools = new function(){}();
//imported from code I (Brian151) wrote here: https://jsfiddle.net/158vahfc/1/
BinTools.bitfieldUtil = new function(){
	//masks for reading/toggling bits
	this.masks = [
		0b10000000,
		0b01000000,
		0b00100000,
		0b00010000,
		0b00001000,
		0b00000100,
		0b00000010,
		0b00000001
	];
	/*
	masks for copying all non-targeted
	bits when performing the toggle operation
	*/
	this.masks2 = [
		0b01111111
		0b10111111
		0b11011111
		0b11101111
		0b11110111
		0b11111011
		0b11111101
		0b11111110
	];
	//how much to bitwise shift to read the specified bit
	this.shifts = [7,6,5,4,3,2,1,0];
}();
BinTools.bitfieldUtil.readFlag = function(field,flag){
	var out = (field & this.masks[flag - 1]) >> this.shifts[flag - 1];
	return out;
}
BinTools.bitfieldUtil.toggleFlag = function(field,flag) {
	var mask1 = this.masks2[flag - 1]; //mask to copy non-targeted bits
	var mask2 = this.masks[flag - 1]; //mask to toggle target bit
	var temp = field & mask1; //use bitwise AND to copy the non-target bits 
	var out = field ^ mask2; //use bitwise XOR to toggle the target bit
	out = out | temp; //use bitwise OR to re-combine the non-target bits
	return out;
}
BinTools.bitfieldUtil.dumpField = function(field){
	return field.toString(2);
}
BinTools.bitfieldUtil.bitToBool = function(bit) {
	var out = false;
	if (bit > 0) out = true;
	return out;
}
BinTools.bitfieldUtil.boolToBit = function(bool) {
	var out = 0b00000000;
	if (bool > 0) out = 0b00000001;
	return out;
}
BinTools.bitfieldUtil.fieldToBooleanArray = function(field) {
	var out = [];
	out[0] = this.bitToBool((field & this.masks[1 - 1]) >> this.shifts[1 - 1]);
	out[1] = this.bitToBool((field & this.masks[2 - 1]) >> this.shifts[2 - 1]);
	out[2] = this.bitToBool((field & this.masks[3 - 1]) >> this.shifts[3 - 1]);
	out[3] = this.bitToBool((field & this.masks[4 - 1]) >> this.shifts[4 - 1]);
	out[4] = this.bitToBool((field & this.masks[5 - 1]) >> this.shifts[5 - 1]);
	out[5] = this.bitToBool((field & this.masks[6 - 1]) >> this.shifts[6 - 1]);
	out[6] = this.bitToBool((field & this.masks[7 - 1]) >> this.shifts[7 - 1]);
	out[7] = this.bitToBool((field & this.masks[8 - 1]) >> this.shifts[8 - 1]);
	return out;
}
BinTools.bitfieldUtil.booleanArrayToField = function(boolArray) {
	out = 0b00000000;
	out += this.boolToBit(boolArray[0]) << this.shifts[0];
	out += this.boolToBit(boolArray[1]) << this.shifts[1];
	out += this.boolToBit(boolArray[2]) << this.shifts[2];
	out += this.boolToBit(boolArray[3]) << this.shifts[3];
	out += this.boolToBit(boolArray[4]) << this.shifts[4];
	out += this.boolToBit(boolArray[5]) << this.shifts[5];
	out += this.boolToBit(boolArray[6]) << this.shifts[6];
	out += this.boolToBit(boolArray[7]) << this.shifts[7];
	return out;
}