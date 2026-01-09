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
import { DataTransfers } from '../../../../base/browser/dnd.js';
import { $, DragAndDropObserver } from '../../../../base/browser/dom.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { UriList } from '../../../../base/common/dataTransfer.js';
import { Mimes } from '../../../../base/common/mime.js';
import { basename } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { SymbolKinds } from '../../../../editor/common/languages.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../nls.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { CodeDataTransfers, containsDragType, extractEditorsDropData, extractMarkerDropData, extractSymbolDropData, } from '../../../../platform/dnd/browser/dnd.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { IThemeService, Themable } from '../../../../platform/theme/common/themeService.js';
import { ISharedWebContentExtractorService } from '../../../../platform/webContentExtractor/common/webContentExtractor.js';
import { isUntitledResourceEditorInput } from '../../../common/editor.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IExtensionService, isProposedApiEnabled, } from '../../../services/extensions/common/extensions.js';
import { UntitledTextEditorInput } from '../../../services/untitled/common/untitledTextEditorInput.js';
import { IDiagnosticVariableEntryFilterData, } from '../common/chatModel.js';
import { IChatWidgetService } from './chat.js';
import { imageToHash } from './chatPasteProviders.js';
import { resizeImage } from './imageUtils.js';
var ChatDragAndDropType;
(function (ChatDragAndDropType) {
    ChatDragAndDropType[ChatDragAndDropType["FILE_INTERNAL"] = 0] = "FILE_INTERNAL";
    ChatDragAndDropType[ChatDragAndDropType["FILE_EXTERNAL"] = 1] = "FILE_EXTERNAL";
    ChatDragAndDropType[ChatDragAndDropType["FOLDER"] = 2] = "FOLDER";
    ChatDragAndDropType[ChatDragAndDropType["IMAGE"] = 3] = "IMAGE";
    ChatDragAndDropType[ChatDragAndDropType["SYMBOL"] = 4] = "SYMBOL";
    ChatDragAndDropType[ChatDragAndDropType["HTML"] = 5] = "HTML";
    ChatDragAndDropType[ChatDragAndDropType["MARKER"] = 6] = "MARKER";
})(ChatDragAndDropType || (ChatDragAndDropType = {}));
let ChatDragAndDrop = class ChatDragAndDrop extends Themable {
    constructor(attachmentModel, styles, themeService, extensionService, fileService, editorService, dialogService, textModelService, webContentExtractorService, chatWidgetService, logService) {
        super(themeService);
        this.attachmentModel = attachmentModel;
        this.styles = styles;
        this.extensionService = extensionService;
        this.fileService = fileService;
        this.editorService = editorService;
        this.dialogService = dialogService;
        this.textModelService = textModelService;
        this.webContentExtractorService = webContentExtractorService;
        this.chatWidgetService = chatWidgetService;
        this.logService = logService;
        this.overlays = new Map();
        this.overlayTextBackground = '';
        this.currentActiveTarget = undefined;
        this.updateStyles();
    }
    addOverlay(target, overlayContainer) {
        this.removeOverlay(target);
        const { overlay, disposable } = this.createOverlay(target, overlayContainer);
        this.overlays.set(target, { overlay, disposable });
    }
    removeOverlay(target) {
        if (this.currentActiveTarget === target) {
            this.currentActiveTarget = undefined;
        }
        const existingOverlay = this.overlays.get(target);
        if (existingOverlay) {
            existingOverlay.overlay.remove();
            existingOverlay.disposable.dispose();
            this.overlays.delete(target);
        }
    }
    createOverlay(target, overlayContainer) {
        const overlay = document.createElement('div');
        overlay.classList.add('chat-dnd-overlay');
        this.updateOverlayStyles(overlay);
        overlayContainer.appendChild(overlay);
        const disposable = new DragAndDropObserver(target, {
            onDragOver: (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (target === this.currentActiveTarget) {
                    return;
                }
                if (this.currentActiveTarget) {
                    this.setOverlay(this.currentActiveTarget, undefined);
                }
                this.currentActiveTarget = target;
                this.onDragEnter(e, target);
            },
            onDragLeave: (e) => {
                if (target === this.currentActiveTarget) {
                    this.currentActiveTarget = undefined;
                }
                this.onDragLeave(e, target);
            },
            onDrop: (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (target !== this.currentActiveTarget) {
                    return;
                }
                this.currentActiveTarget = undefined;
                this.onDrop(e, target);
            },
        });
        return { overlay, disposable };
    }
    onDragEnter(e, target) {
        const estimatedDropType = this.guessDropType(e);
        this.updateDropFeedback(e, target, estimatedDropType);
    }
    onDragLeave(e, target) {
        this.updateDropFeedback(e, target, undefined);
    }
    onDrop(e, target) {
        this.updateDropFeedback(e, target, undefined);
        this.drop(e);
    }
    async drop(e) {
        const contexts = await this.getAttachContext(e);
        if (contexts.length === 0) {
            return;
        }
        this.attachmentModel.addContext(...contexts);
    }
    updateDropFeedback(e, target, dropType) {
        const showOverlay = dropType !== undefined;
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = showOverlay ? 'copy' : 'none';
        }
        this.setOverlay(target, dropType);
    }
    guessDropType(e) {
        // This is an esstimation based on the datatransfer types/items
        if (this.isImageDnd(e)) {
            return this.extensionService.extensions.some((ext) => isProposedApiEnabled(ext, 'chatReferenceBinaryData'))
                ? ChatDragAndDropType.IMAGE
                : undefined;
        }
        else if (containsDragType(e, 'text/html')) {
            return ChatDragAndDropType.HTML;
        }
        else if (containsDragType(e, CodeDataTransfers.SYMBOLS)) {
            return ChatDragAndDropType.SYMBOL;
        }
        else if (containsDragType(e, CodeDataTransfers.MARKERS)) {
            return ChatDragAndDropType.MARKER;
        }
        else if (containsDragType(e, DataTransfers.FILES)) {
            return ChatDragAndDropType.FILE_EXTERNAL;
        }
        else if (containsDragType(e, DataTransfers.INTERNAL_URI_LIST)) {
            return ChatDragAndDropType.FILE_INTERNAL;
        }
        else if (containsDragType(e, Mimes.uriList, CodeDataTransfers.FILES, DataTransfers.RESOURCES)) {
            return ChatDragAndDropType.FOLDER;
        }
        return undefined;
    }
    isDragEventSupported(e) {
        // if guessed drop type is undefined, it means the drop is not supported
        const dropType = this.guessDropType(e);
        return dropType !== undefined;
    }
    getDropTypeName(type) {
        switch (type) {
            case ChatDragAndDropType.FILE_INTERNAL:
                return localize('file', 'File');
            case ChatDragAndDropType.FILE_EXTERNAL:
                return localize('file', 'File');
            case ChatDragAndDropType.FOLDER:
                return localize('folder', 'Folder');
            case ChatDragAndDropType.IMAGE:
                return localize('image', 'Image');
            case ChatDragAndDropType.SYMBOL:
                return localize('symbol', 'Symbol');
            case ChatDragAndDropType.MARKER:
                return localize('problem', 'Problem');
            case ChatDragAndDropType.HTML:
                return localize('url', 'URL');
        }
    }
    isImageDnd(e) {
        // Image detection should not have false positives, only false negatives are allowed
        if (containsDragType(e, 'image')) {
            return true;
        }
        if (containsDragType(e, DataTransfers.FILES)) {
            const files = e.dataTransfer?.files;
            if (files && files.length > 0) {
                const file = files[0];
                return file.type.startsWith('image/');
            }
            const items = e.dataTransfer?.items;
            if (items && items.length > 0) {
                const item = items[0];
                return item.type.startsWith('image/');
            }
        }
        return false;
    }
    async getAttachContext(e) {
        if (!this.isDragEventSupported(e)) {
            return [];
        }
        const markerData = extractMarkerDropData(e);
        if (markerData) {
            return this.resolveMarkerAttachContext(markerData);
        }
        if (containsDragType(e, CodeDataTransfers.SYMBOLS)) {
            const data = extractSymbolDropData(e);
            return this.resolveSymbolsAttachContext(data);
        }
        const editorDragData = extractEditorsDropData(e);
        if (editorDragData.length === 0 &&
            !containsDragType(e, DataTransfers.INTERNAL_URI_LIST) &&
            containsDragType(e, Mimes.uriList) &&
            (containsDragType(e, Mimes.html) || containsDragType(e, Mimes.text))) {
            return this.resolveHTMLAttachContext(e);
        }
        return coalesce(await Promise.all(editorDragData.map((editorInput) => {
            return this.resolveAttachContext(editorInput);
        })));
    }
    async resolveAttachContext(editorInput) {
        // Image
        const imageContext = await getImageAttachContext(editorInput, this.fileService, this.dialogService);
        if (imageContext) {
            return this.extensionService.extensions.some((ext) => isProposedApiEnabled(ext, 'chatReferenceBinaryData'))
                ? imageContext
                : undefined;
        }
        // File
        return await this.getEditorAttachContext(editorInput);
    }
    async getEditorAttachContext(editor) {
        // untitled editor
        if (isUntitledResourceEditorInput(editor)) {
            return await this.resolveUntitledAttachContext(editor);
        }
        if (!editor.resource) {
            return undefined;
        }
        let stat;
        try {
            stat = await this.fileService.stat(editor.resource);
        }
        catch {
            return undefined;
        }
        if (!stat.isDirectory && !stat.isFile) {
            return undefined;
        }
        return await getResourceAttachContext(editor.resource, stat.isDirectory, this.textModelService);
    }
    async resolveUntitledAttachContext(editor) {
        // If the resource is known, we can use it directly
        if (editor.resource) {
            return await getResourceAttachContext(editor.resource, false, this.textModelService);
        }
        // Otherwise, we need to check if the contents are already open in another editor
        const openUntitledEditors = this.editorService.editors.filter((editor) => editor instanceof UntitledTextEditorInput);
        for (const canidate of openUntitledEditors) {
            const model = await canidate.resolve();
            const contents = model.textEditorModel?.getValue();
            if (contents === editor.contents) {
                return await getResourceAttachContext(canidate.resource, false, this.textModelService);
            }
        }
        return undefined;
    }
    resolveSymbolsAttachContext(symbols) {
        return symbols.map((symbol) => {
            const resource = URI.file(symbol.fsPath);
            return {
                kind: 'symbol',
                id: symbolId(resource, symbol.range),
                value: { uri: resource, range: symbol.range },
                symbolKind: symbol.kind,
                fullName: `$(${SymbolKinds.toIcon(symbol.kind).id}) ${symbol.name}`,
                name: symbol.name,
            };
        });
    }
    async downloadImageAsUint8Array(url) {
        try {
            const extractedImages = await this.webContentExtractorService.readImage(URI.parse(url), CancellationToken.None);
            if (extractedImages) {
                return extractedImages.buffer;
            }
        }
        catch (error) {
            this.logService.warn('Fetch failed:', error);
        }
        // TODO: use dnd provider to insert text @justschen
        const selection = this.chatWidgetService.lastFocusedWidget?.inputEditor.getSelection();
        if (selection && this.chatWidgetService.lastFocusedWidget) {
            this.chatWidgetService.lastFocusedWidget.inputEditor.executeEdits('chatInsertUrl', [
                { range: selection, text: url },
            ]);
        }
        this.logService.warn(`Image URLs must end in .jpg, .png, .gif, .webp, or .bmp. Failed to fetch image from this URL: ${url}`);
        return undefined;
    }
    async resolveHTMLAttachContext(e) {
        const displayName = localize('dragAndDroppedImageName', 'Image from URL');
        let finalDisplayName = displayName;
        for (let appendValue = 2; this.attachmentModel.attachments.some((attachment) => attachment.name === finalDisplayName); appendValue++) {
            finalDisplayName = `${displayName} ${appendValue}`;
        }
        const dataFromFile = await this.extractImageFromFile(e);
        if (dataFromFile) {
            return [await this.createImageVariable(await resizeImage(dataFromFile), finalDisplayName)];
        }
        const dataFromUrl = await this.extractImageFromUrl(e);
        const variableEntries = [];
        if (dataFromUrl) {
            for (const url of dataFromUrl) {
                if (/^data:image\/[a-z]+;base64,/.test(url)) {
                    variableEntries.push(await this.createImageVariable(await resizeImage(url), finalDisplayName, URI.parse(url)));
                }
                else if (/^https?:\/\/.+/.test(url)) {
                    const imageData = await this.downloadImageAsUint8Array(url);
                    if (imageData) {
                        variableEntries.push(await this.createImageVariable(await resizeImage(imageData), finalDisplayName, URI.parse(url), url));
                    }
                }
            }
        }
        return variableEntries;
    }
    async createImageVariable(data, name, uri, id) {
        return {
            id: id || (await imageToHash(data)),
            name: name,
            value: data,
            isImage: true,
            isFile: false,
            isDirectory: false,
            references: uri ? [{ reference: uri, kind: 'reference' }] : [],
        };
    }
    resolveMarkerAttachContext(markers) {
        return markers.map((marker) => {
            let filter;
            if (!('severity' in marker)) {
                filter = { filterUri: URI.revive(marker.uri), filterSeverity: MarkerSeverity.Warning };
            }
            else {
                filter = IDiagnosticVariableEntryFilterData.fromMarker(marker);
            }
            return IDiagnosticVariableEntryFilterData.toEntry(filter);
        });
    }
    setOverlay(target, type) {
        // Remove any previous overlay text
        this.overlayText?.remove();
        this.overlayText = undefined;
        const { overlay } = this.overlays.get(target);
        if (type !== undefined) {
            // Render the overlay text
            const iconAndtextElements = renderLabelWithIcons(`$(${Codicon.attach.id}) ${this.getOverlayText(type)}`);
            const htmlElements = iconAndtextElements.map((element) => {
                if (typeof element === 'string') {
                    return $('span.overlay-text', undefined, element);
                }
                return element;
            });
            this.overlayText = $('span.attach-context-overlay-text', undefined, ...htmlElements);
            this.overlayText.style.backgroundColor = this.overlayTextBackground;
            overlay.appendChild(this.overlayText);
        }
        overlay.classList.toggle('visible', type !== undefined);
    }
    getOverlayText(type) {
        const typeName = this.getDropTypeName(type);
        return localize('attacAsContext', 'Attach {0} as Context', typeName);
    }
    updateOverlayStyles(overlay) {
        overlay.style.backgroundColor = this.getColor(this.styles.overlayBackground) || '';
        overlay.style.color = this.getColor(this.styles.listForeground) || '';
    }
    updateStyles() {
        this.overlays.forEach((overlay) => this.updateOverlayStyles(overlay.overlay));
        this.overlayTextBackground = this.getColor(this.styles.listBackground) || '';
    }
    async extractImageFromFile(e) {
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                try {
                    const buffer = await file.arrayBuffer();
                    return new Uint8Array(buffer);
                }
                catch (error) {
                    this.logService.error('Error reading file:', error);
                    return undefined;
                }
            }
        }
        return undefined;
    }
    async extractImageFromUrl(e) {
        const textUrl = e.dataTransfer?.getData('text/uri-list');
        if (textUrl) {
            try {
                const uris = UriList.parse(textUrl);
                if (uris.length > 0) {
                    return uris;
                }
            }
            catch (error) {
                this.logService.error('Error parsing URI list:', error);
                return undefined;
            }
        }
        return undefined;
    }
};
ChatDragAndDrop = __decorate([
    __param(2, IThemeService),
    __param(3, IExtensionService),
    __param(4, IFileService),
    __param(5, IEditorService),
    __param(6, IDialogService),
    __param(7, ITextModelService),
    __param(8, ISharedWebContentExtractorService),
    __param(9, IChatWidgetService),
    __param(10, ILogService)
], ChatDragAndDrop);
export { ChatDragAndDrop };
async function getResourceAttachContext(resource, isDirectory, textModelService) {
    let isOmitted = false;
    if (!isDirectory) {
        try {
            const createdModel = await textModelService.createModelReference(resource);
            createdModel.dispose();
        }
        catch {
            isOmitted = true;
        }
        if (/\.(svg)$/i.test(resource.path)) {
            isOmitted = true;
        }
    }
    return {
        value: resource,
        id: resource.toString(),
        name: basename(resource),
        isFile: !isDirectory,
        isDirectory,
        isOmitted,
    };
}
async function getImageAttachContext(editor, fileService, dialogService) {
    if (!editor.resource) {
        return undefined;
    }
    if (/\.(png|jpg|jpeg|gif|webp)$/i.test(editor.resource.path)) {
        const fileName = basename(editor.resource);
        const readFile = await fileService.readFile(editor.resource);
        if (readFile.size > 30 * 1024 * 1024) {
            // 30 MB
            dialogService.error(localize('imageTooLarge', 'Image is too large'), localize('imageTooLargeMessage', 'The image {0} is too large to be attached.', fileName));
            throw new Error('Image is too large');
        }
        const resizedImage = await resizeImage(readFile.value.buffer);
        return {
            id: editor.resource.toString(),
            name: fileName,
            fullName: editor.resource.path,
            value: resizedImage,
            icon: Codicon.fileMedia,
            isImage: true,
            isFile: false,
            references: [{ reference: editor.resource, kind: 'reference' }],
        };
    }
    return undefined;
}
function symbolId(resource, range) {
    let rangePart = '';
    if (range) {
        rangePart = `:${range.startLineNumber}`;
        if (range.startLineNumber !== range.endLineNumber) {
            rangePart += `-${range.endLineNumber}`;
        }
    }
    return resource.fsPath + rangePart;
}
