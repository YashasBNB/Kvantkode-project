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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJsZVZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9hY2Nlc3NpYmlsaXR5L2Jyb3dzZXIvYWNjZXNzaWJsZVZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLFNBQVMsRUFDVCxxQkFBcUIsRUFDckIsZUFBZSxFQUNmLGVBQWUsR0FDZixNQUFNLGlDQUFpQyxDQUFBO0FBQ3hDLE9BQU8sRUFBa0IscUJBQXFCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUVqRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRTdELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFDL0YsT0FBTyxLQUFLLE1BQU0sTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFcEQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDekYsT0FBTyxFQUNOLGdCQUFnQixHQUVoQixNQUFNLGtFQUFrRSxDQUFBO0FBQ3pFLE9BQU8sRUFBYSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUVoRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDckYsT0FBTyxFQUFFLG9C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