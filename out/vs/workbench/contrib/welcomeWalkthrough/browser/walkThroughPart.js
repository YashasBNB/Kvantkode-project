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
var WalkThroughPart_1;
import '../common/walkThroughUtils.js';
import './media/walkThroughPart.css';
import { DomScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { EventType as TouchEventType, Gesture, } from '../../../../base/browser/touch.js';
import * as strings from '../../../../base/common/strings.js';
import { URI } from '../../../../base/common/uri.js';
import { dispose, toDisposable, DisposableStore, } from '../../../../base/common/lifecycle.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { WalkThroughInput } from './walkThroughInput.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { CodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { localize } from '../../../../nls.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { RawContextKey, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { isObject } from '../../../../base/common/types.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { UILabelProvider } from '../../../../base/common/keybindingLabels.js';
import { OS } from '../../../../base/common/platform.js';
import { deepClone } from '../../../../base/common/objects.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { addDisposableListener, isHTMLAnchorElement, isHTMLButtonElement, isHTMLElement, safeInnerHtml, size, } from '../../../../base/browser/dom.js';
import { IEditorGroupsService, } from '../../../services/editor/common/editorGroupsService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
export const WALK_THROUGH_FOCUS = new RawContextKey('interactivePlaygroundFocus', false);
const UNBOUND_COMMAND = localize('walkThrough.unboundCommand', 'unbound');
const WALK_THROUGH_EDITOR_VIEW_STATE_PREFERENCE_KEY = 'walkThroughEditorViewState';
let WalkThroughPart = class WalkThroughPart extends EditorPane {
    static { WalkThroughPart_1 = this; }
    static { this.ID = 'workbench.editor.walkThroughPart'; }
    constructor(group, telemetryService, themeService, textResourceConfigurationService, instantiationService, openerService, keybindingService, storageService, contextKeyService, configurationService, notificationService, extensionService, editorGroupService) {
        super(WalkThroughPart_1.ID, group, telemetryService, themeService, storageService);
        this.instantiationService = instantiationService;
        this.openerService = openerService;
        this.keybindingService = keybindingService;
        this.contextKeyService = contextKeyService;
        this.configurationService = configurationService;
        this.notificationService = notificationService;
        this.extensionService = extensionService;
        this.disposables = new DisposableStore();
        this.contentDisposables = [];
        this.editorFocus = WALK_THROUGH_FOCUS.bindTo(this.contextKeyService);
        this.editorMemento = this.getEditorMemento(editorGroupService, textResourceConfigurationService, WALK_THROUGH_EDITOR_VIEW_STATE_PREFERENCE_KEY);
    }
    createEditor(container) {
        this.content = document.createElement('div');
        this.content.classList.add('welcomePageFocusElement');
        this.content.tabIndex = 0;
        this.content.style.outlineStyle = 'none';
        this.scrollbar = new DomScrollableElement(this.content, {
            horizontal: 1 /* ScrollbarVisibility.Auto */,
            vertical: 1 /* ScrollbarVisibility.Auto */,
        });
        this.disposables.add(this.scrollbar);
        container.appendChild(this.scrollbar.getDomNode());
        this.registerFocusHandlers();
        this.registerClickHandler();
        this.disposables.add(this.scrollbar.onScroll((e) => this.updatedScrollPosition()));
    }
    updatedScrollPosition() {
        const scrollDimensions = this.scrollbar.getScrollDimensions();
        const scrollPosition = this.scrollbar.getScrollPosition();
        const scrollHeight = scrollDimensions.scrollHeight;
        if (scrollHeight && this.input instanceof WalkThroughInput) {
            const scrollTop = scrollPosition.scrollTop;
            const height = scrollDimensions.height;
            this.input.relativeScrollPosition(scrollTop / scrollHeight, (scrollTop + height) / scrollHeight);
        }
    }
    onTouchChange(event) {
        event.preventDefault();
        event.stopPropagation();
        const scrollPosition = this.scrollbar.getScrollPosition();
        this.scrollbar.setScrollPosition({ scrollTop: scrollPosition.scrollTop - event.translationY });
    }
    addEventListener(element, type, listener, useCapture) {
        element.addEventListener(type, listener, useCapture);
        return toDisposable(() => {
            element.removeEventListener(type, listener, useCapture);
        });
    }
    registerFocusHandlers() {
        this.disposables.add(this.addEventListener(this.content, 'mousedown', (e) => {
            this.focus();
        }));
        this.disposables.add(this.addEventListener(this.content, 'focus', (e) => {
            this.editorFocus.set(true);
        }));
        this.disposables.add(this.addEventListener(this.content, 'blur', (e) => {
            this.editorFocus.reset();
        }));
        this.disposables.add(this.addEventListener(this.content, 'focusin', (e) => {
            // Work around scrolling as side-effect of setting focus on the offscreen zone widget (#18929)
            if (isHTMLElement(e.target) && e.target.classList.contains('zone-widget-container')) {
                const scrollPosition = this.scrollbar.getScrollPosition();
                this.content.scrollTop = scrollPosition.scrollTop;
                this.content.scrollLeft = scrollPosition.scrollLeft;
            }
            if (isHTMLElement(e.target)) {
                this.lastFocus = e.target;
            }
        }));
    }
    registerClickHandler() {
        this.content.addEventListener('click', (event) => {
            for (let node = event.target; node; node = node.parentNode) {
                if (isHTMLAnchorElement(node) && node.href) {
                    const baseElement = node.ownerDocument.getElementsByTagName('base')[0] || this.window.location;
                    if (baseElement && node.href.indexOf(baseElement.href) >= 0 && node.hash) {
                        const scrollTarget = this.content.querySelector(node.hash);
                        const innerContent = this.content.firstElementChild;
                        if (scrollTarget && innerContent) {
                            const targetTop = scrollTarget.getBoundingClientRect().top - 20;
                            const containerTop = innerContent.getBoundingClientRect().top;
                            this.scrollbar.setScrollPosition({ scrollTop: targetTop - containerTop });
                        }
                    }
                    else {
                        this.open(URI.parse(node.href));
                    }
                    event.preventDefault();
                    break;
                }
                else if (isHTMLButtonElement(node)) {
                    const href = node.getAttribute('data-href');
                    if (href) {
                        this.open(URI.parse(href));
                    }
                    break;
                }
                else if (node === event.currentTarget) {
                    break;
                }
            }
        });
    }
    open(uri) {
        if (uri.scheme === 'command' &&
            uri.path === 'git.clone' &&
            !CommandsRegistry.getCommand('git.clone')) {
            this.notificationService.info(localize('walkThrough.gitNotFound', 'It looks like Git is not installed on your system.'));
            return;
        }
        this.openerService.open(this.addFrom(uri), { allowCommands: true });
    }
    addFrom(uri) {
        if (uri.scheme !== 'command' || !(this.input instanceof WalkThroughInput)) {
            return uri;
        }
        const query = uri.query ? JSON.parse(uri.query) : {};
        query.from = this.input.getTelemetryFrom();
        return uri.with({ query: JSON.stringify(query) });
    }
    layout(dimension) {
        this.size = dimension;
        size(this.content, dimension.width, dimension.height);
        this.updateSizeClasses();
        this.contentDisposables.forEach((disposable) => {
            if (disposable instanceof CodeEditorWidget) {
                disposable.layout();
            }
        });
        const walkthroughInput = this.input instanceof WalkThroughInput && this.input;
        if (walkthroughInput && walkthroughInput.layout) {
            walkthroughInput.layout(dimension);
        }
        this.scrollbar.scanDomNode();
    }
    updateSizeClasses() {
        const innerContent = this.content.firstElementChild;
        if (this.size && innerContent) {
            innerContent.classList.toggle('max-height-685px', this.size.height <= 685);
        }
    }
    focus() {
        super.focus();
        let active = this.content.ownerDocument.activeElement;
        while (active && active !== this.content) {
            active = active.parentElement;
        }
        if (!active) {
            ;
            (this.lastFocus || this.content).focus();
        }
        this.editorFocus.set(true);
    }
    arrowUp() {
        const scrollPosition = this.scrollbar.getScrollPosition();
        this.scrollbar.setScrollPosition({
            scrollTop: scrollPosition.scrollTop - this.getArrowScrollHeight(),
        });
    }
    arrowDown() {
        const scrollPosition = this.scrollbar.getScrollPosition();
        this.scrollbar.setScrollPosition({
            scrollTop: scrollPosition.scrollTop + this.getArrowScrollHeight(),
        });
    }
    getArrowScrollHeight() {
        let fontSize = this.configurationService.getValue('editor.fontSize');
        if (typeof fontSize !== 'number' || fontSize < 1) {
            fontSize = 12;
        }
        return 3 * fontSize;
    }
    pageUp() {
        const scrollDimensions = this.scrollbar.getScrollDimensions();
        const scrollPosition = this.scrollbar.getScrollPosition();
        this.scrollbar.setScrollPosition({
            scrollTop: scrollPosition.scrollTop - scrollDimensions.height,
        });
    }
    pageDown() {
        const scrollDimensions = this.scrollbar.getScrollDimensions();
        const scrollPosition = this.scrollbar.getScrollPosition();
        this.scrollbar.setScrollPosition({
            scrollTop: scrollPosition.scrollTop + scrollDimensions.height,
        });
    }
    setInput(input, options, context, token) {
        const store = new DisposableStore();
        this.contentDisposables.push(store);
        this.content.innerText = '';
        return super
            .setInput(input, options, context, token)
            .then(async () => {
            if (input.resource.path.endsWith('.md')) {
                await this.extensionService.whenInstalledExtensionsRegistered();
            }
            return input.resolve();
        })
            .then((model) => {
            if (token.isCancellationRequested) {
                return;
            }
            const content = model.main;
            if (!input.resource.path.endsWith('.md')) {
                safeInnerHtml(this.content, content, { ALLOW_UNKNOWN_PROTOCOLS: true });
                this.updateSizeClasses();
                this.decorateContent();
                this.contentDisposables.push(this.keybindingService.onDidUpdateKeybindings(() => this.decorateContent()));
                input.onReady?.(this.content.firstElementChild, store);
                this.scrollbar.scanDomNode();
                this.loadTextEditorViewState(input);
                this.updatedScrollPosition();
                return;
            }
            const innerContent = document.createElement('div');
            innerContent.classList.add('walkThroughContent'); // only for markdown files
            const markdown = this.expandMacros(content);
            safeInnerHtml(innerContent, markdown, { ALLOW_UNKNOWN_PROTOCOLS: true });
            this.content.appendChild(innerContent);
            model.snippets.forEach((snippet, i) => {
                const model = snippet.textEditorModel;
                if (!model) {
                    return;
                }
                const id = `snippet-${model.uri.fragment}`;
                const div = innerContent.querySelector(`#${id.replace(/[\\.]/g, '\\$&')}`);
                const options = this.getEditorOptions(model.getLanguageId());
                const telemetryData = {
                    target: this.input instanceof WalkThroughInput ? this.input.getTelemetryFrom() : undefined,
                    snippet: i,
                };
                const editor = this.instantiationService.createInstance(CodeEditorWidget, div, options, {
                    telemetryData: telemetryData,
                });
                editor.setModel(model);
                this.contentDisposables.push(editor);
                const updateHeight = (initial) => {
                    const lineHeight = editor.getOption(68 /* EditorOption.lineHeight */);
                    const height = `${Math.max(model.getLineCount() + 1, 4) * lineHeight}px`;
                    if (div.style.height !== height) {
                        div.style.height = height;
                        editor.layout();
                        if (!initial) {
                            this.scrollbar.scanDomNode();
                        }
                    }
                };
                updateHeight(true);
                this.contentDisposables.push(editor.onDidChangeModelContent(() => updateHeight(false)));
                this.contentDisposables.push(editor.onDidChangeCursorPosition((e) => {
                    const innerContent = this.content.firstElementChild;
                    if (innerContent) {
                        const targetTop = div.getBoundingClientRect().top;
                        const containerTop = innerContent.getBoundingClientRect().top;
                        const lineHeight = editor.getOption(68 /* EditorOption.lineHeight */);
                        const lineTop = targetTop + (e.position.lineNumber - 1) * lineHeight - containerTop;
                        const lineBottom = lineTop + lineHeight;
                        const scrollDimensions = this.scrollbar.getScrollDimensions();
                        const scrollPosition = this.scrollbar.getScrollPosition();
                        const scrollTop = scrollPosition.scrollTop;
                        const height = scrollDimensions.height;
                        if (scrollTop > lineTop) {
                            this.scrollbar.setScrollPosition({ scrollTop: lineTop });
                        }
                        else if (scrollTop < lineBottom - height) {
                            this.scrollbar.setScrollPosition({ scrollTop: lineBottom - height });
                        }
                    }
                }));
                this.contentDisposables.push(this.configurationService.onDidChangeConfiguration((e) => {
                    if (e.affectsConfiguration('editor') && snippet.textEditorModel) {
                        editor.updateOptions(this.getEditorOptions(snippet.textEditorModel.getLanguageId()));
                    }
                }));
            });
            this.updateSizeClasses();
            this.multiCursorModifier();
            this.contentDisposables.push(this.configurationService.onDidChangeConfiguration((e) => {
                if (e.affectsConfiguration('editor.multiCursorModifier')) {
                    this.multiCursorModifier();
                }
            }));
            input.onReady?.(innerContent, store);
            this.scrollbar.scanDomNode();
            this.loadTextEditorViewState(input);
            this.updatedScrollPosition();
            this.contentDisposables.push(Gesture.addTarget(innerContent));
            this.contentDisposables.push(addDisposableListener(innerContent, TouchEventType.Change, (e) => this.onTouchChange(e)));
        });
    }
    getEditorOptions(language) {
        const config = deepClone(this.configurationService.getValue('editor', {
            overrideIdentifier: language,
        }));
        return {
            ...(isObject(config) ? config : Object.create(null)),
            scrollBeyondLastLine: false,
            scrollbar: {
                verticalScrollbarSize: 14,
                horizontal: 'auto',
                useShadows: true,
                verticalHasArrows: false,
                horizontalHasArrows: false,
                alwaysConsumeMouseWheel: false,
            },
            overviewRulerLanes: 3,
            fixedOverflowWidgets: false,
            lineNumbersMinChars: 1,
            minimap: { enabled: false },
        };
    }
    expandMacros(input) {
        return input.replace(/kb\(([a-z.\d\-]+)\)/gi, (match, kb) => {
            const keybinding = this.keybindingService.lookupKeybinding(kb);
            const shortcut = keybinding ? keybinding.getLabel() || '' : UNBOUND_COMMAND;
            return `<span class="shortcut">${strings.escape(shortcut)}</span>`;
        });
    }
    decorateContent() {
        const keys = this.content.querySelectorAll('.shortcut[data-command]');
        Array.prototype.forEach.call(keys, (key) => {
            const command = key.getAttribute('data-command');
            const keybinding = command && this.keybindingService.lookupKeybinding(command);
            const label = keybinding ? keybinding.getLabel() || '' : UNBOUND_COMMAND;
            while (key.firstChild) {
                key.firstChild.remove();
            }
            key.appendChild(document.createTextNode(label));
        });
        const ifkeys = this.content.querySelectorAll('.if_shortcut[data-command]');
        Array.prototype.forEach.call(ifkeys, (key) => {
            const command = key.getAttribute('data-command');
            const keybinding = command && this.keybindingService.lookupKeybinding(command);
            key.style.display = !keybinding ? 'none' : '';
        });
    }
    multiCursorModifier() {
        const labels = UILabelProvider.modifierLabels[OS];
        const value = this.configurationService.getValue('editor.multiCursorModifier');
        const modifier = labels[value === 'ctrlCmd' ? (OS === 2 /* OperatingSystem.Macintosh */ ? 'metaKey' : 'ctrlKey') : 'altKey'];
        const keys = this.content.querySelectorAll('.multi-cursor-modifier');
        Array.prototype.forEach.call(keys, (key) => {
            while (key.firstChild) {
                key.firstChild.remove();
            }
            key.appendChild(document.createTextNode(modifier));
        });
    }
    saveTextEditorViewState(input) {
        const scrollPosition = this.scrollbar.getScrollPosition();
        this.editorMemento.saveEditorState(this.group, input, {
            viewState: {
                scrollTop: scrollPosition.scrollTop,
                scrollLeft: scrollPosition.scrollLeft,
            },
        });
    }
    loadTextEditorViewState(input) {
        const state = this.editorMemento.loadEditorState(this.group, input);
        if (state) {
            this.scrollbar.setScrollPosition(state.viewState);
        }
    }
    clearInput() {
        if (this.input instanceof WalkThroughInput) {
            this.saveTextEditorViewState(this.input);
        }
        this.contentDisposables = dispose(this.contentDisposables);
        super.clearInput();
    }
    saveState() {
        if (this.input instanceof WalkThroughInput) {
            this.saveTextEditorViewState(this.input);
        }
        super.saveState();
    }
    dispose() {
        this.editorFocus.reset();
        this.contentDisposables = dispose(this.contentDisposables);
        this.disposables.dispose();
        super.dispose();
    }
};
WalkThroughPart = WalkThroughPart_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, ITextResourceConfigurationService),
    __param(4, IInstantiationService),
    __param(5, IOpenerService),
    __param(6, IKeybindingService),
    __param(7, IStorageService),
    __param(8, IContextKeyService),
    __param(9, IConfigurationService),
    __param(10, INotificationService),
    __param(11, IExtensionService),
    __param(12, IEditorGroupsService)
], WalkThroughPart);
export { WalkThroughPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Fsa1Rocm91Z2hQYXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2VsY29tZVdhbGt0aHJvdWdoL2Jyb3dzZXIvd2Fsa1Rocm91Z2hQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sNkJBQTZCLENBQUE7QUFDcEMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDakcsT0FBTyxFQUNOLFNBQVMsSUFBSSxjQUFjLEVBRTNCLE9BQU8sR0FDUCxNQUFNLG1DQUFtQyxDQUFBO0FBRTFDLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFDN0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFFTixPQUFPLEVBQ1AsWUFBWSxFQUNaLGVBQWUsR0FDZixNQUFNLHNDQUFzQyxDQUFBO0FBRTdDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDbkgsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDbkcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFF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