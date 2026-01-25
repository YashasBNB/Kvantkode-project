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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudWJhci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vbWVudWJhci9jb21tb24vbWVudWJhci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQXNEaEcsTUFBTSxVQUFVLHdCQUF3QixDQUN2QyxRQUF5QjtJQUV6QixPQUFpQyxRQUFTLENBQUMsT0FBTyxLQUFLLFNBQVMsQ0FBQTtBQUNqRSxDQUFDO0FBRUQsTUFBTSxVQUFVLDBCQUEwQixDQUN6QyxRQUF5QjtJQUV6QixPQUFtQyxRQUFTLENBQUMsRUFBRSxLQUFLLDBCQUEwQixDQUFBO0FBQy9FLENBQUM7QUFFRCxNQUFNLFVBQVUsNkJBQTZCLENBQzVDLFFBQXlCO0lBRXpCLE9BQXNDLFFBQVMsQ0FBQyxHQUFHLEtBQUssU0FBUyxDQUFBO0FBQ2xFLENBQUM7QUFFRCxNQUFNLFVBQVUsdUJBQXVCLENBQ3RDLFFBQXlCO0lBRXpCLE9BQU8sQ0FDTixDQUFDLHdCQUF3QixDQUFDLFFBQVEsQ0FBQztRQUNuQyxDQUFDLDBCQUEwQixDQUFDLFFBQVEsQ0FBQztRQUNyQyxDQUFDLDZCQUE2QixDQUFDLFFBQVEsQ0FBQyxDQUN4QyxDQUFBO0FBQ0YsQ0FBQyJ9