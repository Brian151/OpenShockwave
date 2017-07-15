window.lib = (function () {
	var lib = {};

	lib.moviePropertyNames00 = {
		0x00: "floatPrecision",
		0x01: "mouseDownScript",
		0x02: "mouseUpScript",
		0x03: "keyDownScript",
		0x04: "keyUpScript",
		0x05: "timeoutScript",
	};

	lib.timeNames = {
		0x01: "short time",
		0x02: "abbr time",
		0x03: "long time",
		0x04: "short date",
		0x05: "abbr date",
		0x06: "long date"
	};

	lib.chunkTypeNames = {
		0x01: "char",
		0x02: "word",
		0x03: "item",
		0x04: "line"
	};

	lib.menuPropertyNames = {
		0x01: "name",
		0x02: "number of menuItems"
	};

	lib.menuItemPropertyNames = {
		0x01: "name",
		0x02: "checkMark",
		0x03: "enabled",
		0x04: "script"
	};

	lib.soundPropertyNames = {
		0x01: "volume"
	};

	lib.spritePropertyNames = {
		0x01: "type",
		0x02: "backColor",
		0x03: "bottom",
		0x04: "castNum",
		0x05: "constraint",
		0x06: "cursor",
		0x07: "foreColor",
		0x08: "height",
		0x0a: "ink",
		0x0b: "left",
		0x0c: "lineSize",
		0x0d: "locH",
		0x0e: "locV",
		0x0f: "movieRate",
		0x10: "movieTime",
		0x12: "puppet",
		0x13: "right",
		0x14: "startTime",
		0x15: "stopTime",
		0x16: "stretch",
		0x17: "top",
		0x18: "trails",
		0x19: "visible",
		0x1a: "volume",
		0x1b: "width",
		0x1d: "scriptNum",
		0x1e: "moveableSprite",
		0x20: "scoreColor"
	};

	lib.moviePropertyNames07 = {
		0x01: "beepOn",
		0x02: "buttonStyle",
		0x03: "centerStage",
		0x04: "checkBoxAccess",
		0x05: "checkboxType",
		0x06: "colorDepth",
		0x08: "exitLock",
		0x09: "fixStageSize",
		0x13: "timeoutLapsed",
		0x17: "selEnd",
		0x18: "selStart",
		0x19: "soundEnabled",
		0x1a: "soundLevel",
		0x1b: "stageColor",
		0x1d: "stillDown",
		0x1e: "timeoutKeyDown",
		0x1f: "timeoutLength",
		0x20: "timeoutMouse",
		0x21: "timeoutPlay",
		0x22: "timer"
	};

	lib.countableObjectNames = {
		0x02: "castMember",
		0x03: "menu"
	};

	lib.castPropertyNames09 = {
		0x01: "name",
		0x02: "text",
		0x08: "picture",
		0x0a: "number",
		0x0b: "size",
		0x11: "foreColor",
		0x12: "backColor"
	};

	lib.fieldPropertyNames = {
		0x03: "textStyle",
		0x04: "textFont",
		0x05: "textHeight",
		0x06: "textAlign",
		0x07: "textSize"
	};

	lib.castPropertyNames0d = {
		0x01: "sound"
	};

	return lib;
})();