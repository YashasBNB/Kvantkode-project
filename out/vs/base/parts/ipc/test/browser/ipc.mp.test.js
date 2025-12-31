/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Client as MessagePortClient } from '../../browser/ipc.mp.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../test/common/utils.js';
suite('IPC, MessagePorts', () => {
    test('message passing', async () => {
        const { port1, port2 } = new MessageChannel();
        const client1 = new MessagePortClient(port1, 'client1');
        const client2 = new MessagePortClient(port2, 'client2');
        client1.registerChannel('client1', {
            call(_, command, arg, cancellationToken) {
                switch (command) {
                    case 'testMethodClient1':
                        return Promise.resolve('success1');
                    default:
                        return Promise.reject(new Error('not implemented'));
                }
            },
            listen(_, event, arg) {
                switch (event) {
                    default:
                        throw new Error('not implemented');
                }
            },
        });
        client2.registerChannel('client2', {
            call(_, command, arg, cancellationToken) {
                switch (command) {
                    case 'testMethodClient2':
                        return Promise.resolve('success2');
                    default:
                        return Promise.reject(new Error('not implemented'));
                }
            },
            listen(_, event, arg) {
                switch (event) {
                    default:
                        throw new Error('not implemented');
                }
            },
        });
        const channelClient1 = client2.getChannel('client1');
        assert.strictEqual(await channelClient1.call('testMethodClient1'), 'success1');
        const channelClient2 = client1.getChannel('client2');
        assert.strictEqual(await channelClient2.call('testMethodClient2'), 'success2');
        client1.dispose();
        client2.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLm1wLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3BhcnRzL2lwYy90ZXN0L2Jyb3dzZXIvaXBjLm1wLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBRzNCLE9BQU8sRUFBRSxNQUFNLElBQUksaUJBQWlCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUUxRixLQUFLLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO0lBQy9CLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNsQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksY0FBYyxFQUFFLENBQUE7UUFFN0MsTUFBTSxPQUFPLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDdkQsTUFBTSxPQUFPLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFdkQsT0FBTyxDQUFDLGVBQWUsQ0FBQyxTQUFTLEVBQUU7WUFDbEMsSUFBSSxDQUNILENBQVUsRUFDVixPQUFlLEVBQ2YsR0FBUSxFQUNSLGlCQUFvQztnQkFFcEMsUUFBUSxPQUFPLEVBQUUsQ0FBQztvQkFDakIsS0FBSyxtQkFBbUI7d0JBQ3ZCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQTtvQkFDbkM7d0JBQ0MsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQTtnQkFDckQsQ0FBQztZQUNGLENBQUM7WUFFRCxNQUFNLENBQUMsQ0FBVSxFQUFFLEtBQWEsRUFBRSxHQUFTO2dCQUMxQyxRQUFRLEtBQUssRUFBRSxDQUFDO29CQUNmO3dCQUNDLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtnQkFDcEMsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDLENBQUE7UUFFRixPQUFPLENBQUMsZUFBZSxDQUFDLFNBQVMsRUFBRTtZQUNsQyxJQUFJLENBQ0gsQ0FBVSxFQUNWLE9BQWUsRUFDZixHQUFRLEVBQ1IsaUJBQW9DO2dCQUVwQyxRQUFRLE9BQU8sRUFBRSxDQUFDO29CQUNqQixLQUFLLG1CQUFtQjt3QkFDdkIsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFBO29CQUNuQzt3QkFDQyxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFBO2dCQUNyRCxDQUFDO1lBQ0YsQ0FBQztZQUVELE1BQU0sQ0FBQyxDQUFVLEVBQUUsS0FBYSxFQUFFLEdBQVM7Z0JBQzFDLFFBQVEsS0FBSyxFQUFFLENBQUM7b0JBQ2Y7d0JBQ0MsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO2dCQUNwQyxDQUFDO1lBQ0YsQ0FBQztTQUNELENBQUMsQ0FBQTtRQUVGLE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLGNBQWMsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUU5RSxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxjQUFjLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFFOUUsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2pCLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNsQixDQUFDLENBQUMsQ0FBQTtJQUVGLHVDQUF1QyxFQUFFLENBQUE7QUFDMUMsQ0FBQyxDQUFDLENBQUEifQ==