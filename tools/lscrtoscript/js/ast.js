window.AST = (function () {
	/* AST */

	class AST {
		constructor(root) {
			this.root = root;
			this.root.parent = this;
			this.currentBlock = this.root.children.block;
		}

		toString() {
			return this.root.toString();
		}

		addStatement(statement) {
			this.currentBlock.addChild(statement);
		}

		enterBlock(block) {
			this.currentBlock = block;
		}

		exitBlock() {
			this.currentBlock = this.currentBlock.parentThatIsA(Block);
		}

		lastStatement() {
			return this.currentBlock.children[this.currentBlock.children.length - 1];
		}
	}

	/* Node */

	class Node {
		constructor() {
			this.parent = null;
			this.children = {};
		}
		
		toString() {
			return "";
		}

		toPseudocode() {
			return this.toString();
		}

		getValue() {
			return true; // placeholder...
		}

		addChild(name, child) {
			this.children[name] = child;
			if (child) child.parent = this;
		}

		parentThatIsA(constructor) {
			if (!this.parent || this.parent instanceof constructor) {
				return this.parent;
			}
			return this.parent.parentThatIsA(constructor);
		}
	}

	/* TODO */

	class TODO extends Node {
		toString() {
			return "TODO";
		}
	}
	AST.TODO = TODO;

	/* ERROR */

	class ERROR extends Node {
		toString() {
			return "ERROR";
		}
	}
	AST.ERROR = ERROR;

	/* Literal */

	class Literal extends Node {
		constructor(value) {
			super();
			this.value = value;
		}

		toString() {
			return this.value.toString();
		}

		getValue() {
			return this.value;
		}
	}

	/* StringLiteral */

	class StringLiteral extends Literal {
		toString() {
			return JSON.stringify(this.value);
		}
	}
	AST.StringLiteral = StringLiteral;

	/* IntLiteral */

	class IntLiteral extends Literal {}
	AST.IntLiteral = IntLiteral;

	/* FloatLiteral */

	class FloatLiteral extends Literal {}
	AST.FloatLiteral = FloatLiteral;

	/* ListLiteral */

	class ListLiteral extends Literal {
		toString(noBrackets) {
			let listString = this.value.join(", ");
			return noBrackets ? listString : "[" + listString + "]";
		}
	}
	AST.ListLiteral = ListLiteral;

	/* ArgListLiteral */

	class ArgListLiteral extends ListLiteral {}
	AST.ArgListLiteral = ArgListLiteral;

	/* SymbolLiteral */

	class SymbolLiteral extends Literal {
		toString() {
			return "#" + this.value;
		}
	}
	AST.SymbolLiteral = SymbolLiteral;

	/* Block */

	class Block extends Node {
		constructor(children) {
			super();
			this.children = children || [];
		}

		toString() {
			const indent = "\n  ";
			return indent + this.children.map(child => child.toString().split("\n").join(indent)).join(indent);
		}

		addChild(child) {
			this.children.push(child);
			if (child) child.parent = this;
		}
	}
	AST.Block = Block;

	/* Handler */

	class Handler extends Node {
		constructor(name, args, block) {
			super();
			this.name = name;
			this.args = args;
			this.addChild("block", block || new Block());
		}

		toString() {
			return "on " + this.name + "(" + this.args.toString(true) + ")" + this.children.block + "\nend";
		}
	}
	AST.Handler = Handler;

	/* ExitStatement */

	class ExitStatement extends Node {
		toString() {
			return "exit";
		}
	}
	AST.ExitStatement = ExitStatement;

	/* InverseOperator */

	class InverseOperator extends Node {
		constructor(operand) {
			super();
			this.addChild("operand", operand);
		}

		toString() {
			return "-" + this.children.operand;
		}
	}
	AST.InverseOperator = InverseOperator;

	/* NotOperator */

	class NotOperator extends Node {
		constructor(operand) {
			super();
			this.addChild("operand", operand);
		}

		toString() {
			return "not " + this.children.operand;
		}
	}
	AST.NotOperator = NotOperator;

	/* BinaryOperator */

	class BinaryOperator extends Node {
		constructor(name, left, right) {
			super();
			this.name = name;
			this.addChild("left", left);
			this.addChild("right", right);
		}

		toString() {
			return this.children.left + " " + this.name + " " + this.children.right;
		}
	}
	AST.BinaryOperator = BinaryOperator;

	/* StringSplitExpression */

	class StringSplitExpression extends Node {
		constructor(type, first, last, string) {
			super();
			this.type = type;
			this.addChild("first", first);
			this.addChild("last", last);
			this.addChild("string", string);
		}

		toString() {
			var result = this.children.string + "." + this.type + "[" + this.children.first;
			if (this.last.getValue()) {
				result += ".." + this.children.last;
			}
			this.result += "]";
			return result;
		}
	}
	AST.StringSplitExpression = StringSplitExpression;

	/* StringHilightCommand */

	class StringHilightCommand extends StringSplitExpression {
		constructor(type, first, last, string) {
			super(type, first, last, string);
		}

		toString() {
			result = super.toString();
			result += ".hilite()";
			return result;
		}
	}
	AST.StringHilightCommand = StringHilightCommand;

	/* SpriteIntersectsExpression */

	class SpriteIntersectsExpression extends Node {
		constructor(firstSprite, secondSprite) {
			super();
			this.addChild("firstSprite", firstSprite);
			this.addChild("secondSprite", secondSprite);
		}

		toString() {
			return "sprite(" + this.children.firstSprite + ").intersects(" + this.children.secondSprite + ")";
		}
	}
	AST.SpriteIntersectsExpression = SpriteIntersectsExpression;

	/* SpriteWithinExpression */

	class SpriteWithinExpression extends Node {
		constructor(firstSprite, secondSprite) {
			super();
			this.addChild("firstSprite", firstSprite);
			this.addChild("secondSprite", secondSprite);
		}

		toString() {
			return "sprite(" + this.children.firstSprite + ").within(" + this.children.secondSprite + ")";
		}
	}
	AST.SpriteWithinExpression = SpriteWithinExpression;

	/* FieldReference */

	class FieldReference extends Node {
		constructor(fieldID) {
			super();
			this.addChild("fieldID", fieldID);
		}

		toString() {
			return "field(" + this.children.fieldID + ")";
		}
	}
	AST.FieldReference = FieldReference;

	/* VarReference */

	class VarReference extends Node {
		constructor(varName) {
			super();
			this.varName = varName;
		}

		toString() {
			return this.varName;
		}
	}

	/* GlobalVarReference */

	class GlobalVarReference extends VarReference {}
	AST.GlobalVarReference = GlobalVarReference;

	/* LocalVarReference */

	class LocalVarReference extends VarReference {}
	AST.LocalVarReference = LocalVarReference;

	/* ParamReference */

	class ParamReference extends VarReference {}
	AST.ParamReference = ParamReference;

	/* VarAssignment */

	class AssignmentStatement extends Node {
		constructor(variable, value) {
			super();
			this.variable = variable;
			this.addChild("value", value);
		}

		toString() {
			return this.variable + " = " + this.children.value;
		}
	}
	AST.AssignmentStatement = AssignmentStatement;

	/* IfStatement */

	class IfStatement extends Node {
		constructor(type, condition, block1, block2) {
			super();
			this.type = type || "if";
			this.addChild("condition", condition);
			this.addChild("block1", block1 || new Block());
			this.addChild("block2", this.type === "if_else" ? (block2 || null) : null);
		}

		toString() {
			if (this.type === "if") {
				return "if " + this.children.condition + " then" + this.children.block1 + "\nend if";
			} else if (this.type === "if_else") {
				return "if " + this.children.condition + " then" + this.children.block1 + "\nelse" + this.children.block2 + "\nend if";
			} else if (this.type === "repeat_while") {
				return "repeat while " + this.children.condition + this.children.block1 + "\nend repeat";
			}
		}

		toPseudocode() {
			return "if " + this.children.condition + " then";
		}

		setType(type) {
			this.type = type;
			if (this.type === "if_else") {
				this.addChild("block2", new Block());
			} else {
				delete this.children.block2;
			}
		}
	}
	AST.IfStatement = IfStatement;

	/* CallStatement */

	class CallStatement extends Node {
		constructor(name, argList) {
			super();
			this.name = name;
			this.addChild("argList", argList);
		}

		toString() {
			return this.name + "(" + this.children.argList.toString(true) + ")";
		}
	}

	/* LocalCallStatement */

	class LocalCallStatement extends CallStatement {}
	AST.LocalCallStatement = LocalCallStatement;

	/* ExternalCallStatement */

	class ExternalCallStatement extends CallStatement {}
	AST.ExternalCallStatement = ExternalCallStatement;

	/* MoviePropertyReference */

	class MoviePropertyReference extends Node {
		constructor(propertyName) {
			super();
			this.propertyName = propertyName;
		}

		toString() {
			return "the " + this.propertyName;
		}
	}
	AST.MoviePropertyReference = MoviePropertyReference;

	/* TimeExpression */

	class TimeExpression extends Node {
		constructor(option) {
			super();
			this.option = option;
		}

		toString() {
			return "the " + this.option;
		}
	}
	AST.TimeExpression = TimeExpression;

	/* LastStringChunkExpression */

	class LastStringChunkExpression extends Node {
		constructor(chunkType, string) {
			super();
			this.chunkType = chunkType;
			this.addChild("string", string);
		}

		toString() {
			return "the last " + this.chunkType + " in " + this.children.string;
		}
	}
	AST.LastStringChunkExpression = LastStringChunkExpression;

	/* StringChunkCountExpression */

	class StringChunkCountExpression extends Node {
		constructor(chunkType, string) {
			super();
			this.chunkType = chunkType;
			this.addChild("string", string);
		}

		toString() {
			return "the number of " + this.chunkType + " in " + this.children.string;
		}
	}
	AST.StringChunkCountExpression = StringChunkCountExpression;

	/* MenuPropertyReference */

	class MenuPropertyReference extends Node {
		constructor(menuID, propertyName) {
			super();
			this.addChild("menuID", menuID);
			this.propertyName = propertyName;
		}

		toString() {
			return "menu(" + this.children.menuID + ")." + this.propertyName;
		}
	}
	AST.MenuPropertyReference = MenuPropertyReference;

	/* MenuItemPropertyReference */

	class MenuItemPropertyReference extends Node {
		constructor(menuID, itemID, propertyName) {
			super();
			this.addChild("menuID", menuID);
			this.addChild("itemID", itemID);
			this.propertyName = propertyName;
		}

		toString() {
			return "menu(" + this.children.menuID + ").item(" + this.children.itemID + ")." + this.propertyName;
		}
	}
	AST.MenuItemPropertyReference = MenuItemPropertyReference;

	/* SoundPropertyReference */

	class SoundPropertyReference extends Node {
		constructor(soundID, propertyName) {
			super();
			this.addChild("soundID", soundID);
			this.propertyName = propertyName;
		}

		toString() {
			return "sound(" + this.children.soundID + ")." + this.propertyName;
		}
	}
	AST.SoundPropertyReference = SoundPropertyReference;

	/* SpritePropertyReference */

	class SpritePropertyReference extends Node {
		constructor(menuID, propertyName) {
			super();
			this.addChild("spriteID", spriteID);
			this.propertyName = propertyName;
		}

		toString() {
			return "sprite(" + this.children.spriteID + ")." + this.propertyName;
		}
	}
	AST.SpritePropertyReference = SpritePropertyReference;

	/* ObjCountExpression */

	class ObjCountExpression extends Node {
		constructor(obj) {
			super();
			this.obj = obj;
		}

		toString() {
			return "the number of " + this.obj + "s";
		}
	}
	AST.ObjCountExpression = ObjCountExpression;

	/* CastPropertyReference */

	class CastPropertyReference extends Node {
		constructor(castID, propertyName) {
			super();
			this.addChild("castID", castID);
			this.propertyName = propertyName;
		}

		toString() {
			return "sprite(" + this.children.castID + ")." + this.propertyName;
		}
	}
	AST.CastPropertyReference = CastPropertyReference;

	/* FieldPropertyReference */

	class FieldPropertyReference extends Node {
		constructor(fieldID, propertyName) {
			super();
			this.addChild("fieldID", fieldID);
			this.propertyName = propertyName;
		}

		toString() {
			return "field(" + this.children.fieldID + ")." + this.propertyName;
		}
	}
	AST.FieldPropertyReference = FieldPropertyReference;

	/* MyPropertyReference */

	class MyPropertyReference extends Node {
		constructor(propertyName) {
			super();
			this.propertyName = propertyName;
		}

		toString() {
			return "me." + this.propertyName;
		}
	}
	AST.MyPropertyReference = MyPropertyReference;

	/* ObjPropertyReference */

	class ObjPropertyReference extends Node {
		constructor(obj, propertyName) {
			super();
			this.addChild("obj", obj);
			this.propertyName = propertyName;
		}

		toString() {
			return this.children.obj + "." + this.propertyName;
		}
	}
	AST.ObjPropertyReference = ObjPropertyReference;

	return AST;
})();