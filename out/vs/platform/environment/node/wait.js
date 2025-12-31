/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { randomPath } from '../../../base/common/extpath.js';
export function createWaitMarkerFileSync(verbose) {
    const randomWaitMarkerPath = randomPath(tmpdir());
    try {
        writeFileSync(randomWaitMarkerPath, ''); // use built-in fs to avoid dragging in more dependencies
        if (verbose) {
            console.log(`Marker file for --wait created: ${randomWaitMarkerPath}`);
        }
        return randomWaitMarkerPath;
    }
    catch (err) {
        if (verbose) {
            console.error(`Failed to create marker file for --wait: ${err}`);
        }
        return undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2FpdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2Vudmlyb25tZW50L25vZGUvd2FpdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ2xDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDM0IsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRTVELE1BQU0sVUFBVSx3QkFBd0IsQ0FBQyxPQUFpQjtJQUN6RCxNQUFNLG9CQUFvQixHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO0lBRWpELElBQUksQ0FBQztRQUNKLGFBQWEsQ0FBQyxvQkFBb0IsRUFBRSxFQUFFLENBQUMsQ0FBQSxDQUFDLHlEQUF5RDtRQUNqRyxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQ0FBbUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFBO1FBQ3ZFLENBQUM7UUFDRCxPQUFPLG9CQUFvQixDQUFBO0lBQzVCLENBQUM7SUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ2QsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLE9BQU8sQ0FBQyxLQUFLLENBQUMsNENBQTRDLEdBQUcsRUFBRSxDQUFDLENBQUE7UUFDakUsQ0FBQztRQUNELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7QUFDRixDQUFDIn0=