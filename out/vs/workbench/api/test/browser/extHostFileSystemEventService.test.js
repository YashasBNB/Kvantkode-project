/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ExtHostFileSystemEventService } from '../../common/extHostFileSystemEventService.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('ExtHostFileSystemEventService', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('FileSystemWatcher ignore events properties are reversed #26851', function () {
        const protocol = {
            getProxy: () => {
                return undefined;
            },
            set: undefined,
            dispose: undefined,
            assertRegistered: undefined,
            drain: undefined,
        };
        const watcher1 = new ExtHostFileSystemEventService(protocol, new NullLogService(), undefined).createFileSystemWatcher(undefined, undefined, undefined, '**/somethingInteresting', {});
        assert.strictEqual(watcher1.ignoreChangeEvents, false);
        assert.strictEqual(watcher1.ignoreCreateEvents, false);
        assert.strictEqual(watcher1.ignoreDeleteEvents, false);
        watcher1.dispose();
        const watcher2 = new ExtHostFileSystemEventService(protocol, new NullLogService(), undefined).createFileSystemWatcher(undefined, undefined, undefined, '**/somethingBoring', {
            ignoreCreateEvents: true,
            ignoreChangeEvents: true,
            ignoreDeleteEvents: true,
        });
        assert.strictEqual(watcher2.ignoreChangeEvents, true);
        assert.strictEqual(watcher2.ignoreCreateEvents, true);
        assert.strictEqual(watcher2.ignoreDeleteEvents, true);
        watcher2.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEZpbGVTeXN0ZW1FdmVudFNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL2V4dEhvc3RGaWxlU3lzdGVtRXZlbnRTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBRTdGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRixLQUFLLENBQUMsK0JBQStCLEVBQUUsR0FBRyxFQUFFO0lBQzNDLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLGdFQUFnRSxFQUFFO1FBQ3RFLE1BQU0sUUFBUSxHQUFpQjtZQUM5QixRQUFRLEVBQUUsR0FBRyxFQUFFO2dCQUNkLE9BQU8sU0FBVSxDQUFBO1lBQ2xCLENBQUM7WUFDRCxHQUFHLEVBQUUsU0FBVTtZQUNmLE9BQU8sRUFBRSxTQUFVO1lBQ25CLGdCQUFnQixFQUFFLFNBQVU7WUFDNUIsS0FBSyxFQUFFLFNBQVU7U0FDakIsQ0FBQTtRQUVELE1BQU0sUUFBUSxHQUFHLElBQUksNkJBQTZCLENBQ2pELFFBQVEsRUFDUixJQUFJLGNBQWMsRUFBRSxFQUNwQixTQUFVLENBQ1YsQ0FBQyx1QkFBdUIsQ0FBQyxTQUFVLEVBQUUsU0FBVSxFQUFFLFNBQVUsRUFBRSx5QkFBeUIsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUM1RixNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN0RCxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUE7UUFFbEIsTUFBTSxRQUFRLEdBQUcsSUFBSSw2QkFBNkIsQ0FDakQsUUFBUSxFQUNSLElBQUksY0FBYyxFQUFFLEVBQ3BCLFNBQVUsQ0FDVixDQUFDLHVCQUF1QixDQUFDLFNBQVUsRUFBRSxTQUFVLEVBQUUsU0FBVSxFQUFFLG9CQUFvQixFQUFFO1lBQ25GLGtCQUFrQixFQUFFLElBQUk7WUFDeEIsa0JBQWtCLEVBQUUsSUFBSTtZQUN4QixrQkFBa0IsRUFBRSxJQUFJO1NBQ3hCLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3JELFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNuQixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=