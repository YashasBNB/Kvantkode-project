/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function isManagedHoverTooltipMarkdownString(obj) {
    const candidate = obj;
    return (typeof candidate === 'object' &&
        'markdown' in candidate &&
        'markdownNotSupportedFallback' in candidate);
}
export function isManagedHoverTooltipHTMLElement(obj) {
    const candidate = obj;
    return typeof candidate === 'object' && 'element' in candidate;
}
// #endregion Managed hover
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvaG92ZXIvaG92ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFxWWhHLE1BQU0sVUFBVSxtQ0FBbUMsQ0FDbEQsR0FBWTtJQUVaLE1BQU0sU0FBUyxHQUFHLEdBQXlDLENBQUE7SUFDM0QsT0FBTyxDQUNOLE9BQU8sU0FBUyxLQUFLLFFBQVE7UUFDN0IsVUFBVSxJQUFJLFNBQVM7UUFDdkIsOEJBQThCLElBQUksU0FBUyxDQUMzQyxDQUFBO0FBQ0YsQ0FBQztBQU1ELE1BQU0sVUFBVSxnQ0FBZ0MsQ0FDL0MsR0FBWTtJQUVaLE1BQU0sU0FBUyxHQUFHLEdBQXNDLENBQUE7SUFDeEQsT0FBTyxPQUFPLFNBQVMsS0FBSyxRQUFRLElBQUksU0FBUyxJQUFJLFNBQVMsQ0FBQTtBQUMvRCxDQUFDO0FBZ0NELDJCQUEyQiJ9