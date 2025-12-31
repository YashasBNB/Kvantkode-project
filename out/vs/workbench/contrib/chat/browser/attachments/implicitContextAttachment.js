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
import * as dom from '../../../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../../../base/browser/mouseEvent.js';
import { Button } from '../../../../../base/browser/ui/button/button.js';
import { getDefaultHoverDelegate } from '../../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { basename, dirname } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { localize } from '../../../../../nls.js';
import { getFlatContextMenuActions } from '../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId } from '../../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { FileKind, IFileService } from '../../../../../platform/files/common/files.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { ResourceContextKey } from '../../../../common/contextkeys.js';
let ImplicitContextAttachmentWidget = class ImplicitContextAttachmentWidget extends Disposable {
    constructor(attachment, resourceLabels, contextKeyService, contextMenuService, hoverService, labelService, menuService, fileService, languageService, modelService) {
        super();
        this.attachment = attachment;
        this.resourceLabels = resourceLabels;
        this.contextKeyService = contextKeyService;
        this.contextMenuService = contextMenuService;
        this.hoverService = hoverService;
        this.labelService = labelService;
        this.menuService = menuService;
        this.fileService = fileService;
        this.languageService = languageService;
        this.modelService = modelService;
        this.renderDisposables = this._register(new DisposableStore());
        this.domNode = dom.$('.chat-attached-context-attachment.show-file-icons.implicit');
        this.render();
    }
    render() {
        dom.clearNode(this.domNode);
        this.renderDisposables.clear();
        this.domNode.classList.toggle('disabled', !this.attachment.enabled);
        const label = this.resourceLabels.create(this.domNode, { supportIcons: true });
        const file = URI.isUri(this.attachment.value)
            ? this.attachment.value
            : this.attachment.value.uri;
        const range = URI.isUri(this.attachment.value) || !this.attachment.isSelection
            ? undefined
            : this.attachment.value.range;
        const fileBasename = basename(file);
        const fileDirname = dirname(file);
        const friendlyName = `${fileBasename} ${fileDirname}`;
        const ariaLabel = range
            ? localize('chat.fileAttachmentWithRange', 'Attached file, {0}, line {1} to line {2}', friendlyName, range.startLineNumber, range.endLineNumber)
            : localize('chat.fileAttachment', 'Attached file, {0}', friendlyName);
        const uriLabel = this.labelService.getUriLabel(file, { relative: true });
        const currentFile = localize('openEditor', 'Current file context');
        const inactive = localize('enableHint', 'disabled');
        const currentFileHint = currentFile + (this.attachment.enabled ? '' : ` (${inactive})`);
        const title = `${currentFileHint}\n${uriLabel}`;
        label.setFile(file, {
            fileKind: FileKind.FILE,
            hidePath: true,
            range,
            title,
        });
        this.domNode.ariaLabel = ariaLabel;
        this.domNode.tabIndex = 0;
        const hintElement = dom.append(this.domNode, dom.$('span.chat-implicit-hint', undefined, 'Current file'));
        this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('element'), hintElement, title));
        const buttonMsg = this.attachment.enabled
            ? localize('disable', 'Disable current file context')
            : localize('enable', 'Enable current file context');
        const toggleButton = this.renderDisposables.add(new Button(this.domNode, { supportIcons: true, title: buttonMsg }));
        toggleButton.icon = this.attachment.enabled ? Codicon.eye : Codicon.eyeClosed;
        this.renderDisposables.add(toggleButton.onDidClick((e) => {
            e.stopPropagation(); // prevent it from triggering the click handler on the parent immediately after rerendering
            this.attachment.enabled = !this.attachment.enabled;
        }));
        // Context menu
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
};
ImplicitContextAttachmentWidget = __decorate([
    __param(2, IContextKeyService),
    __param(3, IContextMenuService),
    __param(4, IHoverService),
    __param(5, ILabelService),
    __param(6, IMenuService),
    __param(7, IFileService),
    __param(8, ILanguageService),
    __param(9, IModelService)
], ImplicitContextAttachmentWidget);
export { ImplicitContextAttachmentWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1wbGljaXRDb250ZXh0QXR0YWNobWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hdHRhY2htZW50cy9pbXBsaWNpdENvbnRleHRBdHRhY2htZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUE7QUFDekQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDOUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ3hFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ3RHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDaEQsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sb0VBQW9FLENBQUE7QUFDOUcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUN4RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM1RixPQUFPLEVBQUUs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