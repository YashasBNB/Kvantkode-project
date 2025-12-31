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
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { getMediaOrTextMime } from '../../../../base/common/mime.js';
import { URI } from '../../../../base/common/uri.js';
import { FileOperationError, IFileService, } from '../../../../platform/files/common/files.js';
let BrowserRemoteResourceLoader = class BrowserRemoteResourceLoader extends Disposable {
    constructor(fileService, provider) {
        super();
        this.provider = provider;
        this._register(provider.onDidReceiveRequest(async (request) => {
            let uri;
            try {
                uri = JSON.parse(decodeURIComponent(request.uri.query));
            }
            catch {
                return request.respondWith(404, new Uint8Array(), {});
            }
            let content;
            try {
                content = await fileService.readFile(URI.from(uri, true));
            }
            catch (e) {
                const str = VSBuffer.fromString(e.message).buffer;
                if (e instanceof FileOperationError &&
                    e.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                    return request.respondWith(404, str, {});
                }
                else {
                    return request.respondWith(500, str, {});
                }
            }
            const mime = uri.path && getMediaOrTextMime(uri.path);
            request.respondWith(200, content.value.buffer, mime ? { 'content-type': mime } : {});
        }));
    }
    getResourceUriProvider() {
        const baseUri = URI.parse(document.location.href);
        return (uri) => baseUri.with({
            path: this.provider.path,
            query: JSON.stringify(uri),
        });
    }
};
BrowserRemoteResourceLoader = __decorate([
    __param(0, IFileService)
], BrowserRemoteResourceLoader);
export { BrowserRemoteResourceLoader };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3NlclJlbW90ZVJlc291cmNlSGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9yZW1vdGUvYnJvd3Nlci9icm93c2VyUmVtb3RlUmVzb3VyY2VIYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDcEUsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRSxPQUFPLEVBQ04sa0JBQWtCLEVBR2xCLFlBQVksR0FDWixNQUFNLDRDQUE0QyxDQUFBO0FBRzVDLElBQU0sMkJBQTJCLEdBQWpDLE1BQU0sMkJBQTRCLFNBQVEsVUFBVTtJQUMxRCxZQUNlLFdBQXlCLEVBQ3RCLFFBQWlDO1FBRWxELEtBQUssRUFBRSxDQUFBO1FBRlUsYUFBUSxHQUFSLFFBQVEsQ0FBeUI7UUFJbEQsSUFBSSxDQUFDLFNBQVMsQ0FDYixRQUFRLENBQUMsbUJBQW1CLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO1lBQzlDLElBQUksR0FBa0IsQ0FBQTtZQUN0QixJQUFJLENBQUM7Z0JBQ0osR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1lBQ3hELENBQUM7WUFBQyxNQUFNLENBQUM7Z0JBQ1IsT0FBTyxPQUFPLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxJQUFJLFVBQVUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQ3RELENBQUM7WUFFRCxJQUFJLE9BQXFCLENBQUE7WUFDekIsSUFBSSxDQUFDO2dCQUNKLE9BQU8sR0FBRyxNQUFNLFdBQVcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQTtZQUMxRCxDQUFDO1lBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDWixNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUE7Z0JBQ2pELElBQ0MsQ0FBQyxZQUFZLGtCQUFrQjtvQkFDL0IsQ0FBQyxDQUFDLG1CQUFtQiwrQ0FBdUMsRUFDM0QsQ0FBQztvQkFDRixPQUFPLE9BQU8sQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQTtnQkFDekMsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE9BQU8sT0FBTyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFBO2dCQUN6QyxDQUFDO1lBQ0YsQ0FBQztZQUVELE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLElBQUksa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ3JELE9BQU8sQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3JGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRU0sc0JBQXNCO1FBQzVCLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNqRCxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FDZCxPQUFPLENBQUMsSUFBSSxDQUFDO1lBQ1osSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSTtZQUN4QixLQUFLLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUM7U0FDMUIsQ0FBQyxDQUFBO0lBQ0osQ0FBQztDQUNELENBQUE7QUE3Q1ksMkJBQTJCO0lBRXJDLFdBQUEsWUFBWSxDQUFBO0dBRkYsMkJBQTJCLENBNkN2QyJ9