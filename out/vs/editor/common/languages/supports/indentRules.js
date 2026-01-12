/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var IndentConsts;
(function (IndentConsts) {
    IndentConsts[IndentConsts["INCREASE_MASK"] = 1] = "INCREASE_MASK";
    IndentConsts[IndentConsts["DECREASE_MASK"] = 2] = "DECREASE_MASK";
    IndentConsts[IndentConsts["INDENT_NEXTLINE_MASK"] = 4] = "INDENT_NEXTLINE_MASK";
    IndentConsts[IndentConsts["UNINDENT_MASK"] = 8] = "UNINDENT_MASK";
})(IndentConsts || (IndentConsts = {}));
function resetGlobalRegex(reg) {
    if (reg.global) {
        reg.lastIndex = 0;
    }
    return true;
}
export class IndentRulesSupport {
    constructor(indentationRules) {
        this._indentationRules = indentationRules;
    }
    shouldIncrease(text) {
        if (this._indentationRules) {
            if (this._indentationRules.increaseIndentPattern &&
                resetGlobalRegex(this._indentationRules.increaseIndentPattern) &&
                this._indentationRules.increaseIndentPattern.test(text)) {
                return true;
            }
            // if (this._indentationRules.indentNextLinePattern && this._indentationRules.indentNextLinePattern.test(text)) {
            // 	return true;
            // }
        }
        return false;
    }
    shouldDecrease(text) {
        if (this._indentationRules &&
            this._indentationRules.decreaseIndentPattern &&
            resetGlobalRegex(this._indentationRules.decreaseIndentPattern) &&
            this._indentationRules.decreaseIndentPattern.test(text)) {
            return true;
        }
        return false;
    }
    shouldIndentNextLine(text) {
        if (this._indentationRules &&
            this._indentationRules.indentNextLinePattern &&
            resetGlobalRegex(this._indentationRules.indentNextLinePattern) &&
            this._indentationRules.indentNextLinePattern.test(text)) {
            return true;
        }
        return false;
    }
    shouldIgnore(text) {
        // the text matches `unIndentedLinePattern`
        if (this._indentationRules &&
            this._indentationRules.unIndentedLinePattern &&
            resetGlobalRegex(this._indentationRules.unIndentedLinePattern) &&
            this._indentationRules.unIndentedLinePattern.test(text)) {
            return true;
        }
        return false;
    }
    getIndentMetadata(text) {
        let ret = 0;
        if (this.shouldIncrease(text)) {
            ret += 1 /* IndentConsts.INCREASE_MASK */;
        }
        if (this.shouldDecrease(text)) {
            ret += 2 /* IndentConsts.DECREASE_MASK */;
        }
        if (this.shouldIndentNextLine(text)) {
            ret += 4 /* IndentConsts.INDENT_NEXTLINE_MASK */;
        }
        if (this.shouldIgnore(text)) {
            ret += 8 /* IndentConsts.UNINDENT_MASK */;
        }
        return ret;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZW50UnVsZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbGFuZ3VhZ2VzL3N1cHBvcnRzL2luZGVudFJ1bGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE1BQU0sQ0FBTixJQUFrQixZQUtqQjtBQUxELFdBQWtCLFlBQVk7SUFDN0IsaUVBQTBCLENBQUE7SUFDMUIsaUVBQTBCLENBQUE7SUFDMUIsK0VBQWlDLENBQUE7SUFDakMsaUVBQTBCLENBQUE7QUFDM0IsQ0FBQyxFQUxpQixZQUFZLEtBQVosWUFBWSxRQUs3QjtBQUVELFNBQVMsZ0JBQWdCLENBQUMsR0FBVztJQUNwQyxJQUFJLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNoQixHQUFHLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQTtJQUNsQixDQUFDO0lBRUQsT0FBTyxJQUFJLENBQUE7QUFDWixDQUFDO0FBRUQsTUFBTSxPQUFPLGtCQUFrQjtJQUc5QixZQUFZLGdCQUFpQztRQUM1QyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsZ0JBQWdCLENBQUE7SUFDMUMsQ0FBQztJQUVNLGNBQWMsQ0FBQyxJQUFZO1FBQ2pDLElBQUksSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDNUIsSUFDQyxJQUFJLENBQUMsaUJBQWlCLENBQUMscUJBQXFCO2dCQUM1QyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMscUJBQXFCLENBQUM7Z0JBQzlELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQ3RELENBQUM7Z0JBQ0YsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1lBQ0QsaUhBQWlIO1lBQ2pILGdCQUFnQjtZQUNoQixJQUFJO1FBQ0wsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVNLGNBQWMsQ0FBQyxJQUFZO1FBQ2pDLElBQ0MsSUFBSSxDQUFDLGlCQUFpQjtZQUN0QixJQUFJLENBQUMsaUJBQWlCLENBQUMscUJBQXFCO1lBQzVDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQztZQUM5RCxJQUFJLENBQUMsaUJBQWlCLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUN0RCxDQUFDO1lBQ0YsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRU0sb0JBQW9CLENBQUMsSUFBWTtRQUN2QyxJQUNDLElBQUksQ0FBQyxpQkFBaUI7WUFDdEIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLHFCQUFxQjtZQUM1QyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMscUJBQXFCLENBQUM7WUFDOUQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFDdEQsQ0FBQztZQUNGLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVNLFlBQVksQ0FBQyxJQUFZO1FBQy9CLDJDQUEyQztRQUMzQyxJQUNDLElBQUksQ0FBQyxpQkFBaUI7WUFDdEIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLHFCQUFxQjtZQUM1QyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMscUJBQXFCLENBQUM7WUFDOUQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFDdEQsQ0FBQztZQUNGLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVNLGlCQUFpQixDQUFDLElBQVk7UUFDcEMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFBO1FBQ1gsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDL0IsR0FBRyxzQ0FBOEIsQ0FBQTtRQUNsQyxDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDL0IsR0FBRyxzQ0FBOEIsQ0FBQTtRQUNsQyxDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNyQyxHQUFHLDZDQUFxQyxDQUFBO1FBQ3pDLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUM3QixHQUFHLHNDQUE4QixDQUFBO1FBQ2xDLENBQUM7UUFDRCxPQUFPLEdBQUcsQ0FBQTtJQUNYLENBQUM7Q0FDRCJ9