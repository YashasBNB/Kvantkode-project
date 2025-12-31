/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function isMenubarMenuItemSubmenu(menuItem) {
    return menuItem.submenu !== undefined;
}
export function isMenubarMenuItemSeparator(menuItem) {
    return menuItem.id === 'vscode.menubar.separator';
}
export function isMenubarMenuItemRecentAction(menuItem) {
    return menuItem.uri !== undefined;
}
export function isMenubarMenuItemAction(menuItem) {
    return (!isMenubarMenuItemSubmenu(menuItem) &&
        !isMenubarMenuItemSeparator(menuItem) &&
        !isMenubarMenuItemRecentAction(menuItem));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudWJhci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL21lbnViYXIvY29tbW9uL21lbnViYXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFzRGhHLE1BQU0sVUFBVSx3QkFBd0IsQ0FDdkMsUUFBeUI7SUFFekIsT0FBaUMsUUFBUyxDQUFDLE9BQU8sS0FBSyxTQUFTLENBQUE7QUFDakUsQ0FBQztBQUVELE1BQU0sVUFBVSwwQkFBMEIsQ0FDekMsUUFBeUI7SUFFekIsT0FBbUMsUUFBUyxDQUFDLEVBQUUsS0FBSywwQkFBMEIsQ0FBQTtBQUMvRSxDQUFDO0FBRUQsTUFBTSxVQUFVLDZCQUE2QixDQUM1QyxRQUF5QjtJQUV6QixPQUFzQyxRQUFTLENBQUMsR0FBRyxLQUFLLFNBQVMsQ0FBQTtBQUNsRSxDQUFDO0FBRUQsTUFBTSxVQUFVLHVCQUF1QixDQUN0QyxRQUF5QjtJQUV6QixPQUFPLENBQ04sQ0FBQyx3QkFBd0IsQ0FBQyxRQUFRLENBQUM7UUFDbkMsQ0FBQywwQkFBMEIsQ0FBQyxRQUFRLENBQUM7UUFDckMsQ0FBQyw2QkFBNkIsQ0FBQyxRQUFRLENBQUMsQ0FDeEMsQ0FBQTtBQUNGLENBQUMifQ==