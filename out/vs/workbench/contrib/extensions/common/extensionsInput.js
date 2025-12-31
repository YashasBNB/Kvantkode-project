/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { join } from '../../../../base/common/path.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
const ExtensionEditorIcon = registerIcon('extensions-editor-label-icon', Codicon.extensions, localize('extensionsEditorLabelIcon', 'Icon of the extensions editor label.'));
export class ExtensionsInput extends EditorInput {
    static { this.ID = 'workbench.extensions.input2'; }
    get typeId() {
        return ExtensionsInput.ID;
    }
    get capabilities() {
        return 2 /* EditorInputCapabilities.Readonly */ | 8 /* EditorInputCapabilities.Singleton */;
    }
    get resource() {
        return URI.from({
            scheme: Schemas.extension,
            path: join(this._extension.identifier.id, 'extension'),
        });
    }
    constructor(_extension) {
        super();
        this._extension = _extension;
    }
    get extension() {
        return this._extension;
    }
    getName() {
        return localize('extensionsInputName', 'Extension: {0}', this._extension.displayName);
    }
    getIcon() {
        return ExtensionEditorIcon;
    }
    matches(other) {
        if (super.matches(other)) {
            return true;
        }
        return (other instanceof ExtensionsInput &&
            areSameExtensions(this._extension.identifier, other._extension.identifier));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc0lucHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9jb21tb24vZXh0ZW5zaW9uc0lucHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTdDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUVuRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQTtBQUM5RyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFHdEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUVoRixNQUFNLG1CQUFtQixHQUFHLFlBQVksQ0FDdkMsOEJBQThCLEVBQzlCLE9BQU8sQ0FBQyxVQUFVLEVBQ2xCLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSxzQ0FBc0MsQ0FBQyxDQUM3RSxDQUFBO0FBU0QsTUFBTSxPQUFPLGVBQWdCLFNBQVEsV0FBVzthQUMvQixPQUFFLEdBQUcsNkJBQTZCLENBQUE7SUFFbEQsSUFBYSxNQUFNO1FBQ2xCLE9BQU8sZUFBZSxDQUFDLEVBQUUsQ0FBQTtJQUMxQixDQUFDO0lBRUQsSUFBYSxZQUFZO1FBQ3hCLE9BQU8sb0ZBQW9FLENBQUE7SUFDNUUsQ0FBQztJQUVELElBQWEsUUFBUTtRQUNwQixPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUM7WUFDZixNQUFNLEVBQUUsT0FBTyxDQUFDLFNBQVM7WUFDekIsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUUsV0FBVyxDQUFDO1NBQ3RELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxZQUFvQixVQUFzQjtRQUN6QyxLQUFLLEVBQUUsQ0FBQTtRQURZLGVBQVUsR0FBVixVQUFVLENBQVk7SUFFMUMsQ0FBQztJQUVELElBQUksU0FBUztRQUNaLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQTtJQUN2QixDQUFDO0lBRVEsT0FBTztRQUNmLE9BQU8sUUFBUSxDQUFDLHFCQUFxQixFQUFFLGdCQUFnQixFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDdEYsQ0FBQztJQUVRLE9BQU87UUFDZixPQUFPLG1CQUFtQixDQUFBO0lBQzNCLENBQUM7SUFFUSxPQUFPLENBQUMsS0FBd0M7UUFDeEQsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDMUIsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsT0FBTyxDQUNOLEtBQUssWUFBWSxlQUFlO1lBQ2hDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQzFFLENBQUE7SUFDRixDQUFDIn0=