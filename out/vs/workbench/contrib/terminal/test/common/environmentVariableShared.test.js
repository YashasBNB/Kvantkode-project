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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRWYXJpYWJsZVNoYXJlZC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvdGVzdC9jb21tb24vZW52aXJvbm1lbnRWYXJpYWJsZVNoYXJlZC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxRQUFRLENBQUE7QUFDeEMsT0FBTyxFQUNOLHdDQUF3QyxFQUN4QyxzQ0FBc0MsR0FDdEMsTUFBTSxzRUFBc0UsQ0FBQTtBQUM3RSxPQUFPLEVBQ04sOEJBQThCLEdBRTlCLE1BQU0sZ0VBQWdFLENBQUE7QUFDdkUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsS0FBSyxDQUFDLGdFQUFnRSxFQUFFLEdBQUcsRUFBRTtJQUM1RSx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyw2Q0FBNkMsRUFBRSxHQUFHLEVBQUU7UUFDeEQsTUFBTSxDQUFDLEdBQUcsd0NBQXdDLENBQUM7WUFDbEQsQ0FBQyxHQUFHLEVBQUUsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSw4QkFBOEIsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxDQUFDO1lBQ2xGLENBQUMsR0FBRyxFQUFFLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsOEJBQThCLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsQ0FBQztZQUNqRixDQUFDLEdBQUcsRUFBRSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLDhCQUE4QixDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLENBQUM7U0FDbEYsQ0FBQyxDQUFBO1FBQ0YsTUFB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