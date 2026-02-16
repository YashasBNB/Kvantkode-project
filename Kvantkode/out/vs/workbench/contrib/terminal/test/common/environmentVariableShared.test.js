/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual } from 'assert';
import { deserializeEnvironmentVariableCollection, serializeEnvironmentVariableCollection, } from '../../../../../platform/terminal/common/environmentVariableShared.js';
import { EnvironmentVariableMutatorType, } from '../../../../../platform/terminal/common/environmentVariable.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('EnvironmentVariable - deserializeEnvironmentVariableCollection', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('should construct correctly with 3 arguments', () => {
        const c = deserializeEnvironmentVariableCollection([
            ['A', { value: 'a', type: EnvironmentVariableMutatorType.Replace, variable: 'A' }],
            ['B', { value: 'b', type: EnvironmentVariableMutatorType.Append, variable: 'B' }],
            ['C', { value: 'c', type: EnvironmentVariableMutatorType.Prepend, variable: 'C' }],
        ]);
        const keys = [...c.keys()];
        deepStrictEqual(keys, ['A', 'B', 'C']);
        deepStrictEqual(c.get('A'), {
            value: 'a',
            type: EnvironmentVariableMutatorType.Replace,
            variable: 'A',
        });
        deepStrictEqual(c.get('B'), {
            value: 'b',
            type: EnvironmentVariableMutatorType.Append,
            variable: 'B',
        });
        deepStrictEqual(c.get('C'), {
            value: 'c',
            type: EnvironmentVariableMutatorType.Prepend,
            variable: 'C',
        });
    });
});
suite('EnvironmentVariable - serializeEnvironmentVariableCollection', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('should correctly serialize the object', () => {
        const collection = new Map();
        deepStrictEqual(serializeEnvironmentVariableCollection(collection), []);
        collection.set('A', { value: 'a', type: EnvironmentVariableMutatorType.Replace, variable: 'A' });
        collection.set('B', { value: 'b', type: EnvironmentVariableMutatorType.Append, variable: 'B' });
        collection.set('C', { value: 'c', type: EnvironmentVariableMutatorType.Prepend, variable: 'C' });
        deepStrictEqual(serializeEnvironmentVariableCollection(collection), [
            ['A', { value: 'a', type: EnvironmentVariableMutatorType.Replace, variable: 'A' }],
            ['B', { value: 'b', type: EnvironmentVariableMutatorType.Append, variable: 'B' }],
            ['C', { value: 'c', type: EnvironmentVariableMutatorType.Prepend, variable: 'C' }],
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRWYXJpYWJsZVNoYXJlZC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC90ZXN0L2NvbW1vbi9lbnZpcm9ubWVudFZhcmlhYmxlU2hhcmVkLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUN4QyxPQUFPLEVBQ04sd0NBQXdDLEVBQ3hDLHNDQUFzQyxHQUN0QyxNQUFNLHNFQUFzRSxDQUFBO0FBQzdFLE9BQU8sRUFDTiw4QkFBOEIsR0FFOUIsTUFBTSxnRUFBZ0UsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxLQUFLLENBQUMsZ0VBQWdFLEVBQUUsR0FBRyxFQUFFO0lBQzVFLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLDZDQUE2QyxFQUFFLEdBQUcsRUFBRTtRQUN4RCxNQUFNLENBQUMsR0FBRyx3Q0FBd0MsQ0FBQztZQUNsRCxDQUFDLEdBQUcsRUFBRSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLDhCQUE4QixDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLENBQUM7WUFDbEYsQ0FBQyxHQUFHLEVBQUUsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSw4QkFBOEIsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxDQUFDO1lBQ2pGLENBQUMsR0FBRyxFQUFFLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsOEJBQThCLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsQ0FBQztT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