/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { TestId } from '../../common/testId.js';
/**
 * Gets whether the given test ID is collapsed.
 */
export function isCollapsedInSerializedTestTree(serialized, id) {
    if (!(id instanceof TestId)) {
        id = TestId.fromString(id);
    }
    let node = serialized;
    for (const part of id.path) {
        if (!node.children?.hasOwnProperty(part)) {
            return undefined;
        }
        node = node.children[part];
    }
    return node.collapsed;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ1ZpZXdTdGF0ZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvYnJvd3Nlci9leHBsb3JlclByb2plY3Rpb25zL3Rlc3RpbmdWaWV3U3RhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBTy9DOztHQUVHO0FBQ0gsTUFBTSxVQUFVLCtCQUErQixDQUM5QyxVQUE0QyxFQUM1QyxFQUFtQjtJQUVuQixJQUFJLENBQUMsQ0FBQyxFQUFFLFlBQVksTUFBTSxDQUFDLEVBQUUsQ0FBQztRQUM3QixFQUFFLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUMzQixDQUFDO0lBRUQsSUFBSSxJQUFJLEdBQUcsVUFBVSxDQUFBO0lBQ3JCLEtBQUssTUFBTSxJQUFJLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQzVCLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQzFDLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFFRCxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUMzQixDQUFDO0lBRUQsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFBO0FBQ3RCLENBQUMifQ==