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
import { isNonEmptyArray } from '../../../../base/common/arrays.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { EditorAction, registerEditorAction, registerEditorContribution, } from '../../../browser/editorExtensions.js';
import { ICodeEditorService } from '../../../browser/services/codeEditorService.js';
import { CharacterSet } from '../../../common/core/characterClassifier.js';
import { Range } from '../../../common/core/range.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { IEditorWorkerService } from '../../../common/services/editorWorker.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { formatDocumentRangesWithSelectedProvider, formatDocumentWithSelectedProvider, getOnTypeFormattingEdits, } from './format.js';
import { FormattingEdit } from './formattingEdit.js';
import * as nls from '../../../../nls.js';
import { AccessibilitySignal, IAccessibilitySignalService, } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IEditorProgressService, Progress } from '../../../../platform/progress/common/progress.js';
let FormatOnType = class FormatOnType {
    static { this.ID = 'editor.contrib.autoFormat'; }
    constructor(_editor, _languageFeaturesService, _workerService, _accessibilitySignalService) {
        this._editor = _editor;
        this._languageFeaturesService = _languageFeaturesService;
        this._workerService = _workerService;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._disposables = new DisposableStore();
        this._sessionDisposables = new DisposableStore();
        this._disposables.add(_languageFeaturesService.onTypeFormattingEditProvider.onDidChange(this._update, this));
        this._disposables.add(_editor.onDidChangeModel(() => this._update()));
        this._disposables.add(_editor.onDidChangeModelLanguage(() => this._update()));
        this._disposables.add(_editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(58 /* EditorOption.formatOnType */)) {
                this._update();
            }
        }));
        this._update();
    }
    dispose() {
        this._disposables.dispose();
        this._sessionDisposables.dispose();
    }
    _update() {
        // clean up
        this._sessionDisposables.clear();
        // we are disabled
        if (!this._editor.getOption(58 /* EditorOption.formatOnType */)) {
            return;
        }
        // no model
        if (!this._editor.hasModel()) {
            return;
        }
        const model = this._editor.getModel();
        // no support
        const [support] = this._languageFeaturesService.onTypeFormattingEditProvider.ordered(model);
        if (!support || !support.autoFormatTriggerCharacters) {
            return;
        }
        // register typing listeners that will trigger the format
        const triggerChars = new CharacterSet();
        for (const ch of support.autoFormatTriggerCharacters) {
            triggerChars.add(ch.charCodeAt(0));
        }
        this._sessionDisposables.add(this._editor.onDidType((text) => {
            const lastCharCode = text.charCodeAt(text.length - 1);
            if (triggerChars.has(lastCharCode)) {
                this._trigger(String.fromCharCode(lastCharCode));
            }
        }));
    }
    _trigger(ch) {
        if (!this._editor.hasModel()) {
            return;
        }
        if (this._editor.getSelections().length > 1 || !this._editor.getSelection().isEmpty()) {
            return;
        }
        const model = this._editor.getModel();
        const position = this._editor.getPosition();
        const cts = new CancellationTokenSource();
        // install a listener that checks if edits happens before the
        // position on which we format right now. If so, we won't
        // apply the format edits
        const unbind = this._editor.onDidChangeModelContent((e) => {
            if (e.isFlush) {
                // a model.setValue() was called
                // cancel only once
                cts.cancel();
                unbind.dispose();
                return;
            }
            for (let i = 0, len = e.changes.length; i < len; i++) {
                const change = e.changes[i];
                if (change.range.endLineNumber <= position.lineNumber) {
                    // cancel only once
                    cts.cancel();
                    unbind.dispose();
                    return;
                }
            }
        });
        getOnTypeFormattingEdits(this._workerService, this._languageFeaturesService, model, position, ch, model.getFormattingOptions(), cts.token)
            .then((edits) => {
            if (cts.token.isCancellationRequested) {
                return;
            }
            if (isNonEmptyArray(edits)) {
                this._accessibilitySignalService.playSignal(AccessibilitySignal.format, {
                    userGesture: false,
                });
                FormattingEdit.execute(this._editor, edits, true);
            }
        })
            .finally(() => {
            unbind.dispose();
        });
    }
};
FormatOnType = __decorate([
    __param(1, ILanguageFeaturesService),
    __param(2, IEditorWorkerService),
    __param(3, IAccessibilitySignalService)
], FormatOnType);
export { FormatOnType };
let FormatOnPaste = class FormatOnPaste {
    static { this.ID = 'editor.contrib.formatOnPaste'; }
    constructor(editor, _languageFeaturesService, _instantiationService) {
        this.editor = editor;
        this._languageFeaturesService = _languageFeaturesService;
        this._instantiationService = _instantiationService;
        this._callOnDispose = new DisposableStore();
        this._callOnModel = new DisposableStore();
        this._callOnDispose.add(editor.onDidChangeConfiguration(() => this._update()));
        this._callOnDispose.add(editor.onDidChangeModel(() => this._update()));
        this._callOnDispose.add(editor.onDidChangeModelLanguage(() => this._update()));
        this._callOnDispose.add(_languageFeaturesService.documentRangeFormattingEditProvider.onDidChange(this._update, this));
    }
    dispose() {
        this._callOnDispose.dispose();
        this._callOnModel.dispose();
    }
    _update() {
        // clean up
        this._callOnModel.clear();
        // we are disabled
        if (!this.editor.getOption(57 /* EditorOption.formatOnPaste */)) {
            return;
        }
        // no model
        if (!this.editor.hasModel()) {
            return;
        }
        // no formatter
        if (!this._languageFeaturesService.documentRangeFormattingEditProvider.has(this.editor.getModel())) {
            return;
        }
        this._callOnModel.add(this.editor.onDidPaste(({ range }) => this._trigger(range)));
    }
    _trigger(range) {
        if (!this.editor.hasModel()) {
            return;
        }
        if (this.editor.getSelections().length > 1) {
            return;
        }
        this._instantiationService
            .invokeFunction(formatDocumentRangesWithSelectedProvider, this.editor, range, 2 /* FormattingMode.Silent */, Progress.None, CancellationToken.None, false)
            .catch(onUnexpectedError);
    }
};
FormatOnPaste = __decorate([
    __param(1, ILanguageFeaturesService),
    __param(2, IInstantiationService)
], FormatOnPaste);
class FormatDocumentAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.formatDocument',
            label: nls.localize2('formatDocument.label', 'Format Document'),
            precondition: ContextKeyExpr.and(EditorContextKeys.notInCompositeEditor, EditorContextKeys.writable, EditorContextKeys.hasDocumentFormattingProvider),
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 36 /* KeyCode.KeyF */,
                linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 39 /* KeyCode.KeyI */ },
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            contextMenuOpts: {
                group: '1_modification',
                order: 1.3,
            },
        });
    }
    async run(accessor, editor) {
        if (editor.hasModel()) {
            const instaService = accessor.get(IInstantiationService);
            const progressService = accessor.get(IEditorProgressService);
            await progressService.showWhile(instaService.invokeFunction(formatDocumentWithSelectedProvider, editor, 1 /* FormattingMode.Explicit */, Progress.None, CancellationToken.None, true), 250);
        }
    }
}
class FormatSelectionAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.formatSelection',
            label: nls.localize2('formatSelection.label', 'Format Selection'),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, EditorContextKeys.hasDocumentSelectionFormattingProvider),
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 36 /* KeyCode.KeyF */),
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            contextMenuOpts: {
                when: EditorContextKeys.hasNonEmptySelection,
                group: '1_modification',
                order: 1.31,
            },
        });
    }
    async run(accessor, editor) {
        if (!editor.hasModel()) {
            return;
        }
        const instaService = accessor.get(IInstantiationService);
        const model = editor.getModel();
        const ranges = editor.getSelections().map((range) => {
            return range.isEmpty()
                ? new Range(range.startLineNumber, 1, range.startLineNumber, model.getLineMaxColumn(range.startLineNumber))
                : range;
        });
        const progressService = accessor.get(IEditorProgressService);
        await progressService.showWhile(instaService.invokeFunction(formatDocumentRangesWithSelectedProvider, editor, ranges, 1 /* FormattingMode.Explicit */, Progress.None, CancellationToken.None, true), 250);
    }
}
registerEditorContribution(FormatOnType.ID, FormatOnType, 2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
registerEditorContribution(FormatOnPaste.ID, FormatOnPaste, 2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
registerEditorAction(FormatDocumentAction);
registerEditorAction(FormatSelectionAction);
// this is the old format action that does both (format document OR format selection)
// and we keep it here such that existing keybinding configurations etc will still work
CommandsRegistry.registerCommand('editor.action.format', async (accessor) => {
    const editor = accessor.get(ICodeEditorService).getFocusedCodeEditor();
    if (!editor || !editor.hasModel()) {
        return;
    }
    const commandService = accessor.get(ICommandService);
    if (editor.getSelection().isEmpty()) {
        await commandService.executeCommand('editor.action.formatDocument');
    }
    else {
        await commandService.executeCommand('editor.action.formatSelection');
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9ybWF0QWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2Zvcm1hdC9icm93c2VyL2Zvcm1hdEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxRQUFRLEVBQW1CLE1BQU0scUNBQXFDLENBQUE7QUFDL0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRXRFLE9BQU8sRUFDTixZQUFZLEVBRVosb0JBQW9CLEVBQ3BCLDBCQUEwQixHQUUxQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRW5GLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFckQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDL0UsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDdkYsT0FBTyxFQUNOLHdDQUF3QyxFQUN4QyxrQ0FBa0MsRUFFbEMsd0JBQXdCLEdBQ3hCLE1BQU0sYUFBYSxDQUFBO0FBQ3BCLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUNwRCxPQUFP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