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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlVHJ1c3RFZGl0b3JJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3Jrc3BhY2VzL2Jyb3dzZXIvd29ya3NwYWNlVHJ1c3RFZGl0b3JJbnB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRTVELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRWhGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUVuRSxNQUFNLHdCQUF3QixHQUFHLFlBQVksQ0FDNUMsbUNBQW1DLEVBQ25DLE9BQU8sQ0FBQyxNQUFNLEVBQ2QsUUFBUSxDQUFDLCtCQUErQixFQUFFLDJDQUEyQyxDQUFDLENBQ3RGLENBQUE7QUFFRCxNQUFNLE9BQU8seUJBQTBCLFNBQVEsV0FBVztJQUExRDs7UUFXVSxhQUFRLEdBQVEsR0FBRyxDQUFDLElBQUksQ0FBQztZQUNqQyxNQUFNLEVBQUUsT0FBTyxDQUFDLG9CQUFvQjtZQUNwQyxJQUFJLEVBQUUsc0JBQXNCO1NBQzVCLENBQUMsQ0FBQTtJQWFILENBQUM7YUExQmdCLE9BQUUsR0FBVyxnQ0FBZ0MsQUFBM0MsQ0FBMkM7SUFFN0QsSUFBYSxZQUFZO1FBQ3hCLE9BQU8sb0ZBQW9FLENBQUE7SUFDNUUsQ0FBQztJQUVELElBQWEsTUFBTTtRQUNsQixPQUFPLHlCQUF5QixDQUFDLEVBQUUsQ0FBQTtJQUNwQyxDQUFDO0lBT1EsT0FBTyxDQUFDLFVBQTZDO1FBQzdELE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxVQUFVLFlBQVkseUJBQXlCLENBQUE7SUFDcEYsQ0FBQztJQUVRLE9BQU87UUFDZixPQUFPLFFBQVEsQ0FBQywrQkFBK0IsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO0lBQ3BFLENBQUM7SUFFUSxPQUFPO1FBQ2YsT0FBTyx3QkFBd0IsQ0FBQTtJQUNoQyxDQUFDIn0=