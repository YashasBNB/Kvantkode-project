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
import { EventType, addDisposableListener, getActiveWindow, isActiveElement, } from '../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { alert } from '../../../../base/browser/ui/aria/aria.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import * as marked from '../../../../base/common/marked/marked.js';
import { isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { EditorExtensionsRegistry } from '../../../../editor/browser/editorExtensions.js';
import { CodeEditorWidget, } from '../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { Position } from '../../../../editor/common/core/position.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { AccessibilityHelpNLS } from '../../../../editor/common/standaloneStrings.js';
import { CodeActionController } from '../../../../editor/contrib/codeAction/browser/codeActionController.js';
import { localize } from '../../../../nls.js';
import { AccessibleContentProvider, ExtensionContentProvider, isIAccessibleViewContentProvider, } from '../../../../platform/accessibility/browser/accessibleView.js';
import { ACCESSIBLE_VIEW_SHOWN_STORAGE_PREFIX, IAccessibilityService, } from '../../../../platform/accessibility/common/accessibility.js';
import { getFlatActionBarActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { WorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextViewService, } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { accessibilityHelpIsShown, accessibleViewContainsCodeBlocks, accessibleViewCurrentProviderId, accessibleViewGoToSymbolSupported, accessibleViewHasAssignedKeybindings, accessibleViewHasUnassignedKeybindings, accessibleViewInCodeBlock, accessibleViewIsShown, accessibleViewOnLastLine, accessibleViewSupportsNavigation, accessibleViewVerbosityEnabled, } from './accessibilityConfiguration.js';
import { resolveContentAndKeybindingItems } from './accessibleViewKeybindingResolver.js';
import { IChatCodeBlockContextProviderService } from '../../chat/browser/chat.js';
import { getSimpleEditorOptions } from '../../codeEditor/browser/simpleEditorOptions.js';
import { Schemas } from '../../../../base/common/network.js';
import { ITextModelService, } from '../../../../editor/common/services/resolverService.js';
var DIMENSIONS;
(function (DIMENSIONS) {
    DIMENSIONS[DIMENSIONS["MAX_WIDTH"] = 600] = "MAX_WIDTH";
})(DIMENSIONS || (DIMENSIONS = {}));
let AccessibleView = class AccessibleView extends Disposable {
    get editorWidget() {
        return this._editorWidget;
    }
    constructor(_openerService, _instantiationService, _configurationService, _modelService, _contextViewService, _contextKeyService, _accessibilityService, _keybindingService, _layoutService, _menuService, _commandService, _codeBlockContextProviderService, _storageService, textModelResolverService, _quickInputService) {
        super();
        this._openerService = _openerService;
        this._instantiationService = _instantiationService;
        this._configurationService = _configurationService;
        this._modelService = _modelService;
        this._contextViewService = _contextViewService;
        this._contextKeyService = _contextKeyService;
        this._accessibilityService = _accessibilityService;
        this._keybindingService = _keybindingService;
        this._layoutService = _layoutService;
        this._menuService = _menuService;
        this._commandService = _commandService;
        this._codeBlockContextProviderService = _codeBlockContextProviderService;
        this._storageService = _storageService;
        this.textModelResolverService = textModelResolverService;
        this._quickInputService = _quickInputService;
        this._isInQuickPick = false;
        this._accessiblityHelpIsShown = accessibilityHelpIsShown.bindTo(this._contextKeyService);
        this._accessibleViewIsShown = accessibleViewIsShown.bindTo(this._contextKeyService);
        this._accessibleViewSupportsNavigation = accessibleViewSupportsNavigation.bindTo(this._contextKeyService);
        this._accessibleViewVerbosityEnabled = accessibleViewVerbosityEnabled.bindTo(this._contextKeyService);
        this._accessibleViewGoToSymbolSupported = accessibleViewGoToSymbolSupported.bindTo(this._contextKeyService);
        this._accessibleViewCurrentProviderId = accessibleViewCurrentProviderId.bindTo(this._contextKeyService);
        this._accessibleViewInCodeBlock = accessibleViewInCodeBlock.bindTo(this._contextKeyService);
        this._accessibleViewContainsCodeBlocks = accessibleViewContainsCodeBlocks.bindTo(this._contextKeyService);
        this._onLastLine = accessibleViewOnLastLine.bindTo(this._contextKeyService);
        this._hasUnassignedKeybindings = accessibleViewHasUnassignedKeybindings.bindTo(this._contextKeyService);
        this._hasAssignedKeybindings = accessibleViewHasAssignedKeybindings.bindTo(this._contextKeyService);
        this._container = document.createElement('div');
        this._container.classList.add('accessible-view');
        if (this._configurationService.getValue("accessibility.hideAccessibleView" /* AccessibilityWorkbenchSettingId.HideAccessibleView */)) {
            this._container.classList.add('hide');
        }
        const codeEditorWidgetOptions = {
            contributions: EditorExtensionsRegistry.getEditorContributions().filter((c) => c.id !== CodeActionController.ID),
        };
        const titleBar = document.createElement('div');
        titleBar.classList.add('accessible-view-title-bar');
        this._title = document.createElement('div');
        this._title.classList.add('accessible-view-title');
        titleBar.appendChild(this._title);
        const actionBar = document.createElement('div');
        actionBar.classList.add('accessible-view-action-bar');
        titleBar.appendChild(actionBar);
        this._container.appendChild(titleBar);
        this._toolbar = this._register(_instantiationService.createInstance(WorkbenchToolBar, actionBar, {
            orientation: 0 /* ActionsOrientation.HORIZONTAL */,
        }));
        this._toolbar.context = { viewId: 'accessibleView' };
        const toolbarElt = this._toolbar.getElement();
        toolbarElt.tabIndex = 0;
        const editorOptions = {
            ...getSimpleEditorOptions(this._configurationService),
            lineDecorationsWidth: 6,
            dragAndDrop: false,
            cursorWidth: 1,
            wordWrap: 'off',
            wrappingStrategy: 'advanced',
            wrappingIndent: 'none',
            padding: { top: 2, bottom: 2 },
            quickSuggestions: false,
            renderWhitespace: 'none',
            dropIntoEditor: { enabled: false },
            readOnly: true,
            fontFamily: 'var(--monaco-monospace-font)',
        };
        this.textModelResolverService.registerTextModelContentProvider(Schemas.accessibleView, this);
        this._editorWidget = this._register(this._instantiationService.createInstance(CodeEditorWidget, this._container, editorOptions, codeEditorWidgetOptions));
        this._register(this._accessibilityService.onDidChangeScreenReaderOptimized(() => {
            if (this._currentProvider && this._accessiblityHelpIsShown.get()) {
                this.show(this._currentProvider);
            }
        }));
        this._register(this._configurationService.onDidChangeConfiguration((e) => {
            if (isIAccessibleViewContentProvider(this._currentProvider) &&
                e.affectsConfiguration(this._currentProvider.verbositySettingKey)) {
                if (this._accessiblityHelpIsShown.get()) {
                    this.show(this._currentProvider);
                }
                this._accessibleViewVerbosityEnabled.set(this._configurationService.getValue(this._currentProvider.verbositySettingKey));
                this._updateToolbar(this._currentProvider.actions, this._currentProvider.options.type);
            }
            if (e.affectsConfiguration("accessibility.hideAccessibleView" /* AccessibilityWorkbenchSettingId.HideAccessibleView */)) {
                this._container.classList.toggle('hide', this._configurationService.getValue("accessibility.hideAccessibleView" /* AccessibilityWorkbenchSettingId.HideAccessibleView */));
            }
        }));
        this._register(this._editorWidget.onDidDispose(() => this._resetContextKeys()));
        this._register(this._editorWidget.onDidChangeCursorPosition(() => {
            this._onLastLine.set(this._editorWidget.getPosition()?.lineNumber ===
                this._editorWidget.getModel()?.getLineCount());
        }));
        this._register(this._editorWidget.onDidChangeCursorPosition(() => {
            const cursorPosition = this._editorWidget.getPosition()?.lineNumber;
            if (this._codeBlocks && cursorPosition !== undefined) {
                const inCodeBlock = this._codeBlocks.find((c) => c.startLine <= cursorPosition && c.endLine >= cursorPosition) !== undefined;
                this._accessibleViewInCodeBlock.set(inCodeBlock);
            }
        }));
    }
    provideTextContent(resource) {
        return this._getTextModel(resource);
    }
    _resetContextKeys() {
        this._accessiblityHelpIsShown.reset();
        this._accessibleViewIsShown.reset();
        this._accessibleViewSupportsNavigation.reset();
        this._accessibleViewVerbosityEnabled.reset();
        this._accessibleViewGoToSymbolSupported.reset();
        this._accessibleViewCurrentProviderId.reset();
        this._hasAssignedKeybindings.reset();
        this._hasUnassignedKeybindings.reset();
    }
    getPosition(id) {
        if (!id || !this._lastProvider || this._lastProvider.id !== id) {
            return undefined;
        }
        return this._editorWidget.getPosition() || undefined;
    }
    setPosition(position, reveal, select) {
        this._editorWidget.setPosition(position);
        if (reveal) {
            this._editorWidget.revealPosition(position);
        }
        if (select) {
            const lineLength = this._editorWidget.getModel()?.getLineLength(position.lineNumber) ?? 0;
            if (lineLength) {
                this._editorWidget.setSelection({
                    startLineNumber: position.lineNumber,
                    startColumn: 1,
                    endLineNumber: position.lineNumber,
                    endColumn: lineLength + 1,
                });
            }
        }
    }
    getCodeBlockContext() {
        const position = this._editorWidget.getPosition();
        if (!this._codeBlocks?.length || !position) {
            return;
        }
        const codeBlockIndex = this._codeBlocks?.findIndex((c) => c.startLine <= position?.lineNumber && c.endLine >= position?.lineNumber);
        const codeBlock = codeBlockIndex !== undefined && codeBlockIndex > -1
            ? this._codeBlocks[codeBlockIndex]
            : undefined;
        if (!codeBlock || codeBlockIndex === undefined) {
            return;
        }
        return {
            code: codeBlock.code,
            languageId: codeBlock.languageId,
            codeBlockIndex,
            element: undefined,
        };
    }
    navigateToCodeBlock(type) {
        const position = this._editorWidget.getPosition();
        if (!this._codeBlocks?.length || !position) {
            return;
        }
        let codeBlock;
        const codeBlocks = this._codeBlocks.slice();
        if (type === 'previous') {
            codeBlock = codeBlocks.reverse().find((c) => c.endLine < position.lineNumber);
        }
        else {
            codeBlock = codeBlocks.find((c) => c.startLine > position.lineNumber);
        }
        if (!codeBlock) {
            return;
        }
        this.setPosition(new Position(codeBlock.startLine, 1), true);
    }
    showLastProvider(id) {
        if (!this._lastProvider || this._lastProvider.options.id !== id) {
            return;
        }
        this.show(this._lastProvider);
    }
    show(provider, symbol, showAccessibleViewHelp, position) {
        provider = provider ?? this._currentProvider;
        if (!provider) {
            return;
        }
        provider.onOpen?.();
        const delegate = {
            getAnchor: () => {
                return {
                    x: getActiveWindow().innerWidth / 2 -
                        Math.min(this._layoutService.activeContainerDimension.width * 0.62 /* golden cut */, 600 /* DIMENSIONS.MAX_WIDTH */) /
                            2,
                    y: this._layoutService.activeContainerOffset.quickPickTop,
                };
            },
            render: (container) => {
                this._viewContainer = container;
                this._viewContainer.classList.add('accessible-view-container');
                return this._render(provider, container, showAccessibleViewHelp);
            },
            onHide: () => {
                if (!showAccessibleViewHelp) {
                    this._updateLastProvider();
                    this._currentProvider?.dispose();
                    this._currentProvider = undefined;
                    this._resetContextKeys();
                }
            },
        };
        this._contextViewService.showContextView(delegate);
        if (position) {
            // Context view takes time to show up, so we need to wait for it to show up before we can set the position
            queueMicrotask(() => {
                this._editorWidget.revealLine(position.lineNumber);
                this._editorWidget.setSelection({
                    startLineNumber: position.lineNumber,
                    startColumn: position.column,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column,
                });
            });
        }
        if (symbol && this._currentProvider) {
            this.showSymbol(this._currentProvider, symbol);
        }
        if (provider instanceof AccessibleContentProvider && provider.onDidRequestClearLastProvider) {
            this._register(provider.onDidRequestClearLastProvider((id) => {
                if (this._lastProvider?.options.id === id) {
                    this._lastProvider = undefined;
                }
            }));
        }
        if (provider.options.id) {
            // only cache a provider with an ID so that it will eventually be cleared.
            this._lastProvider = provider;
        }
        if (provider.id === "panelChat" /* AccessibleViewProviderId.PanelChat */ ||
            provider.id === "quickChat" /* AccessibleViewProviderId.QuickChat */) {
            this._register(this._codeBlockContextProviderService.registerProvider({ getCodeBlockContext: () => this.getCodeBlockContext() }, 'accessibleView'));
        }
        if (provider instanceof ExtensionContentProvider) {
            this._storageService.store(`${ACCESSIBLE_VIEW_SHOWN_STORAGE_PREFIX}${provider.id}`, true, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        }
        if (provider.onDidChangeContent) {
            this._register(provider.onDidChangeContent(() => {
                if (this._viewContainer) {
                    this._render(provider, this._viewContainer, showAccessibleViewHelp);
                }
            }));
        }
    }
    previous() {
        const newContent = this._currentProvider?.providePreviousContent?.();
        if (!this._currentProvider || !this._viewContainer || !newContent) {
            return;
        }
        this._render(this._currentProvider, this._viewContainer, undefined, newContent);
    }
    next() {
        const newContent = this._currentProvider?.provideNextContent?.();
        if (!this._currentProvider || !this._viewContainer || !newContent) {
            return;
        }
        this._render(this._currentProvider, this._viewContainer, undefined, newContent);
    }
    _verbosityEnabled() {
        if (!this._currentProvider) {
            return false;
        }
        return isIAccessibleViewContentProvider(this._currentProvider)
            ? this._configurationService.getValue(this._currentProvider.verbositySettingKey) === true
            : this._storageService.getBoolean(`${ACCESSIBLE_VIEW_SHOWN_STORAGE_PREFIX}${this._currentProvider.id}`, -1 /* StorageScope.APPLICATION */, false);
    }
    goToSymbol() {
        if (!this._currentProvider) {
            return;
        }
        this._isInQuickPick = true;
        this._instantiationService
            .createInstance(AccessibleViewSymbolQuickPick, this)
            .show(this._currentProvider);
    }
    calculateCodeBlocks(markdown) {
        if (!markdown) {
            return;
        }
        if (this._currentProvider?.id !== "panelChat" /* AccessibleViewProviderId.PanelChat */ &&
            this._currentProvider?.id !== "quickChat" /* AccessibleViewProviderId.QuickChat */) {
            return;
        }
        if (this._currentProvider.options.language &&
            this._currentProvider.options.language !== 'markdown') {
            // Symbols haven't been provided and we cannot parse this language
            return;
        }
        const lines = markdown.split('\n');
        this._codeBlocks = [];
        let inBlock = false;
        let startLine = 0;
        let languageId;
        lines.forEach((line, i) => {
            if (!inBlock && line.startsWith('```')) {
                inBlock = true;
                startLine = i + 1;
                languageId = line.substring(3).trim();
            }
            else if (inBlock && line.endsWith('```')) {
                inBlock = false;
                const endLine = i;
                const code = lines.slice(startLine, endLine).join('\n');
                this._codeBlocks?.push({ startLine, endLine, code, languageId });
            }
        });
        this._accessibleViewContainsCodeBlocks.set(this._codeBlocks.length > 0);
    }
    getSymbols() {
        const provider = this._currentProvider ? this._currentProvider : undefined;
        if (!this._currentContent || !provider) {
            return;
        }
        const symbols = 'getSymbols' in provider ? provider.getSymbols?.() || [] : [];
        if (symbols?.length) {
            return symbols;
        }
        if (provider.options.language && provider.options.language !== 'markdown') {
            // Symbols haven't been provided and we cannot parse this language
            return;
        }
        const markdownTokens = marked.marked.lexer(this._currentContent);
        if (!markdownTokens) {
            return;
        }
        this._convertTokensToSymbols(markdownTokens, symbols);
        return symbols.length ? symbols : undefined;
    }
    openHelpLink() {
        if (!this._currentProvider?.options.readMoreUrl) {
            return;
        }
        this._openerService.open(URI.parse(this._currentProvider.options.readMoreUrl));
    }
    configureKeybindings(unassigned) {
        this._isInQuickPick = true;
        const provider = this._updateLastProvider();
        const items = unassigned
            ? provider?.options?.configureKeybindingItems
            : provider?.options?.configuredKeybindingItems;
        if (!items) {
            return;
        }
        const disposables = this._register(new DisposableStore());
        const quickPick = disposables.add(this._quickInputService.createQuickPick());
        quickPick.items = items;
        quickPick.title = localize('keybindings', 'Configure keybindings');
        quickPick.placeholder = localize('selectKeybinding', 'Select a command ID to configure a keybinding for it');
        quickPick.show();
        disposables.add(quickPick.onDidAccept(async () => {
            const item = quickPick.selectedItems[0];
            if (item) {
                await this._commandService.executeCommand('workbench.action.openGlobalKeybindings', item.id);
            }
            quickPick.dispose();
        }));
        disposables.add(quickPick.onDidHide(() => {
            if (!quickPick.selectedItems.length && provider) {
                this.show(provider);
            }
            disposables.dispose();
            this._isInQuickPick = false;
        }));
    }
    _convertTokensToSymbols(tokens, symbols) {
        let firstListItem;
        for (const token of tokens) {
            let label = undefined;
            if ('type' in token) {
                switch (token.type) {
                    case 'heading':
                    case 'paragraph':
                    case 'code':
                        label = token.text;
                        break;
                    case 'list': {
                        const firstItem = token.items[0];
                        if (!firstItem) {
                            break;
                        }
                        firstListItem = `- ${firstItem.text}`;
                        label = token.items.map((i) => i.text).join(', ');
                        break;
                    }
                }
            }
            if (label) {
                symbols.push({
                    markdownToParse: label,
                    label: localize('symbolLabel', '({0}) {1}', token.type, label),
                    ariaLabel: localize('symbolLabelAria', '({0}) {1}', token.type, label),
                    firstListItem,
                });
                firstListItem = undefined;
            }
        }
    }
    showSymbol(provider, symbol) {
        if (!this._currentContent) {
            return;
        }
        let lineNumber = symbol.lineNumber;
        const markdownToParse = symbol.markdownToParse;
        if (lineNumber === undefined && markdownToParse === undefined) {
            // No symbols provided and we cannot parse this language
            return;
        }
        if (lineNumber === undefined && markdownToParse) {
            // Note that this scales poorly, thus isn't used for worst case scenarios like the terminal, for which a line number will always be provided.
            // Parse the markdown to find the line number
            const index = this._currentContent
                .split('\n')
                .findIndex((line) => line.includes(markdownToParse.split('\n')[0]) ||
                (symbol.firstListItem && line.includes(symbol.firstListItem))) ?? -1;
            if (index >= 0) {
                lineNumber = index + 1;
            }
        }
        if (lineNumber === undefined) {
            return;
        }
        this._isInQuickPick = false;
        this.show(provider, undefined, undefined, { lineNumber, column: 1 });
        this._updateContextKeys(provider, true);
    }
    disableHint() {
        if (!isIAccessibleViewContentProvider(this._currentProvider)) {
            return;
        }
        this._configurationService.updateValue(this._currentProvider?.verbositySettingKey, false);
        alert(localize('disableAccessibilityHelp', '{0} accessibility verbosity is now disabled', this._currentProvider.verbositySettingKey));
    }
    _updateContextKeys(provider, shown) {
        if (provider.options.type === "help" /* AccessibleViewType.Help */) {
            this._accessiblityHelpIsShown.set(shown);
            this._accessibleViewIsShown.reset();
        }
        else {
            this._accessibleViewIsShown.set(shown);
            this._accessiblityHelpIsShown.reset();
        }
        this._accessibleViewSupportsNavigation.set(provider.provideNextContent !== undefined || provider.providePreviousContent !== undefined);
        this._accessibleViewVerbosityEnabled.set(this._verbosityEnabled());
        this._accessibleViewGoToSymbolSupported.set(this._goToSymbolsSupported() ? this.getSymbols()?.length > 0 : false);
    }
    _updateContent(provider, updatedContent) {
        let content = updatedContent ?? provider.provideContent();
        if (provider.options.type === "view" /* AccessibleViewType.View */) {
            this._currentContent = content;
            this._hasUnassignedKeybindings.reset();
            this._hasAssignedKeybindings.reset();
            return;
        }
        const readMoreLinkHint = this._readMoreHint(provider);
        const disableHelpHint = this._disableVerbosityHint(provider);
        const screenReaderModeHint = this._screenReaderModeHint(provider);
        const exitThisDialogHint = this._exitDialogHint(provider);
        let configureKbHint = '';
        let configureAssignedKbHint = '';
        const resolvedContent = resolveContentAndKeybindingItems(this._keybindingService, screenReaderModeHint + content + readMoreLinkHint + disableHelpHint + exitThisDialogHint);
        if (resolvedContent) {
            content = resolvedContent.content.value;
            if (resolvedContent.configureKeybindingItems) {
                provider.options.configureKeybindingItems = resolvedContent.configureKeybindingItems;
                this._hasUnassignedKeybindings.set(true);
                configureKbHint = this._configureUnassignedKbHint();
            }
            else {
                this._hasAssignedKeybindings.reset();
            }
            if (resolvedContent.configuredKeybindingItems) {
                provider.options.configuredKeybindingItems = resolvedContent.configuredKeybindingItems;
                this._hasAssignedKeybindings.set(true);
                configureAssignedKbHint = this._configureAssignedKbHint();
            }
            else {
                this._hasAssignedKeybindings.reset();
            }
        }
        this._currentContent = content + configureKbHint + configureAssignedKbHint;
    }
    _render(provider, container, showAccessibleViewHelp, updatedContent) {
        this._currentProvider = provider;
        this._accessibleViewCurrentProviderId.set(provider.id);
        const verbose = this._verbosityEnabled();
        this._updateContent(provider, updatedContent);
        this.calculateCodeBlocks(this._currentContent);
        this._updateContextKeys(provider, true);
        const widgetIsFocused = this._editorWidget.hasTextFocus() || this._editorWidget.hasWidgetFocus();
        this._getTextModel(URI.from({
            path: `accessible-view-${provider.id}`,
            scheme: Schemas.accessibleView,
            fragment: this._currentContent,
        })).then((model) => {
            if (!model) {
                return;
            }
            this._editorWidget.setModel(model);
            const domNode = this._editorWidget.getDomNode();
            if (!domNode) {
                return;
            }
            model.setLanguage(provider.options.language ?? 'markdown');
            container.appendChild(this._container);
            let actionsHint = '';
            const hasActions = this._accessibleViewSupportsNavigation.get() ||
                this._accessibleViewVerbosityEnabled.get() ||
                this._accessibleViewGoToSymbolSupported.get() ||
                provider.actions?.length;
            if (verbose && !showAccessibleViewHelp && hasActions) {
                actionsHint = provider.options.position
                    ? localize('ariaAccessibleViewActionsBottom', 'Explore actions such as disabling this hint (Shift+Tab), use Escape to exit this dialog.')
                    : localize('ariaAccessibleViewActions', 'Explore actions such as disabling this hint (Shift+Tab).');
            }
            let ariaLabel = provider.options.type === "help" /* AccessibleViewType.Help */
                ? localize('accessibility-help', 'Accessibility Help')
                : localize('accessible-view', 'Accessible View');
            this._title.textContent = ariaLabel;
            if (actionsHint && provider.options.type === "view" /* AccessibleViewType.View */) {
                ariaLabel = localize('accessible-view-hint', 'Accessible View, {0}', actionsHint);
            }
            else if (actionsHint) {
                ariaLabel = localize('accessibility-help-hint', 'Accessibility Help, {0}', actionsHint);
            }
            if (isWindows && widgetIsFocused) {
                // prevent the screen reader on windows from reading
                // the aria label again when it's refocused
                ariaLabel = '';
            }
            this._editorWidget.updateOptions({ ariaLabel });
            this._editorWidget.focus();
            if (this._currentProvider?.options.position) {
                const position = this._editorWidget.getPosition();
                const isDefaultPosition = position?.lineNumber === 1 && position.column === 1;
                if (this._currentProvider.options.position === 'bottom' ||
                    (this._currentProvider.options.position === 'initial-bottom' && isDefaultPosition)) {
                    const lastLine = this.editorWidget.getModel()?.getLineCount();
                    const position = lastLine !== undefined && lastLine > 0 ? new Position(lastLine, 1) : undefined;
                    if (position) {
                        this._editorWidget.setPosition(position);
                        this._editorWidget.revealLine(position.lineNumber);
                    }
                }
            }
        });
        this._updateToolbar(this._currentProvider.actions, provider.options.type);
        const hide = (e) => {
            if (!this._isInQuickPick) {
                provider.onClose();
            }
            e?.stopPropagation();
            this._contextViewService.hideContextView();
            if (this._isInQuickPick) {
                return;
            }
            this._updateContextKeys(provider, false);
            this._lastProvider = undefined;
            this._currentContent = undefined;
            this._currentProvider?.dispose();
            this._currentProvider = undefined;
        };
        const disposableStore = new DisposableStore();
        disposableStore.add(this._editorWidget.onKeyDown((e) => {
            if (e.keyCode === 3 /* KeyCode.Enter */) {
                this._commandService.executeCommand('editor.action.openLink');
            }
            else if (e.keyCode === 9 /* KeyCode.Escape */ ||
                shouldHide(e.browserEvent, this._keybindingService, this._configurationService)) {
                hide(e);
            }
            else if (e.keyCode === 38 /* KeyCode.KeyH */ && provider.options.readMoreUrl) {
                const url = provider.options.readMoreUrl;
                alert(AccessibilityHelpNLS.openingDocs);
                this._openerService.open(URI.parse(url));
                e.preventDefault();
                e.stopPropagation();
            }
            if (provider instanceof AccessibleContentProvider) {
                provider.onKeyDown?.(e);
            }
        }));
        disposableStore.add(addDisposableListener(this._toolbar.getElement(), EventType.KEY_DOWN, (e) => {
            const keyboardEvent = new StandardKeyboardEvent(e);
            if (keyboardEvent.equals(9 /* KeyCode.Escape */)) {
                hide(e);
            }
        }));
        disposableStore.add(this._editorWidget.onDidBlurEditorWidget(() => {
            if (!isActiveElement(this._toolbar.getElement())) {
                hide();
            }
        }));
        disposableStore.add(this._editorWidget.onDidContentSizeChange(() => this._layout()));
        disposableStore.add(this._layoutService.onDidLayoutActiveContainer(() => this._layout()));
        return disposableStore;
    }
    _updateToolbar(providedActions, type) {
        this._toolbar.setAriaLabel(type === "help" /* AccessibleViewType.Help */
            ? localize('accessibleHelpToolbar', 'Accessibility Help')
            : localize('accessibleViewToolbar', 'Accessible View'));
        const toolbarMenu = this._register(this._menuService.createMenu(MenuId.AccessibleView, this._contextKeyService));
        const menuActions = getFlatActionBarActions(toolbarMenu.getActions({}));
        if (providedActions) {
            for (const providedAction of providedActions) {
                providedAction.class =
                    providedAction.class || ThemeIcon.asClassName(Codicon.primitiveSquare);
                providedAction.checked = undefined;
            }
            this._toolbar.setActions([...providedActions, ...menuActions]);
        }
        else {
            this._toolbar.setActions(menuActions);
        }
    }
    _layout() {
        const dimension = this._layoutService.activeContainerDimension;
        const maxHeight = dimension.height && dimension.height * 0.4;
        const height = Math.min(maxHeight, this._editorWidget.getContentHeight());
        const width = Math.min(dimension.width * 0.62 /* golden cut */, 600 /* DIMENSIONS.MAX_WIDTH */);
        this._editorWidget.layout({ width, height });
    }
    async _getTextModel(resource) {
        const existing = this._modelService.getModel(resource);
        if (existing && !existing.isDisposed()) {
            return existing;
        }
        return this._modelService.createModel(resource.fragment, null, resource, false);
    }
    _goToSymbolsSupported() {
        if (!this._currentProvider) {
            return false;
        }
        return (this._currentProvider.options.type === "help" /* AccessibleViewType.Help */ ||
            this._currentProvider.options.language === 'markdown' ||
            this._currentProvider.options.language === undefined ||
            (this._currentProvider instanceof AccessibleContentProvider &&
                !!this._currentProvider.getSymbols?.()));
    }
    _updateLastProvider() {
        const provider = this._currentProvider;
        if (!provider) {
            return;
        }
        const lastProvider = provider instanceof AccessibleContentProvider
            ? new AccessibleContentProvider(provider.id, provider.options, provider.provideContent.bind(provider), provider.onClose.bind(provider), provider.verbositySettingKey, provider.onOpen?.bind(provider), provider.actions, provider.provideNextContent?.bind(provider), provider.providePreviousContent?.bind(provider), provider.onDidChangeContent?.bind(provider), provider.onKeyDown?.bind(provider), provider.getSymbols?.bind(provider))
            : new ExtensionContentProvider(provider.id, provider.options, provider.provideContent.bind(provider), provider.onClose.bind(provider), provider.onOpen?.bind(provider), provider.provideNextContent?.bind(provider), provider.providePreviousContent?.bind(provider), provider.actions, provider.onDidChangeContent?.bind(provider));
        return lastProvider;
    }
    showAccessibleViewHelp() {
        const lastProvider = this._updateLastProvider();
        if (!lastProvider) {
            return;
        }
        let accessibleViewHelpProvider;
        if (lastProvider instanceof AccessibleContentProvider) {
            accessibleViewHelpProvider = new AccessibleContentProvider(lastProvider.id, { type: "help" /* AccessibleViewType.Help */ }, () => lastProvider.options.customHelp
                ? lastProvider?.options.customHelp()
                : this._accessibleViewHelpDialogContent(this._goToSymbolsSupported()), () => {
                this._contextViewService.hideContextView();
                // HACK: Delay to allow the context view to hide #207638
                queueMicrotask(() => this.show(lastProvider));
            }, lastProvider.verbositySettingKey);
        }
        else {
            accessibleViewHelpProvider = new ExtensionContentProvider(lastProvider.id, { type: "help" /* AccessibleViewType.Help */ }, () => lastProvider.options.customHelp
                ? lastProvider?.options.customHelp()
                : this._accessibleViewHelpDialogContent(this._goToSymbolsSupported()), () => {
                this._contextViewService.hideContextView();
                // HACK: Delay to allow the context view to hide #207638
                queueMicrotask(() => this.show(lastProvider));
            });
        }
        this._contextViewService.hideContextView();
        // HACK: Delay to allow the context view to hide #186514
        if (accessibleViewHelpProvider) {
            queueMicrotask(() => this.show(accessibleViewHelpProvider, undefined, true));
        }
    }
    _accessibleViewHelpDialogContent(providerHasSymbols) {
        const navigationHint = this._navigationHint();
        const goToSymbolHint = this._goToSymbolHint(providerHasSymbols);
        const toolbarHint = localize('toolbar', 'Navigate to the toolbar (Shift+Tab).');
        const chatHints = this._getChatHints();
        let hint = localize('intro', 'In the accessible view, you can:\n');
        if (navigationHint) {
            hint += ' - ' + navigationHint + '\n';
        }
        if (goToSymbolHint) {
            hint += ' - ' + goToSymbolHint + '\n';
        }
        if (toolbarHint) {
            hint += ' - ' + toolbarHint + '\n';
        }
        if (chatHints) {
            hint += chatHints;
        }
        return hint;
    }
    _getChatHints() {
        if (this._currentProvider?.id !== "panelChat" /* AccessibleViewProviderId.PanelChat */ &&
            this._currentProvider?.id !== "quickChat" /* AccessibleViewProviderId.QuickChat */) {
            return;
        }
        return [
            localize('insertAtCursor', ' - Insert the code block at the cursor{0}.', '<keybinding:workbench.action.chat.insertCodeBlock>'),
            localize('insertIntoNewFile', ' - Insert the code block into a new file{0}.', '<keybinding:workbench.action.chat.insertIntoNewFile>'),
            localize('runInTerminal', ' - Run the code block in the terminal{0}.\n', '<keybinding:workbench.action.chat.runInTerminal>'),
        ].join('\n');
    }
    _navigationHint() {
        return localize('accessibleViewNextPreviousHint', 'Show the next item{0} or previous item{1}.', `<keybinding:${"editor.action.accessibleViewNext" /* AccessibilityCommandId.ShowNext */}`, `<keybinding:${"editor.action.accessibleViewPrevious" /* AccessibilityCommandId.ShowPrevious */}>`);
    }
    _disableVerbosityHint(provider) {
        if (provider.options.type === "help" /* AccessibleViewType.Help */ && this._verbosityEnabled()) {
            return localize('acessibleViewDisableHint', '\nDisable accessibility verbosity for this feature{0}.', `<keybinding:${"editor.action.accessibleViewDisableHint" /* AccessibilityCommandId.DisableVerbosityHint */}>`);
        }
        return '';
    }
    _goToSymbolHint(providerHasSymbols) {
        if (!providerHasSymbols) {
            return;
        }
        return localize('goToSymbolHint', 'Go to a symbol{0}.', `<keybinding:${"editor.action.accessibleViewGoToSymbol" /* AccessibilityCommandId.GoToSymbol */}>`);
    }
    _configureUnassignedKbHint() {
        const configureKb = this._keybindingService
            .lookupKeybinding("editor.action.accessibilityHelpConfigureKeybindings" /* AccessibilityCommandId.AccessibilityHelpConfigureKeybindings */)
            ?.getAriaLabel();
        const keybindingToConfigureQuickPick = configureKb
            ? '(' + configureKb + ')'
            : 'by assigning a keybinding to the command Accessibility Help Configure Unassigned Keybindings.';
        return localize('configureKb', '\nConfigure keybindings for commands that lack them {0}.', keybindingToConfigureQuickPick);
    }
    _configureAssignedKbHint() {
        const configureKb = this._keybindingService
            .lookupKeybinding("editor.action.accessibilityHelpConfigureAssignedKeybindings" /* AccessibilityCommandId.AccessibilityHelpConfigureAssignedKeybindings */)
            ?.getAriaLabel();
        const keybindingToConfigureQuickPick = configureKb
            ? '(' + configureKb + ')'
            : 'by assigning a keybinding to the command Accessibility Help Configure Assigned Keybindings.';
        return localize('configureKbAssigned', '\nConfigure keybindings for commands that already have assignments {0}.', keybindingToConfigureQuickPick);
    }
    _screenReaderModeHint(provider) {
        const accessibilitySupport = this._accessibilityService.isScreenReaderOptimized();
        let screenReaderModeHint = '';
        const turnOnMessage = isMacintosh
            ? AccessibilityHelpNLS.changeConfigToOnMac
            : AccessibilityHelpNLS.changeConfigToOnWinLinux;
        if (accessibilitySupport && provider.id === "editor" /* AccessibleViewProviderId.Editor */) {
            screenReaderModeHint = AccessibilityHelpNLS.auto_on;
            screenReaderModeHint += '\n';
        }
        else if (!accessibilitySupport) {
            screenReaderModeHint = AccessibilityHelpNLS.auto_off + '\n' + turnOnMessage;
            screenReaderModeHint += '\n';
        }
        return screenReaderModeHint;
    }
    _exitDialogHint(provider) {
        return this._verbosityEnabled() && !provider.options.position
            ? localize('exit', '\nExit this dialog (Escape).')
            : '';
    }
    _readMoreHint(provider) {
        return provider.options.readMoreUrl
            ? localize('openDoc', '\nOpen a browser window with more information related to accessibility{0}.', `<keybinding:${"editor.action.accessibilityHelpOpenHelpLink" /* AccessibilityCommandId.AccessibilityHelpOpenHelpLink */}>`)
            : '';
    }
};
AccessibleView = __decorate([
    __param(0, IOpenerService),
    __param(1, IInstantiationService),
    __param(2, IConfigurationService),
    __param(3, IModelService),
    __param(4, IContextViewService),
    __param(5, IContextKeyService),
    __param(6, IAccessibilityService),
    __param(7, IKeybindingService),
    __param(8, ILayoutService),
    __param(9, IMenuService),
    __param(10, ICommandService),
    __param(11, IChatCodeBlockContextProviderService),
    __param(12, IStorageService),
    __param(13, ITextModelService),
    __param(14, IQuickInputService)
], AccessibleView);
export { AccessibleView };
let AccessibleViewService = class AccessibleViewService extends Disposable {
    constructor(_instantiationService, _configurationService, _keybindingService) {
        super();
        this._instantiationService = _instantiationService;
        this._configurationService = _configurationService;
        this._keybindingService = _keybindingService;
    }
    show(provider, position) {
        if (!this._accessibleView) {
            this._accessibleView = this._register(this._instantiationService.createInstance(AccessibleView));
        }
        this._accessibleView.show(provider, undefined, undefined, position);
    }
    configureKeybindings(unassigned) {
        this._accessibleView?.configureKeybindings(unassigned);
    }
    openHelpLink() {
        this._accessibleView?.openHelpLink();
    }
    showLastProvider(id) {
        this._accessibleView?.showLastProvider(id);
    }
    next() {
        this._accessibleView?.next();
    }
    previous() {
        this._accessibleView?.previous();
    }
    goToSymbol() {
        this._accessibleView?.goToSymbol();
    }
    getOpenAriaHint(verbositySettingKey) {
        if (!this._configurationService.getValue(verbositySettingKey)) {
            return null;
        }
        const keybinding = this._keybindingService
            .lookupKeybinding("editor.action.accessibleView" /* AccessibilityCommandId.OpenAccessibleView */)
            ?.getAriaLabel();
        let hint = null;
        if (keybinding) {
            hint = localize('acessibleViewHint', 'Inspect this in the accessible view with {0}', keybinding);
        }
        else {
            hint = localize('acessibleViewHintNoKbEither', 'Inspect this in the accessible view via the command Open Accessible View which is currently not triggerable via keybinding.');
        }
        return hint;
    }
    disableHint() {
        this._accessibleView?.disableHint();
    }
    showAccessibleViewHelp() {
        this._accessibleView?.showAccessibleViewHelp();
    }
    getPosition(id) {
        return this._accessibleView?.getPosition(id) ?? undefined;
    }
    getLastPosition() {
        const lastLine = this._accessibleView?.editorWidget.getModel()?.getLineCount();
        return lastLine !== undefined && lastLine > 0 ? new Position(lastLine, 1) : undefined;
    }
    setPosition(position, reveal, select) {
        this._accessibleView?.setPosition(position, reveal, select);
    }
    getCodeBlockContext() {
        return this._accessibleView?.getCodeBlockContext();
    }
    navigateToCodeBlock(type) {
        this._accessibleView?.navigateToCodeBlock(type);
    }
};
AccessibleViewService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IConfigurationService),
    __param(2, IKeybindingService)
], AccessibleViewService);
export { AccessibleViewService };
let AccessibleViewSymbolQuickPick = class AccessibleViewSymbolQuickPick {
    constructor(_accessibleView, _quickInputService) {
        this._accessibleView = _accessibleView;
        this._quickInputService = _quickInputService;
    }
    show(provider) {
        const disposables = new DisposableStore();
        const quickPick = disposables.add(this._quickInputService.createQuickPick());
        quickPick.placeholder = localize('accessibleViewSymbolQuickPickPlaceholder', 'Type to search symbols');
        quickPick.title = localize('accessibleViewSymbolQuickPickTitle', 'Go to Symbol Accessible View');
        const picks = [];
        const symbols = this._accessibleView.getSymbols();
        if (!symbols) {
            return;
        }
        for (const symbol of symbols) {
            picks.push({
                label: symbol.label,
                ariaLabel: symbol.ariaLabel,
                firstListItem: symbol.firstListItem,
                lineNumber: symbol.lineNumber,
                endLineNumber: symbol.endLineNumber,
                markdownToParse: symbol.markdownToParse,
            });
        }
        quickPick.canSelectMany = false;
        quickPick.items = picks;
        quickPick.show();
        disposables.add(quickPick.onDidAccept(() => {
            this._accessibleView.showSymbol(provider, quickPick.selectedItems[0]);
            quickPick.hide();
        }));
        disposables.add(quickPick.onDidHide(() => {
            if (quickPick.selectedItems.length === 0) {
                // this was escaped, so refocus the accessible view
                this._accessibleView.show(provider);
            }
            disposables.dispose();
        }));
    }
};
AccessibleViewSymbolQuickPick = __decorate([
    __param(1, IQuickInputService)
], AccessibleViewSymbolQuickPick);
function shouldHide(event, keybindingService, configurationService) {
    if (!configurationService.getValue("accessibility.accessibleView.closeOnKeyPress" /* AccessibilityWorkbenchSettingId.AccessibleViewCloseOnKeyPress */)) {
        return false;
    }
    const standardKeyboardEvent = new StandardKeyboardEvent(event);
    const resolveResult = keybindingService.softDispatch(standardKeyboardEvent, standardKeyboardEvent.target);
    const isValidChord = resolveResult.kind === 1 /* ResultKind.MoreChordsNeeded */;
    if (keybindingService.inChordMode || isValidChord) {
        return false;
    }
    return (shouldHandleKey(event) && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey);
}
function shouldHandleKey(event) {
    return !!event.code.match(/^(Key[A-Z]|Digit[0-9]|Equal|Comma|Period|Slash|Quote|Backquote|Backslash|Minus|Semicolon|Space|Enter)$/);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJsZVZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FjY2Vzc2liaWxpdHkvYnJvd3Nlci9hY2Nlc3NpYmxlVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04sU0FBUyxFQUNULHFCQUFxQixFQUNyQixlQUFlLEVBQ2YsZUFBZSxHQUNmLE1BQU0saUNBQWlDLENBQUE7QUFDeEMsT0FBTyxFQUFrQixxQkFBcUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBRWpHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFN0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRixPQUFPLEtBQUssTUFBTSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDNUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUVwRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUN6RixPQUFPLEVBQ04sZ0JBQWdCLEdBRWhCLE1BQU0sa0VBQWtFLENBQUE7QUFDekUsT0FBTyxFQUFhLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRWhGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNyRixPQUFPLEVB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