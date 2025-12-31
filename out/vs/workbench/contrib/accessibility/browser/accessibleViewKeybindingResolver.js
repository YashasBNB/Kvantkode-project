/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MarkdownString } from '../../../../base/common/htmlContent.js';
export function resolveContentAndKeybindingItems(keybindingService, value) {
    if (!value) {
        return;
    }
    const configureKeybindingItems = [];
    const configuredKeybindingItems = [];
    const matches = value.matchAll(/(\<keybinding:(?<commandId>[^\<]*)\>)/gm);
    for (const match of [...matches]) {
        const commandId = match?.groups?.commandId;
        let kbLabel;
        if (match?.length && commandId) {
            const keybinding = keybindingService.lookupKeybinding(commandId)?.getAriaLabel();
            if (!keybinding) {
                kbLabel = ` (unassigned keybinding)`;
                configureKeybindingItems.push({
                    label: commandId,
                    id: commandId,
                });
            }
            else {
                kbLabel = ' (' + keybinding + ')';
                configuredKeybindingItems.push({
                    label: commandId,
                    id: commandId,
                });
            }
            value = value.replace(match[0], kbLabel);
        }
    }
    const content = new MarkdownString(value);
    content.isTrusted = true;
    return {
        content,
        configureKeybindingItems: configureKeybindingItems.length
            ? configureKeybindingItems
            : undefined,
        configuredKeybindingItems: configuredKeybindingItems.length
            ? configuredKeybindingItems
            : undefined,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJsZVZpZXdLZXliaW5kaW5nUmVzb2x2ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9hY2Nlc3NpYmlsaXR5L2Jyb3dzZXIvYWNjZXNzaWJsZVZpZXdLZXliaW5kaW5nUmVzb2x2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBSXZFLE1BQU0sVUFBVSxnQ0FBZ0MsQ0FDL0MsaUJBQXFDLEVBQ3JDLEtBQWM7SUFRZCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDWixPQUFNO0lBQ1AsQ0FBQztJQUNELE1BQU0sd0JBQXdCLEdBQTZCLEVBQUUsQ0FBQTtJQUM3RCxNQUFNLHlCQUF5QixHQUE2QixFQUFFLENBQUE7SUFDOUQsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFBO0lBQ3pFLEtBQUssTUFBTSxLQUFLLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxFQUFFLENBQUM7UUFDbEMsTUFBTSxTQUFTLEdBQUcsS0FBSyxFQUFFLE1BQU0sRUFBRSxTQUFTLENBQUE7UUFDMUMsSUFBSSxPQUFPLENBQUE7UUFDWCxJQUFJLEtBQUssRUFBRSxNQUFNLElBQUksU0FBUyxFQUFFLENBQUM7WUFDaEMsTUFBTSxVQUFVLEdBQUcsaUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLEVBQUUsWUFBWSxFQUFFLENBQUE7WUFDaEYsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUNqQixPQUFPLEdBQUcsMEJBQTBCLENBQUE7Z0JBQ3BDLHdCQUF3QixDQUFDLElBQUksQ0FBQztvQkFDN0IsS0FBSyxFQUFFLFNBQVM7b0JBQ2hCLEVBQUUsRUFBRSxTQUFTO2lCQUNiLENBQUMsQ0FBQTtZQUNILENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLEdBQUcsSUFBSSxHQUFHLFVBQVUsR0FBRyxHQUFHLENBQUE7Z0JBQ2pDLHlCQUF5QixDQUFDLElBQUksQ0FBQztvQkFDOUIsS0FBSyxFQUFFLFNBQVM7b0JBQ2hCLEVBQUUsRUFBRSxTQUFTO2lCQUNiLENBQUMsQ0FBQTtZQUNILENBQUM7WUFDRCxLQUFLLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDekMsQ0FBQztJQUNGLENBQUM7SUFDRCxNQUFNLE9BQU8sR0FBRyxJQUFJLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUN6QyxPQUFPLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQTtJQUN4QixPQUFPO1FBQ04sT0FBTztRQUNQLHdCQUF3QixFQUFFLHdCQUF3QixDQUFDLE1BQU07WUFDeEQsQ0FBQyxDQUFDLHdCQUF3QjtZQUMxQixDQUFDLENBQUMsU0FBUztRQUNaLHlCQUF5QixFQUFFLHlCQUF5QixDQUFDLE1BQU07WUFDMUQsQ0FBQyxDQUFDLHlCQUF5QjtZQUMzQixDQUFDLENBQUMsU0FBUztLQUNaLENBQUE7QUFDRixDQUFDIn0=