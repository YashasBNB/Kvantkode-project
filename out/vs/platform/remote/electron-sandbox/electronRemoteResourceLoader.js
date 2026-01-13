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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWxlY3Ryb25SZW1vdGVSZXNvdXJjZUxvYWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcmVtb3RlL2VsZWN0cm9uLXNhbmRib3gvZWxlY3Ryb25SZW1vdGVSZXNvdXJjZUxvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRXZFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBRWpELE9BQU8sRUFDTixrQkFBa0IsRUFHbEIsWUFBWSxHQUNaLE1BQU0sNkJBQTZCLENBQUE7QUFDcEMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDNUUsT0FBTyxFQUNOLGlDQUFpQyxFQUNqQyxvQ0FBb0MsR0FFcEMsTUFBTSxzQ0FBc0MsQ0FBQTtBQUV0QyxJQUFNLDRCQUE0QixHQUFsQyxNQUFNLDRCQUE2QixTQUFRLFVBQVU7SUFDM0QsWUFDa0IsUUFBZ0IsRUFDWixrQkFBdUMsRUFDN0IsV0FBeUI7UUFFeEQsS0FBSyxFQUFFLENBQUE7UUFKVSxhQUFRLEdBQVIsUUFBUSxDQUFRO1FBRUYsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFJeEQsTUFBTSxPQUFPLEdBQW1CO1lBQy9CLE1BQU0sQ0FBSSxDQUFVLEVBQUUsS0FBYTtnQkFDbEMsTUFBTSxJQUFJLEtBQUssQ0FBQyxvQkFBb0Is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