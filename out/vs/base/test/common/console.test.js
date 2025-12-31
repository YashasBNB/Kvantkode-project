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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc29sZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9jb25zb2xlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDaEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBRXBFLEtBQUssQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFO0lBQ3JCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7UUFDMUIsSUFBSSxLQUFLLEdBQ1IsZ0dBQWdHLENBQUE7UUFDakcsSUFBSSxLQUFLLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBRSxDQUFBO1FBRWpDLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUNoQixTQUFTLENBQUMscURBQXFELENBQUMsQ0FDaEUsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNsQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFcEMsS0FBSyxHQUFHLDhEQUE4RCxDQUFBO1FBQ3RFLEtBQUssR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFFLENBQUE7UUFFN0IsTUFBTSxDQUFDLFdBQVcsQ0FDakIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQ2hCLFNBQVMsQ0FBQyxxREFBcUQsQ0FBQyxDQUNoRSxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ2xDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUVwQyxLQUFLLEdBQUcsNERBQTRELENBQUE7UUFDcEUsS0FBSyxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUUsQ0FBQTtRQUU3QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLG1EQUFtRCxDQUFDLENBQUE7UUFDekYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ2xDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUVwQyxLQUFLO1lBQ0osMEZBQTBGLENBQUE7UUFDM0YsS0FBSyxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUUsQ0FBQTtRQUU3QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLG1EQUFtRCxDQUFDLENBQUE7UUFDekYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ2xDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUVwQyxLQUFLO1lBQ0osaUxBQWlMLENBQUE7UUFDbEwsS0FBSyxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUUsQ0FBQTtRQUU3QixNQUFNLENBQUMsV0FBVyxDQUNqQixLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFDaEIsU0FBUyxDQUFDLHFEQUFxRCxDQUFDLENBQ2hFLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDbEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQ3JDLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==