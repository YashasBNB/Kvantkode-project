/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as http from 'http';
import assert from 'assert';
import { CancellationToken, CancellationTokenSource } from '../../../../common/cancellation.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../test/common/utils.js';
import { request } from '../../common/requestImpl.js';
import { streamToBuffer } from '../../../../common/buffer.js';
suite('Request', () => {
    let port;
    let server;
    setup(async () => {
        port = await new Promise((resolvePort, rejectPort) => {
            server = http
                .createServer((req, res) => {
                if (req.url === '/noreply') {
                    return; // never respond
                }
                res.setHeader('Content-Type', 'application/json');
                if (req.headers['echo-header']) {
                    res.setHeader('echo-header', req.headers['echo-header']);
                }
                const data = [];
                req.on('data', (chunk) => data.push(chunk));
                req.on('end', () => {
                    res.end(JSON.stringify({
                        method: req.method,
                        url: req.url,
                        data: Buffer.concat(data).toString(),
                    }));
                });
            })
                .listen(0, '127.0.0.1', () => {
                const address = server.address();
                resolvePort(address.port);
            })
                .on('error', (err) => {
                rejectPort(err);
            });
        });
    });
    teardown(async () => {
        await new Promise((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()));
        });
    });
    test('GET', async () => {
        const context = await request({
            url: `http://127.0.0.1:${port}`,
            headers: {
                'echo-header': 'echo-value',
            },
        }, CancellationToken.None);
        assert.strictEqual(context.res.statusCode, 200);
        assert.strictEqual(context.res.headers['content-type'], 'application/json');
        assert.strictEqual(context.res.headers['echo-header'], 'echo-value');
        const buffer = await streamToBuffer(context.stream);
        const body = JSON.parse(buffer.toString());
        assert.strictEqual(body.method, 'GET');
        assert.strictEqual(body.url, '/');
    });
    test('POST', async () => {
        const context = await request({
            type: 'POST',
            url: `http://127.0.0.1:${port}/postpath`,
            data: 'Some data',
        }, CancellationToken.None);
        assert.strictEqual(context.res.statusCode, 200);
        assert.strictEqual(context.res.headers['content-type'], 'application/json');
        const buffer = await streamToBuffer(context.stream);
        const body = JSON.parse(buffer.toString());
        assert.strictEqual(body.method, 'POST');
        assert.strictEqual(body.url, '/postpath');
        assert.strictEqual(body.data, 'Some data');
    });
    test('timeout', async () => {
        try {
            await request({
                type: 'GET',
                url: `http://127.0.0.1:${port}/noreply`,
                timeout: 123,
            }, CancellationToken.None);
            assert.fail('Should fail with timeout');
        }
        catch (err) {
            assert.strictEqual(err.message, 'Fetch timeout: 123ms');
        }
    });
    test('cancel', async () => {
        try {
            const source = new CancellationTokenSource();
            const res = request({
                type: 'GET',
                url: `http://127.0.0.1:${port}/noreply`,
            }, source.token);
            await new Promise((resolve) => setTimeout(resolve, 100));
            source.cancel();
            await res;
            assert.fail('Should fail with cancellation');
        }
        catch (err) {
            assert.strictEqual(err.message, 'Canceled');
        }
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3BhcnRzL3JlcXVlc3QvdGVzdC9lbGVjdHJvbi1tYWluL3JlcXVlc3QudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssSUFBSSxNQUFNLE1BQU0sQ0FBQTtBQUU1QixPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHVCQUF1QixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDL0YsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3JELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUU3RCxLQUFLLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRTtJQUNyQixJQUFJLElBQVksQ0FBQTtJQUNoQixJQUFJLE1BQW1CLENBQUE7SUFFdkIsS0FBSyxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ2hCLElBQUksR0FBRyxNQUFNLElBQUksT0FBTyxDQUFTLENBQUMsV0FBVyxFQUFFLFVBQVUsRUFBRSxFQUFFO1lBQzVELE1BQU0sR0FBRyxJQUFJO2lCQUNYLFlBQVksQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtnQkFDMUIsSUFBSSxHQUFHLENBQUMsR0FBRyxLQUFLLFVBQVUsRUFBRSxDQUFDO29CQUM1QixPQUFNLENBQUMsZ0JBQWdCO2dCQUN4QixDQUFDO2dCQUNELEdBQUcsQ0FBQyxTQUFTLENBQUMsY0FBYyxFQUFFLGtCQUFrQixDQUFDLENBQUE7Z0JBQ2pELElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxhQUFh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