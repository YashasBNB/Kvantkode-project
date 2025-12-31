/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { parseEnvFile } from '../../common/envfile.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
import * as assert from 'assert';
/*
Test cases from https://github.com/motdotla/dotenv/blob/master/tests/.env

    Copyright (c) 2015, Scott Motte
    All rights reserved.

    Redistribution and use in source and binary forms, with or without
    modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice, this
        list of conditions and the following disclaimer.

    * Redistributions in binary form must reproduce the above copyright notice,
        this list of conditions and the following disclaimer in the documentation
        and/or other materials provided with the distribution.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
    AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
    IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
    DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
    FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
    DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
    SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
    CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
    OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
    OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
const example = `
BASIC=basic

# previous line intentionally left blank
AFTER_LINE=after_line
EMPTY=
EMPTY_SINGLE_QUOTES=''
EMPTY_DOUBLE_QUOTES=""
EMPTY_BACKTICKS=\`\`
SINGLE_QUOTES='single_quotes'
SINGLE_QUOTES_SPACED='    single quotes    '
DOUBLE_QUOTES="double_quotes"
DOUBLE_QUOTES_SPACED="    double quotes    "
DOUBLE_QUOTES_INSIDE_SINGLE='double "quotes" work inside single quotes'
DOUBLE_QUOTES_WITH_NO_SPACE_BRACKET="{ port: $MONGOLAB_PORT}"
SINGLE_QUOTES_INSIDE_DOUBLE="single 'quotes' work inside double quotes"
BACKTICKS_INSIDE_SINGLE='\`backticks\` work inside single quotes'
BACKTICKS_INSIDE_DOUBLE="\`backticks\` work inside double quotes"
BACKTICKS=\`backticks\`
BACKTICKS_SPACED=\`    backticks    \`
DOUBLE_QUOTES_INSIDE_BACKTICKS=\`double "quotes" work inside backticks\`
SINGLE_QUOTES_INSIDE_BACKTICKS=\`single 'quotes' work inside backticks\`
DOUBLE_AND_SINGLE_QUOTES_INSIDE_BACKTICKS=\`double "quotes" and single 'quotes' work inside backticks\`
EXPAND_NEWLINES="expand\\nnew\\nlines"
DONT_EXPAND_UNQUOTED=dontexpand\\nnewlines
DONT_EXPAND_SQUOTED='dontexpand\\nnewlines'
# COMMENTS=work
INLINE_COMMENTS=inline comments # work #very #well
INLINE_COMMENTS_SINGLE_QUOTES='inline comments outside of #singlequotes' # work
INLINE_COMMENTS_DOUBLE_QUOTES="inline comments outside of #doublequotes" # work
INLINE_COMMENTS_BACKTICKS=\`inline comments outside of #backticks\` # work
INLINE_COMMENTS_SPACE=inline comments start with a#number sign. no space required.
EQUAL_SIGNS=equals==
RETAIN_INNER_QUOTES={"foo": "bar"}
RETAIN_INNER_QUOTES_AS_STRING='{"foo": "bar"}'
RETAIN_INNER_QUOTES_AS_BACKTICKS=\`{"foo": "bar's"}\`
TRIM_SPACE_FROM_UNQUOTED=    some spaced out string
USERNAME=therealnerdybeast@example.tld
		SPACED_KEY = parsed
`;
suite('parseEnvFile', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('parses', () => {
        const parsed = parseEnvFile(example);
        assert.strictEqual(parsed.get('BASIC'), 'basic');
        assert.strictEqual(parsed.get('AFTER_LINE'), 'after_line');
        assert.strictEqual(parsed.get('EMPTY'), '');
        assert.strictEqual(parsed.get('EMPTY_SINGLE_QUOTES'), '');
        assert.strictEqual(parsed.get('EMPTY_DOUBLE_QUOTES'), '');
        assert.strictEqual(parsed.get('EMPTY_BACKTICKS'), '');
        assert.strictEqual(parsed.get('SINGLE_QUOTES'), 'single_quotes');
        assert.strictEqual(parsed.get('SINGLE_QUOTES_SPACED'), '    single quotes    ');
        assert.strictEqual(parsed.get('DOUBLE_QUOTES'), 'double_quotes');
        assert.strictEqual(parsed.get('DOUBLE_QUOTES_SPACED'), '    double quotes    ');
        assert.strictEqual(parsed.get('DOUBLE_QUOTES_INSIDE_SINGLE'), 'double "quotes" work inside single quotes');
        assert.strictEqual(parsed.get('DOUBLE_QUOTES_WITH_NO_SPACE_BRACKET'), '{ port: $MONGOLAB_PORT}');
        assert.strictEqual(parsed.get('SINGLE_QUOTES_INSIDE_DOUBLE'), "single 'quotes' work inside double quotes");
        assert.strictEqual(parsed.get('BACKTICKS_INSIDE_SINGLE'), '`backticks` work inside single quotes');
        assert.strictEqual(parsed.get('BACKTICKS_INSIDE_DOUBLE'), '`backticks` work inside double quotes');
        assert.strictEqual(parsed.get('BACKTICKS'), 'backticks');
        assert.strictEqual(parsed.get('BACKTICKS_SPACED'), '    backticks    ');
        assert.strictEqual(parsed.get('DOUBLE_QUOTES_INSIDE_BACKTICKS'), 'double "quotes" work inside backticks');
        assert.strictEqual(parsed.get('SINGLE_QUOTES_INSIDE_BACKTICKS'), "single 'quotes' work inside backticks");
        assert.strictEqual(parsed.get('DOUBLE_AND_SINGLE_QUOTES_INSIDE_BACKTICKS'), 'double "quotes" and single \'quotes\' work inside backticks');
        assert.strictEqual(parsed.get('EXPAND_NEWLINES'), 'expand\nnew\nlines');
        assert.strictEqual(parsed.get('DONT_EXPAND_UNQUOTED'), 'dontexpand\\nnewlines');
        assert.strictEqual(parsed.get('DONT_EXPAND_SQUOTED'), 'dontexpand\\nnewlines');
        assert.strictEqual(parsed.get('COMMENTS'), undefined);
        assert.strictEqual(parsed.get('INLINE_COMMENTS'), 'inline comments');
        assert.strictEqual(parsed.get('INLINE_COMMENTS_SINGLE_QUOTES'), 'inline comments outside of #singlequotes');
        assert.strictEqual(parsed.get('INLINE_COMMENTS_DOUBLE_QUOTES'), 'inline comments outside of #doublequotes');
        assert.strictEqual(parsed.get('INLINE_COMMENTS_BACKTICKS'), 'inline comments outside of #backticks');
        assert.strictEqual(parsed.get('INLINE_COMMENTS_SPACE'), 'inline comments start with a');
        assert.strictEqual(parsed.get('EQUAL_SIGNS'), 'equals==');
        assert.strictEqual(parsed.get('RETAIN_INNER_QUOTES'), '{"foo": "bar"}');
        assert.strictEqual(parsed.get('RETAIN_INNER_QUOTES_AS_STRING'), '{"foo": "bar"}');
        assert.strictEqual(parsed.get('RETAIN_INNER_QUOTES_AS_BACKTICKS'), '{"foo": "bar\'s"}');
        assert.strictEqual(parsed.get('TRIM_SPACE_FROM_UNQUOTED'), 'some spaced out string');
        assert.strictEqual(parsed.get('USERNAME'), 'therealnerdybeast@example.tld');
        assert.strictEqual(parsed.get('SPACED_KEY'), 'parsed');
        const payload = parseEnvFile('BUFFER=true');
        assert.strictEqual(payload.get('BUFFER'), 'true');
        const expectedPayload = Object.entries({
            SERVER: 'localhost',
            PASSWORD: 'password',
            DB: 'tests',
        });
        const RPayload = parseEnvFile('SERVER=localhost\rPASSWORD=password\rDB=tests\r');
        assert.deepStrictEqual([...RPayload], expectedPayload);
        const NPayload = parseEnvFile('SERVER=localhost\nPASSWORD=password\nDB=tests\n');
        assert.deepStrictEqual([...NPayload], expectedPayload);
        const RNPayload = parseEnvFile('SERVER=localhost\r\nPASSWORD=password\r\nDB=tests\r\n');
        assert.deepStrictEqual([...RNPayload], expectedPayload);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52ZmlsZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9lbnZmaWxlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3RELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUNwRSxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUVoQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7RUEwQkU7QUFFRixNQUFNLE9BQU8sR0FBRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBdUNmLENBQUE7QUFFRCxLQUFLLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtJQUMxQix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO1FBQ25CLE1BQU0sTUFBTSxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxHQUFH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