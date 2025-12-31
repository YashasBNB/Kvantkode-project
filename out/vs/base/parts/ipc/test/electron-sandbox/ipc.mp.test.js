/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Client as MessagePortClient } from '../../browser/ipc.mp.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../test/common/utils.js';
suite('IPC, MessagePorts', () => {
    test('message port close event', async () => {
        const { port1, port2 } = new MessageChannel();
        const client1 = new MessagePortClient(port1, 'client1');
        const client2 = new MessagePortClient(port2, 'client2');
        // This test ensures that Electron's API for the close event
        // does not break because we rely on it to dispose client
        // connections from the server.
        //
        // This event is not provided by browser MessagePort API though.
        const whenClosed = new Promise((resolve) => port1.addEventListener('close', () => resolve(true)));
        client2.dispose();
        assert.ok(await whenClosed);
        client1.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLm1wLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3BhcnRzL2lwYy90ZXN0L2VsZWN0cm9uLXNhbmRib3gvaXBjLm1wLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxNQUFNLElBQUksaUJBQWlCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUUxRixLQUFLLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO0lBQy9CLElBQUksQ0FBQywwQkFBMEIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMzQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksY0FBYyxFQUFFLENBQUE7UUFFN0MsTUFBTSxPQUFPLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDdkQsTUFBTSxPQUFPLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFdkQsNERBQTREO1FBQzVELHlEQUF5RDtRQUN6RCwrQkFBK0I7UUFDL0IsRUFBRTtRQUNGLGdFQUFnRTtRQUNoRSxNQUFNLFVBQVUsR0FBRyxJQUFJLE9BQU8sQ0FBVSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQ25ELEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQ3BELENBQUE7UUFFRCxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUE7UUFFakIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLFVBQVUsQ0FBQyxDQUFBO1FBRTNCLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNsQixDQUFDLENBQUMsQ0FBQTtJQUVGLHVDQUF1QyxFQUFFLENBQUE7QUFDMUMsQ0FBQyxDQUFDLENBQUEifQ==