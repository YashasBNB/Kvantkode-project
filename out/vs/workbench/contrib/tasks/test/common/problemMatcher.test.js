/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as matchers from '../../common/problemMatcher.js';
import assert from 'assert';
import { ValidationStatus, } from '../../../../../base/common/parsers.js';
class ProblemReporter {
    constructor() {
        this._validationStatus = new ValidationStatus();
        this._messages = [];
    }
    info(message) {
        this._messages.push(message);
        this._validationStatus.state = 1 /* ValidationState.Info */;
    }
    warn(message) {
        this._messages.push(message);
        this._validationStatus.state = 2 /* ValidationState.Warning */;
    }
    error(message) {
        this._messages.push(message);
        this._validationStatus.state = 3 /* ValidationState.Error */;
    }
    fatal(message) {
        this._messages.push(message);
        this._validationStatus.state = 4 /* ValidationState.Fatal */;
    }
    hasMessage(message) {
        return this._messages.indexOf(message) !== null;
    }
    get messages() {
        return this._messages;
    }
    get state() {
        return this._validationStatus.state;
    }
    isOK() {
        return this._validationStatus.isOK();
    }
    get status() {
        return this._validationStatus;
    }
}
suite('ProblemPatternParser', () => {
    let reporter;
    let parser;
    const testRegexp = new RegExp('test');
    setup(() => {
        reporter = new ProblemReporter();
        parser = new matchers.ProblemPatternParser(reporter);
    });
    suite('single-pattern definitions', () => {
        test('parses a pattern defined by only a regexp', () => {
            const problemPattern = {
                regexp: 'test',
            };
            const parsed = parser.parse(problemPattern);
            assert(reporter.isOK());
            assert.deepStrictEqual(parsed, {
                regexp: testRegexp,
                kind: matchers.ProblemLocationKind.Location,
                file: 1,
                line: 2,
                character: 3,
                message: 0,
            });
        });
        test('does not sets defaults for line and character if kind is File', () => {
            const problemPattern = {
                regexp: 'test',
                kind: 'file',
            };
            const parsed = parser.parse(problemPattern);
            assert.deepStrictEqual(parsed, {
                regexp: testRegexp,
                kind: matchers.ProblemLocationKind.File,
                file: 1,
                message: 0,
            });
        });
    });
    suite('multi-pattern definitions', () => {
        test('defines a pattern based on regexp and property fields, with file/line location', () => {
            const problemPattern = [
                { regexp: 'test', file: 3, line: 4, column: 5, message: 6 },
            ];
            const parsed = parser.parse(problemPattern);
            assert(reporter.isOK());
            assert.deepStrictEqual(parsed, [
                {
                    regexp: testRegexp,
                    kind: matchers.ProblemLocationKind.Location,
                    file: 3,
                    line: 4,
                    character: 5,
                    message: 6,
                },
            ]);
        });
        test('defines a pattern bsaed on regexp and property fields, with location', () => {
            const problemPattern = [
                { regexp: 'test', file: 3, location: 4, message: 6 },
            ];
            const parsed = parser.parse(problemPattern);
            assert(reporter.isOK());
            assert.deepStrictEqual(parsed, [
                {
                    regexp: testRegexp,
                    kind: matchers.ProblemLocationKind.Location,
                    file: 3,
                    location: 4,
                    message: 6,
                },
            ]);
        });
        test('accepts a pattern that provides the fields from multiple entries', () => {
            const problemPattern = [
                { regexp: 'test', file: 3 },
                { regexp: 'test1', line: 4 },
                { regexp: 'test2', column: 5 },
                { regexp: 'test3', message: 6 },
            ];
            const parsed = parser.parse(problemPattern);
            assert(reporter.isOK());
            assert.deepStrictEqual(parsed, [
                { regexp: testRegexp, kind: matchers.ProblemLocationKind.Location, file: 3 },
                { regexp: new RegExp('test1'), line: 4 },
                { regexp: new RegExp('test2'), character: 5 },
                { regexp: new RegExp('test3'), message: 6 },
            ]);
        });
        test('forbids setting the loop flag outside of the last element in the array', () => {
            const problemPattern = [
                { regexp: 'test', file: 3, loop: true },
                { regexp: 'test1', line: 4 },
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The loop property is only supported on the last line matcher.'));
        });
        test('forbids setting the kind outside of the first element of the array', () => {
            const problemPattern = [
                { regexp: 'test', file: 3 },
                { regexp: 'test1', kind: 'file', line: 4 },
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is invalid. The kind property must be provided only in the first element'));
        });
        test('kind: Location requires a regexp', () => {
            const problemPattern = [
                { file: 0, line: 1, column: 20, message: 0 },
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is missing a regular expression.'));
        });
        test('kind: Location requires a regexp on every entry', () => {
            const problemPattern = [
                { regexp: 'test', file: 3 },
                { line: 4 },
                { regexp: 'test2', column: 5 },
                { regexp: 'test3', message: 6 },
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is missing a regular expression.'));
        });
        test('kind: Location requires a message', () => {
            const problemPattern = [
                { regexp: 'test', file: 0, line: 1, column: 20 },
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is invalid. It must have at least have a file and a message.'));
        });
        test('kind: Location requires a file', () => {
            const problemPattern = [
                { regexp: 'test', line: 1, column: 20, message: 0 },
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is invalid. It must either have kind: "file" or have a line or location match group.'));
        });
        test('kind: Location requires either a line or location', () => {
            const problemPattern = [
                { regexp: 'test', file: 1, column: 20, message: 0 },
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is invalid. It must either have kind: "file" or have a line or location match group.'));
        });
        test('kind: File accepts a regexp, file and message', () => {
            const problemPattern = [
                { regexp: 'test', file: 2, kind: 'file', message: 6 },
            ];
            const parsed = parser.parse(problemPattern);
            assert(reporter.isOK());
            assert.deepStrictEqual(parsed, [
                {
                    regexp: testRegexp,
                    kind: matchers.ProblemLocationKind.File,
                    file: 2,
                    message: 6,
                },
            ]);
        });
        test('kind: File requires a file', () => {
            const problemPattern = [
                { regexp: 'test', kind: 'file', message: 6 },
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is invalid. It must have at least have a file and a message.'));
        });
        test('kind: File requires a message', () => {
            const problemPattern = [
                { regexp: 'test', kind: 'file', file: 6 },
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is invalid. It must have at least have a file and a message.'));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvYmxlbU1hdGNoZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGFza3MvdGVzdC9jb21tb24vcHJvYmxlbU1hdGNoZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEtBQUssUUFBUSxNQUFNLGdDQUFnQyxDQUFBO0FBRTFELE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBR04sZ0JBQWdCLEdBQ2hCLE1BQU0sdUNBQXVDLENBQUE7QUFFOUMsTUFBTSxlQUFlO0lBSXBCO1FBQ0MsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksZ0JBQWdCLEVBQUUsQ0FBQTtRQUMvQyxJQUFJLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQTtJQUNwQixDQUFDO0lBRU0sSUFBSSxDQUFDLE9BQWU7UUFDMUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDNUIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssK0JBQXVCLENBQUE7SUFDcEQsQ0FBQztJQUVNLElBQUksQ0FBQyxPQUFlO1FBQzFCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQzVCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLGtDQUEwQixDQUFBO0lBQ3ZELENBQUM7SUFFTSxLQUFLLENBQUMsT0FBZTtRQUMzQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUM1QixJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxnQ0FBd0IsQ0FBQTtJQUNyRCxDQUFDO0lBRU0sS0FBSyxDQUFDLE9BQWU7UUFDM0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxD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