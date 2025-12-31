/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function isLocalizedString(thing) {
    return (thing &&
        typeof thing === 'object' &&
        typeof thing.original === 'string' &&
        typeof thing.value === 'string');
}
export function isICommandActionToggleInfo(thing) {
    return thing ? thing.condition !== undefined : false;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vYWN0aW9uL2NvbW1vbi9hY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFvQmhHLE1BQU0sVUFBVSxpQkFBaUIsQ0FBQyxLQUFVO0lBQzNDLE9BQU8sQ0FDTixLQUFLO1FBQ0wsT0FBTyxLQUFLLEtBQUssUUFBUTtRQUN6QixPQUFPLEtBQUssQ0FBQyxRQUFRLEtBQUssUUFBUTtRQUNsQyxPQUFPLEtBQUssQ0FBQyxLQUFLLEtBQUssUUFBUSxDQUMvQixDQUFBO0FBQ0YsQ0FBQztBQWdDRCxNQUFNLFVBQVUsMEJBQTBCLENBQ3pDLEtBQWtFO0lBRWxFLE9BQU8sS0FBSyxDQUFDLENBQUMsQ0FBNEIsS0FBTSxDQUFDLFNBQVMsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQTtBQUNqRixDQUFDIn0=