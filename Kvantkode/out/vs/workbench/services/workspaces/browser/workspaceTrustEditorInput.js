/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
const WorkspaceTrustEditorIcon = registerIcon('workspace-trust-editor-label-icon', Codicon.shield, localize('workspaceTrustEditorLabelIcon', 'Icon of the workspace trust editor label.'));
export class WorkspaceTrustEditorInput extends EditorInput {
    constructor() {
        super(...arguments);
        this.resource = URI.from({
            scheme: Schemas.vscodeWorkspaceTrust,
            path: `workspaceTrustEditor`,
        });
    }
    static { this.ID = 'workbench.input.workspaceTrust'; }
    get capabilities() {
        return 2 /* EditorInputCapabilities.Readonly */ | 8 /* EditorInputCapabilities.Singleton */;
    }
    get typeId() {
        return WorkspaceTrustEditorInput.ID;
    }
    matches(otherInput) {
        return super.matches(otherInput) || otherInput instanceof WorkspaceTrustEditorInput;
    }
    getName() {
        return localize('workspaceTrustEditorInputName', 'Workspace Trust');
    }
    getIcon() {
        return WorkspaceTrustEditorIcon;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlVHJ1c3RFZGl0b3JJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3dvcmtzcGFjZXMvYnJvd3Nlci93b3Jrc3BhY2VUcnVzdEVkaXRvcklucHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFNUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFaEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRW5FLE1BQU0sd0JBQXdCLEdBQUcsWUFBWSxDQUM1QyxtQ0FBbUMsRUFDbkMsT0FBTyxDQUFDLE1BQU0sRUFDZCxRQUFRLENBQUMsK0JBQStCLEVBQUUsMkNBQTJDLENBQUMsQ0FDdEYsQ0FBQTtBQUVELE1BQU0sT0FBTyx5QkFBMEIsU0FBUSxXQUFXO0lBQTFEOztRQVdVLGFBQVEsR0FBUSxHQUFHLENBQUMsSUFBSSxDQUFDO1lBQ2pDLE1BQU0sRUFBRSxPQUFPLENBQUMsb0JBQW9CO1lBQ3BDLElBQUksRUFBRSxzQkFBc0I7U0FDNUIsQ0FBQyxDQUFBO0lBYUgsQ0FBQzthQTFCZ0IsT0FBRSxHQUFXLGdDQUFnQyxBQUEzQyxDQUEyQztJQUU3RCxJQUFhLFlBQVk7UUFDeEIsT0FBTyxvRkFBb0UsQ0FBQTtJQUM1RSxDQUFDO0lBRUQsSUFBYSxNQUFNO1FBQ2xCLE9BQU8seUJBQXlCLENBQUMsRUFBRSxDQUFBO0lBQ3BDLENBQUM7SUFPUSxPQUFPLENBQUMsVUFBNkM7UUFDN0QsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLFVBQVUsWUFBWSx5QkFBeUIsQ0FBQTtJQUNwRixDQUFDO0lBRVEsT0FBTztRQUNmLE9BQU8sUUFBUSxDQUFDLCtCQUErQixFQUFFLGlCQUFpQixDQUFDLENBQUE7SUFDcEUsQ0FBQztJQUVRLE9BQU87UUFDZixPQUFPLHdCQUF3QixDQUFBO0lBQ2hDLENBQUMifQ==