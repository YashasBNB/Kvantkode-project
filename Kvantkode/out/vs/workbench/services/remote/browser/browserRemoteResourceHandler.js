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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3NlclJlbW90ZVJlc291cmNlSGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3JlbW90ZS9icm93c2VyL2Jyb3dzZXJSZW1vdGVSZXNvdXJjZUhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLGdDQUFnQyxDQUFBO0FBQ25FLE9BQU8sRUFDTixrQkFBa0IsRUFHbEIsWUFBWSxHQUNaLE1BQU0sNENBQTRDLENBQUE7QUFHNUMsSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFBNEIsU0FBUSxVQUFVO0lBQzFELFlBQ2UsV0FBeUIsRUFDdEIsUUFBaUM7UUFFbEQsS0FBSyxFQUFFLENBQUE7UUFGVSxhQUFRLEdBQVIsUUFBUSxDQUF5QjtRQUlsRCxJQUFJLENBQUMsU0FBUyxDQUNiLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7WUFDOUMsSUFBSSxHQUFrQixDQUFBO1lBQ3RCLElBQUksQ0FBQztnQkFDSixHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7WUFDeEQsQ0FBQztZQUFDLE1BQU0sQ0FBQztnQkFDUixPQUFPLE9BQU8sQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLElBQUksVUFBVSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDdEQsQ0FBQztZQUVELElBQUksT0FBcUIsQ0FBQTtZQUN6QixJQUFJLENBQUM7Z0JBQ0osT0FBTyxHQUFHLE1BQU0sV0FBVyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBO1lBQzFELENBQUM7WUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUNaLE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQTtnQkFDakQsSUFDQyxDQUFDLFlBQVksa0JBQWtCO29CQUMvQixDQUFDLENBQUMsbUJBQW1CLCtDQUF1QyxFQUMzRCxDQUFDO29CQUNGLE9BQU8sT0FBTyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFBO2dCQUN6QyxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsT0FBTyxPQUFPLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUE7Z0JBQ3pDLENBQUM7WUFDRixDQUFDO1lBRUQsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksSUFBSSxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDckQsT0FBTyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDckYsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFTSxzQkFBc0I7UUFDNUIsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ2pELE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUNkLE9BQU8sQ0FBQyxJQUFJLENBQUM7WUFDWixJQUFJLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJO1lBQ3hCLEtBQUssRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQztTQUMxQixDQUFDLENBQUE7SUFDSixDQUFDO0NBQ0QsQ0FBQTtBQTdDWSwyQkFBMkI7SUFFckMsV0FBQSxZQUFZLENBQUE7R0FGRiwyQkFBMkIsQ0E2Q3ZDIn0=