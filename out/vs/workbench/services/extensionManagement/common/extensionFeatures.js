/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
export var Extensions;
(function (Extensions) {
    Extensions.ExtensionFeaturesRegistry = 'workbench.registry.extensionFeatures';
})(Extensions || (Extensions = {}));
export const IExtensionFeaturesManagementService = createDecorator('IExtensionFeaturesManagementService');
class ExtensionFeaturesRegistry {
    constructor() {
        this.extensionFeatures = new Map();
    }
    registerExtensionFeature(descriptor) {
        if (this.extensionFeatures.has(descriptor.id)) {
            throw new Error(`Extension feature with id '${descriptor.id}' already exists`);
        }
        this.extensionFeatures.set(descriptor.id, descriptor);
        return {
            dispose: () => this.extensionFeatures.delete(descriptor.id),
        };
    }
    getExtensionFeature(id) {
        return this.extensionFeatures.get(id);
    }
    getExtensionFeatures() {
        return Array.from(this.extensionFeatures.values());
    }
}
Registry.add(Extensions.ExtensionFeaturesRegistry, new ExtensionFeaturesRegistry());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uRmVhdHVyZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9uTWFuYWdlbWVudC9jb21tb24vZXh0ZW5zaW9uRmVhdHVyZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFRaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQVMzRSxNQUFNLEtBQVcsVUFBVSxDQUUxQjtBQUZELFdBQWlCLFVBQVU7SUFDYixvQ0FBeUIsR0FBRyxzQ0FBc0MsQ0FBQTtBQUNoRixDQUFDLEVBRmdCLFVBQVUsS0FBVixVQUFVLFFBRTFCO0FBd0VELE1BQU0sQ0FBQyxNQUFNLG1DQUFtQyxHQUMvQyxlQUFlLENBQXNDLHFDQUFxQyxDQUFDLENBQUE7QUF3QzVGLE1BQU0seUJBQXlCO0lBQS9CO1FBQ2tCLHNCQUFpQixHQUFHLElBQUksR0FBRyxFQUF1QyxDQUFBO0lBbUJwRixDQUFDO0lBakJBLHdCQUF3QixDQUFDLFVBQXVDO1FBQy9ELElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUMvQyxNQUFNLElBQUksS0FBSyxDQUFDLDhCQUE4QixVQUFVLENBQUMsRUFBRSxrQkFBa0IsQ0FBQyxDQUFBO1FBQy9FLENBQUM7UUFDRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDckQsT0FBTztZQUNOLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7U0FDM0QsQ0FBQTtJQUNGLENBQUM7SUFFRCxtQkFBbUIsQ0FBQyxFQUFVO1FBQzdCLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUN0QyxDQUFDO0lBRUQsb0JBQW9CO1FBQ25CLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQTtJQUNuRCxDQUFDO0NBQ0Q7QUFFRCxRQUFRLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyx5QkFBeUIsRUFBRSxJQUFJLHlCQUF5QixFQUFFLENBQUMsQ0FBQSJ9