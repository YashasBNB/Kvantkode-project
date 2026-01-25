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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbElucHV0SGludENvbnRlbnRXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ludGVyYWN0aXZlL2Jyb3dzZXIvcmVwbElucHV0SGludENvbnRlbnRXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFeEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQVd4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFHekYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFFcEQsSUFBTSwwQkFBMEIsR0FBaEMsTUFBTSwwQkFBMkIsU0FBUSxVQUFVOzthQUNqQyxPQUFFLEdBQUcsNEJBQTRCLEFBQS9CLENBQStCO0lBS3pELFlBQ2tCLE1BQW1CLEVBQ2Isb0JBQTRELEVBQy9ELGlCQUFzRDtRQUUxRSxLQUFLLEVBQUUsQ0FBQTtRQUpVLFdBQU0sR0FBTixNQUFNLENBQWE7UUFDSSx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQzlDLHNCQUFpQixHQUFq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