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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dG1lbnUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3BhcnRzL2NvbnRleHRtZW51L2VsZWN0cm9uLW1haW4vY29udGV4dG1lbnUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFnQixJQUFJLEVBQUUsUUFBUSxFQUFFLE1BQU0sVUFBVSxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3JFLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsMEJBQTBCLEdBRzFCLE1BQU0sMEJBQTBCLENBQUE7QUFFakMsTUFBTSxVQUFVLDJCQUEyQjtJQUMxQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQ2xCLG9CQUFvQixFQUNwQixDQUNDLEtBQW1CLEVBQ25CLGFBQXFCLEVBQ3JCLEtBQXFDLEVBQ3JDLGNBQXNCLEVBQ3RCLE9BQXVCLEVBQ3RCLEVBQUU7UUFDSCxNQUFNLElBQUksR0FBRyxVQUFVLENBQUMsS0FBSyxFQUFFLGNBQWMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUVyRCxJQUFJLENBQUMsS0FBSyxDQUFDO1lBQ1YsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUztZQUNsQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTO1lBQ2xDLGVBQWUsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLFNBQVM7WUFDOUQsUUFBUSxFQUFFLEdBQUcsRUFBRTtnQkFDZCxrRUFBa0U7Z0JBQ2xFLGtFQUFrRTtnQkFDbEUsbUVBQW1FO2dCQUNuRSxJQUFJLElBQUksRUFBRSxDQUFDO29CQUNWLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLDBCQUEwQixFQUFFLGFBQWEsQ0FBQyxDQUFBO2dCQUM3RCxDQUFDO1lBQ0YsQ0FBQztTQUNELENBQUMsQ0FBQTtJQUNILENBQUMsQ0FDRCxDQUFBO0FBQ0YsQ0FBQztBQUVELFNBQVMsVUFBVSxDQUNsQixLQUFtQixFQUNuQixjQUFzQixFQUN0QixLQUFxQztJQUVyQyxNQUFNLElBQUksR0FBRyxJQUFJLElBQUksRUFBRSxDQUFBO0lBRXZCLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtRQUN0QixJQUFJLFFBQWtCLENBQUE7UUFFdEIsWUFBWTtRQUNaLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUMvQixRQUFRLEdBQUcsSUFBSSxRQUFRLENBQUM7Z0JBQ3ZCLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTthQUNmLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxXQUFXO2FBQ04sSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ3RDLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBQztnQkFDdkIsT0FBTyxFQUFFLFVBQVUsQ0FBQyxLQUFLLEVBQUUsY0FBYyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUM7Z0JBQ3hELEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSzthQUNqQixDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQsbUJBQW1CO2FBQ2QsQ0FBQztZQUNMLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBQztnQkFDdkIsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO2dCQUNqQixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7Z0JBQ2YsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXO2dCQUM3QixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87Z0JBQ3JCLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTztnQkFDckIsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO2dCQUNyQixLQUFLLEVBQUUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLGdCQUFnQixFQUFFLEVBQUUsQ0FDMUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsZ0JBQWdCLENBQUM7YUFDN0QsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDdEIsQ0FBQyxDQUFDLENBQUE7SUFFRixPQUFPLElBQUksQ0FBQTtBQUNaLENBQUMifQ==