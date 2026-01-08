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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc0lucHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2NvbW1vbi9leHRlbnNpb25zSW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFN0MsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRW5FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRFQUE0RSxDQUFBO0FBQzlHLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUd0RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRWhGLE1BQU0sbUJBQW1CLEdBQUcsWUFBWSxDQUN2Qyw4QkFBOEIsRUFDOUIsT0FBTyxDQUFDLFVBQVUsRUFDbEIsUUFBUSxDQUFDLDJCQUEyQixFQUFFLHNDQUFzQyxDQUFDLENBQzdFLENBQUE7QUFTRCxNQUFNLE9BQU8sZUFBZ0IsU0FBUSxXQUFXO2FBQy9CLE9BQUUsR0FBRyw2QkFBNkIsQ0FBQTtJQUVsRCxJQUFhLE1BQU07UUFDbEIsT0FBTyxlQUFlLENBQUMsRUFBRSxDQUFBO0lBQzFCLENBQUM7SUFFRCxJQUFhLFlBQVk7UUFDeEIsT0FBTyxvRkFBb0UsQ0FBQTtJQUM1RSxDQUFDO0lBRUQsSUFBYSxRQUFRO1FBQ3BCLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQztZQUNmLE1BQU0sRUFBRSxPQUFPLENBQUMsU0FBUztZQUN6QixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBRSxXQUFXLENBQUM7U0FDdEQsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELFlBQW9CLFVBQXNCO1FBQ3pDLEtBQUssRUFBRSxDQUFBO1FBRFksZUFBVSxHQUFWLFVBQVUsQ0FBWTtJQUUxQyxDQUFDO0lBRUQsSUFBSSxTQUFTO1FBQ1osT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFBO0lBQ3ZCLENBQUM7SUFFUSxPQUFPO1FBQ2YsT0FBTyxRQUFRLENBQUMscUJBQXFCLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUN0RixDQUFDO0lBRVEsT0FBTztRQUNmLE9BQU8sbUJBQW1CLENBQUE7SUFDM0IsQ0FBQztJQUVRLE9BQU8sQ0FBQyxLQUF3QztRQUN4RCxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMxQixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFRCxPQUFPLENBQ04sS0FBSyxZQUFZLGVBQWU7WUFDaEMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FDMUUsQ0FBQTtJQUNGLENBQUMifQ==