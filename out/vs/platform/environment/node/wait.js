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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2FpdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZW52aXJvbm1lbnQvbm9kZS93YWl0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDbEMsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLElBQUksQ0FBQTtBQUMzQixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFNUQsTUFBTSxVQUFVLHdCQUF3QixDQUFDLE9BQWlCO0lBQ3pELE1BQU0sb0JBQW9CLEdBQUcsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUE7SUFFakQsSUFBSSxDQUFDO1FBQ0osYUFBYSxDQUFDLG9CQUFvQixFQUFFLEVBQUUsQ0FBQyxDQUFBLENBQUMseURBQXlEO1FBQ2pHLElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixPQUFPLENBQUMsR0FBRyxDQUFDLG1DQUFtQyxvQkFBb0IsRUFBRSxDQUFDLENBQUE7UUFDdkUsQ0FBQztRQUNELE9BQU8sb0JBQW9CLENBQUE7SUFDNUIsQ0FBQztJQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFDZCxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsT0FBTyxDQUFDLEtBQUssQ0FBQyw0Q0FBNEMsR0FBRyxFQUFFLENBQUMsQ0FBQTtRQUNqRSxDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztBQUNGLENBQUMifQ==