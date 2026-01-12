/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as terminalEncoding from '../../../../../../base/node/terminalEncoding.js';
import * as encoding from '../../../common/encoding.js';
suite('Encoding', function () {
    this.timeout(10000);
    test('resolve terminal encoding (detect)', async function () {
        const enc = await terminalEncoding.resolveTerminalEncoding();
        assert.ok(enc.length > 0);
    });
    test('resolve terminal encoding (environment)', async function () {
        process.env['VSCODE_CLI_ENCODING'] = 'utf16le';
        const enc = await terminalEncoding.resolveTerminalEncoding();
        assert.ok(await encoding.encodingExists(enc));
        assert.strictEqual(enc, 'utf16le');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW5jb2RpbmcuaW50ZWdyYXRpb25UZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGV4dGZpbGUvdGVzdC9ub2RlL2VuY29kaW5nL2VuY29kaW5nLmludGVncmF0aW9uVGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxLQUFLLGdCQUFnQixNQUFNLGlEQUFpRCxDQUFBO0FBQ25GLE9BQU8sS0FBSyxRQUFRLE1BQU0sNkJBQTZCLENBQUE7QUFFdkQsS0FBSyxDQUFDLFVBQVUsRUFBRTtJQUNqQixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBRW5CLElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxLQUFLO1FBQy9DLE1BQU0sR0FBRyxHQUFHLE1BQU0sZ0JBQWdCLENBQUMsdUJBQXVCLEVBQUUsQ0FBQTtRQUM1RCxNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDMUIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMseUNBQXlDLEVBQUUsS0FBSztRQUNwRCxPQUFPLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLEdBQUcsU0FBUyxDQUFBO1FBRTlDLE1BQU0sR0FBRyxHQUFHLE1BQU0sZ0JBQWdCLENBQUMsdUJBQXVCLEVBQUUsQ0FBQTtRQUM1RCxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sUUFBUSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQ25DLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==