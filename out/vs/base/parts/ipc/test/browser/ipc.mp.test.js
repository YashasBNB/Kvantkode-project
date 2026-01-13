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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLm1wLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvcGFydHMvaXBjL3Rlc3QvYnJvd3Nlci9pcGMubXAudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFHM0IsT0FBTyxFQUFFLE1BQU0sSUFBSSxpQkFBaUIsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3JFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTFGLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7SUFDL0IsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2xDLE1BQU0sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEdBQUcsSUFBSSxjQUFjLEVBQUUsQ0FBQTtRQUU3QyxNQUFNLE9BQU8sR0FBRyxJQUFJLGlCQUFpQixDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUN2RCxNQUFNLE9BQU8sR0FBRyxJQUFJLGlCQUFpQixDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUV2RCxPQUFPLENBQUMsZUFBZSxDQUFDLFNBQVMsRUFBRTtZQUNsQyxJQUFJLENBQ0gsQ0FBVSxFQUNWLE9BQWUsRUFDZixHQUFRLEVBQ1IsaUJBQW9DO2dCQUVwQyxRQUFRLE9BQU8sRUFBRSxDQUFDO29CQUNqQixLQUFLLG1CQUFtQjt3QkFDdkIsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFBO29CQUNuQzt3QkFDQyxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFBO2dCQUNyRCxDQUFDO1lBQ0YsQ0FBQztZQUVELE1BQU0sQ0FBQyxDQUFVLEVBQUUsS0FBYSxFQUFFLEdBQVM7Z0JBQzFDLFFBQVEsS0FBSyxFQUFFLENBQUM7b0JBQ2Y7d0JBQ0MsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO2dCQUNwQyxDQUFDO1lBQ0YsQ0FBQztTQUNELENBQUMsQ0FBQTtRQUVGLE9BQU8sQ0FBQyxlQUFlLENBQUMsU0FBUyxFQUFFO1lBQ2xDLElBQUksQ0FDSCxDQUFVLEVBQ1YsT0FBZSxFQUNmLEdBQVEsRUFDUixpQkFBb0M7Z0JBRXBDLFFBQVEsT0FBTyxFQUFFLENBQUM7b0JBQ2pCLEtBQUssbUJBQW1CO3dCQUN2QixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUE7b0JBQ25DO3dCQUNDLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUE7Z0JBQ3JELENBQUM7WUFDRixDQUFDO1lBRUQsTUFBTSxDQUFDLENBQVUsRUFBRSxLQUFhLEVBQUUsR0FBUztnQkFDMUMsUUFBUSxLQUFLLEVBQUUsQ0FBQztvQkFDZjt3QkFDQyxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7Z0JBQ3BDLENBQUM7WUFDRixDQUFDO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sY0FBYyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBRTlFLE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLGNBQWMsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUU5RSxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDakIsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2xCLENBQUMsQ0FBQyxDQUFBO0lBRUYsdUNBQXVDLEVBQUUsQ0FBQTtBQUMxQyxDQUFDLENBQUMsQ0FBQSJ9