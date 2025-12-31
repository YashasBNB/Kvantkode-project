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
var ParameterHintsWidget_1;
import * as dom from '../../../../base/browser/dom.js';
import * as aria from '../../../../base/browser/ui/aria/aria.js';
import { DomScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { escapeRegExpCharacters } from '../../../../base/common/strings.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import './parameterHints.css';
import { EDITOR_FONT_DEFAULTS } from '../../../common/config/editorOptions.js';
import { ILanguageService } from '../../../common/languages/language.js';
import { MarkdownRenderer, } from '../../../browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { Context } from './provideSignatureHelp.js';
import * as nls from '../../../../nls.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { listHighlightForeground, registerColor, } from '../../../../platform/theme/common/colorRegistry.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
const $ = dom.$;
const parameterHintsNextIcon = registerIcon('parameter-hints-next', Codicon.chevronDown, nls.localize('parameterHintsNextIcon', 'Icon for show next parameter hint.'));
const parameterHintsPreviousIcon = registerIcon('parameter-hints-previous', Codicon.chevronUp, nls.localize('parameterHintsPreviousIcon', 'Icon for show previous parameter hint.'));
let ParameterHintsWidget = class ParameterHintsWidget extends Disposable {
    static { ParameterHintsWidget_1 = this; }
    static { this.ID = 'editor.widget.parameterHintsWidget'; }
    constructor(editor, model, contextKeyService, openerService, languageService) {
        super();
        this.editor = editor;
        this.model = model;
        this.renderDisposeables = this._register(new DisposableStore());
        this.visible = false;
        this.announcedLabel = null;
        // Editor.IContentWidget.allowEditorOverflow
        this.allowEditorOverflow = true;
        this.markdownRenderer = new MarkdownRenderer({ editor }, languageService, openerService);
        this.keyVisible = Context.Visible.bindTo(contextKeyService);
        this.keyMultipleSignatures = Context.MultipleSignatures.bindTo(contextKeyService);
    }
    createParameterHintDOMNodes() {
        const element = $('.editor-widget.parameter-hints-widget');
        const wrapper = dom.append(element, $('.phwrapper'));
        wrapper.tabIndex = -1;
        const controls = dom.append(wrapper, $('.controls'));
        const previous = dom.append(controls, $('.button' + ThemeIcon.asCSSSelector(parameterHintsPreviousIcon)));
        const overloads = dom.append(controls, $('.overloads'));
        const next = dom.append(controls, $('.button' + ThemeIcon.asCSSSelector(parameterHintsNextIcon)));
        this._register(dom.addDisposableListener(previous, 'click', (e) => {
            dom.EventHelper.stop(e);
            this.previous();
        }));
        this._register(dom.addDisposableListener(next, 'click', (e) => {
            dom.EventHelper.stop(e);
            this.next();
        }));
        const body = $('.body');
        const scrollbar = new DomScrollableElement(body, {
            alwaysConsumeMouseWheel: true,
        });
        this._register(scrollbar);
        wrapper.appendChild(scrollbar.getDomNode());
        const signature = dom.append(body, $('.signature'));
        const docs = dom.append(body, $('.docs'));
        element.style.userSelect = 'text';
        this.domNodes = {
            element,
            signature,
            overloads,
            docs,
            scrollbar,
        };
        this.editor.addContentWidget(this);
        this.hide();
        this._register(this.editor.onDidChangeCursorSelection((e) => {
            if (this.visible) {
                this.editor.layoutContentWidget(this);
            }
        }));
        const updateFont = () => {
            if (!this.domNodes) {
                return;
            }
            const fontInfo = this.editor.getOption(52 /* EditorOption.fontInfo */);
            const element = this.domNodes.element;
            element.style.fontSize = `${fontInfo.fontSize}px`;
            element.style.lineHeight = `${fontInfo.lineHeight / fontInfo.fontSize}`;
            element.style.setProperty('--vscode-parameterHintsWidget-editorFontFamily', fontInfo.fontFamily);
            element.style.setProperty('--vscode-parameterHintsWidget-editorFontFamilyDefault', EDITOR_FONT_DEFAULTS.fontFamily);
        };
        updateFont();
        this._register(Event.chain(this.editor.onDidChangeConfiguration.bind(this.editor), ($) => $.filter((e) => e.hasChanged(52 /* EditorOption.fontInfo */)))(updateFont));
        this._register(this.editor.onDidLayoutChange((e) => this.updateMaxHeight()));
        this.updateMaxHeight();
    }
    show() {
        if (this.visible) {
            return;
        }
        if (!this.domNodes) {
            this.createParameterHintDOMNodes();
        }
        this.keyVisible.set(true);
        this.visible = true;
        setTimeout(() => {
            this.domNodes?.element.classList.add('visible');
        }, 100);
        this.editor.layoutContentWidget(this);
    }
    hide() {
        this.renderDisposeables.clear();
        if (!this.visible) {
            return;
        }
        this.keyVisible.reset();
        this.visible = false;
        this.announcedLabel = null;
        this.domNodes?.element.classList.remove('visible');
        this.editor.layoutContentWidget(this);
    }
    getPosition() {
        if (this.visible) {
            return {
                position: this.editor.getPosition(),
                preference: [1 /* ContentWidgetPositionPreference.ABOVE */, 2 /* ContentWidgetPositionPreference.BELOW */],
            };
        }
        return null;
    }
    render(hints) {
        this.renderDisposeables.clear();
        if (!this.domNodes) {
            return;
        }
        const multiple = hints.signatures.length > 1;
        this.domNodes.element.classList.toggle('multiple', multiple);
        this.keyMultipleSignatures.set(multiple);
        this.domNodes.signature.innerText = '';
        this.domNodes.docs.innerText = '';
        const signature = hints.signatures[hints.activeSignature];
        if (!signature) {
            return;
        }
        const code = dom.append(this.domNodes.signature, $('.code'));
        const hasParameters = signature.parameters.length > 0;
        const activeParameterIndex = signature.activeParameter ?? hints.activeParameter;
        if (!hasParameters) {
            const label = dom.append(code, $('span'));
            label.textContent = signature.label;
        }
        else {
            this.renderParameters(code, signature, activeParameterIndex);
        }
        const activeParameter = signature.parameters[activeParameterIndex];
        if (activeParameter?.documentation) {
            const documentation = $('span.documentation');
            if (typeof activeParameter.documentation === 'string') {
                documentation.textContent = activeParameter.documentation;
            }
            else {
                const renderedContents = this.renderMarkdownDocs(activeParameter.documentation);
                documentation.appendChild(renderedContents.element);
            }
            dom.append(this.domNodes.docs, $('p', {}, documentation));
        }
        if (signature.documentation === undefined) {
            /** no op */
        }
        else if (typeof signature.documentation === 'string') {
            dom.append(this.domNodes.docs, $('p', {}, signature.documentation));
        }
        else {
            const renderedContents = this.renderMarkdownDocs(signature.documentation);
            dom.append(this.domNodes.docs, renderedContents.element);
        }
        const hasDocs = this.hasDocs(signature, activeParameter);
        this.domNodes.signature.classList.toggle('has-docs', hasDocs);
        this.domNodes.docs.classList.toggle('empty', !hasDocs);
        this.domNodes.overloads.textContent =
            String(hints.activeSignature + 1).padStart(hints.signatures.length.toString().length, '0') +
                '/' +
                hints.signatures.length;
        if (activeParameter) {
            let labelToAnnounce = '';
            const param = signature.parameters[activeParameterIndex];
            if (Array.isArray(param.label)) {
                labelToAnnounce = signature.label.substring(param.label[0], param.label[1]);
            }
            else {
                labelToAnnounce = param.label;
            }
            if (param.documentation) {
                labelToAnnounce +=
                    typeof param.documentation === 'string'
                        ? `, ${param.documentation}`
                        : `, ${param.documentation.value}`;
            }
            if (signature.documentation) {
                labelToAnnounce +=
                    typeof signature.documentation === 'string'
                        ? `, ${signature.documentation}`
                        : `, ${signature.documentation.value}`;
            }
            // Select method gets called on every user type while parameter hints are visible.
            // We do not want to spam the user with same announcements, so we only announce if the current parameter changed.
            if (this.announcedLabel !== labelToAnnounce) {
                aria.alert(nls.localize('hint', '{0}, hint', labelToAnnounce));
                this.announcedLabel = labelToAnnounce;
            }
        }
        this.editor.layoutContentWidget(this);
        this.domNodes.scrollbar.scanDomNode();
    }
    renderMarkdownDocs(markdown) {
        const renderedContents = this.renderDisposeables.add(this.markdownRenderer.render(markdown, {
            asyncRenderCallback: () => {
                this.domNodes?.scrollbar.scanDomNode();
            },
        }));
        renderedContents.element.classList.add('markdown-docs');
        return renderedContents;
    }
    hasDocs(signature, activeParameter) {
        if (activeParameter &&
            typeof activeParameter.documentation === 'string' &&
            assertIsDefined(activeParameter.documentation).length > 0) {
            return true;
        }
        if (activeParameter &&
            typeof activeParameter.documentation === 'object' &&
            assertIsDefined(activeParameter.documentation).value.length > 0) {
            return true;
        }
        if (signature.documentation &&
            typeof signature.documentation === 'string' &&
            assertIsDefined(signature.documentation).length > 0) {
            return true;
        }
        if (signature.documentation &&
            typeof signature.documentation === 'object' &&
            assertIsDefined(signature.documentation.value).length > 0) {
            return true;
        }
        return false;
    }
    renderParameters(parent, signature, activeParameterIndex) {
        const [start, end] = this.getParameterLabelOffsets(signature, activeParameterIndex);
        const beforeSpan = document.createElement('span');
        beforeSpan.textContent = signature.label.substring(0, start);
        const paramSpan = document.createElement('span');
        paramSpan.textContent = signature.label.substring(start, end);
        paramSpan.className = 'parameter active';
        const afterSpan = document.createElement('span');
        afterSpan.textContent = signature.label.substring(end);
        dom.append(parent, beforeSpan, paramSpan, afterSpan);
    }
    getParameterLabelOffsets(signature, paramIdx) {
        const param = signature.parameters[paramIdx];
        if (!param) {
            return [0, 0];
        }
        else if (Array.isArray(param.label)) {
            return param.label;
        }
        else if (!param.label.length) {
            return [0, 0];
        }
        else {
            const regex = new RegExp(`(\\W|^)${escapeRegExpCharacters(param.label)}(?=\\W|$)`, 'g');
            regex.test(signature.label);
            const idx = regex.lastIndex - param.label.length;
            return idx >= 0 ? [idx, regex.lastIndex] : [0, 0];
        }
    }
    next() {
        this.editor.focus();
        this.model.next();
    }
    previous() {
        this.editor.focus();
        this.model.previous();
    }
    getDomNode() {
        if (!this.domNodes) {
            this.createParameterHintDOMNodes();
        }
        return this.domNodes.element;
    }
    getId() {
        return ParameterHintsWidget_1.ID;
    }
    updateMaxHeight() {
        if (!this.domNodes) {
            return;
        }
        const height = Math.max(this.editor.getLayoutInfo().height / 4, 250);
        const maxHeight = `${height}px`;
        this.domNodes.element.style.maxHeight = maxHeight;
        const wrapper = this.domNodes.element.getElementsByClassName('phwrapper');
        if (wrapper.length) {
            wrapper[0].style.maxHeight = maxHeight;
        }
    }
};
ParameterHintsWidget = ParameterHintsWidget_1 = __decorate([
    __param(2, IContextKeyService),
    __param(3, IOpenerService),
    __param(4, ILanguageService)
], ParameterHintsWidget);
export { ParameterHintsWidget };
registerColor('editorHoverWidget.highlightForeground', listHighlightForeground, nls.localize('editorHoverWidgetHighlightForeground', 'Foreground color of the active item in the parameter hint.'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyYW1ldGVySGludHNXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9wYXJhbWV0ZXJIaW50cy9icm93c2VyL3BhcmFtZXRlckhpbnRzV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sS0FBSyxJQUFJLE1BQU0sMENBQTBDLENBQUE7QUFDaEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDakcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV4RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNsRSxPQUFPLHNCQUFzQixDQUFBO0FBTzdCLE9BQU8sRUFBRSxvQkFBb0IsRUFBZ0IsTUFBTSx5Q0FBeUMsQ0FBQTtBQUU1RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN4RSxPQUFPLEVBRU4sZ0JBQWdCLEdBQ2hCLE1BQU0sc0VBQXNFLENBQUE7QUFFN0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ25ELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUVOLGtCQUFrQixHQUNsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4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