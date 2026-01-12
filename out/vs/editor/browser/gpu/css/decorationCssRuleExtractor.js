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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbkNzc1J1bGVFeHRyYWN0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2dwdS9jc3MvZGVjb3JhdGlvbkNzc1J1bGVFeHRyYWN0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0UsT0FBTyx3Q0FBd0MsQ0FBQTtBQUUvQzs7R0FFRztBQUNILE1BQU0sT0FBTywwQkFBMkIsU0FBUSxVQUFVO0lBTXpEO1FBQ0MsS0FBSyxFQUFFLENBQUE7UUFIQSxlQUFVLEdBQWdELElBQUksR0FBRyxFQUFFLENBQUE7UUFLMUUsSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsMENBQTBDLENBQUMsQ0FBQTtRQUMvRCxJQUFJLENBQUMsYUFBYSxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUM5QixJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUE7UUFFL0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDN0QsQ0FBQztJQUVELGFBQWEsQ0FBQyxNQUFtQixFQUFFLG1CQUEyQjtRQUM3RCxjQUFjO1FBQ2QsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtRQUN6RCxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2QsT0FBTyxRQUFRLENBQUE7UUFDaEIsQ0FBQztRQUVELGFBQWE7UUFDYixJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsR0FBRyxtQkFBbUIsQ0FBQTtRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUVuQyxZQUFZO1FBQ1osTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1FBQ3RELElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLG1CQUFtQixFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRS9DLGdCQUFnQjtRQUNoQixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUVuQyxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFTyxjQUFjLENBQUMsU0FBaUI7UUFDdkMsa0ZBQWtGO1FBQ2xGLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQTtRQUNoQixNQUFNLEdBQUcsR0FBRyxpQkFBaUIsRUFBRSxDQUFBO1FBQy9CLE1BQU0sV0FBVyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDeEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUM3QyxNQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDakMsS0FBSyxNQUFNLElBQUksSUFBSSxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ3hDLElBQUksSUFBSSxZQUFZLGFBQWEsRUFBRSxDQUFDO29CQUNuQyxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQzt3QkFDckIsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7b0JBQ2xDLENBQUM7Z0JBQ0YsQ0FBQztxQkFBTSxJQUFJLElBQUksWUFBWSxZQUFZLEVBQUUsQ0FBQztvQkFDekMsNkVBQTZFO29CQUM3RSw2RUFBNkU7b0JBQzdFLG1CQUFtQjtvQkFDbkIsRUFBRTtvQkFDRixnRkFBZ0Y7b0JBQ2hGLCtFQUErRTtvQkFDL0UsTUFBTTtvQkFDTixNQUFNLFVBQVUsR0FBRyxJQUFJLFNBQVMsRUFBRSxDQUFBO29CQUNsQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQTtvQkFDbkQsSUFBSSxLQUFLLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQzt3QkFDbEIsTUFBTSxXQUFXLEdBQUcsS0FBSyxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUE7d0JBQzdDLElBQ0MsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEtBQUssV0FBVzs0QkFDeEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLFdBQVcsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQ3RFLENBQUM7NEJBQ0YsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTt3QkFDakIsQ0FBQztvQkFDRixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztDQUNEIn0=