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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9ybWF0QWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvZm9ybWF0L2Jyb3dzZXIvZm9ybWF0QWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckUsT0FBTyxFQUFFLFFBQVEsRUFBbUIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFdEUsT0FBTyxFQUNOLFlBQVksRUFFWixvQkFBb0IsRUFDcEIsMEJBQTBCLEdBRTFCLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFbkYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUVyRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUN2RixPQUFPLEVBQ04sd0NBQXdDLEVBQ3hDLGtDQUFrQyxFQUVsQyx3QkFBd0IsR0FDeEIsTUFBTSxhQUFhLENBQUE7QUFDcEIsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3BE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