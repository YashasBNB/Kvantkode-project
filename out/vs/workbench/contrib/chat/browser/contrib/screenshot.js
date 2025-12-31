/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
export const ScreenshotVariableId = 'screenshot-focused-window';
export function convertBufferToScreenshotVariable(buffer) {
    return {
        id: ScreenshotVariableId,
        name: localize('screenshot', 'Screenshot'),
        value: new Uint8Array(buffer),
        isImage: true,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyZWVuc2hvdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jb250cmliL3NjcmVlbnNob3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBR2hELE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLDJCQUEyQixDQUFBO0FBRS9ELE1BQU0sVUFBVSxpQ0FBaUMsQ0FDaEQsTUFBdUI7SUFFdkIsT0FBTztRQUNOLEVBQUUsRUFBRSxvQkFBb0I7UUFDeEIsSUFBSSxFQUFFLFFBQVEsQ0FBQyxZQUFZLEVBQUUsWUFBWSxDQUFDO1FBQzFDLEtBQUssRUFBRSxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUM7UUFDN0IsT0FBTyxFQUFFLElBQUk7S0FDYixDQUFBO0FBQ0YsQ0FBQyJ9