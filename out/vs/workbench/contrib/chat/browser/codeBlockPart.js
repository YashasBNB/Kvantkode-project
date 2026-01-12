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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUJsb2NrUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NvZGVCbG9ja1BhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxxQkFBcUIsQ0FBQTtBQUU1QixPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUVyRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLFVBQVUsRUFDVixpQkFBaUIsR0FDakIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLGdDQUFnQyxDQUFBO0FBR25FLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzdGLE9BQU8sRUFDTixnQkFBZ0IsR0FFaEIsTUFBTSxrRUFBa0UsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUNuRyxPQUFPLEVBQ04s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