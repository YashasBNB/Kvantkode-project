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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb3VyY2VMb2FkaW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2Vidmlldy9icm93c2VyL3Jlc291cmNlTG9hZGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDMUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDaEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFDTixrQkFBa0IsR0FJbEIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUVuRCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUU1RixNQUFNLEtBQVcsdUJBQXVCLENBZ0N2QztBQWhDRCxXQUFpQix1QkFBdUI7SUFDdkMsSUFBWSxJQUtYO0lBTEQsV0FBWSxJQUFJO1FBQ2YscUNBQU8sQ0FBQTtRQUNQLG1DQUFNLENBQUE7UUFDTiwrQ0FBWSxDQUFBO1FBQ1osNkNBQVcsQ0FBQTtJQUNaLENBQUMsRUFMVyxJQUFJLEdBQUosNEJBQUksS0FBSiw0QkFBSSxRQUtmO0lBRUQsTUFBYSxhQUFhO1FBR3pCLFlBQ2lCLE1BQThCLEVBQzlCLElBQXdCLEVBQ3hCLEtBQXlCLEVBQ3pCLFFBQWdCO1lBSGhCLFdBQU0sR0FBTixNQUFNLENBQXdCO1lBQzlCLFNBQUksR0FBSixJQUFJLENBQW9CO1lBQ3hCLFVBQUssR0FBTCxLQUFLLENBQW9CO1lBQ3pCLGFBQVEsR0FBUixRQUFRLENBQVE7WUFOeEIsU0FBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUE7UUFPekIsQ0FBQztLQUNK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