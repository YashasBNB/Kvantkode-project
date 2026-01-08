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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJsZVZpZXdLZXliaW5kaW5nUmVzb2x2ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FjY2Vzc2liaWxpdHkvYnJvd3Nlci9hY2Nlc3NpYmxlVmlld0tleWJpbmRpbmdSZXNvbHZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFJdkUsTUFBTSxVQUFVLGdDQUFnQyxDQUMvQyxpQkFBcUMsRUFDckMsS0FBYztJQVFkLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNaLE9BQU07SUFDUCxDQUFDO0lBQ0QsTUFBTSx3QkFBd0IsR0FBNkIsRUFBRSxDQUFBO0lBQzdELE1BQU0seUJBQXlCLEdBQTZCLEVBQUUsQ0FBQTtJQUM5RCxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLHlDQUF5QyxDQUFDLENBQUE7SUFDekUsS0FBSyxNQUFNLEtBQUssSUFBSSxDQUFDLEdBQUcsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUNsQyxNQUFNLFNBQVMsR0FBRyxLQUFLLEVBQUUsTUFBTSxFQUFFLFNBQVMsQ0FBQTtRQUMxQyxJQUFJLE9BQU8sQ0FBQTtRQUNYLElBQUksS0FBSyxFQUFFLE1BQU0sSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNoQyxNQUFNLFVBQVUsR0FBRyxpQkFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsRUFBRSxZQUFZLEVBQUUsQ0FBQTtZQUNoRixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ2pCLE9BQU8sR0FBRywwQkFBMEIsQ0FBQTtnQkFDcEMsd0JBQXdCLENBQUMsSUFBSSxDQUFDO29CQUM3QixLQUFLLEVBQUUsU0FBUztvQkFDaEIsRUFBRSxFQUFFLFNBQVM7aUJBQ2IsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sR0FBRyxJQUFJLEdBQUcsVUFBVSxHQUFHLEdBQUcsQ0FBQTtnQkFDakMseUJBQXlCLENBQUMsSUFBSSxDQUFDO29CQUM5QixLQUFLLEVBQUUsU0FBUztvQkFDaEIsRUFBRSxFQUFFLFNBQVM7aUJBQ2IsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztZQUNELEtBQUssR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUN6QyxDQUFDO0lBQ0YsQ0FBQztJQUNELE1BQU0sT0FBTyxHQUFHLElBQUksY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3pDLE9BQU8sQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFBO0lBQ3hCLE9BQU87UUFDTixPQUFPO1FBQ1Asd0JBQXdCLEVBQUUsd0JBQXdCLENBQUMsTUFBTTtZQUN4RCxDQUFDLENBQUMsd0JBQXdCO1lBQzFCLENBQUMsQ0FBQyxTQUFTO1FBQ1oseUJBQXlCLEVBQUUseUJBQXlCLENBQUMsTUFBTTtZQUMxRCxDQUFDLENBQUMseUJBQXlCO1lBQzNCLENBQUMsQ0FBQyxTQUFTO0tBQ1osQ0FBQTtBQUNGLENBQUMifQ==