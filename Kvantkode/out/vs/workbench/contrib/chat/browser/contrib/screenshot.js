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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyZWVuc2hvdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NvbnRyaWIvc2NyZWVuc2hvdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFHaEQsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsMkJBQTJCLENBQUE7QUFFL0QsTUFBTSxVQUFVLGlDQUFpQyxDQUNoRCxNQUF1QjtJQUV2QixPQUFPO1FBQ04sRUFBRSxFQUFFLG9CQUFvQjtRQUN4QixJQUFJLEVBQUUsUUFBUSxDQUFDLFlBQVksRUFBRSxZQUFZLENBQUM7UUFDMUMsS0FBSyxFQUFFLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQztRQUM3QixPQUFPLEVBQUUsSUFBSTtLQUNiLENBQUE7QUFDRixDQUFDIn0=