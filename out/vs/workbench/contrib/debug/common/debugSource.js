/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { URI } from '../../../../base/common/uri.js';
import { normalize, isAbsolute } from '../../../../base/common/path.js';
import * as resources from '../../../../base/common/resources.js';
import { DEBUG_SCHEME } from './debug.js';
import { SIDE_GROUP, ACTIVE_GROUP, } from '../../../services/editor/common/editorService.js';
import { Schemas } from '../../../../base/common/network.js';
import { isUri } from './debugUtils.js';
export const UNKNOWN_SOURCE_LABEL = nls.localize('unknownSource', 'Unknown Source');
/**
 * Debug URI format
 *
 * a debug URI represents a Source object and the debug session where the Source comes from.
 *
 *       debug:arbitrary_path?session=123e4567-e89b-12d3-a456-426655440000&ref=1016
 *       \___/ \____________/ \__________________________________________/ \______/
 *         |          |                             |                          |
 *      scheme   source.path                    session id            source.reference
 *
 *
 */
export class Source {
    constructor(raw_, sessionId, uriIdentityService, logService) {
        let path;
        if (raw_) {
            this.raw = raw_;
            path = this.raw.path || this.raw.name || '';
            this.available = true;
        }
        else {
            this.raw = { name: UNKNOWN_SOURCE_LABEL };
            this.available = false;
            path = `${DEBUG_SCHEME}:${UNKNOWN_SOURCE_LABEL}`;
        }
        this.uri = getUriFromSource(this.raw, path, sessionId, uriIdentityService, logService);
    }
    get name() {
        return this.raw.name || resources.basenameOrAuthority(this.uri);
    }
    get origin() {
        return this.raw.origin;
    }
    get presentationHint() {
        return this.raw.presentationHint;
    }
    get reference() {
        return this.raw.sourceReference;
    }
    get inMemory() {
        return this.uri.scheme === DEBUG_SCHEME;
    }
    openInEditor(editorService, selection, preserveFocus, sideBySide, pinned) {
        return !this.available
            ? Promise.resolve(undefined)
            : editorService.openEditor({
                resource: this.uri,
                description: this.origin,
                options: {
                    preserveFocus,
                    selection,
                    revealIfOpened: true,
                    selectionRevealType: 1 /* TextEditorSelectionRevealType.CenterIfOutsideViewport */,
                    pinned,
                },
            }, sideBySide ? SIDE_GROUP : ACTIVE_GROUP);
    }
    static getEncodedDebugData(modelUri) {
        let path;
        let sourceReference;
        let sessionId;
        switch (modelUri.scheme) {
            case Schemas.file:
                path = normalize(modelUri.fsPath);
                break;
            case DEBUG_SCHEME:
                path = modelUri.path;
                if (modelUri.query) {
                    const keyvalues = modelUri.query.split('&');
                    for (const keyvalue of keyvalues) {
                        const pair = keyvalue.split('=');
                        if (pair.length === 2) {
                            switch (pair[0]) {
                                case 'session':
                                    sessionId = pair[1];
                                    break;
                                case 'ref':
                                    sourceReference = parseInt(pair[1]);
                                    break;
                            }
                        }
                    }
                }
                break;
            default:
                path = modelUri.toString();
                break;
        }
        return {
            name: resources.basenameOrAuthority(modelUri),
            path,
            sourceReference,
            sessionId,
        };
    }
}
export function getUriFromSource(raw, path, sessionId, uriIdentityService, logService) {
    const _getUriFromSource = (path) => {
        if (typeof raw.sourceReference === 'number' && raw.sourceReference > 0) {
            return URI.from({
                scheme: DEBUG_SCHEME,
                path: path?.replace(/^\/+/g, '/'), // #174054
                query: `session=${sessionId}&ref=${raw.sourceReference}`,
            });
        }
        if (path && isUri(path)) {
            // path looks like a uri
            return uriIdentityService.asCanonicalUri(URI.parse(path));
        }
        // assume a filesystem path
        if (path && isAbsolute(path)) {
            return uriIdentityService.asCanonicalUri(URI.file(path));
        }
        // path is relative: since VS Code cannot deal with this by itself
        // create a debug url that will result in a DAP 'source' request when the url is resolved.
        return uriIdentityService.asCanonicalUri(URI.from({
            scheme: DEBUG_SCHEME,
            path,
            query: `session=${sessionId}`,
        }));
    };
    try {
        return _getUriFromSource(path);
    }
    catch (err) {
        logService.error('Invalid path from debug adapter: ' + path);
        return _getUriFromSource('/invalidDebugSource');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdTb3VyY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9jb21tb24vZGVidWdTb3VyY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN2RSxPQUFPLEtBQUssU0FBUyxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFFekMsT0FBTyxFQUVOLFVBQVUsRUFDVixZQUFZLEdBQ1osTUFBTSxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBTXZDLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLGdCQUFnQixDQUFDLENBQUE7QUFFbkY7Ozs7Ozs7Ozs7O0dBV0c7QUFFSCxNQUFNLE9BQU8sTUFBTTtJQUtsQixZQUNDLElBQXNDLEVBQ3RDLFNBQWlCLEVBQ2pCLGtCQUF1QyxFQUN2QyxVQUF1QjtRQUV2QixJQUFJLElBQVksQ0FBQTtRQUNoQixJQUFJLElBQUksRUFBRSxDQUFDO1lBQ1YsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUE7WUFDZixJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFBO1lBQzNDLElB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