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
import { localize } from '../../../../../../nls.js';
import { URI } from '../../../../../../base/common/uri.js';
import * as dom from '../../../../../../base/browser/dom.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { ResourceContextKey } from '../../../../../common/contextkeys.js';
import { Button } from '../../../../../../base/browser/ui/button/button.js';
import { basename, dirname } from '../../../../../../base/common/resources.js';
import { ILabelService } from '../../../../../../platform/label/common/label.js';
import { StandardMouseEvent } from '../../../../../../base/browser/mouseEvent.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { IHoverService } from '../../../../../../platform/hover/browser/hover.js';
import { Disposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { FileKind, IFileService } from '../../../../../../platform/files/common/files.js';
import { IMenuService, MenuId } from '../../../../../../platform/actions/common/actions.js';
import { getCleanPromptName } from '../../../../../../platform/prompts/common/constants.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../../platform/contextview/browser/contextView.js';
import { getDefaultHoverDelegate } from '../../../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { getFlatContextMenuActions } from '../../../../../../platform/actions/browser/menuEntryActionViewItem.js';
/**
 * Widget for a single prompt instructions attachment.
 */
let PromptAttachmentWidget = class PromptAttachmentWidget extends Disposable {
    /**
     * Get the `URI` associated with the model reference.
     */
    get uri() {
        return this.model.reference.uri;
    }
    /**
     * Subscribe to the `onDispose` event.
     * @param callback Function to invoke on dispose.
     */
    onDispose(callback) {
        this._register(this._onDispose.event(callback));
        return this;
    }
    constructor(model, resourceLabels, contextKeyService, contextMenuService, hoverService, labelService, menuService, fileService, languageService, modelService) {
        super();
        this.model = model;
        this.resourceLabels = resourceLabels;
        this.contextKeyService = contextKeyService;
        this.contextMenuService = contextMenuService;
        this.hoverService = hoverService;
        this.labelService = labelService;
        this.menuService = menuService;
        this.fileService = fileService;
        this.languageService = languageService;
        this.modelService = modelService;
        /**
         * Event that fires when the object is disposed.
         *
         * See {@linkcode onDispose}.
         */
        this._onDispose = this._register(new Emitter());
        /**
         * Temporary disposables used for rendering purposes.
         */
        this.renderDisposables = this._register(new DisposableStore());
        this.domNode = dom.$('.chat-prompt-attachment.chat-attached-context-attachment.show-file-icons.implicit');
        this.render = this.render.bind(this);
        this.dispose = this.dispose.bind(this);
        this.model.onUpdate(this.render);
        this.model.onDispose(this.dispose);
        this.render();
    }
    /**
     * Render this widget.
     */
    render() {
        dom.clearNode(this.domNode);
        this.renderDisposables.clear();
        this.domNode.classList.remove('warning', 'error', 'disabled');
        const { topError } = this.model;
        const label = this.resourceLabels.create(this.domNode, { supportIcons: true });
        const file = this.model.reference.uri;
        const fileBasename = basename(file);
        const fileDirname = dirname(file);
        const friendlyName = `${fileBasename} ${fileDirname}`;
        const ariaLabel = localize('chat.promptAttachment', 'Prompt attachment, {0}', friendlyName);
        const uriLabel = this.labelService.getUriLabel(file, { relative: true });
        const promptLabel = localize('prompt', 'Prompt');
        let title = `${promptLabel} ${uriLabel}`;
        // if there are some errors/warning during the process of resolving
        // attachment references (including all the nested child references),
        // add the issue details in the hover title for the attachment, one
        // error/warning at a time because there is a limited space available
        if (topError) {
            const { errorSubject: subject } = topError;
            const isError = subject === 'root';
            this.domNode.classList.add(isError ? 'error' : 'warning');
            const severity = isError ? localize('error', 'Error') : localize('warning', 'Warning');
            title += `\n[${severity}]: ${topError.localizedMessage}`;
        }
        const fileWithoutExtension = getCleanPromptName(file);
        label.setFile(URI.file(fileWithoutExtension), {
            fileKind: FileKind.FILE,
            hidePath: true,
            range: undefined,
            title,
            icon: ThemeIcon.fromId(Codicon.bookmark.id),
            extraClasses: [],
        });
        this.domNode.ariaLabel = ariaLabel;
        this.domNode.tabIndex = 0;
        const hintElement = dom.append(this.domNode, dom.$('span.chat-implicit-hint', undefined, promptLabel));
        this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('element'), hintElement, title));
        // create the `remove` button
        const removeButton = this.renderDisposables.add(new Button(this.domNode, {
            supportIcons: true,
            title: localize('remove', 'Remove'),
        }));
        removeButton.icon = Codicon.close;
        this.renderDisposables.add(removeButton.onDidClick((e) => {
            e.stopPropagation();
            this.model.dispose();
        }));
        // context menu
        const scopedContextKeyService = this.renderDisposables.add(this.contextKeyService.createScoped(this.domNode));
        const resourceContextKey = this.renderDisposables.add(new ResourceContextKey(scopedContextKeyService, this.fileService, this.languageService, this.modelService));
        resourceContextKey.set(file);
        this.renderDisposables.add(dom.addDisposableListener(this.domNode, dom.EventType.CONTEXT_MENU, async (domEvent) => {
            const event = new StandardMouseEvent(dom.getWindow(domEvent), domEvent);
            dom.EventHelper.stop(domEvent, true);
            this.contextMenuService.showContextMenu({
                contextKeyService: scopedContextKeyService,
                getAnchor: () => event,
                getActions: () => {
                    const menu = this.menuService.getMenuActions(MenuId.ChatInputResourceAttachmentContext, scopedContextKeyService, { arg: file });
                    return getFlatContextMenuActions(menu);
                },
            });
        }));
    }
    dispose() {
        this._onDispose.fire();
        super.dispose();
    }
};
PromptAttachmentWidget = __decorate([
    __param(2, IContextKeyService),
    __param(3, IContextMenuService),
    __param(4, IHoverService),
    __param(5, ILabelService),
    __param(6, IMenuService),
    __param(7, IFileService),
    __param(8, ILanguageService),
    __param(9, IModelService)
], PromptAttachmentWidget);
export { PromptAttachmentWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0QXR0YWNobWVudFdpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hdHRhY2htZW50cy9wcm9tcHRBdHRhY2htZW50cy9wcm9tcHRBdHRhY2htZW50V2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDMUQsT0FBTyxLQUFLLEdBQUcsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDaEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDakYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxnQkFB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