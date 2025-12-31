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
var InlineCompletionsController_1;
import { alert } from '../../../../../base/browser/ui/aria/aria.js';
import { timeout } from '../../../../../base/common/async.js';
import { cancelOnDispose } from '../../../../../base/common/cancellation.js';
import { createHotClass } from '../../../../../base/common/hotReloadHelpers.js';
import { Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { autorun, derived, derivedDisposable, derivedObservableWithCache, observableFromEvent, observableSignal, observableValue, runOnChange, runOnChangeWithStore, transaction, waitForState, } from '../../../../../base/common/observable.js';
import { isUndefined } from '../../../../../base/common/types.js';
import { localize } from '../../../../../nls.js';
import { IAccessibilityService } from '../../../../../platform/accessibility/common/accessibility.js';
import { AccessibilitySignal, IAccessibilitySignalService, } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService, } from '../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { hotClassGetOriginalInstance } from '../../../../../platform/observable/common/wrapInHotClass.js';
import { CoreEditingCommands } from '../../../../browser/coreCommands.js';
import { observableCodeEditor } from '../../../../browser/observableCodeEditor.js';
import { getOuterEditor } from '../../../../browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { Position } from '../../../../common/core/position.js';
import { ILanguageFeatureDebounceService } from '../../../../common/services/languageFeatureDebounce.js';
import { ILanguageFeaturesService } from '../../../../common/services/languageFeatures.js';
import { InlineSuggestionHintsContentWidget } from '../hintsWidget/inlineCompletionsHintsWidget.js';
import { TextModelChangeRecorder } from '../model/changeRecorder.js';
import { InlineCompletionsModel } from '../model/inlineCompletionsModel.js';
import { ObservableSuggestWidgetAdapter } from '../model/suggestWidgetAdapter.js';
import { ObservableContextKeyService } from '../utils.js';
import { InlineCompletionsView } from '../view/inlineCompletionsView.js';
import { inlineSuggestCommitId } from './commandIds.js';
import { InlineCompletionContextKeys } from './inlineCompletionContextKeys.js';
let InlineCompletionsController = class InlineCompletionsController extends Disposable {
    static { InlineCompletionsController_1 = this; }
    static { this._instances = new Set(); }
    static { this.hot = createHotClass(InlineCompletionsController_1); }
    static { this.ID = 'editor.contrib.inlineCompletionsController'; }
    /**
     * Find the controller in the focused editor or in the outer editor (if applicable)
     */
    static getInFocusedEditorOrParent(accessor) {
        const outerEditor = getOuterEditor(accessor);
        if (!outerEditor) {
            return null;
        }
        return InlineCompletionsController_1.get(outerEditor);
    }
    static get(editor) {
        return hotClassGetOriginalInstance(editor.getContribution(InlineCompletionsController_1.ID));
    }
    constructor(editor, _instantiationService, _contextKeyService, _configurationService, _commandService, _debounceService, _languageFeaturesService, _accessibilitySignalService, _keybindingService, _accessibilityService) {
        super();
        this.editor = editor;
        this._instantiationService = _instantiationService;
        this._contextKeyService = _contextKeyService;
        this._configurationService = _configurationService;
        this._commandService = _commandService;
        this._debounceService = _debounceService;
        this._languageFeaturesService = _languageFeaturesService;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._keybindingService = _keybindingService;
        this._accessibilityService = _accessibilityService;
        this._editorObs = observableCodeEditor(this.editor);
        this._positions = derived(this, (reader) => this._editorObs.selections.read(reader)?.map((s) => s.getEndPosition()) ?? [
            new Position(1, 1),
        ]);
        this._suggestWidgetAdapter = this._register(new ObservableSuggestWidgetAdapter(this._editorObs, (item) => this.model.get()?.handleSuggestAccepted(item), () => this.model.get()?.selectedInlineCompletion.get()?.toSingleTextEdit(undefined)));
        this._enabledInConfig = observableFromEvent(this, this.editor.onDidChangeConfiguration, () => this.editor.getOption(64 /* EditorOption.inlineSuggest */).enabled);
        this._isScreenReaderEnabled = observableFromEvent(this, this._accessibilityService.onDidChangeScreenReaderOptimized, () => this._accessibilityService.isScreenReaderOptimized());
        this._editorDictationInProgress = observableFromEvent(this, this._contextKeyService.onDidChangeContext, () => this._contextKeyService
            .getContext(this.editor.getDomNode())
            .getValue('editorDictation.inProgress') === true);
        this._enabled = derived(this, (reader) => this._enabledInConfig.read(reader) &&
            (!this._isScreenReaderEnabled.read(reader) || !this._editorDictationInProgress.read(reader)));
        this._debounceValue = this._debounceService.for(this._languageFeaturesService.inlineCompletionsProvider, 'InlineCompletionsDebounce', { min: 50, max: 50 });
        this._focusIsInMenu = observableValue(this, false);
        this._focusIsInEditorOrMenu = derived(this, (reader) => {
            const editorHasFocus = this._editorObs.isFocused.read(reader);
            const menuHasFocus = this._focusIsInMenu.read(reader);
            return editorHasFocus || menuHasFocus;
        });
        this._cursorIsInIndentation = derived(this, (reader) => {
            const cursorPos = this._editorObs.cursorPosition.read(reader);
            if (cursorPos === null) {
                return false;
            }
            const model = this._editorObs.model.read(reader);
            if (!model) {
                return false;
            }
            this._editorObs.versionId.read(reader);
            const indentMaxColumn = model.getLineIndentColumn(cursorPos.lineNumber);
            return cursorPos.column <= indentMaxColumn;
        });
        this.model = derivedDisposable(this, (reader) => {
            if (this._editorObs.isReadonly.read(reader)) {
                return undefined;
            }
            const textModel = this._editorObs.model.read(reader);
            if (!textModel) {
                return undefined;
            }
            const model = this._instantiationService.createInstance(InlineCompletionsModel, textModel, this._suggestWidgetAdapter.selectedItem, this._editorObs.versionId, this._positions, this._debounceValue, this._enabled, this.editor);
            return model;
        }).recomputeInitiallyAndOnChange(this._store);
        this._playAccessibilitySignal = observableSignal(this);
        this._hideInlineEditOnSelectionChange = this._editorObs
            .getOption(64 /* EditorOption.inlineSuggest */)
            .map((val) => true);
        this._view = this._register(this._instantiationService.createInstance(InlineCompletionsView, this.editor, this.model, this._focusIsInMenu));
        InlineCompletionsController_1._instances.add(this);
        this._register(toDisposable(() => InlineCompletionsController_1._instances.delete(this)));
        this._register(autorun((reader) => {
            // Cancel all other inline completions when a new one starts
            const model = this.model.read(reader);
            if (!model) {
                return;
            }
            if (model.state.read(reader) !== undefined) {
                for (const ctrl of InlineCompletionsController_1._instances) {
                    if (ctrl !== this) {
                        ctrl.reject();
                    }
                }
            }
        }));
        this._register(runOnChange(this._editorObs.onDidType, (_value, _changes) => {
            if (this._enabled.get()) {
                this.model.get()?.trigger();
            }
        }));
        this._register(runOnChange(this._editorObs.onDidPaste, (_value, _changes) => {
            if (this._enabled.get()) {
                this.model.get()?.trigger();
            }
        }));
        this._register(this._commandService.onDidExecuteCommand((e) => {
            // These commands don't trigger onDidType.
            const commands = new Set([
                CoreEditingCommands.Tab.id,
                CoreEditingCommands.DeleteLeft.id,
                CoreEditingCommands.DeleteRight.id,
                inlineSuggestCommitId,
                'acceptSelectedSuggestion',
            ]);
            if (commands.has(e.commandId) && editor.hasTextFocus() && this._enabled.get()) {
                let noDelay = false;
                if (e.commandId === inlineSuggestCommitId) {
                    noDelay = true;
                }
                this._editorObs.forceUpdate((tx) => {
                    /** @description onDidExecuteCommand */
                    this.model.get()?.trigger(tx, { noDelay });
                });
            }
        }));
        this._register(runOnChange(this._editorObs.selections, (_value, _, changes) => {
            if (changes.some((e) => e.reason === 3 /* CursorChangeReason.Explicit */ || e.source === 'api')) {
                if (!this._hideInlineEditOnSelectionChange.get() &&
                    this.model.get()?.state.get()?.kind === 'inlineEdit') {
                    return;
                }
                const m = this.model.get();
                if (!m) {
                    return;
                }
                if (m.state.get()?.kind === 'ghostText') {
                    this.model.get()?.stop();
                }
            }
        }));
        this._register(autorun((reader) => {
            const isFocused = this._focusIsInEditorOrMenu.read(reader);
            if (isFocused) {
                return;
            }
            // This is a hidden setting very useful for debugging
            if (this._contextKeyService.getContextKeyValue('accessibleViewIsShown') ||
                this._configurationService.getValue('editor.inlineSuggest.keepOnBlur') ||
                editor.getOption(64 /* EditorOption.inlineSuggest */).keepOnBlur ||
                InlineSuggestionHintsContentWidget.dropDownVisible) {
                return;
            }
            const model = this.model.get();
            if (!model) {
                return;
            }
            if (model.state.get()?.inlineCompletion?.request.isExplicitRequest &&
                model.inlineEditAvailable.get()) {
                // dont hide inline edits on blur when requested explicitly
                return;
            }
            transaction((tx) => {
                /** @description InlineCompletionsController.onDidBlurEditorWidget */
                model.stop('automatic', tx);
            });
        }));
        this._register(autorun((reader) => {
            /** @description InlineCompletionsController.forceRenderingAbove */
            const state = this.model.read(reader)?.inlineCompletionState.read(reader);
            if (state?.suggestItem) {
                if (state.primaryGhostText.lineCount >= 2) {
                    this._suggestWidgetAdapter.forceRenderingAbove();
                }
            }
            else {
                this._suggestWidgetAdapter.stopForceRenderingAbove();
            }
        }));
        this._register(toDisposable(() => {
            this._suggestWidgetAdapter.stopForceRenderingAbove();
        }));
        const currentInlineCompletionBySemanticId = derivedObservableWithCache(this, (reader, last) => {
            const model = this.model.read(reader);
            const state = model?.state.read(reader);
            if (this._suggestWidgetAdapter.selectedItem.get()) {
                return last;
            }
            return state?.inlineCompletion?.semanticId;
        });
        this._register(runOnChangeWithStore(derived((reader) => {
            this._playAccessibilitySignal.read(reader);
            currentInlineCompletionBySemanticId.read(reader);
            return {};
        }), async (_value, _, _deltas, store) => {
            /** @description InlineCompletionsController.playAccessibilitySignalAndReadSuggestion */
            const model = this.model.get();
            const state = model?.state.get();
            if (!state || !model) {
                return;
            }
            const lineText = state.kind === 'ghostText'
                ? model.textModel.getLineContent(state.primaryGhostText.lineNumber)
                : '';
            await timeout(50, cancelOnDispose(store));
            await waitForState(this._suggestWidgetAdapter.selectedItem, isUndefined, () => false, cancelOnDispose(store));
            await this._accessibilitySignalService.playSignal(AccessibilitySignal.inlineSuggestion);
            if (this.editor.getOption(8 /* EditorOption.screenReaderAnnounceInlineSuggestion */)) {
                if (state.kind === 'ghostText') {
                    this._provideScreenReaderUpdate(state.primaryGhostText.renderForScreenReader(lineText));
                }
                else {
                    this._provideScreenReaderUpdate(''); // Only announce Alt+F2
                }
            }
        }));
        // TODO@hediet
        this._register(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('accessibility.verbosity.inlineCompletions')) {
                this.editor.updateOptions({
                    inlineCompletionsAccessibilityVerbose: this._configurationService.getValue('accessibility.verbosity.inlineCompletions'),
                });
            }
        }));
        this.editor.updateOptions({
            inlineCompletionsAccessibilityVerbose: this._configurationService.getValue('accessibility.verbosity.inlineCompletions'),
        });
        const contextKeySvcObs = new ObservableContextKeyService(this._contextKeyService);
        this._register(contextKeySvcObs.bind(InlineCompletionContextKeys.cursorInIndentation, this._cursorIsInIndentation));
        this._register(contextKeySvcObs.bind(InlineCompletionContextKeys.hasSelection, (reader) => !this._editorObs.cursorSelection.read(reader)?.isEmpty()));
        this._register(contextKeySvcObs.bind(InlineCompletionContextKeys.cursorAtInlineEdit, this.model.map((m, reader) => m?.inlineEditState?.read(reader)?.cursorAtInlineEdit)));
        this._register(contextKeySvcObs.bind(InlineCompletionContextKeys.tabShouldAcceptInlineEdit, this.model.map((m, r) => !!m?.tabShouldAcceptInlineEdit.read(r))));
        this._register(contextKeySvcObs.bind(InlineCompletionContextKeys.tabShouldJumpToInlineEdit, this.model.map((m, r) => !!m?.tabShouldJumpToInlineEdit.read(r))));
        this._register(contextKeySvcObs.bind(InlineCompletionContextKeys.inlineEditVisible, (reader) => this.model.read(reader)?.inlineEditState.read(reader) !== undefined));
        this._register(contextKeySvcObs.bind(InlineCompletionContextKeys.inlineSuggestionHasIndentation, (reader) => this.model.read(reader)?.getIndentationInfo(reader)?.startsWithIndentation));
        this._register(contextKeySvcObs.bind(InlineCompletionContextKeys.inlineSuggestionHasIndentationLessThanTabSize, (reader) => this.model.read(reader)?.getIndentationInfo(reader)?.startsWithIndentationLessThanTabSize));
        this._register(contextKeySvcObs.bind(InlineCompletionContextKeys.suppressSuggestions, (reader) => {
            const model = this.model.read(reader);
            const state = model?.inlineCompletionState.read(reader);
            return state?.primaryGhostText && state?.inlineCompletion
                ? state.inlineCompletion.source.inlineCompletions.suppressSuggestions
                : undefined;
        }));
        this._register(contextKeySvcObs.bind(InlineCompletionContextKeys.inlineSuggestionVisible, (reader) => {
            const model = this.model.read(reader);
            const state = model?.inlineCompletionState.read(reader);
            return (!!state?.inlineCompletion &&
                state?.primaryGhostText !== undefined &&
                !state?.primaryGhostText.isEmpty());
        }));
        this._register(this._instantiationService.createInstance(TextModelChangeRecorder, this.editor));
    }
    playAccessibilitySignal(tx) {
        this._playAccessibilitySignal.trigger(tx);
    }
    _provideScreenReaderUpdate(content) {
        const accessibleViewShowing = this._contextKeyService.getContextKeyValue('accessibleViewIsShown');
        const accessibleViewKeybinding = this._keybindingService.lookupKeybinding('editor.action.accessibleView');
        let hint;
        if (!accessibleViewShowing &&
            accessibleViewKeybinding &&
            this.editor.getOption(155 /* EditorOption.inlineCompletionsAccessibilityVerbose */)) {
            hint = localize('showAccessibleViewHint', 'Inspect this in the accessible view ({0})', accessibleViewKeybinding.getAriaLabel());
        }
        alert(hint ? content + ', ' + hint : content);
    }
    shouldShowHoverAt(range) {
        const ghostText = this.model.get()?.primaryGhostText.get();
        if (!ghostText) {
            return false;
        }
        return ghostText.parts.some((p) => range.containsPosition(new Position(ghostText.lineNumber, p.column)));
    }
    shouldShowHoverAtViewZone(viewZoneId) {
        return this._view.shouldShowHoverAtViewZone(viewZoneId);
    }
    reject() {
        transaction((tx) => {
            const m = this.model.get();
            if (m) {
                m.stop('explicitCancel', tx);
            }
        });
    }
    jump() {
        const m = this.model.get();
        if (m) {
            m.jump();
        }
    }
};
InlineCompletionsController = InlineCompletionsController_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IContextKeyService),
    __param(3, IConfigurationService),
    __param(4, ICommandService),
    __param(5, ILanguageFeatureDebounceService),
    __param(6, ILanguageFeaturesService),
    __param(7, IAccessibilitySignalService),
    __param(8, IKeybindingService),
    __param(9, IAccessibilityService)
], InlineCompletionsController);
export { InlineCompletionsController };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ29tcGxldGlvbnNDb250cm9sbGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci9jb250cm9sbGVyL2lubGluZUNvbXBsZXRpb25zQ29udHJvbGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDNUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9FLE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbEYsT0FBTyxFQUVOLE9BQU8sRUFDUCxPQUFPLEVBQ1AsaUJBQWlCLEVBQ2pCLDBCQUEwQixFQUMxQixtQkFBbUIsRUFDbkIsZ0JBQWdCLEVBQ2hCLGVBQWUsRUFDZixXQUFXLEVBQ1gsb0JBQW9CLEVBQ3BCLFdBQVcsRUFDWCxZQUFZLEdBQ1osTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsMkJBQTJCLEdBQzNCLE1BQU0sbUZBQW1GLENBQUE7QUFDMUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxxQkFBcUIs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