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
import './codeBlockPart.css';
import * as dom from '../../../../base/browser/dom.js';
import { renderFormattedText } from '../../../../base/browser/formattedTextRenderer.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { combinedDisposable, Disposable, MutableDisposable, } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { isEqual } from '../../../../base/common/resources.js';
import { assertType } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { EditorExtensionsRegistry } from '../../../../editor/browser/editorExtensions.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { CodeEditorWidget, } from '../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { DiffEditorWidget } from '../../../../editor/browser/widget/diffEditor/diffEditorWidget.js';
import { EDITOR_FONT_DEFAULTS, } from '../../../../editor/common/config/editorOptions.js';
import { Range } from '../../../../editor/common/core/range.js';
import { TextEdit } from '../../../../editor/common/languages.js';
import { TextModelText } from '../../../../editor/common/model/textModelText.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { DefaultModelSHA1Computer } from '../../../../editor/common/services/modelService.js';
import { ITextModelService, } from '../../../../editor/common/services/resolverService.js';
import { BracketMatchingController } from '../../../../editor/contrib/bracketMatching/browser/bracketMatching.js';
import { ColorDetector } from '../../../../editor/contrib/colorPicker/browser/colorDetector.js';
import { ContextMenuController } from '../../../../editor/contrib/contextmenu/browser/contextmenu.js';
import { GotoDefinitionAtPositionEditorContribution } from '../../../../editor/contrib/gotoSymbol/browser/link/goToDefinitionAtPosition.js';
import { ContentHoverController } from '../../../../editor/contrib/hover/browser/contentHoverController.js';
import { GlyphHoverController } from '../../../../editor/contrib/hover/browser/glyphHoverController.js';
import { LinkDetector } from '../../../../editor/contrib/links/browser/links.js';
import { MessageController } from '../../../../editor/contrib/message/browser/messageController.js';
import { ViewportSemanticTokensContribution } from '../../../../editor/contrib/semanticTokens/browser/viewportSemanticTokens.js';
import { SmartSelectController } from '../../../../editor/contrib/smartSelect/browser/smartSelect.js';
import { WordHighlighterContribution } from '../../../../editor/contrib/wordHighlighter/browser/wordHighlighter.js';
import { localize } from '../../../../nls.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { MenuWorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { FileKind } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ResourceLabel } from '../../../browser/labels.js';
import { ResourceContextKey } from '../../../common/contextkeys.js';
import { InspectEditorTokensController } from '../../codeEditor/browser/inspectEditorTokens/inspectEditorTokens.js';
import { MenuPreventer } from '../../codeEditor/browser/menuPreventer.js';
import { SelectionClipboardContributionID } from '../../codeEditor/browser/selectionClipboard.js';
import { getSimpleEditorOptions } from '../../codeEditor/browser/simpleEditorOptions.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { isResponseVM } from '../common/chatViewModel.js';
import { emptyProgressRunner, IEditorProgressService, } from '../../../../platform/progress/common/progress.js';
import { SuggestController } from '../../../../editor/contrib/suggest/browser/suggestController.js';
import { SnippetController2 } from '../../../../editor/contrib/snippet/browser/snippetController2.js';
const $ = dom.$;
/**
 * Special markdown code block language id used to render a local file.
 *
 * The text of the code path should be a {@link LocalFileCodeBlockData} json object.
 */
