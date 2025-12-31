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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0cHV0Vmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL291dHB1dC9icm93c2VyL291dHB1dFZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxjQUFjLENBQUE7QUFDckIsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUd6QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDbkgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUNOLGtCQUFrQixFQUVsQixjQUFjLEdBQ2QsTUFBTSxzREFBc0QsQ0FBQTtBQUU3RCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNoRyxPQUFPLEVBQ04sY0FBYyxFQUNkLGlCQUFpQixFQUVqQiwwQkFBMEIsRUFDMUIsY0FBYyxFQUVkLDJCQUEyQixFQUUzQiw0QkFBNEIsR0FDNUIsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDakYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFFN0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRWpGLE9BQU8sRUFBb0IsY0FBYyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDM0YsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1B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