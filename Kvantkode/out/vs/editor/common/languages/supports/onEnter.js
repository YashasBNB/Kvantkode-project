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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib25FbnRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9sYW5ndWFnZXMvc3VwcG9ydHMvb25FbnRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNyRSxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBQzdELE9BQU8sRUFBOEIsWUFBWSxFQUFlLE1BQU0sNkJBQTZCLENBQUE7QUFlbkcsTUFBTSxPQUFPLGNBQWM7SUFJMUIsWUFBWSxJQUE0QjtRQUN2QyxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQTtRQUNqQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLElBQUk7WUFDaEMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO1lBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO1lBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO1NBQ1YsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFBO1FBQ25CLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDakMsTUFBTSxVQUFVLEdBQUcsY0FBYyxDQUFDLHdCQUF3QixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3RFLE1BQU0sV0FBVyxHQUFHLGNBQWMsQ0FBQyx5QkFBeUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN4RSxJQUFJLFVBQVUsSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFDL0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUM7b0JBQ25CLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO29CQUNoQixV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