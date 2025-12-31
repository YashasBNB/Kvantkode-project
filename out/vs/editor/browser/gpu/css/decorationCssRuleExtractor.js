/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { $, getActiveDocument } from '../../../../base/browser/dom.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import './media/decorationCssRuleExtractor.css';
/**
 * Extracts CSS rules that would be applied to certain decoration classes.
 */
export class DecorationCssRuleExtractor extends Disposable {
    constructor() {
        super();
        this._ruleCache = new Map();
        this._container = $('div.monaco-decoration-css-rule-extractor');
        this._dummyElement = $('span');
        this._container.appendChild(this._dummyElement);
        this._register(toDisposable(() => this._container.remove()));
    }
    getStyleRules(canvas, decorationClassName) {
        // Check cache
        const existing = this._ruleCache.get(decorationClassName);
        if (existing) {
            return existing;
        }
        // Set up DOM
        this._dummyElement.className = decorationClassName;
        canvas.appendChild(this._container);
        // Get rules
        const rules = this._getStyleRules(decorationClassName);
        this._ruleCache.set(decorationClassName, rules);
        // Tear down DOM
        canvas.removeChild(this._container);
        return rules;
    }
    _getStyleRules(className) {
        // Iterate through all stylesheets and imported stylesheets to find matching rules
        const rules = [];
        const doc = getActiveDocument();
        const stylesheets = [...doc.styleSheets];
        for (let i = 0; i < stylesheets.length; i++) {
            const stylesheet = stylesheets[i];
            for (const rule of stylesheet.cssRules) {
                if (rule instanceof CSSImportRule) {
                    if (rule.styleSheet) {
                        stylesheets.push(rule.styleSheet);
                    }
                }
                else if (rule instanceof CSSStyleRule) {
                    // Note that originally `.matches(rule.selectorText)` was used but this would
                    // not pick up pseudo-classes which are important to determine support of the
                    // returned styles.
                    //
                    // Since a selector could contain a class name lookup that is simple a prefix of
                    // the class name we are looking for, we need to also check the character after
                    // it.
                    const searchTerm = `.${className}`;
                    const index = rule.selectorText.indexOf(searchTerm);
                    if (index !== -1) {
                        const endOfResult = index + searchTerm.length;
                        if (rule.selectorText.length === endOfResult ||
                            rule.selectorText.substring(endOfResult, endOfResult + 1).match(/[ :]/)) {
                            rules.push(rule);
                        }
                    }
                }
            }
        }
        return rules;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbkNzc1J1bGVFeHRyYWN0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9ncHUvY3NzL2RlY29yYXRpb25Dc3NSdWxlRXh0cmFjdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9FLE9BQU8sd0NBQXdDLENBQUE7QUFFL0M7O0dBRUc7QUFDSCxNQUFNLE9BQU8sMEJBQTJCLFNBQVEsVUFBVTtJQU16RDtRQUNDLEtBQUssRUFBRSxDQUFBO1FBSEEsZUFBVSxHQUFnRCxJQUFJLEdBQUcsRUFBRSxDQUFBO1FBSzFFLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLDBDQUEwQyxDQUFDLENBQUE7UUFDL0QsSUFBSSxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDOUIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBRS9DLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQzdELENBQUM7SUFFRCxhQUFhLENBQUMsTUFBbUIsRUFBRSxtQkFBMkI7UUFDN0QsY0FBYztRQUNkLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUE7UUFDekQsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLE9BQU8sUUFBUSxDQUFBO1FBQ2hCLENBQUM7UUFFRCxhQUFhO1FBQ2IsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLEdBQUcsbUJBQW1CLENBQUE7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7UUFFbkMsWUFBWTtRQUNaLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtRQUN0RCxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUUvQyxnQkFBZ0I7UUFDaEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7UUFFbkMsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRU8sY0FBYyxDQUFDLFNBQWlCO1FBQ3ZDLGtGQUFrRjtRQUNsRixNQUFNLEtBQUssR0FBRyxFQUFFLENBQUE7UUFDaEIsTUFBTSxHQUFHLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQTtRQUMvQixNQUFNLFdBQVcsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQ3hDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDN0MsTUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2pDLEtBQUssTUFBTSxJQUFJLElBQUksVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUN4QyxJQUFJLElBQUksWUFBWSxhQUFhLEVBQUUsQ0FBQztvQkFDbkMsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7d0JBQ3JCLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO29CQUNsQyxDQUFDO2dCQUNGLENBQUM7cUJBQU0sSUFBSSxJQUFJLFlBQVksWUFBWSxFQUFFLENBQUM7b0JBQ3pDLDZFQUE2RTtvQkFDN0UsNkVBQTZFO29CQUM3RSxtQkFBbUI7b0JBQ25CLEVBQUU7b0JBQ0YsZ0ZBQWdGO29CQUNoRiwrRUFBK0U7b0JBQy9FLE1BQU07b0JBQ04sTUFBTSxVQUFVLEdBQUcsSUFBSSxTQUFTLEVBQUUsQ0FBQTtvQkFDbEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUE7b0JBQ25ELElBQUksS0FBSyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7d0JBQ2xCLE1BQU0sV0FBVyxHQUFHLEtBQUssR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFBO3dCQUM3QyxJQUNDLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxLQUFLLFdBQVc7NEJBQ3hDLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxXQUFXLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUN0RSxDQUFDOzRCQUNGLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7d0JBQ2pCLENBQUM7b0JBQ0YsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7Q0FDRCJ9