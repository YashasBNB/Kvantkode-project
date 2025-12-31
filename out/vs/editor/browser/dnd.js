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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvZG5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUN6RCxPQUFPLEVBQ04sMEJBQTBCLEVBQzFCLDRCQUE0QixFQUU1QixPQUFPLEVBQ1AsY0FBYyxHQUNkLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ2pELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFckYsTUFBTSxVQUFVLGdCQUFnQixDQUFDLFlBQTBCO0lBQzFELE1BQU0sY0FBYyxHQUFHLElBQUksY0FBYyxFQUFFLENBQUE7SUFDM0MsS0FBSyxNQUFNLElBQUksSUFBSSxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDdkMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQTtRQUN0QixJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDNUIsTUFBTSxhQUFhLEdBQUcsSUFBSSxPQUFPLENBQVMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtZQUNqRixjQUFjLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSw0QkFBNEIsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFBO1FBQ3pFLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDakMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFBO1lBQzdCLElBQUksSUFBSSxFQUFFLENBQUM7Z0JBQ1YsY0FBYyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsa0NBQWtDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtZQUN0RSxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLGNBQWMsQ0FBQTtBQUN0QixDQUFDO0FBRUQsU0FBUyxrQ0FBa0MsQ0FBQyxJQUFVO0lBQ3JELE1BQU0sSUFBSSxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNqQyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtJQUMvQyxPQUFPLDBCQUEwQixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE9BQU8sSUFBSSxVQUFVLENBQUMsTUFBTSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQTtJQUNoRCxDQUFDLENBQUMsQ0FBQTtBQUNILENBQUM7QUFFRCxNQUFNLHVCQUF1QixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7SUFDN0MsaUJBQWlCLENBQUMsT0FBTztJQUN6QixpQkFBaUIsQ0FBQyxLQUFLO0lBQ3ZCLGFBQWEsQ0FBQyxTQUFTO0lBQ3ZCLGFBQWEsQ0FBQyxpQkFBaUI7Q0FDL0IsQ0FBQyxDQUFBO0FBRUYsTUFBTSxVQUFVLHdCQUF3QixDQUN2QyxrQkFBZ0MsRUFDaEMsZ0JBQWdCLEdBQUcsS0FBSztJQUV4QixNQUFNLGNBQWMsR0FBRyxnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO0lBRTNELGdFQUFnRTtJQUNoRSxNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ25FLElBQUksT0FBTyxFQUFFLENBQUM7UUFDYixjQUFjLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDL0MsQ0FBQztTQUFNLENBQUM7UUFDUCxJQUFJLGdCQUFnQixJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUM1RCxrRUFBa0U7WUFDbEUsTUFBTSxVQUFVLEdBQWEsRUFBRSxDQUFBO1lBQy9CLEtBQUssTUFBTSxJQUFJLElBQUksa0JBQWtCLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQzdDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQTtnQkFDN0IsSUFBSSxJQUFJLEVBQUUsQ0FBQztvQkFDVixNQUFNLElBQUksR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUE7b0JBQ2pDLElBQUksQ0FBQzt3QkFDSixJQUFJLElBQUksRUFBRSxDQUFDOzRCQUNWLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO3dCQUMzQyxDQUFDOzZCQUFNLENBQUM7NEJBQ1AsVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTt3QkFDdkQsQ0FBQztvQkFDRixDQUFDO29CQUFDLE1BQU0sQ0FBQzt3QkFDUixzQ0FBc0M7b0JBQ3ZDLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFFRCxJQUFJLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDdkIsY0FBYyxDQUFDLE9BQU8sQ0FDckIsS0FBSyxDQUFDLE9BQU8sRUFDYiw0QkFBNEIsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQ3hELENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLE1BQU0sUUFBUSxJQUFJLHVCQUF1QixFQUFFLENBQUM7UUFDaEQsY0FBYyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUNoQyxDQUFDO0lBRUQsT0FBTyxjQUFjLENBQUE7QUFDdEIsQ0FBQyJ9