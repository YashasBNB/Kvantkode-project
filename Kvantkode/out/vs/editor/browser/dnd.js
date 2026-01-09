/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DataTransfers } from '../../base/browser/dnd.js';
import { createFileDataTransferItem, createStringDataTransferItem, UriList, VSDataTransfer, } from '../../base/common/dataTransfer.js';
import { Mimes } from '../../base/common/mime.js';
import { URI } from '../../base/common/uri.js';
import { CodeDataTransfers, getPathForFile } from '../../platform/dnd/browser/dnd.js';
export function toVSDataTransfer(dataTransfer) {
    const vsDataTransfer = new VSDataTransfer();
    for (const item of dataTransfer.items) {
        const type = item.type;
        if (item.kind === 'string') {
            const asStringValue = new Promise((resolve) => item.getAsString(resolve));
            vsDataTransfer.append(type, createStringDataTransferItem(asStringValue));
        }
        else if (item.kind === 'file') {
            const file = item.getAsFile();
            if (file) {
                vsDataTransfer.append(type, createFileDataTransferItemFromFile(file));
            }
        }
    }
    return vsDataTransfer;
}
function createFileDataTransferItemFromFile(file) {
    const path = getPathForFile(file);
    const uri = path ? URI.parse(path) : undefined;
    return createFileDataTransferItem(file.name, uri, async () => {
        return new Uint8Array(await file.arrayBuffer());
    });
}
const INTERNAL_DND_MIME_TYPES = Object.freeze([
    CodeDataTransfers.EDITORS,
    CodeDataTransfers.FILES,
    DataTransfers.RESOURCES,
    DataTransfers.INTERNAL_URI_LIST,
]);
export function toExternalVSDataTransfer(sourceDataTransfer, overwriteUriList = false) {
    const vsDataTransfer = toVSDataTransfer(sourceDataTransfer);
    // Try to expose the internal uri-list type as the standard type
    const uriList = vsDataTransfer.get(DataTransfers.INTERNAL_URI_LIST);
    if (uriList) {
        vsDataTransfer.replace(Mimes.uriList, uriList);
    }
    else {
        if (overwriteUriList || !vsDataTransfer.has(Mimes.uriList)) {
            // Otherwise, fallback to adding dragged resources to the uri list
            const editorData = [];
            for (const item of sourceDataTransfer.items) {
                const file = item.getAsFile();
                if (file) {
                    const path = getPathForFile(file);
                    try {
                        if (path) {
                            editorData.push(URI.file(path).toString());
                        }
                        else {
                            editorData.push(URI.parse(file.name, true).toString());
                        }
                    }
                    catch {
                        // Parsing failed. Leave out from list
                    }
                }
            }
            if (editorData.length) {
                vsDataTransfer.replace(Mimes.uriList, createStringDataTransferItem(UriList.create(editorData)));
            }
        }
    }
    for (const internal of INTERNAL_DND_MIME_TYPES) {
        vsDataTransfer.delete(internal);
    }
    return vsDataTransfer;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9kbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3pELE9BQU8sRUFDTiwwQkFBMEIsRUFDMUIsNEJBQTRCLEVBRTVCLE9BQU8sRUFDUCxjQUFjLEdBQ2QsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDakQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzlDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxjQUFjLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUVyRixNQUFNLFVBQVUsZ0JBQWdCLENBQUMsWUFBMEI7SUFDMUQsTUFBTSxjQUFjLEdBQUcsSUFBSSxjQUFjLEVBQUUsQ0FBQTtJQUMzQyxLQUFLLE1BQU0sSUFBSSxJQUFJLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN2QyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFBO1FBQ3RCLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUM1QixNQUFNLGFBQWEsR0FBRyxJQUFJLE9BQU8sQ0FBUyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO1lBQ2pGLGNBQWMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLDRCQUE0QixDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUE7UUFDekUsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUUsQ0FBQztZQUNqQyxNQUFN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