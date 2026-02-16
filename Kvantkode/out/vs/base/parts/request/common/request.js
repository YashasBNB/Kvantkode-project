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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9wYXJ0cy9yZXF1ZXN0L2NvbW1vbi9yZXF1ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE1BQU0sV0FBVyxHQUFHLFNBQVMsQ0FBQTtBQUU3Qjs7R0FFRztBQUNILE1BQU0sVUFBVSxjQUFjLENBQUMsS0FBVTtJQUN4QyxJQUFJLEtBQUssWUFBWSxZQUFZLEVBQUUsQ0FBQztRQUNuQyxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFDRCxPQUFPLEtBQUssWUFBWSxLQUFLLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxXQUFXLElBQUksS0FBSyxDQUFDLE9BQU8sS0FBSyxXQUFXLENBQUE7QUFDN0YsQ0FBQztBQUVELE1BQU0sT0FBTyxZQUFhLFNBQVEsS0FBSztJQUN0QztRQUNDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUNsQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUE7SUFDekIsQ0FBQztDQUNEIn0=