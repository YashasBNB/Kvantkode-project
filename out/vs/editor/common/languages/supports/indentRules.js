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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZW50UnVsZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2xhbmd1YWdlcy9zdXBwb3J0cy9pbmRlbnRSdWxlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxNQUFNLENBQU4sSUFBa0IsWUFLakI7QUFMRCxXQUFrQixZQUFZO0lBQzdCLGlFQUEwQixDQUFBO0lBQzFCLGlFQUEwQixDQUFBO0lBQzFCLCtFQUFpQyxDQUFBO0lBQ2pDLGlFQUEwQixDQUFBO0FBQzNCLENBQUMsRUFMaUIsWUFBWSxLQUFaLFlBQVksUUFLN0I7QUFFRCxTQUFTLGdCQUFnQixDQUFDLEdBQVc7SUFDcEMsSUFBSSxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDaEIsR0FBRyxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUE7SUFDbEIsQ0FBQztJQUVELE9BQU8sSUFBSSxDQUFBO0FBQ1osQ0FBQztBQUVELE1BQU0sT0FBTyxrQkFBa0I7SUFHOUIsWUFBWSxnQkFBaUM7UUFDNUMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLGdCQUFnQixDQUFBO0lBQzFDLENBQUM7SUFFTSxjQUFjLENBQUMsSUFBWTtRQUNqQyxJQUFJLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQzVCLElBQ0MsSUFBSSxDQUFDLGlCQUFpQixDQUFDLHFCQUFxQjtnQkFDNUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLHFCQUFxQixDQUFDO2dCQUM5RCxJQUFJLENBQUMsaUJBQWlCLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUN0RCxDQUFDO2dCQUNGLE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztZQUNELGlIQUFpSDtZQUNqSCxnQkFBZ0I7WUFDaEIsSUFBSTtRQUNMLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFTSxjQUFjLENBQUMsSUFBWTtRQUNqQyxJQUNDLElBQUksQ0FBQyxpQkFBaUI7WUFDdEIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLHFCQUFxQjtZQUM1QyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMscUJBQXFCLENBQUM7WUFDOUQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFDdEQsQ0FBQztZQUNGLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVNLG9CQUFvQixDQUFDLElBQVk7UUFDdkMsSUFDQyxJQUFJLENBQUMsaUJBQWlCO1lBQ3RCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxxQkFBcUI7WUFDNUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLHFCQUFxQixDQUFDO1lBQzlELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQ3RELENBQUM7WUFDRixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFTSxZQUFZLENBQUMsSUFBWTtRQUMvQiwyQ0FBMkM7UUFDM0MsSUFDQyxJQUFJLENBQUMsaUJBQWlCO1lBQ3RCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxxQkFBcUI7WUFDNUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLHFCQUFxQixDQUFDO1lBQzlELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQ3RELENBQUM7WUFDRixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFTSxpQkFBaUIsQ0FBQyxJQUFZO1FBQ3BDLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQTtRQUNYLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQy9CLEdBQUcsc0NBQThCLENBQUE7UUFDbEMsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQy9CLEdBQUcsc0NBQThCLENBQUE7UUFDbEMsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDckMsR0FBRyw2Q0FBcUMsQ0FBQTtRQUN6QyxDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDN0IsR0FBRyxzQ0FBOEIsQ0FBQTtRQUNsQyxDQUFDO1FBQ0QsT0FBTyxHQUFHLENBQUE7SUFDWCxDQUFDO0NBQ0QifQ==