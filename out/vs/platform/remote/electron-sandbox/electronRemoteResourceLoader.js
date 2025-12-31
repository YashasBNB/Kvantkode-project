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
import { VSBuffer, encodeBase64 } from '../../../base/common/buffer.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { getMediaOrTextMime } from '../../../base/common/mime.js';
import { Schemas } from '../../../base/common/network.js';
import { URI } from '../../../base/common/uri.js';
import { FileOperationError, IFileService, } from '../../files/common/files.js';
import { IMainProcessService } from '../../ipc/common/mainProcessService.js';
import { NODE_REMOTE_RESOURCE_CHANNEL_NAME, NODE_REMOTE_RESOURCE_IPC_METHOD_NAME, } from '../common/electronRemoteResources.js';
let ElectronRemoteResourceLoader = class ElectronRemoteResourceLoader extends Disposable {
    constructor(windowId, mainProcessService, fileService) {
        super();
        this.windowId = windowId;
        this.fileService = fileService;
        const channel = {
            listen(_, event) {
                throw new Error(`Event not found: ${event}`);
            },
            call: (_, command, arg) => {
                switch (command) {
                    case NODE_REMOTE_RESOURCE_IPC_METHOD_NAME:
                        return this.doRequest(URI.revive(arg[0]));
                }
                throw new Error(`Call not found: ${command}`);
            },
        };
        mainProcessService.registerChannel(NODE_REMOTE_RESOURCE_CHANNEL_NAME, channel);
    }
    async doRequest(uri) {
        let content;
        try {
            const params = new URLSearchParams(uri.query);
            const actual = uri.with({
                scheme: params.get('scheme'),
                authority: params.get('authority'),
                query: '',
            });
            content = await this.fileService.readFile(actual);
        }
        catch (e) {
            const str = encodeBase64(VSBuffer.fromString(e.message));
            if (e instanceof FileOperationError &&
                e.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                return { statusCode: 404, body: str };
            }
            else {
                return { statusCode: 500, body: str };
            }
        }
        const mimeType = uri.path && getMediaOrTextMime(uri.path);
        return { statusCode: 200, body: encodeBase64(content.value), mimeType };
    }
    getResourceUriProvider() {
        return (uri) => uri.with({
            scheme: Schemas.vscodeManagedRemoteResource,
            authority: `window:${this.windowId}`,
            query: new URLSearchParams({ authority: uri.authority, scheme: uri.scheme }).toString(),
        });
    }
};
ElectronRemoteResourceLoader = __decorate([
    __param(1, IMainProcessService),
    __param(2, IFileService)
], ElectronRemoteResourceLoader);
export { ElectronRemoteResourceLoader };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWxlY3Ryb25SZW1vdGVSZXNvdXJjZUxvYWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3JlbW90ZS9lbGVjdHJvbi1zYW5kYm94L2VsZWN0cm9uUmVtb3RlUmVzb3VyY2VMb2FkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUV2RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUVqRCxPQUFPLEVBQ04sa0JBQWtCLEVBR2xCLFlBQVksR0FDWixNQUFNLDZCQUE2QixDQUFBO0FBQ3BDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzVFLE9BQU8sRUFDTixpQ0FBaUMsRUFDakMsb0NBQW9DLEdBRXBDLE1BQU0sc0NBQXNDLENBQUE7QUFFdEMsSUFBTSw0QkFBNEIsR0FBbEMsTUFBTSw0QkFBNkIsU0FBUSxVQUFVO0lBQzNELFlBQ2tCLFFBQWdCLEVBQ1osa0JBQXVDLEVBQzdCLFdBQXlCO1FBRXhELEtBQUssRUFBRSxDQUFBO1FBSlUsYUFBUSxHQUFSLFFBQVEsQ0FBUTtRQUVGLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBSXhELE1BQU0sT0FBTyxHQUFtQjtZQUMvQixNQUFNLENBQUksQ0FBVSxFQUFFLEtBQWE7Z0JBQ2xDLE1BQU0sSUFBSSxLQUFLLENBQUMsb0JBQW9CLEtBQUssRUFBRSxDQUFDLENBQUE7WUFD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