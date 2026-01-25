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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdTZXR0aW5nTWlncmF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL2RlYnVnU2V0dGluZ01pZ3JhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUFFLFVBQVUsRUFBbUMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUU5RixRQUFRLENBQUMsRUFBRSxDQUNWLFVBQVUsQ0FBQyxzQkFBc0IsQ0FDakMsQ0FBQywrQkFBK0IsQ0FBQztJQUNqQztRQUNDLEdBQUcsRUFBRSwrQkFBK0I7UUFDcEMsU0FBUyxFQUFFLENBQUMsS0FBYyxFQUFFLEVBQUU7WUFDN0IsSUFBSSxLQUFLLEtBQUssSUFBSSxFQUFFLENBQUM7Z0JBQ3BCLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUE7WUFDdkIsQ0FBQztpQkFBTSxJQUFJLEtBQUssS0FBSyxLQUFLLEVBQUUsQ0FBQztnQkFDNUIsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQTtZQUN4QixDQUFDO1lBRUQsT0FBTyxFQUFFLENBQUE7UUFDVixDQUFDO0tBQ0Q7Q0FDRCxDQUFDLENBQUEifQ==