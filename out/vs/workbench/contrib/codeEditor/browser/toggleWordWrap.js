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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9nZ2xlV29yZFdyYXAuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb2RlRWRpdG9yL2Jyb3dzZXIvdG9nZ2xlV29yZFdyYXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLG1CQUFtQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDNUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFeEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQU1sRixPQUFPLEVBQ04sWUFBWSxFQUdaLDhCQUE4QixFQUM5QixvQkFBb0IsRUFDcEIsMEJBQTBCLEdBQzFCLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDN0YsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFNN0csT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFbEYsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3JGLE9BQU8sRUFDTixjQUFjLEVBRWQsa0JBQWtCLEVBQ2xCLGFBQWEsR0FDYixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRWxHLE9BQU8sRUFHTiw4QkFBOEIs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