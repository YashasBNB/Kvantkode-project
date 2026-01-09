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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvblNjaGVtYS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL2pzb25TY2hlbWEudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLG9CQUFvQixFQUFlLE1BQU0sNEJBQTRCLENBQUE7QUFDOUUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBRXBFLEtBQUssQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO0lBQ3pCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLHdCQUF3QixFQUFFLEdBQUcsRUFBRTtRQUNuQyxNQUFNLE1BQU0sR0FBZ0I7WUFDM0IsSUFBSSxFQUFFLFFBQVE7WUFDZCxVQUFVLEVBQUU7Z0JBQ1gsQ0FBQyxFQUFFO29CQUNGLElBQUksRUFBRSxRQUFRO29CQUNkLFdBQVcsRUFBRSxHQUFHO29CQUNoQixVQUFVLEVBQUU7d0JBQ1gsQ0FBQyxFQUFFOzRCQUNGLElBQUksRUFBRSxRQUFROzRCQUNkLFVBQVUsRUFBRTtnQ0FDWCxDQUFDLEVBQUU7b0NBQ0YsSUFBSSxFQUFFLFFBQVE7b0NBQ2QsVUFBVSxFQUFFO3dDQUNYLENBQUMsRUFBRTs0Q0FDRixJQUFJLEVBQUUsUUFBUTt5Q0FDZDtxQ0FDRDtpQ0FDRDs2QkFDRDt5QkFDRDtxQkFDRDtpQkFDRDtnQkFDRCxDQUFDLEVBQUU7b0JBQ0YsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsV0FBVyxFQUFFLEdBQUc7b0JBQ2hCLFVBQVUsRUFBRTt3QkFDWCxDQUFDLEVBQUU7NEJBQ0YsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsVUFBVSxFQUFFO2dDQUNYLENBQUMsRUFBRTtvQ0FDRixJ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