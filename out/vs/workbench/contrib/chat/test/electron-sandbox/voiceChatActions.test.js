/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { parseNextChatResponseChunk } from '../../electron-sandbox/actions/voiceChatActions.js';
suite('VoiceChatActions', function () {
    function assertChunk(text, expected, offset) {
        const res = parseNextChatResponseChunk(text, offset);
        assert.strictEqual(res.chunk, expected);
        return res;
    }
    test('parseNextChatResponseChunk', function () {
        // Simple, no offset
        assertChunk('Hello World', undefined, 0);
        assertChunk('Hello World.', undefined, 0);
        assertChunk('Hello World. ', 'Hello World.', 0);
        assertChunk('Hello World? ', 'Hello World?', 0);
        assertChunk('Hello World! ', 'Hello World!', 0);
        assertChunk('Hello World: ', 'Hello World:', 0);
        // Ensure chunks are parsed from the end, no offset
        assertChunk('Hello World. How is your day? And more...', 'Hello World. How is your day?', 0);
        // Ensure chunks are parsed from the end, with offset
        let offset = assertChunk('Hello World. How is your ', 'Hello World.', 0).offset;
        offset = assertChunk('Hello World. How is your day? And more...', 'How is your day?', offset).offset;
        offset = assertChunk('Hello World. How is your day? And more to come! ', 'And more to come!', offset).offset;
        assertChunk('Hello World. How is your day? And more to come! ', undefined, offset);
        // Sparted by newlines
        offset = assertChunk('Hello World.\nHow is your', 'Hello World.', 0).offset;
        assertChunk('Hello World.\nHow is your day?\n', 'How is your day?', offset);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pY2VDaGF0QWN0aW9ucy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2VsZWN0cm9uLXNhbmRib3gvdm9pY2VDaGF0QWN0aW9ucy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUUvRixLQUFLLENBQUMsa0JBQWtCLEVBQUU7SUFDekIsU0FBUyxXQUFXLENBQ25CLElBQVksRUFDWixRQUE0QixFQUM1QixNQUFjO1FBRWQsTUFBTSxHQUFHLEdBQUcsMEJBQTBCLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUV2QyxPQUFPLEdBQUcsQ0FBQTtJQUNYLENBQUM7SUFFRCxJQUFJLENBQUMsNEJBQTRCLEVBQUU7UUFDbEMsb0JBQW9CO1FBQ3BCLFdBQVcsQ0FBQyxhQUFhLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLFdBQVcsQ0FBQyxjQUFjLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3pDLFdBQVcsQ0FBQyxlQUFlLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQy9DLFdBQVcsQ0FBQyxlQUFlLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQy9DLFdBQVcsQ0FBQyxlQUFlLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQy9DLFdBQVcsQ0FBQyxlQUFlLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRS9DLG1EQUFtRDtRQUNuRCxXQUFXLENBQUMsMkNBQTJDLEVBQUUsK0JBQStCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFNUYscURBQXFEO1FBQ3JELElBQUksTUFBTSxHQUFHLFdBQVcsQ0FBQywyQkFBMkIsRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFBO1FBQy9FLE1BQU0sR0FBRyxXQUFXLENBQ25CLDJDQUEyQyxFQUMzQyxrQkFBa0IsRUFDbEIsTUFBTSxDQUNOLENBQUMsTUFBTSxDQUFBO1FBQ1IsTUFBTSxHQUFHLFdBQVcsQ0FDbkIsa0RBQWtELEVBQ2xELG1CQUFtQixFQUNuQixNQUFNLENBQ04sQ0FBQyxNQUFNLENBQUE7UUFDUixXQUFXLENBQUMsa0RBQWtELEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBRWxGLHNCQUFzQjtRQUN0QixNQUFNLEdBQUcsV0FBVyxDQUFDLDJCQUEyQixFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7UUFDM0UsV0FBVyxDQUFDLGtDQUFrQyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQzVFLENBQUMsQ0FBQyxDQUFBO0lBRUYsdUNBQXVDLEVBQUUsQ0FBQTtBQUMxQyxDQUFDLENBQUMsQ0FBQSJ9