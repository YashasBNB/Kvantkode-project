/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual, strictEqual } from 'assert';
import { EnvironmentVariableMutatorType } from '../../../../../platform/terminal/common/environmentVariable.js';
import { isWindows } from '../../../../../base/common/platform.js';
import { MergedEnvironmentVariableCollection } from '../../../../../platform/terminal/common/environmentVariableCollection.js';
import { deserializeEnvironmentDescriptionMap, deserializeEnvironmentVariableCollection, } from '../../../../../platform/terminal/common/environmentVariableShared.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('EnvironmentVariable - MergedEnvironmentVariableCollection', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('ctor', () => {
        test('Should keep entries that come after a Prepend or Append type mutators', () => {
            const merged = new MergedEnvironmentVariableCollection(new Map([
                [
                    'ext1',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                { value: 'a1', type: EnvironmentVariableMutatorType.Prepend, variable: 'A' },
                            ],
                        ]),
                    },
                ],
                [
                    'ext2',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                { value: 'a2', type: EnvironmentVariableMutatorType.Append, variable: 'A' },
                            ],
                        ]),
                    },
                ],
                [
                    'ext3',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                { value: 'a3', type: EnvironmentVariableMutatorType.Prepend, variable: 'A' },
                            ],
                        ]),
                    },
                ],
                [
                    'ext4',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                {
                                    value: 'a4',
                                    type: EnvironmentVariableMutatorType.Append,
                                    variable: 'A',
                                    options: { applyAtProcessCreation: true, applyAtShellIntegration: true },
                                },
                            ],
                        ]),
                    },
                ],
            ]));
            deepStrictEqual([...merged.getVariableMap(undefined).entries()], [
                [
                    'A',
                    [
                        {
                            extensionIdentifier: 'ext4',
                            type: EnvironmentVariableMutatorType.Append,
                            value: 'a4',
                            variable: 'A',
                            options: { applyAtProcessCreation: true, applyAtShellIntegration: true },
                        },
                        {
                            extensionIdentifier: 'ext3',
                            type: EnvironmentVariableMutatorType.Prepend,
                            value: 'a3',
                            variable: 'A',
                            options: undefined,
                        },
                        {
                            extensionIdentifier: 'ext2',
                            type: EnvironmentVariableMutatorType.Append,
                            value: 'a2',
                            variable: 'A',
                            options: undefined,
                        },
                        {
                            extensionIdentifier: 'ext1',
                            type: EnvironmentVariableMutatorType.Prepend,
                            value: 'a1',
                            variable: 'A',
                            options: undefined,
                        },
                    ],
                ],
            ]);
        });
        test('Should remove entries that come after a Replace type mutator', () => {
            const merged = new MergedEnvironmentVariableCollection(new Map([
                [
                    'ext1',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                { value: 'a1', type: EnvironmentVariableMutatorType.Prepend, variable: 'A' },
                            ],
                        ]),
                    },
                ],
                [
                    'ext2',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                { value: 'a2', type: EnvironmentVariableMutatorType.Append, variable: 'A' },
                            ],
                        ]),
                    },
                ],
                [
                    'ext3',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                { value: 'a3', type: EnvironmentVariableMutatorType.Replace, variable: 'A' },
                            ],
                        ]),
                    },
                ],
                [
                    'ext4',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                { value: 'a4', type: EnvironmentVariableMutatorType.Append, variable: 'A' },
                            ],
                        ]),
                    },
                ],
            ]));
            deepStrictEqual([...merged.getVariableMap(undefined).entries()], [
                [
                    'A',
                    [
                        {
                            extensionIdentifier: 'ext3',
                            type: EnvironmentVariableMutatorType.Replace,
                            value: 'a3',
                            variable: 'A',
                            options: undefined,
                        },
                        {
                            extensionIdentifier: 'ext2',
                            type: EnvironmentVariableMutatorType.Append,
                            value: 'a2',
                            variable: 'A',
                            options: undefined,
                        },
                        {
                            extensionIdentifier: 'ext1',
                            type: EnvironmentVariableMutatorType.Prepend,
                            value: 'a1',
                            variable: 'A',
                            options: undefined,
                        },
                    ],
                ],
            ], 'The ext4 entry should be removed as it comes after a Replace');
        });
        test('Appropriate workspace scoped entries are returned when querying for a particular workspace folder', () => {
            const scope1 = {
                workspaceFolder: { uri: URI.file('workspace1'), name: 'workspace1', index: 0 },
            };
            const scope2 = {
                workspaceFolder: { uri: URI.file('workspace2'), name: 'workspace2', index: 3 },
            };
            const merged = new MergedEnvironmentVariableCollection(new Map([
                [
                    'ext1',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                {
                                    value: 'a1',
                                    type: EnvironmentVariableMutatorType.Prepend,
                                    scope: scope1,
                                    variable: 'A',
                                },
                            ],
                        ]),
                    },
                ],
                [
                    'ext2',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                { value: 'a2', type: EnvironmentVariableMutatorType.Append, variable: 'A' },
                            ],
                        ]),
                    },
                ],
                [
                    'ext3',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                {
                                    value: 'a3',
                                    type: EnvironmentVariableMutatorType.Prepend,
                                    scope: scope2,
                                    variable: 'A',
                                },
                            ],
                        ]),
                    },
                ],
                [
                    'ext4',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                { value: 'a4', type: EnvironmentVariableMutatorType.Append, variable: 'A' },
                            ],
                        ]),
                    },
                ],
            ]));
            deepStrictEqual([...merged.getVariableMap(scope2).entries()], [
                [
                    'A',
                    [
                        {
                            extensionIdentifier: 'ext4',
                            type: EnvironmentVariableMutatorType.Append,
                            value: 'a4',
                            variable: 'A',
                            options: undefined,
                        },
                        {
                            extensionIdentifier: 'ext3',
                            type: EnvironmentVariableMutatorType.Prepend,
                            value: 'a3',
                            scope: scope2,
                            variable: 'A',
                            options: undefined,
                        },
                        {
                            extensionIdentifier: 'ext2',
                            type: EnvironmentVariableMutatorType.Append,
                            value: 'a2',
                            variable: 'A',
                            options: undefined,
                        },
                    ],
                ],
            ]);
        });
        test('Workspace scoped entries are not included when looking for global entries', () => {
            const scope1 = {
                workspaceFolder: { uri: URI.file('workspace1'), name: 'workspace1', index: 0 },
            };
            const scope2 = {
                workspaceFolder: { uri: URI.file('workspace2'), name: 'workspace2', index: 3 },
            };
            const merged = new MergedEnvironmentVariableCollection(new Map([
                [
                    'ext1',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                {
                                    value: 'a1',
                                    type: EnvironmentVariableMutatorType.Prepend,
                                    scope: scope1,
                                    variable: 'A',
                                },
                            ],
                        ]),
                    },
                ],
                [
                    'ext2',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                { value: 'a2', type: EnvironmentVariableMutatorType.Append, variable: 'A' },
                            ],
                        ]),
                    },
                ],
                [
                    'ext3',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                {
                                    value: 'a3',
                                    type: EnvironmentVariableMutatorType.Prepend,
                                    scope: scope2,
                                    variable: 'A',
                                },
                            ],
                        ]),
                    },
                ],
                [
                    'ext4',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                { value: 'a4', type: EnvironmentVariableMutatorType.Append, variable: 'A' },
                            ],
                        ]),
                    },
                ],
            ]));
            deepStrictEqual([...merged.getVariableMap(undefined).entries()], [
                [
                    'A',
                    [
                        {
                            extensionIdentifier: 'ext4',
                            type: EnvironmentVariableMutatorType.Append,
                            value: 'a4',
                            variable: 'A',
                            options: undefined,
                        },
                        {
                            extensionIdentifier: 'ext2',
                            type: EnvironmentVariableMutatorType.Append,
                            value: 'a2',
                            variable: 'A',
                            options: undefined,
                        },
                    ],
                ],
            ]);
        });
        test('Workspace scoped description entries are properly filtered for each extension', () => {
            const scope1 = {
                workspaceFolder: { uri: URI.file('workspace1'), name: 'workspace1', index: 0 },
            };
            const scope2 = {
                workspaceFolder: { uri: URI.file('workspace2'), name: 'workspace2', index: 3 },
            };
            const merged = new MergedEnvironmentVariableCollection(new Map([
                [
                    'ext1',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                {
                                    value: 'a1',
                                    type: EnvironmentVariableMutatorType.Prepend,
                                    scope: scope1,
                                    variable: 'A',
                                },
                            ],
                        ]),
                        descriptionMap: deserializeEnvironmentDescriptionMap([
                            ['A-key-scope1', { description: 'ext1 scope1 description', scope: scope1 }],
                            ['A-key-scope2', { description: 'ext1 scope2 description', scope: scope2 }],
                        ]),
                    },
                ],
                [
                    'ext2',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                { value: 'a2', type: EnvironmentVariableMutatorType.Append, variable: 'A' },
                            ],
                        ]),
                        descriptionMap: deserializeEnvironmentDescriptionMap([
                            ['A-key', { description: 'ext2 global description' }],
                        ]),
                    },
                ],
                [
                    'ext3',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                {
                                    value: 'a3',
                                    type: EnvironmentVariableMutatorType.Prepend,
                                    scope: scope2,
                                    variable: 'A',
                                },
                            ],
                        ]),
                        descriptionMap: deserializeEnvironmentDescriptionMap([
                            ['A-key', { description: 'ext3 scope2 description', scope: scope2 }],
                        ]),
                    },
                ],
                [
                    'ext4',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                { value: 'a4', type: EnvironmentVariableMutatorType.Append, variable: 'A' },
                            ],
                        ]),
                    },
                ],
            ]));
            deepStrictEqual([...merged.getDescriptionMap(scope1).entries()], [['ext1', 'ext1 scope1 description']]);
            deepStrictEqual([...merged.getDescriptionMap(undefined).entries()], [['ext2', 'ext2 global description']]);
        });
    });
    suite('applyToProcessEnvironment', () => {
        test('should apply the collection to an environment', async () => {
            const merged = new MergedEnvironmentVariableCollection(new Map([
                [
                    'ext',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                { value: 'a', type: EnvironmentVariableMutatorType.Replace, variable: 'A' },
                            ],
                            ['B', { value: 'b', type: EnvironmentVariableMutatorType.Append, variable: 'B' }],
                            ['C', { value: 'c', type: EnvironmentVariableMutatorType.Prepend, variable: 'C' }],
                        ]),
                    },
                ],
            ]));
            const env = {
                A: 'foo',
                B: 'bar',
                C: 'baz',
            };
            await merged.applyToProcessEnvironment(env, undefined);
            deepStrictEqual(env, {
                A: 'a',
                B: 'barb',
                C: 'cbaz',
            });
        });
        test('should apply the appropriate workspace scoped entries to an environment', async () => {
            const scope1 = {
                workspaceFolder: { uri: URI.file('workspace1'), name: 'workspace1', index: 0 },
            };
            const scope2 = {
                workspaceFolder: { uri: URI.file('workspace2'), name: 'workspace2', index: 3 },
            };
            const merged = new MergedEnvironmentVariableCollection(new Map([
                [
                    'ext',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                {
                                    value: 'a',
                                    type: EnvironmentVariableMutatorType.Replace,
                                    scope: scope1,
                                    variable: 'A',
                                },
                            ],
                            [
                                'B',
                                {
                                    value: 'b',
                                    type: EnvironmentVariableMutatorType.Append,
                                    scope: scope2,
                                    variable: 'B',
                                },
                            ],
                            ['C', { value: 'c', type: EnvironmentVariableMutatorType.Prepend, variable: 'C' }],
                        ]),
                    },
                ],
            ]));
            const env = {
                A: 'foo',
                B: 'bar',
                C: 'baz',
            };
            await merged.applyToProcessEnvironment(env, scope1);
            deepStrictEqual(env, {
                A: 'a',
                B: 'bar', // This is not changed because the scope does not match
                C: 'cbaz',
            });
        });
        test('should apply the collection to environment entries with no values', async () => {
            const merged = new MergedEnvironmentVariableCollection(new Map([
                [
                    'ext',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                { value: 'a', type: EnvironmentVariableMutatorType.Replace, variable: 'A' },
                            ],
                            ['B', { value: 'b', type: EnvironmentVariableMutatorType.Append, variable: 'B' }],
                            ['C', { value: 'c', type: EnvironmentVariableMutatorType.Prepend, variable: 'C' }],
                        ]),
                    },
                ],
            ]));
            const env = {};
            await merged.applyToProcessEnvironment(env, undefined);
            deepStrictEqual(env, {
                A: 'a',
                B: 'b',
                C: 'c',
            });
        });
        test('should apply to variable case insensitively on Windows only', async () => {
            const merged = new MergedEnvironmentVariableCollection(new Map([
                [
                    'ext',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                { value: 'a', type: EnvironmentVariableMutatorType.Replace, variable: 'a' },
                            ],
                            ['b', { value: 'b', type: EnvironmentVariableMutatorType.Append, variable: 'b' }],
                            ['c', { value: 'c', type: EnvironmentVariableMutatorType.Prepend, variable: 'c' }],
                        ]),
                    },
                ],
            ]));
            const env = {
                A: 'A',
                B: 'B',
                C: 'C',
            };
            await merged.applyToProcessEnvironment(env, undefined);
            if (isWindows) {
                deepStrictEqual(env, {
                    A: 'a',
                    B: 'Bb',
                    C: 'cC',
                });
            }
            else {
                deepStrictEqual(env, {
                    a: 'a',
                    A: 'A',
                    b: 'b',
                    B: 'B',
                    c: 'c',
                    C: 'C',
                });
            }
        });
    });
    suite('diff', () => {
        test('should return undefined when collectinos are the same', () => {
            const merged1 = new MergedEnvironmentVariableCollection(new Map([
                [
                    'ext1',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                { value: 'a', type: EnvironmentVariableMutatorType.Replace, variable: 'A' },
                            ],
                        ]),
                    },
                ],
            ]));
            const merged2 = new MergedEnvironmentVariableCollection(new Map([
                [
                    'ext1',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                { value: 'a', type: EnvironmentVariableMutatorType.Replace, variable: 'A' },
                            ],
                        ]),
                    },
                ],
            ]));
            const diff = merged1.diff(merged2, undefined);
            strictEqual(diff, undefined);
        });
        test('should generate added diffs from when the first entry is added', () => {
            const merged1 = new MergedEnvironmentVariableCollection(new Map([]));
            const merged2 = new MergedEnvironmentVariableCollection(new Map([
                [
                    'ext1',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                { value: 'a', type: EnvironmentVariableMutatorType.Replace, variable: 'A' },
                            ],
                        ]),
                    },
                ],
            ]));
            const diff = merged1.diff(merged2, undefined);
            strictEqual(diff.changed.size, 0);
            strictEqual(diff.removed.size, 0);
            const entries = [...diff.added.entries()];
            deepStrictEqual(entries, [
                [
                    'A',
                    [
                        {
                            extensionIdentifier: 'ext1',
                            value: 'a',
                            type: EnvironmentVariableMutatorType.Replace,
                            variable: 'A',
                            options: undefined,
                        },
                    ],
                ],
            ]);
        });
        test('should generate added diffs from the same extension', () => {
            const merged1 = new MergedEnvironmentVariableCollection(new Map([
                [
                    'ext1',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                { value: 'a', type: EnvironmentVariableMutatorType.Replace, variable: 'A' },
                            ],
                        ]),
                    },
                ],
            ]));
            const merged2 = new MergedEnvironmentVariableCollection(new Map([
                [
                    'ext1',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                { value: 'a', type: EnvironmentVariableMutatorType.Replace, variable: 'A' },
                            ],
                            ['B', { value: 'b', type: EnvironmentVariableMutatorType.Append, variable: 'B' }],
                        ]),
                    },
                ],
            ]));
            const diff = merged1.diff(merged2, undefined);
            strictEqual(diff.changed.size, 0);
            strictEqual(diff.removed.size, 0);
            const entries = [...diff.added.entries()];
            deepStrictEqual(entries, [
                [
                    'B',
                    [
                        {
                            extensionIdentifier: 'ext1',
                            value: 'b',
                            type: EnvironmentVariableMutatorType.Append,
                            variable: 'B',
                            options: undefined,
                        },
                    ],
                ],
            ]);
        });
        test('should generate added diffs from a different extension', () => {
            const merged1 = new MergedEnvironmentVariableCollection(new Map([
                [
                    'ext1',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                { value: 'a1', type: EnvironmentVariableMutatorType.Prepend, variable: 'A' },
                            ],
                        ]),
                    },
                ],
            ]));
            const merged2 = new MergedEnvironmentVariableCollection(new Map([
                [
                    'ext2',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                { value: 'a2', type: EnvironmentVariableMutatorType.Append, variable: 'A' },
                            ],
                        ]),
                    },
                ],
                [
                    'ext1',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                { value: 'a1', type: EnvironmentVariableMutatorType.Prepend, variable: 'A' },
                            ],
                        ]),
                    },
                ],
            ]));
            const diff = merged1.diff(merged2, undefined);
            strictEqual(diff.changed.size, 0);
            strictEqual(diff.removed.size, 0);
            deepStrictEqual([...diff.added.entries()], [
                [
                    'A',
                    [
                        {
                            extensionIdentifier: 'ext2',
                            value: 'a2',
                            type: EnvironmentVariableMutatorType.Append,
                            variable: 'A',
                            options: undefined,
                        },
                    ],
                ],
            ]);
            const merged3 = new MergedEnvironmentVariableCollection(new Map([
                [
                    'ext1',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                { value: 'a1', type: EnvironmentVariableMutatorType.Prepend, variable: 'A' },
                            ],
                        ]),
                    },
                ],
                // This entry should get removed
                [
                    'ext2',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                { value: 'a2', type: EnvironmentVariableMutatorType.Append, variable: 'A' },
                            ],
                        ]),
                    },
                ],
            ]));
            const diff2 = merged1.diff(merged3, undefined);
            strictEqual(diff2.changed.size, 0);
            strictEqual(diff2.removed.size, 0);
            deepStrictEqual([...diff.added.entries()], [...diff2.added.entries()], 'Swapping the order of the entries in the other collection should yield the same result');
        });
        test('should remove entries in the diff that come after a Replace', () => {
            const merged1 = new MergedEnvironmentVariableCollection(new Map([
                [
                    'ext1',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                { value: 'a1', type: EnvironmentVariableMutatorType.Replace, variable: 'A' },
                            ],
                        ]),
                    },
                ],
            ]));
            const merged4 = new MergedEnvironmentVariableCollection(new Map([
                [
                    'ext1',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                { value: 'a1', type: EnvironmentVariableMutatorType.Replace, variable: 'A' },
                            ],
                        ]),
                    },
                ],
                // This entry should get removed as it comes after a replace
                [
                    'ext2',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                { value: 'a2', type: EnvironmentVariableMutatorType.Append, variable: 'A' },
                            ],
                        ]),
                    },
                ],
            ]));
            const diff = merged1.diff(merged4, undefined);
            strictEqual(diff, undefined, 'Replace should ignore any entries after it');
        });
        test('should generate removed diffs', () => {
            const merged1 = new MergedEnvironmentVariableCollection(new Map([
                [
                    'ext1',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                { value: 'a', type: EnvironmentVariableMutatorType.Replace, variable: 'A' },
                            ],
                            ['B', { value: 'b', type: EnvironmentVariableMutatorType.Replace, variable: 'B' }],
                        ]),
                    },
                ],
            ]));
            const merged2 = new MergedEnvironmentVariableCollection(new Map([
                [
                    'ext1',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                { value: 'a', type: EnvironmentVariableMutatorType.Replace, variable: 'A' },
                            ],
                        ]),
                    },
                ],
            ]));
            const diff = merged1.diff(merged2, undefined);
            strictEqual(diff.changed.size, 0);
            strictEqual(diff.added.size, 0);
            deepStrictEqual([...diff.removed.entries()], [
                [
                    'B',
                    [
                        {
                            extensionIdentifier: 'ext1',
                            value: 'b',
                            type: EnvironmentVariableMutatorType.Replace,
                            variable: 'B',
                            options: undefined,
                        },
                    ],
                ],
            ]);
        });
        test('should generate changed diffs', () => {
            const merged1 = new MergedEnvironmentVariableCollection(new Map([
                [
                    'ext1',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                { value: 'a1', type: EnvironmentVariableMutatorType.Replace, variable: 'A' },
                            ],
                            ['B', { value: 'b', type: EnvironmentVariableMutatorType.Replace, variable: 'B' }],
                        ]),
                    },
                ],
            ]));
            const merged2 = new MergedEnvironmentVariableCollection(new Map([
                [
                    'ext1',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                { value: 'a2', type: EnvironmentVariableMutatorType.Replace, variable: 'A' },
                            ],
                            ['B', { value: 'b', type: EnvironmentVariableMutatorType.Append, variable: 'B' }],
                        ]),
                    },
                ],
            ]));
            const diff = merged1.diff(merged2, undefined);
            strictEqual(diff.added.size, 0);
            strictEqual(diff.removed.size, 0);
            deepStrictEqual([...diff.changed.entries()], [
                [
                    'A',
                    [
                        {
                            extensionIdentifier: 'ext1',
                            value: 'a2',
                            type: EnvironmentVariableMutatorType.Replace,
                            variable: 'A',
                            options: undefined,
                        },
                    ],
                ],
                [
                    'B',
                    [
                        {
                            extensionIdentifier: 'ext1',
                            value: 'b',
                            type: EnvironmentVariableMutatorType.Append,
                            variable: 'B',
                            options: undefined,
                        },
                    ],
                ],
            ]);
        });
        test('should generate diffs with added, changed and removed', () => {
            const merged1 = new MergedEnvironmentVariableCollection(new Map([
                [
                    'ext1',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                { value: 'a1', type: EnvironmentVariableMutatorType.Replace, variable: 'A' },
                            ],
                            ['B', { value: 'b', type: EnvironmentVariableMutatorType.Prepend, variable: 'B' }],
                        ]),
                    },
                ],
            ]));
            const merged2 = new MergedEnvironmentVariableCollection(new Map([
                [
                    'ext1',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                { value: 'a2', type: EnvironmentVariableMutatorType.Replace, variable: 'A' },
                            ],
                            ['C', { value: 'c', type: EnvironmentVariableMutatorType.Append, variable: 'C' }],
                        ]),
                    },
                ],
            ]));
            const diff = merged1.diff(merged2, undefined);
            deepStrictEqual([...diff.added.entries()], [
                [
                    'C',
                    [
                        {
                            extensionIdentifier: 'ext1',
                            value: 'c',
                            type: EnvironmentVariableMutatorType.Append,
                            variable: 'C',
                            options: undefined,
                        },
                    ],
                ],
            ]);
            deepStrictEqual([...diff.removed.entries()], [
                [
                    'B',
                    [
                        {
                            extensionIdentifier: 'ext1',
                            value: 'b',
                            type: EnvironmentVariableMutatorType.Prepend,
                            variable: 'B',
                            options: undefined,
                        },
                    ],
                ],
            ]);
            deepStrictEqual([...diff.changed.entries()], [
                [
                    'A',
                    [
                        {
                            extensionIdentifier: 'ext1',
                            value: 'a2',
                            type: EnvironmentVariableMutatorType.Replace,
                            variable: 'A',
                            options: undefined,
                        },
                    ],
                ],
            ]);
        });
        test('should only generate workspace specific diffs', () => {
            const scope1 = {
                workspaceFolder: { uri: URI.file('workspace1'), name: 'workspace1', index: 0 },
            };
            const scope2 = {
                workspaceFolder: { uri: URI.file('workspace2'), name: 'workspace2', index: 3 },
            };
            const merged1 = new MergedEnvironmentVariableCollection(new Map([
                [
                    'ext1',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                {
                                    value: 'a1',
                                    type: EnvironmentVariableMutatorType.Replace,
                                    scope: scope1,
                                    variable: 'A',
                                },
                            ],
                            ['B', { value: 'b', type: EnvironmentVariableMutatorType.Prepend, variable: 'B' }],
                        ]),
                    },
                ],
            ]));
            const merged2 = new MergedEnvironmentVariableCollection(new Map([
                [
                    'ext1',
                    {
                        map: deserializeEnvironmentVariableCollection([
                            [
                                'A-key',
                                {
                                    value: 'a2',
                                    type: EnvironmentVariableMutatorType.Replace,
                                    scope: scope1,
                                    variable: 'A',
                                },
                            ],
                            [
                                'C',
                                {
                                    value: 'c',
                                    type: EnvironmentVariableMutatorType.Append,
                                    scope: scope2,
                                    variable: 'C',
                                },
                            ],
                        ]),
                    },
                ],
            ]));
            const diff = merged1.diff(merged2, scope1);
            strictEqual(diff.added.size, 0);
            deepStrictEqual([...diff.removed.entries()], [
                [
                    'B',
                    [
                        {
                            extensionIdentifier: 'ext1',
                            value: 'b',
                            type: EnvironmentVariableMutatorType.Prepend,
                            variable: 'B',
                            options: undefined,
                        },
                    ],
                ],
            ]);
            deepStrictEqual([...diff.changed.entries()], [
                [
                    'A',
                    [
                        {
                            extensionIdentifier: 'ext1',
                            value: 'a2',
                            type: EnvironmentVariableMutatorType.Replace,
                            scope: scope1,
                            variable: 'A',
                            options: undefined,
                        },
                    ],
                ],
            ]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRWYXJpYWJsZUNvbGxlY3Rpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvdGVzdC9jb21tb24vZW52aXJvbm1lbnRWYXJpYWJsZUNvbGxlY3Rpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUMvRyxPQUFPLEVBQXVCLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLDBFQUEwRSxDQUFBO0FBQzlILE9BQU8sRUFDTixvQ0FBb0MsRUFDcEMsd0NBQXdDLEdBQ3hDLE1BQU0sc0VBQXNFLENBQUE7QUFDN0UsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxHLEtBQUssQ0FBQywyREFBMkQsRUFBRSxHQUFHLEVBQUU7SUFDdkUsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxLQUFLLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRTtRQUNsQixJQUFJLENBQUMsdUVBQXVFLEVBQUUsR0FBRyxFQUFFO1lBQ2xGLE1BQU0sTUFBTSxHQUFHLElBQUksbUNBQW1DLENBQ3JELElBQUksR0FBRyxDQUFDO2dCQUNQO29CQUNDLE1BQU07b0JBQ047d0JBQ0MsR0FBRyxFQUFFLHdDQUF3QyxDQUFDOzRCQUM3QztnQ0FDQyxPQUFPO2dDQUNQLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsOEJBQThCLENBQUMs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