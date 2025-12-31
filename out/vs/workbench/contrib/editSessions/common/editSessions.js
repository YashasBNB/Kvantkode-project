/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { decodeBase64, VSBuffer } from '../../../../base/common/buffer.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { localize, localize2 } from '../../../../nls.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { StringSHA1 } from '../../../../base/common/hash.js';
export const EDIT_SESSION_SYNC_CATEGORY = localize2('cloud changes', 'Cloud Changes');
export const IEditSessionsStorageService = createDecorator('IEditSessionsStorageService');
export const IEditSessionsLogService = createDecorator('IEditSessionsLogService');
export var ChangeType;
(function (ChangeType) {
    ChangeType[ChangeType["Addition"] = 1] = "Addition";
    ChangeType[ChangeType["Deletion"] = 2] = "Deletion";
})(ChangeType || (ChangeType = {}));
export var FileType;
(function (FileType) {
    FileType[FileType["File"] = 1] = "File";
})(FileType || (FileType = {}));
export const EditSessionSchemaVersion = 3;
export const EDIT_SESSIONS_SIGNED_IN_KEY = 'editSessionsSignedIn';
export const EDIT_SESSIONS_SIGNED_IN = new RawContextKey(EDIT_SESSIONS_SIGNED_IN_KEY, false);
export const EDIT_SESSIONS_PENDING_KEY = 'editSessionsPending';
export const EDIT_SESSIONS_PENDING = new RawContextKey(EDIT_SESSIONS_PENDING_KEY, false);
export const EDIT_SESSIONS_CONTAINER_ID = 'workbench.view.editSessions';
export const EDIT_SESSIONS_DATA_VIEW_ID = 'workbench.views.editSessions.data';
export const EDIT_SESSIONS_TITLE = localize2('cloud changes', 'Cloud Changes');
export const EDIT_SESSIONS_VIEW_ICON = registerIcon('edit-sessions-view-icon', Codicon.cloudDownload, localize('editSessionViewIcon', 'View icon of the cloud changes view.'));
export const EDIT_SESSIONS_SHOW_VIEW = new RawContextKey('editSessionsShowView', false);
export const EDIT_SESSIONS_SCHEME = 'vscode-edit-sessions';
export function decodeEditSessionFileContent(version, content) {
    switch (version) {
        case 1:
            return VSBuffer.fromString(content);
        case 2:
            return decodeBase64(content);
        default:
            throw new Error('Upgrade to a newer version to decode this content.');
    }
}
export function hashedEditSessionId(editSessionId) {
    const sha1 = new StringSHA1();
    sha1.update(editSessionId);
    return sha1.digest();
}
export const editSessionsLogId = 'editSessions';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdFNlc3Npb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZWRpdFNlc3Npb25zL2NvbW1vbi9lZGl0U2Vzc2lvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUV4RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDcEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRTVGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUdoRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFHNUQsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsU0FBUyxDQUFDLGVBQWUsRUFBRSxlQUFlLENBQUMsQ0FBQTtBQUlyRixNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBRyxlQUFlLENBQ3pELDZCQUE2QixDQUM3QixDQUFBO0FBMEJELE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUNuQyxlQUFlLENBQTBCLHlCQUF5QixDQUFDLENBQUE7QUFHcEUsTUFBTSxDQUFOLElBQVksVUFHWDtBQUhELFdBQVksVUFBVTtJQUNyQixtREFBWSxDQUFBO0lBQ1osbURBQVksQ0FBQTtBQUNiLENBQUMsRUFIVyxVQUFVLEtBQVYsVUFBVSxRQUdyQjtBQUVELE1BQU0sQ0FBTixJQUFZLFFBRVg7QUFGRCxXQUFZLFFBQVE7SUFDbkIsdUNBQVEsQ0FBQTtBQUNULENBQUMsRUFGVyxRQUFRLEtBQVIsUUFBUSxRQUVuQjtBQXlCRCxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxDQUFDLENBQUE7QUFTekMsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsc0JBQXNCLENBQUE7QUFDakUsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcsSUFBSSxhQUFhLENBQ3ZELDJCQUEyQixFQUMzQixLQUFLLENBQ0wsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLHFCQUFxQixDQUFBO0FBQzlELE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLElBQUksYUFBYSxDQUFVLHlCQUF5QixFQUFFLEtBQUssQ0FBQyxDQUFBO0FBRWpHLE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLDZCQUE2QixDQUFBO0FBQ3ZFLE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLG1DQUFtQyxDQUFBO0FBQzdFLE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFxQixTQUFTLENBQUMsZUFBZSxFQUFFLGVBQWUsQ0FBQyxDQUFBO0FBRWhHLE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLFlBQVksQ0FDbEQseUJBQXlCLEVBQ3pCLE9BQU8sQ0FBQyxhQUFhLEVBQ3JCLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxzQ0FBc0MsQ0FBQyxDQUN2RSxDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcsSUFBSSxhQUFhLENBQVUsc0JBQXNCLEVBQUUsS0FBSyxDQUFDLENBQUE7QUFFaEcsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsc0JBQXNCLENBQUE7QUFFMUQsTUFBTSxVQUFVLDRCQUE0QixDQUFDLE9BQWUsRUFBRSxPQUFlO0lBQzVFLFFBQVEsT0FBTyxFQUFFLENBQUM7UUFDakIsS0FBSyxDQUFDO1lBQ0wsT0FBTyxRQUFRLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3BDLEtBQUssQ0FBQztZQUNMLE9BQU8sWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQzdCO1lBQ0MsTUFBTSxJQUFJLEtBQUssQ0FBQyxvREFBb0QsQ0FBQyxDQUFBO0lBQ3ZFLENBQUM7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLG1CQUFtQixDQUFDLGFBQXFCO0lBQ3hELE1BQU0sSUFBSSxHQUFHLElBQUksVUFBVSxFQUFFLENBQUE7SUFDN0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQTtJQUMxQixPQUFPLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtBQUNyQixDQUFDO0FBRUQsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsY0FBYyxDQUFBIn0=