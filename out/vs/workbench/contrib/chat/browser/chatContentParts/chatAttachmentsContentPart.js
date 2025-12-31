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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEF0dGFjaG1lbnRzQ29udGVudFBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdENvbnRlbnRQYXJ0cy9jaGF0QXR0YWNobWVudHNDb250ZW50UGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBRzlFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ3pHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDdEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRXZELE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUdyRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDNUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFBRSx5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