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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvbGxhcHNpYmxlQ29udGVudFBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Q29udGVudFBhcnRzL2NoYXRDb2xsYXBzaWJsZUNvbnRlbnRQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNoRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRTdELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFJaEQsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBS2xELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxPQUFPLEVBQWUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFaEcsTUFBTSxPQUFnQiwwQkFBMkIsU0FBUSxVQUFVO0lBU2xFLFlBQ2tCLEtBQStCLEVBQzdCLE9BQXNDO1FBRXpELEtBQUssRUFBRSxDQUFBO1FBSFUsVUFBSyxHQUFMLEtBQUssQ0FBMEI7UUFDN0IsWUFBTyxHQUFQLE9BQU8sQ0FBK0I7UUFSdkMsdUJBQWtCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDM0Qsc0JBQWlCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQTtRQUd2RCxnQkFBVyxHQUFH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