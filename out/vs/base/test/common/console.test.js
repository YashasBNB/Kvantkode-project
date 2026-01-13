/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { getFirstFrame } from '../../common/console.js';
import { normalize } from '../../common/path.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('Console', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('getFirstFrame', () => {
        let stack = 'at vscode.commands.registerCommand (/Users/someone/Desktop/test-ts/out/src/extension.js:18:17)';
        let frame = getFirstFrame(stack);
        assert.strictEqual(frame.uri.fsPath, normalize('/Users/someone/Desktop/test-ts/out/src/extension.js'));
        assert.strictEqual(frame.line, 18);
        assert.strictEqual(frame.column, 17);
        stack = 'at /Users/someone/Desktop/test-ts/out/src/extension.js:18:17';
        frame = getFirstFrame(stack);
        assert.strictEqual(frame.uri.fsPath, normalize('/Users/someone/Desktop/test-ts/out/src/extension.js'));
        assert.strictEqual(frame.line, 18);
        assert.strictEqual(frame.column, 17);
        stack = 'at c:\\Users\\someone\\Desktop\\end-js\\extension.js:18:17';
        frame = getFirstFrame(stack);
        assert.strictEqual(frame.uri.fsPath, 'c:\\Users\\someone\\Desktop\\end-js\\extension.js');
        assert.strictEqual(frame.line, 18);
        assert.strictEqual(frame.column, 17);
        stack =
            'at e.$executeContributedCommand(c:\\Users\\someone\\Desktop\\end-js\\extension.js:18:17)';
        frame = getFirstFrame(stack);
        assert.strictEqual(frame.uri.fsPath, 'c:\\Users\\someone\\Desktop\\end-js\\extension.js');
        assert.strictEqual(frame.line, 18);
        assert.strictEqual(frame.column, 17);
        stack =
            'at /Users/someone/Desktop/test-ts/out/src/extension.js:18:17\nat /Users/someone/Desktop/test-ts/out/src/other.js:28:27\nat /Users/someone/Desktop/test-ts/out/src/more.js:38:37';
        frame = getFirstFrame(stack);
        assert.strictEqual(frame.uri.fsPath, normalize('/Users/someone/Desktop/test-ts/out/src/extension.js'));
        assert.strictEqual(frame.line, 18);
        assert.strictEqual(frame.column, 17);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc29sZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL2NvbnNvbGUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFFcEUsS0FBSyxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUU7SUFDckIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtRQUMxQixJQUFJLEtBQUssR0FDUixnR0FBZ0csQ0FBQTtRQUNqRyxJQUFJLEtBQUssR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFFLENBQUE7UUFFakMsTUFBTSxDQUFDLFdBQVcsQ0FDakIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQ2hCLFNBQVMsQ0FBQyxxREFBcUQsQ0FBQyxDQUNoRSxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ2xDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUVwQyxLQUFLLEdBQUcsOERBQThELENBQUE7UUFDdEUsS0FBSyxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUUsQ0FBQTtRQUU3QixNQUFNLENBQUMsV0FBVyxDQUNqQixLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFDaEIsU0FBUyxDQUFDLHFEQUFxRCxDQUFDLENBQ2hFLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDbEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRXBDLEtBQUssR0FBRyw0REFBNEQsQ0FBQTtRQUNwRSxLQUFLLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBRSxDQUFBO1FBRTdCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsbURBQW1ELENBQUMsQ0FBQTtRQUN6RixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDbEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRXBDLEtBQUs7WUFDSiwwRkFBMEYsQ0FBQTtRQUMzRixLQUFLLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBRSxDQUFBO1FBRTdCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsbURBQW1ELENBQUMsQ0FBQTtRQUN6RixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDbEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRXBDLEtBQUs7WUFDSixpTEFBaUwsQ0FBQTtRQUNsTCxLQUFLLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBRSxDQUFBO1FBRTdCLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUNoQixTQUFTLENBQUMscURBQXFELENBQUMsQ0FDaEUsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNsQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDckMsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9