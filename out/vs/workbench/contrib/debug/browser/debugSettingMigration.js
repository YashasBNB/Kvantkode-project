/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions } from '../../../common/configuration.js';
Registry.as(Extensions.ConfigurationMigration).registerConfigurationMigrations([
    {
        key: 'debug.autoExpandLazyVariables',
        migrateFn: (value) => {
            if (value === true) {
                return { value: 'on' };
            }
            else if (value === false) {
                return { value: 'off' };
            }
            return [];
        },
    },
]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdTZXR0aW5nTWlncmF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9kZWJ1Z1NldHRpbmdNaWdyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxVQUFVLEVBQW1DLE1BQU0sa0NBQWtDLENBQUE7QUFFOUYsUUFBUSxDQUFDLEVBQUUsQ0FDVixVQUFVLENBQUMsc0JBQXNCLENBQ2pDLENBQUMsK0JBQStCLENBQUM7SUFDakM7UUFDQyxHQUFHLEVBQUUsK0JBQStCO1FBQ3BDLFNBQVMsRUFBRSxDQUFDLEtBQWMsRUFBRSxFQUFFO1lBQzdCLElBQUksS0FBSyxLQUFLLElBQUksRUFBRSxDQUFDO2dCQUNwQixPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFBO1lBQ3ZCLENBQUM7aUJBQU0sSUFBSSxLQUFLLEtBQUssS0FBSyxFQUFFLENBQUM7Z0JBQzVCLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUE7WUFDeEIsQ0FBQztZQUVELE9BQU8sRUFBRSxDQUFBO1FBQ1YsQ0FBQztLQUNEO0NBQ0QsQ0FBQyxDQUFBIn0=