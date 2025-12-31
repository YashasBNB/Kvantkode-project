/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { formatPII, getExactExpressionStartAndEnd, getVisibleAndSorted, } from '../../common/debugUtils.js';
suite('Debug - Utils', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('formatPII', () => {
        assert.strictEqual(formatPII('Foo Bar', false, {}), 'Foo Bar');
        assert.strictEqual(formatPII('Foo {key} Bar', false, {}), 'Foo {key} Bar');
        assert.strictEqual(formatPII('Foo {key} Bar', false, { key: 'yes' }), 'Foo yes Bar');
        assert.strictEqual(formatPII('Foo {_0} Bar {_0}', true, { _0: 'yes' }), 'Foo yes Bar yes');
        assert.strictEqual(formatPII('Foo {0} Bar {1}{2}', false, { '0': 'yes' }), 'Foo yes Bar {1}{2}');
        assert.strictEqual(formatPII('Foo {0} Bar {1}{2}', false, { '0': 'yes', '1': 'undefined' }), 'Foo yes Bar undefined{2}');
        assert.strictEqual(formatPII('Foo {_key0} Bar {key1}{key2}', true, { _key0: 'yes', key1: '5', key2: 'false' }), 'Foo yes Bar {key1}{key2}');
        assert.strictEqual(formatPII('Foo {_key0} Bar {key1}{key2}', false, { _key0: 'yes', key1: '5', key2: 'false' }), 'Foo yes Bar 5false');
        assert.strictEqual(formatPII('Unable to display threads:"{e}"', false, { e: 'detached from process' }), 'Unable to display threads:"detached from process"');
    });
    test('getExactExpressionStartAndEnd', () => {
        assert.deepStrictEqual(getExactExpressionStartAndEnd('foo', 1, 2), { start: 1, end: 3 });
        assert.deepStrictEqual(getExactExpressionStartAndEnd('foo', 1, 3), { start: 1, end: 3 });
        assert.deepStrictEqual(getExactExpressionStartAndEnd('foo', 1, 4), { start: 1, end: 3 });
        assert.deepStrictEqual(getExactExpressionStartAndEnd('this.name = "John"', 1, 10), {
            start: 1,
            end: 9,
        });
        assert.deepStrictEqual(getExactExpressionStartAndEnd('this.name = "John"', 6, 10), {
            start: 1,
            end: 9,
        });
        // Hovers over "address" should pick up this->address
        assert.deepStrictEqual(getExactExpressionStartAndEnd('this->address = "Main street"', 6, 10), {
            start: 1,
            end: 13,
        });
        // Hovers over "name" should pick up a.b.c.d.name
        assert.deepStrictEqual(getExactExpressionStartAndEnd('var t = a.b.c.d.name', 16, 20), {
            start: 9,
            end: 20,
        });
        assert.deepStrictEqual(getExactExpressionStartAndEnd('MyClass::StaticProp', 10, 20), {
            start: 1,
            end: 19,
        });
        assert.deepStrictEqual(getExactExpressionStartAndEnd('largeNumber = myVar?.prop', 21, 25), {
            start: 15,
            end: 25,
        });
        // For example in expression 'a.b.c.d', hover was under 'b', 'a.b' should be the exact range
        assert.deepStrictEqual(getExactExpressionStartAndEnd('var t = a.b.c.d.name', 11, 12), {
            start: 9,
            end: 11,
        });
        assert.deepStrictEqual(getExactExpressionStartAndEnd('var t = a.b;c.d.name', 16, 20), {
            start: 13,
            end: 20,
        });
        assert.deepStrictEqual(getExactExpressionStartAndEnd('var t = a.b.c-d.name', 16, 20), {
            start: 15,
            end: 20,
        });
        assert.deepStrictEqual(getExactExpressionStartAndEnd('var aøñéå文 = a.b.c-d.name', 5, 5), {
            start: 5,
            end: 10,
        });
        assert.deepStrictEqual(getExactExpressionStartAndEnd('aøñéå文.aøñéå文.aøñéå文', 9, 9), {
            start: 1,
            end: 13,
        });
    });
    test('config presentation', () => {
        const configs = [];
        configs.push({
            type: 'node',
            request: 'launch',
            name: 'p',
        });
        configs.push({
            type: 'node',
            request: 'launch',
            name: 'a',
        });
        configs.push({
            type: 'node',
            request: 'launch',
            name: 'b',
            presentation: {
                hidden: false,
            },
        });
        configs.push({
            type: 'node',
            request: 'launch',
            name: 'c',
            presentation: {
                hidden: true,
            },
        });
        configs.push({
            type: 'node',
            request: 'launch',
            name: 'd',
            presentation: {
                group: '2_group',
                order: 5,
            },
        });
        configs.push({
            type: 'node',
            request: 'launch',
            name: 'e',
            presentation: {
                group: '2_group',
                order: 52,
            },
        });
        configs.push({
            type: 'node',
            request: 'launch',
            name: 'f',
            presentation: {
                group: '1_group',
                order: 500,
            },
        });
        configs.push({
            type: 'node',
            request: 'launch',
            name: 'g',
            presentation: {
                group: '5_group',
                order: 500,
            },
        });
        configs.push({
            type: 'node',
            request: 'launch',
            name: 'h',
            presentation: {
                order: 700,
            },
        });
        configs.push({
            type: 'node',
            request: 'launch',
            name: 'i',
            presentation: {
                order: 1000,
            },
        });
        const sorted = getVisibleAndSorted(configs);
        assert.strictEqual(sorted.length, 9);
        assert.strictEqual(sorted[0].name, 'f');
        assert.strictEqual(sorted[1].name, 'd');
        assert.strictEqual(sorted[2].name, 'e');
        assert.strictEqual(sorted[3].name, 'g');
        assert.strictEqual(sorted[4].name, 'h');
        assert.strictEqual(sorted[5].name, 'i');
        assert.strictEqual(sorted[6].name, 'b');
        assert.strictEqual(sorted[7].name, 'p');
        assert.strictEqual(sorted[8].name, 'a');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdVdGlscy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvdGVzdC9icm93c2VyL2RlYnVnVXRpbHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsT0FBTyxFQUNOLFNBQVMsRUFDVCw2QkFBNkIsRUFDN0IsbUJBQW1CLEdBQ25CLE1BQU0sNEJBQTRCLENBQUE7QUFFbkMsS0FBSyxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7SUFDM0IsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRTtRQUN0QixNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLEVBQUUsZUFBZSxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsZUFBZSxFQUFFLEtBQUssRUFBRSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBQ3BGLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLG1CQUFtQixFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLENBQUE7UUFDMUYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsb0JBQW9CLEVBQUUsS0FBSyxFQUFFLEVB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