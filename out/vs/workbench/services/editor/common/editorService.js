/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { isEditorGroup, } from './editorGroupsService.js';
export const IEditorService = createDecorator('editorService');
/**
 * Open an editor in the currently active group.
 */
export const ACTIVE_GROUP = -1;
/**
 * Open an editor to the side of the active group.
 */
export const SIDE_GROUP = -2;
/**
 * Open an editor in a new auxiliary window.
 */
export const AUX_WINDOW_GROUP = -3;
export function isPreferredGroup(obj) {
    const candidate = obj;
    return typeof obj === 'number' || isEditorGroup(candidate);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9lZGl0b3IvY29tbW9uL2VkaXRvclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBMEI1RixPQUFPLEVBSU4sYUFBYSxHQUNiLE1BQU0sMEJBQTBCLENBQUE7QUFLakMsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLGVBQWUsQ0FBaUIsZUFBZSxDQUFDLENBQUE7QUFFOUU7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUE7QUFHOUI7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUE7QUFHNUI7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLENBQUMsQ0FBQTtBQVVsQyxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsR0FBWTtJQUM1QyxNQUFNLFNBQVMsR0FBRyxHQUFpQyxDQUFBO0lBRW5ELE9BQU8sT0FBTyxHQUFHLEtBQUssUUFBUSxJQUFJLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQTtBQUMzRCxDQUFDIn0=