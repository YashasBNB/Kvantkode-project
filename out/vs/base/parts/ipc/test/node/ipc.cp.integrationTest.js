/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Event } from '../../../../common/event.js';
import { Client } from '../../node/ipc.cp.js';
import { TestServiceClient } from './testService.js';
import { FileAccess } from '../../../../common/network.js';
function createClient() {
    return new Client(FileAccess.asFileUri('bootstrap-fork').fsPath, {
        serverName: 'TestServer',
        env: { VSCODE_ESM_ENTRYPOINT: 'vs/base/parts/ipc/test/node/testApp', verbose: true },
    });
}
suite('IPC, Child Process', function () {
    this.slow(2000);
    this.timeout(10000);
    let client;
    let channel;
    let service;
    setup(() => {
        client = createClient();
        channel = client.getChannel('test');
        service = new TestServiceClient(channel);
    });
    teardown(() => {
        client.dispose();
    });
    test('createChannel', async () => {
        const result = await service.pong('ping');
        assert.strictEqual(result.incoming, 'ping');
        assert.strictEqual(result.outgoing, 'pong');
    });
    test('events', async () => {
        const event = Event.toPromise(Event.once(service.onMarco));
        const promise = service.marco();
        const [promiseResult, eventResult] = await Promise.all([promise, event]);
        assert.strictEqual(promiseResult, 'polo');
        assert.strictEqual(eventResult.answer, 'polo');
    });
    test('event dispose', async () => {
        let count = 0;
        const disposable = service.onMarco(() => count++);
        const answer = await service.marco();
        assert.strictEqual(answer, 'polo');
        assert.strictEqual(count, 1);
        const answer_1 = await service.marco();
        assert.strictEqual(answer_1, 'polo');
        assert.strictEqual(count, 2);
        disposable.dispose();
        const answer_2 = await service.marco();
        assert.strictEqual(answer_2, 'polo');
        assert.strictEqual(count, 2);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLmNwLmludGVncmF0aW9uVGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvcGFydHMvaXBjL3Rlc3Qvbm9kZS9pcGMuY3AuaW50ZWdyYXRpb25UZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFbkQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQzdDLE9BQU8sRUFBZ0IsaUJBQWlCLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFMUQsU0FBUyxZQUFZO0lBQ3BCLE9BQU8sSUFBSSxNQUFNLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLE1BQU0sRUFBRTtRQUNoRSxVQUFVLEVBQUUsWUFBWTtRQUN4QixHQUFHLEVBQUUsRUFBRSxxQkFBcUIsRUFBRSxxQ0FBcUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO0tBQ3BGLENBQUMsQ0FBQTtBQUNILENBQUM7QUFFRCxLQUFLLENBQUMsb0JBQW9CLEVBQUU7SUFDM0IsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNmLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7SUFFbkIsSUFBSSxNQUFjLENBQUE7SUFDbEIsSUFBSSxPQUFpQixDQUFBO0lBQ3JCLElBQUksT0FBcUIsQ0FBQTtJQUV6QixLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsTUFBTSxHQUFHLFlBQVksRUFBRSxDQUFBO1FBQ3ZCLE9BQU8sR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ25DLE9BQU8sR0FBRyxJQUFJLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ3pDLENBQUMsQ0FBQyxDQUFBO0lBRUYsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNqQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxlQUFlLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDaEMsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDNUMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsUUFBUSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3pCLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUMxRCxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUE7UUFFL0IsTUFBTSxDQUFDLGFBQWEsRUFBRSxXQUFXLENBQUMsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUV4RSxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUN6QyxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDL0MsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsZUFBZSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2hDLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQTtRQUNiLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUVqRCxNQUFNLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUNwQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNsQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUU1QixNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM1QixVQUFVLENBQUMsT0FBTyxFQUFFLENBQUE7UUFFcEIsTUFBTSxRQUFRLEdBQUcsTUFBTSxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDN0IsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9