var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { createStringDataTransferItem, VSDataTransfer, } from '../../../../base/common/dataTransfer.js';
import { HierarchicalKind } from '../../../../base/common/hierarchicalKind.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Mimes } from '../../../../base/common/mime.js';
import { basename, joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { localize } from '../../../../nls.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IExtensionService, isProposedApiEnabled, } from '../../../services/extensions/common/extensions.js';
import { IChatWidgetService } from './chat.js';
import { ChatInputPart } from './chatInputPart.js';
import { resizeImage } from './imageUtils.js';
const COPY_MIME_TYPES = 'application/vnd.code.additional-editor-data';
let PasteImageProvider = class PasteImageProvider {
    constructor(chatWidgetService, extensionService, fileService, environmentService, logService) {
        this.chatWidgetService = chatWidgetService;
        this.extensionService = extensionService;
        this.fileService = fileService;
        this.environmentService = environmentService;
        this.logService = logService;
        this.kind = new HierarchicalKind('chat.attach.image');
        this.providedPasteEditKinds = [this.kind];
        this.copyMimeTypes = [];
        this.pasteMimeTypes = ['image/*'];
        this.imagesFolder = joinPath(this.environmentService.workspaceStorageHome, 'vscode-chat-images');
        this.cleanupOldImages();
    }
    async provideDocumentPasteEdits(model, ranges, dataTransfer, context, token) {
        if (!this.extensionService.extensions.some((ext) => isProposedApiEnabled(ext, 'chatReferenceBinaryData'))) {
            return;
        }
        const supportedMimeTypes = [
            'image/png',
            'image/jpeg',
            'image/jpg',
            'image/bmp',
            'image/gif',
            'image/tiff',
        ];
        let mimeType;
        let imageItem;
        // Find the first matching image type in the dataTransfer
        for (const type of supportedMimeTypes) {
            imageItem = dataTransfer.get(type);
            if (imageItem) {
                mimeType = type;
                break;
            }
        }
        if (!imageItem || !mimeType) {
            return;
        }
        const currClipboard = await imageItem.asFile()?.data();
        if (token.isCancellationRequested || !currClipboard) {
            return;
        }
        const widget = this.chatWidgetService.getWidgetByInputUri(model.uri);
        if (!widget) {
            return;
        }
        const attachedVariables = widget.attachmentModel.attachments;
        const displayName = localize('pastedImageName', 'Pasted Image');
        let tempDisplayName = displayName;
        for (let appendValue = 2; attachedVariables.some((attachment) => attachment.name === tempDisplayName); appendValue++) {
            tempDisplayName = `${displayName} ${appendValue}`;
        }
        const fileReference = await this.createFileForMedia(currClipboard, mimeType);
        if (token.isCancellationRequested || !fileReference) {
            return;
        }
        const scaledImageData = await resizeImage(currClipboard);
        if (token.isCancellationRequested || !scaledImageData) {
            return;
        }
        const scaledImageContext = await getImageAttachContext(scaledImageData, mimeType, token, tempDisplayName, fileReference);
        if (token.isCancellationRequested || !scaledImageContext) {
            return;
        }
        widget.attachmentModel.addContext(scaledImageContext);
        // Make sure to attach only new contexts
        const currentContextIds = widget.attachmentModel.getAttachmentIDs();
        if (currentContextIds.has(scaledImageContext.id)) {
            return;
        }
        const edit = createCustomPasteEdit(model, scaledImageContext, mimeType, this.kind, localize('pastedImageAttachment', 'Pasted Image Attachment'), this.chatWidgetService);
        return createEditSession(edit);
    }
    async createFileForMedia(dataTransfer, mimeType) {
        const exists = await this.fileService.exists(this.imagesFolder);
        if (!exists) {
            await this.fileService.createFolder(this.imagesFolder);
        }
        const ext = mimeType.split('/')[1] || 'png';
        const filename = `image-${Date.now()}.${ext}`;
        const fileUri = joinPath(this.imagesFolder, filename);
        const buffer = VSBuffer.wrap(dataTransfer);
        await this.fileService.writeFile(fileUri, buffer);
        return fileUri;
    }
    async cleanupOldImages() {
        const exists = await this.fileService.exists(this.imagesFolder);
        if (!exists) {
            return;
        }
        const duration = 7 * 24 * 60 * 60 * 1000; // 7 days
        const files = await this.fileService.resolve(this.imagesFolder);
        if (!files.children) {
            return;
        }
        await Promise.all(files.children.map(async (file) => {
            try {
                const timestamp = this.getTimestampFromFilename(file.name);
                if (timestamp && Date.now() - timestamp > duration) {
                    await this.fileService.del(file.resource);
                }
            }
            catch (err) {
                this.logService.error('Failed to clean up old images', err);
            }
        }));
    }
    getTimestampFromFilename(filename) {
        const match = filename.match(/image-(\d+)\./);
        if (match) {
            return parseInt(match[1], 10);
        }
        return undefined;
    }
};
PasteImageProvider = __decorate([
    __param(2, IFileService),
    __param(3, IEnvironmentService),
    __param(4, ILogService)
], PasteImageProvider);
export { PasteImageProvider };
async function getImageAttachContext(data, mimeType, token, displayName, resource) {
    const imageHash = await imageToHash(data);
    if (token.isCancellationRequested) {
        return undefined;
    }
    return {
        kind: 'image',
        value: data,
        id: imageHash,
        name: displayName,
        isImage: true,
        icon: Codicon.fileMedia,
        mimeType,
        isPasted: true,
        references: [{ reference: resource, kind: 'reference' }],
    };
}
export async function imageToHash(data) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
export function isImage(array) {
    if (array.length < 4) {
        return false;
    }
    // Magic numbers (identification bytes) for various image formats
    const identifier = {
        png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
        jpeg: [0xff, 0xd8, 0xff],
        bmp: [0x42, 0x4d],
        gif: [0x47, 0x49, 0x46, 0x38],
        tiff: [0x49, 0x49, 0x2a, 0x00],
    };
    return Object.values(identifier).some((signature) => signature.every((byte, index) => array[index] === byte));
}
export class CopyTextProvider {
    constructor() {
        this.providedPasteEditKinds = [];
        this.copyMimeTypes = [COPY_MIME_TYPES];
        this.pasteMimeTypes = [];
    }
    async prepareDocumentPaste(model, ranges, dataTransfer, token) {
        if (model.uri.scheme === ChatInputPart.INPUT_SCHEME) {
            return;
        }
        const customDataTransfer = new VSDataTransfer();
        const data = { range: ranges[0], uri: model.uri.toJSON() };
        customDataTransfer.append(COPY_MIME_TYPES, createStringDataTransferItem(JSON.stringify(data)));
        return customDataTransfer;
    }
}
export class PasteTextProvider {
    constructor(chatWidgetService, modelService) {
        this.chatWidgetService = chatWidgetService;
        this.modelService = modelService;
        this.kind = new HierarchicalKind('chat.attach.text');
        this.providedPasteEditKinds = [this.kind];
        this.copyMimeTypes = [];
        this.pasteMimeTypes = [COPY_MIME_TYPES];
    }
    async provideDocumentPasteEdits(model, ranges, dataTransfer, context, token) {
        if (model.uri.scheme !== ChatInputPart.INPUT_SCHEME) {
            return;
        }
        const text = dataTransfer.get(Mimes.text);
        const editorData = dataTransfer.get('vscode-editor-data');
        const additionalEditorData = dataTransfer.get(COPY_MIME_TYPES);
        if (!editorData || !text || !additionalEditorData) {
            return;
        }
        const textdata = await text.asString();
        const metadata = JSON.parse(await editorData.asString());
        const additionalData = JSON.parse(await additionalEditorData.asString());
        const widget = this.chatWidgetService.getWidgetByInputUri(model.uri);
        if (!widget) {
            return;
        }
        const start = additionalData.range.startLineNumber;
        const end = additionalData.range.endLineNumber;
        if (start === end) {
            const textModel = this.modelService.getModel(URI.revive(additionalData.uri));
            if (!textModel) {
                return;
            }
            // If copied line text data is the entire line content, then we can paste it as a code attachment. Otherwise, we ignore and use default paste provider.
            const lineContent = textModel.getLineContent(start);
            if (lineContent !== textdata) {
                return;
            }
        }
        const copiedContext = getCopiedContext(textdata, URI.revive(additionalData.uri), metadata.mode, additionalData.range);
        if (token.isCancellationRequested || !copiedContext) {
            return;
        }
        const currentContextIds = widget.attachmentModel.getAttachmentIDs();
        if (currentContextIds.has(copiedContext.id)) {
            return;
        }
        const edit = createCustomPasteEdit(model, copiedContext, Mimes.text, this.kind, localize('pastedCodeAttachment', 'Pasted Code Attachment'), this.chatWidgetService);
        edit.yieldTo = [{ kind: HierarchicalKind.Empty.append('text', 'plain') }];
        return createEditSession(edit);
    }
}
function getCopiedContext(code, file, language, range) {
    const fileName = basename(file);
    const start = range.startLineNumber;
    const end = range.endLineNumber;
    const resultText = `Copied Selection of Code: \n\n\n From the file: ${fileName} From lines ${start} to ${end} \n \`\`\`${code}\`\`\``;
    const pastedLines = start === end
        ? localize('pastedAttachment.oneLine', '1 line')
        : localize('pastedAttachment.multipleLines', '{0} lines', end + 1 - start);
    return {
        kind: 'paste',
        value: resultText,
        id: `${fileName}${start}${end}${range.startColumn}${range.endColumn}`,
        name: `${fileName} ${pastedLines}`,
        icon: Codicon.code,
        pastedLines,
        language,
        fileName: file.toString(),
        copiedFrom: {
            uri: file,
            range,
        },
        code,
        references: [
            {
                reference: file,
                kind: 'reference',
            },
        ],
    };
}
function createCustomPasteEdit(model, context, handledMimeType, kind, title, chatWidgetService) {
    const customEdit = {
        resource: model.uri,
        variable: context,
        undo: () => {
            const widget = chatWidgetService.getWidgetByInputUri(model.uri);
            if (!widget) {
                throw new Error('No widget found for undo');
            }
            widget.attachmentModel.delete(context.id);
        },
        redo: () => {
            const widget = chatWidgetService.getWidgetByInputUri(model.uri);
            if (!widget) {
                throw new Error('No widget found for redo');
            }
            widget.attachmentModel.addContext(context);
        },
        metadata: { needsConfirmation: false, label: context.name },
    };
    return {
        insertText: '',
        title,
        kind,
        handledMimeType,
        additionalEdit: {
            edits: [customEdit],
        },
    };
}
function createEditSession(edit) {
    return {
        edits: [edit],
        dispose: () => { },
    };
}
let ChatPasteProvidersFeature = class ChatPasteProvidersFeature extends Disposable {
    constructor(languageFeaturesService, chatWidgetService, extensionService, fileService, modelService, environmentService, logService) {
        super();
        this._register(languageFeaturesService.documentPasteEditProvider.register({ scheme: ChatInputPart.INPUT_SCHEME, pattern: '*', hasAccessToAllModels: true }, new PasteImageProvider(chatWidgetService, extensionService, fileService, environmentService, logService)));
        this._register(languageFeaturesService.documentPasteEditProvider.register({ scheme: ChatInputPart.INPUT_SCHEME, pattern: '*', hasAccessToAllModels: true }, new PasteTextProvider(chatWidgetService, modelService)));
        this._register(languageFeaturesService.documentPasteEditProvider.register('*', new CopyTextProvider()));
    }
};
ChatPasteProvidersFeature = __decorate([
    __param(0, ILanguageFeaturesService),
    __param(1, IChatWidgetService),
    __param(2, IExtensionService),
    __param(3, IFileService),
    __param(4, IModelService),
    __param(5, IEnvironmentService),
    __param(6, ILogService)
], ChatPasteProvidersFeature);
export { ChatPasteProvidersFeature };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFBhc3RlUHJvdmlkZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRQYXN0ZVByb3ZpZGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFDTiw0QkFBNEIsRUFHNUIsY0FBYyxHQUNkLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDOUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sZ0NBQWdDLENBQUE7QUFTbkUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDakcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFDTixpQkFBaUIsRUFDakIsb0JBQW9CLEdBQ3BCLE1BQU0s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