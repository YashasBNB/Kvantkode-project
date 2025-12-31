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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yU2V0dGluZ3NNaWdyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb2RlRWRpdG9yL2Jyb3dzZXIvZWRpdG9yU2V0dGluZ3NNaWdyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFDTixzQkFBc0IsR0FFdEIsTUFBTSxxREFBcUQsQ0FBQTtBQUM1RCxPQUFPLEVBRU4sVUFBVSxHQUVWLE1BQU0sa0NBQWtDLENBQUE7QUFFekMsUUFBUSxDQUFDLEVBQUUsQ0FDVixVQUFVLENBQUMsc0JBQXNCLENBQ2pDLENBQUMsK0JBQStCLENBQ2hDLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDM0MsR0FBRyxFQUFFLFVBQVUsSUFBSSxDQUFDLEdBQUcsRUFBRTtJQUN6QixTQUFTLEVBQUUsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLEVBQUU7UUFDOUIsTUFBTSwwQkFBMEIsR0FBK0IsRUFBRSxDQUFBO1FBQ2pFLE1BQU0sTUFBTSxHQUFvQixDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUM5QywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxVQUFVLEdBQUcsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzlELElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQy9ELE9BQU8sMEJBQTBCLENBQUE7SUFDbEMsQ0FBQztDQUNELENBQUMsQ0FBQyxDQUNILENBQUEifQ==