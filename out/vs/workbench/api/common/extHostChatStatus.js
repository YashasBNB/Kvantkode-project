/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as extHostProtocol from './extHost.protocol.js';
import { ExtensionIdentifier, } from '../../../platform/extensions/common/extensions.js';
export class ExtHostChatStatus {
    constructor(mainContext) {
        this._items = new Map();
        this._proxy = mainContext.getProxy(extHostProtocol.MainContext.MainThreadChatStatus);
    }
    createChatStatusItem(extension, id) {
        const internalId = asChatItemIdentifier(extension.identifier, id);
        if (this._items.has(internalId)) {
            throw new Error(`Chat status item '${id}' already exists`);
        }
        const state = {
            id: internalId,
            title: '',
            description: '',
            detail: '',
        };
        let disposed = false;
        let visible = false;
        const syncState = () => {
            if (disposed) {
                throw new Error('Chat status item is disposed');
            }
            if (!visible) {
                return;
            }
            this._proxy.$setEntry(id, state);
        };
        const item = Object.freeze({
            id: id,
            get title() {
                return state.title;
            },
            set title(value) {
                state.title = value;
                syncState();
            },
            get description() {
                return state.description;
            },
            set description(value) {
                state.description = value;
                syncState();
            },
            get detail() {
                return state.detail;
            },
            set detail(value) {
                state.detail = value;
                syncState();
            },
            show: () => {
                visible = true;
                syncState();
            },
            hide: () => {
                visible = false;
                this._proxy.$disposeEntry(id);
            },
            dispose: () => {
                disposed = true;
                this._proxy.$disposeEntry(id);
                this._items.delete(internalId);
            },
        });
        this._items.set(internalId, item);
        return item;
    }
}
function asChatItemIdentifier(extension, id) {
    return `${ExtensionIdentifier.toKey(extension)}.${id}`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENoYXRTdGF0dXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0Q2hhdFN0YXR1cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEtBQUssZUFBZSxNQUFNLHVCQUF1QixDQUFBO0FBQ3hELE9BQU8sRUFDTixtQkFBbUIsR0FFbkIsTUFBTSxtREFBbUQsQ0FBQTtBQUUxRCxNQUFNLE9BQU8saUJBQWlCO0lBSzdCLFlBQVksV0FBeUM7UUFGcEMsV0FBTSxHQUFHLElBQUksR0FBRyxFQUFpQyxDQUFBO1FBR2pFLElBQUksQ0FBQyxNQUFNLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLENBQUE7SUFDckYsQ0FBQztJQUVELG9CQUFvQixDQUFDLFNBQWdDLEVBQUUsRUFBVTtRQUNoRSxNQUFNLFVBQVUsR0FBRyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ2pFLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUNqQyxNQUFNLElBQUksS0FBSyxDQUFDLHFCQUFxQixFQUFFLGtCQUFrQixDQUFDLENBQUE7UUFDM0QsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFzQztZQUNoRCxFQUFFLEVBQUUsVUFBVTtZQUNkLEtBQUssRUFBRSxFQUFFO1lBQ1QsV0FBVyxFQUFFLEVBQUU7WUFDZixNQUFNLEVBQUUsRUFBRTtTQUNWLENBQUE7UUFFRCxJQUFJLFFBQVEsR0FBRyxLQUFLLENBQUE7UUFDcEIsSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFBO1FBQ25CLE1BQU0sU0FBUyxHQUFHLEdBQUcsRUFBRTtZQUN0QixJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUNkLE1BQU0sSUFBSSxLQUFLLENBQUMsOEJBQThCLENBQUMsQ0FBQTtZQUNoRCxDQUFDO1lBRUQsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNkLE9BQU07WUFDUCxDQUFDO1lBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2pDLENBQUMsQ0FBQTtRQUVELE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQXdCO1lBQ2pELEVBQUUsRUFBRSxFQUFFO1lBRU4sSUFBSSxLQUFLO2dCQUNSLE9BQU8sS0FBSyxDQUFDLEtBQUssQ0FBQTtZQUNuQixDQUFDO1lBQ0QsSUFBSSxLQUFLLENBQUMsS0FBYTtnQkFDdEIsS0FBSyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUE7Z0JBQ25CLFNBQVMsRUFBRSxDQUFBO1lBQ1osQ0FBQztZQUVELElBQUksV0FBVztnQkFDZCxPQUFPLEtBQUssQ0FBQyxXQUFXLENBQUE7WUFDekIsQ0FBQztZQUNELElBQUksV0FBVyxDQUFDLEtBQWE7Z0JBQzVCLEtBQUssQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFBO2dCQUN6QixTQUFTLEVBQUUsQ0FBQTtZQUNaLENBQUM7WUFFRCxJQUFJLE1BQU07Z0JBQ1QsT0FBTyxLQUFLLENBQUMsTUFBTSxDQUFBO1lBQ3BCLENBQUM7WUFDRCxJQUFJLE1BQU0sQ0FBQyxLQUF5QjtnQkFDbkMsS0FBSyxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUE7Z0JBQ3BCLFNBQVMsRUFBRSxDQUFBO1lBQ1osQ0FBQztZQUVELElBQUksRUFBRSxHQUFHLEVBQUU7Z0JBQ1YsT0FBTyxHQUFHLElBQUksQ0FBQTtnQkFDZCxTQUFTLEVBQUUsQ0FBQTtZQUNaLENBQUM7WUFDRCxJQUFJLEVBQUUsR0FBRyxFQUFFO2dCQUNWLE9BQU8sR0FBRyxLQUFLLENBQUE7Z0JBQ2YsSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDOUIsQ0FBQztZQUNELE9BQU8sRUFBRSxHQUFHLEVBQUU7Z0JBQ2IsUUFBUSxHQUFHLElBQUksQ0FBQTtnQkFDZixJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDN0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDL0IsQ0FBQztTQUNELENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNqQyxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7Q0FDRDtBQUVELFNBQVMsb0JBQW9CLENBQUMsU0FBOEIsRUFBRSxFQUFVO0lBQ3ZFLE9BQU8sR0FBRyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUE7QUFDdkQsQ0FBQyJ9