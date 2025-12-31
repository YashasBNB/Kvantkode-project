/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { timeout } from '../../../../common/async.js';
import { VSBuffer } from '../../../../common/buffer.js';
import { CancellationToken, CancellationTokenSource } from '../../../../common/cancellation.js';
import { canceled } from '../../../../common/errors.js';
import { Emitter, Event } from '../../../../common/event.js';
import { DisposableStore } from '../../../../common/lifecycle.js';
import { isEqual } from '../../../../common/resources.js';
import { URI } from '../../../../common/uri.js';
import { BufferReader, BufferWriter, deserialize, IPCClient, IPCServer, ProxyChannel, serialize, } from '../../common/ipc.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../test/common/utils.js';
class QueueProtocol {
    constructor() {
        this.buffering = true;
        this.buffers = [];
        this._onMessage = new Emitter({
            onDidAddFirstListener: () => {
                for (const buffer of this.buffers) {
                    this._onMessage.fire(buffer);
                }
                this.buffers = [];
                this.buffering = false;
            },
            onDidRemoveLastListener: () => {
                this.buffering = true;
            },
        });
        this.onMessage = this._onMessage.event;
    }
    send(buffer) {
        this.other.receive(buffer);
    }
    receive(buffer) {
        if (this.buffering) {
            this.buffers.push(buffer);
        }
        else {
            this._onMessage.fire(buffer);
        }
    }
}
function createProtocolPair() {
    const one = new QueueProtocol();
    const other = new QueueProtocol();
    one.other = other;
    other.other = one;
    return [one, other];
}
class TestIPCClient extends IPCClient {
    constructor(protocol, id) {
        super(protocol, id);
        this._onDidDisconnect = new Emitter();
        this.onDidDisconnect = this._onDidDisconnect.event;
    }
    dispose() {
        this._onDidDisconnect.fire();
        super.dispose();
    }
}
class TestIPCServer extends IPCServer {
    constructor() {
        const onDidClientConnect = new Emitter();
        super(onDidClientConnect.event);
        this.onDidClientConnect = onDidClientConnect;
    }
    createConnection(id) {
        const [pc, ps] = createProtocolPair();
        const client = new TestIPCClient(pc, id);
        this.onDidClientConnect.fire({
            protocol: ps,
            onDidClientDisconnect: client.onDidDisconnect,
        });
        return client;
    }
}
const TestChannelId = 'testchannel';
class TestService {
    constructor() {
        this.disposables = new DisposableStore();
        this._onPong = new Emitter();
        this.onPong = this._onPong.event;
    }
    marco() {
        return Promise.resolve('polo');
    }
    error(message) {
        return Promise.reject(new Error(message));
    }
    neverComplete() {
        return new Promise((_) => { });
    }
    neverCompleteCT(cancellationToken) {
        if (cancellationToken.isCancellationRequested) {
            return Promise.reject(canceled());
        }
        return new Promise((_, e) => this.disposables.add(cancellationToken.onCancellationRequested(() => e(canceled()))));
    }
    buffersLength(buffers) {
        return Promise.resolve(buffers.reduce((r, b) => r + b.buffer.length, 0));
    }
    ping(msg) {
        this._onPong.fire(msg);
    }
    marshall(uri) {
        return Promise.resolve(uri);
    }
    context(context) {
        return Promise.resolve(context);
    }
    dispose() {
        this.disposables.dispose();
    }
}
class TestChannel {
    constructor(service) {
        this.service = service;
    }
    call(_, command, arg, cancellationToken) {
        switch (command) {
            case 'marco':
                return this.service.marco();
            case 'error':
                return this.service.error(arg);
            case 'neverComplete':
                return this.service.neverComplete();
            case 'neverCompleteCT':
                return this.service.neverCompleteCT(cancellationToken);
            case 'buffersLength':
                return this.service.buffersLength(arg);
            default:
                return Promise.reject(new Error('not implemented'));
        }
    }
    listen(_, event, arg) {
        switch (event) {
            case 'onPong':
                return this.service.onPong;
            default:
                throw new Error('not implemented');
        }
    }
}
class TestChannelClient {
    get onPong() {
        return this.channel.listen('onPong');
    }
    constructor(channel) {
        this.channel = channel;
    }
    marco() {
        return this.channel.call('marco');
    }
    error(message) {
        return this.channel.call('error', message);
    }
    neverComplete() {
        return this.channel.call('neverComplete');
    }
    neverCompleteCT(cancellationToken) {
        return this.channel.call('neverCompleteCT', undefined, cancellationToken);
    }
    buffersLength(buffers) {
        return this.channel.call('buffersLength', buffers);
    }
    marshall(uri) {
        return this.channel.call('marshall', uri);
    }
    context() {
        return this.channel.call('context');
    }
}
suite('Base IPC', function () {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    test('createProtocolPair', async function () {
        const [clientProtocol, serverProtocol] = createProtocolPair();
        const b1 = VSBuffer.alloc(0);
        clientProtocol.send(b1);
        const b3 = VSBuffer.alloc(0);
        serverProtocol.send(b3);
        const b2 = await Event.toPromise(serverProtocol.onMessage);
        const b4 = await Event.toPromise(clientProtocol.onMessage);
        assert.strictEqual(b1, b2);
        assert.strictEqual(b3, b4);
    });
    suite('one to one', function () {
        let server;
        let client;
        let service;
        let ipcService;
        setup(function () {
            service = store.add(new TestService());
            const testServer = store.add(new TestIPCServer());
            server = testServer;
            server.registerChannel(TestChannelId, new TestChannel(service));
            client = store.add(testServer.createConnection('client1'));
            ipcService = new TestChannelClient(client.getChannel(TestChannelId));
        });
        test('call success', async function () {
            const r = await ipcService.marco();
            return assert.strictEqual(r, 'polo');
        });
        test('call error', async function () {
            try {
                await ipcService.error('nice error');
                return assert.fail('should not reach here');
            }
            catch (err) {
                return assert.strictEqual(err.message, 'nice error');
            }
        });
        test('cancel call with cancelled cancellation token', async function () {
            try {
                await ipcService.neverCompleteCT(CancellationToken.Cancelled);
                return assert.fail('should not reach here');
            }
            catch (err) {
                return assert(err.message === 'Canceled');
            }
        });
        test('cancel call with cancellation token (sync)', function () {
            const cts = new CancellationTokenSource();
            const promise = ipcService.neverCompleteCT(cts.token).then((_) => assert.fail('should not reach here'), (err) => assert(err.message === 'Canceled'));
            cts.cancel();
            return promise;
        });
        test('cancel call with cancellation token (async)', function () {
            const cts = new CancellationTokenSource();
            const promise = ipcService.neverCompleteCT(cts.token).then((_) => assert.fail('should not reach here'), (err) => assert(err.message === 'Canceled'));
            setTimeout(() => cts.cancel());
            return promise;
        });
        test('listen to events', async function () {
            const messages = [];
            store.add(ipcService.onPong((msg) => messages.push(msg)));
            await timeout(0);
            assert.deepStrictEqual(messages, []);
            service.ping('hello');
            await timeout(0);
            assert.deepStrictEqual(messages, ['hello']);
            service.ping('world');
            await timeout(0);
            assert.deepStrictEqual(messages, ['hello', 'world']);
        });
        test('buffers in arrays', async function () {
            const r = await ipcService.buffersLength([VSBuffer.alloc(2), VSBuffer.alloc(3)]);
            return assert.strictEqual(r, 5);
        });
        test('round trips numbers', () => {
            const input = [0, 1, -1, 12345, -12345, 42.6, 123412341234];
            const writer = new BufferWriter();
            serialize(writer, input);
            assert.deepStrictEqual(deserialize(new BufferReader(writer.buffer)), input);
        });
    });
    suite('one to one (proxy)', function () {
        let server;
        let client;
        let service;
        let ipcService;
        const disposables = new DisposableStore();
        setup(function () {
            service = store.add(new TestService());
            const testServer = disposables.add(new TestIPCServer());
            server = testServer;
            server.registerChannel(TestChannelId, ProxyChannel.fromService(service, disposables));
            client = disposables.add(testServer.createConnection('client1'));
            ipcService = ProxyChannel.toService(client.getChannel(TestChannelId));
        });
        teardown(function () {
            disposables.clear();
        });
        test('call success', async function () {
            const r = await ipcService.marco();
            return assert.strictEqual(r, 'polo');
        });
        test('call error', async function () {
            try {
                await ipcService.error('nice error');
                return assert.fail('should not reach here');
            }
            catch (err) {
                return assert.strictEqual(err.message, 'nice error');
            }
        });
        test('listen to events', async function () {
            const messages = [];
            disposables.add(ipcService.onPong((msg) => messages.push(msg)));
            await timeout(0);
            assert.deepStrictEqual(messages, []);
            service.ping('hello');
            await timeout(0);
            assert.deepStrictEqual(messages, ['hello']);
            service.ping('world');
            await timeout(0);
            assert.deepStrictEqual(messages, ['hello', 'world']);
        });
        test('marshalling uri', async function () {
            const uri = URI.file('foobar');
            const r = await ipcService.marshall(uri);
            assert.ok(r instanceof URI);
            return assert.ok(isEqual(r, uri));
        });
        test('buffers in arrays', async function () {
            const r = await ipcService.buffersLength([VSBuffer.alloc(2), VSBuffer.alloc(3)]);
            return assert.strictEqual(r, 5);
        });
    });
    suite('one to one (proxy, extra context)', function () {
        let server;
        let client;
        let service;
        let ipcService;
        const disposables = new DisposableStore();
        setup(function () {
            service = store.add(new TestService());
            const testServer = disposables.add(new TestIPCServer());
            server = testServer;
            server.registerChannel(TestChannelId, ProxyChannel.fromService(service, disposables));
            client = disposables.add(testServer.createConnection('client1'));
            ipcService = ProxyChannel.toService(client.getChannel(TestChannelId), {
                context: 'Super Context',
            });
        });
        teardown(function () {
            disposables.clear();
        });
        test('call extra context', async function () {
            const r = await ipcService.context();
            return assert.strictEqual(r, 'Super Context');
        });
    });
    suite('one to many', function () {
        test('all clients get pinged', async function () {
            const service = store.add(new TestService());
            const channel = new TestChannel(service);
            const server = store.add(new TestIPCServer());
            server.registerChannel('channel', channel);
            let client1GotPinged = false;
            const client1 = store.add(server.createConnection('client1'));
            const ipcService1 = new TestChannelClient(client1.getChannel('channel'));
            store.add(ipcService1.onPong(() => (client1GotPinged = true)));
            let client2GotPinged = false;
            const client2 = store.add(server.createConnection('client2'));
            const ipcService2 = new TestChannelClient(client2.getChannel('channel'));
            store.add(ipcService2.onPong(() => (client2GotPinged = true)));
            await timeout(1);
            service.ping('hello');
            await timeout(1);
            assert(client1GotPinged, 'client 1 got pinged');
            assert(client2GotPinged, 'client 2 got pinged');
        });
        test('server gets pings from all clients (broadcast channel)', async function () {
            const server = store.add(new TestIPCServer());
            const client1 = server.createConnection('client1');
            const clientService1 = store.add(new TestService());
            const clientChannel1 = new TestChannel(clientService1);
            client1.registerChannel('channel', clientChannel1);
            const pings = [];
            const channel = server.getChannel('channel', () => true);
            const service = new TestChannelClient(channel);
            store.add(service.onPong((msg) => pings.push(msg)));
            await timeout(1);
            clientService1.ping('hello 1');
            await timeout(1);
            assert.deepStrictEqual(pings, ['hello 1']);
            const client2 = server.createConnection('client2');
            const clientService2 = store.add(new TestService());
            const clientChannel2 = new TestChannel(clientService2);
            client2.registerChannel('channel', clientChannel2);
            await timeout(1);
            clientService2.ping('hello 2');
            await timeout(1);
            assert.deepStrictEqual(pings, ['hello 1', 'hello 2']);
            client1.dispose();
            clientService1.ping('hello 1');
            await timeout(1);
            assert.deepStrictEqual(pings, ['hello 1', 'hello 2']);
            await timeout(1);
            clientService2.ping('hello again 2');
            await timeout(1);
            assert.deepStrictEqual(pings, ['hello 1', 'hello 2', 'hello again 2']);
            client2.dispose();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3BhcnRzL2lwYy90ZXN0L2NvbW1vbi9pcGMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3JELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMvRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDdkQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUMvQyxPQUFPLEVBQ04sWUFBWSxFQUNaLFlBQVksRUFFWixXQUFXLEVBR1gsU0FBUyxFQUNULFNBQVMsRUFFVCxZQUFZLEVBQ1osU0FBUyxHQUNULE1BQU0scUJBQXFCLENBQUE7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFMUYsTUFBTSxhQUFhO0lBQW5CO1FBQ1MsY0FBUyxHQUFHLElBQUksQ0FBQTtRQUNoQixZQUFPLEdBQWUsRUFBRSxDQUFBO1FBRWYsZUFBVSxHQUFHLElBQUksT0FBTyxDQUFXO1lBQ25ELHFCQUFxQixFQUFFLEdBQUcsRUFBRTtnQkFDM0IsS0FBSyxNQUFNLE1BQU0sSUFBSSxJQUFJLENB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