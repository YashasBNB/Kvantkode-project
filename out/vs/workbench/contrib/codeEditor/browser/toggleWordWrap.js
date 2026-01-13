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
import { addDisposableListener, onDidRegisterWindow } from '../../../../base/browser/dom.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { EditorAction, registerDiffEditorContribution, registerEditorAction, registerEditorContribution, } from '../../../../editor/browser/editorExtensions.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { findDiffEditorContainingCodeEditor } from '../../../../editor/browser/widget/diffEditor/commands.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import * as nls from '../../../../nls.js';
import { MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
const transientWordWrapState = 'transientWordWrapState';
const isWordWrapMinifiedKey = 'isWordWrapMinified';
const isDominatedByLongLinesKey = 'isDominatedByLongLines';
const CAN_TOGGLE_WORD_WRAP = new RawContextKey('canToggleWordWrap', false, true);
const EDITOR_WORD_WRAP = new RawContextKey('editorWordWrap', false, nls.localize('editorWordWrap', 'Whether the editor is currently using word wrapping.'));
/**
 * Store (in memory) the word wrap state for a particular model.
 */
export function writeTransientState(model, state, codeEditorService) {
    codeEditorService.setTransientModelProperty(model, transientWordWrapState, state);
}
/**
 * Read (in memory) the word wrap state for a particular model.
 */
export function readTransientState(model, codeEditorService) {
    return codeEditorService.getTransientModelProperty(model, transientWordWrapState);
}
const TOGGLE_WORD_WRAP_ID = 'editor.action.toggleWordWrap';
class ToggleWordWrapAction extends EditorAction {
    constructor() {
        super({
            id: TOGGLE_WORD_WRAP_ID,
            label: nls.localize2('toggle.wordwrap', 'View: Toggle Word Wrap'),
            precondition: undefined,
            kbOpts: {
                kbExpr: null,
                primary: 512 /* KeyMod.Alt */ | 56 /* KeyCode.KeyZ */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    run(accessor, editor) {
        const codeEditorService = accessor.get(ICodeEditorService);
        const instaService = accessor.get(IInstantiationService);
        if (!canToggleWordWrap(codeEditorService, editor)) {
            return;
        }
        const model = editor.getModel();
        // Read the current state
        const transientState = readTransientState(model, codeEditorService);
        // Compute the new state
        let newState;
        if (transientState) {
            newState = null;
        }
        else {
            const actualWrappingInfo = editor.getOption(152 /* EditorOption.wrappingInfo */);
            const wordWrapOverride = actualWrappingInfo.wrappingColumn === -1 ? 'on' : 'off';
            newState = { wordWrapOverride };
        }
        // Write the new state
        // (this will cause an event and the controller will apply the state)
        writeTransientState(model, newState, codeEditorService);
        // if we are in a diff editor, update the other editor (if possible)
        const diffEditor = instaService.invokeFunction(findDiffEditorContainingCodeEditor, editor);
        if (diffEditor) {
            const originalEditor = diffEditor.getOriginalEditor();
            const modifiedEditor = diffEditor.getModifiedEditor();
            const otherEditor = originalEditor === editor ? modifiedEditor : originalEditor;
            if (canToggleWordWrap(codeEditorService, otherEditor)) {
                writeTransientState(otherEditor.getModel(), newState, codeEditorService);
                diffEditor.updateOptions({});
            }
        }
    }
}
let ToggleWordWrapController = class ToggleWordWrapController extends Disposable {
    static { this.ID = 'editor.contrib.toggleWordWrapController'; }
    constructor(_editor, _contextKeyService, _codeEditorService) {
        super();
        this._editor = _editor;
        this._contextKeyService = _contextKeyService;
        this._codeEditorService = _codeEditorService;
        const options = this._editor.getOptions();
        const wrappingInfo = options.get(152 /* EditorOption.wrappingInfo */);
        const isWordWrapMinified = this._contextKeyService.createKey(isWordWrapMinifiedKey, wrappingInfo.isWordWrapMinified);
        const isDominatedByLongLines = this._contextKeyService.createKey(isDominatedByLongLinesKey, wrappingInfo.isDominatedByLongLines);
        let currentlyApplyingEditorConfig = false;
        this._register(_editor.onDidChangeConfiguration((e) => {
            if (!e.hasChanged(152 /* EditorOption.wrappingInfo */)) {
                return;
            }
            const options = this._editor.getOptions();
            const wrappingInfo = options.get(152 /* EditorOption.wrappingInfo */);
            isWordWrapMinified.set(wrappingInfo.isWordWrapMinified);
            isDominatedByLongLines.set(wrappingInfo.isDominatedByLongLines);
            if (!currentlyApplyingEditorConfig) {
                // I am not the cause of the word wrap getting changed
                ensureWordWrapSettings();
            }
        }));
        this._register(_editor.onDidChangeModel((e) => {
            ensureWordWrapSettings();
        }));
        this._register(_codeEditorService.onDidChangeTransientModelProperty(() => {
            ensureWordWrapSettings();
        }));
        const ensureWordWrapSettings = () => {
            if (!canToggleWordWrap(this._codeEditorService, this._editor)) {
                return;
            }
            const transientState = readTransientState(this._editor.getModel(), this._codeEditorService);
            // Apply the state
            try {
                currentlyApplyingEditorConfig = true;
                this._applyWordWrapState(transientState);
            }
            finally {
                currentlyApplyingEditorConfig = false;
            }
        };
    }
    _applyWordWrapState(state) {
        const wordWrapOverride2 = state ? state.wordWrapOverride : 'inherit';
        this._editor.updateOptions({
            wordWrapOverride2: wordWrapOverride2,
        });
    }
};
ToggleWordWrapController = __decorate([
    __param(1, IContextKeyService),
    __param(2, ICodeEditorService)
], ToggleWordWrapController);
let DiffToggleWordWrapController = class DiffToggleWordWrapController extends Disposable {
    static { this.ID = 'diffeditor.contrib.toggleWordWrapController'; }
    constructor(_diffEditor, _codeEditorService) {
        super();
        this._diffEditor = _diffEditor;
        this._codeEditorService = _codeEditorService;
        this._register(this._diffEditor.onDidChangeModel(() => {
            this._ensureSyncedWordWrapToggle();
        }));
    }
    _ensureSyncedWordWrapToggle() {
        const originalEditor = this._diffEditor.getOriginalEditor();
        const modifiedEditor = this._diffEditor.getModifiedEditor();
        if (!originalEditor.hasModel() || !modifiedEditor.hasModel()) {
            return;
        }
        const originalTransientState = readTransientState(originalEditor.getModel(), this._codeEditorService);
        const modifiedTransientState = readTransientState(modifiedEditor.getModel(), this._codeEditorService);
        if (originalTransientState &&
            !modifiedTransientState &&
            canToggleWordWrap(this._codeEditorService, originalEditor)) {
            writeTransientState(modifiedEditor.getModel(), originalTransientState, this._codeEditorService);
            this._diffEditor.updateOptions({});
        }
        if (!originalTransientState &&
            modifiedTransientState &&
            canToggleWordWrap(this._codeEditorService, modifiedEditor)) {
            writeTransientState(originalEditor.getModel(), modifiedTransientState, this._codeEditorService);
            this._diffEditor.updateOptions({});
        }
    }
};
DiffToggleWordWrapController = __decorate([
    __param(1, ICodeEditorService)
], DiffToggleWordWrapController);
function canToggleWordWrap(codeEditorService, editor) {
    if (!editor) {
        return false;
    }
    if (editor.isSimpleWidget) {
        // in a simple widget...
        return false;
    }
    // Ensure correct word wrap settings
    const model = editor.getModel();
    if (!model) {
        return false;
    }
    if (editor.getOption(63 /* EditorOption.inDiffEditor */)) {
        // this editor belongs to a diff editor
        for (const diffEditor of codeEditorService.listDiffEditors()) {
            if (diffEditor.getOriginalEditor() === editor && !diffEditor.renderSideBySide) {
                // this editor is the left side of an inline diff editor
                return false;
            }
        }
    }
    return true;
}
let EditorWordWrapContextKeyTracker = class EditorWordWrapContextKeyTracker extends Disposable {
    static { this.ID = 'workbench.contrib.editorWordWrapContextKeyTracker'; }
    constructor(_editorService, _codeEditorService, _contextService) {
        super();
        this._editorService = _editorService;
        this._codeEditorService = _codeEditorService;
        this._contextService = _contextService;
        this._register(Event.runAndSubscribe(onDidRegisterWindow, ({ window, disposables }) => {
            disposables.add(addDisposableListener(window, 'focus', () => this._update(), true));
            disposables.add(addDisposableListener(window, 'blur', () => this._update(), true));
        }, { window: mainWindow, disposables: this._store }));
        this._register(this._editorService.onDidActiveEditorChange(() => this._update()));
        this._canToggleWordWrap = CAN_TOGGLE_WORD_WRAP.bindTo(this._contextService);
        this._editorWordWrap = EDITOR_WORD_WRAP.bindTo(this._contextService);
        this._activeEditor = null;
        this._activeEditorListener = new DisposableStore();
        this._update();
    }
    _update() {
        const activeEditor = this._codeEditorService.getFocusedCodeEditor() ||
            this._codeEditorService.getActiveCodeEditor();
        if (this._activeEditor === activeEditor) {
            // no change
            return;
        }
        this._activeEditorListener.clear();
        this._activeEditor = activeEditor;
        if (activeEditor) {
            this._activeEditorListener.add(activeEditor.onDidChangeModel(() => this._updateFromCodeEditor()));
            this._activeEditorListener.add(activeEditor.onDidChangeConfiguration((e) => {
                if (e.hasChanged(152 /* EditorOption.wrappingInfo */)) {
                    this._updateFromCodeEditor();
                }
            }));
            this._updateFromCodeEditor();
        }
    }
    _updateFromCodeEditor() {
        if (!canToggleWordWrap(this._codeEditorService, this._activeEditor)) {
            return this._setValues(false, false);
        }
        else {
            const wrappingInfo = this._activeEditor.getOption(152 /* EditorOption.wrappingInfo */);
            this._setValues(true, wrappingInfo.wrappingColumn !== -1);
        }
    }
    _setValues(canToggleWordWrap, isWordWrap) {
        this._canToggleWordWrap.set(canToggleWordWrap);
        this._editorWordWrap.set(isWordWrap);
    }
};
EditorWordWrapContextKeyTracker = __decorate([
    __param(0, IEditorService),
    __param(1, ICodeEditorService),
    __param(2, IContextKeyService)
], EditorWordWrapContextKeyTracker);
registerWorkbenchContribution2(EditorWordWrapContextKeyTracker.ID, EditorWordWrapContextKeyTracker, 3 /* WorkbenchPhase.AfterRestored */);
registerEditorContribution(ToggleWordWrapController.ID, ToggleWordWrapController, 0 /* EditorContributionInstantiation.Eager */); // eager because it needs to change the editor word wrap configuration
registerDiffEditorContribution(DiffToggleWordWrapController.ID, DiffToggleWordWrapController);
registerEditorAction(ToggleWordWrapAction);
MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
    command: {
        id: TOGGLE_WORD_WRAP_ID,
        title: nls.localize('unwrapMinified', 'Disable wrapping for this file'),
        icon: Codicon.wordWrap,
    },
    group: 'navigation',
    order: 1,
    when: ContextKeyExpr.and(ContextKeyExpr.has(isDominatedByLongLinesKey), ContextKeyExpr.has(isWordWrapMinifiedKey)),
});
MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
    command: {
        id: TOGGLE_WORD_WRAP_ID,
        title: nls.localize('wrapMinified', 'Enable wrapping for this file'),
        icon: Codicon.wordWrap,
    },
    group: 'navigation',
    order: 1,
    when: ContextKeyExpr.and(EditorContextKeys.inDiffEditor.negate(), ContextKeyExpr.has(isDominatedByLongLinesKey), ContextKeyExpr.not(isWordWrapMinifiedKey)),
});
// View menu
MenuRegistry.appendMenuItem(MenuId.MenubarViewMenu, {
    command: {
        id: TOGGLE_WORD_WRAP_ID,
        title: nls.localize({ key: 'miToggleWordWrap', comment: ['&& denotes a mnemonic'] }, '&&Word Wrap'),
        toggled: EDITOR_WORD_WRAP,
        precondition: CAN_TOGGLE_WORD_WRAP,
    },
    order: 1,
    group: '6_editor',
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9nZ2xlV29yZFdyYXAuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVFZGl0b3IvYnJvd3Nlci90b2dnbGVXb3JkV3JhcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM1RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV4RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBTWxGLE9BQU8sRUFDTixZQUFZLEVBR1osOEJBQThCLEVBQzlCLG9CQUFvQixFQUNwQiwwQkFBMEIsR0FDMUIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQU03RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUVsRixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDckYsT0FBTyxFQUNOLGNBQWMsRUFFZCxrQkFBa0IsRUFDbEIsYUFBYSxHQUNiLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7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