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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3NFZGl0b3JDb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9wcmVmZXJlbmNlcy9icm93c2VyL2tleWJpbmRpbmdzRWRpdG9yQ29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDcEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQy9ELE9BQU8sRUFDTiwwQkFBMEIsR0FFMUIsTUFBTSxnREFBZ0QsQ0FBQTtBQUV2RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsU0FBUyxFQUFRLE1BQU0saUNBQWlDLENBQUE7QUFDakUsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sOERBQThELENBQUE7QUFDOUcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFcEYsT0FBTyxFQUNOLGlCQUFp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