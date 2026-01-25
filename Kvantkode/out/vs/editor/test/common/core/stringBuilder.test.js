/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { writeUInt16LE } from '../../../../base/common/buffer.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { decodeUTF16LE, StringBuilder } from '../../../common/core/stringBuilder.js';
suite('decodeUTF16LE', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('issue #118041: unicode character undo bug 1', () => {
        const buff = new Uint8Array(2);
        writeUInt16LE(buff, '﻿'.charCodeAt(0), 0);
        const actual = decodeUTF16LE(buff, 0, 1);
        assert.deepStrictEqual(actual, '﻿');
    });
    test('issue #118041: unicode character undo bug 2', () => {
        const buff = new Uint8Array(4);
        writeUInt16LE(buff, 'a﻿'.charCodeAt(0), 0);
        writeUInt16LE(buff, 'a﻿'.charCodeAt(1), 2);
        const actual = decodeUTF16LE(buff, 0, 2);
        assert.deepStrictEqual(actual, 'a﻿');
    });
    test('issue #118041: unicode character undo bug 3', () => {
        const buff = new Uint8Array(6);
        writeUInt16LE(buff, 'a﻿b'.charCodeAt(0), 0);
        writeUInt16LE(buff, 'a﻿b'.charCodeAt(1), 2);
        writeUInt16LE(buff, 'a﻿b'.charCodeAt(2), 4);
        const actual = decodeUTF16LE(buff, 0, 3);
        assert.deepStrictEqual(actual, 'a﻿b');
    });
});
suite('StringBuilder', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('basic', () => {
        const sb = new StringBuilder(100);
        sb.appendASCIICharCode(65 /* CharCode.A */);
        sb.appendASCIICharCode(32 /* CharCode.Space */);
        sb.appendString('😊');
        assert.strictEqual(sb.build(), 'A 😊');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RyaW5nQnVpbGRlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vY29yZS9zdHJpbmdCdWlsZGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsYUFBYSxFQUFFLGFBQWEsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRXBGLEtBQUssQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO0lBQzNCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLDZDQUE2QyxFQUFFLEdBQUcsRUFBRTtRQUN4RCxNQUFNLElBQUksR0FBRyxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM5QixhQUFhLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDekMsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDeEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDcEMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNkNBQTZDLEVBQUUsR0FBRyxFQUFFO1FBQ3hELE1BQU0sSUFBSSxHQUFHLElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzlCLGFBQWEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxQyxhQUFhLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUMsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDeEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDckMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNkNBQTZDLEVBQUUsR0FBRyxFQUFFO1FBQ3hELE1BQU0sSUFBSSxHQUFHLElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzlCLGFBQWEsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzQyxhQUFhLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0MsYUFBYSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNDLE1BQU0sTUFBTSxHQUFHLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ3RDLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUE7QUFFRixLQUFLLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtJQUMzQix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO1FBQ2xCLE1BQU0sRUFBRSxHQUFHLElBQUksYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ2pDLEVBQUUsQ0FBQyxtQkFBbUIscUJBQVksQ0FBQTtRQUNsQyxFQUFFLENBQUMsbUJBQW1CLHlCQUFnQixDQUFBO1FBQ3RDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDckIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDdkMsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9