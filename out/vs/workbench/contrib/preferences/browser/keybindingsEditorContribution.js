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
var KeybindingEditorDecorationsRenderer_1;
import * as nls from '../../../../nls.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Range } from '../../../../editor/common/core/range.js';
import { registerEditorContribution, } from '../../../../editor/browser/editorExtensions.js';
import { SnippetController2 } from '../../../../editor/contrib/snippet/browser/snippetController2.js';
import { SmartSnippetInserter } from '../common/smartSnippetInserter.js';
import { DefineKeybindingOverlayWidget } from './keybindingWidgets.js';
import { parseTree } from '../../../../base/common/json.js';
import { WindowsNativeResolvedKeybinding } from '../../../services/keybinding/common/windowsKeyboardMapper.js';
import { themeColorFromId } from '../../../../platform/theme/common/themeService.js';
import { overviewRulerInfo, overviewRulerError, } from '../../../../editor/common/core/editorColorRegistry.js';
import { OverviewRulerLane, } from '../../../../editor/common/model.js';
import { KeybindingParser } from '../../../../base/common/keybindingParser.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { isEqual } from '../../../../base/common/resources.js';
import { IUserDataProfileService } from '../../../services/userDataProfile/common/userDataProfile.js';
import { DEFINE_KEYBINDING_EDITOR_CONTRIB_ID, } from '../../../services/preferences/common/preferences.js';
const NLS_KB_LAYOUT_ERROR_MESSAGE = nls.localize('defineKeybinding.kbLayoutErrorMessage', "You won't be able to produce this key combination under your current keyboard layout.");
let DefineKeybindingEditorContribution = class DefineKeybindingEditorContribution extends Disposable {
    constructor(_editor, _instantiationService, _userDataProfileService) {
        super();
        this._editor = _editor;
        this._instantiationService = _instantiationService;
        this._userDataProfileService = _userDataProfileService;
        this._keybindingDecorationRenderer = this._register(new MutableDisposable());
        this._defineWidget = this._register(this._instantiationService.createInstance(DefineKeybindingOverlayWidget, this._editor));
        this._register(this._editor.onDidChangeModel((e) => this._update()));
        this._update();
    }
    _update() {
        this._keybindingDecorationRenderer.value = isInterestingEditorModel(this._editor, this._userDataProfileService)
            ? // Decorations are shown for the default keybindings.json **and** for the user keybindings.json
                this._instantiationService.createInstance(KeybindingEditorDecorationsRenderer, this._editor)
            : undefined;
    }
    showDefineKeybindingWidget() {
        if (isInterestingEditorModel(this._editor, this._userDataProfileService)) {
            this._defineWidget.start().then((keybinding) => this._onAccepted(keybinding));
        }
    }
    _onAccepted(keybinding) {
        this._editor.focus();
        if (keybinding && this._editor.hasModel()) {
            const regexp = new RegExp(/\\/g);
            const backslash = regexp.test(keybinding);
            if (backslash) {
                keybinding = keybinding.slice(0, -1) + '\\\\';
            }
            let snippetText = [
                '{',
                '\t"key": ' + JSON.stringify(keybinding) + ',',
                '\t"command": "${1:commandId}",',
                '\t"when": "${2:editorTextFocus}"',
                '}$0',
            ].join('\n');
            const smartInsertInfo = SmartSnippetInserter.insertSnippet(this._editor.getModel(), this._editor.getPosition());
            snippetText = smartInsertInfo.prepend + snippetText + smartInsertInfo.append;
            this._editor.setPosition(smartInsertInfo.position);
            SnippetController2.get(this._editor)?.insert(snippetText, {
                overwriteBefore: 0,
                overwriteAfter: 0,
            });
        }
    }
};
DefineKeybindingEditorContribution = __decorate([
    __param(1, IInstantiationService),
    __param(2, IUserDataProfileService)
], DefineKeybindingEditorContribution);
let KeybindingEditorDecorationsRenderer = KeybindingEditorDecorationsRenderer_1 = class KeybindingEditorDecorationsRenderer extends Disposable {
    constructor(_editor, _keybindingService) {
        super();
        this._editor = _editor;
        this._keybindingService = _keybindingService;
        this._dec = this._editor.createDecorationsCollection();
        this._updateDecorations = this._register(new RunOnceScheduler(() => this._updateDecorationsNow(), 500));
        const model = assertIsDefined(this._editor.getModel());
        this._register(model.onDidChangeContent(() => this._updateDecorations.schedule()));
        this._register(this._keybindingService.onDidUpdateKeybindings(() => this._updateDecorations.schedule()));
        this._register({
            dispose: () => {
                this._dec.clear();
                this._updateDecorations.cancel();
            },
        });
        this._updateDecorations.schedule();
    }
    _updateDecorationsNow() {
        const model = assertIsDefined(this._editor.getModel());
        const newDecorations = [];
        const root = parseTree(model.getValue());
        if (root && Array.isArray(root.children)) {
            for (let i = 0, len = root.children.length; i < len; i++) {
                const entry = root.children[i];
                const dec = this._getDecorationForEntry(model, entry);
                if (dec !== null) {
                    newDecorations.push(dec);
                }
            }
        }
        this._dec.set(newDecorations);
    }
    _getDecorationForEntry(model, entry) {
        if (!Array.isArray(entry.children)) {
            return null;
        }
        for (let i = 0, len = entry.children.length; i < len; i++) {
            const prop = entry.children[i];
            if (prop.type !== 'property') {
                continue;
            }
            if (!Array.isArray(prop.children) || prop.children.length !== 2) {
                continue;
            }
            const key = prop.children[0];
            if (key.value !== 'key') {
                continue;
            }
            const value = prop.children[1];
            if (value.type !== 'string') {
                continue;
            }
            const resolvedKeybindings = this._keybindingService.resolveUserBinding(value.value);
            if (resolvedKeybindings.length === 0) {
                return this._createDecoration(true, null, null, model, value);
            }
            const resolvedKeybinding = resolvedKeybindings[0];
            let usLabel = null;
            if (resolvedKeybinding instanceof WindowsNativeResolvedKeybinding) {
                usLabel = resolvedKeybinding.getUSLabel();
            }
            if (!resolvedKeybinding.isWYSIWYG()) {
                const uiLabel = resolvedKeybinding.getLabel();
                if (typeof uiLabel === 'string' && value.value.toLowerCase() === uiLabel.toLowerCase()) {
                    // coincidentally, this is actually WYSIWYG
                    return null;
                }
                return this._createDecoration(false, resolvedKeybinding.getLabel(), usLabel, model, value);
            }
            if (/abnt_|oem_/.test(value.value)) {
                return this._createDecoration(false, resolvedKeybinding.getLabel(), usLabel, model, value);
            }
            const expectedUserSettingsLabel = resolvedKeybinding.getUserSettingsLabel();
            if (typeof expectedUserSettingsLabel === 'string' &&
                !KeybindingEditorDecorationsRenderer_1._userSettingsFuzzyEquals(value.value, expectedUserSettingsLabel)) {
                return this._createDecoration(false, resolvedKeybinding.getLabel(), usLabel, model, value);
            }
            return null;
        }
        return null;
    }
    static _userSettingsFuzzyEquals(a, b) {
        a = a.trim().toLowerCase();
        b = b.trim().toLowerCase();
        if (a === b) {
            return true;
        }
        const aKeybinding = KeybindingParser.parseKeybinding(a);
        const bKeybinding = KeybindingParser.parseKeybinding(b);
        if (aKeybinding === null && bKeybinding === null) {
            return true;
        }
        if (!aKeybinding || !bKeybinding) {
            return false;
        }
        return aKeybinding.equals(bKeybinding);
    }
    _createDecoration(isError, uiLabel, usLabel, model, keyNode) {
        let msg;
        let className;
        let overviewRulerColor;
        if (isError) {
            // this is the error case
            msg = new MarkdownString().appendText(NLS_KB_LAYOUT_ERROR_MESSAGE);
            className = 'keybindingError';
            overviewRulerColor = themeColorFromId(overviewRulerError);
        }
        else {
            // this is the info case
            if (usLabel && uiLabel !== usLabel) {
                msg = new MarkdownString(nls.localize({
                    key: 'defineKeybinding.kbLayoutLocalAndUSMessage',
                    comment: [
                        'Please translate maintaining the stars (*) around the placeholders such that they will be rendered in bold.',
                        'The placeholders will contain a keyboard combination e.g. Ctrl+Shift+/',
                    ],
                }, '**{0}** for your current keyboard layout (**{1}** for US standard).', uiLabel, usLabel));
            }
            else {
                msg = new MarkdownString(nls.localize({
                    key: 'defineKeybinding.kbLayoutLocalMessage',
                    comment: [
                        'Please translate maintaining the stars (*) around the placeholder such that it will be rendered in bold.',
                        'The placeholder will contain a keyboard combination e.g. Ctrl+Shift+/',
                    ],
                }, '**{0}** for your current keyboard layout.', uiLabel));
            }
            className = 'keybindingInfo';
            overviewRulerColor = themeColorFromId(overviewRulerInfo);
        }
        const startPosition = model.getPositionAt(keyNode.offset);
        const endPosition = model.getPositionAt(keyNode.offset + keyNode.length);
        const range = new Range(startPosition.lineNumber, startPosition.column, endPosition.lineNumber, endPosition.column);
        // icon + highlight + message decoration
        return {
            range: range,
            options: {
                description: 'keybindings-widget',
                stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
                className: className,
                hoverMessage: msg,
                overviewRuler: {
                    color: overviewRulerColor,
                    position: OverviewRulerLane.Right,
                },
            },
        };
    }
};
KeybindingEditorDecorationsRenderer = KeybindingEditorDecorationsRenderer_1 = __decorate([
    __param(1, IKeybindingService)
], KeybindingEditorDecorationsRenderer);
export { KeybindingEditorDecorationsRenderer };
function isInterestingEditorModel(editor, userDataProfileService) {
    const model = editor.getModel();
    if (!model) {
        return false;
    }
    return isEqual(model.uri, userDataProfileService.currentProfile.keybindingsResource);
}
registerEditorContribution(DEFINE_KEYBINDING_EDITOR_CONTRIB_ID, DefineKeybindingEditorContribution, 1 /* EditorContributionInstantiation.AfterFirstRender */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3NFZGl0b3JDb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ByZWZlcmVuY2VzL2Jyb3dzZXIva2V5YmluZGluZ3NFZGl0b3JDb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNwRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDL0QsT0FBTyxFQUNOLDBCQUEwQixHQUUxQixNQUFNLGdEQUFnRCxDQUFBO0FBRXZELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ3RFLE9BQU8sRUFBRSxTQUFTLEVBQVEsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUM5RyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUVwRixPQUFPLEVBQ04s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