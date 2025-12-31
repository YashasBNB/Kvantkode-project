/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { onUnexpectedError } from '../../../../base/common/errors.js';
import * as strings from '../../../../base/common/strings.js';
import { IndentAction } from '../languageConfiguration.js';
export class OnEnterSupport {
    constructor(opts) {
        opts = opts || {};
        opts.brackets = opts.brackets || [
            ['(', ')'],
            ['{', '}'],
            ['[', ']'],
        ];
        this._brackets = [];
        opts.brackets.forEach((bracket) => {
            const openRegExp = OnEnterSupport._createOpenBracketRegExp(bracket[0]);
            const closeRegExp = OnEnterSupport._createCloseBracketRegExp(bracket[1]);
            if (openRegExp && closeRegExp) {
                this._brackets.push({
                    open: bracket[0],
                    openRegExp: openRegExp,
                    close: bracket[1],
                    closeRegExp: closeRegExp,
                });
            }
        });
        this._regExpRules = opts.onEnterRules || [];
    }
    onEnter(autoIndent, previousLineText, beforeEnterText, afterEnterText) {
        // (1): `regExpRules`
        if (autoIndent >= 3 /* EditorAutoIndentStrategy.Advanced */) {
            for (let i = 0, len = this._regExpRules.length; i < len; i++) {
                const rule = this._regExpRules[i];
                const regResult = [
                    {
                        reg: rule.beforeText,
                        text: beforeEnterText,
                    },
                    {
                        reg: rule.afterText,
                        text: afterEnterText,
                    },
                    {
                        reg: rule.previousLineText,
                        text: previousLineText,
                    },
                ].every((obj) => {
                    if (!obj.reg) {
                        return true;
                    }
                    obj.reg.lastIndex = 0; // To disable the effect of the "g" flag.
                    return obj.reg.test(obj.text);
                });
                if (regResult) {
                    return rule.action;
                }
            }
        }
        // (2): Special indent-outdent
        if (autoIndent >= 2 /* EditorAutoIndentStrategy.Brackets */) {
            if (beforeEnterText.length > 0 && afterEnterText.length > 0) {
                for (let i = 0, len = this._brackets.length; i < len; i++) {
                    const bracket = this._brackets[i];
                    if (bracket.openRegExp.test(beforeEnterText) &&
                        bracket.closeRegExp.test(afterEnterText)) {
                        return { indentAction: IndentAction.IndentOutdent };
                    }
                }
            }
        }
        // (4): Open bracket based logic
        if (autoIndent >= 2 /* EditorAutoIndentStrategy.Brackets */) {
            if (beforeEnterText.length > 0) {
                for (let i = 0, len = this._brackets.length; i < len; i++) {
                    const bracket = this._brackets[i];
                    if (bracket.openRegExp.test(beforeEnterText)) {
                        return { indentAction: IndentAction.Indent };
                    }
                }
            }
        }
        return null;
    }
    static _createOpenBracketRegExp(bracket) {
        let str = strings.escapeRegExpCharacters(bracket);
        if (!/\B/.test(str.charAt(0))) {
            str = '\\b' + str;
        }
        str += '\\s*$';
        return OnEnterSupport._safeRegExp(str);
    }
    static _createCloseBracketRegExp(bracket) {
        let str = strings.escapeRegExpCharacters(bracket);
        if (!/\B/.test(str.charAt(str.length - 1))) {
            str = str + '\\b';
        }
        str = '^\\s*' + str;
        return OnEnterSupport._safeRegExp(str);
    }
    static _safeRegExp(def) {
        try {
            return new RegExp(def);
        }
        catch (err) {
            onUnexpectedError(err);
            return null;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib25FbnRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbGFuZ3VhZ2VzL3N1cHBvcnRzL29uRW50ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckUsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEVBQThCLFlBQVksRUFBZSxNQUFNLDZCQUE2QixDQUFBO0FBZW5HLE1BQU0sT0FBTyxjQUFjO0lBSTFCLFlBQVksSUFBNEI7UUFDdkMsSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUE7UUFDakIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxJQUFJO1lBQ2hDLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztZQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztZQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztTQUNWLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQTtRQUNuQixJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ2pDLE1BQU0sVUFBVSxHQUFHLGNBQWMsQ0FBQyx3QkFBd0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN0RSxNQUFNLFdBQVcsR0FBRyxjQUFjLENBQUMseUJBQXlCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDeEUsSUFBSSxVQUFVLElBQUksV0FBVyxFQUFFLENBQUM7Z0JBQy9CLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDO29CQUNuQixJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztvQkFDaEIsVUFBVSxF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