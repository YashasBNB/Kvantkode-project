/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../../base/browser/dom.js';
import './findOptionsWidget.css';
import { CaseSensitiveToggle, RegexToggle, WholeWordsToggle, } from '../../../../base/browser/ui/findinput/findInputToggles.js';
import { Widget } from '../../../../base/browser/ui/widget.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { FIND_IDS } from './findModel.js';
import { asCssVariable, inputActiveOptionBackground, inputActiveOptionBorder, inputActiveOptionForeground, } from '../../../../platform/theme/common/colorRegistry.js';
import { createInstantHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
export class FindOptionsWidget extends Widget {
    static { this.ID = 'editor.contrib.findOptionsWidget'; }
    constructor(editor, state, keybindingService) {
        super();
        this._hideSoon = this._register(new RunOnceScheduler(() => this._hide(), 2000));
        this._isVisible = false;
        this._editor = editor;
        this._state = state;
        this._keybindingService = keybindingService;
        this._domNode = document.createElement('div');
        this._domNode.className = 'findOptionsWidget';
        this._domNode.style.display = 'none';
        this._domNode.style.top = '10px';
        this._domNode.style.zIndex = '12';
        this._domNode.setAttribute('role', 'presentation');
        this._domNode.setAttribute('aria-hidden', 'true');
        const toggleStyles = {
            inputActiveOptionBorder: asCssVariable(inputActiveOptionBorder),
            inputActiveOptionForeground: asCssVariable(inputActiveOptionForeground),
            inputActiveOptionBackground: asCssVariable(inputActiveOptionBackground),
        };
        const hoverDelegate = this._register(createInstantHoverDelegate());
        this.caseSensitive = this._register(new CaseSensitiveToggle({
            appendTitle: this._keybindingLabelFor(FIND_IDS.ToggleCaseSensitiveCommand),
            isChecked: this._state.matchCase,
            hoverDelegate,
            ...toggleStyles,
        }));
        this._domNode.appendChild(this.caseSensitive.domNode);
        this._register(this.caseSensitive.onChange(() => {
            this._state.change({
                matchCase: this.caseSensitive.checked,
            }, false);
        }));
        this.wholeWords = this._register(new WholeWordsToggle({
            appendTitle: this._keybindingLabelFor(FIND_IDS.ToggleWholeWordCommand),
            isChecked: this._state.wholeWord,
            hoverDelegate,
            ...toggleStyles,
        }));
        this._domNode.appendChild(this.wholeWords.domNode);
        this._register(this.wholeWords.onChange(() => {
            this._state.change({
                wholeWord: this.wholeWords.checked,
            }, false);
        }));
        this.regex = this._register(new RegexToggle({
            appendTitle: this._keybindingLabelFor(FIND_IDS.ToggleRegexCommand),
            isChecked: this._state.isRegex,
            hoverDelegate,
            ...toggleStyles,
        }));
        this._domNode.appendChild(this.regex.domNode);
        this._register(this.regex.onChange(() => {
            this._state.change({
                isRegex: this.regex.checked,
            }, false);
        }));
        this._editor.addOverlayWidget(this);
        this._register(this._state.onFindReplaceStateChange((e) => {
            let somethingChanged = false;
            if (e.isRegex) {
                this.regex.checked = this._state.isRegex;
                somethingChanged = true;
            }
            if (e.wholeWord) {
                this.wholeWords.checked = this._state.wholeWord;
                somethingChanged = true;
            }
            if (e.matchCase) {
                this.caseSensitive.checked = this._state.matchCase;
                somethingChanged = true;
            }
            if (!this._state.isRevealed && somethingChanged) {
                this._revealTemporarily();
            }
        }));
        this._register(dom.addDisposableListener(this._domNode, dom.EventType.MOUSE_LEAVE, (e) => this._onMouseLeave()));
        this._register(dom.addDisposableListener(this._domNode, 'mouseover', (e) => this._onMouseOver()));
    }
    _keybindingLabelFor(actionId) {
        const kb = this._keybindingService.lookupKeybinding(actionId);
        if (!kb) {
            return '';
        }
        return ` (${kb.getLabel()})`;
    }
    dispose() {
        this._editor.removeOverlayWidget(this);
        super.dispose();
    }
    // ----- IOverlayWidget API
    getId() {
        return FindOptionsWidget.ID;
    }
    getDomNode() {
        return this._domNode;
    }
    getPosition() {
        return {
            preference: 0 /* OverlayWidgetPositionPreference.TOP_RIGHT_CORNER */,
        };
    }
    highlightFindOptions() {
        this._revealTemporarily();
    }
    _revealTemporarily() {
        this._show();
        this._hideSoon.schedule();
    }
    _onMouseLeave() {
        this._hideSoon.schedule();
    }
    _onMouseOver() {
        this._hideSoon.cancel();
    }
    _show() {
        if (this._isVisible) {
            return;
        }
        this._isVisible = true;
        this._domNode.style.display = 'block';
    }
    _hide() {
        if (!this._isVisible) {
            return;
        }
        this._isVisible = false;
        this._domNode.style.display = 'none';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZE9wdGlvbnNXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9maW5kL2Jyb3dzZXIvZmluZE9wdGlvbnNXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLHlCQUF5QixDQUFBO0FBQ2hDLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsV0FBVyxFQUNYLGdCQUFnQixHQUNoQixNQUFNLDJEQUEyRCxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQU9uRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFHekMsT0FBTyxFQUNOLGFBQWEsRUFDYiwyQkFBMkIsRUFDM0IsdUJBQXVCLEVBQ3ZCLDJCQUEyQixHQUMzQixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBRXRHLE1BQU0sT0FBTyxpQkFBa0IsU0FBUSxNQUFNO2FBQ3BCLE9BQUUsR0FBRyxrQ0FBa0MsQUFBckMsQ0FBcUM7SUFXL0QsWUFBWSxNQUFtQixFQUFFLEtBQXVCLEVBQUUsaUJBQXFDO1FBQzlGLEtBQUssRUFBRSxDQUFBO1FBb0pBLGNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZ0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUE7UUFlMUUsZUFBVSxHQUFZLEtBQUssQ0FBQTtRQWpLbEMsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUE7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