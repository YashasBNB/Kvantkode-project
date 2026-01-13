/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorSettingMigration, } from '../../../../editor/browser/config/migrateOptions.js';
import { Extensions, } from '../../../common/configuration.js';
Registry.as(Extensions.ConfigurationMigration).registerConfigurationMigrations(EditorSettingMigration.items.map((item) => ({
    key: `editor.${item.key}`,
    migrateFn: (value, accessor) => {
        const configurationKeyValuePairs = [];
        const writer = (key, value) => configurationKeyValuePairs.push([`editor.${key}`, { value }]);
        item.migrate(value, (key) => accessor(`editor.${key}`), writer);
        return configurationKeyValuePairs;
    },
})));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yU2V0dGluZ3NNaWdyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVFZGl0b3IvYnJvd3Nlci9lZGl0b3JTZXR0aW5nc01pZ3JhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUNOLHNCQUFzQixHQUV0QixNQUFNLHFEQUFxRCxDQUFBO0FBQzVELE9BQU8sRUFFTixVQUFVLEdBRVYsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV6QyxRQUFRLENBQUMsRUFBRSxDQUNWLFVBQVUsQ0FBQyxzQkFBc0IsQ0FDakMsQ0FBQywrQkFBK0IsQ0FDaEMsc0JBQXNCLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztJQUMzQyxHQUFHLEVBQUUsVUFBVSxJQUFJLENBQUMsR0FBRyxFQUFFO0lBQ3pCLFNBQVMsRUFBRSxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsRUFBRTtRQUM5QixNQUFNLDBCQUEwQixHQUErQixFQUFFLENBQUE7UUFDakUsTUFBTSxNQUFNLEdBQW9CLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQzlDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsR0FBRyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDOUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDL0QsT0FBTywwQkFBMEIsQ0FBQTtJQUNsQyxDQUFDO0NBQ0QsQ0FBQyxDQUFDLENBQ0gsQ0FBQSJ9