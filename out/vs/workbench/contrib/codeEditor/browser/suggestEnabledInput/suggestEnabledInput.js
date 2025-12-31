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
import { $, append } from '../../../../../base/browser/dom.js';
import { DEFAULT_FONT_FAMILY } from '../../../../../base/browser/fonts.js';
import { Widget } from '../../../../../base/browser/ui/widget.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { HistoryNavigator } from '../../../../../base/common/history.js';
import { mixin } from '../../../../../base/common/objects.js';
import { isMacintosh } from '../../../../../base/common/platform.js';
import { URI as uri } from '../../../../../base/common/uri.js';
import './suggestEnabledInput.css';
import { EditorExtensionsRegistry } from '../../../../../editor/browser/editorExtensions.js';
import { CodeEditorWidget } from '../../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { EditOperation } from '../../../../../editor/common/core/editOperation.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { ensureValidWordDefinition, getWordAtText, } from '../../../../../editor/common/core/wordHelper.js';
import { ILanguageFeaturesService } from '../../../../../editor/common/services/languageFeatures.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ContextMenuController } from '../../../../../editor/contrib/contextmenu/browser/contextmenu.js';
import { SnippetController2 } from '../../../../../editor/contrib/snippet/browser/snippetController2.js';
import { SuggestController } from '../../../../../editor/contrib/suggest/browser/suggestController.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, } from '../../../../../platform/contextkey/common/contextkey.js';
import { registerAndCreateHistoryNavigationContext, } from '../../../../../platform/history/browser/contextScopedHistoryWidget.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { asCssVariable, asCssVariableWithDefault, inputBackground, inputBorder, inputForeground, inputPlaceholderForeground, } from '../../../../../platform/theme/common/colorRegistry.js';
import { MenuPreventer } from '../menuPreventer.js';
import { SelectionClipboardContributionID } from '../selectionClipboard.js';
import { getSimpleEditorOptions, setupSimpleEditorSelectionStyling, } from '../simpleEditorOptions.js';
let SuggestEnabledInput = class SuggestEnabledInput extends Widget {
    constructor(id, parent, suggestionProvider, ariaLabel, resourceHandle, options, defaultInstantiationService, modelService, contextKeyService, languageFeaturesService, configurationService) {
        super();
        this._onShouldFocusResults = new Emitter();
        this.onShouldFocusResults = this._onShouldFocusResults.event;
        this._onInputDidChange = new Emitter();
        this.onInputDidChange = this._onInputDidChange.event;
        this._onDidFocus = this._register(new Emitter());
        this.onDidFocus = this._onDidFocus.event;
        this._onDidBlur = this._register(new Emitter());
        this.onDidBlur = this._onDidBlur.event;
        this.stylingContainer = append(parent, $('.suggest-input-container'));
        this.element = parent;
        this.placeholderText = append(this.stylingContainer, $('.suggest-input-placeholder', undefined, options.placeholderText || ''));
        const editorOptions = mixin(getSimpleEditorOptions(configurationService), getSuggestEnabledInputOptions(ariaLabel));
        editorOptions.overflowWidgetsDomNode = options.overflowWidgetsDomNode;
        const scopedContextKeyService = this.getScopedContextKeyService(contextKeyService);
        const instantiationService = scopedContextKeyService
            ? this._register(defaultInstantiationService.createChild(new ServiceCollection([IContextKeyService, scopedContextKeyService])))
            : defaultInstantiationService;
        this.inputWidget = this._register(instantiationService.createInstance(CodeEditorWidget, this.stylingContainer, editorOptions, {
            contributions: EditorExtensionsRegistry.getSomeEditorContributions([
                SuggestController.ID,
                SnippetController2.ID,
                ContextMenuController.ID,
                MenuPreventer.ID,
                SelectionClipboardContributionID,
            ]),
            isSimpleWidget: true,
        }));
        this._register(configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('editor.accessibilitySupport') ||
                e.affectsConfiguration('editor.cursorBlinking')) {
                const accessibilitySupport = configurationService.getValue('editor.accessibilitySupport');
                const cursorBlinking = configurationService.getValue('editor.cursorBlinking');
                this.inputWidget.updateOptions({
                    accessibilitySupport,
                    cursorBlinking,
                });
            }
        }));
        this._register(this.inputWidget.onDidFocusEditorText(() => this._onDidFocus.fire()));
        this._register(this.inputWidget.onDidBlurEditorText(() => this._onDidBlur.fire()));
        const scopeHandle = uri.parse(resourceHandle);
        this.inputModel = modelService.createModel('', null, scopeHandle, true);
        this._register(this.inputModel);
        this.inputWidget.setModel(this.inputModel);
        this._register(this.inputWidget.onDidPaste(() => this.setValue(this.getValue()))); // setter cleanses
        this._register(this.inputWidget.onDidFocusEditorText(() => {
            if (options.focusContextKey) {
                options.focusContextKey.set(true);
            }
            this.stylingContainer.classList.add('synthetic-focus');
        }));
        this._register(this.inputWidget.onDidBlurEditorText(() => {
            if (options.focusContextKey) {
                options.focusContextKey.set(false);
            }
            this.stylingContainer.classList.remove('synthetic-focus');
        }));
        this._register(Event.chain(this.inputWidget.onKeyDown, ($) => $.filter((e) => e.keyCode === 3 /* KeyCode.Enter */))((e) => {
            e.preventDefault(); /** Do nothing. Enter causes new line which is not expected. */
        }, this));
        this._register(Event.chain(this.inputWidget.onKeyDown, ($) => $.filter((e) => e.keyCode === 18 /* KeyCode.DownArrow */ && (isMacintosh ? e.metaKey : e.ctrlKey)))(() => this._onShouldFocusResults.fire(), this));
        let preexistingContent = this.getValue();
        const inputWidgetModel = this.inputWidget.getModel();
        if (inputWidgetModel) {
            this._register(inputWidgetModel.onDidChangeContent(() => {
                const content = this.getValue();
                this.placeholderText.style.visibility = content ? 'hidden' : 'visible';
                if (preexistingContent.trim() === content.trim()) {
                    return;
                }
                this._onInputDidChange.fire(undefined);
                preexistingContent = content;
            }));
        }
        const validatedSuggestProvider = {
            provideResults: suggestionProvider.provideResults,
            sortKey: suggestionProvider.sortKey || ((a) => a),
            triggerCharacters: suggestionProvider.triggerCharacters || [],
            wordDefinition: suggestionProvider.wordDefinition
                ? ensureValidWordDefinition(suggestionProvider.wordDefinition)
                : undefined,
            alwaysShowSuggestions: !!suggestionProvider.alwaysShowSuggestions,
        };
        this.setValue(options.value || '');
        this._register(languageFeaturesService.completionProvider.register({
            scheme: scopeHandle.scheme,
            pattern: '**/' + scopeHandle.path,
            hasAccessToAllModels: true,
        }, {
            _debugDisplayName: `suggestEnabledInput/${id}`,
            triggerCharacters: validatedSuggestProvider.triggerCharacters,
            provideCompletionItems: (model, position, _context) => {
                const query = model.getValue();
                const zeroIndexedColumn = position.column - 1;
                let alreadyTypedCount = 0, zeroIndexedWordStart = 0;
                if (validatedSuggestProvider.wordDefinition) {
                    const wordAtText = getWordAtText(position.column, validatedSuggestProvider.wordDefinition, query, 0);
                    alreadyTypedCount = wordAtText?.word.length ?? 0;
                    zeroIndexedWordStart = wordAtText ? wordAtText.startColumn - 1 : 0;
                }
                else {
                    zeroIndexedWordStart = query.lastIndexOf(' ', zeroIndexedColumn - 1) + 1;
                    alreadyTypedCount = zeroIndexedColumn - zeroIndexedWordStart;
                }
                // dont show suggestions if the user has typed something, but hasn't used the trigger character
                if (!validatedSuggestProvider.alwaysShowSuggestions &&
                    alreadyTypedCount > 0 &&
                    validatedSuggestProvider.triggerCharacters?.indexOf(query[zeroIndexedWordStart]) ===
                        -1) {
                    return { suggestions: [] };
                }
                return {
                    suggestions: suggestionProvider
                        .provideResults(query)
                        .map((result) => {
                        let label;
                        let rest;
                        if (typeof result === 'string') {
                            label = result;
                        }
                        else {
                            label = result.label;
                            rest = result;
                        }
                        return {
                            label,
                            insertText: label,
                            range: Range.fromPositions(position.delta(0, -alreadyTypedCount), position),
                            sortText: validatedSuggestProvider.sortKey(label),
                            kind: 17 /* languages.CompletionItemKind.Keyword */,
                            ...rest,
                        };
                    }),
                };
            },
        }));
        this.style(options.styleOverrides || {});
    }
    getScopedContextKeyService(_contextKeyService) {
        return undefined;
    }
    updateAriaLabel(label) {
        this.inputWidget.updateOptions({ ariaLabel: label });
    }
    setValue(val) {
        val = val.replace(/\s/g, ' ');
        const fullRange = this.inputModel.getFullModelRange();
        this.inputWidget.executeEdits('suggestEnabledInput.setValue', [
            EditOperation.replace(fullRange, val),
        ]);
        this.inputWidget.setScrollTop(0);
        this.inputWidget.setPosition(new Position(1, val.length + 1));
    }
    getValue() {
        return this.inputWidget.getValue();
    }
    style(styleOverrides) {
        this.stylingContainer.style.backgroundColor = asCssVariable(styleOverrides.inputBackground ?? inputBackground);
        this.stylingContainer.style.color = asCssVariable(styleOverrides.inputForeground ?? inputForeground);
        this.placeholderText.style.color = asCssVariable(styleOverrides.inputPlaceholderForeground ?? inputPlaceholderForeground);
        this.stylingContainer.style.borderWidth = '1px';
        this.stylingContainer.style.borderStyle = 'solid';
        this.stylingContainer.style.borderColor = asCssVariableWithDefault(styleOverrides.inputBorder ?? inputBorder, 'transparent');
        const cursor = this.stylingContainer.getElementsByClassName('cursor')[0];
        if (cursor) {
            cursor.style.backgroundColor = asCssVariable(styleOverrides.inputForeground ?? inputForeground);
        }
    }
    focus(selectAll) {
        this.inputWidget.focus();
        if (selectAll && this.inputWidget.getValue()) {
            this.selectAll();
        }
    }
    onHide() {
        this.inputWidget.onHide();
    }
    layout(dimension) {
        this.inputWidget.layout(dimension);
        this.placeholderText.style.width = `${dimension.width - 2}px`;
    }
    selectAll() {
        this.inputWidget.setSelection(new Range(1, 1, 1, this.getValue().length + 1));
    }
};
SuggestEnabledInput = __decorate([
    __param(6, IInstantiationService),
    __param(7, IModelService),
    __param(8, IContextKeyService),
    __param(9, ILanguageFeaturesService),
    __param(10, IConfigurationService)
], SuggestEnabledInput);
export { SuggestEnabledInput };
let SuggestEnabledInputWithHistory = class SuggestEnabledInputWithHistory extends SuggestEnabledInput {
    constructor({ id, parent, ariaLabel, suggestionProvider, resourceHandle, suggestOptions, history, }, instantiationService, modelService, contextKeyService, languageFeaturesService, configurationService) {
        super(id, parent, suggestionProvider, ariaLabel, resourceHandle, suggestOptions, instantiationService, modelService, contextKeyService, languageFeaturesService, configurationService);
        this.history = this._register(new HistoryNavigator(new Set(history), 100));
    }
    addToHistory() {
        const value = this.getValue();
        if (value && value !== this.getCurrentValue()) {
            this.history.add(value);
        }
    }
    getHistory() {
        return this.history.getHistory();
    }
    showNextValue() {
        if (!this.history.has(this.getValue())) {
            this.addToHistory();
        }
        let next = this.getNextValue();
        if (next) {
            next = next === this.getValue() ? this.getNextValue() : next;
        }
        this.setValue(next ?? '');
    }
    showPreviousValue() {
        if (!this.history.has(this.getValue())) {
            this.addToHistory();
        }
        let previous = this.getPreviousValue();
        if (previous) {
            previous = previous === this.getValue() ? this.getPreviousValue() : previous;
        }
        if (previous) {
            this.setValue(previous);
            this.inputWidget.setPosition({ lineNumber: 0, column: 0 });
        }
    }
    clearHistory() {
        this.history.clear();
    }
    getCurrentValue() {
        let currentValue = this.history.current();
        if (!currentValue) {
            currentValue = this.history.last();
            this.history.next();
        }
        return currentValue;
    }
    getPreviousValue() {
        return this.history.previous() || this.history.first();
    }
    getNextValue() {
        return this.history.next();
    }
};
SuggestEnabledInputWithHistory = __decorate([
    __param(1, IInstantiationService),
    __param(2, IModelService),
    __param(3, IContextKeyService),
    __param(4, ILanguageFeaturesService),
    __param(5, IConfigurationService)
], SuggestEnabledInputWithHistory);
export { SuggestEnabledInputWithHistory };
let ContextScopedSuggestEnabledInputWithHistory = class ContextScopedSuggestEnabledInputWithHistory extends SuggestEnabledInputWithHistory {
    constructor(options, instantiationService, modelService, contextKeyService, languageFeaturesService, configurationService) {
        super(options, instantiationService, modelService, contextKeyService, languageFeaturesService, configurationService);
        const { historyNavigationBackwardsEnablement, historyNavigationForwardsEnablement } = this.historyContext;
        this._register(this.inputWidget.onDidChangeCursorPosition(({ position }) => {
            const viewModel = this.inputWidget._getViewModel();
            const lastLineNumber = viewModel.getLineCount();
            const lastLineCol = viewModel.getLineLength(lastLineNumber) + 1;
            const viewPosition = viewModel.coordinatesConverter.convertModelPositionToViewPosition(position);
            historyNavigationBackwardsEnablement.set(viewPosition.lineNumber === 1 && viewPosition.column === 1);
            historyNavigationForwardsEnablement.set(viewPosition.lineNumber === lastLineNumber && viewPosition.column === lastLineCol);
        }));
    }
    getScopedContextKeyService(contextKeyService) {
        const scopedContextKeyService = this._register(contextKeyService.createScoped(this.element));
        this.historyContext = this._register(registerAndCreateHistoryNavigationContext(scopedContextKeyService, this));
        return scopedContextKeyService;
    }
};
ContextScopedSuggestEnabledInputWithHistory = __decorate([
    __param(1, IInstantiationService),
    __param(2, IModelService),
    __param(3, IContextKeyService),
    __param(4, ILanguageFeaturesService),
    __param(5, IConfigurationService)
], ContextScopedSuggestEnabledInputWithHistory);
export { ContextScopedSuggestEnabledInputWithHistory };
setupSimpleEditorSelectionStyling('.suggest-input-container');
function getSuggestEnabledInputOptions(ariaLabel) {
    return {
        fontSize: 13,
        lineHeight: 20,
        wordWrap: 'off',
        scrollbar: { vertical: 'hidden' },
        roundedSelection: false,
        guides: {
            indentation: false,
        },
        cursorWidth: 1,
        fontFamily: DEFAULT_FONT_FAMILY,
        ariaLabel: ariaLabel || '',
        snippetSuggestions: 'none',
        suggest: { filterGraceful: false, showIcons: false },
        autoClosingBrackets: 'never',
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdEVuYWJsZWRJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVFZGl0b3IvYnJvd3Nlci9zdWdnZXN0RW5hYmxlZElucHV0L3N1Z2dlc3RFbmFibGVkSW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBYSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUUxRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUV4RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxHQUFHLElBQUksR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTywyQkFBMkIsQ0FBQTtBQUVsQyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQTtBQUV0RyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDbEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNsRSxPQUFPLEVBQ04seUJBQXlCLEVBQ3pCLGFB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