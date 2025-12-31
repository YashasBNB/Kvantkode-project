/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { BracketElectricCharacterSupport, } from '../../../../common/languages/supports/electricCharacter.js';
import { RichEditBrackets } from '../../../../common/languages/supports/richEditBrackets.js';
import { createFakeScopedLineTokens } from '../../modesTestUtils.js';
const fakeLanguageId = 'test';
suite('Editor Modes - Auto Indentation', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function _testOnElectricCharacter(electricCharacterSupport, line, character, offset) {
        return electricCharacterSupport.onElectricCharacter(character, createFakeScopedLineTokens(line), offset);
    }
    function testDoesNothing(electricCharacterSupport, line, character, offset) {
        const actual = _testOnElectricCharacter(electricCharacterSupport, line, character, offset);
        assert.deepStrictEqual(actual, null);
    }
    function testMatchBracket(electricCharacterSupport, line, character, offset, matchOpenBracket) {
        const actual = _testOnElectricCharacter(electricCharacterSupport, line, character, offset);
        assert.deepStrictEqual(actual, { matchOpenBracket: matchOpenBracket });
    }
    test('getElectricCharacters uses all sources and dedups', () => {
        const sup = new BracketElectricCharacterSupport(new RichEditBrackets(fakeLanguageId, [
            ['{', '}'],
            ['(', ')'],
        ]));
        assert.deepStrictEqual(sup.getElectricCharacters(), ['}', ')']);
    });
    test('matchOpenBracket', () => {
        const sup = new BracketElectricCharacterSupport(new RichEditBrackets(fakeLanguageId, [
            ['{', '}'],
            ['(', ')'],
        ]));
        testDoesNothing(sup, [{ text: '\t{', type: 0 /* StandardTokenType.Other */ }], '\t', 1);
        testDoesNothing(sup, [{ text: '\t{', type: 0 /* StandardTokenType.Other */ }], '\t', 2);
        testDoesNothing(sup, [{ text: '\t\t', type: 0 /* StandardTokenType.Other */ }], '{', 3);
        testDoesNothing(sup, [{ text: '\t}', type: 0 /* StandardTokenType.Other */ }], '\t', 1);
        testDoesNothing(sup, [{ text: '\t}', type: 0 /* StandardTokenType.Other */ }], '\t', 2);
        testMatchBracket(sup, [{ text: '\t\t', type: 0 /* StandardTokenType.Other */ }], '}', 3, '}');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWxlY3RyaWNDaGFyYWN0ZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9tb2Rlcy9zdXBwb3J0cy9lbGVjdHJpY0NoYXJhY3Rlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxPQUFPLEVBQ04sK0JBQStCLEdBRS9CLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDNUYsT0FBTyxFQUFhLDBCQUEwQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFFL0UsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFBO0FBRTdCLEtBQUssQ0FBQyxpQ0FBaUMsRUFBRSxHQUFHLEVBQUU7SUFDN0MsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxTQUFTLHdCQUF3QixDQUNoQyx3QkFBeUQsRUFDekQsSUFBaUIsRUFDakIsU0FBaUIsRUFDakIsTUFBYztRQUVkLE9BQU8sd0JBQXdCLENBQUMsbUJBQW1CLENBQ2xELFNBQVMsRUFDVCwwQkFBMEIsQ0FBQyxJQUFJLENBQUMsRUFDaEMsTUFBTSxDQUNOLENBQUE7SUFDRixDQUFDO0lBRUQsU0FBUyxlQUFlLENBQ3ZCLHdCQUF5RCxFQUN6RCxJQUFpQixFQUNqQixTQUFpQixFQUNqQixNQUFjO1FBRWQsTUFBTSxNQUFNLEdBQUcsd0JBQXdCLENBQUMsd0JBQXdCLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUMxRixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUNyQyxDQUFDO0lBRUQsU0FBUyxnQkFBZ0IsQ0FDeEIsd0JBQXlELEVBQ3pELElBQWlCLEVBQ2pCLFNBQWlCLEVBQ2pCLE1BQWMsRUFDZCxnQkFBd0I7UUFFeEIsTUFBTSxNQUFNLEdBQUcsd0JBQXdCLENBQUMsd0JBQXdCLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUMxRixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxFQUFFLGdCQUFnQixFQUFFLGdCQUFnQixFQUFFLENBQUMsQ0FBQTtJQUN2RSxDQUFDO0lBRUQsSUFBSSxDQUFDLG1EQUFtRCxFQUFFLEdBQUcsRUFBRTtRQUM5RCxNQUFNLEdBQUcsR0FBRyxJQUFJLCtCQUErQixDQUM5QyxJQUFJLGdCQUFnQixDQUFDLGNBQWMsRUFBRTtZQUNwQyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7WUFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7U0FDVixDQUFDLENBQ0YsQ0FBQTtRQUVELE1BQU0sQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLHFCQUFxQixFQUFFLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUNoRSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7UUFDN0IsTUFBTSxHQUFHLEdBQUcsSUFBSSwrQkFBK0IsQ0FDOUMsSUFBSSxnQkFBZ0IsQ0FBQyxjQUFjLEVBQUU7WUFDcEMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO1lBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO1NBQ1YsQ0FBQyxDQUNGLENBQUE7UUFFRCxlQUFlLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksaUNBQXlCLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMvRSxlQUFlLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksaUNBQXlCLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMvRSxlQUFlLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksaUNBQXlCLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUUvRSxlQUFlLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksaUNBQXlCLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMvRSxlQUFlLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksaUNBQXlCLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMvRSxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxpQ0FBeUIsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtJQUN0RixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=