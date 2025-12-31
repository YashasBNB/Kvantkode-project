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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvbGxhcHNpYmxlQ29udGVudFBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdENvbnRlbnRQYXJ0cy9jaGF0Q29sbGFwc2libGVDb250ZW50UGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDaEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUU3RCxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0seUNBQXlDLENBQUE7QUFDakYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBSWhELE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUtsRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsT0FBTyxFQUFlLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWhHLE1BQU0sT0FBZ0IsMEJBQTJCLFNBQVEsVUFBVTtJQVNsRSxZQUNrQixLQUErQixFQUM3QixPQUFzQztRQUV6RCxLQUFLLEVBQUUsQ0FBQTtRQUhVLFVBQUssR0FBTCxLQUFLLENBQTBCO1FBQzdCLFlBQU8sR0FBUCxPQUFPLENBQStCO1FBUnZDLHVCQUFrQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQzNELHNCQUFpQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUE7UUFHdkQsZ0JBQVcsR0FBRyxlQUFlLENBQVUsSUFBSSxFQUFFLEtB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