/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { URI } from '../../../../base/common/uri.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
const RuntimeExtensionsEditorIcon = registerIcon('runtime-extensions-editor-label-icon', Codicon.extensions, nls.localize('runtimeExtensionEditorLabelIcon', 'Icon of the runtime extensions editor label.'));
export class RuntimeExtensionsInput extends EditorInput {
    constructor() {
        super(...arguments);
        this.resource = URI.from({
            scheme: 'runtime-extensions',
            path: 'default',
        });
    }
    static { this.ID = 'workbench.runtimeExtensions.input'; }
    get typeId() {
        return RuntimeExtensionsInput.ID;
    }
    get capabilities() {
        return 2 /* EditorInputCapabilities.Readonly */ | 8 /* EditorInputCapabilities.Singleton */;
    }
    static get instance() {
        if (!RuntimeExtensionsInput._instance || RuntimeExtensionsInput._instance.isDisposed()) {
            RuntimeExtensionsInput._instance = new RuntimeExtensionsInput();
        }
        return RuntimeExtensionsInput._instance;
    }
    getName() {
        return nls.localize('extensionsInputName', 'Running Extensions');
    }
    getIcon() {
        return RuntimeExtensionsEditorIcon;
    }
    matches(other) {
        if (super.matches(other)) {
            return true;
        }
        return other instanceof RuntimeExtensionsInput;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVudGltZUV4dGVuc2lvbnNJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9jb21tb24vcnVudGltZUV4dGVuc2lvbnNJbnB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUVwRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFbkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUVoRixNQUFNLDJCQUEyQixHQUFHLFlBQVksQ0FDL0Msc0NBQXNDLEVBQ3RDLE9BQU8sQ0FBQyxVQUFVLEVBQ2xCLEdBQUcsQ0FBQyxRQUFRLENBQUMsaUNBQWlDLEVBQUUsOENBQThDLENBQUMsQ0FDL0YsQ0FBQTtBQUVELE1BQU0sT0FBTyxzQkFBdUIsU0FBUSxXQUFXO0lBQXZEOztRQW9CVSxhQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQztZQUM1QixNQUFNLEVBQUUsb0JBQW9CO1lBQzVCLElBQUksRUFBRSxTQUFTO1NBQ2YsQ0FBQyxDQUFBO0lBZ0JILENBQUM7YUF0Q2dCLE9BQUUsR0FBRyxtQ0FBbUMsQUFBdEMsQ0FBc0M7SUFFeEQsSUFBYSxNQUFNO1FBQ2xCLE9BQU8sc0JBQXNCLENBQUMsRUFBRSxDQUFBO0lBQ2pDLENBQUM7SUFFRCxJQUFhLFlBQVk7UUFDeEIsT0FBTyxvRkFBb0UsQ0FBQTtJQUM1RSxDQUFDO0lBR0QsTUFBTSxLQUFLLFFBQVE7UUFDbEIsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFNBQVMsSUFBSSxzQkFBc0IsQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQztZQUN4RixzQkFBc0IsQ0FBQyxTQUFTLEdBQUcsSUFBSSxzQkFBc0IsRUFBRSxDQUFBO1FBQ2hFLENBQUM7UUFFRCxPQUFPLHNCQUFzQixDQUFDLFNBQVMsQ0FBQTtJQUN4QyxDQUFDO0lBT1EsT0FBTztRQUNmLE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO0lBQ2pFLENBQUM7SUFFUSxPQUFPO1FBQ2YsT0FBTywyQkFBMkIsQ0FBQTtJQUNuQyxDQUFDO0lBRVEsT0FBTyxDQUFDLEtBQXdDO1FBQ3hELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzFCLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELE9BQU8sS0FBSyxZQUFZLHNCQUFzQixDQUFBO0lBQy9DLENBQUMifQ==