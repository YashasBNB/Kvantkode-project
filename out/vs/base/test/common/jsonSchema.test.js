/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { getCompressedContent } from '../../common/jsonSchema.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('JSON Schema', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('getCompressedContent 1', () => {
        const schema = {
            type: 'object',
            properties: {
                a: {
                    type: 'object',
                    description: 'a',
                    properties: {
                        b: {
                            type: 'object',
                            properties: {
                                c: {
                                    type: 'object',
                                    properties: {
                                        d: {
                                            type: 'string',
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                e: {
                    type: 'object',
                    description: 'e',
                    properties: {
                        b: {
                            type: 'object',
                            properties: {
                                c: {
                                    type: 'object',
                                    properties: {
                                        d: {
                                            type: 'string',
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        };
        const expected = {
            type: 'object',
            properties: {
                a: {
                    type: 'object',
                    description: 'a',
                    properties: {
                        b: {
                            $ref: '#/$defs/_0',
                        },
                    },
                },
                e: {
                    type: 'object',
                    description: 'e',
                    properties: {
                        b: {
                            $ref: '#/$defs/_0',
                        },
                    },
                },
            },
            $defs: {
                _0: {
                    type: 'object',
                    properties: {
                        c: {
                            type: 'object',
                            properties: {
                                d: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                },
            },
        };
        assert.deepEqual(getCompressedContent(schema), JSON.stringify(expected));
    });
    test('getCompressedContent 2', () => {
        const schema = {
            type: 'object',
            properties: {
                a: {
                    type: 'object',
                    properties: {
                        b: {
                            type: 'object',
                            properties: {
                                c: {
                                    type: 'object',
                                    properties: {
                                        d: {
                                            type: 'string',
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                e: {
                    type: 'object',
                    properties: {
                        b: {
                            type: 'object',
                            properties: {
                                c: {
                                    type: 'object',
                                    properties: {
                                        d: {
                                            type: 'string',
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        };
        const expected = {
            type: 'object',
            properties: {
                a: {
                    $ref: '#/$defs/_0',
                },
                e: {
                    $ref: '#/$defs/_0',
                },
            },
            $defs: {
                _0: {
                    type: 'object',
                    properties: {
                        b: {
                            type: 'object',
                            properties: {
                                c: {
                                    type: 'object',
                                    properties: {
                                        d: {
                                            type: 'string',
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        };
        assert.deepEqual(getCompressedContent(schema), JSON.stringify(expected));
    });
    test('getCompressedContent 3', () => {
        const schema = {
            type: 'object',
            properties: {
                a: {
                    type: 'object',
                    oneOf: [
                        {
                            allOf: [
                                {
                                    properties: {
                                        name: {
                                            type: 'string',
                                        },
                                        description: {
                                            type: 'string',
                                        },
                                    },
                                },
                                {
                                    properties: {
                                        street: {
                                            type: 'string',
                                        },
                                    },
                                },
                            ],
                        },
                        {
                            allOf: [
                                {
                                    properties: {
                                        name: {
                                            type: 'string',
                                        },
                                        description: {
                                            type: 'string',
                                        },
                                    },
                                },
                                {
                                    properties: {
                                        river: {
                                            type: 'string',
                                        },
                                    },
                                },
                            ],
                        },
                        {
                            allOf: [
                                {
                                    properties: {
                                        name: {
                                            type: 'string',
                                        },
                                        description: {
                                            type: 'string',
                                        },
                                    },
                                },
                                {
                                    properties: {
                                        mountain: {
                                            type: 'string',
                                        },
                                    },
                                },
                            ],
                        },
                    ],
                },
                b: {
                    type: 'object',
                    properties: {
                        street: {
                            properties: {
                                street: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                },
            },
        };
        const expected = {
            type: 'object',
            properties: {
                a: {
                    type: 'object',
                    oneOf: [
                        {
                            allOf: [
                                {
                                    $ref: '#/$defs/_0',
                                },
                                {
                                    $ref: '#/$defs/_1',
                                },
                            ],
                        },
                        {
                            allOf: [
                                {
                                    $ref: '#/$defs/_0',
                                },
                                {
                                    properties: {
                                        river: {
                                            type: 'string',
                                        },
                                    },
                                },
                            ],
                        },
                        {
                            allOf: [
                                {
                                    $ref: '#/$defs/_0',
                                },
                                {
                                    properties: {
                                        mountain: {
                                            type: 'string',
                                        },
                                    },
                                },
                            ],
                        },
                    ],
                },
                b: {
                    type: 'object',
                    properties: {
                        street: {
                            $ref: '#/$defs/_1',
                        },
                    },
                },
            },
            $defs: {
                _0: {
                    properties: {
                        name: {
                            type: 'string',
                        },
                        description: {
                            type: 'string',
                        },
                    },
                },
                _1: {
                    properties: {
                        street: {
                            type: 'string',
                        },
                    },
                },
            },
        };
        const actual = getCompressedContent(schema);
        assert.deepEqual(actual, JSON.stringify(expected));
    });
    test('getCompressedContent 4', () => {
        const schema = {
            type: 'object',
            properties: {
                a: {
                    type: 'object',
                    properties: {
                        b: {
                            type: 'object',
                            properties: {
                                c: {
                                    type: 'object',
                                    properties: {
                                        d: {
                                            type: 'string',
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                e: {
                    type: 'object',
                    properties: {
                        b: {
                            type: 'object',
                            properties: {
                                c: {
                                    type: 'object',
                                    properties: {
                                        d: {
                                            type: 'string',
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                f: {
                    type: 'object',
                    properties: {
                        d: {
                            type: 'string',
                        },
                    },
                },
            },
        };
        const expected = {
            type: 'object',
            properties: {
                a: {
                    $ref: '#/$defs/_0',
                },
                e: {
                    $ref: '#/$defs/_0',
                },
                f: {
                    $ref: '#/$defs/_1',
                },
            },
            $defs: {
                _0: {
                    type: 'object',
                    properties: {
                        b: {
                            type: 'object',
                            properties: {
                                c: {
                                    $ref: '#/$defs/_1',
                                },
                            },
                        },
                    },
                },
                _1: {
                    type: 'object',
                    properties: {
                        d: {
                            type: 'string',
                        },
                    },
                },
            },
        };
        assert.deepEqual(getCompressedContent(schema), JSON.stringify(expected));
    });
    test('getCompressedContent 5', () => {
        const schema = {
            type: 'object',
            properties: {
                a: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            c: {
                                type: 'object',
                                properties: {
                                    d: {
                                        type: 'string',
                                    },
                                },
                            },
                        },
                    },
                },
                e: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            c: {
                                type: 'object',
                                properties: {
                                    d: {
                                        type: 'string',
                                    },
                                },
                            },
                        },
                    },
                },
                f: {
                    type: 'object',
                    properties: {
                        b: {
                            type: 'object',
                            properties: {
                                c: {
                                    type: 'object',
                                    properties: {
                                        d: {
                                            type: 'string',
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                g: {
                    type: 'object',
                    properties: {
                        b: {
                            type: 'object',
                            properties: {
                                c: {
                                    type: 'object',
                                    properties: {
                                        d: {
                                            type: 'string',
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        };
        const expected = {
            type: 'object',
            properties: {
                a: {
                    $ref: '#/$defs/_0',
                },
                e: {
                    $ref: '#/$defs/_0',
                },
                f: {
                    $ref: '#/$defs/_1',
                },
                g: {
                    $ref: '#/$defs/_1',
                },
            },
            $defs: {
                _0: {
                    type: 'array',
                    items: {
                        $ref: '#/$defs/_2',
                    },
                },
                _1: {
                    type: 'object',
                    properties: {
                        b: {
                            $ref: '#/$defs/_2',
                        },
                    },
                },
                _2: {
                    type: 'object',
                    properties: {
                        c: {
                            type: 'object',
                            properties: {
                                d: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                },
            },
        };
        assert.deepEqual(getCompressedContent(schema), JSON.stringify(expected));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvblNjaGVtYS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9qc29uU2NoZW1hLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxvQkFBb0IsRUFBZSxNQUFNLDRCQUE0QixDQUFBO0FBQzlFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUVwRSxLQUFLLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtJQUN6Qix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7UUFDbkMsTUFBTSxNQUFNLEdBQWdCO1lBQzNCLElBQUksRUFBRSxRQUFRO1lBQ2QsVUFBVSxFQUFFO2dCQUNYLENBQUMsRUFBRTtvQkFDRixJQUFJLEVBQUUsUUFBUTtvQkFDZCxXQUFXLEVBQUUsR0FBRztvQkFDaEIsVUFBVSxFQUFFO3dCQUNYLENBQUMsRUFBRTs0QkFDRixJQUFJLEVBQUUsUUFBUTs0QkFDZCxVQUFVLEVBQUU7Z0NBQ1gsQ0FBQyxFQUFFO29DQUNGLElBQUksRUFBRSxRQUFRO29DQUNkLFVBQVUsRUFBRTt3Q0FDWCxDQUFDLEVBQUU7NENBQ0YsSUFBSSxFQUFFLFFBQVE7eUNBQ2Q7cUNBQ0Q7aUNBQ0Q7NkJBQ0Q7eUJBQ0Q7cUJBQ0Q7aUJBQ0Q7Z0JBQ0QsQ0FBQyxFQUFFO29CQUNGLElBQUksRUFBRSxRQUFRO29CQUNkLFdBQVcsRUFBRSxHQUFHO29CQUNoQixVQUFVLEVBQUU7d0JBQ1gsQ0FBQyxFQUFFOzRCQUNGLElBQUksRUFBRSxRQUFROzRCQUNkLFVBQVUsRUFBRTtnQ0FDWCxDQUFDLEVBQUU7b0NBQ0YsSUFBSSxFQUFFLFFBQVE7b0NBQ2QsVUFB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