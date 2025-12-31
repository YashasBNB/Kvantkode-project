/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AbstractRuntimeExtensionsEditor, } from './abstractRuntimeExtensionsEditor.js';
import { ReportExtensionIssueAction } from '../common/reportExtensionIssueAction.js';
export class RuntimeExtensionsEditor extends AbstractRuntimeExtensionsEditor {
    _getProfileInfo() {
        return null;
    }
    _getUnresponsiveProfile(extensionId) {
        return undefined;
    }
    _createSlowExtensionAction(element) {
        return null;
    }
    _createReportExtensionIssueAction(element) {
        if (element.marketplaceInfo) {
            return this._instantiationService.createInstance(ReportExtensionIssueAction, element.description);
        }
        return null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3NlclJ1bnRpbWVFeHRlbnNpb25zRWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9icm93c2VyL2Jyb3dzZXJSdW50aW1lRXh0ZW5zaW9uc0VkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUtoRyxPQUFPLEVBQ04sK0JBQStCLEdBRS9CLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFcEYsTUFBTSxPQUFPLHVCQUF3QixTQUFRLCtCQUErQjtJQUNqRSxlQUFlO1FBQ3hCLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVTLHVCQUF1QixDQUNoQyxXQUFnQztRQUVoQyxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRVMsMEJBQTBCLENBQUMsT0FBMEI7UUFDOUQsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRVMsaUNBQWlDLENBQUMsT0FBMEI7UUFDckUsSUFBSSxPQUFPLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDN0IsT0FBTyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUMvQywwQkFBMEIsRUFDMUIsT0FBTyxDQUFDLFdBQVcsQ0FDbkIsQ0FBQTtRQUNGLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7Q0FDRCJ9