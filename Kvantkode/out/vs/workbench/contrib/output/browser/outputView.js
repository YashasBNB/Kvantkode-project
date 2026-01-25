var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './output.css';
import * as nls from '../../../../nls.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IContextKeyService, ContextKeyExpr, } from '../../../../platform/contextkey/common/contextkey.js';
import { AbstractTextResourceEditor } from '../../../browser/parts/editor/textResourceEditor.js';
import { OUTPUT_VIEW_ID, CONTEXT_IN_OUTPUT, CONTEXT_OUTPUT_SCROLL_LOCK, IOutputService, OUTPUT_FILTER_FOCUS_CONTEXT, HIDE_CATEGORY_FILTER_CONTEXT, } from '../../../services/output/common/output.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { FilterViewPane } from '../../../browser/parts/views/viewPane.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { TextResourceEditorInput } from '../../../common/editor/textResourceEditorInput.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { Dimension } from '../../../../base/browser/dom.js';
import { createCancelablePromise } from '../../../../base/common/async.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ResourceContextKey } from '../../../common/contextkeys.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { computeEditorAriaLabel } from '../../../browser/editor.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { localize } from '../../../../nls.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { LogLevel } from '../../../../platform/log/common/log.js';
import { EditorExtensionsRegistry, } from '../../../../editor/browser/editorExtensions.js';
import { Range } from '../../../../editor/common/core/range.js';
import { FindDecorations } from '../../../../editor/contrib/find/browser/findDecorations.js';
import { Memento } from '../../../common/memento.js';
import { Markers } from '../../markers/common/markers.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { viewFilterSubmenu } from '../../../browser/parts/views/viewFilter.js';
import { escapeRegExpCharacters } from '../../../../base/common/strings.js';
let OutputViewPane = class OutputViewPane extends FilterViewPane {
    get scrollLock() {
        return !!this.scrollLockContextKey.get();
    }
    set scrollLock(scrollLock) {
        this.scrollLockContextKey.set(scrollLock);
    }
    constructor(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService, outputService, storageService) {
        const memento = new Memento(Markers.MARKERS_VIEW_STORAGE_ID, storageService);
        const viewState = memento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        super({
            ...options,
            filterOptions: {
                placeholder: localize('outputView.filter.placeholder', 'Filter'),
                focusContextKey: OUTPUT_FILTER_FOCUS_CONTEXT.key,
                text: viewState['filter'] || '',
                history: [],
            },
        }, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.outputService = outputService;
        this.editorPromise = null;
        this.memento = memento;
        this.panelState = viewState;
        const filters = outputService.filters;
        filters.text = this.panelState['filter'] || '';
        filters.trace = this.panelState['showTrace'] ?? true;
        filters.debug = this.panelState['showDebug'] ?? true;
        filters.info = this.panelState['showInfo'] ?? true;
        filters.warning = this.panelState['showWarning'] ?? true;
        filters.error = this.panelState['showError'] ?? true;
        filters.categories = this.panelState['categories'] ?? '';
        this.scrollLockContextKey = CONTEXT_OUTPUT_SCROLL_LOCK.bindTo(this.contextKeyService);
        const editorInstantiationService = this._register(instantiationService.createChild(new ServiceCollection([IContextKeyService, this.scopedContextKeyService])));
        this.editor = this._register(editorInstantiationService.createInstance(OutputEditor));
        this._register(this.editor.onTitleAreaUpdate(() => {
            this.updateTitle(this.editor.getTitle());
            this.updateActions();
        }));
        this._register(this.onDidChangeBodyVisibility(() => this.onDidChangeVisibility(this.isBodyVisible())));
        this._register(this.filterWidget.onDidChangeFilterText((text) => (outputService.filters.text = text)));
        this.checkMoreFilters();
        this._register(outputService.filters.onDidChange(() => this.checkMoreFilters()));
    }
    showChannel(channel, preserveFocus) {
        if (this.channelId !== channel.id) {
            this.setInput(channel);
        }
        if (!preserveFocus) {
            this.focus();
        }
    }
    focus() {
        super.focus();
        this.editorPromise?.then(() => this.editor.focus());
    }
    clearFilterText() {
        this.filterWidget.setFilterText('');
    }
    renderBody(container) {
        super.renderBody(container);
        this.editor.create(container);
        container.classList.add('output-view');
        const codeEditor = this.editor.getControl();
        codeEditor.setAriaOptions({ role: 'document', activeDescendant: undefined });
        this._register(codeEditor.onDidChangeModelContent(() => {
            if (!this.scrollLock) {
                this.editor.revealLastLine();
            }
        }));
        this._register(codeEditor.onDidChangeCursorPosition((e) => {
            if (e.reason !== 3 /* CursorChangeReason.Explicit */) {
                return;
            }
            if (!this.configurationService.getValue('output.smartScroll.enabled')) {
                return;
            }
            const model = codeEditor.getModel();
            if (model) {
                const newPositionLine = e.position.lineNumber;
                const lastLine = model.getLineCount();
                this.scrollLock = lastLine !== newPositionLine;
            }
        }));
    }
    layoutBodyContent(height, width) {
        this.editor.layout(new Dimension(width, height));
    }
    onDidChangeVisibility(visible) {
        this.editor.setVisible(visible);
        if (!visible) {
            this.clearInput();
        }
    }
    setInput(channel) {
        this.channelId = channel.id;
        this.checkMoreFilters();
        const input = this.createInput(channel);
        if (!this.editor.input || !input.matches(this.editor.input)) {
            this.editorPromise?.cancel();
            this.editorPromise = createCancelablePromise((token) => this.editor
                .setInput(this.createInput(channel), { preserveFocus: true }, Object.create(null), token)
                .then(() => this.editor));
        }
    }
    checkMoreFilters() {
        const filters = this.outputService.filters;
        this.filterWidget.checkMoreFilters(!filters.trace ||
            !filters.debug ||
            !filters.info ||
            !filters.warning ||
            !filters.error ||
            (!!this.channelId && filters.categories.includes(`,${this.channelId}:`)));
    }
    clearInput() {
        this.channelId = undefined;
        this.editor.clearInput();
        this.editorPromise = null;
    }
    createInput(channel) {
        return this.instantiationService.createInstance(TextResourceEditorInput, channel.uri, nls.localize('output model title', '{0} - Output', channel.label), nls.localize('channel', "Output channel for '{0}'", channel.label), undefined, undefined);
    }
    saveState() {
        const filters = this.outputService.filters;
        this.panelState['filter'] = filters.text;
        this.panelState['showTrace'] = filters.trace;
        this.panelState['showDebug'] = filters.debug;
        this.panelState['showInfo'] = filters.info;
        this.panelState['showWarning'] = filters.warning;
        this.panelState['showError'] = filters.error;
        this.panelState['categories'] = filters.categories;
        this.memento.saveMemento();
        super.saveState();
    }
};
OutputViewPane = __decorate([
    __param(1, IKeybindingService),
    __param(2, IContextMenuService),
    __param(3, IConfigurationService),
    __param(4, IContextKeyService),
    __param(5, IViewDescriptorService),
    __param(6, IInstantiationService),
    __param(7, IOpenerService),
    __param(8, IThemeService),
    __param(9, IHoverService),
    __param(10, IOutputService),
    __param(11, IStorageService)
], OutputViewPane);
export { OutputViewPane };
let OutputEditor = class OutputEditor extends AbstractTextResourceEditor {
    constructor(telemetryService, instantiationService, storageService, configurationService, textResourceConfigurationService, themeService, editorGroupService, editorService, fileService) {
        super(OUTPUT_VIEW_ID, editorGroupService.activeGroup /* this is not correct but pragmatic */, telemetryService, instantiationService, storageService, textResourceConfigurationService, themeService, editorGroupService, editorService, fileService);
        this.configurationService = configurationService;
        this.resourceContext = this._register(instantiationService.createInstance(ResourceContextKey));
    }
    getId() {
        return OUTPUT_VIEW_ID;
    }
    getTitle() {
        return nls.localize('output', 'Output');
    }
    getConfigurationOverrides(configuration) {
        const options = super.getConfigurationOverrides(configuration);
        options.wordWrap = 'on'; // all output editors wrap
        options.lineNumbers = 'off'; // all output editors hide line numbers
        options.glyphMargin = false;
        options.lineDecorationsWidth = 20;
        options.rulers = [];
        options.folding = false;
        options.scrollBeyondLastLine = false;
        options.renderLineHighlight = 'none';
        options.minimap = { enabled: false };
        options.renderValidationDecorations = 'editable';
        options.padding = undefined;
        options.readOnly = true;
        options.domReadOnly = true;
        options.unicodeHighlight = {
            nonBasicASCII: false,
            invisibleCharacters: false,
            ambiguousCharacters: false,
        };
        const outputConfig = this.configurationService.getValue('[Log]');
        if (outputConfig) {
            if (outputConfig['editor.minimap.enabled']) {
                options.minimap = { enabled: true };
            }
            if ('editor.wordWrap' in outputConfig) {
                options.wordWrap = outputConfig['editor.wordWrap'];
            }
        }
        return options;
    }
    getAriaLabel() {
        return this.input
            ? this.input.getAriaLabel()
            : nls.localize('outputViewAriaLabel', 'Output panel');
    }
    computeAriaLabel() {
        return this.input
            ? computeEditorAriaLabel(this.input, undefined, undefined, this.editorGroupService.count)
            : this.getAriaLabel();
    }
    async setInput(input, options, context, token) {
        const focus = !(options && options.preserveFocus);
        if (this.input && input.matches(this.input)) {
            return;
        }
        if (this.input) {
            // Dispose previous input (Output panel is not a workbench editor)
            this.input.dispose();
        }
        await super.setInput(input, options, context, token);
        this.resourceContext.set(input.resource);
        if (focus) {
            this.focus();
        }
        this.revealLastLine();
    }
    clearInput() {
        if (this.input) {
            // Dispose current input (Output panel is not a workbench editor)
            this.input.dispose();
        }
        super.clearInput();
        this.resourceContext.reset();
    }
    createEditor(parent) {
        parent.setAttribute('role', 'document');
        super.createEditor(parent);
        const scopedContextKeyService = this.scopedContextKeyService;
        if (scopedContextKeyService) {
            CONTEXT_IN_OUTPUT.bindTo(scopedContextKeyService).set(true);
        }
    }
    _getContributions() {
        return [
            ...EditorExtensionsRegistry.getEditorContributions(),
            {
                id: FilterController.ID,
                ctor: FilterController,
                instantiation: 0 /* EditorContributionInstantiation.Eager */,
            },
        ];
    }
    getCodeEditorWidgetOptions() {
        return { contributions: this._getContributions() };
    }
};
OutputEditor = __decorate([
    __param(0, ITelemetryService),
    __param(1, IInstantiationService),
    __param(2, IStorageService),
    __param(3, IConfigurationService),
    __param(4, ITextResourceConfigurationService),
    __param(5, IThemeService),
    __param(6, IEditorGroupsService),
    __param(7, IEditorService),
    __param(8, IFileService)
], OutputEditor);
export { OutputEditor };
let FilterController = class FilterController extends Disposable {
    static { this.ID = 'output.editor.contrib.filterController'; }
    constructor(editor, outputService) {
        super();
        this.editor = editor;
        this.outputService = outputService;
        this.modelDisposables = this._register(new DisposableStore());
        this.hiddenAreas = [];
        this.categories = new Map();
        this.decorationsCollection = editor.createDecorationsCollection();
        this._register(editor.onDidChangeModel(() => this.onDidChangeModel()));
        this._register(this.outputService.filters.onDidChange(() => editor.hasModel() && this.filter(editor.getModel())));
    }
    onDidChangeModel() {
        this.modelDisposables.clear();
        this.hiddenAreas = [];
        this.categories.clear();
        if (!this.editor.hasModel()) {
            return;
        }
        const model = this.editor.getModel();
        this.filter(model);
        const computeEndLineNumber = () => {
            const endLineNumber = model.getLineCount();
            return endLineNumber > 1 && model.getLineMaxColumn(endLineNumber) === 1
                ? endLineNumber - 1
                : endLineNumber;
        };
        let endLineNumber = computeEndLineNumber();
        this.modelDisposables.add(model.onDidChangeContent((e) => {
            if (e.changes.every((e) => e.range.startLineNumber > endLineNumber)) {
                this.filterIncremental(model, endLineNumber + 1);
            }
            else {
                this.filter(model);
            }
            endLineNumber = computeEndLineNumber();
        }));
    }
    filter(model) {
        this.hiddenAreas = [];
        this.decorationsCollection.clear();
        this.filterIncremental(model, 1);
    }
    filterIncremental(model, fromLineNumber) {
        const { findMatches, hiddenAreas, categories: sources } = this.compute(model, fromLineNumber);
        this.hiddenAreas.push(...hiddenAreas);
        this.editor.setHiddenAreas(this.hiddenAreas, this);
        if (findMatches.length) {
            this.decorationsCollection.append(findMatches);
        }
        if (sources.size) {
            const that = this;
            for (const [categoryFilter, categoryName] of sources) {
                if (this.categories.has(categoryFilter)) {
                    continue;
                }
                this.categories.set(categoryFilter, categoryName);
                this.modelDisposables.add(registerAction2(class extends Action2 {
                    constructor() {
                        super({
                            id: `workbench.actions.${OUTPUT_VIEW_ID}.toggle.${categoryFilter}`,
                            title: categoryName,
                            toggled: ContextKeyExpr.regex(HIDE_CATEGORY_FILTER_CONTEXT.key, new RegExp(`.*,${escapeRegExpCharacters(categoryFilter)},.*`)).negate(),
                            menu: {
                                id: viewFilterSubmenu,
                                group: '1_category_filter',
                                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', OUTPUT_VIEW_ID)),
                            },
                        });
                    }
                    async run() {
                        that.outputService.filters.toggleCategory(categoryFilter);
                    }
                }));
            }
        }
    }
    compute(model, fromLineNumber) {
        const filters = this.outputService.filters;
        const activeChannel = this.outputService.getActiveChannel();
        const findMatches = [];
        const hiddenAreas = [];
        const categories = new Map();
        const logEntries = activeChannel?.getLogEntries();
        if (activeChannel && logEntries?.length) {
            const hasLogLevelFilter = !filters.trace || !filters.debug || !filters.info || !filters.warning || !filters.error;
            const fromLogLevelEntryIndex = logEntries.findIndex((entry) => fromLineNumber >= entry.range.startLineNumber &&
                fromLineNumber <= entry.range.endLineNumber);
            if (fromLogLevelEntryIndex === -1) {
                return { findMatches, hiddenAreas, categories };
            }
            for (let i = fromLogLevelEntryIndex; i < logEntries.length; i++) {
                const entry = logEntries[i];
                if (entry.category) {
                    categories.set(`${activeChannel.id}:${entry.category}`, entry.category);
                }
                if (hasLogLevelFilter && !this.shouldShowLogLevel(entry, filters)) {
                    hiddenAreas.push(entry.range);
                    continue;
                }
                if (!this.shouldShowCategory(activeChannel.id, entry, filters)) {
                    hiddenAreas.push(entry.range);
                    continue;
                }
                if (filters.text) {
                    const matches = model.findMatches(filters.text, entry.range, false, false, null, false);
                    if (matches.length) {
                        for (const match of matches) {
                            findMatches.push({
                                range: match.range,
                                options: FindDecorations._FIND_MATCH_DECORATION,
                            });
                        }
                    }
                    else {
                        hiddenAreas.push(entry.range);
                    }
                }
            }
            return { findMatches, hiddenAreas, categories };
        }
        if (!filters.text) {
            return { findMatches, hiddenAreas, categories };
        }
        const lineCount = model.getLineCount();
        for (let lineNumber = fromLineNumber; lineNumber <= lineCount; lineNumber++) {
            const lineRange = new Range(lineNumber, 1, lineNumber, model.getLineMaxColumn(lineNumber));
            const matches = model.findMatches(filters.text, lineRange, false, false, null, false);
            if (matches.length) {
                for (const match of matches) {
                    findMatches.push({ range: match.range, options: FindDecorations._FIND_MATCH_DECORATION });
                }
            }
            else {
                hiddenAreas.push(lineRange);
            }
        }
        return { findMatches, hiddenAreas, categories };
    }
    shouldShowLogLevel(entry, filters) {
        switch (entry.logLevel) {
            case LogLevel.Trace:
                return filters.trace;
            case LogLevel.Debug:
                return filters.debug;
            case LogLevel.Info:
                return filters.info;
            case LogLevel.Warning:
                return filters.warning;
            case LogLevel.Error:
                return filters.error;
        }
        return true;
    }
    shouldShowCategory(activeChannelId, entry, filters) {
        if (!entry.category) {
            return true;
        }
        return !filters.hasCategory(`${activeChannelId}:${entry.category}`);
    }
};
FilterController = __decorate([
    __param(1, IOutputService)
], FilterController);
export { FilterController };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0cHV0Vmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvb3V0cHV0L2Jyb3dzZXIvb3V0cHV0Vmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLGNBQWMsQ0FBQTtBQUNyQixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBR3pDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUNuSCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQ04sa0JBQWtCLEVBRWxCLGNBQWMsR0FDZCxNQUFNLHNEQUFzRCxDQUFBO0FBRTdELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ2hHLE9BQU8sRUFDTixjQUFjLEVBQ2QsaUJBQWlCLEVBRWpCLDBCQUEwQixFQUMxQixjQUFjLEVBRWQsMkJBQTJCLEVBRTNCLDRCQUE0QixHQUM1QixNQUFNLDJDQUEyQyxDQUFBO0FBQ2xELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUU3RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFakYsT0FBTyxFQUFvQixjQUFjLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMzRixPQUFPLEVBQUUsa0JBQWtCLEVB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