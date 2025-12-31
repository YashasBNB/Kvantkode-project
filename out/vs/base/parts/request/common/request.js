/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const offlineName = 'Offline';
/**
 * Checks if the given error is offline error
 */
export function isOfflineError(error) {
    if (error instanceof OfflineError) {
        return true;
    }
    return error instanceof Error && error.name === offlineName && error.message === offlineName;
}
export class OfflineError extends Error {
    constructor() {
        super(offlineName);
        this.name = this.message;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvcGFydHMvcmVxdWVzdC9jb21tb24vcmVxdWVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxNQUFNLFdBQVcsR0FBRyxTQUFTLENBQUE7QUFFN0I7O0dBRUc7QUFDSCxNQUFNLFVBQVUsY0FBYyxDQUFDLEtBQVU7SUFDeEMsSUFBSSxLQUFLLFlBQVksWUFBWSxFQUFFLENBQUM7UUFDbkMsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBQ0QsT0FBTyxLQUFLLFlBQVksS0FBSyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssV0FBVyxJQUFJLEtBQUssQ0FBQyxPQUFPLEtBQUssV0FBVyxDQUFBO0FBQzdGLENBQUM7QUFFRCxNQUFNLE9BQU8sWUFBYSxTQUFRLEtBQUs7SUFDdEM7UUFDQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDbEIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFBO0lBQ3pCLENBQUM7Q0FDRCJ9