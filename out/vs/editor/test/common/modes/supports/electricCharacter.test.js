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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWxlY3RyaWNDaGFyYWN0ZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL21vZGVzL3N1cHBvcnRzL2VsZWN0cmljQ2hhcmFjdGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxHLE9BQU8sRUFDTiwrQkFBK0IsR0FFL0IsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUM1RixPQUFPLEVBQWEsMEJBQTBCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUUvRSxNQUFNLGNBQWMsR0FBRyxNQUFNLENBQUE7QUFFN0IsS0FBSyxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRTtJQUM3Qyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLFNBQVMsd0JBQXdCLENBQ2hDLHdCQUF5RCxFQUN6RCxJQUFpQixFQUNqQixTQUFpQixFQUNqQixNQUFjO1FBRWQsT0FBTyx3QkFBd0IsQ0FBQyxtQkFBbUIsQ0FDbEQsU0FBUyxFQUNULDBCQUEwQixDQUFDLElBQUksQ0FBQyxFQUNoQyxNQUFNLENBQ04sQ0FBQTtJQUNGLENBQUM7SUFFRCxTQUFTLGVBQWUsQ0FDdkIsd0JBQXlELEVBQ3pELElBQWlCLEVBQ2pCLFNBQWlCLEVBQ2pCLE1BQWM7UUFFZCxNQUFNLE1BQU0sR0FBRyx3QkFBd0IsQ0FBQyx3QkFBd0IsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzFGLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ3JDLENBQUM7SUFFRCxTQUFTLGdCQUFnQixDQUN4Qix3QkFBeUQsRUFDekQsSUFBaUIsRUFDakIsU0FBaUIsRUFDakIsTUFBYyxFQUNkLGdCQUF3QjtRQUV4QixNQUFNLE1BQU0sR0FBRyx3QkFBd0IsQ0FBQyx3QkFBd0IsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzFGLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLEVBQUUsZ0JBQWdCLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFBO0lBQ3ZFLENBQUM7SUFFRCxJQUFJLENBQUMsbURBQW1ELEVBQUUsR0FBRyxFQUFFO1FBQzlELE1BQU0sR0FBRyxHQUFHLElBQUksK0JBQStCLENBQzlDLElBQUksZ0JBQWdCLENBQUMsY0FBYyxFQUFFO1lBQ3BDLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztZQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztTQUNWLENBQUMsQ0FDRixDQUFBO1FBRUQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQ2hFLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtRQUM3QixNQUFNLEdBQUcsR0FBRyxJQUFJLCtCQUErQixDQUM5QyxJQUFJLGdCQUFnQixDQUFDLGNBQWMsRUFBRTtZQUNwQyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7WUFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7U0FDVixDQUFDLENBQ0YsQ0FBQTtRQUVELGVBQWUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxpQ0FBeUIsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQy9FLGVBQWUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxpQ0FBeUIsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQy9FLGVBQWUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxpQ0FBeUIsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRS9FLGVBQWUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxpQ0FBeUIsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQy9FLGVBQWUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxpQ0FBeUIsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQy9FLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLGlDQUF5QixFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO0lBQ3RGLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==