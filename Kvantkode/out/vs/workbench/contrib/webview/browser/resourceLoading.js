/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isUNC } from '../../../../base/common/extpath.js';
import { Schemas } from '../../../../base/common/network.js';
import { normalize, sep } from '../../../../base/common/path.js';
import { URI } from '../../../../base/common/uri.js';
import { FileOperationError, } from '../../../../platform/files/common/files.js';
import { getWebviewContentMimeType } from '../../../../platform/webview/common/mimeTypes.js';
export var WebviewResourceResponse;
(function (WebviewResourceResponse) {
    let Type;
    (function (Type) {
        Type[Type["Success"] = 0] = "Success";
        Type[Type["Failed"] = 1] = "Failed";
        Type[Type["AccessDenied"] = 2] = "AccessDenied";
        Type[Type["NotModified"] = 3] = "NotModified";
    })(Type = WebviewResourceResponse.Type || (WebviewResourceResponse.Type = {}));
    class StreamSuccess {
        constructor(stream, etag, mtime, mimeType) {
            this.stream = stream;
            this.etag = etag;
            this.mtime = mtime;
            this.mimeType = mimeType;
            this.type = Type.Success;
        }
    }
    WebviewResourceResponse.StreamSuccess = StreamSuccess;
    WebviewResourceResponse.Failed = { type: Type.Failed };
    WebviewResourceResponse.AccessDenied = { type: Type.AccessDenied };
    class NotModified {
        constructor(mimeType, mtime) {
            this.mimeType = mimeType;
            this.mtime = mtime;
            this.type = Type.NotModified;
        }
    }
    WebviewResourceResponse.NotModified = NotModified;
})(WebviewResourceResponse || (WebviewResourceResponse = {}));
export async function loadLocalResource(requestUri, options, fileService, logService, token) {
    logService.debug(`loadLocalResource - begin. requestUri=${requestUri}`);
    const resourceToLoad = getResourceToLoad(requestUri, options.roots);
    logService.debug(`loadLocalResource - found resource to load. requestUri=${requestUri}, resourceToLoad=${resourceToLoad}`);
    if (!resourceToLoad) {
        return WebviewResourceResponse.AccessDenied;
    }
    const mime = getWebviewContentMimeType(requestUri); // Use the original path for the mime
    try {
        const result = await fileService.readFileStream(resourceToLoad, { etag: options.ifNoneMatch }, token);
        return new WebviewResourceResponse.StreamSuccess(result.value, result.etag, result.mtime, mime);
    }
    catch (err) {
        if (err instanceof FileOperationError) {
            const result = err.fileOperationResult;
            // NotModified status is expected and can be handled gracefully
            if (result === 2 /* FileOperationResult.FILE_NOT_MODIFIED_SINCE */) {
                return new WebviewResourceResponse.NotModified(mime, err.options?.mtime);
            }
        }
        // Otherwise the error is unexpected.
        logService.debug(`loadLocalResource - Error using fileReader. requestUri=${requestUri}`);
        console.log(err);
        return WebviewResourceResponse.Failed;
    }
}
function getResourceToLoad(requestUri, roots) {
    for (const root of roots) {
        if (containsResource(root, requestUri)) {
            return normalizeResourcePath(requestUri);
        }
    }
    return undefined;
}
function containsResource(root, resource) {
    if (root.scheme !== resource.scheme) {
        return false;
    }
    let resourceFsPath = normalize(resource.fsPath);
    let rootPath = normalize(root.fsPath + (root.fsPath.endsWith(sep) ? '' : sep));
    if (isUNC(root.fsPath) && isUNC(resource.fsPath)) {
        rootPath = rootPath.toLowerCase();
        resourceFsPath = resourceFsPath.toLowerCase();
    }
    return resourceFsPath.startsWith(rootPath);
}
function normalizeResourcePath(resource) {
    // Rewrite remote uris to a path that the remote file system can understand
    if (resource.scheme === Schemas.vscodeRemote) {
        return URI.from({
            scheme: Schemas.vscodeRemote,
            authority: resource.authority,
            path: '/vscode-resource',
            query: JSON.stringify({
                requestResourcePath: resource.path,
            }),
        });
    }
    return resource;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb3VyY2VMb2FkaW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWJ2aWV3L2Jyb3dzZXIvcmVzb3VyY2VMb2FkaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUNOLGtCQUFrQixHQUlsQixNQUFNLDRDQUE0QyxDQUFBO0FBRW5ELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRTVGLE1BQU0sS0FBVyx1QkFBdUIsQ0FnQ3ZDO0FBaENELFdBQWlCLHVCQUF1QjtJQUN2QyxJQUFZLElBS1g7SUFMRCxXQUFZLElBQUk7UUFDZixxQ0FBTyxDQUFBO1FBQ1AsbUNBQU0sQ0FBQTtRQUNOLCtDQUFZLENBQUE7UUFDWiw2Q0FBVyxDQUFBO0lBQ1osQ0FBQyxFQUxXLElBQUksR0FBSiw0QkFBSSxLQUFKLDRCQUFJLFFBS2Y7SUFFRCxNQUFhLGFBQWE7UUFHekIsWUFDaUIsTUFBOEIsRUFDOUIsSUFBd0IsRUFDeEIsS0FBeUIsRUFDekIsUUFBZ0I7WUFIaEIsV0FBTSxHQUFOLE1BQU0sQ0FBd0I7WUFDOUIsU0FBSSxHQUFKLElBQUksQ0FBb0I7WUFDeEIsVUFBSyxHQUFMLEtBQUssQ0FBb0I7WUFDekIsYUFBUSxHQUFSLFFBQVEsQ0FBUTtZQU54QixTQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQTtRQU96QixDQUFD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