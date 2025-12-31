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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdERyYWdBbmREcm9wLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXREcmFnQW5kRHJvcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDL0QsT0FBTyxFQUFFLENBQUMsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRXBELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9FLE9BQU8sRUFDTixpQkFBaUIsRUFDakIsZ0JBQWdCLEVBRWhCLHNCQUFzQixFQUN0QixxQkFBcUIsRUFDckIscUJBQXFCLEdBR3JCLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDL0UsT0FBTyxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUMzRixPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQTtBQUMxSCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUV6RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDakYsT0FBTyxFQUNOLGlCQUFpQixFQUNqQixvQkFBb0IsR0FDcEIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUN0RyxPQUFPLEVBR04sa0NBQWtDLEdBRWxDLE1BQU0sd0JBQXdCLENBQUE7QUFDL0IsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sV0FBVyxDQUFBO0FBRzlDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFFN0MsSUFBSyxtQkFRSjtBQVJELFdBQUssbUJBQW1CO0lBQ3ZCLCtFQUFhLENBQUE7SUFDYiwrRUFBYSxDQUFBO0lBQ2IsaUVBQU0sQ0FBQTtJQUNOLCtEQUFLLENBQUE7SUFDTCxpRUFBTSxDQUFBO0lBQ04sNkRBQUksQ0FBQTtJQUNKLGlFQUFNLENBQUE7QUFDUCxDQUFDLEVBUkksbUJBQW1CLEtBQW5CLG1CQUFtQixRQVF2QjtBQUVNLElBQU0sZUFBZSxHQUFyQixNQUFNLGVBQWdCLFNBQVEsUUFBUTtJQU01QyxZQUNrQixlQUFvQyxFQUNwQyxNQUF3QixFQUMxQixZQUEyQixFQUN2QixnQkFBb0QsRUFDekQsV0FBMEMsRUFDeEMsYUFBOEMsRUFDOUMsYUFBOEMsRUFDM0MsZ0JBQW9ELEVBRXZFLDBCQUE4RSxFQUMxRCxpQkFBc0QsRUFDN0QsVUFBd0M7UUFFckQsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBYkYsb0JBQWUsR0FBZixlQUFlLENBQXFCO1FBQ3BDLFdBQU0sR0FBTixNQUFNLENBQWtCO1FBRUwscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUN4QyxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUN2QixrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFDN0Isa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBQzFCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFFdEQsK0JBQTBCLEdBQTFCLDBCQUEwQixDQUFtQztRQUN6QyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQzVDLGVBQVUsR0FBVixVQUFVLENBQWE7UUFqQnJDLGFBQVEsR0FDeEIsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQUVGLDBCQUFxQixHQUFXLEVBQUUsQ0FBQTtRQXlDbEMsd0JBQW1CLEdBQTRCLFNBQVMsQ0FBQTtRQXZCL0QsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBO0lBQ3BCLENBQUM7SUFFRCxVQUFVLENBQUMsTUFBbUIsRUFBRSxnQkFBNkI7UUFDNUQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUUxQixNQUFNLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLGdCQUFnQixDQUFDLENBQUE7UUFDNUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUE7SUFDbkQsQ0FBQztJQUVELGFBQWEsQ0FBQyxNQUFtQjtRQUNoQyxJQUFJLElBQUksQ0FBQyxtQkFBbUIsS0FBSyxNQUFNLEVBQUUsQ0FBQztZQUN6QyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsU0FBUyxDQUFBO1FBQ3JDLENBQUM7UUFFRCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNqRCxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQ3JCLGVBQWUsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUE7WUFDaEMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUNwQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUM3QixDQUFDO0lBQ0YsQ0FBQztJQUdPLGFBQWEsQ0FDcEIsTUFBbUIsRUFDbkIsZ0JBQTZCO1FBRTdCLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDN0MsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUN6QyxJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDakMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBRXJDLE1BQU0sVUFBVSxHQUFHLElBQUksbUJBQW1CLENBQUMsTUFBTSxFQUFFO1lBQ2xELFVBQVUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUNqQixDQUFDLENBQUMsZUFBZSxFQUFFLENBQUE7Z0JBQ25CLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQTtnQkFFbEIsSUFBSSxNQUFNLEtBQUssSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7b0JBQ3pDLE9BQU07Z0JBQ1AsQ0FBQztnQkFFRCxJQUFJLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO29CQUM5QixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxTQUFTLENBQUMsQ0FBQTtnQkFDckQsQ0FBQztnQkFFRCxJQUFJLENBQUMsbUJBQW1CLEdBQUcsTUFBTSxDQUFBO2dCQUVqQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUM1QixDQUFDO1lBQ0QsV0FBVyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQ2xCLElBQUksTUFBTSxLQUFLLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO29CQUN6QyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsU0FBUyxDQUFBO2dCQUNyQyxDQUFDO2dCQUVELElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQzVCLENBQUM7WUFDRCxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDYixDQUFDLENBQUMsZUFBZSxFQUFFLENBQUE7Z0JBQ25CLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQTtnQkFFbEIsSUFBSSxNQUFNLEtBQUssSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7b0JBQ3pDLE9BQU07Z0JBQ1AsQ0FBQztnQkFFRCxJQUFJLENBQUMsbUJBQW1CLEdBQUcsU0FBUyxDQUFBO2dCQUNwQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUN2QixDQUFDO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsQ0FBQTtJQUMvQixDQUFDO0lBRU8sV0FBVyxDQUFDLENBQVksRUFBRSxNQUFtQjtRQUNwRCxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDL0MsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtJQUN0RCxDQUFDO0lBRU8sV0FBVyxDQUFDLENBQVksRUFBRSxNQUFtQjtRQUNwRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQTtJQUM5QyxDQUFDO0lBRU8sTUFBTSxDQUFDLENBQVksRUFBRSxNQUFtQjtRQUMvQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUM3QyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ2IsQ0FBQztJQUVPLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBWTtRQUM5QixNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMvQyxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDM0IsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFBO0lBQzdDLENBQUM7SUFFTyxrQkFBa0IsQ0FDekIsQ0FBWSxFQUNaLE1BQW1CLEVBQ25CLFFBQXlDO1FBRXpDLE1BQU0sV0FBVyxHQUFHLFFBQVEsS0FBSyxTQUFTLENBQUE7UUFDMUMsSUFBSSxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDcEIsQ0FBQyxDQUFDLFlBQVksQ0FBQyxVQUFVLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtRQUMxRCxDQUFDO1FBRUQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDbEMsQ0FBQztJQUVPLGFBQWEsQ0FBQyxDQUFZO1FBQ2pDLCtEQUErRDtRQUMvRCxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUN4QixPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FDcEQsb0JBQW9CLENBQUMsR0FBRyxFQUFFLHlCQUF5QixDQUFDLENBQ3BEO2dCQUNBLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLO2dCQUMzQixDQUFDLENBQUMsU0FBUyxDQUFBO1FBQ2IsQ0FBQzthQUFNLElBQUksZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxFQUFFLENBQUM7WUFDN0MsT0FBTyxtQkFBbUIsQ0FBQyxJQUFJLENBQUE7UUFDaEMsQ0FBQzthQUFNLElBQUksZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDM0QsT0FBTyxtQkFBbUIsQ0FBQyxNQUFNLENBQUE7UUFDbEMsQ0FBQzthQUFNLElBQUksZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDM0QsT0FBTyxtQkFBbUIsQ0FBQyxNQUFNLENBQUE7UUFDbEMsQ0FBQzthQUFNLElBQUksZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3JELE9BQU8sbUJBQW1CLENBQUMsYUFBYSxDQUFBO1FBQ3pDLENBQUM7YUFBTSxJQUFJLGdCQUFnQixDQUFDLENBQUMsRUFBRSxhQUFhLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDO1lBQ2pFLE9BQU8sbUJBQW1CLENBQUMsYUFBYSxDQUFBO1FBQ3pDLENBQUM7YUFBTSxJQUNOLGdCQUFnQixDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsT0FBTyxFQUFFLGlCQUFpQixDQUFDLEtBQUssRUFBRSxhQUFhLENBQUMsU0FBUyxDQUFDLEVBQ25GLENBQUM7WUFDRixPQUFPLG1CQUFtQixDQUFDLE1BQU0sQ0FBQTtRQUNsQyxDQUFDO1FBRUQsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVPLG9CQUFvQixDQUFDLENBQVk7UUFDeEMsd0VBQXdFO1FBQ3hFLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdEMsT0FBTyxRQUFRLEtBQUssU0FBUyxDQUFBO0lBQzlCLENBQUM7SUFFTyxlQUFlLENBQUMsSUFBeUI7UUFDaEQsUUFBUSxJQUFJLEVBQUUsQ0FBQztZQUNkLEtBQUssbUJBQW1CLENBQUMsYUFBYTtnQkFDckMsT0FBTyxRQUFRLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ2hDLEtBQUssbUJBQW1CLENBQUMsYUFBYTtnQkFDckMsT0FBTyxRQUFRLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ2hDLEtBQUssbUJBQW1CLENBQUMsTUFBTTtnQkFDOUIsT0FBTyxRQUFRLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1lBQ3BDLEtBQUssbUJBQW1CLENBQUMsS0FBSztnQkFDN0IsT0FBTyxRQUFRLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBQ2xDLEtBQUssbUJBQW1CLENBQUMsTUFBTTtnQkFDOUIsT0FBTyxRQUFRLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1lBQ3BDLEtBQUssbUJBQW1CLENBQUMsTUFBTTtnQkFDOUIsT0FBTyxRQUFRLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQ3RDLEtBQUssbUJBQW1CLENBQUMsSUFBSTtnQkFDNUIsT0FBTyxRQUFRLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQy9CLENBQUM7SUFDRixDQUFDO0lBRU8sVUFBVSxDQUFDLENBQVk7UUFDOUIsb0ZBQW9GO1FBQ3BGLElBQUksZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDbEMsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsYUFBYSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDOUMsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLFlBQVksRUFBRSxLQUFLLENBQUE7WUFDbkMsSUFBSSxLQUFLLElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDL0IsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNyQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ3RDLENBQUM7WUFFRCxNQUFNLEtBQUssR0FBRyxDQUFDLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQTtZQUNuQyxJQUFJLEtBQUssSUFBSSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUMvQixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ3JCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDdEMsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFTyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBWTtRQUMxQyxJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDbkMsT0FBTyxFQUFFLENBQUE7UUFDVixDQUFDO1FBRUQsTUFBTSxVQUFVLEdBQUcscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDM0MsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNoQixPQUFPLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUNuRCxDQUFDO1FBRUQsSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsaUJBQWlCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNwRCxNQUFNLElBQUksR0FBRyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNyQyxPQUFPLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM5QyxDQUFDO1FBRUQsTUFBTSxjQUFjLEdBQUcsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDaEQsSUFDQyxjQUFjLENBQUMsTUFBTSxLQUFLLENBQUM7WUFDM0IsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsYUFBYSxDQUFDLGlCQUFpQixDQUFDO1lBQ3JELGdCQUFnQixDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDO1lBQ2xDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQ25FLENBQUM7WUFDRixPQUFPLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN4QyxDQUFDO1FBRUQsT0FBTyxRQUFRLENBQ2QsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUNoQixjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsV0FBVyxFQUFFLEVBQUU7WUFDbEMsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDOUMsQ0FBQyxDQUFDLENBQ0YsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxvQkFBb0IsQ0FDakMsV0FBd0M7UUFFeEMsUUFBUTtRQUNSLE1BQU0sWUFBWSxHQUFHLE1BQU0scUJBQXFCLENBQy9DLFdBQVcsRUFDWCxJQUFJLENBQUMsV0FBVyxFQUNoQixJQUFJLENBQUMsYUFBYSxDQUNsQixDQUFBO1FBQ0QsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNsQixPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FDcEQsb0JBQW9CLENBQUMsR0FBRyxFQUFFLHlCQUF5QixDQUFDLENBQ3BEO2dCQUNBLENBQUMsQ0FBQyxZQUFZO2dCQUNkLENBQUMsQ0FBQyxTQUFTLENBQUE7UUFDYixDQUFDO1FBRUQsT0FBTztRQUNQLE9BQU8sTUFBTSxJQUFJLENBQUMsc0JBQXNCLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDdEQsQ0FBQztJQUVPLEtBQUssQ0FBQyxzQkFBc0IsQ0FDbkMsTUFBaUQ7UUFFakQsa0JBQWtCO1FBQ2xCLElBQUksNkJBQTZCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUMzQyxPQUFPLE1BQU0sSUFBSSxDQUFDLDRCQUE0QixDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3ZELENBQUM7UUFFRCxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3RCLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQTtRQUNSLElBQUksQ0FBQztZQUNKLElBQUksR0FBRyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNwRCxDQUFDO1FBQUMsTUFBTSxDQUFDO1lBQ1IsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3ZDLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFFRCxPQUFPLE1BQU0sd0JBQXdCLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO0lBQ2hHLENBQUM7SUFFTyxLQUFLLENBQUMsNEJBQTRCLENBQ3pDLE1BQW1DO1FBRW5DLG1EQUFtRDtRQUNuRCxJQUFJLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNyQixPQUFPLE1BQU0sd0JBQXdCLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFDckYsQ0FBQztRQUVELGlGQUFpRjtRQUNqRixNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FDNUQsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sWUFBWSx1QkFBdUIsQ0FDeEIsQ0FBQTtRQUM5QixLQUFLLE1BQU0sUUFBUSxJQUFJLG1CQUFtQixFQUFFLENBQUM7WUFDNUMsTUFBTSxLQUFLLEdBQUcsTUFBTSxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDdEMsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLGVBQWUsRUFBRSxRQUFRLEVBQUUsQ0FBQTtZQUNsRCxJQUFJLFFBQVEsS0FBSyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ2xDLE9BQU8sTUFBTSx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtZQUN2RixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFTywyQkFBMkIsQ0FDbEMsT0FBcUM7UUFFckMsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDN0IsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDeEMsT0FBTztnQkFDTixJQUFJLEVBQUUsUUFBUTtnQkFDZCxFQUFFLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDO2dCQUNwQyxLQUFLLEVBQUUsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsS0FBSyxFQUFFO2dCQUM3QyxVQUFVLEVBQUUsTUFBTSxDQUFDLElBQUk7Z0JBQ3ZCLFFBQVEsRUFBRSxLQUFLLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsS0FBSyxNQUFNLENBQUMsSUFBSSxFQUFFO2dCQUNuRSxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUk7YUFDakIsQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVPLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxHQUFXO1FBQ2xELElBQUksQ0FBQztZQUNKLE1BQU0sZUFBZSxHQUFHLE1BQU0sSUFBSSxDQUFDLDBCQUEwQixDQUFDLFNBQVMsQ0FDdEUsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFDZCxpQkFBaUIsQ0FBQyxJQUFJLENBQ3RCLENBQUE7WUFDRCxJQUFJLGVBQWUsRUFBRSxDQUFDO2dCQUNyQixPQUFPLGVBQWUsQ0FBQyxNQUFNLENBQUE7WUFDOUIsQ0FBQztRQUNGLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM3QyxDQUFDO1FBRUQsbURBQW1EO1FBQ25ELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxpQkFBaUIsRUFBRSxXQUFXLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDdEYsSUFBSSxTQUFTLElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDM0QsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsZUFBZSxFQUFFO2dCQUNsRixFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRTthQUMvQixDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQ25CLGlHQUFpRyxHQUFHLEVBQUUsQ0FDdEcsQ0FBQTtRQUNELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFTyxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBWTtRQUNsRCxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMseUJBQXlCLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtRQUN6RSxJQUFJLGdCQUFnQixHQUFHLFdBQVcsQ0FBQTtRQUVsQyxLQUNDLElBQUksV0FBVyxHQUFHLENBQUMsRUFDbkIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLGdCQUFnQixDQUFDLEVBQzNGLFdBQVcsRUFBRSxFQUNaLENBQUM7WUFDRixnQkFBZ0IsR0FBRyxHQUFHLFdBQVcsSUFBSSxXQUFXLEVBQUUsQ0FBQTtRQUNuRCxDQUFDO1FBRUQsTUFBTSxZQUFZLEdBQUcsTUFBTSxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdkQsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNsQixPQUFPLENBQUMsTUFBTSxJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxXQUFXLENBQUMsWUFBWSxDQUFDLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxDQUFBO1FBQzNGLENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBRyxNQUFNLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNyRCxNQUFNLGVBQWUsR0FBZ0MsRUFBRSxDQUFBO1FBQ3ZELElBQUksV0FBVyxFQUFFLENBQUM7WUFDakIsS0FBSyxNQUFNLEdBQUcsSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFDL0IsSUFBSSw2QkFBNkIsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDN0MsZUFBZSxDQUFDLElBQUksQ0FDbkIsTUFBTSxJQUFJLENBQUMsbUJBQW1CLENBQzdCLE1BQU0sV0FBVyxDQUFDLEdBQUcsQ0FBQyxFQUN0QixnQkFBZ0IsRUFDaEIsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FDZCxDQUNELENBQUE7Z0JBQ0YsQ0FBQztxQkFBTSxJQUFJLGdCQUFnQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUN2QyxNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsQ0FBQTtvQkFDM0QsSUFBSSxTQUFTLEVBQUUsQ0FBQzt3QkFDZixlQUFlLENBQUMsSUFBSSxDQUNuQixNQUFNLElBQUksQ0FBQyxtQkFBbUIsQ0FDN0IsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUFDLEVBQzVCLGdCQUFnQixFQUNoQixHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUNkLEdBQUcsQ0FDSCxDQUNELENBQUE7b0JBQ0YsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLGVBQWUsQ0FBQTtJQUN2QixDQUFDO0lBRU8sS0FBSyxDQUFDLG1CQUFtQixDQUNoQyxJQUFnQixFQUNoQixJQUFZLEVBQ1osR0FBUyxFQUNULEVBQVc7UUFFWCxPQUFPO1lBQ04sRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLE1BQU0sV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ25DLElBQUksRUFBRSxJQUFJO1lBQ1YsS0FBSyxFQUFFLElBQUk7WUFDWCxPQUFPLEVBQUUsSUFBSTtZQUNiLE1BQU0sRUFBRSxLQUFLO1lBQ2IsV0FBVyxFQUFFLEtBQUs7WUFDbEIsVUFBVSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7U0FDOUQsQ0FBQTtJQUNGLENBQUM7SUFFTywwQkFBMEIsQ0FBQyxPQUE2QjtRQUMvRCxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQTRCLEVBQUU7WUFDdkQsSUFBSSxNQUEwQyxDQUFBO1lBQzlDLElBQUksQ0FBQyxDQUFDLFVBQVUsSUFBSSxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUM3QixNQUFNLEdBQUcsRUFBRSxTQUFTLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsY0FBYyxFQUFFLGNBQWMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUN2RixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsTUFBTSxHQUFHLGtDQUFrQyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUMvRCxDQUFDO1lBRUQsT0FBTyxrQ0FBa0MsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDMUQsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU8sVUFBVSxDQUFDLE1BQW1CLEVBQUUsSUFBcUM7UUFDNUUsbUNBQW1DO1FBQ25DLElBQUksQ0FBQyxXQUFXLEVBQUUsTUFBTSxFQUFFLENBQUE7UUFDMUIsSUFBSSxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUE7UUFFNUIsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBRSxDQUFBO1FBQzlDLElBQUksSUFBSSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3hCLDBCQUEwQjtZQUUxQixNQUFNLG1CQUFtQixHQUFHLG9CQUFvQixDQUMvQyxLQUFLLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FDdEQsQ0FBQTtZQUNELE1BQU0sWUFBWSxHQUFHLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO2dCQUN4RCxJQUFJLE9BQU8sT0FBTyxLQUFLLFFBQVEsRUFBRSxDQUFDO29CQUNqQyxPQUFPLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUE7Z0JBQ2xELENBQUM7Z0JBQ0QsT0FBTyxPQUFPLENBQUE7WUFDZixDQUFDLENBQUMsQ0FBQTtZQUVGLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLGtDQUFrQyxFQUFFLFNBQVMsRUFBRSxHQUFHLFlBQVksQ0FBQyxDQUFBO1lBQ3BGLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUE7WUFDbkUsT0FBTyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDdEMsQ0FBQztRQUVELE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxJQUFJLEtBQUssU0FBUyxDQUFDLENBQUE7SUFDeEQsQ0FBQztJQUVPLGNBQWMsQ0FBQyxJQUF5QjtRQUMvQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzNDLE9BQU8sUUFBUSxDQUFDLGdCQUFnQixFQUFFLHVCQUF1QixFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ3JFLENBQUM7SUFFTyxtQkFBbUIsQ0FBQyxPQUFvQjtRQUMvQyxPQUFPLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDbEYsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUN0RSxDQUFDO0lBRVEsWUFBWTtRQUNwQixJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQzdFLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFBO0lBQzdFLENBQUM7SUFFTyxLQUFLLENBQUMsb0JBQW9CLENBQUMsQ0FBWTtRQUM5QyxNQUFNLEtBQUssR0FBRyxDQUFDLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQTtRQUNuQyxJQUFJLEtBQUssSUFBSSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQy9CLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNyQixJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7Z0JBQ3BDLElBQUksQ0FBQztvQkFDSixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtvQkFDdkMsT0FBTyxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDOUIsQ0FBQztnQkFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO29CQUNoQixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxLQUFLLENBQUMsQ0FBQTtvQkFDbkQsT0FBTyxTQUFTLENBQUE7Z0JBQ2pCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFTyxLQUFLLENBQUMsbUJBQW1CLENBQUMsQ0FBWTtRQUM3QyxNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUN4RCxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsSUFBSSxDQUFDO2dCQUNKLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUE7Z0JBQ25DLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDckIsT0FBTyxJQUFJLENBQUE7Z0JBQ1osQ0FBQztZQUNGLENBQUM7WUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO2dCQUNoQixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsRUFBRSxLQUFLLENBQUMsQ0FBQTtnQkFDdkQsT0FBTyxTQUFTLENBQUE7WUFDakIsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0NBQ0QsQ0FBQTtBQTNmWSxlQUFlO0lBU3pCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsaUNBQWlDLENBQUE7SUFFakMsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixZQUFBLFdBQVcsQ0FBQTtHQWxCRCxlQUFlLENBMmYzQjs7QUFFRCxLQUFLLFVBQVUsd0JBQXdCLENBQ3RDLFFBQWEsRUFDYixXQUFvQixFQUNwQixnQkFBbUM7SUFFbkMsSUFBSSxTQUFTLEdBQUcsS0FBSyxDQUFBO0lBRXJCLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNsQixJQUFJLENBQUM7WUFDSixNQUFNLFlBQVksR0FBRyxNQUFNLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQzFFLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUN2QixDQUFDO1FBQUMsTUFBTSxDQUFDO1lBQ1IsU0FBUyxHQUFHLElBQUksQ0FBQTtRQUNqQixDQUFDO1FBRUQsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ3JDLFNBQVMsR0FBRyxJQUFJLENBQUE7UUFDakIsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPO1FBQ04sS0FBSyxFQUFFLFFBQVE7UUFDZixFQUFFLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRTtRQUN2QixJQUFJLEVBQUUsUUFBUSxDQUFDLFFBQVEsQ0FBQztRQUN4QixNQUFNLEVBQUUsQ0FBQyxXQUFXO1FBQ3BCLFdBQVc7UUFDWCxTQUFTO0tBQ1QsQ0FBQTtBQUNGLENBQUM7QUFFRCxLQUFLLFVBQVUscUJBQXFCLENBQ25DLE1BQWlELEVBQ2pELFdBQXlCLEVBQ3pCLGFBQTZCO0lBRTdCLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDdEIsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVELElBQUksNkJBQTZCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUM5RCxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sUUFBUSxHQUFHLE1BQU0sV0FBVyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDNUQsSUFBSSxRQUFRLENBQUMsSUFBSSxHQUFHLEVBQUUsR0FBRyxJQUFJLEdBQUcsSUFBSSxFQUFFLENBQUM7WUFDdEMsUUFBUTtZQUNSLGFBQWEsQ0FBQyxLQUFLLENBQ2xCLFFBQVEsQ0FBQyxlQUFlLEVBQUUsb0JBQW9CLENBQUMsRUFDL0MsUUFBUSxDQUFDLHNCQUFzQixFQUFFLDRDQUE0QyxFQUFFLFFBQVEsQ0FBQyxDQUN4RixDQUFBO1lBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBQ3RDLENBQUM7UUFDRCxNQUFNLFlBQVksR0FBRyxNQUFNLFdBQVcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzdELE9BQU87WUFDTixFQUFFLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUU7WUFDOUIsSUFBSSxFQUFFLFFBQVE7WUFDZCxRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJO1lBQzlCLEtBQUssRUFBRSxZQUFZO1lBQ25CLElBQUksRUFBRSxPQUFPLENBQUMsU0FBUztZQUN2QixPQUFPLEVBQUUsSUFBSTtZQUNiLE1BQU0sRUFBRSxLQUFLO1lBQ2IsVUFBVSxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLENBQUM7U0FDL0QsQ0FBQTtJQUNGLENBQUM7SUFFRCxPQUFPLFNBQVMsQ0FBQTtBQUNqQixDQUFDO0FBRUQsU0FBUyxRQUFRLENBQUMsUUFBYSxFQUFFLEtBQWM7SUFDOUMsSUFBSSxTQUFTLEdBQUcsRUFBRSxDQUFBO0lBQ2xCLElBQUksS0FBSyxFQUFFLENBQUM7UUFDWCxTQUFTLEdBQUcsSUFBSSxLQUFLLENBQUMsZUFBZSxFQUFFLENBQUE7UUFDdkMsSUFBSSxLQUFLLENBQUMsZUFBZSxLQUFLLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNuRCxTQUFTLElBQUksSUFBSSxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDdkMsQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLFFBQVEsQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFBO0FBQ25DLENBQUMifQ==