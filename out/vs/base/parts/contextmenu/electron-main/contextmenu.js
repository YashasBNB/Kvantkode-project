/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Menu, MenuItem } from 'electron';
import { validatedIpcMain } from '../../ipc/electron-main/ipcMain.js';
import { CONTEXT_MENU_CHANNEL, CONTEXT_MENU_CLOSE_CHANNEL, } from '../common/contextmenu.js';
export function registerContextMenuListener() {
    validatedIpcMain.on(CONTEXT_MENU_CHANNEL, (event, contextMenuId, items, onClickChannel, options) => {
        const menu = createMenu(event, onClickChannel, items);
        menu.popup({
            x: options ? options.x : undefined,
            y: options ? options.y : undefined,
            positioningItem: options ? options.positioningItem : undefined,
            callback: () => {
                // Workaround for https://github.com/microsoft/vscode/issues/72447
                // It turns out that the menu gets GC'ed if not referenced anymore
                // As such we drag it into this scope so that it is not being GC'ed
                if (menu) {
                    event.sender.send(CONTEXT_MENU_CLOSE_CHANNEL, contextMenuId);
                }
            },
        });
    });
}
function createMenu(event, onClickChannel, items) {
    const menu = new Menu();
    items.forEach((item) => {
        let menuitem;
        // Separator
        if (item.type === 'separator') {
            menuitem = new MenuItem({
                type: item.type,
            });
        }
        // Sub Menu
        else if (Array.isArray(item.submenu)) {
            menuitem = new MenuItem({
                submenu: createMenu(event, onClickChannel, item.submenu),
                label: item.label,
            });
        }
        // Normal Menu Item
        else {
            menuitem = new MenuItem({
                label: item.label,
                type: item.type,
                accelerator: item.accelerator,
                checked: item.checked,
                enabled: item.enabled,
                visible: item.visible,
                click: (menuItem, win, contextmenuEvent) => event.sender.send(onClickChannel, item.id, contextmenuEvent),
            });
        }
        menu.append(menuitem);
    });
    return menu;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dG1lbnUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvcGFydHMvY29udGV4dG1lbnUvZWxlY3Ryb24tbWFpbi9jb250ZXh0bWVudS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQWdCLElBQUksRUFBRSxRQUFRLEVBQUUsTUFBTSxVQUFVLENBQUE7QUFDdkQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDckUsT0FBTyxFQUNOLG9CQUFvQixFQUNwQiwwQkFBMEIsR0FHMUIsTUFBTSwwQkFBMEIsQ0FBQTtBQUVqQyxNQUFNLFVBQVUsMkJBQTJCO0lBQzFDLGdCQUFnQixDQUFDLEVBQUUsQ0FDbEIsb0JBQW9CLEVBQ3BCLENBQ0MsS0FBbUIsRUFDbkIsYUFBcUIsRUFDckIsS0FBcUMsRUFDckMsY0FBc0IsRUFDdEIsT0FBdUIsRUFDdEIsRUFBRTtRQUNILE1BQU0sSUFBSSxHQUFHLFVBQVUsQ0FBQyxLQUFLLEVBQUUsY0FBYyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRXJELElBQUksQ0FBQyxLQUFLLENBQUM7WUFDVixDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTO1lBQ2xDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVM7WUFDbEMsZUFBZSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsU0FBUztZQUM5RCxRQUFRLEVBQUUsR0FBRyxFQUFFO2dCQUNkLGtFQUFrRTtnQkFDbEUsa0VBQWtFO2dCQUNsRSxtRUFBbUU7Z0JBQ25FLElBQUksSUFBSSxFQUFFLENBQUM7b0JBQ1YsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsMEJBQTBCLEVBQUUsYUFBYSxDQUFDLENBQUE7Z0JBQzdELENBQUM7WUFDRixDQUFDO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUNELENBQUE7QUFDRixDQUFDO0FBRUQsU0FBUyxVQUFVLENBQ2xCLEtBQW1CLEVBQ25CLGNBQXNCLEVBQ3RCLEtBQXFDO0lBRXJDLE1BQU0sSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUE7SUFFdkIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1FBQ3RCLElBQUksUUFBa0IsQ0FBQTtRQUV0QixZQUFZO1FBQ1osSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQy9CLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBQztnQkFDdkIsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO2FBQ2YsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELFdBQVc7YUFDTixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDdEMsUUFBUSxHQUFHLElBQUksUUFBUSxDQUFDO2dCQUN2QixPQUFPLEVBQUUsVUFBVSxDQUFDLEtBQUssRUFBRSxjQUFjLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQztnQkFDeEQsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO2FBQ2pCLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxtQkFBbUI7YUFDZCxDQUFDO1lBQ0wsUUFBUSxHQUFHLElBQUksUUFBUSxDQUFDO2dCQUN2QixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7Z0JBQ2pCLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtnQkFDZixXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVc7Z0JBQzdCLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTztnQkFDckIsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO2dCQUNyQixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87Z0JBQ3JCLEtBQUssRUFBRSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsZ0JBQWdCLEVBQUUsRUFBRSxDQUMxQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxnQkFBZ0IsQ0FBQzthQUM3RCxDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUN0QixDQUFDLENBQUMsQ0FBQTtJQUVGLE9BQU8sSUFBSSxDQUFBO0FBQ1osQ0FBQyJ9