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
import { createInstantHoverDelegate } from '../../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { basename, dirname } from '../../../../../base/common/path.js';
import { URI } from '../../../../../base/common/uri.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { EditorContextKeys } from '../../../../../editor/common/editorContextKeys.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { ILanguageFeaturesService } from '../../../../../editor/common/services/languageFeatures.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../../nls.js';
import { getFlatContextMenuActions } from '../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IContextKeyService, RawContextKey, } from '../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { fillInSymbolsDragData } from '../../../../../platform/dnd/browser/dnd.js';
import { FileKind, IFileService } from '../../../../../platform/files/common/files.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IOpenerService, } from '../../../../../platform/opener/common/opener.js';
import { FolderThemeIcon, IThemeService, } from '../../../../../platform/theme/common/themeService.js';
import { fillEditorsDragData } from '../../../../browser/dnd.js';
import { ResourceLabels } from '../../../../browser/labels.js';
import { ResourceContextKey } from '../../../../common/contextkeys.js';
import { revealInSideBarCommand } from '../../../files/browser/fileActions.contribution.js';
import { isImageVariableEntry, isPasteVariableEntry, } from '../../common/chatModel.js';
import { ChatResponseReferencePartStatusKind, } from '../../common/chatService.js';
import { convertUint8ArrayToString } from '../imageUtils.js';
export const chatAttachmentResourceContextKey = new RawContextKey('chatAttachmentResource', undefined, {
    type: 'URI',
    description: localize('resource', 'The full value of the chat attachment resource, including scheme and path'),
});
let ChatAttachmentsContentPart = class ChatAttachmentsContentPart extends Disposable {
    constructor(variables, contentReferences = [], domNode = dom.$('.chat-attached-context'), contextKeyService, instantiationService, openerService, hoverService, commandService, themeService, labelService) {
        super();
        this.variables = variables;
        this.contentReferences = contentReferences;
        this.domNode = domNode;
        this.contextKeyService = contextKeyService;
        this.instantiationService = instantiationService;
        this.openerService = openerService;
        this.hoverService = hoverService;
        this.commandService = commandService;
        this.themeService = themeService;
        this.labelService = labelService;
        this.attachedContextDisposables = this._register(new DisposableStore());
        this._onDidChangeVisibility = this._register(new Emitter());
        this._contextResourceLabels = this._register(this.instantiationService.createInstance(ResourceLabels, {
            onDidChangeVisibility: this._onDidChangeVisibility.event,
        }));
        this.initAttachedContext(domNode);
        if (!domNode.childElementCount) {
            this.domNode = undefined;
        }
    }
    // TODO@joyceerhl adopt chat attachment widgets
    initAttachedContext(container) {
        dom.clearNode(container);
        this.attachedContextDisposables.clear();
        const hoverDelegate = this.attachedContextDisposables.add(createInstantHoverDelegate());
        this.variables.forEach(async (attachment) => {
            let resource = URI.isUri(attachment.value)
                ? attachment.value
                : attachment.value &&
                    typeof attachment.value === 'object' &&
                    'uri' in attachment.value &&
                    URI.isUri(attachment.value.uri)
                    ? attachment.value.uri
                    : undefined;
            let range = attachment.value &&
                typeof attachment.value === 'object' &&
                'range' in attachment.value &&
                Range.isIRange(attachment.value.range)
                ? attachment.value.range
                : undefined;
            const widget = dom.append(container, dom.$('.chat-attached-context-attachment.show-file-icons'));
            const label = this._contextResourceLabels.create(widget, {
                supportIcons: true,
                hoverDelegate,
                hoverTargetOverride: widget,
            });
            this.attachedContextDisposables.add(label);
            const correspondingContentReference = this.contentReferences.find((ref) => (typeof ref.reference === 'object' &&
                'variableName' in ref.reference &&
                ref.reference.variableName === attachment.name) ||
                (URI.isUri(ref.reference) && basename(ref.reference.path) === attachment.name));
            const isAttachmentOmitted = correspondingContentReference?.options?.status?.kind ===
                ChatResponseReferencePartStatusKind.Omitted;
            const isAttachmentPartialOrOmitted = isAttachmentOmitted ||
                correspondingContentReference?.options?.status?.kind ===
                    ChatResponseReferencePartStatusKind.Partial;
            let ariaLabel;
            if (resource && (attachment.isFile || attachment.isDirectory)) {
                const fileBasename = basename(resource.path);
                const fileDirname = dirname(resource.path);
                const friendlyName = `${fileBasename} ${fileDirname}`;
                if (isAttachmentOmitted) {
                    ariaLabel = range
                        ? localize('chat.omittedFileAttachmentWithRange', 'Omitted: {0}, line {1} to line {2}.', friendlyName, range.startLineNumber, range.endLineNumber)
                        : localize('chat.omittedFileAttachment', 'Omitted: {0}.', friendlyName);
                }
                else if (isAttachmentPartialOrOmitted) {
                    ariaLabel = range
                        ? localize('chat.partialFileAttachmentWithRange', 'Partially attached: {0}, line {1} to line {2}.', friendlyName, range.startLineNumber, range.endLineNumber)
                        : localize('chat.partialFileAttachment', 'Partially attached: {0}.', friendlyName);
                }
                else {
                    ariaLabel = range
                        ? localize('chat.fileAttachmentWithRange3', 'Attached: {0}, line {1} to line {2}.', friendlyName, range.startLineNumber, range.endLineNumber)
                        : localize('chat.fileAttachment3', 'Attached: {0}.', friendlyName);
                }
                if (attachment.isOmitted) {
                    this.customAttachment(widget, friendlyName, hoverDelegate, ariaLabel, isAttachmentOmitted);
                }
                else {
                    const fileOptions = {
                        hidePath: true,
                        title: correspondingContentReference?.options?.status?.description,
                    };
                    label.setFile(resource, attachment.isFile
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
                    if (resource) {
                        this.attachedContextDisposables.add(hookUpResourceAttachmentDragAndContextMenu(accessor, widget, resource));
                    }
                });
            }
            else if (attachment.isImage) {
                ariaLabel = localize('chat.imageAttachment', 'Attached image, {0}', attachment.name);
                const isURL = isImageVariableEntry(attachment) && attachment.isURL;
                const hoverElement = this.customAttachment(widget, attachment.name, hoverDelegate, ariaLabel, isAttachmentOmitted, attachment.isImage, isURL, attachment.value);
                if (attachment.references) {
                    widget.style.cursor = 'pointer';
                    const clickHandler = () => {
                        if (attachment.references && URI.isUri(attachment.references[0].reference)) {
                            this.openResource(attachment.references[0].reference, false, undefined);
                        }
                    };
                    this.attachedContextDisposables.add(dom.addDisposableListener(widget, 'click', clickHandler));
                }
                if (!isAttachmentPartialOrOmitted) {
                    const buffer = attachment.value;
                    this.createImageElements(buffer, widget, hoverElement);
                    this.attachedContextDisposables.add(this.hoverService.setupManagedHover(hoverDelegate, widget, hoverElement, {
                        trapFocus: false,
                    }));
                }
                widget.style.position = 'relative';
            }
            else if (isPasteVariableEntry(attachment)) {
                ariaLabel = localize('chat.attachment', 'Attached context, {0}', attachment.name);
                const classNames = ['file-icon', `${attachment.language}-lang-file-icon`];
                if (attachment.copiedFrom) {
                    resource = attachment.copiedFrom.uri;
                    range = attachment.copiedFrom.range;
                    const filename = basename(resource.path);
                    label.setLabel(filename, undefined, { extraClasses: classNames });
                }
                else {
                    label.setLabel(attachment.fileName, undefined, { extraClasses: classNames });
                }
                widget.appendChild(dom.$('span.attachment-additional-info', {}, `Pasted ${attachment.pastedLines}`));
                widget.style.position = 'relative';
                const hoverContent = {
                    markdown: {
                        value: `**${attachment.copiedFrom ? this.labelService.getUriLabel(attachment.copiedFrom.uri, { relative: true }) : attachment.fileName}**\n\n---\n\n\`\`\`${attachment.language}\n${attachment.code}\n\`\`\``,
                    },
                    markdownNotSupportedFallback: attachment.code,
                };
                if (!this.attachedContextDisposables.isDisposed) {
                    this.attachedContextDisposables.add(this.hoverService.setupManagedHover(hoverDelegate, widget, hoverContent, {
                        trapFocus: true,
                    }));
                    const resource = attachment.copiedFrom?.uri;
                    if (resource) {
                        this.attachedContextDisposables.add(this.instantiationService.invokeFunction((accessor) => hookUpResourceAttachmentDragAndContextMenu(accessor, widget, resource)));
                    }
                }
            }
            else {
                const attachmentLabel = attachment.fullName ?? attachment.name;
                const withIcon = attachment.icon?.id
                    ? `$(${attachment.icon.id}) ${attachmentLabel}`
                    : attachmentLabel;
                label.setLabel(withIcon, correspondingContentReference?.options?.status?.description);
                ariaLabel = localize('chat.attachment3', 'Attached context: {0}.', attachment.name);
            }
            if (attachment.kind === 'symbol') {
                const scopedContextKeyService = this.attachedContextDisposables.add(this.contextKeyService.createScoped(widget));
                this.attachedContextDisposables.add(this.instantiationService.invokeFunction((accessor) => hookUpSymbolAttachmentDragAndContextMenu(accessor, widget, scopedContextKeyService, { ...attachment, kind: attachment.symbolKind }, MenuId.ChatInputSymbolAttachmentContext)));
            }
            if (isAttachmentPartialOrOmitted) {
                widget.classList.add('warning');
            }
            const description = correspondingContentReference?.options?.status?.description;
            if (isAttachmentPartialOrOmitted) {
                ariaLabel = `${ariaLabel}${description ? ` ${description}` : ''}`;
                for (const selector of ['.monaco-icon-suffix-container', '.monaco-icon-name-container']) {
                    const element = label.element.querySelector(selector);
                    if (element) {
                        element.classList.add('warning');
                    }
                }
            }
            if (this.attachedContextDisposables.isDisposed) {
                return;
            }
            if (resource) {
                widget.style.cursor = 'pointer';
                if (!this.attachedContextDisposables.isDisposed) {
                    this.attachedContextDisposables.add(dom.addDisposableListener(widget, dom.EventType.CLICK, async (e) => {
                        dom.EventHelper.stop(e, true);
                        if (attachment.isDirectory) {
                            this.openResource(resource, true);
                        }
                        else {
                            this.openResource(resource, false, range);
                        }
                    }));
                }
            }
            widget.ariaLabel = ariaLabel;
            widget.tabIndex = 0;
        });
    }
    customAttachment(widget, friendlyName, hoverDelegate, ariaLabel, isAttachmentOmitted, isImage, isURL, value) {
        const pillIcon = dom.$('div.chat-attached-context-pill', {}, dom.$(isAttachmentOmitted ? 'span.codicon.codicon-warning' : 'span.codicon.codicon-file-media'));
        const textLabel = dom.$('span.chat-attached-context-custom-text', {}, friendlyName);
        widget.appendChild(pillIcon);
        widget.appendChild(textLabel);
        const hoverElement = dom.$('div.chat-attached-context-hover');
        hoverElement.setAttribute('aria-label', ariaLabel);
        if (isURL && !isAttachmentOmitted && value) {
            hoverElement.textContent = localize('chat.imageAttachmentHover', '{0}', convertUint8ArrayToString(value));
            this.attachedContextDisposables.add(this.hoverService.setupManagedHover(hoverDelegate, widget, hoverElement, {
                trapFocus: true,
            }));
        }
        if (isAttachmentOmitted) {
            widget.classList.add('warning');
            hoverElement.textContent = localize('chat.fileAttachmentHover', 'Selected model does not support this {0} type.', isImage ? 'image' : 'file');
            this.attachedContextDisposables.add(this.hoverService.setupManagedHover(hoverDelegate, widget, hoverElement, {
                trapFocus: true,
            }));
        }
        return hoverElement;
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
    // Helper function to create and replace image
    async createImageElements(buffer, widget, hoverElement) {
        const blob = new Blob([buffer], { type: 'image/png' });
        const url = URL.createObjectURL(blob);
        const img = dom.$('img.chat-attached-context-image', { src: url, alt: '' });
        const pillImg = dom.$('img.chat-attached-context-pill-image', { src: url, alt: '' });
        const pill = dom.$('div.chat-attached-context-pill', {}, pillImg);
        const existingPill = widget.querySelector('.chat-attached-context-pill');
        if (existingPill) {
            existingPill.replaceWith(pill);
        }
        // Update hover image
        hoverElement.appendChild(img);
        img.onload = () => {
            URL.revokeObjectURL(url);
        };
        img.onerror = () => {
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
ChatAttachmentsContentPart = __decorate([
    __param(3, IContextKeyService),
    __param(4, IInstantiationService),
    __param(5, IOpenerService),
    __param(6, IHoverService),
    __param(7, ICommandService),
    __param(8, IThemeService),
    __param(9, ILabelService)
], ChatAttachmentsContentPart);
export { ChatAttachmentsContentPart };
export function hookUpResourceAttachmentDragAndContextMenu(accessor, widget, resource) {
    const contextKeyService = accessor.get(IContextKeyService);
    const instantiationService = accessor.get(IInstantiationService);
    const store = new DisposableStore();
    // Context
    const scopedContextKeyService = store.add(contextKeyService.createScoped(widget));
    store.add(setResourceContext(accessor, scopedContextKeyService, resource));
    // Drag and drop
    widget.draggable = true;
    store.add(dom.addDisposableListener(widget, 'dragstart', (e) => {
        instantiationService.invokeFunction((accessor) => fillEditorsDragData(accessor, [resource], e));
        e.dataTransfer?.setDragImage(widget, 0, 0);
    }));
    // Context menu
    store.add(addBasicContextMenu(accessor, widget, scopedContextKeyService, MenuId.ChatInputResourceAttachmentContext, resource));
    return store;
}
export function hookUpSymbolAttachmentDragAndContextMenu(accessor, widget, scopedContextKeyService, attachment, contextMenuId) {
    const instantiationService = accessor.get(IInstantiationService);
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const textModelService = accessor.get(ITextModelService);
    const store = new DisposableStore();
    // Context
    store.add(setResourceContext(accessor, scopedContextKeyService, attachment.value.uri));
    const chatResourceContext = chatAttachmentResourceContextKey.bindTo(scopedContextKeyService);
    chatResourceContext.set(attachment.value.uri.toString());
    // Drag and drop
    widget.draggable = true;
    store.add(dom.addDisposableListener(widget, 'dragstart', (e) => {
        instantiationService.invokeFunction((accessor) => fillEditorsDragData(accessor, [{ resource: attachment.value.uri, selection: attachment.value.range }], e));
        fillInSymbolsDragData([
            {
                fsPath: attachment.value.uri.fsPath,
                range: attachment.value.range,
                name: attachment.name,
                kind: attachment.kind,
            },
        ], e);
        e.dataTransfer?.setDragImage(widget, 0, 0);
    }));
    // Context menu
    const providerContexts = [
        [
            EditorContextKeys.hasDefinitionProvider.bindTo(scopedContextKeyService),
            languageFeaturesService.definitionProvider,
        ],
        [
            EditorContextKeys.hasReferenceProvider.bindTo(scopedContextKeyService),
            languageFeaturesService.referenceProvider,
        ],
        [
            EditorContextKeys.hasImplementationProvider.bindTo(scopedContextKeyService),
            languageFeaturesService.implementationProvider,
        ],
        [
            EditorContextKeys.hasTypeDefinitionProvider.bindTo(scopedContextKeyService),
            languageFeaturesService.typeDefinitionProvider,
        ],
    ];
    const updateContextKeys = async () => {
        const modelRef = await textModelService.createModelReference(attachment.value.uri);
        try {
            const model = modelRef.object.textEditorModel;
            for (const [contextKey, registry] of providerContexts) {
                contextKey.set(registry.has(model));
            }
        }
        finally {
            modelRef.dispose();
        }
    };
    store.add(addBasicContextMenu(accessor, widget, scopedContextKeyService, contextMenuId, attachment.value, updateContextKeys));
    return store;
}
function setResourceContext(accessor, scopedContextKeyService, resource) {
    const fileService = accessor.get(IFileService);
    const languageService = accessor.get(ILanguageService);
    const modelService = accessor.get(IModelService);
    const resourceContextKey = new ResourceContextKey(scopedContextKeyService, fileService, languageService, modelService);
    resourceContextKey.set(resource);
    return resourceContextKey;
}
function addBasicContextMenu(accessor, widget, scopedContextKeyService, menuId, arg, updateContextKeys) {
    const contextMenuService = accessor.get(IContextMenuService);
    const menuService = accessor.get(IMenuService);
    return dom.addDisposableListener(widget, dom.EventType.CONTEXT_MENU, async (domEvent) => {
        const event = new StandardMouseEvent(dom.getWindow(domEvent), domEvent);
        dom.EventHelper.stop(domEvent, true);
        try {
            await updateContextKeys?.();
        }
        catch (e) {
            console.error(e);
        }
        contextMenuService.showContextMenu({
            contextKeyService: scopedContextKeyService,
            getAnchor: () => event,
            getActions: () => {
                const menu = menuService.getMenuActions(menuId, scopedContextKeyService, { arg });
                return getFlatContextMenuActions(menu);
            },
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEF0dGFjaG1lbnRzQ29udGVudFBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Q29udGVudFBhcnRzL2NoYXRBdHRhY2htZW50c0NvbnRlbnRQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUE7QUFDekQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFHOUUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sOERBQThELENBQUE7QUFDekcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLE1BQU0seUNBQXlDLENBQUE7QUFDbEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFdkQsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBR3JGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDaEQsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sb0VBQW9FLENBQUE7QUFDOUcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUN4RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDckYsT0FBTyxFQUVOLGtCQUFrQixFQUVsQixhQUFhLEdBQ2IsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUVsRixPQUFPLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDN0UsT0FBTyxFQUNOLGNBQWMsR0FFZCxNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFDTixlQUFlLEVBQ2YsYUFBYSxHQUNiLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDaEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzNGLE9BQU8sRUFFTixvQkFBb0IsRUFDcEIsb0JBQW9CLEdBQ3BCLE1BQU0sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxFQUNOLG1DQUFtQyxHQUVuQyxNQUFNLDZCQUE2QixDQUFBO0FBQ3BDLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBRTVELE1BQU0sQ0FBQyxNQUFNLGdDQUFnQyxHQUFHLElBQUksYUFBYSxDQUNoRSx3QkFBd0IsRUFDeEIsU0FBUyxFQUNUO0lBQ0MsSUFBSSxFQUFFLEtBQUs7SUFDWCxXQUFXLEVBQUUsUUFBUSxDQUNwQixVQUFVLEVBQ1YsMkVBQTJFLENBQzNFO0NBQ0QsQ0FDRCxDQUFBO0FBRU0sSUFBTSwwQkFBMEIsR0FBaEMsTUFBTSwwQkFBMkIsU0FBUSxVQUFVO0lBVXpELFlBQ2tCLFNBQXNDLEVBQ3RDLG9CQUEwRCxFQUFFLEVBQzdELFVBQW1DLEdBQUcsQ0FBQyxDQUFDLENBQUMsd0JBQXdCLENBQUMsRUFDOUQsaUJBQXNELEVBQ25ELG9CQUE0RCxFQUNuRSxhQUE4QyxFQUMvQyxZQUE0QyxFQUMxQyxjQUFnRCxFQUNsRCxZQUE0QyxFQUM1QyxZQUE0QztRQUUzRCxLQUFLLEVBQUUsQ0FBQTtRQVhVLGNBQVMsR0FBVCxTQUFTLENBQTZCO1FBQ3RDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBMkM7UUFDN0QsWUFBTyxHQUFQLE9BQU8sQ0FBMkQ7UUFDN0Msc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUNsQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQ2xELGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUM5QixpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUN6QixtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFDakMsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDM0IsaUJBQVksR0FBWixZQUFZLENBQWU7UUFuQjNDLCtCQUEwQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQyxDQUFBO1FBRWxFLDJCQUFzQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVcsQ0FBQyxDQUFBO1FBQy9ELDJCQUFzQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3ZELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsY0FBYyxFQUFFO1lBQ3hELHFCQUFxQixFQUFFLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLO1NBQ3hELENBQUMsQ0FDRixDQUFBO1FBZ0JBLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNqQyxJQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDaEMsSUFBSSxDQUFDLE9BQU8sR0FBRyxTQUFTLENBQUE7UUFDekIsQ0FBQztJQUNGLENBQUM7SUFFRCwrQ0FBK0M7SUFDdkMsbUJBQW1CLENBQUMsU0FBc0I7UUFDakQsR0FBRyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUN4QixJQUFJLENBQUMsMEJBQTBCLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDdkMsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEdBQUcsQ0FBQywwQkFBMEIsRUFBRSxDQUFDLENBQUE7UUFFdkYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSxFQUFFO1lBQzNDLElBQUksUUFBUSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQztnQkFDekMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLO2dCQUNsQixDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUs7b0JBQ2YsT0FBTyxVQUFVLENBQUMsS0FBSyxLQUFLLFFBQVE7b0JBQ3BDLEtBQUssSUFBSSxVQUFVLENBQUMsS0FBSztvQkFDekIsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQztvQkFDakMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRztvQkFDdEIsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtZQUNiLElBQUksS0FBSyxHQUNSLFVBQVUsQ0FBQyxLQUFLO2dCQUNoQixPQUFPLFVBQVUsQ0FBQyxLQUFLLEtBQUssUUFBUTtnQkFDcEMsT0FBTyxJQUFJLFVBQVUsQ0FBQyxLQUFLO2dCQUMzQixLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDO2dCQUNyQyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxLQUFLO2dCQUN4QixDQUFDLENBQUMsU0FBUyxDQUFBO1lBRWIsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FDeEIsU0FBUyxFQUNULEdBQUcsQ0FBQyxDQUFDLENBQUMsbURBQW1ELENBQUMsQ0FDMUQsQ0FBQTtZQUNELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFO2dCQUN4RCxZQUFZLEVBQUUsSUFBSTtnQkFDbEIsYUFBYTtnQkFDYixtQkFBbUIsRUFBRSxNQUFNO2FBQzNCLENBQUMsQ0FBQTtZQUNGLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7WUFFMUMsTUFBTSw2QkFBNkIsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUNoRSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQ1AsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxTQUFTLEtBQUssUUFBUTtnQkFDakMsY0FBYyxJQUFJLEdBQUcsQ0FBQyxTQUFTO2dCQUMvQixHQUFHLENBQUMsU0FBUyxDQUFDLFlBQVksS0FBSyxVQUFVLENBQUMsSUFBSSxDQUFDO2dCQUNoRCxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FDL0UsQ0FBQTtZQUNELE1BQU0sbUJBQW1CLEdBQ3hCLDZCQUE2QixFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsSUFBSTtnQkFDcEQsbUNBQW1DLENBQUMsT0FBTyxDQUFBO1lBQzVDLE1BQU0sNEJBQTRCLEdBQ2pDLG1CQUFtQjtnQkFDbkIsNkJBQTZCLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJO29CQUNuRCxtQ0FBbUMsQ0FBQyxPQUFPLENBQUE7WUFFN0MsSUFBSSxTQUE2QixDQUFBO1lBRWpDLElBQUksUUFBUSxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sSUFBSSxVQUFVLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztnQkFDL0QsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDNUMsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDMUMsTUFBTSxZQUFZLEdBQUcsR0FBRyxZQUFZLElBQUksV0FBVyxFQUFFLENBQUE7Z0JBRXJELElBQUksbUJBQW1CLEVBQUUsQ0FBQztvQkFDekIsU0FBUyxHQUFHLEtBQUs7d0JBQ2hCLENBQUMsQ0FBQyxRQUFRLENBQ1IscUNBQXFDLEVBQ3JDLHFDQUFxQyxFQUNyQyxZQUFZLEVBQ1osS0FBSyxDQUFDLGVBQWUsRUFDckIsS0FBSyxDQUFDLGFBQWEsQ0FDbkI7d0JBQ0YsQ0FBQyxDQUFDLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSxlQUFlLEVBQUUsWUFBWSxDQUFDLENBQUE7Z0JBQ3pFLENBQUM7cUJBQU0sSUFBSSw0QkFBNEIsRUFBRSxDQUFDO29CQUN6QyxTQUFTLEdBQUcsS0FBSzt3QkFDaEIsQ0FBQyxDQUFDLFFBQVEsQ0FDUixxQ0FBcUMsRUFDckMsZ0RBQWdELEVBQ2hELFlBQVksRUFDWixLQUFLLENBQUMsZUFBZSxFQUNyQixLQUFLLENBQUMsYUFBYSxDQUNuQjt3QkFDRixDQUFDLENBQUMsUUFBUSxDQUFDLDRCQUE0QixFQUFFLDBCQUEwQixFQUFFLFlBQVksQ0FBQyxDQUFBO2dCQUNwRixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsU0FBUyxHQUFHLEtBQUs7d0JBQ2hCLENBQUMsQ0FBQyxRQUFRLENBQ1IsK0JBQStCLEVBQy9CLHNDQUFzQyxFQUN0QyxZQUFZLEVBQ1osS0FBSyxDQUFDLGVBQWUsRUFDckIsS0FBSyxDQUFDLGFBQWEsQ0FDbkI7d0JBQ0YsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxnQkFBZ0IsRUFBRSxZQUFZLENBQUMsQ0FBQTtnQkFDcEUsQ0FBQztnQkFFRCxJQUFJLFVBQVUsQ0FBQyxTQUFTLEVBQUUsQ0FBQztvQkFDMUIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFFLFNBQVMsRUFBRSxtQkFBbUIsQ0FBQyxDQUFBO2dCQUMzRixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsTUFBTSxXQUFXLEdBQUc7d0JBQ25CLFFBQVEsRUFBRSxJQUFJO3dCQUNkLEtBQUssRUFBRSw2QkFBNkIsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLFdBQVc7cUJBQ2xFLENBQUE7b0JBQ0QsS0FBSyxDQUFDLE9BQU8sQ0FDWixRQUFRLEVBQ1IsVUFBVSxDQUFDLE1BQU07d0JBQ2hCLENBQUMsQ0FBQzs0QkFDQSxHQUFHLFdBQVc7NEJBQ2QsUUFBUSxFQUFFLFFBQVEsQ0FBQyxJQUFJOzRCQUN2QixLQUFLO3lCQUNMO3dCQUNGLENBQUMsQ0FBQzs0QkFDQSxHQUFHLFdBQVc7NEJBQ2QsUUFBUSxFQUFFLFFBQVEsQ0FBQyxNQUFNOzRCQUN6QixJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLGdCQUFnQixFQUFFLENBQUMsY0FBYztnQ0FDekQsQ0FBQyxDQUFDLGVBQWU7Z0NBQ2pCLENBQUMsQ0FBQyxTQUFTO3lCQUNaLENBQ0gsQ0FBQTtnQkFDRixDQUFDO2dCQUVELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtvQkFDckQsSUFBSSxRQUFRLEVBQUUsQ0FBQzt3QkFDZCxJQUFJLENBQUMsMEJBQTBCLENBQUMsR0FBRyxDQUNsQywwQ0FBMEMsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUN0RSxDQUFBO29CQUNGLENBQUM7Z0JBQ0YsQ0FBQyxDQUFDLENBQUE7WUFDSCxDQUFDO2lCQUFNLElBQUksVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUMvQixTQUFTLEdBQUcsUUFBUSxDQUFDLHNCQUFzQixFQUFFLHFCQUFxQixFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFFcEYsTUFBTSxLQUFLLEdBQUcsb0JBQW9CLENBQUMsVUFBVSxDQUFDLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQTtnQkFDbEUsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUN6QyxNQUFNLEVBQ04sVUFBVSxDQUFDLElBQUksRUFDZixhQUFhLEVBQ2IsU0FBUyxFQUNULG1CQUFtQixFQUNuQixVQUFVLENBQUMsT0FBTyxFQUNsQixLQUFLLEVBQ0wsVUFBVSxDQUFDLEtBQW1CLENBQzlCLENBQUE7Z0JBRUQsSUFBSSxVQUFVLENBQUMsVUFBVSxFQUFFLENBQUM7b0JBQzNCLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQTtvQkFDL0IsTUFBTSxZQUFZLEdBQUcsR0FBRyxFQUFFO3dCQUN6QixJQUFJLFVBQVUsQ0FBQyxVQUFVLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7NEJBQzVFLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFBO3dCQUN4RSxDQUFDO29CQUNGLENBQUMsQ0FBQTtvQkFDRCxJQUFJLENBQUMsMEJBQTBCLENBQUMsR0FBRyxDQUNsQyxHQUFHLENBQUMscUJBQXFCLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FDeEQsQ0FBQTtnQkFDRixDQUFDO2dCQUVELElBQUksQ0FBQyw0QkFBNEIsRUFBRSxDQUFDO29CQUNuQyxNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsS0FBbUIsQ0FBQTtvQkFDN0MsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUE7b0JBQ3RELElBQUksQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLENBQ2xDLElBQUksQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsYUFBYSxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUU7d0JBQ3hFLFNBQVMsRUFBRSxLQUFLO3FCQUNoQixDQUFDLENBQ0YsQ0FBQTtnQkFDRixDQUFDO2dCQUNELE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLFVBQVUsQ0FBQTtZQUNuQyxDQUFDO2lCQUFNLElBQUksb0JBQW9CLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztnQkFDN0MsU0FBUyxHQUFHLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSx1QkFBdUIsRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBRWpGLE1BQU0sVUFBVSxHQUFHLENBQUMsV0FBVyxFQUFFLEdBQUcsVUFBVSxDQUFDLFFBQVEsaUJBQWlCLENBQUMsQ0FBQTtnQkFDekUsSUFBSSxVQUFVLENBQUMsVUFBVSxFQUFFLENBQUM7b0JBQzNCLFFBQVEsR0FBRyxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQTtvQkFDcEMsS0FBSyxHQUFHLFVBQVUsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFBO29CQUNuQyxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO29CQUN4QyxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsRUFBRSxZQUFZLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQTtnQkFDbEUsQ0FBQztxQkFBTSxDQUFDO29CQUNQLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsRUFBRSxZQUFZLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQTtnQkFDN0UsQ0FBQztnQkFDRCxNQUFNLENBQUMsV0FBVyxDQUNqQixHQUFHLENBQUMsQ0FBQyxDQUFDLGlDQUFpQyxFQUFFLEVBQUUsRUFBRSxVQUFVLFVBQVUsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUNoRixDQUFBO2dCQUVELE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLFVBQVUsQ0FBQTtnQkFFbEMsTUFBTSxZQUFZLEdBQXVDO29CQUN4RCxRQUFRLEVBQUU7d0JBQ1QsS0FBSyxFQUFFLEtBQUssVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFFBQVEsc0JBQXNCLFVBQVUsQ0FBQyxRQUFRLEtBQUssVUFBVSxDQUFDLElBQUksVUFBVTtxQkFDN007b0JBQ0QsNEJBQTRCLEVBQUUsVUFBVSxDQUFDLElBQUk7aUJBQzdDLENBQUE7Z0JBRUQsSUFBSSxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxVQUFVLEVBQUUsQ0FBQztvQkFDakQsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEdBQUcsQ0FDbEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRTt3QkFDeEUsU0FBUyxFQUFFLElBQUk7cUJBQ2YsQ0FBQyxDQUNGLENBQUE7b0JBRUQsTUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUE7b0JBQzNDLElBQUksUUFBUSxFQUFFLENBQUM7d0JBQ2QsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEdBQUcsQ0FDbEMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQ3JELDBDQUEwQyxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQ3RFLENBQ0QsQ0FBQTtvQkFDRixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsTUFBTSxlQUFlLEdBQUcsVUFBVSxDQUFDLFFBQVEsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFBO2dCQUM5RCxNQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsSUFBSSxFQUFFLEVBQUU7b0JBQ25DLENBQUMsQ0FBQyxLQUFLLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLGVBQWUsRUFBRTtvQkFDL0MsQ0FBQyxDQUFDLGVBQWUsQ0FBQTtnQkFDbEIsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsNkJBQTZCLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQTtnQkFFckYsU0FBUyxHQUFHLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSx3QkFBd0IsRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDcEYsQ0FBQztZQUVELElBQUksVUFBVSxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDbEMsTUFBTSx1QkFBdUIsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsR0FBRyxDQUNsRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUMzQyxDQUFBO2dCQUNELElBQUksQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLENBQ2xDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUNyRCx3Q0FBd0MsQ0FDdkMsUUFBUSxFQUNSLE1BQU0sRUFDTix1QkFBdUIsRUFDdkIsRUFBRSxHQUFHLFVBQVUsRUFBRSxJQUFJLEVBQUUsVUFBVSxDQUFDLFVBQVUsRUFBRSxFQUM5QyxNQUFNLENBQUMsZ0NBQWdDLENBQ3ZDLENBQ0QsQ0FDRCxDQUFBO1lBQ0YsQ0FBQztZQUVELElBQUksNEJBQTRCLEVBQUUsQ0FBQztnQkFDbEMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDaEMsQ0FBQztZQUNELE1BQU0sV0FBVyxHQUFHLDZCQUE2QixFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsV0FBVyxDQUFBO1lBQy9FLElBQUksNEJBQTRCLEVBQUUsQ0FBQztnQkFDbEMsU0FBUyxHQUFHLEdBQUcsU0FBUyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUE7Z0JBQ2pFLEtBQUssTUFBTSxRQUFRLElBQUksQ0FBQywrQkFBK0IsRUFBRSw2QkFBNkIsQ0FBQyxFQUFFLENBQUM7b0JBQ3pGLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFBO29CQUNyRCxJQUFJLE9BQU8sRUFBRSxDQUFDO3dCQUNiLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFBO29CQUNqQyxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBRUQsSUFBSSxJQUFJLENBQUMsMEJBQTBCLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ2hELE9BQU07WUFDUCxDQUFDO1lBRUQsSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDZCxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUE7Z0JBQy9CLElBQUksQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsVUFBVSxFQUFFLENBQUM7b0JBQ2pELElBQUksQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLENBQ2xDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQWEsRUFBRSxFQUFFO3dCQUM5RSxHQUFHLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7d0JBQzdCLElBQUksVUFBVSxDQUFDLFdBQVcsRUFBRSxDQUFDOzRCQUM1QixJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQTt3QkFDbEMsQ0FBQzs2QkFBTSxDQUFDOzRCQUNQLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTt3QkFDMUMsQ0FBQztvQkFDRixDQUFDLENBQUMsQ0FDRixDQUFBO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBRUQsTUFBTSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUE7WUFDNUIsTUFBTSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUE7UUFDcEIsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU8sZ0JBQWdCLENBQ3ZCLE1BQW1CLEVBQ25CLFlBQW9CLEVBQ3BCLGFBQTZCLEVBQzdCLFNBQWlCLEVBQ2pCLG1CQUE0QixFQUM1QixPQUFpQixFQUNqQixLQUFlLEVBQ2YsS0FBa0I7UUFFbEIsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FDckIsZ0NBQWdDLEVBQ2hDLEVBQUUsRUFDRixHQUFHLENBQUMsQ0FBQyxDQUNKLG1CQUFtQixDQUFDLENBQUMsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsaUNBQWlDLENBQ3hGLENBQ0QsQ0FBQTtRQUNELE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsd0NBQXdDLEVBQUUsRUFBRSxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBQ25GLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDNUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUU3QixNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLGlDQUFpQyxDQUFDLENBQUE7UUFDN0QsWUFBWSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFbEQsSUFBSSxLQUFLLElBQUksQ0FBQyxtQkFBbUIsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUM1QyxZQUFZLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FDbEMsMkJBQTJCLEVBQzNCLEtBQUssRUFDTCx5QkFBeUIsQ0FBQyxLQUFLLENBQUMsQ0FDaEMsQ0FBQTtZQUNELElBQUksQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLENBQ2xDLElBQUksQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsYUFBYSxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUU7Z0JBQ3hFLFNBQVMsRUFBRSxJQUFJO2FBQ2YsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDO1FBRUQsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1lBQ3pCLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQy9CLFlBQVksQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUNsQywwQkFBMEIsRUFDMUIsZ0RBQWdELEVBQ2hELE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQzFCLENBQUE7WUFDRCxJQUFJLENBQUMsMEJBQTBCLENBQUMsR0FBRyxDQUNsQyxJQUFJLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLGFBQWEsRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFO2dCQUN4RSxTQUFTLEVBQUUsSUFBSTthQUNmLENBQUMsQ0FDRixDQUFBO1FBQ0YsQ0FBQztRQUVELE9BQU8sWUFBWSxDQUFBO0lBQ3BCLENBQUM7SUFJTyxZQUFZLENBQUMsUUFBYSxFQUFFLFdBQXFCLEVBQUUsS0FBYztRQUN4RSxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ2pCLCtCQUErQjtZQUMvQixJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFDdkUsT0FBTTtRQUNQLENBQUM7UUFFRCxzQkFBc0I7UUFDdEIsTUFBTSxxQkFBcUIsR0FBbUMsS0FBSztZQUNsRSxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFO1lBQ3RCLENBQUMsQ0FBQyxTQUFTLENBQUE7UUFDWixNQUFNLE9BQU8sR0FBd0I7WUFDcEMsZUFBZSxFQUFFLElBQUk7WUFDckIsYUFBYSxFQUFFLHFCQUFxQjtTQUNwQyxDQUFBO1FBQ0QsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCw4Q0FBOEM7SUFDdEMsS0FBSyxDQUFDLG1CQUFtQixDQUNoQyxNQUFnQyxFQUNoQyxNQUFtQixFQUNuQixZQUF5QjtRQUV6QixNQUFNLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUE7UUFDdEQsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNyQyxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLGlDQUFpQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMzRSxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLHNDQUFzQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNwRixNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLGdDQUFnQyxFQUFFLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUVqRSxNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsYUFBYSxDQUFDLDZCQUE2QixDQUFDLENBQUE7UUFDeEUsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNsQixZQUFZLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQy9CLENBQUM7UUFFRCxxQkFBcUI7UUFDckIsWUFBWSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUU3QixHQUFHLENBQUMsTUFBTSxHQUFHLEdBQUcsRUFBRTtZQUNqQixHQUFHLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3pCLENBQUMsQ0FBQTtRQUVELEdBQUcsQ0FBQyxPQUFPLEdBQUcsR0FBRyxFQUFFO1lBQ2xCLG1EQUFtRDtZQUNuRCxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUNyQixnQ0FBZ0MsRUFDaEMsRUFBRSxFQUNGLEdBQUcsQ0FBQyxDQUFDLENBQUMsaUNBQWlDLENBQUMsQ0FDeEMsQ0FBQTtZQUNELE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsZ0NBQWdDLEVBQUUsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1lBQ2xFLE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQyxhQUFhLENBQUMsNkJBQTZCLENBQUMsQ0FBQTtZQUN4RSxJQUFJLFlBQVksRUFBRSxDQUFDO2dCQUNsQixZQUFZLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQy9CLENBQUM7UUFDRixDQUFDLENBQUE7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQXRaWSwwQkFBMEI7SUFjcEMsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxhQUFhLENBQUE7R0FwQkgsMEJBQTBCLENBc1p0Qzs7QUFFRCxNQUFNLFVBQVUsMENBQTBDLENBQ3pELFFBQTBCLEVBQzFCLE1BQW1CLEVBQ25CLFFBQWE7SUFFYixNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtJQUMxRCxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQTtJQUVoRSxNQUFNLEtBQUssR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBRW5DLFVBQVU7SUFDVixNQUFNLHVCQUF1QixHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7SUFDakYsS0FBSyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsdUJBQXVCLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQTtJQUUxRSxnQkFBZ0I7SUFDaEIsTUFBTSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUE7SUFDdkIsS0FBSyxDQUFDLEdBQUcsQ0FDUixHQUFHLENBQUMscUJBQXFCLENBQUMsTUFBTSxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO1FBQ3BELG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQ2hELG1CQUFtQixDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUM1QyxDQUFBO1FBQ0QsQ0FBQyxDQUFDLFlBQVksRUFBRSxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUMzQyxDQUFDLENBQUMsQ0FDRixDQUFBO0lBRUQsZUFBZTtJQUNmLEtBQUssQ0FBQyxHQUFHLENBQ1IsbUJBQW1CLENBQ2xCLFFBQVEsRUFDUixNQUFNLEVBQ04sdUJBQXVCLEVBQ3ZCLE1BQU0sQ0FBQyxrQ0FBa0MsRUFDekMsUUFBUSxDQUNSLENBQ0QsQ0FBQTtJQUVELE9BQU8sS0FBSyxDQUFBO0FBQ2IsQ0FBQztBQUVELE1BQU0sVUFBVSx3Q0FBd0MsQ0FDdkQsUUFBMEIsRUFDMUIsTUFBbUIsRUFDbkIsdUJBQWlELEVBQ2pELFVBQStELEVBQy9ELGFBQXFCO0lBRXJCLE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO0lBQ2hFLE1BQU0sdUJBQXVCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO0lBQ3RFLE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBRXhELE1BQU0sS0FBSyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7SUFFbkMsVUFBVTtJQUNWLEtBQUssQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsUUFBUSxFQUFFLHVCQUF1QixFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUV0RixNQUFNLG1CQUFtQixHQUFHLGdDQUFnQyxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO0lBQzVGLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO0lBRXhELGdCQUFnQjtJQUNoQixNQUFNLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQTtJQUN2QixLQUFLLENBQUMsR0FBRyxDQUNSLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7UUFDcEQsb0JBQW9CLENBQUMsY0FBYyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FDaEQsbUJBQW1CLENBQ2xCLFFBQVEsRUFDUixDQUFDLEVBQUUsUUFBUSxFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxVQUFVLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQ3ZFLENBQUMsQ0FDRCxDQUNELENBQUE7UUFFRCxxQkFBcUIsQ0FDcEI7WUFDQztnQkFDQyxNQUFNLEVBQUUsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTTtnQkFDbkMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSztnQkFDN0IsSUFBSSxFQUFFLFVBQVUsQ0FBQyxJQUFJO2dCQUNyQixJQUFJLEVBQUUsVUFBVSxDQUFDLElBQUk7YUFDckI7U0FDRCxFQUNELENBQUMsQ0FDRCxDQUFBO1FBRUQsQ0FBQyxDQUFDLFlBQVksRUFBRSxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUMzQyxDQUFDLENBQUMsQ0FDRixDQUFBO0lBRUQsZUFBZTtJQUNmLE1BQU0sZ0JBQWdCLEdBQ3JCO1FBQ0M7WUFDQyxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsdUJBQXVCLENBQUM7WUFDdkUsdUJBQXVCLENBQUMsa0JBQWtCO1NBQzFDO1FBQ0Q7WUFDQyxpQkFBaUIsQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsdUJBQXVCLENBQUM7WUFDdEUsdUJBQXVCLENBQUMsaUJBQWlCO1NBQ3pDO1FBQ0Q7WUFDQyxpQkFBaUIsQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLENBQUMsdUJBQXVCLENBQUM7WUFDM0UsdUJBQXVCLENBQUMsc0JBQXNCO1NBQzlDO1FBQ0Q7WUFDQyxpQkFBaUIsQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLENBQUMsdUJBQXVCLENBQUM7WUFDM0UsdUJBQXVCLENBQUMsc0JBQXNCO1NBQzlDO0tBQ0QsQ0FBQTtJQUVGLE1BQU0saUJBQWlCLEdBQUcsS0FBSyxJQUFJLEVBQUU7UUFDcEMsTUFBTSxRQUFRLEdBQUcsTUFBTSxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ2xGLElBQUksQ0FBQztZQUNKLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFBO1lBQzdDLEtBQUssTUFBTSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO2dCQUN2RCxVQUFVLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtZQUNwQyxDQUFDO1FBQ0YsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ25CLENBQUM7SUFDRixDQUFDLENBQUE7SUFDRCxLQUFLLENBQUMsR0FBRyxDQUNSLG1CQUFtQixDQUNsQixRQUFRLEVBQ1IsTUFBTSxFQUNOLHVCQUF1QixFQUN2QixhQUFhLEVBQ2IsVUFBVSxDQUFDLEtBQUssRUFDaEIsaUJBQWlCLENBQ2pCLENBQ0QsQ0FBQTtJQUVELE9BQU8sS0FBSyxDQUFBO0FBQ2IsQ0FBQztBQUVELFNBQVMsa0JBQWtCLENBQzFCLFFBQTBCLEVBQzFCLHVCQUFpRCxFQUNqRCxRQUFhO0lBRWIsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtJQUM5QyxNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUE7SUFDdEQsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtJQUVoRCxNQUFNLGtCQUFrQixHQUFHLElBQUksa0JBQWtCLENBQ2hELHVCQUF1QixFQUN2QixXQUFXLEVBQ1gsZUFBZSxFQUNmLFlBQVksQ0FDWixDQUFBO0lBQ0Qsa0JBQWtCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ2hDLE9BQU8sa0JBQWtCLENBQUE7QUFDMUIsQ0FBQztBQUVELFNBQVMsbUJBQW1CLENBQzNCLFFBQTBCLEVBQzFCLE1BQW1CLEVBQ25CLHVCQUFpRCxFQUNqRCxNQUFjLEVBQ2QsR0FBUSxFQUNSLGlCQUF1QztJQUV2QyxNQUFNLGtCQUFrQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtJQUM1RCxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFBO0lBRTlDLE9BQU8sR0FBRyxDQUFDLHFCQUFxQixDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLEVBQUU7UUFDdkYsTUFBTSxLQUFLLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ3ZFLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUVwQyxJQUFJLENBQUM7WUFDSixNQUFNLGlCQUFpQixFQUFFLEVBQUUsQ0FBQTtRQUM1QixDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDakIsQ0FBQztRQUVELGtCQUFrQixDQUFDLGVBQWUsQ0FBQztZQUNsQyxpQkFBaUIsRUFBRSx1QkFBdUI7WUFDMUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDLEtBQUs7WUFDdEIsVUFBVSxFQUFFLEdBQUcsRUFBRTtnQkFDaEIsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsdUJBQXVCLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFBO2dCQUNqRixPQUFPLHlCQUF5QixDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ3ZDLENBQUM7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMifQ==