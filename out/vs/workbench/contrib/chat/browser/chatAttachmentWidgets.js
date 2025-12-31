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
import * as dom from '../../../../base/browser/dom.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { $, addDisposableListener } from '../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { FileKind } from '../../../../platform/files/common/files.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IThemeService, FolderThemeIcon } from '../../../../platform/theme/common/themeService.js';
import { revealInSideBarCommand } from '../../files/browser/fileActions.contribution.js';
import { ILanguageModelsService, } from '../common/languageModels.js';
import { hookUpResourceAttachmentDragAndContextMenu, hookUpSymbolAttachmentDragAndContextMenu, } from './chatContentParts/chatAttachmentsContentPart.js';
import { basename, dirname } from '../../../../base/common/path.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
let AbstractChatAttachmentWidget = class AbstractChatAttachmentWidget extends Disposable {
    get onDidDelete() {
        return this._onDidDelete.event;
    }
    constructor(attachment, shouldFocusClearButton, container, contextResourceLabels, hoverDelegate, currentLanguageModel, commandService, openerService) {
        super();
        this.attachment = attachment;
        this.shouldFocusClearButton = shouldFocusClearButton;
        this.hoverDelegate = hoverDelegate;
        this.currentLanguageModel = currentLanguageModel;
        this.commandService = commandService;
        this.openerService = openerService;
        this._onDidDelete = this._register(new Emitter());
        this.element = dom.append(container, $('.chat-attached-context-attachment.show-file-icons'));
        this.label = contextResourceLabels.create(this.element, {
            supportIcons: true,
            hoverDelegate,
            hoverTargetOverride: this.element,
        });
        this._register(this.label);
        this.element.tabIndex = 0;
    }
    modelSupportsVision() {
        return this.currentLanguageModel?.metadata.capabilities?.vision ?? false;
    }
    attachClearButton() {
        const clearButton = new Button(this.element, {
            supportIcons: true,
            hoverDelegate: this.hoverDelegate,
            title: localize('chat.attachment.clearButton', 'Remove from context'),
        });
        clearButton.icon = Codicon.close;
        this._register(clearButton);
        this._register(Event.once(clearButton.onDidClick)((e) => {
            this._onDidDelete.fire(e);
        }));
        if (this.shouldFocusClearButton) {
            clearButton.focus();
        }
    }
    addResourceOpenHandlers(resource, range) {
        this.element.style.cursor = 'pointer';
        this._register(dom.addDisposableListener(this.element, dom.EventType.CLICK, (e) => {
            dom.EventHelper.stop(e, true);
            if (this.attachment.isDirectory) {
                this.openResource(resource, true);
            }
            else {
                this.openResource(resource, false, range);
            }
        }));
        this._register(dom.addDisposableListener(this.element, dom.EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(3 /* KeyCode.Enter */) || event.equals(10 /* KeyCode.Space */)) {
                dom.EventHelper.stop(e, true);
                if (this.attachment.isDirectory) {
                    this.openResource(resource, true);
                }
                else {
                    this.openResource(resource, false, range);
                }
            }
        }));
    }
    openResource(resource, isDirectory, range) {
        if (isDirectory) {
            // Reveal Directory in explorer
            this.commandService.executeCommand(revealInSideBarCommand.id, resource);
            return;
        }
        // Open file in editor
        const openTextEditorOptions = range
            ? { selection: range }
            : undefined;
        const options = {
            fromUserGesture: true,
            editorOptions: openTextEditorOptions,
        };
        this.openerService.open(resource, options);
    }
};
AbstractChatAttachmentWidget = __decorate([
    __param(6, ICommandService),
    __param(7, IOpenerService)
], AbstractChatAttachmentWidget);
let FileAttachmentWidget = class FileAttachmentWidget extends AbstractChatAttachmentWidget {
    constructor(resource, range, attachment, currentLanguageModel, shouldFocusClearButton, container, contextResourceLabels, hoverDelegate, commandService, openerService, themeService, hoverService, languageModelsService, instantiationService) {
        super(attachment, shouldFocusClearButton, container, contextResourceLabels, hoverDelegate, currentLanguageModel, commandService, openerService);
        this.themeService = themeService;
        this.hoverService = hoverService;
        this.languageModelsService = languageModelsService;
        this.instantiationService = instantiationService;
        const fileBasename = basename(resource.path);
        const fileDirname = dirname(resource.path);
        const friendlyName = `${fileBasename} ${fileDirname}`;
        const ariaLabel = range
            ? localize('chat.fileAttachmentWithRange', 'Attached file, {0}, line {1} to line {2}', friendlyName, range.startLineNumber, range.endLineNumber)
            : localize('chat.fileAttachment', 'Attached file, {0}', friendlyName);
        this.element.ariaLabel = ariaLabel;
        if (attachment.isOmitted) {
            this.renderOmittedWarning(friendlyName, ariaLabel, hoverDelegate);
        }
        else {
            const fileOptions = { hidePath: true };
            this.label.setFile(resource, attachment.isFile
                ? {
                    ...fileOptions,
                    fileKind: FileKind.FILE,
                    range,
                }
                : {
                    ...fileOptions,
                    fileKind: FileKind.FOLDER,
                    icon: !this.themeService.getFileIconTheme().hasFolderIcons
                        ? FolderThemeIcon
                        : undefined,
                });
        }
        this.instantiationService.invokeFunction((accessor) => {
            this._register(hookUpResourceAttachmentDragAndContextMenu(accessor, this.element, resource));
        });
        this.addResourceOpenHandlers(resource, range);
        this.attachClearButton();
    }
    renderOmittedWarning(friendlyName, ariaLabel, hoverDelegate) {
        const pillIcon = dom.$('div.chat-attached-context-pill', {}, dom.$('span.codicon.codicon-warning'));
        const textLabel = dom.$('span.chat-attached-context-custom-text', {}, friendlyName);
        this.element.appendChild(pillIcon);
        this.element.appendChild(textLabel);
        const hoverElement = dom.$('div.chat-attached-context-hover');
        hoverElement.setAttribute('aria-label', ariaLabel);
        this.element.classList.add('warning');
        hoverElement.textContent = localize('chat.fileAttachmentHover', '{0} does not support this {1} type.', this.currentLanguageModel
            ? this.languageModelsService.lookupLanguageModel(this.currentLanguageModel.identifier)?.name
            : this.currentLanguageModel, 'file');
        this._register(this.hoverService.setupManagedHover(hoverDelegate, this.element, hoverElement, {
            trapFocus: true,
        }));
    }
};
FileAttachmentWidget = __decorate([
    __param(8, ICommandService),
    __param(9, IOpenerService),
    __param(10, IThemeService),
    __param(11, IHoverService),
    __param(12, ILanguageModelsService),
    __param(13, IInstantiationService)
], FileAttachmentWidget);
export { FileAttachmentWidget };
let ImageAttachmentWidget = class ImageAttachmentWidget extends AbstractChatAttachmentWidget {
    constructor(resource, attachment, currentLanguageModel, shouldFocusClearButton, container, contextResourceLabels, hoverDelegate, commandService, openerService, hoverService, languageModelsService, telemetryService) {
        super(attachment, shouldFocusClearButton, container, contextResourceLabels, hoverDelegate, currentLanguageModel, commandService, openerService);
        this.hoverService = hoverService;
        this.languageModelsService = languageModelsService;
        this.telemetryService = telemetryService;
        const ariaLabel = localize('chat.imageAttachment', 'Attached image, {0}', attachment.name);
        this.element.ariaLabel = ariaLabel;
        this.element.style.position = 'relative';
        if (attachment.references) {
            this.element.style.cursor = 'pointer';
            const clickHandler = () => {
                if (attachment.references && URI.isUri(attachment.references[0].reference)) {
                    this.openResource(attachment.references[0].reference, false, undefined);
                }
            };
            this._register(addDisposableListener(this.element, 'click', clickHandler));
        }
        const pillIcon = dom.$('div.chat-attached-context-pill', {}, dom.$(this.modelSupportsVision()
            ? 'span.codicon.codicon-file-media'
            : 'span.codicon.codicon-warning'));
        const textLabel = dom.$('span.chat-attached-context-custom-text', {}, attachment.name);
        this.element.appendChild(pillIcon);
        this.element.appendChild(textLabel);
        const hoverElement = dom.$('div.chat-attached-context-hover');
        hoverElement.setAttribute('aria-label', ariaLabel);
        const currentLanguageModelName = this.currentLanguageModel
            ? (this.languageModelsService.lookupLanguageModel(this.currentLanguageModel.identifier)
                ?.name ?? this.currentLanguageModel.identifier)
            : 'unknown';
        const supportsVision = this.modelSupportsVision();
        this.telemetryService.publicLog2('copilot.attachImage', {
            currentModel: currentLanguageModelName,
            supportsVision: supportsVision,
        });
        if (!supportsVision && this.currentLanguageModel) {
            this.element.classList.add('warning');
            hoverElement.textContent = localize('chat.fileAttachmentHover', '{0} does not support this {1} type.', currentLanguageModelName, 'image');
            this._register(this.hoverService.setupManagedHover(hoverDelegate, this.element, hoverElement, {
                trapFocus: true,
            }));
        }
        else {
            const buffer = attachment.value;
            this.createImageElements(buffer, this.element, hoverElement);
            this._register(this.hoverService.setupManagedHover(hoverDelegate, this.element, hoverElement, {
                trapFocus: false,
            }));
        }
        if (resource) {
            this.addResourceOpenHandlers(resource, undefined);
        }
        this.attachClearButton();
    }
    createImageElements(buffer, widget, hoverElement) {
        const blob = new Blob([buffer], { type: 'image/png' });
        const url = URL.createObjectURL(blob);
        const pillImg = dom.$('img.chat-attached-context-pill-image', { src: url, alt: '' });
        const pill = dom.$('div.chat-attached-context-pill', {}, pillImg);
        const existingPill = widget.querySelector('.chat-attached-context-pill');
        if (existingPill) {
            existingPill.replaceWith(pill);
        }
        const hoverImage = dom.$('img.chat-attached-context-image', { src: url, alt: '' });
        // Update hover image
        hoverElement.appendChild(hoverImage);
        hoverImage.onload = () => {
            URL.revokeObjectURL(url);
        };
        hoverImage.onerror = () => {
            // reset to original icon on error or invalid image
            const pillIcon = dom.$('div.chat-attached-context-pill', {}, dom.$('span.codicon.codicon-file-media'));
            const pill = dom.$('div.chat-attached-context-pill', {}, pillIcon);
            const existingPill = widget.querySelector('.chat-attached-context-pill');
            if (existingPill) {
                existingPill.replaceWith(pill);
            }
        };
    }
};
ImageAttachmentWidget = __decorate([
    __param(7, ICommandService),
    __param(8, IOpenerService),
    __param(9, IHoverService),
    __param(10, ILanguageModelsService),
    __param(11, ITelemetryService)
], ImageAttachmentWidget);
export { ImageAttachmentWidget };
let PasteAttachmentWidget = class PasteAttachmentWidget extends AbstractChatAttachmentWidget {
    constructor(attachment, currentLanguageModel, shouldFocusClearButton, container, contextResourceLabels, hoverDelegate, commandService, openerService, hoverService, instantiationService) {
        super(attachment, shouldFocusClearButton, container, contextResourceLabels, hoverDelegate, currentLanguageModel, commandService, openerService);
        this.hoverService = hoverService;
        this.instantiationService = instantiationService;
        const ariaLabel = localize('chat.attachment', 'Attached context, {0}', attachment.name);
        this.element.ariaLabel = ariaLabel;
        const classNames = ['file-icon', `${attachment.language}-lang-file-icon`];
        let resource;
        let range;
        if (attachment.copiedFrom) {
            resource = attachment.copiedFrom.uri;
            range = attachment.copiedFrom.range;
            const filename = basename(resource.path);
            this.label.setLabel(filename, undefined, { extraClasses: classNames });
        }
        else {
            this.label.setLabel(attachment.fileName, undefined, { extraClasses: classNames });
        }
        this.element.appendChild(dom.$('span.attachment-additional-info', {}, `Pasted ${attachment.pastedLines}`));
        this.element.style.position = 'relative';
        const sourceUri = attachment.copiedFrom?.uri;
        const hoverContent = {
            markdown: {
                value: `${sourceUri ? this.instantiationService.invokeFunction((accessor) => accessor.get(ILabelService).getUriLabel(sourceUri, { relative: true })) : attachment.fileName}\n\n---\n\n\`\`\`${attachment.language}\n\n${attachment.code}\n\`\`\``,
            },
            markdownNotSupportedFallback: attachment.code,
        };
        this._register(this.hoverService.setupManagedHover(hoverDelegate, this.element, hoverContent, {
            trapFocus: true,
        }));
        const copiedFromResource = attachment.copiedFrom?.uri;
        if (copiedFromResource) {
            this._register(this.instantiationService.invokeFunction((accessor) => hookUpResourceAttachmentDragAndContextMenu(accessor, this.element, copiedFromResource)));
            this.addResourceOpenHandlers(copiedFromResource, range);
        }
        this.attachClearButton();
    }
};
PasteAttachmentWidget = __decorate([
    __param(6, ICommandService),
    __param(7, IOpenerService),
    __param(8, IHoverService),
    __param(9, IInstantiationService)
], PasteAttachmentWidget);
export { PasteAttachmentWidget };
let DefaultChatAttachmentWidget = class DefaultChatAttachmentWidget extends AbstractChatAttachmentWidget {
    constructor(resource, range, attachment, currentLanguageModel, shouldFocusClearButton, container, contextResourceLabels, hoverDelegate, commandService, openerService, contextKeyService, instantiationService) {
        super(attachment, shouldFocusClearButton, container, contextResourceLabels, hoverDelegate, currentLanguageModel, commandService, openerService);
        this.contextKeyService = contextKeyService;
        this.instantiationService = instantiationService;
        const attachmentLabel = attachment.fullName ?? attachment.name;
        const withIcon = attachment.icon?.id
            ? `$(${attachment.icon.id}) ${attachmentLabel}`
            : attachmentLabel;
        this.label.setLabel(withIcon, undefined);
        this.element.ariaLabel = localize('chat.attachment', 'Attached context, {0}', attachment.name);
        if (attachment.kind === 'diagnostic') {
            if (attachment.filterUri) {
                resource = attachment.filterUri ? URI.revive(attachment.filterUri) : undefined;
                range = attachment.filterRange;
            }
            else {
                this.element.style.cursor = 'pointer';
                this._register(dom.addDisposableListener(this.element, dom.EventType.CLICK, () => {
                    this.commandService.executeCommand('workbench.panel.markers.view.focus');
                }));
            }
        }
        if (attachment.kind === 'symbol') {
            const scopedContextKeyService = this._register(this.contextKeyService.createScoped(this.element));
            this._register(this.instantiationService.invokeFunction((accessor) => hookUpSymbolAttachmentDragAndContextMenu(accessor, this.element, scopedContextKeyService, { ...attachment, kind: attachment.symbolKind }, MenuId.ChatInputSymbolAttachmentContext)));
        }
        if (resource) {
            this.addResourceOpenHandlers(resource, range);
        }
        this.attachClearButton();
    }
};
DefaultChatAttachmentWidget = __decorate([
    __param(8, ICommandService),
    __param(9, IOpenerService),
    __param(10, IContextKeyService),
    __param(11, IInstantiationService)
], DefaultChatAttachmentWidget);
export { DefaultChatAttachmentWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEF0dGFjaG1lbnRXaWRnZXRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRBdHRhY2htZW50V2lkZ2V0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLENBQUMsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUdyRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRWxGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxjQUFjLEVBQXVCLE1BQU0sOENBQThDLENBQUE7QUFDbEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUVsRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUV4RixPQUFPLEVBRU4sc0JBQXNCLEdBQ3RCLE1BQU0sNkJBQTZCLENBQUE7QUFDcEMsT0FBTyxFQUNOLDBDQUEwQyxFQUMxQyx3Q0FBd0MsR0FDeEMsTUFBTSxrREFBa0QsQ0FBQTtBQUV6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUV0RixJQUFlLDRCQUE0QixHQUEzQyxNQUFlLDRCQUE2QixTQUFRLFVBQVU7SUFPN0QsSUFBSSxXQUFXO1FBQ2QsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQTtJQUMvQixDQUFDO0lBRUQsWUFDa0IsVUFBcUMsRUFDckMsc0JBQStCLEVBQ2hELFNBQXNCLEVBQ3RCLHFCQUFxQyxFQUNsQixhQUE2QixFQUM3QixvQkFBeUUsRUFDM0UsY0FBa0QsRUFDbkQsYUFBZ0Q7UUFFaEUsS0FBSyxFQUFFLENBQUE7UUFUVSxlQUFVLEdBQVYsVUFBVSxDQUEyQjtRQUNyQywyQkFBc0IsR0FBdEIsc0JBQXNCLENBQVM7UUFHN0Isa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBQzdCLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBcUQ7UUFDeEQsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBQ2hDLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQWZoRCxpQkFBWSxHQUE4QixJQUFJLENBQUMsU0FBUyxDQUN4RSxJQUFJLE9BQU8sRUFBb0IsQ0FDL0IsQ0FBQTtRQWdCQSxJQUFJLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxtREFBbUQsQ0FBQyxDQUFDLENBQUE7UUFDNUYsSUFBSSxDQUFDLEtBQUssR0FBRyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUN2RCxZQUFZLEVBQUUsSUFBSTtZQUNsQixhQUFhO1lBQ2IsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLE9BQU87U0FDakMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDMUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFBO0lBQzFCLENBQUM7SUFFUyxtQkFBbUI7UUFDNUIsT0FBTyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsUUFBUSxDQUFDLFlBQVksRUFBRSxNQUFNLElBQUksS0FBSyxDQUFBO0lBQ3pFLENBQUM7SUFFUyxpQkFBaUI7UUFDMUIsTUFBTSxXQUFXLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUM1QyxZQUFZLEVBQUUsSUFBSTtZQUNsQixhQUFhLEVBQUUsSUFBSSxDQUFDLGFBQWE7WUFDakMsS0FBSyxFQUFFLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSxxQkFBcUIsQ0FBQztTQUNyRSxDQUFDLENBQUE7UUFDRixXQUFXLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUE7UUFDaEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUMzQixJQUFJLENBQUMsU0FBUyxDQUNiLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDeEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDMUIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7WUFDakMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ3BCLENBQUM7SUFDRixDQUFDO0lBRVMsdUJBQXVCLENBQUMsUUFBYSxFQUFFLEtBQXlCO1FBQ3pFLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUE7UUFDckMsSUFBSSxDQUFDLFNBQVMsQ0FDYixHQUFHLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQWEsRUFBRSxFQUFFO1lBQzlFLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUM3QixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ2pDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ2xDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDMUMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBZ0IsRUFBRSxFQUFFO1lBQ3BGLE1BQU0sS0FBSyxHQUFHLElBQUkscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDMUMsSUFBSSxLQUFLLENBQUMsTUFBTSx1QkFBZSxJQUFJLEtBQUssQ0FBQyxNQUFNLHdCQUFlLEVBQUUsQ0FBQztnQkFDaEUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO2dCQUM3QixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFFLENBQUM7b0JBQ2pDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO2dCQUNsQyxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO2dCQUMxQyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBSVMsWUFBWSxDQUFDLFFBQWEsRUFBRSxXQUFxQixFQUFFLEtBQWM7UUFDMUUsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNqQiwrQkFBK0I7WUFDL0IsSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsc0JBQXNCLENBQUMsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1lBQ3ZFLE9BQU07UUFDUCxDQUFDO1FBRUQsc0JBQXNCO1FBQ3RCLE1BQU0scUJBQXFCLEdBQW1DLEtBQUs7WUFDbEUsQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRTtZQUN0QixDQUFDLENBQUMsU0FBUyxDQUFBO1FBQ1osTUFBTSxPQUFPLEdBQXdCO1lBQ3BDLGVBQWUsRUFBRSxJQUFJO1lBQ3JCLGFBQWEsRUFBRSxxQkFBcUI7U0FDcEMsQ0FBQTtRQUNELElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0NBQ0QsQ0FBQTtBQXJHYyw0QkFBNEI7SUFrQnhDLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxjQUFjLENBQUE7R0FuQkYsNEJBQTRCLENBcUcxQztBQUVNLElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQXFCLFNBQVEsNEJBQTRCO0lBQ3JFLFlBQ0MsUUFBYSxFQUNiLEtBQXlCLEVBQ3pCLFVBQXFDLEVBQ3JDLG9CQUF5RSxFQUN6RSxzQkFBK0IsRUFDL0IsU0FBc0IsRUFDdEIscUJBQXFDLEVBQ3JDLGFBQTZCLEVBQ1osY0FBK0IsRUFDaEMsYUFBNkIsRUFDYixZQUEyQixFQUMzQixZQUEyQixFQUNsQixxQkFBNkMsRUFDOUMsb0JBQTJDO1FBRW5GLEtBQUssQ0FDSixVQUFVLEVBQ1Ysc0JBQXNCLEVBQ3RCLFNBQVMsRUFDVCxxQkFBcUIsRUFDckIsYUFBYSxFQUNiLG9CQUFvQixFQUNwQixjQUFjLEVBQ2QsYUFBYSxDQUNiLENBQUE7UUFkK0IsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDM0IsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDbEIsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF3QjtRQUM5Qyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBYW5GLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDNUMsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUMxQyxNQUFNLFlBQVksR0FBRyxHQUFHLFlBQVksSUFBSSxXQUFXLEVBQUUsQ0FBQTtRQUNyRCxNQUFNLFNBQVMsR0FBRyxLQUFLO1lBQ3RCLENBQUMsQ0FBQyxRQUFRLENBQ1IsOEJBQThCLEVBQzlCLDBDQUEwQyxFQUMxQyxZQUFZLEVBQ1osS0FBSyxDQUFDLGVBQWUsRUFDckIsS0FBSyxDQUFDLGFBQWEsQ0FDbkI7WUFDRixDQUFDLENBQUMsUUFBUSxDQUFDLHFCQUFxQixFQUFFLG9CQUFvQixFQUFFLFlBQVksQ0FBQyxDQUFBO1FBQ3RFLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQTtRQUVsQyxJQUFJLFVBQVUsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUMsb0JBQW9CLENBQUMsWUFBWSxFQUFFLFNBQVMsRUFBRSxhQUFhLENBQUMsQ0FBQTtRQUNsRSxDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sV0FBVyxHQUFzQixFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQTtZQUN6RCxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FDakIsUUFBUSxFQUNSLFVBQVUsQ0FBQyxNQUFNO2dCQUNoQixDQUFDLENBQUM7b0JBQ0EsR0FBRyxXQUFXO29CQUNkLFFBQVEsRUFBRSxRQUFRLENBQUMsSUFBSTtvQkFDdkIsS0FBSztpQkFDTDtnQkFDRixDQUFDLENBQUM7b0JBQ0EsR0FBRyxXQUFXO29CQUNkLFFBQVEsRUFBRSxRQUFRLENBQUMsTUFBTTtvQkFDekIsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLGNBQWM7d0JBQ3pELENBQUMsQ0FBQyxlQUFlO3dCQUNqQixDQUFDLENBQUMsU0FBUztpQkFDWixDQUNILENBQUE7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO1lBQ3JELElBQUksQ0FBQyxTQUFTLENBQUMsMENBQTBDLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQTtRQUM3RixDQUFDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFN0MsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7SUFDekIsQ0FBQztJQUVPLG9CQUFvQixDQUMzQixZQUFvQixFQUNwQixTQUFpQixFQUNqQixhQUE2QjtRQUU3QixNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUNyQixnQ0FBZ0MsRUFDaEMsRUFBRSxFQUNGLEdBQUcsQ0FBQyxDQUFDLENBQUMsOEJBQThCLENBQUMsQ0FDckMsQ0FBQTtRQUNELE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsd0NBQXdDLEVBQUUsRUFBRSxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBQ25GLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2xDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRW5DLE1BQU0sWUFBWSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsaUNBQWlDLENBQUMsQ0FBQTtRQUM3RCxZQUFZLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNsRCxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFckMsWUFBWSxDQUFDLFdBQVcsR0FBRyxRQUFRLENBQ2xDLDBCQUEwQixFQUMxQixxQ0FBcUMsRUFDckMsSUFBSSxDQUFDLG9CQUFvQjtZQUN4QixDQUFDLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsRUFBRSxJQUFJO1lBQzVGLENBQUMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQzVCLE1BQU0sQ0FDTixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLFlBQVksRUFBRTtZQUM5RSxTQUFTLEVBQUUsSUFBSTtTQUNmLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztDQUNELENBQUE7QUF4R1ksb0JBQW9CO0lBVTlCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxjQUFjLENBQUE7SUFDZCxZQUFBLGFBQWEsQ0FBQTtJQUNiLFlBQUEsYUFBYSxDQUFBO0lBQ2IsWUFBQSxzQkFBc0IsQ0FBQTtJQUN0QixZQUFBLHFCQUFxQixDQUFBO0dBZlgsb0JBQW9CLENBd0doQzs7QUFFTSxJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFzQixTQUFRLDRCQUE0QjtJQUN0RSxZQUNDLFFBQXlCLEVBQ3pCLFVBQXFDLEVBQ3JDLG9CQUF5RSxFQUN6RSxzQkFBK0IsRUFDL0IsU0FBc0IsRUFDdEIscUJBQXFDLEVBQ3JDLGFBQTZCLEVBQ1osY0FBK0IsRUFDaEMsYUFBNkIsRUFDYixZQUEyQixFQUNsQixxQkFBNkMsRUFDbEQsZ0JBQW1DO1FBRXZFLEtBQUssQ0FDSixVQUFVLEVBQ1Ysc0JBQXNCLEVBQ3RCLFNBQVMsRUFDVCxxQkFBcUIsRUFDckIsYUFBYSxFQUNiLG9CQUFvQixFQUNwQixjQUFjLEVBQ2QsYUFBYSxDQUNiLENBQUE7UUFiK0IsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDbEIsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF3QjtRQUNsRCxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBYXZFLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxxQkFBcUIsRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDMUYsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFBO1FBQ2xDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxVQUFVLENBQUE7UUFFeEMsSUFBSSxVQUFVLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDM0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQTtZQUNyQyxNQUFNLFlBQVksR0FBRyxHQUFHLEVBQUU7Z0JBQ3pCLElBQUksVUFBVSxDQUFDLFVBQVUsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztvQkFDNUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUE7Z0JBQ3hFLENBQUM7WUFDRixDQUFDLENBQUE7WUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUE7UUFDM0UsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQ3JCLGdDQUFnQyxFQUNoQyxFQUFFLEVBQ0YsR0FBRyxDQUFDLENBQUMsQ0FDSixJQUFJLENBQUMsbUJBQW1CLEVBQUU7WUFDekIsQ0FBQyxDQUFDLGlDQUFpQztZQUNuQyxDQUFDLENBQUMsOEJBQThCLENBQ2pDLENBQ0QsQ0FBQTtRQUNELE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsd0NBQXdDLEVBQUUsRUFBRSxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN0RixJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNsQyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUVuQyxNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLGlDQUFpQyxDQUFDLENBQUE7UUFDN0QsWUFBWSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFxQmxELE1BQU0sd0JBQXdCLEdBQUcsSUFBSSxDQUFDLG9CQUFvQjtZQUN6RCxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQztnQkFDckYsRUFBRSxJQUFJLElBQUksSUFBSSxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQztZQUNqRCxDQUFDLENBQUMsU0FBUyxDQUFBO1FBQ1osTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFFakQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FDL0IscUJBQXFCLEVBQ3JCO1lBQ0MsWUFBWSxFQUFFLHdCQUF3QjtZQUN0QyxjQUFjLEVBQUUsY0FBYztTQUM5QixDQUNELENBQUE7UUFFRCxJQUFJLENBQUMsY0FBYyxJQUFJLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQ2xELElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUNyQyxZQUFZLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FDbEMsMEJBQTBCLEVBQzFCLHFDQUFxQyxFQUNyQyx3QkFBd0IsRUFDeEIsT0FBTyxDQUNQLENBQUE7WUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsWUFBWSxFQUFFO2dCQUM5RSxTQUFTLEVBQUUsSUFBSTthQUNmLENBQUMsQ0FDRixDQUFBO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsS0FBbUIsQ0FBQTtZQUM3QyxJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUE7WUFDNUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLFlBQVksRUFBRTtnQkFDOUUsU0FBUyxFQUFFLEtBQUs7YUFDaEIsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDO1FBRUQsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDbEQsQ0FBQztRQUVELElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO0lBQ3pCLENBQUM7SUFFTyxtQkFBbUIsQ0FDMUIsTUFBZ0MsRUFDaEMsTUFBbUIsRUFDbkIsWUFBeUI7UUFFekIsTUFBTSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDckMsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxzQ0FBc0MsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDcEYsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxnQ0FBZ0MsRUFBRSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFFakUsTUFBTSxZQUFZLEdBQUcsTUFBTSxDQUFDLGFBQWEsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFBO1FBQ3hFLElBQUksWUFBWSxFQUFFLENBQUM7WUFDbEIsWUFBWSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUMvQixDQUFDO1FBRUQsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxpQ0FBaUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFbEYscUJBQXFCO1FBQ3JCLFlBQVksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUE7UUFFcEMsVUFBVSxDQUFDLE1BQU0sR0FBRyxHQUFHLEVBQUU7WUFDeEIsR0FBRyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUN6QixDQUFDLENBQUE7UUFFRCxVQUFVLENBQUMsT0FBTyxHQUFHLEdBQUcsRUFBRTtZQUN6QixtREFBbUQ7WUFDbkQsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FDckIsZ0NBQWdDLEVBQ2hDLEVBQUUsRUFDRixHQUFHLENBQUMsQ0FBQyxDQUFDLGlDQUFpQyxDQUFDLENBQ3hDLENBQUE7WUFDRCxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLGdDQUFnQyxFQUFFLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQTtZQUNsRSxNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsYUFBYSxDQUFDLDZCQUE2QixDQUFDLENBQUE7WUFDeEUsSUFBSSxZQUFZLEVBQUUsQ0FBQztnQkFDbEIsWUFBWSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUMvQixDQUFDO1FBQ0YsQ0FBQyxDQUFBO0lBQ0YsQ0FBQztDQUNELENBQUE7QUE3SlkscUJBQXFCO0lBUy9CLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLGFBQWEsQ0FBQTtJQUNiLFlBQUEsc0JBQXNCLENBQUE7SUFDdEIsWUFBQSxpQkFBaUIsQ0FBQTtHQWJQLHFCQUFxQixDQTZKakM7O0FBRU0sSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBc0IsU0FBUSw0QkFBNEI7SUFDdEUsWUFDQyxVQUEwQyxFQUMxQyxvQkFBeUUsRUFDekUsc0JBQStCLEVBQy9CLFNBQXNCLEVBQ3RCLHFCQUFxQyxFQUNyQyxhQUE2QixFQUNaLGNBQStCLEVBQ2hDLGFBQTZCLEVBQ2IsWUFBMkIsRUFDbkIsb0JBQTJDO1FBRW5GLEtBQUssQ0FDSixVQUFVLEVBQ1Ysc0JBQXNCLEVBQ3RCLFNBQVMsRUFDVCxxQkFBcUIsRUFDckIsYUFBYSxFQUNiLG9CQUFvQixFQUNwQixjQUFjLEVBQ2QsYUFBYSxDQUNiLENBQUE7UUFaK0IsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDbkIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQWFuRixNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3ZGLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQTtRQUVsQyxNQUFNLFVBQVUsR0FBRyxDQUFDLFdBQVcsRUFBRSxHQUFHLFVBQVUsQ0FBQyxRQUFRLGlCQUFpQixDQUFDLENBQUE7UUFDekUsSUFBSSxRQUF5QixDQUFBO1FBQzdCLElBQUksS0FBeUIsQ0FBQTtRQUU3QixJQUFJLFVBQVUsQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUMzQixRQUFRLEdBQUcsVUFBVSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUE7WUFDcEMsS0FBSyxHQUFHLFVBQVUsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFBO1lBQ25DLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDeEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFBO1FBQ3ZFLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsRUFBRSxZQUFZLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQTtRQUNsRixDQUFDO1FBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQ3ZCLEdBQUcsQ0FBQyxDQUFDLENBQUMsaUNBQWlDLEVBQUUsRUFBRSxFQUFFLFVBQVUsVUFBVSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQ2hGLENBQUE7UUFFRCxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLEdBQUcsVUFBVSxDQUFBO1FBRXhDLE1BQU0sU0FBUyxHQUFHLFVBQVUsQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFBO1FBQzVDLE1BQU0sWUFBWSxHQUF1QztZQUN4RCxRQUFRLEVBQUU7Z0JBQ1QsS0FBSyxFQUFFLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsUUFBUSxvQkFBb0IsVUFBVSxDQUFDLFFBQVEsT0FBTyxVQUFVLENBQUMsSUFBSSxVQUFVO2FBQ2pQO1lBQ0QsNEJBQTRCLEVBQUUsVUFBVSxDQUFDLElBQUk7U0FDN0MsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxZQUFZLEVBQUU7WUFDOUUsU0FBUyxFQUFFLElBQUk7U0FDZixDQUFDLENBQ0YsQ0FBQTtRQUVELE1BQU0sa0JBQWtCLEdBQUcsVUFBVSxDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUE7UUFDckQsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQ3JELDBDQUEwQyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLGtCQUFrQixDQUFDLENBQ3RGLENBQ0QsQ0FBQTtZQUNELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN4RCxDQUFDO1FBRUQsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7SUFDekIsQ0FBQztDQUNELENBQUE7QUF0RVkscUJBQXFCO0lBUS9CLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEscUJBQXFCLENBQUE7R0FYWCxxQkFBcUIsQ0FzRWpDOztBQUVNLElBQU0sMkJBQTJCLEdBQWpDLE1BQU0sMkJBQTRCLFNBQVEsNEJBQTRCO0lBQzVFLFlBQ0MsUUFBeUIsRUFDekIsS0FBeUIsRUFDekIsVUFBcUMsRUFDckMsb0JBQXlFLEVBQ3pFLHNCQUErQixFQUMvQixTQUFzQixFQUN0QixxQkFBcUMsRUFDckMsYUFBNkIsRUFDWixjQUErQixFQUNoQyxhQUE2QixFQUNSLGlCQUFxQyxFQUNsQyxvQkFBMkM7UUFFbkYsS0FBSyxDQUNKLFVBQVUsRUFDVixzQkFBc0IsRUFDdEIsU0FBUyxFQUNULHFCQUFxQixFQUNyQixhQUFhLEVBQ2Isb0JBQW9CLEVBQ3BCLGNBQWMsRUFDZCxhQUFhLENBQ2IsQ0FBQTtRQVpvQyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQ2xDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFhbkYsTUFBTSxlQUFlLEdBQUcsVUFBVSxDQUFDLFFBQVEsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFBO1FBQzlELE1BQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUNuQyxDQUFDLENBQUMsS0FBSyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxlQUFlLEVBQUU7WUFDL0MsQ0FBQyxDQUFDLGVBQWUsQ0FBQTtRQUNsQixJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDeEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDLGlCQUFpQixFQUFFLHVCQUF1QixFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUU5RixJQUFJLFVBQVUsQ0FBQyxJQUFJLEtBQUssWUFBWSxFQUFFLENBQUM7WUFDdEMsSUFBSSxVQUFVLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQzFCLFFBQVEsR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO2dCQUM5RSxLQUFLLEdBQUcsVUFBVSxDQUFDLFdBQVcsQ0FBQTtZQUMvQixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQTtnQkFDckMsSUFBSSxDQUFDLFNBQVMsQ0FDYixHQUFHLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUU7b0JBQ2pFLElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLG9DQUFvQyxDQUFDLENBQUE7Z0JBQ3pFLENBQUMsQ0FBQyxDQUNGLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksVUFBVSxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNsQyxNQUFNLHVCQUF1QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQzdDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUNqRCxDQUFBO1lBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FDckQsd0NBQXdDLENBQ3ZDLFFBQVEsRUFDUixJQUFJLENBQUMsT0FBTyxFQUNaLHVCQUF1QixFQUN2QixFQUFFLEdBQUcsVUFBVSxFQUFFLElBQUksRUFBRSxVQUFVLENBQUMsVUFBVSxFQUFFLEVBQzlDLE1BQU0sQ0FBQyxnQ0FBZ0MsQ0FDdkMsQ0FDRCxDQUNELENBQUE7UUFDRixDQUFDO1FBRUQsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDOUMsQ0FBQztRQUVELElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO0lBQ3pCLENBQUM7Q0FDRCxDQUFBO0FBdEVZLDJCQUEyQjtJQVVyQyxXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsY0FBYyxDQUFBO0lBQ2QsWUFBQSxrQkFBa0IsQ0FBQTtJQUNsQixZQUFBLHFCQUFxQixDQUFBO0dBYlgsMkJBQTJCLENBc0V2QyJ9