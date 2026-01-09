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
import { ButtonWithIcon } from '../../../../../base/browser/ui/button/button.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { $ } from './chatReferencesContentPart.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { autorun, observableValue } from '../../../../../base/common/observable.js';
export class ChatCollapsibleContentPart extends Disposable {
    constructor(title, context) {
        super();
        this.title = title;
        this.context = context;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this._isExpanded = observableValue(this, false);
        this.hasFollowingContent = this.context.contentIndex + 1 < this.context.content.length;
    }
    get domNode() {
        this._domNode ??= this.init();
        return this._domNode;
    }
    init() {
        const referencesLabel = this.title;
        const buttonElement = $('.chat-used-context-label', undefined);
        const collapseButton = this._register(new ButtonWithIcon(buttonElement, {
            buttonBackground: undefined,
            buttonBorder: undefined,
            buttonForeground: undefined,
            buttonHoverBackground: undefined,
            buttonSecondaryBackground: undefined,
            buttonSecondaryForeground: undefined,
            buttonSecondaryHoverBackground: undefined,
            buttonSeparator: undefined,
        }));
        this._domNode = $('.chat-used-context', undefined, buttonElement);
        collapseButton.label = referencesLabel;
        this._register(collapseButton.onDidClick(() => {
            const value = this._isExpanded.get();
            this._isExpanded.set(!value, undefined);
        }));
        this._register(autorun((r) => {
            const value = this._isExpanded.read(r);
            collapseButton.icon = value ? Codicon.chevronDown : Codicon.chevronRight;
            this._domNode?.classList.toggle('chat-used-context-collapsed', !value);
            this.updateAriaLabel(collapseButton.element, typeof referencesLabel === 'string' ? referencesLabel : referencesLabel.value, this.isExpanded());
            if (this._domNode?.isConnected) {
                queueMicrotask(() => {
                    this._onDidChangeHeight.fire();
                });
            }
        }));
        const content = this.initContent();
        this._domNode.appendChild(content);
        return this._domNode;
    }
    updateAriaLabel(element, label, expanded) {
        element.ariaLabel = expanded
            ? localize('usedReferencesExpanded', '{0}, expanded', label)
            : localize('usedReferencesCollapsed', '{0}, collapsed', label);
    }
    addDisposable(disposable) {
        this._register(disposable);
    }
    get expanded() {
        return this._isExpanded;
    }
    isExpanded() {
        return this._isExpanded.get();
    }
    setExpanded(value) {
        this._isExpanded.set(value, undefined);
    }
}
let ChatCollapsibleEditorContentPart = class ChatCollapsibleEditorContentPart extends ChatCollapsibleContentPart {
    constructor(title, context, editorPool, textModel, languageId, options = {}, codeBlockInfo, contextKeyService) {
        super(title, context);
        this.editorPool = editorPool;
        this.textModel = textModel;
        this.languageId = languageId;
        this.options = options;
        this.codeBlockInfo = codeBlockInfo;
        this.contextKeyService = contextKeyService;
        this._currentWidth = 0;
        this.codeblocks = [];
        this._contentDomNode = $('div.chat-collapsible-editor-content');
        this._editorReference = this.editorPool.get();
        this.codeblocks = [
            {
                ...codeBlockInfo,
                focus: () => {
                    this._editorReference.object.focus();
                    codeBlockInfo.focus();
                },
            },
        ];
    }
    dispose() {
        this._editorReference?.dispose();
        super.dispose();
    }
    initContent() {
        const data = {
            languageId: this.languageId,
            textModel: this.textModel,
            codeBlockIndex: this.codeBlockInfo.codeBlockIndex,
            codeBlockPartIndex: 0,
            element: this.context.element,
            parentContextKeyService: this.contextKeyService,
            renderOptions: this.options,
        };
        this._editorReference.object.render(data, this._currentWidth || 300);
        this._register(this._editorReference.object.onDidChangeContentHeight(() => this._onDidChangeHeight.fire()));
        this._contentDomNode.appendChild(this._editorReference.object.element);
        this._register(autorun((r) => {
            const value = this._isExpanded.read(r);
            this._contentDomNode.style.display = value ? 'block' : 'none';
        }));
        return this._contentDomNode;
    }
    hasSameContent(other, followingContent, element) {
        // For now, we consider content different unless it's exactly the same instance
        return false;
    }
    layout(width) {
        this._currentWidth = width;
        this._editorReference.object.layout(width);
    }
};
ChatCollapsibleEditorContentPart = __decorate([
    __param(7, IContextKeyService)
], ChatCollapsibleEditorContentPart);
export { ChatCollapsibleEditorContentPart };
