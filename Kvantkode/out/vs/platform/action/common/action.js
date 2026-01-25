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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9hY3Rpb24vY29tbW9uL2FjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQW9CaEcsTUFBTSxVQUFVLGlCQUFpQixDQUFDLEtBQVU7SUFDM0MsT0FBTyxDQUNOLEtBQUs7UUFDTCxPQUFPLEtBQUssS0FBSyxRQUFRO1FBQ3pCLE9BQU8sS0FBSyxDQUFDLFFBQVEsS0FBSyxRQUFRO1FBQ2xDLE9BQU8sS0FBSyxDQUFDLEtBQUssS0FBSyxRQUFRLENBQy9CLENBQUE7QUFDRixDQUFDO0FBZ0NELE1BQU0sVUFBVSwwQkFBMEIsQ0FDekMsS0FBa0U7SUFFbEUsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUE0QixLQUFNLENBQUMsU0FBUyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFBO0FBQ2pGLENBQUMifQ==