export const localFileLanguageId = 'vscode-local-file';
export function parseLocalFileData(text) {
    let data;
    try {
        data = JSON.parse(text);
    }
    catch (e) {
        throw new Error('Could not parse code block local file data');
    }
    let uri;
    try {
        uri = URI.revive(data?.uri);
    }
    catch (e) {
        throw new Error('Invalid code block local file data URI');
    }
    let range;
    if (data.range) {
        // Note that since this is coming from extensions, position are actually zero based and must be converted.
        range = new Range(data.range.startLineNumber + 1, data.range.startColumn + 1, data.range.endLineNumber + 1, data.range.endColumn + 1);
    }
    return { uri, range };
}
const defaultCodeblockPadding = 10;
let CodeBlockPart = class CodeBlockPart extends Disposable {
    get verticalPadding() {
        return this.currentCodeBlockData?.renderOptions?.verticalPadding ?? defaultCodeblockPadding;
    }
    constructor(editorOptions, menuId, delegate, overflowWidgetsDomNode, instantiationService, contextKeyService, modelService, configurationService, accessibilityService) {
        super();
        this.editorOptions = editorOptions;
        this.menuId = menuId;
        this.modelService = modelService;
        this.configurationService = configurationService;
        this.accessibilityService = accessibilityService;
        this._onDidChangeContentHeight = this._register(new Emitter());
        this.onDidChangeContentHeight = this._onDidChangeContentHeight.event;
        this.currentScrollWidth = 0;
        this.isDisposed = false;
        this.element = $('.interactive-result-code-block');
        this.resourceContextKey = this._register(instantiationService.createInstance(ResourceContextKey));
        this.contextKeyService = this._register(contextKeyService.createScoped(this.element));
        const scopedInstantiationService = this._register(instantiationService.createChild(new ServiceCollection([IContextKeyService, this.contextKeyService])));
        const editorElement = dom.append(this.element, $('.interactive-result-editor'));
        this.editor = this.createEditor(scopedInstantiationService, editorElement, {
            ...getSimpleEditorOptions(this.configurationService),
            readOnly: true,
            lineNumbers: 'off',
            selectOnLineNumbers: true,
            scrollBeyondLastLine: false,
            lineDecorationsWidth: 8,
            dragAndDrop: false,
            padding: { top: this.verticalPadding, bottom: this.verticalPadding },
            mouseWheelZoom: false,
            scrollbar: {
                vertical: 'hidden',
                alwaysConsumeMouseWheel: false,
            },
            definitionLinkOpensInPeek: false,
            gotoLocation: {
                multiple: 'goto',
                multipleDeclarations: 'goto',
                multipleDefinitions: 'goto',
                multipleImplementations: 'goto',
            },
            ariaLabel: localize('chat.codeBlockHelp', 'Code block'),
            overflowWidgetsDomNode,
            ...this.getEditorOptionsFromConfig(),
        });
        const toolbarElement = dom.append(this.element, $('.interactive-result-code-block-toolbar'));
        const editorScopedService = this.editor.contextKeyService.createScoped(toolbarElement);
        const editorScopedInstantiationService = this._register(scopedInstantiationService.createChild(new ServiceCollection([IContextKeyService, editorScopedService])));
        this.toolbar = this._register(editorScopedInstantiationService.createInstance(MenuWorkbenchToolBar, toolbarElement, menuId, {
            menuOptions: {
                shouldForwardArgs: true,
            },
        }));
        const vulnsContainer = dom.append(this.element, $('.interactive-result-vulns'));
        const vulnsHeaderElement = dom.append(vulnsContainer, $('.interactive-result-vulns-header', undefined));
        this.vulnsButton = this._register(new Button(vulnsHeaderElement, {
            buttonBackground: undefined,
            buttonBorder: undefined,
            buttonForeground: undefined,
            buttonHoverBackground: undefined,
            buttonSecondaryBackground: undefined,
            buttonSecondaryForeground: undefined,
            buttonSecondaryHoverBackground: undefined,
            buttonSeparator: undefined,
            supportIcons: true,
        }));
        this.vulnsListElement = dom.append(vulnsContainer, $('ul.interactive-result-vulns-list'));
        this._register(this.vulnsButton.onDidClick(() => {
            const element = this.currentCodeBlockData.element;
            element.vulnerabilitiesListExpanded = !element.vulnerabilitiesListExpanded;
            this.vulnsButton.label = this.getVulnerabilitiesLabel();
            this.element.classList.toggle('chat-vulnerabilities-collapsed', !element.vulnerabilitiesListExpanded);
            this._onDidChangeContentHeight.fire();
            // this.updateAriaLabel(collapseButton.element, referencesLabel, element.usedReferencesExpanded);
        }));
        this._register(this.toolbar.onDidChangeDropdownVisibility((e) => {
            toolbarElement.classList.toggle('force-visibility', e);
        }));
        this._configureForScreenReader();
        this._register(this.accessibilityService.onDidChangeScreenReaderOptimized(() => this._configureForScreenReader()));
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectedKeys.has("accessibility.verbosity.panelChat" /* AccessibilityVerbositySettingId.Chat */)) {
                this._configureForScreenReader();
            }
        }));
        this._register(this.editorOptions.onDidChange(() => {
            this.editor.updateOptions(this.getEditorOptionsFromConfig());
        }));
        this._register(this.editor.onDidScrollChange((e) => {
            this.currentScrollWidth = e.scrollWidth;
        }));
        this._register(this.editor.onDidContentSizeChange((e) => {
            if (e.contentHeightChanged) {
                this._onDidChangeContentHeight.fire();
            }
        }));
        this._register(this.editor.onDidBlurEditorWidget(() => {
            this.element.classList.remove('focused');
            WordHighlighterContribution.get(this.editor)?.stopHighlighting();
            this.clearWidgets();
        }));
        this._register(this.editor.onDidFocusEditorWidget(() => {
            this.element.classList.add('focused');
            WordHighlighterContribution.get(this.editor)?.restoreViewState(true);
        }));
        // Parent list scrolled
        if (delegate.onDidScroll) {
            this._register(delegate.onDidScroll((e) => {
                this.clearWidgets();
            }));
        }
    }
    dispose() {
        this.isDisposed = true;
        super.dispose();
    }
    get uri() {
        return this.editor.getModel()?.uri;
    }
    createEditor(instantiationService, parent, options) {
        return this._register(instantiationService.createInstance(CodeEditorWidget, parent, options, {
            isSimpleWidget: false,
            contributions: EditorExtensionsRegistry.getSomeEditorContributions([
                MenuPreventer.ID,
                SelectionClipboardContributionID,
                ContextMenuController.ID,
                WordHighlighterContribution.ID,
                ViewportSemanticTokensContribution.ID,
                BracketMatchingController.ID,
                SmartSelectController.ID,
                ContentHoverController.ID,
                GlyphHoverController.ID,
                MessageController.ID,
                GotoDefinitionAtPositionEditorContribution.ID,
                SuggestController.ID,
                SnippetController2.ID,
                ColorDetector.ID,
                LinkDetector.ID,
                InspectEditorTokensController.ID,
            ]),
        }));
    }
    focus() {
        this.editor.focus();
    }
    updatePaddingForLayout() {
        // scrollWidth = "the width of the content that needs to be scrolled"
        // contentWidth = "the width of the area where content is displayed"
        const horizontalScrollbarVisible = this.currentScrollWidth > this.editor.getLayoutInfo().contentWidth;
        const scrollbarHeight = this.editor.getLayoutInfo().horizontalScrollbarHeight;
        const bottomPadding = horizontalScrollbarVisible
            ? Math.max(this.verticalPadding - scrollbarHeight, 2)
            : this.verticalPadding;
        this.editor.updateOptions({ padding: { top: this.verticalPadding, bottom: bottomPadding } });
    }
    _configureForScreenReader() {
        const toolbarElt = this.toolbar.getElement();
        if (this.accessibilityService.isScreenReaderOptimized()) {
            toolbarElt.style.display = 'block';
            toolbarElt.ariaLabel = this.configurationService.getValue("accessibility.verbosity.panelChat" /* AccessibilityVerbositySettingId.Chat */)
                ? localize('chat.codeBlock.toolbarVerbose', 'Toolbar for code block which can be reached via tab')
                : localize('chat.codeBlock.toolbar', 'Code block toolbar');
        }
        else {
            toolbarElt.style.display = '';
        }
    }
    getEditorOptionsFromConfig() {
        return {
            wordWrap: this.editorOptions.configuration.resultEditor.wordWrap,
            fontLigatures: this.editorOptions.configuration.resultEditor.fontLigatures,
            bracketPairColorization: this.editorOptions.configuration.resultEditor.bracketPairColorization,
            fontFamily: this.editorOptions.configuration.resultEditor.fontFamily === 'default'
                ? EDITOR_FONT_DEFAULTS.fontFamily
                : this.editorOptions.configuration.resultEditor.fontFamily,
            fontSize: this.editorOptions.configuration.resultEditor.fontSize,
            fontWeight: this.editorOptions.configuration.resultEditor.fontWeight,
            lineHeight: this.editorOptions.configuration.resultEditor.lineHeight,
            ...this.currentCodeBlockData?.renderOptions?.editorOptions,
        };
    }
    layout(width) {
        const contentHeight = this.getContentHeight();
        let height = contentHeight;
        if (this.currentCodeBlockData?.renderOptions?.maxHeightInLines) {
            height = Math.min(contentHeight, this.editor.getOption(68 /* EditorOption.lineHeight */) *
                this.currentCodeBlockData?.renderOptions?.maxHeightInLines);
        }
        const editorBorder = 2;
        width = width - editorBorder - (this.currentCodeBlockData?.renderOptions?.reserveWidth ?? 0);
        this.editor.layout({ width, height });
        this.updatePaddingForLayout();
    }
    getContentHeight() {
        if (this.currentCodeBlockData?.range) {
            const lineCount = this.currentCodeBlockData.range.endLineNumber -
                this.currentCodeBlockData.range.startLineNumber +
                1;
            const lineHeight = this.editor.getOption(68 /* EditorOption.lineHeight */);
            return lineCount * lineHeight;
        }
        return this.editor.getContentHeight();
    }
    async render(data, width) {
        this.currentCodeBlockData = data;
        if (data.parentContextKeyService) {
            this.contextKeyService.updateParent(data.parentContextKeyService);
        }
        if (this.getEditorOptionsFromConfig().wordWrap === 'on') {
            // Initialize the editor with the new proper width so that getContentHeight
            // will be computed correctly in the next call to layout()
            this.layout(width);
        }
        await this.updateEditor(data);
        if (this.isDisposed) {
            return;
        }
        this.editor.updateOptions({
            ...this.getEditorOptionsFromConfig(),
            ariaLabel: localize('chat.codeBlockLabel', 'Code block {0}', data.codeBlockIndex + 1),
        });
        this.layout(width);
        this.toolbar.setAriaLabel(localize('chat.codeBlockToolbarLabel', 'Code block {0}', data.codeBlockIndex + 1));
        if (data.renderOptions?.hideToolbar) {
            dom.hide(this.toolbar.getElement());
        }
        else {
            dom.show(this.toolbar.getElement());
        }
        if (data.vulns?.length && isResponseVM(data.element)) {
            dom.clearNode(this.vulnsListElement);
            this.element.classList.remove('no-vulns');
            this.element.classList.toggle('chat-vulnerabilities-collapsed', !data.element.vulnerabilitiesListExpanded);
            dom.append(this.vulnsListElement, ...data.vulns.map((v) => $('li', undefined, $('span.chat-vuln-title', undefined, v.title), ' ' + v.description)));
            this.vulnsButton.label = this.getVulnerabilitiesLabel();
        }
        else {
            this.element.classList.add('no-vulns');
        }
    }
    reset() {
        this.clearWidgets();
    }
    clearWidgets() {
        ContentHoverController.get(this.editor)?.hideContentHover();
        GlyphHoverController.get(this.editor)?.hideGlyphHover();
    }
    async updateEditor(data) {
        const textModel = await data.textModel;
        this.editor.setModel(textModel);
        if (data.range) {
            this.editor.setSelection(data.range);
            this.editor.revealRangeInCenter(data.range, 1 /* ScrollType.Immediate */);
        }
        this.toolbar.context = {
            code: textModel
                .getTextBuffer()
                .getValueInRange(data.range ?? textModel.getFullModelRange(), 0 /* EndOfLinePreference.TextDefined */),
            codeBlockIndex: data.codeBlockIndex,
            element: data.element,
            languageId: textModel.getLanguageId(),
            codemapperUri: data.codemapperUri,
        };
        this.resourceContextKey.set(textModel.uri);
    }
    getVulnerabilitiesLabel() {
        if (!this.currentCodeBlockData || !this.currentCodeBlockData.vulns) {
            return '';
        }
        const referencesLabel = this.currentCodeBlockData.vulns.length > 1
            ? localize('vulnerabilitiesPlural', '{0} vulnerabilities', this.currentCodeBlockData.vulns.length)
            : localize('vulnerabilitiesSingular', '{0} vulnerability', 1);
        const icon = (element) => element.vulnerabilitiesListExpanded ? Codicon.chevronDown : Codicon.chevronRight;
        return `${referencesLabel} $(${icon(this.currentCodeBlockData.element).id})`;
    }
};
CodeBlockPart = __decorate([
    __param(4, IInstantiationService),
    __param(5, IContextKeyService),
    __param(6, IModelService),
    __param(7, IConfigurationService),
    __param(8, IAccessibilityService)
], CodeBlockPart);
export { CodeBlockPart };
let ChatCodeBlockContentProvider = class ChatCodeBlockContentProvider extends Disposable {
    constructor(textModelService, _modelService) {
        super();
        this._modelService = _modelService;
        this._register(textModelService.registerTextModelContentProvider(Schemas.vscodeChatCodeBlock, this));
    }
    async provideTextContent(resource) {
        const existing = this._modelService.getModel(resource);
        if (existing) {
            return existing;
        }
        return this._modelService.createModel('', null, resource);
    }
};
ChatCodeBlockContentProvider = __decorate([
    __param(0, ITextModelService),
    __param(1, IModelService)
], ChatCodeBlockContentProvider);
export { ChatCodeBlockContentProvider };
// long-lived object that sits in the DiffPool and that gets reused
let CodeCompareBlockPart = class CodeCompareBlockPart extends Disposable {
    constructor(options, menuId, delegate, overflowWidgetsDomNode, instantiationService, contextKeyService, modelService, configurationService, accessibilityService, labelService, openerService) {
        super();
        this.options = options;
        this.menuId = menuId;
        this.modelService = modelService;
        this.configurationService = configurationService;
        this.accessibilityService = accessibilityService;
        this.labelService = labelService;
        this.openerService = openerService;
        this._onDidChangeContentHeight = this._register(new Emitter());
        this.onDidChangeContentHeight = this._onDidChangeContentHeight.event;
        this._lastDiffEditorViewModel = this._store.add(new MutableDisposable());
        this.currentScrollWidth = 0;
        this.element = $('.interactive-result-code-block');
        this.element.classList.add('compare');
        this.messageElement = dom.append(this.element, $('.message'));
        this.messageElement.setAttribute('role', 'status');
        this.messageElement.tabIndex = 0;
        this.contextKeyService = this._register(contextKeyService.createScoped(this.element));
        const scopedInstantiationService = this._register(instantiationService.createChild(new ServiceCollection([IContextKeyService, this.contextKeyService], [
            IEditorProgressService,
            new (class {
                show(_total, _delay) {
                    return emptyProgressRunner;
                }
                async showWhile(promise, _delay) {
                    await promise;
                }
            })(),
        ])));
        const editorHeader = dom.append(this.element, $('.interactive-result-header.show-file-icons'));
        const editorElement = dom.append(this.element, $('.interactive-result-editor'));
        this.diffEditor = this.createDiffEditor(scopedInstantiationService, editorElement, {
            ...getSimpleEditorOptions(this.configurationService),
            lineNumbers: 'on',
            selectOnLineNumbers: true,
            scrollBeyondLastLine: false,
            lineDecorationsWidth: 12,
            dragAndDrop: false,
            padding: { top: defaultCodeblockPadding, bottom: defaultCodeblockPadding },
            mouseWheelZoom: false,
            scrollbar: {
                vertical: 'hidden',
                alwaysConsumeMouseWheel: false,
            },
            definitionLinkOpensInPeek: false,
            gotoLocation: {
                multiple: 'goto',
                multipleDeclarations: 'goto',
                multipleDefinitions: 'goto',
                multipleImplementations: 'goto',
            },
            ariaLabel: localize('chat.codeBlockHelp', 'Code block'),
            overflowWidgetsDomNode,
            ...this.getEditorOptionsFromConfig(),
        });
        this.resourceLabel = this._register(scopedInstantiationService.createInstance(ResourceLabel, editorHeader, {
            supportIcons: true,
        }));
        const editorScopedService = this.diffEditor
            .getModifiedEditor()
            .contextKeyService.createScoped(editorHeader);
        const editorScopedInstantiationService = this._register(scopedInstantiationService.createChild(new ServiceCollection([IContextKeyService, editorScopedService])));
        this.toolbar = this._register(editorScopedInstantiationService.createInstance(MenuWorkbenchToolBar, editorHeader, menuId, {
            menuOptions: {
                shouldForwardArgs: true,
            },
        }));
        this._configureForScreenReader();
        this._register(this.accessibilityService.onDidChangeScreenReaderOptimized(() => this._configureForScreenReader()));
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectedKeys.has("accessibility.verbosity.panelChat" /* AccessibilityVerbositySettingId.Chat */)) {
                this._configureForScreenReader();
            }
        }));
        this._register(this.options.onDidChange(() => {
            this.diffEditor.updateOptions(this.getEditorOptionsFromConfig());
        }));
        this._register(this.diffEditor.getModifiedEditor().onDidScrollChange((e) => {
            this.currentScrollWidth = e.scrollWidth;
        }));
        this._register(this.diffEditor.onDidContentSizeChange((e) => {
            if (e.contentHeightChanged) {
                this._onDidChangeContentHeight.fire();
            }
        }));
        this._register(this.diffEditor.getModifiedEditor().onDidBlurEditorWidget(() => {
            this.element.classList.remove('focused');
            WordHighlighterContribution.get(this.diffEditor.getModifiedEditor())?.stopHighlighting();
            this.clearWidgets();
        }));
        this._register(this.diffEditor.getModifiedEditor().onDidFocusEditorWidget(() => {
            this.element.classList.add('focused');
            WordHighlighterContribution.get(this.diffEditor.getModifiedEditor())?.restoreViewState(true);
        }));
        // Parent list scrolled
        if (delegate.onDidScroll) {
            this._register(delegate.onDidScroll((e) => {
                this.clearWidgets();
            }));
        }
    }
    get uri() {
        return this.diffEditor.getModifiedEditor().getModel()?.uri;
    }
    createDiffEditor(instantiationService, parent, options) {
        const widgetOptions = {
            isSimpleWidget: false,
            contributions: EditorExtensionsRegistry.getSomeEditorContributions([
                MenuPreventer.ID,
                SelectionClipboardContributionID,
                ContextMenuController.ID,
                WordHighlighterContribution.ID,
                ViewportSemanticTokensContribution.ID,
                BracketMatchingController.ID,
                SmartSelectController.ID,
                ContentHoverController.ID,
                GlyphHoverController.ID,
                GotoDefinitionAtPositionEditorContribution.ID,
            ]),
        };
        return this._register(instantiationService.createInstance(DiffEditorWidget, parent, {
            scrollbar: {
                useShadows: false,
                alwaysConsumeMouseWheel: false,
                ignoreHorizontalScrollbarInContentHeight: true,
            },
            renderMarginRevertIcon: false,
            diffCodeLens: false,
            scrollBeyondLastLine: false,
            stickyScroll: { enabled: false },
            originalAriaLabel: localize('original', 'Original'),
            modifiedAriaLabel: localize('modified', 'Modified'),
            diffAlgorithm: 'advanced',
            readOnly: false,
            isInEmbeddedEditor: true,
            useInlineViewWhenSpaceIsLimited: true,
            experimental: {
                useTrueInlineView: true,
            },
            renderSideBySideInlineBreakpoint: 300,
            renderOverviewRuler: false,
            compactMode: true,
            hideUnchangedRegions: { enabled: true, contextLineCount: 1 },
            renderGutterMenu: false,
            lineNumbersMinChars: 1,
            ...options,
        }, { originalEditor: widgetOptions, modifiedEditor: widgetOptions }));
    }
    focus() {
        this.diffEditor.focus();
    }
    updatePaddingForLayout() {
        // scrollWidth = "the width of the content that needs to be scrolled"
        // contentWidth = "the width of the area where content is displayed"
        const horizontalScrollbarVisible = this.currentScrollWidth > this.diffEditor.getModifiedEditor().getLayoutInfo().contentWidth;
        const scrollbarHeight = this.diffEditor
            .getModifiedEditor()
            .getLayoutInfo().horizontalScrollbarHeight;
        const bottomPadding = horizontalScrollbarVisible
            ? Math.max(defaultCodeblockPadding - scrollbarHeight, 2)
            : defaultCodeblockPadding;
        this.diffEditor.updateOptions({
            padding: { top: defaultCodeblockPadding, bottom: bottomPadding },
        });
    }
    _configureForScreenReader() {
        const toolbarElt = this.toolbar.getElement();
        if (this.accessibilityService.isScreenReaderOptimized()) {
            toolbarElt.style.display = 'block';
            toolbarElt.ariaLabel = this.configurationService.getValue("accessibility.verbosity.panelChat" /* AccessibilityVerbositySettingId.Chat */)
                ? localize('chat.codeBlock.toolbarVerbose', 'Toolbar for code block which can be reached via tab')
                : localize('chat.codeBlock.toolbar', 'Code block toolbar');
        }
        else {
            toolbarElt.style.display = '';
        }
    }
    getEditorOptionsFromConfig() {
        return {
            wordWrap: this.options.configuration.resultEditor.wordWrap,
            fontLigatures: this.options.configuration.resultEditor.fontLigatures,
            bracketPairColorization: this.options.configuration.resultEditor.bracketPairColorization,
            fontFamily: this.options.configuration.resultEditor.fontFamily === 'default'
                ? EDITOR_FONT_DEFAULTS.fontFamily
                : this.options.configuration.resultEditor.fontFamily,
            fontSize: this.options.configuration.resultEditor.fontSize,
            fontWeight: this.options.configuration.resultEditor.fontWeight,
            lineHeight: this.options.configuration.resultEditor.lineHeight,
        };
    }
    layout(width) {
        const editorBorder = 2;
        const toolbar = dom.getTotalHeight(this.toolbar.getElement());
        const content = this.diffEditor.getModel()
            ? this.diffEditor.getContentHeight()
            : dom.getTotalHeight(this.messageElement);
        const dimension = new dom.Dimension(width - editorBorder, toolbar + content);
        this.element.style.height = `${dimension.height}px`;
        this.element.style.width = `${dimension.width}px`;
        this.diffEditor.layout(dimension.with(undefined, content - editorBorder));
        this.updatePaddingForLayout();
    }
    async render(data, width, token) {
        if (data.parentContextKeyService) {
            this.contextKeyService.updateParent(data.parentContextKeyService);
        }
        if (this.options.configuration.resultEditor.wordWrap === 'on') {
            // Initialize the editor with the new proper width so that getContentHeight
            // will be computed correctly in the next call to layout()
            this.layout(width);
        }
        await this.updateEditor(data, token);
        this.layout(width);
        this.diffEditor.updateOptions({
            ariaLabel: localize('chat.compareCodeBlockLabel', 'Code Edits'),
        });
        this.resourceLabel.element.setFile(data.edit.uri, {
            fileKind: FileKind.FILE,
            fileDecorations: { colors: true, badges: false },
        });
    }
    reset() {
        this.clearWidgets();
    }
    clearWidgets() {
        ContentHoverController.get(this.diffEditor.getOriginalEditor())?.hideContentHover();
        ContentHoverController.get(this.diffEditor.getModifiedEditor())?.hideContentHover();
        GlyphHoverController.get(this.diffEditor.getOriginalEditor())?.hideGlyphHover();
        GlyphHoverController.get(this.diffEditor.getModifiedEditor())?.hideGlyphHover();
    }
    async updateEditor(data, token) {
        if (!isResponseVM(data.element)) {
            return;
        }
        const isEditApplied = Boolean(data.edit.state?.applied ?? 0);
        ChatContextKeys.editApplied.bindTo(this.contextKeyService).set(isEditApplied);
        this.element.classList.toggle('no-diff', isEditApplied);
        if (isEditApplied) {
            assertType(data.edit.state?.applied);
            const uriLabel = this.labelService.getUriLabel(data.edit.uri, {
                relative: true,
                noPrefix: true,
            });
            let template;
            if (data.edit.state.applied === 1) {
                template = localize('chat.edits.1', 'Applied 1 change in [[``{0}``]]', uriLabel);
            }
            else if (data.edit.state.applied < 0) {
                template = localize('chat.edits.rejected', 'Edits in [[``{0}``]] have been rejected', uriLabel);
            }
            else {
                template = localize('chat.edits.N', 'Applied {0} changes in [[``{1}``]]', data.edit.state.applied, uriLabel);
            }
            const message = renderFormattedText(template, {
                renderCodeSegments: true,
                actionHandler: {
                    callback: () => {
                        this.openerService.open(data.edit.uri, { fromUserGesture: true, allowCommands: false });
                    },
                    disposables: this._store,
                },
            });
            dom.reset(this.messageElement, message);
        }
        const diffData = await data.diffData;
        if (!isEditApplied && diffData) {
            const viewModel = this.diffEditor.createViewModel({
                original: diffData.original,
                modified: diffData.modified,
            });
            await viewModel.waitForDiff();
            if (token.isCancellationRequested) {
                return;
            }
            const listener = Event.any(diffData.original.onWillDispose, diffData.modified.onWillDispose)(() => {
                // this a bit weird and basically duplicates https://github.com/microsoft/vscode/blob/7cbcafcbcc88298cfdcd0238018fbbba8eb6853e/src/vs/editor/browser/widget/diffEditor/diffEditorWidget.ts#L328
                // which cannot call `setModel(null)` without first complaining
                this.diffEditor.setModel(null);
            });
            this.diffEditor.setModel(viewModel);
            this._lastDiffEditorViewModel.value = combinedDisposable(listener, viewModel);
        }
        else {
            this.diffEditor.setModel(null);
            this._lastDiffEditorViewModel.value = undefined;
            this._onDidChangeContentHeight.fire();
        }
        this.toolbar.context = {
            edit: data.edit,
            element: data.element,
            diffEditor: this.diffEditor,
        };
    }
};
CodeCompareBlockPart = __decorate([
    __param(4, IInstantiationService),
    __param(5, IContextKeyService),
    __param(6, IModelService),
    __param(7, IConfigurationService),
    __param(8, IAccessibilityService),
    __param(9, ILabelService),
    __param(10, IOpenerService)
], CodeCompareBlockPart);
export { CodeCompareBlockPart };
let DefaultChatTextEditor = class DefaultChatTextEditor {
    constructor(modelService, editorService, dialogService) {
        this.modelService = modelService;
        this.editorService = editorService;
        this.dialogService = dialogService;
        this._sha1 = new DefaultModelSHA1Computer();
    }
    async apply(response, item, diffEditor) {
        if (!response.response.value.includes(item)) {
            // bogous item
            return;
        }
        if (item.state?.applied) {
            // already applied
            return;
        }
        if (!diffEditor) {
            for (const candidate of this.editorService.listDiffEditors()) {
                if (!candidate.getContainerDomNode().isConnected) {
                    continue;
                }
                const model = candidate.getModel();
                if (!model ||
                    !isEqual(model.original.uri, item.uri) ||
                    model.modified.uri.scheme !== Schemas.vscodeChatCodeCompareBlock) {
                    diffEditor = candidate;
                    break;
                }
            }
        }
        const edits = diffEditor
            ? await this._applyWithDiffEditor(diffEditor, item)
            : await this._apply(item);
        response.setEditApplied(item, edits);
    }
    async _applyWithDiffEditor(diffEditor, item) {
        const model = diffEditor.getModel();
        if (!model) {
            return 0;
        }
        const diff = diffEditor.getDiffComputationResult();
        if (!diff || diff.identical) {
            return 0;
        }
        if (!(await this._checkSha1(model.original, item))) {
            return 0;
        }
        const modified = new TextModelText(model.modified);
        const edits = diff.changes2.map((i) => i.toRangeMapping().toTextEdit(modified).toSingleEditOperation());
        model.original.pushStackElement();
        model.original.pushEditOperations(null, edits, () => null);
        model.original.pushStackElement();
        return edits.length;
    }
    async _apply(item) {
        const ref = await this.modelService.createModelReference(item.uri);
        try {
            if (!(await this._checkSha1(ref.object.textEditorModel, item))) {
                return 0;
            }
            ref.object.textEditorModel.pushStackElement();
            let total = 0;
            for (const group of item.edits) {
                const edits = group.map(TextEdit.asEditOperation);
                ref.object.textEditorModel.pushEditOperations(null, edits, () => null);
                total += edits.length;
            }
            ref.object.textEditorModel.pushStackElement();
            return total;
        }
        finally {
            ref.dispose();
        }
    }
    async _checkSha1(model, item) {
        if (item.state?.sha1 &&
            this._sha1.computeSHA1(model) &&
            this._sha1.computeSHA1(model) !== item.state.sha1) {
            const result = await this.dialogService.confirm({
                message: localize('interactive.compare.apply.confirm', 'The original file has been modified.'),
                detail: localize('interactive.compare.apply.confirm.detail', 'Do you want to apply the changes anyway?'),
            });
            if (!result.confirmed) {
                return false;
            }
        }
        return true;
    }
    discard(response, item) {
        if (!response.response.value.includes(item)) {
            // bogous item
            return;
        }
        if (item.state?.applied) {
            // already applied
            return;
        }
        response.setEditApplied(item, -1);
    }
};
DefaultChatTextEditor = __decorate([
    __param(0, ITextModelService),
    __param(1, ICodeEditorService),
    __param(2, IDialogService)
], DefaultChatTextEditor);
export { DefaultChatTextEditor };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUJsb2NrUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jb2RlQmxvY2tQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8scUJBQXFCLENBQUE7QUFFNUIsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFFckUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUNOLGtCQUFrQixFQUNsQixVQUFVLEVBQ1YsaUJBQWlCLEdBQ2pCLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDN0QsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUduRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM3RixPQUFPLEVBQ04sZ0JBQWdCLEdBRWhCLE1BQU0sa0VBQWtFLENBQUE7QUFDekUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDbkcsT0FBTyxFQUNOLG9CQUFv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