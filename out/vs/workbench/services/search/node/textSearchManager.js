/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { toCanonicalName } from '../../textfile/common/encoding.js';
import * as pfs from '../../../../base/node/pfs.js';
import { TextSearchManager } from '../common/textSearchManager.js';
export class NativeTextSearchManager extends TextSearchManager {
    constructor(query, provider, _pfs = pfs, processType = 'searchProcess') {
        super({ query, provider }, {
            readdir: (resource) => _pfs.Promises.readdir(resource.fsPath),
            toCanonicalName: (name) => toCanonicalName(name),
        }, processType);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFNlYXJjaE1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL25vZGUvdGV4dFNlYXJjaE1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ25FLE9BQU8sS0FBSyxHQUFHLE1BQU0sOEJBQThCLENBQUE7QUFHbkQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFbEUsTUFBTSxPQUFPLHVCQUF3QixTQUFRLGlCQUFpQjtJQUM3RCxZQUNDLEtBQWlCLEVBQ2pCLFFBQTZCLEVBQzdCLE9BQW1CLEdBQUcsRUFDdEIsY0FBd0MsZUFBZTtRQUV2RCxLQUFLLENBQ0osRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLEVBQ25CO1lBQ0MsT0FBTyxFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO1lBQzdELGVBQWUsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQztTQUNoRCxFQUNELFdBQVcsQ0FDWCxDQUFBO0lBQ0YsQ0FBQztDQUNEIn0=