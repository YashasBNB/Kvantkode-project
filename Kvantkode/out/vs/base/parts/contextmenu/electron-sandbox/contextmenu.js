/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CONTEXT_MENU_CHANNEL, CONTEXT_MENU_CLOSE_CHANNEL, } from '../common/contextmenu.js';
import { ipcRenderer } from '../../sandbox/electron-sandbox/globals.js';
let contextMenuIdPool = 0;
export function popup(items, options, onHide) {
    const processedItems = [];
    const contextMenuId = contextMenuIdPool++;
    const onClickChannel = `vscode:onContextMenu${contextMenuId}`;
    const onClickChannelHandler = (event, itemId, context) => {
        const item = processedItems[itemId];
        item.click?.(context);
    };
    ipcRenderer.once(onClickChannel, onClickChannelHandler);
    ipcRenderer.once(CONTEXT_MENU_CLOSE_CHANNEL, (event, closedContextMenuId) => {
        if (closedContextMenuId !== contextMenuId) {
            return;
        }
        ipcRenderer.removeListener(onClickChannel, onClickChannelHandler);
        onHide?.();
    });
    ipcRenderer.send(CONTEXT_MENU_CHANNEL, contextMenuId, items.map((item) => createItem(item, processedItems)), onClickChannel, options);
}
function createItem(item, processedItems) {
    const serializableItem = {
        id: processedItems.length,
        label: item.label,
        type: item.type,
        accelerator: item.accelerator,
        checked: item.checked,
        enabled: typeof item.enabled === 'boolean' ? item.enabled : true,
        visible: typeof item.visible === 'boolean' ? item.visible : true,
    };
    processedItems.push(item);
    // Submenu
    if (Array.isArray(item.submenu)) {
        serializableItem.submenu = item.submenu.map((submenuItem) => createItem(submenuItem, processedItems));
    }
    return serializableItem;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dG1lbnUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvcGFydHMvY29udGV4dG1lbnUvZWxlY3Ryb24tc2FuZGJveC9jb250ZXh0bWVudS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLDBCQUEwQixHQUsxQixNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUV2RSxJQUFJLGlCQUFpQixHQUFHLENBQUMsQ0FBQTtBQUV6QixNQUFNLFVBQVUsS0FBSyxDQUNwQixLQUF5QixFQUN6QixPQUF1QixFQUN2QixNQUFtQjtJQUVuQixNQUFNLGNBQWMsR0FBdUIsRUFBRSxDQUFBO0lBRTdDLE1BQU0sYUFBYSxHQUFHLGlCQUFpQixFQUFFLENBQUE7SUFDekMsTUFBTSxjQUFjLEdBQUcsdUJBQXVCLGFBQWEsRUFBRSxDQUFBO0lBQzdELE1BQU0scUJBQXFCLEdBQUcsQ0FBQyxLQUFjLEVBQUUsTUFBYyxFQUFFLE9BQTBCLEVBQUUsRUFBRTtRQUM1RixNQUFNLElBQUksR0FBRyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDbkMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ3RCLENBQUMsQ0FBQTtJQUVELFdBQVcsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLHFCQUFxQixDQUFDLENBQUE7SUFDdkQsV0FBVyxDQUFDLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDLEtBQWMsRUFBRSxtQkFBMkIsRUFBRSxFQUFFO1FBQzVGLElBQUksbUJBQW1CLEtBQUssYUFBYSxFQUFFLENBQUM7WUFDM0MsT0FBTTtRQUNQLENBQUM7UUFFRCxXQUFXLENBQUMsY0FBYyxDQUFDLGNBQWMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFBO1FBRWpFLE1BQU0sRUFBRSxFQUFFLENBQUE7SUFDWCxDQUFDLENBQUMsQ0FBQTtJQUVGLFdBQVcsQ0FBQyxJQUFJLENBQ2Ysb0JBQW9CLEVBQ3BCLGFBQWEsRUFDYixLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDLEVBQ3JELGNBQWMsRUFDZCxPQUFPLENBQ1AsQ0FBQTtBQUNGLENBQUM7QUFFRCxTQUFTLFVBQVUsQ0FDbEIsSUFBc0IsRUFDdEIsY0FBa0M7SUFFbEMsTUFBTSxnQkFBZ0IsR0FBaUM7UUFDdEQsRUFBRSxFQUFFLGNBQWMsQ0FBQyxNQUFNO1FBQ3pCLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztRQUNqQixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7UUFDZixXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVc7UUFDN0IsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO1FBQ3JCLE9BQU8sRUFBRSxPQUFPLElBQUksQ0FBQyxPQUFPLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJO1FBQ2hFLE9BQU8sRUFBRSxPQUFPLElBQUksQ0FBQyxPQUFPLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJO0tBQ2hFLENBQUE7SUFFRCxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBRXpCLFVBQVU7SUFDVixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7UUFDakMsZ0JBQWdCLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FDM0QsVUFBVSxDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FDdkMsQ0FBQTtJQUNGLENBQUM7SUFFRCxPQUFPLGdCQUFnQixDQUFBO0FBQ3hCLENBQUMifQ==