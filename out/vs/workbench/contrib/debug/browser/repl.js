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
var Repl_1, ReplOptions_1;
import * as dom from '../../../../base/browser/dom.js';
import * as domStylesheetsJs from '../../../../base/browser/domStylesheets.js';
import * as aria from '../../../../base/browser/ui/aria/aria.js';
import { MOUSE_CURSOR_TEXT_CSS_CLASS_NAME } from '../../../../base/browser/ui/mouseCursor/mouseCursor.js';
import { RunOnceScheduler, timeout } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { memoize } from '../../../../base/common/decorators.js';
import { Emitter } from '../../../../base/common/event.js';
import { HistoryNavigator } from '../../../../base/common/history.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { removeAnsiEscapeCodes } from '../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI as uri } from '../../../../base/common/uri.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { EditorAction, registerEditorAction } from '../../../../editor/browser/editorExtensions.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { CodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { EDITOR_FONT_DEFAULTS, } from '../../../../editor/common/config/editorOptions.js';
import { Range } from '../../../../editor/common/core/range.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { CompletionItemKinds, } from '../../../../editor/common/languages.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextResourcePropertiesService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { SuggestController } from '../../../../editor/contrib/suggest/browser/suggestController.js';
import { localize, localize2 } from '../../../../nls.js';
import { AccessibilitySignal, IAccessibilitySignalService, } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { getFlatContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Action2, IMenuService, MenuId, registerAction2, } from '../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { registerAndCreateHistoryNavigationContext } from '../../../../platform/history/browser/contextScopedHistoryWidget.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { WorkbenchAsyncDataTree } from '../../../../platform/list/browser/listService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { editorForeground, resolveColorValue, } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { registerNavigableContainer } from '../../../browser/actions/widgetNavigationCommands.js';
import { FilterViewPane, ViewAction, } from '../../../browser/parts/views/viewPane.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { getSimpleCodeEditorWidgetOptions, getSimpleEditorOptions, } from '../../codeEditor/browser/simpleEditorOptions.js';
import { CONTEXT_DEBUG_STATE, CONTEXT_IN_DEBUG_REPL, CONTEXT_MULTI_SESSION_REPL, DEBUG_SCHEME, IDebugService, REPL_VIEW_ID, getStateLabel, } from '../common/debug.js';
import { Variable } from '../common/debugModel.js';
import { ReplEvaluationResult, ReplGroup } from '../common/replModel.js';
import { FocusSessionActionViewItem } from './debugActionViewItems.js';
import { DEBUG_COMMAND_CATEGORY, FOCUS_REPL_ID } from './debugCommands.js';
import { DebugExpressionRenderer } from './debugExpressionRenderer.js';
import { debugConsoleClearAll, debugConsoleEvaluationPrompt } from './debugIcons.js';
import './media/repl.css';
import { ReplFilter } from './replFilter.js';
import { ReplAccessibilityProvider, ReplDataSource, ReplDelegate, ReplEvaluationInputsRenderer, ReplEvaluationResultsRenderer, ReplGroupRenderer, ReplOutputElementRenderer, ReplRawObjectsRenderer, ReplVariablesRenderer, } from './replViewer.js';
const $ = dom.$;
const HISTORY_STORAGE_KEY = 'debug.repl.history';
const FILTER_HISTORY_STORAGE_KEY = 'debug.repl.filterHistory';
const FILTER_VALUE_STORAGE_KEY = 'debug.repl.filterValue';
const DECORATION_KEY = 'replinputdecoration';
function revealLastElement(tree) {
    tree.scrollTop = tree.scrollHeight - tree.renderHeight;
    // tree.scrollTop = 1e6;
}
const sessionsToIgnore = new Set();
const identityProvider = { getId: (element) => element.getId() };
let Repl = class Repl extends FilterViewPane {
    static { Repl_1 = this; }
    static { this.REFRESH_DELAY = 50; } // delay in ms to refresh the repl for new elements to show
    static { this.URI = uri.parse(`${DEBUG_SCHEME}:replinput`); }
    constructor(options, debugService, instantiationService, storageService, themeService, modelService, contextKeyService, codeEditorService, viewDescriptorService, contextMenuService, configurationService, textResourcePropertiesService, editorService, keybindingService, openerService, hoverService, menuService, languageFeaturesService, logService) {
        const filterText = storageService.get(FILTER_VALUE_STORAGE_KEY, 1 /* StorageScope.WORKSPACE */, '');
        super({
            ...options,
            filterOptions: {
                placeholder: localize({
                    key: 'workbench.debug.filter.placeholder',
                    comment: ['Text in the brackets after e.g. is not localizable'],
                }, 'Filter (e.g. text, !exclude, \\escape)'),
                text: filterText,
                history: JSON.parse(storageService.get(FILTER_HISTORY_STORAGE_KEY, 1 /* StorageScope.WORKSPACE */, '[]')),
            },
        }, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.debugService = debugService;
        this.storageService = storageService;
        this.modelService = modelService;
        this.configurationService = configurationService;
        this.textResourcePropertiesService = textResourcePropertiesService;
        this.editorService = editorService;
        this.keybindingService = keybindingService;
        this.languageFeaturesService = languageFeaturesService;
        this.logService = logService;
        this.previousTreeScrollHeight = 0;
        this.styleChangedWhenInvisible = false;
        this.modelChangeListener = Disposable.None;
        this.findIsOpen = false;
        this.menu = menuService.createMenu(MenuId.DebugConsoleContext, contextKeyService);
        this._register(this.menu);
        this.history = this._register(new HistoryNavigator(new Set(JSON.parse(this.storageService.get(HISTORY_STORAGE_KEY, 1 /* StorageScope.WORKSPACE */, '[]'))), 100));
        this.filter = new ReplFilter();
        this.filter.filterQuery = filterText;
        this.multiSessionRepl = CONTEXT_MULTI_SESSION_REPL.bindTo(contextKeyService);
        this.replOptions = this._register(this.instantiationService.createInstance(ReplOptions, this.id, () => this.getLocationBasedColors().background));
        this._register(this.replOptions.onDidChange(() => this.onDidStyleChange()));
        codeEditorService.registerDecorationType('repl-decoration', DECORATION_KEY, {});
        this.multiSessionRepl.set(this.isMultiSessionView);
        this.registerListeners();
    }
    registerListeners() {
        if (this.debugService.getViewModel().focusedSession) {
            this.onDidFocusSession(this.debugService.getViewModel().focusedSession);
        }
        this._register(this.debugService.getViewModel().onDidFocusSession((session) => {
            this.onDidFocusSession(session);
        }));
        this._register(this.debugService.getViewModel().onDidEvaluateLazyExpression(async (e) => {
            if (e instanceof Variable && this.tree?.hasNode(e)) {
                await this.tree.updateChildren(e, false, true);
                await this.tree.expand(e);
            }
        }));
        this._register(this.debugService.onWillNewSession(async (newSession) => {
            // Need to listen to output events for sessions which are not yet fully initialised
            const input = this.tree?.getInput();
            if (!input || input.state === 0 /* State.Inactive */) {
                await this.selectSession(newSession);
            }
            this.multiSessionRepl.set(this.isMultiSessionView);
        }));
        this._register(this.debugService.onDidEndSession(async () => {
            // Update view, since orphaned sessions might now be separate
            await Promise.resolve(); // allow other listeners to go first, so sessions can update parents
            this.multiSessionRepl.set(this.isMultiSessionView);
        }));
        this._register(this.themeService.onDidColorThemeChange(() => {
            this.refreshReplElements(false);
            if (this.isVisible()) {
                this.updateInputDecoration();
            }
        }));
        this._register(this.onDidChangeBodyVisibility((visible) => {
            if (!visible) {
                return;
            }
            if (!this.model) {
                this.model =
                    this.modelService.getModel(Repl_1.URI) ||
                        this.modelService.createModel('', null, Repl_1.URI, true);
            }
            const focusedSession = this.debugService.getViewModel().focusedSession;
            if (this.tree && this.tree.getInput() !== focusedSession) {
                this.onDidFocusSession(focusedSession);
            }
            this.setMode();
            this.replInput.setModel(this.model);
            this.updateInputDecoration();
            this.refreshReplElements(true);
            if (this.styleChangedWhenInvisible) {
                this.styleChangedWhenInvisible = false;
                this.tree?.updateChildren(undefined, true, false);
                this.onDidStyleChange();
            }
        }));
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('debug.console.wordWrap') && this.tree) {
                this.tree.dispose();
                this.treeContainer.innerText = '';
                dom.clearNode(this.treeContainer);
                this.createReplTree();
            }
            if (e.affectsConfiguration('debug.console.acceptSuggestionOnEnter')) {
                const config = this.configurationService.getValue('debug');
                this.replInput.updateOptions({
                    acceptSuggestionOnEnter: config.console.acceptSuggestionOnEnter === 'on' ? 'on' : 'off',
                });
            }
        }));
        this._register(this.editorService.onDidActiveEditorChange(() => {
            this.setMode();
        }));
        this._register(this.filterWidget.onDidChangeFilterText(() => {
            this.filter.filterQuery = this.filterWidget.getFilterText();
            if (this.tree) {
                this.tree.refilter();
                revealLastElement(this.tree);
            }
        }));
    }
    async onDidFocusSession(session) {
        if (session) {
            sessionsToIgnore.delete(session);
            this.completionItemProvider?.dispose();
            if (session.capabilities.supportsCompletionsRequest) {
                this.completionItemProvider = this.languageFeaturesService.completionProvider.register({ scheme: DEBUG_SCHEME, pattern: '**/replinput', hasAccessToAllModels: true }, {
                    _debugDisplayName: 'debugConsole',
                    triggerCharacters: session.capabilities.completionTriggerCharacters || ['.'],
                    provideCompletionItems: async (_, position, _context, token) => {
                        // Disable history navigation because up and down are used to navigate through the suggest widget
                        this.setHistoryNavigationEnablement(false);
                        const model = this.replInput.getModel();
                        if (model) {
                            const text = model.getValue();
                            const focusedStackFrame = this.debugService.getViewModel().focusedStackFrame;
                            const frameId = focusedStackFrame ? focusedStackFrame.frameId : undefined;
                            const response = await session.completions(frameId, focusedStackFrame?.thread.threadId || 0, text, position, token);
                            const suggestions = [];
                            const computeRange = (length) => Range.fromPositions(position.delta(0, -length), position);
                            if (response && response.body && response.body.targets) {
                                response.body.targets.forEach((item) => {
                                    if (item && item.label) {
                                        let insertTextRules = undefined;
                                        let insertText = item.text || item.label;
                                        if (typeof item.selectionStart === 'number') {
                                            // If a debug completion item sets a selection we need to use snippets to make sure the selection is selected #90974
                                            insertTextRules = 4 /* CompletionItemInsertTextRule.InsertAsSnippet */;
                                            const selectionLength = typeof item.selectionLength === 'number' ? item.selectionLength : 0;
                                            const placeholder = selectionLength > 0
                                                ? '${1:' +
                                                    insertText.substring(item.selectionStart, item.selectionStart + selectionLength) +
                                                    '}$0'
                                                : '$0';
                                            insertText =
                                                insertText.substring(0, item.selectionStart) +
                                                    placeholder +
                                                    insertText.substring(item.selectionStart + selectionLength);
                                        }
                                        suggestions.push({
                                            label: item.label,
                                            insertText,
                                            detail: item.detail,
                                            kind: CompletionItemKinds.fromString(item.type || 'property'),
                                            filterText: item.start && item.length
                                                ? text
                                                    .substring(item.start, item.start + item.length)
                                                    .concat(item.label)
                                                : undefined,
                                            range: computeRange(item.length || 0),
                                            sortText: item.sortText,
                                            insertTextRules,
                                        });
                                    }
                                });
                            }
                            if (this.configurationService.getValue('debug').console
                                .historySuggestions) {
                                const history = this.history.getHistory();
                                const idxLength = String(history.length).length;
                                history.forEach((h, i) => suggestions.push({
                                    label: h,
                                    insertText: h,
                                    kind: 18 /* CompletionItemKind.Text */,
                                    range: computeRange(h.length),
                                    sortText: 'ZZZ' + String(history.length - i).padStart(idxLength, '0'),
                                }));
                            }
                            return { suggestions };
                        }
                        return Promise.resolve({ suggestions: [] });
                    },
                });
            }
        }
        await this.selectSession();
    }
    getFilterStats() {
        // This could be called before the tree is created when setting this.filterState.filterText value
        return {
            total: this.tree?.getNode().children.length ?? 0,
            filtered: this.tree?.getNode().children.filter((c) => c.visible).length ?? 0,
        };
    }
    get isReadonly() {
        // Do not allow to edit inactive sessions
        const session = this.tree?.getInput();
        if (session && session.state !== 0 /* State.Inactive */) {
            return false;
        }
        return true;
    }
    showPreviousValue() {
        if (!this.isReadonly) {
            this.navigateHistory(true);
        }
    }
    showNextValue() {
        if (!this.isReadonly) {
            this.navigateHistory(false);
        }
    }
    focusFilter() {
        this.filterWidget.focus();
    }
    openFind() {
        this.tree?.openFind();
    }
    setMode() {
        if (!this.isVisible()) {
            return;
        }
        const activeEditorControl = this.editorService.activeTextEditorControl;
        if (isCodeEditor(activeEditorControl)) {
            this.modelChangeListener.dispose();
            this.modelChangeListener = activeEditorControl.onDidChangeModelLanguage(() => this.setMode());
            if (this.model && activeEditorControl.hasModel()) {
                this.model.setLanguage(activeEditorControl.getModel().getLanguageId());
            }
        }
    }
    onDidStyleChange() {
        if (!this.isVisible()) {
            this.styleChangedWhenInvisible = true;
            return;
        }
        if (this.styleElement) {
            this.replInput.updateOptions({
                fontSize: this.replOptions.replConfiguration.fontSize,
                lineHeight: this.replOptions.replConfiguration.lineHeight,
                fontFamily: this.replOptions.replConfiguration.fontFamily === 'default'
                    ? EDITOR_FONT_DEFAULTS.fontFamily
                    : this.replOptions.replConfiguration.fontFamily,
            });
            const replInputLineHeight = this.replInput.getOption(68 /* EditorOption.lineHeight */);
            // Set the font size, font family, line height and align the twistie to be centered, and input theme color
            this.styleElement.textContent = `
				.repl .repl-input-wrapper .repl-input-chevron {
					line-height: ${replInputLineHeight}px
				}

				.repl .repl-input-wrapper .monaco-editor .lines-content {
					background-color: ${this.replOptions.replConfiguration.backgroundColor};
				}
			`;
            const cssFontFamily = this.replOptions.replConfiguration.fontFamily === 'default'
                ? 'var(--monaco-monospace-font)'
                : this.replOptions.replConfiguration.fontFamily;
            this.container.style.setProperty(`--vscode-repl-font-family`, cssFontFamily);
            this.container.style.setProperty(`--vscode-repl-font-size`, `${this.replOptions.replConfiguration.fontSize}px`);
            this.container.style.setProperty(`--vscode-repl-font-size-for-twistie`, `${this.replOptions.replConfiguration.fontSizeForTwistie}px`);
            this.container.style.setProperty(`--vscode-repl-line-height`, this.replOptions.replConfiguration.cssLineHeight);
            this.tree?.rerender();
            if (this.bodyContentDimension) {
                this.layoutBodyContent(this.bodyContentDimension.height, this.bodyContentDimension.width);
            }
        }
    }
    navigateHistory(previous) {
        const historyInput = (previous ? (this.history.previous() ?? this.history.first()) : this.history.next()) ?? '';
        this.replInput.setValue(historyInput);
        aria.status(historyInput);
        // always leave cursor at the end.
        this.replInput.setPosition({ lineNumber: 1, column: historyInput.length + 1 });
        this.setHistoryNavigationEnablement(true);
    }
    async selectSession(session) {
        const treeInput = this.tree?.getInput();
        if (!session) {
            const focusedSession = this.debugService.getViewModel().focusedSession;
            // If there is a focusedSession focus on that one, otherwise just show any other not ignored session
            if (focusedSession) {
                session = focusedSession;
            }
            else if (!treeInput || sessionsToIgnore.has(treeInput)) {
                session = this.debugService
                    .getModel()
                    .getSessions(true)
                    .find((s) => !sessionsToIgnore.has(s));
            }
        }
        if (session) {
            this.replElementsChangeListener?.dispose();
            this.replElementsChangeListener = session.onDidChangeReplElements(() => {
                this.refreshReplElements(session.getReplElements().length === 0);
            });
            if (this.tree && treeInput !== session) {
                try {
                    await this.tree.setInput(session);
                }
                catch (err) {
                    // Ignore error because this may happen multiple times while refreshing,
                    // then changing the root may fail. Log to help with debugging if needed.
                    this.logService.error(err);
                }
                revealLastElement(this.tree);
            }
        }
        this.replInput?.updateOptions({ readOnly: this.isReadonly });
        this.updateInputDecoration();
    }
    async clearRepl() {
        const session = this.tree?.getInput();
        if (session) {
            session.removeReplExpressions();
            if (session.state === 0 /* State.Inactive */) {
                // Ignore inactive sessions which got cleared - so they are not shown any more
                sessionsToIgnore.add(session);
                await this.selectSession();
                this.multiSessionRepl.set(this.isMultiSessionView);
            }
        }
        this.replInput.focus();
    }
    acceptReplInput() {
        const session = this.tree?.getInput();
        if (session && !this.isReadonly) {
            session.addReplExpression(this.debugService.getViewModel().focusedStackFrame, this.replInput.getValue());
            revealLastElement(this.tree);
            this.history.add(this.replInput.getValue());
            this.replInput.setValue('');
            if (this.bodyContentDimension) {
                // Trigger a layout to shrink a potential multi line input
                this.layoutBodyContent(this.bodyContentDimension.height, this.bodyContentDimension.width);
            }
        }
    }
    sendReplInput(input) {
        const session = this.tree?.getInput();
        if (session && !this.isReadonly) {
            session.addReplExpression(this.debugService.getViewModel().focusedStackFrame, input);
            revealLastElement(this.tree);
            this.history.add(input);
        }
    }
    getVisibleContent() {
        let text = '';
        if (this.model && this.tree) {
            const lineDelimiter = this.textResourcePropertiesService.getEOL(this.model.uri);
            const traverseAndAppend = (node) => {
                node.children.forEach((child) => {
                    if (child.visible) {
                        text += child.element.toString().trimRight() + lineDelimiter;
                        if (!child.collapsed && child.children.length) {
                            traverseAndAppend(child);
                        }
                    }
                });
            };
            traverseAndAppend(this.tree.getNode());
        }
        return removeAnsiEscapeCodes(text);
    }
    layoutBodyContent(height, width) {
        this.bodyContentDimension = new dom.Dimension(width, height);
        const replInputHeight = Math.min(this.replInput.getContentHeight(), height);
        if (this.tree) {
            const lastElementVisible = this.tree.scrollTop + this.tree.renderHeight >= this.tree.scrollHeight;
            const treeHeight = height - replInputHeight;
            this.tree.getHTMLElement().style.height = `${treeHeight}px`;
            this.tree.layout(treeHeight, width);
            if (lastElementVisible) {
                revealLastElement(this.tree);
            }
        }
        this.replInputContainer.style.height = `${replInputHeight}px`;
        this.replInput.layout({ width: width - 30, height: replInputHeight });
    }
    collapseAll() {
        this.tree?.collapseAll();
    }
    getDebugSession() {
        return this.tree?.getInput();
    }
    getReplInput() {
        return this.replInput;
    }
    getReplDataSource() {
        return this.replDataSource;
    }
    getFocusedElement() {
        return this.tree?.getFocus()?.[0];
    }
    focusTree() {
        this.tree?.domFocus();
    }
    async focus() {
        super.focus();
        await timeout(0); // wait a task for the repl to get attached to the DOM, #83387
        this.replInput.focus();
    }
    createActionViewItem(action) {
        if (action.id === selectReplCommandId) {
            const session = (this.tree ? this.tree.getInput() : undefined) ??
                this.debugService.getViewModel().focusedSession;
            return this.instantiationService.createInstance(SelectReplActionViewItem, action, session);
        }
        return super.createActionViewItem(action);
    }
    get isMultiSessionView() {
        return (this.debugService
            .getModel()
            .getSessions(true)
            .filter((s) => s.hasSeparateRepl() && !sessionsToIgnore.has(s)).length > 1);
    }
    // --- Cached locals
    get refreshScheduler() {
        const autoExpanded = new Set();
        return new RunOnceScheduler(async () => {
            if (!this.tree || !this.tree.getInput() || !this.isVisible()) {
                return;
            }
            await this.tree.updateChildren(undefined, true, false, {
                diffIdentityProvider: identityProvider,
            });
            const session = this.tree.getInput();
            if (session) {
                // Automatically expand repl group elements when specified
                const autoExpandElements = async (elements) => {
                    for (const element of elements) {
                        if (element instanceof ReplGroup) {
                            if (element.autoExpand && !autoExpanded.has(element.getId())) {
                                autoExpanded.add(element.getId());
                                await this.tree.expand(element);
                            }
                            if (!this.tree.isCollapsed(element)) {
                                // Repl groups can have children which are repl groups thus we might need to expand those as well
                                await autoExpandElements(element.getChildren());
                            }
                        }
                    }
                };
                await autoExpandElements(session.getReplElements());
            }
            // Repl elements count changed, need to update filter stats on the badge
            const { total, filtered } = this.getFilterStats();
            this.filterWidget.updateBadge(total === filtered || total === 0
                ? undefined
                : localize('showing filtered repl lines', 'Showing {0} of {1}', filtered, total));
        }, Repl_1.REFRESH_DELAY);
    }
    // --- Creation
    render() {
        super.render();
        this._register(registerNavigableContainer({
            name: 'repl',
            focusNotifiers: [this, this.filterWidget],
            focusNextWidget: () => {
                const element = this.tree?.getHTMLElement();
                if (this.filterWidget.hasFocus()) {
                    this.tree?.domFocus();
                }
                else if (element && dom.isActiveElement(element)) {
                    this.focus();
                }
            },
            focusPreviousWidget: () => {
                const element = this.tree?.getHTMLElement();
                if (this.replInput.hasTextFocus()) {
                    this.tree?.domFocus();
                }
                else if (element && dom.isActiveElement(element)) {
                    this.focusFilter();
                }
            },
        }));
    }
    renderBody(parent) {
        super.renderBody(parent);
        this.container = dom.append(parent, $('.repl'));
        this.treeContainer = dom.append(this.container, $(`.repl-tree.${MOUSE_CURSOR_TEXT_CSS_CLASS_NAME}`));
        this.createReplInput(this.container);
        this.createReplTree();
    }
    createReplTree() {
        this.replDelegate = new ReplDelegate(this.configurationService, this.replOptions);
        const wordWrap = this.configurationService.getValue('debug').console.wordWrap;
        this.treeContainer.classList.toggle('word-wrap', wordWrap);
        const expressionRenderer = this.instantiationService.createInstance(DebugExpressionRenderer);
        this.replDataSource = new ReplDataSource();
        const tree = (this.tree = this.instantiationService.createInstance((WorkbenchAsyncDataTree), 'DebugRepl', this.treeContainer, this.replDelegate, [
            this.instantiationService.createInstance(ReplVariablesRenderer, expressionRenderer),
            this.instantiationService.createInstance(ReplOutputElementRenderer, expressionRenderer),
            new ReplEvaluationInputsRenderer(),
            this.instantiationService.createInstance(ReplGroupRenderer, expressionRenderer),
            new ReplEvaluationResultsRenderer(expressionRenderer),
            new ReplRawObjectsRenderer(expressionRenderer),
        ], this.replDataSource, {
            filter: this.filter,
            accessibilityProvider: new ReplAccessibilityProvider(),
            identityProvider,
            userSelection: true,
            mouseSupport: false,
            findWidgetEnabled: true,
            keyboardNavigationLabelProvider: {
                getKeyboardNavigationLabel: (e) => e.toString(true),
            },
            horizontalScrolling: !wordWrap,
            setRowLineHeight: false,
            supportDynamicHeights: wordWrap,
            overrideStyles: this.getLocationBasedColors().listOverrideStyles,
        }));
        this._register(tree.onDidChangeContentHeight(() => {
            if (tree.scrollHeight !== this.previousTreeScrollHeight) {
                // Due to rounding, the scrollTop + renderHeight will not exactly match the scrollHeight.
                // Consider the tree to be scrolled all the way down if it is within 2px of the bottom.
                const lastElementWasVisible = tree.scrollTop + tree.renderHeight >= this.previousTreeScrollHeight - 2;
                if (lastElementWasVisible) {
                    setTimeout(() => {
                        // Can't set scrollTop during this event listener, the list might overwrite the change
                        revealLastElement(tree);
                    }, 0);
                }
            }
            this.previousTreeScrollHeight = tree.scrollHeight;
        }));
        this._register(tree.onContextMenu((e) => this.onContextMenu(e)));
        this._register(tree.onDidChangeFindOpenState((open) => (this.findIsOpen = open)));
        let lastSelectedString;
        this._register(tree.onMouseClick(() => {
            if (this.findIsOpen) {
                return;
            }
            const selection = dom.getWindow(this.treeContainer).getSelection();
            if (!selection ||
                selection.type !== 'Range' ||
                lastSelectedString === selection.toString()) {
                // only focus the input if the user is not currently selecting and find isn't open.
                this.replInput.focus();
            }
            lastSelectedString = selection ? selection.toString() : '';
        }));
        // Make sure to select the session if debugging is already active
        this.selectSession();
        this.styleElement = domStylesheetsJs.createStyleSheet(this.container);
        this.onDidStyleChange();
    }
    createReplInput(container) {
        this.replInputContainer = dom.append(container, $('.repl-input-wrapper'));
        dom.append(this.replInputContainer, $('.repl-input-chevron' + ThemeIcon.asCSSSelector(debugConsoleEvaluationPrompt)));
        const { historyNavigationBackwardsEnablement, historyNavigationForwardsEnablement } = this._register(registerAndCreateHistoryNavigationContext(this.scopedContextKeyService, this));
        this.setHistoryNavigationEnablement = (enabled) => {
            historyNavigationBackwardsEnablement.set(enabled);
            historyNavigationForwardsEnablement.set(enabled);
        };
        CONTEXT_IN_DEBUG_REPL.bindTo(this.scopedContextKeyService).set(true);
        this.scopedInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, this.scopedContextKeyService])));
        const options = getSimpleEditorOptions(this.configurationService);
        options.readOnly = true;
        options.suggest = { showStatusBar: true };
        const config = this.configurationService.getValue('debug');
        options.acceptSuggestionOnEnter = config.console.acceptSuggestionOnEnter === 'on' ? 'on' : 'off';
        options.ariaLabel = this.getAriaLabel();
        this.replInput = this.scopedInstantiationService.createInstance(CodeEditorWidget, this.replInputContainer, options, getSimpleCodeEditorWidgetOptions());
        let lastContentHeight = -1;
        this._register(this.replInput.onDidChangeModelContent(() => {
            const model = this.replInput.getModel();
            this.setHistoryNavigationEnablement(!!model && model.getValue() === '');
            const contentHeight = this.replInput.getContentHeight();
            if (contentHeight !== lastContentHeight) {
                lastContentHeight = contentHeight;
                if (this.bodyContentDimension) {
                    this.layoutBodyContent(this.bodyContentDimension.height, this.bodyContentDimension.width);
                }
            }
        }));
        // We add the input decoration only when the focus is in the input #61126
        this._register(this.replInput.onDidFocusEditorText(() => this.updateInputDecoration()));
        this._register(this.replInput.onDidBlurEditorText(() => this.updateInputDecoration()));
        this._register(dom.addStandardDisposableListener(this.replInputContainer, dom.EventType.FOCUS, () => this.replInputContainer.classList.add('synthetic-focus')));
        this._register(dom.addStandardDisposableListener(this.replInputContainer, dom.EventType.BLUR, () => this.replInputContainer.classList.remove('synthetic-focus')));
    }
    getAriaLabel() {
        let ariaLabel = localize('debugConsole', 'Debug Console');
        if (!this.configurationService.getValue("accessibility.verbosity.debug" /* AccessibilityVerbositySettingId.Debug */)) {
            return ariaLabel;
        }
        const keybinding = this.keybindingService
            .lookupKeybinding("editor.action.accessibilityHelp" /* AccessibilityCommandId.OpenAccessibilityHelp */)
            ?.getAriaLabel();
        if (keybinding) {
            ariaLabel = localize('commentLabelWithKeybinding', '{0}, use ({1}) for accessibility help', ariaLabel, keybinding);
        }
        else {
            ariaLabel = localize('commentLabelWithKeybindingNoKeybinding', '{0}, run the command Open Accessibility Help which is currently not triggerable via keybinding.', ariaLabel);
        }
        return ariaLabel;
    }
    onContextMenu(e) {
        const actions = getFlatContextMenuActions(this.menu.getActions({ arg: e.element, shouldForwardArgs: false }));
        this.contextMenuService.showContextMenu({
            getAnchor: () => e.anchor,
            getActions: () => actions,
            getActionsContext: () => e.element,
        });
    }
    // --- Update
    refreshReplElements(noDelay) {
        if (this.tree && this.isVisible()) {
            if (this.refreshScheduler.isScheduled()) {
                return;
            }
            this.refreshScheduler.schedule(noDelay ? 0 : undefined);
        }
    }
    updateInputDecoration() {
        if (!this.replInput) {
            return;
        }
        const decorations = [];
        if (this.isReadonly && this.replInput.hasTextFocus() && !this.replInput.getValue()) {
            const transparentForeground = resolveColorValue(editorForeground, this.themeService.getColorTheme())?.transparent(0.4);
            decorations.push({
                range: {
                    startLineNumber: 0,
                    endLineNumber: 0,
                    startColumn: 0,
                    endColumn: 1,
                },
                renderOptions: {
                    after: {
                        contentText: localize('startDebugFirst', 'Please start a debug session to evaluate expressions'),
                        color: transparentForeground ? transparentForeground.toString() : undefined,
                    },
                },
            });
        }
        this.replInput.setDecorationsByType('repl-decoration', DECORATION_KEY, decorations);
    }
    saveState() {
        const replHistory = this.history.getHistory();
        if (replHistory.length) {
            this.storageService.store(HISTORY_STORAGE_KEY, JSON.stringify(replHistory), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(HISTORY_STORAGE_KEY, 1 /* StorageScope.WORKSPACE */);
        }
        const filterHistory = this.filterWidget.getHistory();
        if (filterHistory.length) {
            this.storageService.store(FILTER_HISTORY_STORAGE_KEY, JSON.stringify(filterHistory), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(FILTER_HISTORY_STORAGE_KEY, 1 /* StorageScope.WORKSPACE */);
        }
        const filterValue = this.filterWidget.getFilterText();
        if (filterValue) {
            this.storageService.store(FILTER_VALUE_STORAGE_KEY, filterValue, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(FILTER_VALUE_STORAGE_KEY, 1 /* StorageScope.WORKSPACE */);
        }
        super.saveState();
    }
    dispose() {
        this.replInput?.dispose(); // Disposed before rendered? #174558
        this.replElementsChangeListener?.dispose();
        this.refreshScheduler.dispose();
        this.modelChangeListener.dispose();
        super.dispose();
    }
};
__decorate([
    memoize
], Repl.prototype, "refreshScheduler", null);
Repl = Repl_1 = __decorate([
    __param(1, IDebugService),
    __param(2, IInstantiationService),
    __param(3, IStorageService),
    __param(4, IThemeService),
    __param(5, IModelService),
    __param(6, IContextKeyService),
    __param(7, ICodeEditorService),
    __param(8, IViewDescriptorService),
    __param(9, IContextMenuService),
    __param(10, IConfigurationService),
    __param(11, ITextResourcePropertiesService),
    __param(12, IEditorService),
    __param(13, IKeybindingService),
    __param(14, IOpenerService),
    __param(15, IHoverService),
    __param(16, IMenuService),
    __param(17, ILanguageFeaturesService),
    __param(18, ILogService)
], Repl);
export { Repl };
let ReplOptions = class ReplOptions extends Disposable {
    static { ReplOptions_1 = this; }
    static { this.lineHeightEm = 1.4; }
    get replConfiguration() {
        return this._replConfig;
    }
    constructor(viewId, backgroundColorDelegate, configurationService, themeService, viewDescriptorService) {
        super();
        this.backgroundColorDelegate = backgroundColorDelegate;
        this.configurationService = configurationService;
        this.themeService = themeService;
        this.viewDescriptorService = viewDescriptorService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._register(this.themeService.onDidColorThemeChange((e) => this.update()));
        this._register(this.viewDescriptorService.onDidChangeLocation((e) => {
            if (e.views.some((v) => v.id === viewId)) {
                this.update();
            }
        }));
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('debug.console.lineHeight') ||
                e.affectsConfiguration('debug.console.fontSize') ||
                e.affectsConfiguration('debug.console.fontFamily')) {
                this.update();
            }
        }));
        this.update();
    }
    update() {
        const debugConsole = this.configurationService.getValue('debug').console;
        this._replConfig = {
            fontSize: debugConsole.fontSize,
            fontFamily: debugConsole.fontFamily,
            lineHeight: debugConsole.lineHeight
                ? debugConsole.lineHeight
                : ReplOptions_1.lineHeightEm * debugConsole.fontSize,
            cssLineHeight: debugConsole.lineHeight
                ? `${debugConsole.lineHeight}px`
                : `${ReplOptions_1.lineHeightEm}em`,
            backgroundColor: this.themeService.getColorTheme().getColor(this.backgroundColorDelegate()),
            fontSizeForTwistie: (debugConsole.fontSize * ReplOptions_1.lineHeightEm) / 2 - 8,
        };
        this._onDidChange.fire();
    }
};
ReplOptions = ReplOptions_1 = __decorate([
    __param(2, IConfigurationService),
    __param(3, IThemeService),
    __param(4, IViewDescriptorService)
], ReplOptions);
// Repl actions and commands
class AcceptReplInputAction extends EditorAction {
    constructor() {
        super({
            id: 'repl.action.acceptInput',
            label: localize2({
                key: 'actions.repl.acceptInput',
                comment: ['Apply input from the debug console input box'],
            }, 'Debug Console: Accept Input'),
            precondition: CONTEXT_IN_DEBUG_REPL,
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 3 /* KeyCode.Enter */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    run(accessor, editor) {
        SuggestController.get(editor)?.cancelSuggestWidget();
        const repl = getReplView(accessor.get(IViewsService));
        repl?.acceptReplInput();
    }
}
class FilterReplAction extends ViewAction {
    constructor() {
        super({
            viewId: REPL_VIEW_ID,
            id: 'repl.action.filter',
            title: localize('repl.action.filter', 'Debug Console: Focus Filter'),
            precondition: CONTEXT_IN_DEBUG_REPL,
            keybinding: [
                {
                    when: EditorContextKeys.textInputFocus,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 36 /* KeyCode.KeyF */,
                    weight: 100 /* KeybindingWeight.EditorContrib */,
                },
            ],
        });
    }
    runInView(accessor, repl) {
        repl.focusFilter();
    }
}
class FindReplAction extends ViewAction {
    constructor() {
        super({
            viewId: REPL_VIEW_ID,
            id: 'repl.action.find',
            title: localize('repl.action.find', 'Debug Console: Focus Find'),
            precondition: CONTEXT_IN_DEBUG_REPL,
            keybinding: [
                {
                    when: ContextKeyExpr.or(CONTEXT_IN_DEBUG_REPL, ContextKeyExpr.equals('focusedView', 'workbench.panel.repl.view')),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 36 /* KeyCode.KeyF */,
                    weight: 100 /* KeybindingWeight.EditorContrib */,
                },
            ],
            icon: Codicon.search,
            menu: [
                {
                    id: MenuId.ViewTitle,
                    group: 'navigation',
                    when: ContextKeyExpr.equals('view', REPL_VIEW_ID),
                    order: 15,
                },
                {
                    id: MenuId.DebugConsoleContext,
                    group: 'z_commands',
                    order: 25,
                },
            ],
        });
    }
    runInView(accessor, view) {
        view.openFind();
    }
}
class ReplCopyAllAction extends EditorAction {
    constructor() {
        super({
            id: 'repl.action.copyAll',
            label: localize('actions.repl.copyAll', 'Debug: Console Copy All'),
            alias: 'Debug Console Copy All',
            precondition: CONTEXT_IN_DEBUG_REPL,
        });
    }
    run(accessor, editor) {
        const clipboardService = accessor.get(IClipboardService);
        const repl = getReplView(accessor.get(IViewsService));
        if (repl) {
            return clipboardService.writeText(repl.getVisibleContent());
        }
    }
}
registerEditorAction(AcceptReplInputAction);
registerEditorAction(ReplCopyAllAction);
registerAction2(FilterReplAction);
registerAction2(FindReplAction);
class SelectReplActionViewItem extends FocusSessionActionViewItem {
    getSessions() {
        return this.debugService
            .getModel()
            .getSessions(true)
            .filter((s) => s.hasSeparateRepl() && !sessionsToIgnore.has(s));
    }
    mapFocusedSessionToSelected(focusedSession) {
        while (focusedSession.parentSession && !focusedSession.hasSeparateRepl()) {
            focusedSession = focusedSession.parentSession;
        }
        return focusedSession;
    }
}
export function getReplView(viewsService) {
    return viewsService.getActiveViewWithId(REPL_VIEW_ID) ?? undefined;
}
const selectReplCommandId = 'workbench.action.debug.selectRepl';
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: selectReplCommandId,
            viewId: REPL_VIEW_ID,
            title: localize('selectRepl', 'Select Debug Console'),
            f1: false,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', REPL_VIEW_ID), CONTEXT_MULTI_SESSION_REPL),
                order: 20,
            },
        });
    }
    async runInView(accessor, view, session) {
        const debugService = accessor.get(IDebugService);
        // If session is already the focused session we need to manualy update the tree since view model will not send a focused change event
        if (session &&
            session.state !== 0 /* State.Inactive */ &&
            session !== debugService.getViewModel().focusedSession) {
            if (session.state !== 2 /* State.Stopped */) {
                // Focus child session instead if it is stopped #112595
                const stopppedChildSession = debugService
                    .getModel()
                    .getSessions()
                    .find((s) => s.parentSession === session && s.state === 2 /* State.Stopped */);
                if (stopppedChildSession) {
                    session = stopppedChildSession;
                }
            }
            await debugService.focusStackFrame(undefined, undefined, session, { explicit: true });
        }
        // Need to select the session in the view since the focussed session might not have changed
        await view.selectSession(session);
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: 'workbench.debug.panel.action.clearReplAction',
            viewId: REPL_VIEW_ID,
            title: localize2('clearRepl', 'Clear Console'),
            metadata: {
                description: localize2('clearRepl.descriotion', 'Clears all program output from your debug REPL'),
            },
            f1: true,
            icon: debugConsoleClearAll,
            menu: [
                {
                    id: MenuId.ViewTitle,
                    group: 'navigation',
                    when: ContextKeyExpr.equals('view', REPL_VIEW_ID),
                    order: 30,
                },
                {
                    id: MenuId.DebugConsoleContext,
                    group: 'z_commands',
                    order: 20,
                },
            ],
            keybinding: [
                {
                    primary: 0,
                    mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */ },
                    // Weight is higher than work workbench contributions so the keybinding remains
                    // highest priority when chords are registered afterwards
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                    when: ContextKeyExpr.equals('focusedView', 'workbench.panel.repl.view'),
                },
            ],
        });
    }
    runInView(_accessor, view) {
        const accessibilitySignalService = _accessor.get(IAccessibilitySignalService);
        view.clearRepl();
        accessibilitySignalService.playSignal(AccessibilitySignal.clear);
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: 'debug.collapseRepl',
            title: localize('collapse', 'Collapse All'),
            viewId: REPL_VIEW_ID,
            menu: {
                id: MenuId.DebugConsoleContext,
                group: 'z_commands',
                order: 10,
            },
        });
    }
    runInView(_accessor, view) {
        view.collapseAll();
        view.focus();
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: 'debug.replPaste',
            title: localize('paste', 'Paste'),
            viewId: REPL_VIEW_ID,
            precondition: CONTEXT_DEBUG_STATE.notEqualsTo(getStateLabel(0 /* State.Inactive */)),
            menu: {
                id: MenuId.DebugConsoleContext,
                group: '2_cutcopypaste',
                order: 30,
            },
        });
    }
    async runInView(accessor, view) {
        const clipboardService = accessor.get(IClipboardService);
        const clipboardText = await clipboardService.readText();
        if (clipboardText) {
            const replInput = view.getReplInput();
            replInput.setValue(replInput.getValue().concat(clipboardText));
            view.focus();
            const model = replInput.getModel();
            const lineNumber = model ? model.getLineCount() : 0;
            const column = model?.getLineMaxColumn(lineNumber);
            if (typeof lineNumber === 'number' && typeof column === 'number') {
                replInput.setPosition({ lineNumber, column });
            }
        }
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: 'workbench.debug.action.copyAll',
            title: localize('copyAll', 'Copy All'),
            viewId: REPL_VIEW_ID,
            menu: {
                id: MenuId.DebugConsoleContext,
                group: '2_cutcopypaste',
                order: 20,
            },
        });
    }
    async runInView(accessor, view) {
        const clipboardService = accessor.get(IClipboardService);
        await clipboardService.writeText(view.getVisibleContent());
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'debug.replCopy',
            title: localize('copy', 'Copy'),
            menu: {
                id: MenuId.DebugConsoleContext,
                group: '2_cutcopypaste',
                order: 10,
            },
        });
    }
    async run(accessor, element) {
        const clipboardService = accessor.get(IClipboardService);
        const debugService = accessor.get(IDebugService);
        const nativeSelection = dom.getActiveWindow().getSelection();
        const selectedText = nativeSelection?.toString();
        if (selectedText && selectedText.length > 0) {
            return clipboardService.writeText(selectedText);
        }
        else if (element) {
            return clipboardService.writeText((await this.tryEvaluateAndCopy(debugService, element)) || element.toString());
        }
    }
    async tryEvaluateAndCopy(debugService, element) {
        // todo: we should expand DAP to allow copying more types here (#187784)
        if (!(element instanceof ReplEvaluationResult)) {
            return;
        }
        const stackFrame = debugService.getViewModel().focusedStackFrame;
        const session = debugService.getViewModel().focusedSession;
        if (!stackFrame || !session || !session.capabilities.supportsClipboardContext) {
            return;
        }
        try {
            const evaluation = await session.evaluate(element.originalExpression, stackFrame.frameId, 'clipboard');
            return evaluation?.body.result;
        }
        catch (e) {
            return;
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: FOCUS_REPL_ID,
            category: DEBUG_COMMAND_CATEGORY,
            title: localize2({ comment: ['Debug is a noun in this context, not a verb.'], key: 'debugFocusConsole' }, 'Focus on Debug Console View'),
        });
    }
    async run(accessor) {
        const viewsService = accessor.get(IViewsService);
        const repl = await viewsService.openView(REPL_VIEW_ID);
        await repl?.focus();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvcmVwbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEtBQUssZ0JBQWdCLE1BQU0sNENBQTRDLENBQUE7QUFHOUUsT0FBTyxLQUFLLElBQUksTUFBTSwwQ0FBMEMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQU96RyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFNUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFMUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFckUsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsR0FBRyxJQUFJLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzNELE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUN2RixPQUFPLEVBQUUsWUFBWSxFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDN0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDbkcsT0FBTyxFQUNOLG9CQUFvQixHQUVwQixNQUFNLG1EQUFtRCxDQUFBO0FBRTFELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUUvRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNsRixPQUFPLEVBS04sbUJBQW1CLEdBRW5CLE1BQU0sd0NBQXdDLENBQUE7QUFFL0MsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDakcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQ2hILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQ25HLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDeEQsT0FBTyxFQUNOLG1CQUFtQixFQUNuQiwyQkFBMkIsR0FDM0IsTUFBTSxnRkFBZ0YsQ0FBQTtBQUN2RixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUMzRyxPQUFPLEVBQ04sT0FBTyxFQUVQLFlBQVksRUFDWixNQUFNLEVBQ04sZUFBZSxHQUNmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDN0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUNOLGNBQWMsRUFFZCxrQkFBa0IsR0FDbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUseUNBQXlDLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQTtBQUM5SCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBRXpGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDN0UsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIsaUJBQWlCLEdBQ2pCLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ2pHLE9BQU8sRUFDTixjQUFjLEVBRWQsVUFBVSxHQUNWLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDakUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUc5RSxPQUFPLEVBQ04sZ0NBQWdDLEVBQ2hDLHNCQUFzQixHQUN0QixNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFDTixtQkFBbUIsRUFDbkIscUJBQXFCLEVBQ3JCLDBCQUEwQixFQUMxQixZQUFZLEVBRVosYUFBYSxFQUtiLFlBQVksRUFFWixhQUFhLEdBQ2IsTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDbEQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLFNBQVMsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ3hFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3RFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxhQUFhLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUNwRixPQUFPLGtCQUFrQixDQUFBO0FBQ3pCLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUM1QyxPQUFPLEVBQ04seUJBQXlCLEVBQ3pCLGNBQWMsRUFDZCxZQUFZLEVBQ1osNEJBQTRCLEVBQzVCLDZCQUE2QixFQUM3QixpQkFBaUIsRUFDakIseUJBQXlCLEVBQ3pCLHNCQUFzQixFQUN0QixxQkFBcUIsR0FDckIsTUFBTSxpQkFBaUIsQ0FBQTtBQUV4QixNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFBO0FBRWYsTUFBTSxtQkFBbUIsR0FBRyxvQkFBb0IsQ0FBQTtBQUNoRCxNQUFNLDBCQUEwQixHQUFHLDBCQUEwQixDQUFBO0FBQzdELE1BQU0sd0JBQXdCLEdBQUcsd0JBQXdCLENBQUE7QUFDekQsTUFBTSxjQUFjLEdBQUcscUJBQXFCLENBQUE7QUFFNUMsU0FBUyxpQkFBaUIsQ0FBQyxJQUEyQztJQUNyRSxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQTtJQUN0RCx3QkFBd0I7QUFDekIsQ0FBQztBQUVELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxHQUFHLEVBQWlCLENBQUE7QUFDakQsTUFBTSxnQkFBZ0IsR0FBRyxFQUFFLEtBQUssRUFBRSxDQUFDLE9BQXFCLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFBO0FBRXZFLElBQU0sSUFBSSxHQUFWLE1BQU0sSUFBSyxTQUFRLGNBQWM7O2FBR2Ysa0JBQWEsR0FBRyxFQUFFLEFBQUwsQ0FBSyxHQUFDLDJEQUEyRDthQUM5RSxRQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLFlBQVksWUFBWSxDQUFDLEFBQXpDLENBQXlDO0lBMEJwRSxZQUNDLE9BQXlCLEVBQ1YsWUFBNEMsRUFDcEMsb0JBQTJDLEVBQ2pELGNBQWdELEVBQ2xELFlBQTJCLEVBQzNCLFlBQTRDLEVBQ3ZDLGlCQUFxQyxFQUNyQyxpQkFBcUMsRUFDakMscUJBQTZDLEVBQ2hELGtCQUF1QyxFQUNyQyxvQkFBdUUsRUFFOUYsNkJBQThFLEVBQzlELGFBQThDLEVBQzFDLGlCQUFpRSxFQUNyRSxhQUE2QixFQUM5QixZQUEyQixFQUM1QixXQUF5QixFQUNiLHVCQUFrRSxFQUMvRSxVQUF3QztRQUVyRCxNQUFNLFVBQVUsR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLHdCQUF3QixrQ0FBMEIsRUFBRSxDQUFDLENBQUE7UUFDM0YsS0FBSyxDQUNKO1lBQ0MsR0FBRyxPQUFPO1lBQ1YsYUFBYSxFQUFFO2dCQUNkLFdBQVcsRUFBRSxRQUFRLENBQ3BCO29CQUNDLEdBQUcsRUFBRSxvQ0FBb0M7b0JBQ3pDLE9BQU8sRUFBRSxDQUFDLG9EQUFvRCxDQUFDO2lCQUMvRCxFQUNELHdDQUF3QyxDQUN4QztnQkFDRCxJQUFJLEVBQUUsVUFBVTtnQkFDaEIsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQ2xCLGNBQWMsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLGtDQUEwQixJQUFJLENBQUMsQ0FDaEU7YUFDYjtTQUNELEVBQ0QsaUJBQWlCLEVBQ2pCLGtCQUFrQixFQUNsQixvQkFBb0IsRUFDcEIsaUJBQWlCLEVBQ2pCLHFCQUFxQixFQUNyQixvQkFBb0IsRUFDcEIsYUFBYSxFQUNiLFlBQVksRUFDWixZQUFZLENBQ1osQ0FBQTtRQS9DK0IsaUJBQVksR0FBWixZQUFZLENBQWU7UUFFekIsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBRWpDLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBS1IseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUU3RSxrQ0FBNkIsR0FBN0IsNkJBQTZCLENBQWdDO1FBQzdDLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUNkLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFJMUMsNEJBQXVCLEdBQXZCLHVCQUF1QixDQUEwQjtRQUM5RCxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBekM5Qyw2QkFBd0IsR0FBVyxDQUFDLENBQUE7UUFZcEMsOEJBQXlCLEdBQVksS0FBSyxDQUFBO1FBRTFDLHdCQUFtQixHQUFnQixVQUFVLENBQUMsSUFBSSxDQUFBO1FBS2xELGVBQVUsR0FBWSxLQUFLLENBQUE7UUFxRGxDLElBQUksQ0FBQyxJQUFJLEdBQUcsV0FBVyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtRQUNqRixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN6QixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQzVCLElBQUksZ0JBQWdCLENBQ25CLElBQUksR0FBRyxDQUNOLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLGtDQUEwQixJQUFJLENBQUMsQ0FBQyxDQUN0RixFQUNELEdBQUcsQ0FDSCxDQUNELENBQUE7UUFDRCxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksVUFBVSxFQUFFLENBQUE7UUFDOUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFBO1FBQ3BDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRywwQkFBMEIsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUM1RSxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQ2hDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQ3ZDLFdBQVcsRUFDWCxJQUFJLENBQUMsRUFBRSxFQUNQLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLFVBQVUsQ0FDOUMsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFM0UsaUJBQWlCLENBQUMsc0JBQXNCLENBQUMsaUJBQWlCLEVBQUUsY0FBYyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQy9FLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDbEQsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7SUFDekIsQ0FBQztJQUVPLGlCQUFpQjtRQUN4QixJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDckQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDeEUsQ0FBQztRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQzlELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNoQyxDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDLDJCQUEyQixDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUN4RSxJQUFJLENBQUMsWUFBWSxRQUFRLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDcEQsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO2dCQUM5QyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzFCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsWUFBWSxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxVQUFVLEVBQUUsRUFBRTtZQUN2RCxtRkFBbUY7WUFDbkYsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsQ0FBQTtZQUNuQyxJQUFJLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQyxLQUFLLDJCQUFtQixFQUFFLENBQUM7Z0JBQzlDLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUNyQyxDQUFDO1lBQ0QsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUNuRCxDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxLQUFLLElBQUksRUFBRTtZQUM1Qyw2REFBNkQ7WUFDN0QsTUFBTSxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUEsQ0FBQyxvRUFBb0U7WUFDNUYsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUNuRCxDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsWUFBWSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsRUFBRTtZQUM1QyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDL0IsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQztnQkFDdEIsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUE7WUFDN0IsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQzFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDZCxPQUFNO1lBQ1AsQ0FBQztZQUNELElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ2pCLElBQUksQ0FBQyxLQUFLO29CQUNULElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLE1BQUksQ0FBQyxHQUFHLENBQUM7d0JBQ3BDLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUN6RCxDQUFDO1lBRUQsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxjQUFjLENBQUE7WUFDdEUsSUFBSSxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEtBQUssY0FBYyxFQUFFLENBQUM7Z0JBQzFELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsQ0FBQTtZQUN2QyxDQUFDO1lBRUQsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ2QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ25DLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFBO1lBQzVCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUU5QixJQUFJLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO2dCQUNwQyxJQUFJLENBQUMseUJBQXlCLEdBQUcsS0FBSyxDQUFBO2dCQUN0QyxJQUFJLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO2dCQUNqRCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtZQUN4QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLG9CQUFvQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDeEQsSUFBSSxDQUFDLENBQUMsb0JBQW9CLENBQUMsd0JBQXdCLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ25FLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUE7Z0JBQ25CLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQTtnQkFDakMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUE7Z0JBQ2pDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQTtZQUN0QixDQUFDO1lBQ0QsSUFBSSxDQUFDLENBQUMsb0JBQW9CLENBQUMsdUNBQXVDLENBQUMsRUFBRSxDQUFDO2dCQUNyRSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFzQixPQUFPLENBQUMsQ0FBQTtnQkFDL0UsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUM7b0JBQzVCLHVCQUF1QixFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsdUJBQXVCLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUs7aUJBQ3ZGLENBQUMsQ0FBQTtZQUNILENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsYUFBYSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsRUFBRTtZQUMvQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDZixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsWUFBWSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsRUFBRTtZQUM1QyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLGFBQWEsRUFBRSxDQUFBO1lBQzNELElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNmLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7Z0JBQ3BCLGlCQUFpQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUM3QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsaUJBQWlCLENBQUMsT0FBa0M7UUFDakUsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUNoQyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsT0FBTyxFQUFFLENBQUE7WUFDdEMsSUFBSSxPQUFPLENBQUMsWUFBWSxDQUFDLDBCQUEwQixFQUFFLENBQUM7Z0JBQ3JELElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUNyRixFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxvQkFBb0IsRUFBRSxJQUFJLEVBQUUsRUFDN0U7b0JBQ0MsaUJBQWlCLEVBQUUsY0FBYztvQkFDakMsaUJBQWlCLEVBQUUsT0FBTyxDQUFDLFlBQVksQ0FBQywyQkFBMkIsSUFBSSxDQUFDLEdBQUcsQ0FBQztvQkFDNUUsc0JBQXNCLEVBQUUsS0FBSyxFQUM1QixDQUFhLEVBQ2IsUUFBa0IsRUFDbEIsUUFBMkIsRUFDM0IsS0FBd0IsRUFDRSxFQUFFO3dCQUM1QixpR0FBaUc7d0JBQ2pHLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxLQUFLLENBQUMsQ0FBQTt3QkFFMUMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQTt3QkFDdkMsSUFBSSxLQUFLLEVBQUUsQ0FBQzs0QkFDWCxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUE7NEJBQzdCLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQTs0QkFDNUUsTUFBTSxPQUFPLEdBQUcsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBOzRCQUN6RSxNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxXQUFXLENBQ3pDLE9BQU8sRUFDUCxpQkFBaUIsRUFBRSxNQUFNLENBQUMsUUFBUSxJQUFJLENBQUMsRUFDdkMsSUFBSSxFQUNKLFFBQVEsRUFDUixLQUFLLENBQ0wsQ0FBQTs0QkFFRCxNQUFNLFdBQVcsR0FBcUIsRUFBRSxDQUFBOzRCQUN4QyxNQUFNLFlBQVksR0FBRyxDQUFDLE1BQWMsRUFBRSxFQUFFLENBQ3ZDLEtBQUssQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQTs0QkFDMUQsSUFBSSxRQUFRLElBQUksUUFBUSxDQUFDLElBQUksSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dDQUN4RCxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtvQ0FDdEMsSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO3dDQUN4QixJQUFJLGVBQWUsR0FBNkMsU0FBUyxDQUFBO3dDQUN6RSxJQUFJLFVBQVUsR0FBRyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUE7d0NBQ3hDLElBQUksT0FBTyxJQUFJLENBQUMsY0FBYyxLQUFLLFFBQVEsRUFBRSxDQUFDOzRDQUM3QyxvSEFBb0g7NENBQ3BILGVBQWUsdURBQStDLENBQUE7NENBQzlELE1BQU0sZUFBZSxHQUNwQixPQUFPLElBQUksQ0FBQyxlQUFlLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7NENBQ3BFLE1BQU0sV0FBVyxHQUNoQixlQUFlLEdBQUcsQ0FBQztnREFDbEIsQ0FBQyxDQUFDLE1BQU07b0RBQ1AsVUFBVSxDQUFDLFNBQVMsQ0FDbkIsSUFBSSxDQUFDLGNBQWMsRUFDbkIsSUFBSSxDQUFDLGNBQWMsR0FBRyxlQUFlLENBQ3JDO29EQUNELEtBQUs7Z0RBQ04sQ0FBQyxDQUFDLElBQUksQ0FBQTs0Q0FDUixVQUFVO2dEQUNULFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUM7b0RBQzVDLFdBQVc7b0RBQ1gsVUFBVSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsY0FBYyxHQUFHLGVBQWUsQ0FBQyxDQUFBO3dDQUM3RCxDQUFDO3dDQUVELFdBQVcsQ0FBQyxJQUFJLENBQUM7NENBQ2hCLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSzs0Q0FDakIsVUFBVTs0Q0FDVixNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07NENBQ25CLElBQUksRUFBRSxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxVQUFVLENBQUM7NENBQzdELFVBQVUsRUFDVCxJQUFJLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxNQUFNO2dEQUN4QixDQUFDLENBQUMsSUFBSTtxREFDSCxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7cURBQy9DLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO2dEQUNyQixDQUFDLENBQUMsU0FBUzs0Q0FDYixLQUFLLEVBQUUsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDOzRDQUNyQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7NENBQ3ZCLGVBQWU7eUNBQ2YsQ0FBQyxDQUFBO29DQUNILENBQUM7Z0NBQ0YsQ0FBQyxDQUFDLENBQUE7NEJBQ0gsQ0FBQzs0QkFFRCxJQUNDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQXNCLE9BQU8sQ0FBQyxDQUFDLE9BQU87aUNBQ3RFLGtCQUFrQixFQUNuQixDQUFDO2dDQUNGLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUE7Z0NBQ3pDLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFBO2dDQUMvQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQ3hCLFdBQVcsQ0FBQyxJQUFJLENBQUM7b0NBQ2hCLEtBQUssRUFBRSxDQUFDO29DQUNSLFVBQVUsRUFBRSxDQUFDO29DQUNiLElBQUksa0NBQXlCO29DQUM3QixLQUFLLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7b0NBQzdCLFFBQVEsRUFBRSxLQUFLLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUM7aUNBQ3JFLENBQUMsQ0FDRixDQUFBOzRCQUNGLENBQUM7NEJBRUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxDQUFBO3dCQUN2QixDQUFDO3dCQUVELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLFdBQVcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO29CQUM1QyxDQUFDO2lCQUNELENBQ0QsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUE7SUFDM0IsQ0FBQztJQUVELGNBQWM7UUFDYixpR0FBaUc7UUFDakcsT0FBTztZQUNOLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLElBQUksQ0FBQztZQUNoRCxRQUFRLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUM7U0FDNUUsQ0FBQTtJQUNGLENBQUM7SUFFRCxJQUFJLFVBQVU7UUFDYix5Q0FBeUM7UUFDekMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsQ0FBQTtRQUNyQyxJQUFJLE9BQU8sSUFBSSxPQUFPLENBQUMsS0FBSywyQkFBbUIsRUFBRSxDQUFDO1lBQ2pELE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELGlCQUFpQjtRQUNoQixJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3RCLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDM0IsQ0FBQztJQUNGLENBQUM7SUFFRCxhQUFhO1FBQ1osSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUN0QixJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzVCLENBQUM7SUFDRixDQUFDO0lBRUQsV0FBVztRQUNWLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDMUIsQ0FBQztJQUVELFFBQVE7UUFDUCxJQUFJLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxDQUFBO0lBQ3RCLENBQUM7SUFFTyxPQUFPO1FBQ2QsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDO1lBQ3ZCLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLHVCQUF1QixDQUFBO1FBQ3RFLElBQUksWUFBWSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQztZQUN2QyxJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDbEMsSUFBSSxDQUFDLG1CQUFtQixHQUFHLG1CQUFtQixDQUFDLHdCQUF3QixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO1lBQzdGLElBQUksSUFBSSxDQUFDLEtBQUssSUFBSSxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO2dCQUNsRCxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFBO1lBQ3ZFLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLGdCQUFnQjtRQUN2QixJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLHlCQUF5QixHQUFHLElBQUksQ0FBQTtZQUNyQyxPQUFNO1FBQ1AsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDO2dCQUM1QixRQUFRLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRO2dCQUNyRCxVQUFVLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVO2dCQUN6RCxVQUFVLEVBQ1QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLEtBQUssU0FBUztvQkFDMUQsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLFVBQVU7b0JBQ2pDLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFVBQVU7YUFDakQsQ0FBQyxDQUFBO1lBRUYsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsa0NBQXlCLENBQUE7WUFFN0UsMEdBQTBHO1lBQzFHLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxHQUFHOztvQkFFZixtQkFBbUI7Ozs7eUJBSWQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlOztJQUV2RSxDQUFBO1lBQ0QsTUFBTSxhQUFhLEdBQ2xCLElBQUksQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsVUFBVSxLQUFLLFNBQVM7Z0JBQzFELENBQUMsQ0FBQyw4QkFBOEI7Z0JBQ2hDLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQTtZQUNqRCxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsMkJBQTJCLEVBQUUsYUFBYSxDQUFDLENBQUE7WUFDNUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUMvQix5QkFBeUIsRUFDekIsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFFBQVEsSUFBSSxDQUNsRCxDQUFBO1lBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUMvQixxQ0FBcUMsRUFDckMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLGtCQUFrQixJQUFJLENBQzVELENBQUE7WUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQy9CLDJCQUEyQixFQUMzQixJQUFJLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLGFBQWEsQ0FDaEQsQ0FBQTtZQUVELElBQUksQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUE7WUFFckIsSUFBSSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztnQkFDL0IsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQzFGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLGVBQWUsQ0FBQyxRQUFpQjtRQUN4QyxNQUFNLFlBQVksR0FDakIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDM0YsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDckMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUN6QixrQ0FBa0M7UUFDbEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDOUUsSUFBSSxDQUFDLDhCQUE4QixDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzFDLENBQUM7SUFFRCxLQUFLLENBQUMsYUFBYSxDQUFDLE9BQXVCO1FBQzFDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUE7UUFDdkMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxjQUFjLENBQUE7WUFDdEUsb0dBQW9HO1lBQ3BHLElBQUksY0FBYyxFQUFFLENBQUM7Z0JBQ3BCLE9BQU8sR0FBRyxjQUFjLENBQUE7WUFDekIsQ0FBQztpQkFBTSxJQUFJLENBQUMsU0FBUyxJQUFJLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO2dCQUMxRCxPQUFPLEdBQUcsSUFBSSxDQUFDLFlBQVk7cUJBQ3pCLFFBQVEsRUFBRTtxQkFDVixXQUFXLENBQUMsSUFBSSxDQUFDO3FCQUNqQixJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDeEMsQ0FBQztRQUNGLENBQUM7UUFDRCxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsSUFBSSxDQUFDLDBCQUEwQixFQUFFLE9BQU8sRUFBRSxDQUFBO1lBQzFDLElBQUksQ0FBQywwQkFBMEIsR0FBRyxPQUFPLENBQUMsdUJBQXVCLENBQUMsR0FBRyxFQUFFO2dCQUN0RSxJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLGVBQWUsRUFBRSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQTtZQUNqRSxDQUFDLENBQUMsQ0FBQTtZQUVGLElBQUksSUFBSSxDQUFDLElBQUksSUFBSSxTQUFTLEtBQUssT0FBTyxFQUFFLENBQUM7Z0JBQ3hDLElBQUksQ0FBQztvQkFDSixNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUNsQyxDQUFDO2dCQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7b0JBQ2Qsd0VBQXdFO29CQUN4RSx5RUFBeUU7b0JBQ3pFLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO2dCQUMzQixDQUFDO2dCQUNELGlCQUFpQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUM3QixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxTQUFTLEVBQUUsYUFBYSxDQUFDLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFBO1FBQzVELElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFBO0lBQzdCLENBQUM7SUFFRCxLQUFLLENBQUMsU0FBUztRQUNkLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUE7UUFDckMsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLE9BQU8sQ0FBQyxxQkFBcUIsRUFBRSxDQUFBO1lBQy9CLElBQUksT0FBTyxDQUFDLEtBQUssMkJBQW1CLEVBQUUsQ0FBQztnQkFDdEMsOEVBQThFO2dCQUM5RSxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUE7Z0JBQzdCLE1BQU0sSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFBO2dCQUMxQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1lBQ25ELENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUN2QixDQUFDO0lBRUQsZUFBZTtRQUNkLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUE7UUFDckMsSUFBSSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDakMsT0FBTyxDQUFDLGlCQUFpQixDQUN4QixJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDLGlCQUFpQixFQUNsRCxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUN6QixDQUFBO1lBQ0QsaUJBQWlCLENBQUMsSUFBSSxDQUFDLElBQUssQ0FBQyxDQUFBO1lBQzdCLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtZQUMzQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUMzQixJQUFJLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO2dCQUMvQiwwREFBMEQ7Z0JBQzFELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUMxRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxhQUFhLENBQUMsS0FBYTtRQUMxQixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxDQUFBO1FBQ3JDLElBQUksT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDLGlCQUFpQixFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3BGLGlCQUFpQixDQUFDLElBQUksQ0FBQyxJQUFLLENBQUMsQ0FBQTtZQUM3QixJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN4QixDQUFDO0lBQ0YsQ0FBQztJQUVELGlCQUFpQjtRQUNoQixJQUFJLElBQUksR0FBRyxFQUFFLENBQUE7UUFDYixJQUFJLElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzdCLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUMvRSxNQUFNLGlCQUFpQixHQUFHLENBQUMsSUFBeUMsRUFBRSxFQUFFO2dCQUN2RSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO29CQUMvQixJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQzt3QkFDbkIsSUFBSSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsU0FBUyxFQUFFLEdBQUcsYUFBYSxDQUFBO3dCQUM1RCxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDOzRCQUMvQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTt3QkFDekIsQ0FBQztvQkFDRixDQUFDO2dCQUNGLENBQUMsQ0FBQyxDQUFBO1lBQ0gsQ0FBQyxDQUFBO1lBQ0QsaUJBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO1FBQ3ZDLENBQUM7UUFFRCxPQUFPLHFCQUFxQixDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFUyxpQkFBaUIsQ0FBQyxNQUFjLEVBQUUsS0FBYTtRQUN4RCxJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUM1RCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUMzRSxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNmLE1BQU0sa0JBQWtCLEdBQ3ZCLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFBO1lBQ3ZFLE1BQU0sVUFBVSxHQUFHLE1BQU0sR0FBRyxlQUFlLENBQUE7WUFDM0MsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLEdBQUcsVUFBVSxJQUFJLENBQUE7WUFDM0QsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ25DLElBQUksa0JBQWtCLEVBQUUsQ0FBQztnQkFDeEIsaUJBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzdCLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsR0FBRyxlQUFlLElBQUksQ0FBQTtRQUU3RCxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEdBQUcsRUFBRSxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsQ0FBQyxDQUFBO0lBQ3RFLENBQUM7SUFFRCxXQUFXO1FBQ1YsSUFBSSxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUUsQ0FBQTtJQUN6QixDQUFDO0lBRUQsZUFBZTtRQUNkLE9BQU8sSUFBSSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsQ0FBQTtJQUM3QixDQUFDO0lBRUQsWUFBWTtRQUNYLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQTtJQUN0QixDQUFDO0lBRUQsaUJBQWlCO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQTtJQUMzQixDQUFDO0lBRUQsaUJBQWlCO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ2xDLENBQUM7SUFFRCxTQUFTO1FBQ1IsSUFBSSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsQ0FBQTtJQUN0QixDQUFDO0lBRVEsS0FBSyxDQUFDLEtBQUs7UUFDbkIsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ2IsTUFBTSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQyw4REFBOEQ7UUFDL0UsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUN2QixDQUFDO0lBRVEsb0JBQW9CLENBQUMsTUFBZTtRQUM1QyxJQUFJLE1BQU0sQ0FBQyxFQUFFLEtBQUssbUJBQW1CLEVBQUUsQ0FBQztZQUN2QyxNQUFNLE9BQU8sR0FDWixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztnQkFDOUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxjQUFjLENBQUE7WUFDaEQsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHdCQUF3QixFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUMzRixDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDMUMsQ0FBQztJQUVELElBQVksa0JBQWtCO1FBQzdCLE9BQU8sQ0FDTixJQUFJLENBQUMsWUFBWTthQUNmLFFBQVEsRUFBRTthQUNWLFdBQVcsQ0FBQyxJQUFJLENBQUM7YUFDakIsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUMzRSxDQUFBO0lBQ0YsQ0FBQztJQUVELG9CQUFvQjtJQUdwQixJQUFZLGdCQUFnQjtRQUMzQixNQUFNLFlBQVksR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFBO1FBQ3RDLE9BQU8sSUFBSSxnQkFBZ0IsQ0FBQyxLQUFLLElBQUksRUFBRTtZQUN0QyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQztnQkFDOUQsT0FBTTtZQUNQLENBQUM7WUFFRCxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFO2dCQUN0RCxvQkFBb0IsRUFBRSxnQkFBZ0I7YUFDdEMsQ0FBQyxDQUFBO1lBRUYsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUNwQyxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUNiLDBEQUEwRDtnQkFDMUQsTUFBTSxrQkFBa0IsR0FBRyxLQUFLLEVBQUUsUUFBd0IsRUFBRSxFQUFFO29CQUM3RCxLQUFLLE1BQU0sT0FBTyxJQUFJLFFBQVEsRUFBRSxDQUFDO3dCQUNoQyxJQUFJLE9BQU8sWUFBWSxTQUFTLEVBQUUsQ0FBQzs0QkFDbEMsSUFBSSxPQUFPLENBQUMsVUFBVSxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDO2dDQUM5RCxZQUFZLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFBO2dDQUNqQyxNQUFNLElBQUksQ0FBQyxJQUFLLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFBOzRCQUNqQyxDQUFDOzRCQUNELElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dDQUN0QyxpR0FBaUc7Z0NBQ2pHLE1BQU0sa0JBQWtCLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUE7NEJBQ2hELENBQUM7d0JBQ0YsQ0FBQztvQkFDRixDQUFDO2dCQUNGLENBQUMsQ0FBQTtnQkFDRCxNQUFNLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFBO1lBQ3BELENBQUM7WUFDRCx3RUFBd0U7WUFDeEUsTUFBTSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsR0FBRyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUE7WUFDakQsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQzVCLEtBQUssS0FBSyxRQUFRLElBQUksS0FBSyxLQUFLLENBQUM7Z0JBQ2hDLENBQUMsQ0FBQyxTQUFTO2dCQUNYLENBQUMsQ0FBQyxRQUFRLENBQUMsNkJBQTZCLEVBQUUsb0JBQW9CLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUNqRixDQUFBO1FBQ0YsQ0FBQyxFQUFFLE1BQUksQ0FBQyxhQUFhLENBQUMsQ0FBQTtJQUN2QixDQUFDO0lBRUQsZUFBZTtJQUVOLE1BQU07UUFDZCxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDZCxJQUFJLENBQUMsU0FBUyxDQUNiLDBCQUEwQixDQUFDO1lBQzFCLElBQUksRUFBRSxNQUFNO1lBQ1osY0FBYyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUM7WUFDekMsZUFBZSxFQUFFLEdBQUcsRUFBRTtnQkFDckIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUUsQ0FBQTtnQkFDM0MsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7b0JBQ2xDLElBQUksQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUE7Z0JBQ3RCLENBQUM7cUJBQU0sSUFBSSxPQUFPLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO29CQUNwRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7Z0JBQ2IsQ0FBQztZQUNGLENBQUM7WUFDRCxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7Z0JBQ3pCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFLENBQUE7Z0JBQzNDLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDO29CQUNuQyxJQUFJLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxDQUFBO2dCQUN0QixDQUFDO3FCQUFNLElBQUksT0FBTyxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztvQkFDcEQsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO2dCQUNuQixDQUFDO1lBQ0YsQ0FBQztTQUNELENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVrQixVQUFVLENBQUMsTUFBbUI7UUFDaEQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN4QixJQUFJLENBQUMsU0FBUyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQy9DLElBQUksQ0FBQyxhQUFhLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FDOUIsSUFBSSxDQUFDLFNBQVMsRUFDZCxDQUFDLENBQUMsY0FBYyxnQ0FBZ0MsRUFBRSxDQUFDLENBQ25ELENBQUE7UUFDRCxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNwQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUE7SUFDdEIsQ0FBQztJQUVPLGNBQWM7UUFDckIsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sUUFBUSxHQUNiLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQXNCLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUE7UUFDbEYsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUMxRCxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtRQUM1RixJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksY0FBYyxFQUFFLENBQUE7UUFFMUMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQ2pFLENBQUEsc0JBQStELENBQUEsRUFDL0QsV0FBVyxFQUNYLElBQUksQ0FBQyxhQUFhLEVBQ2xCLElBQUksQ0FBQyxZQUFZLEVBQ2pCO1lBQ0MsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxxQkFBcUIsRUFBRSxrQkFBa0IsQ0FBQztZQUNuRixJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHlCQUF5QixFQUFFLGtCQUFrQixDQUFDO1lBQ3ZGLElBQUksNEJBQTRCLEVBQUU7WUFDbEMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsRUFBRSxrQkFBa0IsQ0FBQztZQUMvRSxJQUFJLDZCQUE2QixDQUFDLGtCQUFrQixDQUFDO1lBQ3JELElBQUksc0JBQXNCLENBQUMsa0JBQWtCLENBQUM7U0FDOUMsRUFDRCxJQUFJLENBQUMsY0FBYyxFQUNuQjtZQUNDLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtZQUNuQixxQkFBcUIsRUFBRSxJQUFJLHlCQUF5QixFQUFFO1lBQ3RELGdCQUFnQjtZQUNoQixhQUFhLEVBQUUsSUFBSTtZQUNuQixZQUFZLEVBQUUsS0FBSztZQUNuQixpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLCtCQUErQixFQUFFO2dCQUNoQywwQkFBMEIsRUFBRSxDQUFDLENBQWUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7YUFDakU7WUFDRCxtQkFBbUIsRUFBRSxDQUFDLFFBQVE7WUFDOUIsZ0JBQWdCLEVBQUUsS0FBSztZQUN2QixxQkFBcUIsRUFBRSxRQUFRO1lBQy9CLGNBQWMsRUFBRSxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxrQkFBa0I7U0FDaEUsQ0FDRCxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLEVBQUU7WUFDbEMsSUFBSSxJQUFJLENBQUMsWUFBWSxLQUFLLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO2dCQUN6RCx5RkFBeUY7Z0JBQ3pGLHVGQUF1RjtnQkFDdkYsTUFBTSxxQkFBcUIsR0FDMUIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsWUFBWSxJQUFJLElBQUksQ0FBQyx3QkFBd0IsR0FBRyxDQUFDLENBQUE7Z0JBQ3hFLElBQUkscUJBQXFCLEVBQUUsQ0FBQztvQkFDM0IsVUFBVSxDQUFDLEdBQUcsRUFBRTt3QkFDZixzRkFBc0Y7d0JBQ3RGLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFBO29CQUN4QixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ04sQ0FBQztZQUNGLENBQUM7WUFFRCxJQUFJLENBQUMsd0JBQXdCLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQTtRQUNsRCxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNoRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVqRixJQUFJLGtCQUEwQixDQUFBO1FBQzlCLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUU7WUFDdEIsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ3JCLE9BQU07WUFDUCxDQUFDO1lBQ0QsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUE7WUFDbEUsSUFDQyxDQUFDLFNBQVM7Z0JBQ1YsU0FBUyxDQUFDLElBQUksS0FBSyxPQUFPO2dCQUMxQixrQkFBa0IsS0FBSyxTQUFTLENBQUMsUUFBUSxFQUFFLEVBQzFDLENBQUM7Z0JBQ0YsbUZBQW1GO2dCQUNuRixJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFBO1lBQ3ZCLENBQUM7WUFDRCxrQkFBa0IsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFBO1FBQzNELENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxpRUFBaUU7UUFDakUsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFBO1FBQ3BCLElBQUksQ0FBQyxZQUFZLEdBQUcsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3JFLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO0lBQ3hCLENBQUM7SUFFTyxlQUFlLENBQUMsU0FBc0I7UUFDN0MsSUFBSSxDQUFDLGtCQUFrQixHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUE7UUFDekUsR0FBRyxDQUFDLE1BQU0sQ0FDVCxJQUFJLENBQUMsa0JBQWtCLEVBQ3ZCLENBQUMsQ0FBQyxxQkFBcUIsR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFDLDRCQUE0QixDQUFDLENBQUMsQ0FDaEYsQ0FBQTtRQUVELE1BQU0sRUFBRSxvQ0FBb0MsRUFBRSxtQ0FBbUMsRUFBRSxHQUNsRixJQUFJLENBQUMsU0FBUyxDQUFDLHlDQUF5QyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQzlGLElBQUksQ0FBQyw4QkFBOEIsR0FBRyxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ2pELG9DQUFvQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUNqRCxtQ0FBbUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDakQsQ0FBQyxDQUFBO1FBQ0QscUJBQXFCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUVwRSxJQUFJLENBQUMsMEJBQTBCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDL0MsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FDcEMsSUFBSSxpQkFBaUIsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQ3pFLENBQ0QsQ0FBQTtRQUNELE1BQU0sT0FBTyxHQUFHLHNCQUFzQixDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBQ2pFLE9BQU8sQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFBO1FBQ3ZCLE9BQU8sQ0FBQyxPQUFPLEdBQUcsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLENBQUE7UUFDekMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBc0IsT0FBTyxDQUFDLENBQUE7UUFDL0UsT0FBTyxDQUFDLHVCQUF1QixHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsdUJBQXVCLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQTtRQUNoRyxPQUFPLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUV2QyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxjQUFjLENBQzlELGdCQUFnQixFQUNoQixJQUFJLENBQUMsa0JBQWtCLEVBQ3ZCLE9BQU8sRUFDUCxnQ0FBZ0MsRUFBRSxDQUNsQyxDQUFBO1FBRUQsSUFBSSxpQkFBaUIsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUMxQixJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxTQUFTLENBQUMsdUJBQXVCLENBQUMsR0FBRyxFQUFFO1lBQzNDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUE7WUFDdkMsSUFBSSxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1lBRXZFLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtZQUN2RCxJQUFJLGFBQWEsS0FBSyxpQkFBaUIsRUFBRSxDQUFDO2dCQUN6QyxpQkFBaUIsR0FBRyxhQUFhLENBQUE7Z0JBQ2pDLElBQUksSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7b0JBQy9CLElBQUksQ0FBQyxpQkFBaUIsQ0FDckIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sRUFDaEMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FDL0IsQ0FBQTtnQkFDRixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCx5RUFBeUU7UUFDekUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2RixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsbUJBQW1CLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXRGLElBQUksQ0FBQyxTQUFTLENBQ2IsR0FBRyxDQUFDLDZCQUE2QixDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FDcEYsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FDeEQsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixHQUFHLENBQUMsNkJBQTZCLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUNuRixJQUFJLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUMzRCxDQUNELENBQUE7SUFDRixDQUFDO0lBRU8sWUFBWTtRQUNuQixJQUFJLFNBQVMsR0FBRyxRQUFRLENBQUMsY0FBYyxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQ3pELElBQUksQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSw2RUFBdUMsRUFBRSxDQUFDO1lBQ2hGLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFDRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsaUJBQWlCO2FBQ3ZDLGdCQUFnQixzRkFBOEM7WUFDL0QsRUFBRSxZQUFZLEVBQUUsQ0FBQTtRQUNqQixJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLFNBQVMsR0FBRyxRQUFRLENBQ25CLDRCQUE0QixFQUM1Qix1Q0FBdUMsRUFDdkMsU0FBUyxFQUNULFVBQVUsQ0FDVixDQUFBO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxTQUFTLEdBQUcsUUFBUSxDQUNuQix3Q0FBd0MsRUFDeEMsaUdBQWlHLEVBQ2pHLFNBQVMsQ0FDVCxDQUFBO1FBQ0YsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFTyxhQUFhLENBQUMsQ0FBc0M7UUFDM0QsTUFBTSxPQUFPLEdBQUcseUJBQXlCLENBQ3hDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FDbEUsQ0FBQTtRQUNELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUM7WUFDdkMsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNO1lBQ3pCLFVBQVUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPO1lBQ3pCLGlCQUFpQixFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPO1NBQ2xDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxhQUFhO0lBRUwsbUJBQW1CLENBQUMsT0FBZ0I7UUFDM0MsSUFBSSxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDO1lBQ25DLElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUM7Z0JBQ3pDLE9BQU07WUFDUCxDQUFDO1lBRUQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDeEQsQ0FBQztJQUNGLENBQUM7SUFFTyxxQkFBcUI7UUFDNUIsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNyQixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sV0FBVyxHQUF5QixFQUFFLENBQUE7UUFDNUMsSUFBSSxJQUFJLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDcEYsTUFBTSxxQkFBcUIsR0FBRyxpQkFBaUIsQ0FDOUMsZ0JBQWdCLEVBQ2hCLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxFQUFFLENBQ2pDLEVBQUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ25CLFdBQVcsQ0FBQyxJQUFJLENBQUM7Z0JBQ2hCLEtBQUssRUFBRTtvQkFDTixlQUFlLEVBQUUsQ0FBQztvQkFDbEIsYUFBYSxFQUFFLENBQUM7b0JBQ2hCLFdBQVcsRUFBRSxDQUFDO29CQUNkLFNBQVMsRUFBRSxDQUFDO2lCQUNaO2dCQUNELGFBQWEsRUFBRTtvQkFDZCxLQUFLLEVBQUU7d0JBQ04sV0FBVyxFQUFFLFFBQVEsQ0FDcEIsaUJBQWlCLEVBQ2pCLHNEQUFzRCxDQUN0RDt3QkFDRCxLQUFLLEVBQUUscUJBQXFCLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTO3FCQUMzRTtpQkFDRDthQUNELENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLGlCQUFpQixFQUFFLGNBQWMsRUFBRSxXQUFXLENBQUMsQ0FBQTtJQUNwRixDQUFDO0lBRVEsU0FBUztRQUNqQixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQzdDLElBQUksV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUN4QixtQkFBbUIsRUFDbkIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsZ0VBRzNCLENBQUE7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLG1CQUFtQixpQ0FBeUIsQ0FBQTtRQUN4RSxDQUFDO1FBQ0QsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtRQUNwRCxJQUFJLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FDeEIsMEJBQTBCLEVBQzFCLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLGdFQUc3QixDQUFBO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQywwQkFBMEIsaUNBQXlCLENBQUE7UUFDL0UsQ0FBQztRQUNELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDckQsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNqQixJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FDeEIsd0JBQXdCLEVBQ3hCLFdBQVcsZ0VBR1gsQ0FBQTtRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsd0JBQXdCLGlDQUF5QixDQUFBO1FBQzdFLENBQUM7UUFFRCxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUE7SUFDbEIsQ0FBQztJQUVRLE9BQU87UUFDZixJQUFJLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxDQUFBLENBQUMsb0NBQW9DO1FBQzlELElBQUksQ0FBQywwQkFBMEIsRUFBRSxPQUFPLEVBQUUsQ0FBQTtRQUMxQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDL0IsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2xDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDOztBQXRXRDtJQURDLE9BQU87NENBdUNQO0FBbm9CVyxJQUFJO0lBZ0NkLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxzQkFBc0IsQ0FBQTtJQUN0QixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFlBQUEscUJBQXFCLENBQUE7SUFDckIsWUFBQSw4QkFBOEIsQ0FBQTtJQUU5QixZQUFBLGNBQWMsQ0FBQTtJQUNkLFlBQUEsa0JBQWtCLENBQUE7SUFDbEIsWUFBQSxjQUFjLENBQUE7SUFDZCxZQUFBLGFBQWEsQ0FBQTtJQUNiLFlBQUEsWUFBWSxDQUFBO0lBQ1osWUFBQSx3QkFBd0IsQ0FBQTtJQUN4QixZQUFBLFdBQVcsQ0FBQTtHQWxERCxJQUFJLENBbzhCaEI7O0FBRUQsSUFBTSxXQUFXLEdBQWpCLE1BQU0sV0FBWSxTQUFRLFVBQVU7O2FBQ1gsaUJBQVksR0FBRyxHQUFHLEFBQU4sQ0FBTTtJQU0xQyxJQUFXLGlCQUFpQjtRQUMzQixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUE7SUFDeEIsQ0FBQztJQUVELFlBQ0MsTUFBYyxFQUNHLHVCQUFxQyxFQUMvQixvQkFBNEQsRUFDcEUsWUFBNEMsRUFDbkMscUJBQThEO1FBRXRGLEtBQUssRUFBRSxDQUFBO1FBTFUsNEJBQXVCLEdBQXZCLHVCQUF1QixDQUFjO1FBQ2QseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUNuRCxpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUNsQiwwQkFBcUIsR0FBckIscUJBQXFCLENBQXdCO1FBYnRFLGlCQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDMUQsZ0JBQVcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQTtRQWdCN0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzdFLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLHFCQUFxQixDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDcEQsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUMxQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7WUFDZCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLG9CQUFvQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDeEQsSUFDQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsMEJBQTBCLENBQUM7Z0JBQ2xELENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyx3QkFBd0IsQ0FBQztnQkFDaEQsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLDBCQUEwQixDQUFDLEVBQ2pELENBQUM7Z0JBQ0YsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO1lBQ2QsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7SUFDZCxDQUFDO0lBRU8sTUFBTTtRQUNiLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQXNCLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQTtRQUM3RixJQUFJLENBQUMsV0FBVyxHQUFHO1lBQ2xCLFFBQVEsRUFBRSxZQUFZLENBQUMsUUFBUTtZQUMvQixVQUFVLEVBQUUsWUFBWSxDQUFDLFVBQVU7WUFDbkMsVUFBVSxFQUFFLFlBQVksQ0FBQyxVQUFVO2dCQUNsQyxDQUFDLENBQUMsWUFBWSxDQUFDLFVBQVU7Z0JBQ3pCLENBQUMsQ0FBQyxhQUFXLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQyxRQUFRO1lBQ25ELGFBQWEsRUFBRSxZQUFZLENBQUMsVUFBVTtnQkFDckMsQ0FBQyxDQUFDLEdBQUcsWUFBWSxDQUFDLFVBQVUsSUFBSTtnQkFDaEMsQ0FBQyxDQUFDLEdBQUcsYUFBVyxDQUFDLFlBQVksSUFBSTtZQUNsQyxlQUFlLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUM7WUFDM0Ysa0JBQWtCLEVBQUUsQ0FBQyxZQUFZLENBQUMsUUFBUSxHQUFHLGFBQVcsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQztTQUM5RSxDQUFBO1FBQ0QsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUN6QixDQUFDOztBQXpESSxXQUFXO0lBY2QsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsc0JBQXNCLENBQUE7R0FoQm5CLFdBQVcsQ0EwRGhCO0FBRUQsNEJBQTRCO0FBRTVCLE1BQU0scUJBQXNCLFNBQVEsWUFBWTtJQUMvQztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSx5QkFBeUI7WUFDN0IsS0FBSyxFQUFFLFNBQVMsQ0FDZjtnQkFDQyxHQUFHLEVBQUUsMEJBQTBCO2dCQUMvQixPQUFPLEVBQUUsQ0FBQyw4Q0FBOEMsQ0FBQzthQUN6RCxFQUNELDZCQUE2QixDQUM3QjtZQUNELFlBQVksRUFBRSxxQkFBcUI7WUFDbkMsTUFBTSxFQUFFO2dCQUNQLE1BQU0sRUFBRSxpQkFBaUIsQ0FBQyxjQUFjO2dCQUN4QyxPQUFPLHVCQUFlO2dCQUN0QixNQUFNLDBDQUFnQzthQUN0QztTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxHQUFHLENBQUMsUUFBMEIsRUFBRSxNQUFtQjtRQUNsRCxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsbUJBQW1CLEVBQUUsQ0FBQTtRQUNwRCxNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFBO1FBQ3JELElBQUksRUFBRSxlQUFlLEVBQUUsQ0FBQTtJQUN4QixDQUFDO0NBQ0Q7QUFFRCxNQUFNLGdCQUFpQixTQUFRLFVBQWdCO0lBQzlDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsTUFBTSxFQUFFLFlBQVk7WUFDcEIsRUFBRSxFQUFFLG9CQUFvQjtZQUN4QixLQUFLLEVBQUUsUUFBUSxDQUFDLG9CQUFvQixFQUFFLDZCQUE2QixDQUFDO1lBQ3BFLFlBQVksRUFBRSxxQkFBcUI7WUFDbkMsVUFBVSxFQUFFO2dCQUNYO29CQUNDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxjQUFjO29CQUN0QyxPQUFPLEVBQUUsaURBQTZCO29CQUN0QyxNQUFNLDBDQUFnQztpQkFDdEM7YUFDRDtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxTQUFTLENBQUMsUUFBMEIsRUFBRSxJQUFVO1FBQy9DLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtJQUNuQixDQUFDO0NBQ0Q7QUFFRCxNQUFNLGNBQWUsU0FBUSxVQUFnQjtJQUM1QztRQUNDLEtBQUssQ0FBQztZQUNMLE1BQU0sRUFBRSxZQUFZO1lBQ3BCLEVBQUUsRUFBRSxrQkFBa0I7WUFDdEIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSwyQkFBMkIsQ0FBQztZQUNoRSxZQUFZLEVBQUUscUJBQXFCO1lBQ25DLFVBQVUsRUFBRTtnQkFDWDtvQkFDQyxJQUFJLEVBQUUsY0FBYyxDQUFDLEVBQUUsQ0FDdEIscUJBQXFCLEVBQ3JCLGNBQWMsQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFLDJCQUEyQixDQUFDLENBQ2pFO29CQUNELE9BQU8sRUFBRSxnREFBMkIsd0JBQWU7b0JBQ25ELE1BQU0sMENBQWdDO2lCQUN0QzthQUNEO1lBQ0QsSUFBSSxFQUFFLE9BQU8sQ0FBQyxNQUFNO1lBQ3BCLElBQUksRUFBRTtnQkFDTDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLFNBQVM7b0JBQ3BCLEtBQUssRUFBRSxZQUFZO29CQUNuQixJQUFJLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDO29CQUNqRCxLQUFLLEVBQUUsRUFBRTtpQkFDVDtnQkFDRDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLG1CQUFtQjtvQkFDOUIsS0FBSyxFQUFFLFlBQVk7b0JBQ25CLEtBQUssRUFBRSxFQUFFO2lCQUNUO2FBQ0Q7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsU0FBUyxDQUFDLFFBQTBCLEVBQUUsSUFBVTtRQUMvQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7SUFDaEIsQ0FBQztDQUNEO0FBRUQsTUFBTSxpQkFBa0IsU0FBUSxZQUFZO0lBQzNDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHFCQUFxQjtZQUN6QixLQUFLLEVBQUUsUUFBUSxDQUFDLHNCQUFzQixFQUFFLHlCQUF5QixDQUFDO1lBQ2xFLEtBQUssRUFBRSx3QkFBd0I7WUFDL0IsWUFBWSxFQUFFLHFCQUFxQjtTQUNuQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsR0FBRyxDQUFDLFFBQTBCLEVBQUUsTUFBbUI7UUFDbEQsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDeEQsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQTtRQUNyRCxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ1YsT0FBTyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQTtRQUM1RCxDQUFDO0lBQ0YsQ0FBQztDQUNEO0FBRUQsb0JBQW9CLENBQUMscUJBQXFCLENBQUMsQ0FBQTtBQUMzQyxvQkFBb0IsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0FBQ3ZDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO0FBQ2pDLGVBQWUsQ0FBQyxjQUFjLENBQUMsQ0FBQTtBQUUvQixNQUFNLHdCQUF5QixTQUFRLDBCQUEwQjtJQUM3QyxXQUFXO1FBQzdCLE9BQU8sSUFBSSxDQUFDLFlBQVk7YUFDdEIsUUFBUSxFQUFFO2FBQ1YsV0FBVyxDQUFDLElBQUksQ0FBQzthQUNqQixNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ2pFLENBQUM7SUFFa0IsMkJBQTJCLENBQUMsY0FBNkI7UUFDM0UsT0FBTyxjQUFjLENBQUMsYUFBYSxJQUFJLENBQUMsY0FBYyxDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUM7WUFDMUUsY0FBYyxHQUFHLGNBQWMsQ0FBQyxhQUFhLENBQUE7UUFDOUMsQ0FBQztRQUNELE9BQU8sY0FBYyxDQUFBO0lBQ3RCLENBQUM7Q0FDRDtBQUVELE1BQU0sVUFBVSxXQUFXLENBQUMsWUFBMkI7SUFDdEQsT0FBUSxZQUFZLENBQUMsbUJBQW1CLENBQUMsWUFBWSxDQUFVLElBQUksU0FBUyxDQUFBO0FBQzdFLENBQUM7QUFFRCxNQUFNLG1CQUFtQixHQUFHLG1DQUFtQyxDQUFBO0FBQy9ELGVBQWUsQ0FDZCxLQUFNLFNBQVEsVUFBZ0I7SUFDN0I7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsbUJBQW1CO1lBQ3ZCLE1BQU0sRUFBRSxZQUFZO1lBQ3BCLEtBQUssRUFBRSxRQUFRLENBQUMsWUFBWSxFQUFFLHNCQUFzQixDQUFDO1lBQ3JELEVBQUUsRUFBRSxLQUFLO1lBQ1QsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsU0FBUztnQkFDcEIsS0FBSyxFQUFFLFlBQVk7Z0JBQ25CLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixjQUFjLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsRUFDM0MsMEJBQTBCLENBQzFCO2dCQUNELEtBQUssRUFBRSxFQUFFO2FBQ1Q7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLFNBQVMsQ0FBQyxRQUEwQixFQUFFLElBQVUsRUFBRSxPQUFrQztRQUN6RixNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQ2hELHFJQUFxSTtRQUNySSxJQUNDLE9BQU87WUFDUCxPQUFPLENBQUMsS0FBSywyQkFBbUI7WUFDaEMsT0FBTyxLQUFLLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxjQUFjLEVBQ3JELENBQUM7WUFDRixJQUFJLE9BQU8sQ0FBQyxLQUFLLDBCQUFrQixFQUFFLENBQUM7Z0JBQ3JDLHVEQUF1RDtnQkFDdkQsTUFBTSxvQkFBb0IsR0FBRyxZQUFZO3FCQUN2QyxRQUFRLEVBQUU7cUJBQ1YsV0FBVyxFQUFFO3FCQUNiLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLGFBQWEsS0FBSyxPQUFPLElBQUksQ0FBQyxDQUFDLEtBQUssMEJBQWtCLENBQUMsQ0FBQTtnQkFDdkUsSUFBSSxvQkFBb0IsRUFBRSxDQUFDO29CQUMxQixPQUFPLEdBQUcsb0JBQW9CLENBQUE7Z0JBQy9CLENBQUM7WUFDRixDQUFDO1lBQ0QsTUFBTSxZQUFZLENBQUMsZUFBZSxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDdEYsQ0FBQztRQUNELDJGQUEyRjtRQUMzRixNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDbEMsQ0FBQztDQUNELENBQ0QsQ0FBQTtBQUVELGVBQWUsQ0FDZCxLQUFNLFNBQVEsVUFBZ0I7SUFDN0I7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsOENBQThDO1lBQ2xELE1BQU0sRUFBRSxZQUFZO1lBQ3BCLEtBQUssRUFBRSxTQUFTLENBQUMsV0FBVyxFQUFFLGVBQWUsQ0FBQztZQUM5QyxRQUFRLEVBQUU7Z0JBQ1QsV0FBVyxFQUFFLFNBQVMsQ0FDckIsdUJBQXVCLEVBQ3ZCLGdEQUFnRCxDQUNoRDthQUNEO1lBQ0QsRUFBRSxFQUFFLElBQUk7WUFDUixJQUFJLEVBQUUsb0JBQW9CO1lBQzFCLElBQUksRUFBRTtnQkFDTDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLFNBQVM7b0JBQ3BCLEtBQUssRUFBRSxZQUFZO29CQUNuQixJQUFJLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDO29CQUNqRCxLQUFLLEVBQUUsRUFBRTtpQkFDVDtnQkFDRDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLG1CQUFtQjtvQkFDOUIsS0FBSyxFQUFFLFlBQVk7b0JBQ25CLEtBQUssRUFBRSxFQUFFO2lCQUNUO2FBQ0Q7WUFDRCxVQUFVLEVBQUU7Z0JBQ1g7b0JBQ0MsT0FBTyxFQUFFLENBQUM7b0JBQ1YsR0FBRyxFQUFFLEVBQUUsT0FBTyxFQUFFLGlEQUE2QixFQUFFO29CQUMvQywrRUFBK0U7b0JBQy9FLHlEQUF5RDtvQkFDekQsTUFBTSxFQUFFLDhDQUFvQyxDQUFDO29CQUM3QyxJQUFJLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUUsMkJBQTJCLENBQUM7aUJBQ3ZFO2FBQ0Q7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsU0FBUyxDQUFDLFNBQTJCLEVBQUUsSUFBVTtRQUNoRCxNQUFNLDBCQUEwQixHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtRQUM3RSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUE7UUFDaEIsMEJBQTBCLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ2pFLENBQUM7Q0FDRCxDQUNELENBQUE7QUFFRCxlQUFlLENBQ2QsS0FBTSxTQUFRLFVBQWdCO0lBQzdCO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLG9CQUFvQjtZQUN4QixLQUFLLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxjQUFjLENBQUM7WUFDM0MsTUFBTSxFQUFFLFlBQVk7WUFDcEIsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsbUJBQW1CO2dCQUM5QixLQUFLLEVBQUUsWUFBWTtnQkFDbkIsS0FBSyxFQUFFLEVBQUU7YUFDVDtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxTQUFTLENBQUMsU0FBMkIsRUFBRSxJQUFVO1FBQ2hELElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUNsQixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDYixDQUFDO0NBQ0QsQ0FDRCxDQUFBO0FBRUQsZUFBZSxDQUNkLEtBQU0sU0FBUSxVQUFnQjtJQUM3QjtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxpQkFBaUI7WUFDckIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDO1lBQ2pDLE1BQU0sRUFBRSxZQUFZO1lBQ3BCLFlBQVksRUFBRSxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsYUFBYSx3QkFBZ0IsQ0FBQztZQUM1RSxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxtQkFBbUI7Z0JBQzlCLEtBQUssRUFBRSxnQkFBZ0I7Z0JBQ3ZCLEtBQUssRUFBRSxFQUFFO2FBQ1Q7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLFNBQVMsQ0FBQyxRQUEwQixFQUFFLElBQVU7UUFDckQsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDeEQsTUFBTSxhQUFhLEdBQUcsTUFBTSxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUN2RCxJQUFJLGFBQWEsRUFBRSxDQUFDO1lBQ25CLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtZQUNyQyxTQUFTLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQTtZQUM5RCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7WUFDWixNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUE7WUFDbEMsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNuRCxNQUFNLE1BQU0sR0FBRyxLQUFLLEVBQUUsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDbEQsSUFBSSxPQUFPLFVBQVUsS0FBSyxRQUFRLElBQUksT0FBTyxNQUFNLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQ2xFLFNBQVMsQ0FBQyxXQUFXLENBQUMsRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQTtZQUM5QyxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUNELENBQUE7QUFFRCxlQUFlLENBQ2QsS0FBTSxTQUFRLFVBQWdCO0lBQzdCO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGdDQUFnQztZQUNwQyxLQUFLLEVBQUUsUUFBUSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUM7WUFDdEMsTUFBTSxFQUFFLFlBQVk7WUFDcEIsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsbUJBQW1CO2dCQUM5QixLQUFLLEVBQUUsZ0JBQWdCO2dCQUN2QixLQUFLLEVBQUUsRUFBRTthQUNUO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxTQUFTLENBQUMsUUFBMEIsRUFBRSxJQUFVO1FBQ3JELE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sZ0JBQWdCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUE7SUFDM0QsQ0FBQztDQUNELENBQ0QsQ0FBQTtBQUVELGVBQWUsQ0FDZCxLQUFNLFNBQVEsT0FBTztJQUNwQjtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxnQkFBZ0I7WUFDcEIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDO1lBQy9CLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLG1CQUFtQjtnQkFDOUIsS0FBSyxFQUFFLGdCQUFnQjtnQkFDdkIsS0FBSyxFQUFFLEVBQUU7YUFDVDtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsT0FBcUI7UUFDMUQsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDeEQsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNoRCxNQUFNLGVBQWUsR0FBRyxHQUFHLENBQUMsZUFBZSxFQUFFLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDNUQsTUFBTSxZQUFZLEdBQUcsZUFBZSxFQUFFLFFBQVEsRUFBRSxDQUFBO1FBQ2hELElBQUksWUFBWSxJQUFJLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDN0MsT0FBTyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDaEQsQ0FBQzthQUFNLElBQUksT0FBTyxFQUFFLENBQUM7WUFDcEIsT0FBTyxnQkFBZ0IsQ0FBQyxTQUFTLENBQ2hDLENBQUMsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxDQUFDLElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUM1RSxDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsa0JBQWtCLENBQy9CLFlBQTJCLEVBQzNCLE9BQXFCO1FBRXJCLHdFQUF3RTtRQUN4RSxJQUFJLENBQUMsQ0FBQyxPQUFPLFlBQVksb0JBQW9CLENBQUMsRUFBRSxDQUFDO1lBQ2hELE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxVQUFVLEdBQUcsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDLGlCQUFpQixDQUFBO1FBQ2hFLE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxjQUFjLENBQUE7UUFDMUQsSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztZQUMvRSxPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQztZQUNKLE1BQU0sVUFBVSxHQUFHLE1BQU0sT0FBTyxDQUFDLFFBQVEsQ0FDeEMsT0FBTyxDQUFDLGtCQUFrQixFQUMxQixVQUFVLENBQUMsT0FBTyxFQUNsQixXQUFXLENBQ1gsQ0FBQTtZQUNELE9BQU8sVUFBVSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUE7UUFDL0IsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixPQUFNO1FBQ1AsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUNELENBQUE7QUFFRCxlQUFlLENBQ2QsS0FBTSxTQUFRLE9BQU87SUFDcEI7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsYUFBYTtZQUNqQixRQUFRLEVBQUUsc0JBQXNCO1lBQ2hDLEtBQUssRUFBRSxTQUFTLENBQ2YsRUFBRSxPQUFPLEVBQUUsQ0FBQyw4Q0FBOEMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxtQkFBbUIsRUFBRSxFQUN2Riw2QkFBNkIsQ0FDN0I7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRVEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUM1QyxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sSUFBSSxHQUFHLE1BQU0sWUFBWSxDQUFDLFFBQVEsQ0FBTyxZQUFZLENBQUMsQ0FBQTtRQUM1RCxNQUFNLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQTtJQUNwQixDQUFDO0NBQ0QsQ0FDRCxDQUFBIn0=