/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { CharacterClassifier } from '../../../common/core/characterClassifier.js';
suite('CharacterClassifier', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('works', () => {
        const classifier = new CharacterClassifier(0);
        assert.strictEqual(classifier.get(-1), 0);
        assert.strictEqual(classifier.get(0), 0);
        assert.strictEqual(classifier.get(97 /* CharCode.a */), 0);
        assert.strictEqual(classifier.get(98 /* CharCode.b */), 0);
        assert.strictEqual(classifier.get(122 /* CharCode.z */), 0);
        assert.strictEqual(classifier.get(255), 0);
        assert.strictEqual(classifier.get(1000), 0);
        assert.strictEqual(classifier.get(2000), 0);
        classifier.set(97 /* CharCode.a */, 1);
        classifier.set(122 /* CharCode.z */, 2);
        classifier.set(1000, 3);
        assert.strictEqual(classifier.get(-1), 0);
        assert.strictEqual(classifier.get(0), 0);
        assert.strictEqual(classifier.get(97 /* CharCode.a */), 1);
        assert.strictEqual(classifier.get(98 /* CharCode.b */), 0);
        assert.strictEqual(classifier.get(122 /* CharCode.z */), 2);
        assert.strictEqual(classifier.get(255), 0);
        assert.strictEqual(classifier.get(1000), 3);
        assert.strictEqual(classifier.get(2000), 0);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhcmFjdGVyQ2xhc3NpZmllci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vY29yZS9jaGFyYWN0ZXJDbGFzc2lmaWVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBRTNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRWpGLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7SUFDakMsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtRQUNsQixNQUFNLFVBQVUsR0FBRyxJQUFJLG1CQUFtQixDQUFTLENBQUMsQ0FBQyxDQUFBO1FBRXJELE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN4QyxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxHQUFHLHFCQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsR0FBRyxxQkFBWSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEdBQUcsc0JBQVksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUUzQyxVQUFVLENBQUMsR0FBRyxzQkFBYSxDQUFDLENBQUMsQ0FBQTtRQUM3QixVQUFVLENBQUMsR0FBRyx1QkFBYSxDQUFDLENBQUMsQ0FBQTtRQUM3QixVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUV2QixNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN6QyxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsR0FBRyxxQkFBWSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEdBQUcscUJBQVksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxHQUFHLHNCQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDNUMsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9