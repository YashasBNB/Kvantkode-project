/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { normalizeMimeType } from '../../common/mime.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('Mime', () => {
    test('normalize', () => {
        assert.strictEqual(normalizeMimeType('invalid'), 'invalid');
        assert.strictEqual(normalizeMimeType('invalid', true), undefined);
        assert.strictEqual(normalizeMimeType('Text/plain'), 'text/plain');
        assert.strictEqual(normalizeMimeType('Text/pläin'), 'text/pläin');
        assert.strictEqual(normalizeMimeType('Text/plain;UPPER'), 'text/plain;UPPER');
        assert.strictEqual(normalizeMimeType('Text/plain;lower'), 'text/plain;lower');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWltZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9taW1lLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQ3hELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUVwRSxLQUFLLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRTtJQUNsQixJQUFJLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRTtRQUN0QixNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFDakUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQTtRQUNqRSxNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLGtCQUFrQixDQUFDLEVBQUUsa0JBQWtCLENBQUMsQ0FBQTtRQUM3RSxNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLGtCQUFrQixDQUFDLEVBQUUsa0JBQWtCLENBQUMsQ0FBQTtJQUM5RSxDQUFDLENBQUMsQ0FBQTtJQUVGLHVDQUF1QyxFQUFFLENBQUE7QUFDMUMsQ0FBQyxDQUFDLENBQUEifQ==