/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function isChatViewTitleActionContext(obj) {
    return (!!obj &&
        typeof obj.sessionId === 'string' &&
        obj.$mid === 19 /* MarshalledId.ChatViewContext */);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9jaGF0QWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVNoRyxNQUFNLFVBQVUsNEJBQTRCLENBQUMsR0FBWTtJQUN4RCxPQUFPLENBQ04sQ0FBQyxDQUFDLEdBQUc7UUFDTCxPQUFRLEdBQW1DLENBQUMsU0FBUyxLQUFLLFFBQVE7UUFDakUsR0FBbUMsQ0FBQyxJQUFJLDBDQUFpQyxDQUMxRSxDQUFBO0FBQ0YsQ0FBQyJ9