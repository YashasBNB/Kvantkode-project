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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW5jb2RpbmcuaW50ZWdyYXRpb25UZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RleHRmaWxlL3Rlc3Qvbm9kZS9lbmNvZGluZy9lbmNvZGluZy5pbnRlZ3JhdGlvblRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxnQkFBZ0IsTUFBTSxpREFBaUQsQ0FBQTtBQUNuRixPQUFPLEtBQUssUUFBUSxNQUFNLDZCQUE2QixDQUFBO0FBRXZELEtBQUssQ0FBQyxVQUFVLEVBQUU7SUFDakIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUVuQixJQUFJLENBQUMsb0NBQW9DLEVBQUUsS0FBSztRQUMvQyxNQUFNLEdBQUcsR0FBRyxNQUFNLGdCQUFnQixDQUFDLHVCQUF1QixFQUFFLENBQUE7UUFDNUQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQzFCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHlDQUF5QyxFQUFFLEtBQUs7UUFDcEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLFNBQVMsQ0FBQTtRQUU5QyxNQUFNLEdBQUcsR0FBRyxNQUFNLGdCQUFnQixDQUFDLHVCQUF1QixFQUFFLENBQUE7UUFDNUQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLFFBQVEsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxTQUFTLENBQUMsQ0FBQTtJQUNuQyxDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=