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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdTb3VyY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2NvbW1vbi9kZWJ1Z1NvdXJjZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3ZFLE9BQU8sS0FBSyxTQUFTLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUV6QyxPQUFPLEVBRU4sVUFBVSxFQUNWLFlBQVksR0FDWixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFNdkMsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxlQUFlLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtBQUVuRjs7Ozs7Ozs7Ozs7R0FXRztBQUVILE1BQU0sT0FBTyxNQUFNO0lBS2xCLFlBQ0MsSUFBc0MsRUFDdEMsU0FBaUIsRUFDakIsa0JBQXVDLEVBQ3ZDLFVBQXVCO1FBRXZCLElBQUksSUFBWSxDQUFBO1FBQ2hCLElBQUksSUFBSSxFQUFFLENBQUM7WUFDVixJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQTtZQUNmLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUks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