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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pY2VDaGF0QWN0aW9ucy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvZWxlY3Ryb24tc2FuZGJveC92b2ljZUNoYXRBY3Rpb25zLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBRS9GLEtBQUssQ0FBQyxrQkFBa0IsRUFBRTtJQUN6QixTQUFTLFdBQVcsQ0FDbkIsSUFBWSxFQUNaLFFBQTRCLEVBQzVCLE1BQWM7UUFFZCxNQUFNLEdBQUcsR0FBRywwQkFBMEIsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBRXZDLE9BQU8sR0FBRyxDQUFBO0lBQ1gsQ0FBQztJQUVELElBQUksQ0FBQyw0QkFBNEIsRUFBRTtRQUNsQyxvQkFBb0I7UUFDcEIsV0FBVyxDQUFDLGFBQWEsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDeEMsV0FBVyxDQUFDLGNBQWMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDekMsV0FBVyxDQUFDLGVBQWUsRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDL0MsV0FBVyxDQUFDLGVBQWUsRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDL0MsV0FBVyxDQUFDLGVBQWUsRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDL0MsV0FBVyxDQUFDLGVBQWUsRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFL0MsbURBQW1EO1FBQ25ELFdBQVcsQ0FBQywyQ0FBMkMsRUFBRSwrQkFBK0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUU1RixxREFBcUQ7UUFDckQsSUFBSSxNQUFNLEdBQUcsV0FBVyxDQUFDLDJCQUEyQixFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7UUFDL0UsTUFBTSxHQUFHLFdBQVcsQ0FDbkIsMkNBQTJDLEVBQzNDLGtCQUFrQixFQUNsQixNQUFNLENBQ04sQ0FBQyxNQUFNLENBQUE7UUFDUixNQUFNLEdBQUcsV0FBVyxDQUNuQixrREFBa0QsRUFDbEQsbUJBQW1CLEVBQ25CLE1BQU0sQ0FDTixDQUFDLE1BQU0sQ0FBQTtRQUNSLFdBQVcsQ0FBQyxrREFBa0QsRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFFbEYsc0JBQXNCO1FBQ3RCLE1BQU0sR0FBRyxXQUFXLENBQUMsMkJBQTJCLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtRQUMzRSxXQUFXLENBQUMsa0NBQWtDLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDNUUsQ0FBQyxDQUFDLENBQUE7SUFFRix1Q0FBdUMsRUFBRSxDQUFBO0FBQzFDLENBQUMsQ0FBQyxDQUFBIn0=