/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ReplInputHintContentWidget_1;
import * as dom from '../../../../base/browser/dom.js';
import { status } from '../../../../base/browser/ui/aria/aria.js';
import { KeybindingLabel } from '../../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { OS } from '../../../../base/common/platform.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ReplEditorSettings } from './interactiveCommon.js';
let ReplInputHintContentWidget = class ReplInputHintContentWidget extends Disposable {
    static { ReplInputHintContentWidget_1 = this; }
    static { this.ID = 'replInput.widget.emptyHint'; }
    constructor(editor, configurationService, keybindingService) {
        super();
        this.editor = editor;
        this.configurationService = configurationService;
        this.keybindingService = keybindingService;
        this.ariaLabel = '';
        this._register(this.editor.onDidChangeConfiguration((e) => {
            if (this.domNode && e.hasChanged(52 /* EditorOption.fontInfo */)) {
                this.editor.applyFontInfo(this.domNode);
            }
        }));
        const onDidFocusEditorText = Event.debounce(this.editor.onDidFocusEditorText, () => undefined, 500);
        this._register(onDidFocusEditorText(() => {
            if (this.editor.hasTextFocus() &&
                this.ariaLabel &&
                configurationService.getValue("accessibility.verbosity.replEditor" /* AccessibilityVerbositySettingId.ReplEditor */)) {
                status(this.ariaLabel);
            }
        }));
        this._register(configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(ReplEditorSettings.executeWithShiftEnter)) {
                this.setHint();
            }
        }));
        this.editor.addContentWidget(this);
    }
    getId() {
        return ReplInputHintContentWidget_1.ID;
    }
    getPosition() {
        return {
            position: { lineNumber: 1, column: 1 },
            preference: [0 /* ContentWidgetPositionPreference.EXACT */],
        };
    }
    getDomNode() {
        if (!this.domNode) {
            this.domNode = dom.$('.empty-editor-hint');
            this.domNode.style.width = 'max-content';
            this.domNode.style.paddingLeft = '4px';
            this.setHint();
            this._register(dom.addDisposableListener(this.domNode, 'click', () => {
                this.editor.focus();
            }));
            this.editor.applyFontInfo(this.domNode);
        }
        return this.domNode;
    }
    setHint() {
        if (!this.domNode) {
            return;
        }
        while (this.domNode.firstChild) {
            this.domNode.removeChild(this.domNode.firstChild);
        }
        const hintElement = dom.$('div.empty-hint-text');
        hintElement.style.cursor = 'text';
        hintElement.style.whiteSpace = 'nowrap';
        const keybinding = this.getKeybinding();
        const keybindingHintLabel = keybinding?.getLabel();
        if (keybinding && keybindingHintLabel) {
            const actionPart = localize('emptyHintText', 'Press {0} to execute. ', keybindingHintLabel);
            const [before, after] = actionPart.split(keybindingHintLabel).map((fragment) => {
                const hintPart = dom.$('span', undefined, fragment);
                hintPart.style.fontStyle = 'italic';
                return hintPart;
            });
            hintElement.appendChild(before);
            const label = new KeybindingLabel(hintElement, OS);
            label.set(keybinding);
            label.element.style.width = 'min-content';
            label.element.style.display = 'inline';
            hintElement.appendChild(after);
            this.domNode.append(hintElement);
            const helpKeybinding = this.keybindingService
                .lookupKeybinding("editor.action.accessibilityHelp" /* AccessibilityCommandId.OpenAccessibilityHelp */)
                ?.getLabel();
            const helpInfo = helpKeybinding
                ? localize('ReplInputAriaLabelHelp', 'Use {0} for accessibility help. ', helpKeybinding)
                : localize('ReplInputAriaLabelHelpNoKb', 'Run the Open Accessibility Help command for more information. ');
            this.ariaLabel = actionPart.concat(helpInfo, localize('disableHint', ' Toggle {0} in settings to disable this hint.', "accessibility.verbosity.replEditor" /* AccessibilityVerbositySettingId.ReplEditor */));
        }
    }
    getKeybinding() {
        const keybindings = this.keybindingService.lookupKeybindings('interactive.execute');
        const shiftEnterConfig = this.configurationService.getValue(ReplEditorSettings.executeWithShiftEnter);
        const hasEnterChord = (kb, modifier = '') => {
            const chords = kb.getDispatchChords();
            const chord = modifier + 'Enter';
            const chordAlt = modifier + '[Enter]';
            return chords.length === 1 && (chords[0] === chord || chords[0] === chordAlt);
        };
        if (shiftEnterConfig) {
            const keybinding = keybindings.find((kb) => hasEnterChord(kb, 'shift+'));
            if (keybinding) {
                return keybinding;
            }
        }
        else {
            let keybinding = keybindings.find((kb) => hasEnterChord(kb));
            if (keybinding) {
                return keybinding;
            }
            keybinding = this.keybindingService
                .lookupKeybindings('python.execInREPLEnter')
                .find((kb) => hasEnterChord(kb));
            if (keybinding) {
                return keybinding;
            }
        }
        return keybindings?.[0];
    }
    dispose() {
        super.dispose();
        this.editor.removeContentWidget(this);
    }
};
ReplInputHintContentWidget = ReplInputHintContentWidget_1 = __decorate([
    __param(1, IConfigurationService),
    __param(2, IKeybindingService)
], ReplInputHintContentWidget);
export { ReplInputHintContentWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbElucHV0SGludENvbnRlbnRXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pbnRlcmFjdGl2ZS9icm93c2VyL3JlcGxJbnB1dEhpbnRDb250ZW50V2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRXhELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsRUFBRSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFXeEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBR3pGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBRXBELElBQU0sMEJBQTBCLEdBQWhDLE1BQU0sMEJBQTJCLFNBQVEsVUFBVTs7YUFDakMsT0FBRSxHQUFHLDRCQUE0QixBQUEvQixDQUErQjtJQUt6RCxZQUNrQixNQUFtQixFQUNiLG9CQUE0RCxFQUMvRCxpQkFBc0Q7UUFFMUUsS0FBSyxFQUFFLENBQUE7UUFKVSxXQUFNLEdBQU4sTUFBTSxDQUFhO1FBQ0kseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUM5QyxzQkFBaUIsR0FBakIsaUJB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