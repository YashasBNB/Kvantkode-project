/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ColorDecorationInjectedTextMarker } from '../colorDetector.js';
export function isOnColorDecorator(mouseEvent) {
    const target = mouseEvent.target;
    return (!!target &&
        target.type === 6 /* MouseTargetType.CONTENT_TEXT */ &&
        target.detail.injectedText?.options.attachedData === ColorDecorationInjectedTextMarker);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJDb2xvclBpY2tlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvbG9yUGlja2VyL2Jyb3dzZXIvaG92ZXJDb2xvclBpY2tlci9ob3ZlckNvbG9yUGlja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBRXZFLE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxVQUFvQztJQUN0RSxNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFBO0lBQ2hDLE9BQU8sQ0FDTixDQUFDLENBQUMsTUFBTTtRQUNSLE1BQU0sQ0FBQyxJQUFJLHlDQUFpQztRQUM1QyxNQUFNLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsWUFBWSxLQUFLLGlDQUFpQyxDQUN0RixDQUFBO0FBQ0YsQ0FBQyJ9