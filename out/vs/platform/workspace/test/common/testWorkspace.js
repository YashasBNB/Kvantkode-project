/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isLinux, isWindows } from '../../../../base/common/platform.js';
import { URI } from '../../../../base/common/uri.js';
import { toWorkspaceFolder, Workspace as BaseWorkspace, } from '../../common/workspace.js';
export class Workspace extends BaseWorkspace {
    constructor(id, folders = [], configuration = null, ignorePathCasing = () => !isLinux) {
        super(id, folders, false, configuration, ignorePathCasing);
    }
}
const wsUri = URI.file(isWindows ? 'C:\\testWorkspace' : '/testWorkspace');
export const TestWorkspace = testWorkspace(wsUri);
export function testWorkspace(resource) {
    return new Workspace(resource.toString(), [toWorkspaceFolder(resource)]);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFdvcmtzcGFjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3dvcmtzcGFjZS90ZXN0L2NvbW1vbi90ZXN0V29ya3NwYWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDeEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFDTixpQkFBaUIsRUFDakIsU0FBUyxJQUFJLGFBQWEsR0FFMUIsTUFBTSwyQkFBMkIsQ0FBQTtBQUVsQyxNQUFNLE9BQU8sU0FBVSxTQUFRLGFBQWE7SUFDM0MsWUFDQyxFQUFVLEVBQ1YsVUFBNkIsRUFBRSxFQUMvQixnQkFBNEIsSUFBSSxFQUNoQyxtQkFBMEMsR0FBRyxFQUFFLENBQUMsQ0FBQyxPQUFPO1FBRXhELEtBQUssQ0FBQyxFQUFFLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxhQUFhLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtJQUMzRCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUE7QUFDMUUsTUFBTSxDQUFDLE1BQU0sYUFBYSxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtBQUVqRCxNQUFNLFVBQVUsYUFBYSxDQUFDLFFBQWE7SUFDMUMsT0FBTyxJQUFJLFNBQVMsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDekUsQ0FBQyJ9