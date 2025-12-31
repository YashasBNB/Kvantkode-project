/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { stub, useFakeTimers } from 'sinon';
import { Emitter } from '../../../../../../base/common/event.js';
import { PredictionStats, TypeAheadAddon, } from '../../browser/terminalTypeAheadAddon.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { DEFAULT_LOCAL_ECHO_EXCLUDE, } from '../../common/terminalTypeAheadConfiguration.js';
const CSI = `\x1b[`;
var CursorMoveDirection;
(function (CursorMoveDirection) {
    CursorMoveDirection["Back"] = "D";
    CursorMoveDirection["Forwards"] = "C";
})(CursorMoveDirection || (CursorMoveDirection = {}));
suite('Workbench - Terminal Typeahead', () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    suite('PredictionStats', () => {
        let stats;
        let add;
        let succeed;
        let fail;
        setup(() => {
            add = ds.add(new Emitter());
            succeed = ds.add(new Emitter());
            fail = ds.add(new Emitter());
            stats = ds.add(new PredictionStats({
                onPredictionAdded: add.event,
                onPredictionSucceeded: succeed.event,
                onPredictionFailed: fail.event,
            }));
        });
        test('creates sane data', () => {
            const stubs = createPredictionStubs(5);
            const clock = useFakeTimers();
            try {
                for (const s of stubs) {
                    add.fire(s);
                }
                for (let i = 0; i < stubs.length; i++) {
                    clock.tick(100);
                    (i % 2 ? fail : succeed).fire(stubs[i]);
                }
                assert.strictEqual(stats.accuracy, 3 / 5);
                assert.strictEqual(stats.sampleSize, 5);
                assert.deepStrictEqual(stats.latency, {
                    count: 3,
                    min: 100,
                    max: 500,
                    median: 300,
                });
            }
            finally {
                clock.restore();
            }
        });
        test('circular buffer', () => {
            const bufferSize = 24;
            const stubs = createPredictionStubs(bufferSize * 2);
            for (const s of stubs.slice(0, bufferSize)) {
                add.fire(s);
                succeed.fire(s);
            }
            assert.strictEqual(stats.accuracy, 1);
            for (const s of stubs.slice(bufferSize, (bufferSize * 3) / 2)) {
                add.fire(s);
                fail.fire(s);
            }
            assert.strictEqual(stats.accuracy, 0.5);
            for (const s of stubs.slice((bufferSize * 3) / 2)) {
                add.fire(s);
                fail.fire(s);
            }
            assert.strictEqual(stats.accuracy, 0);
        });
    });
    suite('timeline', () => {
        let onBeforeProcessData;
        let publicLog;
        let config;
        let addon;
        const predictedHelloo = [
            `${CSI}?25l`, // hide cursor
            `${CSI}2;7H`, // move cursor
            'o', // new character
            `${CSI}2;8H`, // place cursor back at end of line
            `${CSI}?25h`, // show cursor
        ].join('');
        const expectProcessed = (input, output) => {
            const evt = { data: input };
            onBeforeProcessData.fire(evt);
            assert.strictEqual(JSON.stringify(evt.data), JSON.stringify(output));
        };
        setup(() => {
            onBeforeProcessData = ds.add(new Emitter());
            config = upcastPartial({
                localEchoStyle: 'italic',
                localEchoLatencyThreshold: 0,
                localEchoExcludePrograms: DEFAULT_LOCAL_ECHO_EXCLUDE,
            });
            publicLog = stub();
            addon = new TestTypeAheadAddon(upcastPartial({ onBeforeProcessData: onBeforeProcessData.event }), new TestConfigurationService({ terminal: { integrated: { ...config } } }), upcastPartial({ publicLog }));
            addon.unlockMakingPredictions();
        });
        teardown(() => {
            addon.dispose();
        });
        test('predicts a single character', () => {
            const t = ds.add(createMockTerminal({ lines: ['hello|'] }));
            addon.activate(t.terminal);
            t.onData('o');
            t.expectWritten(`${CSI}3mo${CSI}23m`);
        });
        test('validates character prediction', () => {
            const t = ds.add(createMockTerminal({ lines: ['hello|'] }));
            addon.activate(t.terminal);
            t.onData('o');
            expectProcessed('o', predictedHelloo);
            assert.strictEqual(addon.stats?.accuracy, 1);
        });
        test('validates zsh prediction (#112842)', () => {
            const t = ds.add(createMockTerminal({ lines: ['hello|'] }));
            addon.activate(t.terminal);
            t.onData('o');
            expectProcessed('o', predictedHelloo);
            t.onData('x');
            expectProcessed('\box', [
                `${CSI}?25l`, // hide cursor
                `${CSI}2;8H`, // move cursor
                '\box', // new data
                `${CSI}2;9H`, // place cursor back at end of line
                `${CSI}?25h`, // show cursor
            ].join(''));
            assert.strictEqual(addon.stats?.accuracy, 1);
        });
        test('does not validate zsh prediction on differing lookbehindn (#112842)', () => {
            const t = ds.add(createMockTerminal({ lines: ['hello|'] }));
            addon.activate(t.terminal);
            t.onData('o');
            expectProcessed('o', predictedHelloo);
            t.onData('x');
            expectProcessed('\bqx', [
                `${CSI}?25l`, // hide cursor
                `${CSI}2;8H`, // move cursor cursor
                `${CSI}X`, // delete character
                `${CSI}0m`, // reset style
                '\bqx', // new data
                `${CSI}?25h`, // show cursor
            ].join(''));
            assert.strictEqual(addon.stats?.accuracy, 0.5);
        });
        test('rolls back character prediction', () => {
            const t = ds.add(createMockTerminal({ lines: ['hello|'] }));
            addon.activate(t.terminal);
            t.onData('o');
            expectProcessed('q', [
                `${CSI}?25l`, // hide cursor
                `${CSI}2;7H`, // move cursor cursor
                `${CSI}X`, // delete character
                `${CSI}0m`, // reset style
                'q', // new character
                `${CSI}?25h`, // show cursor
            ].join(''));
            assert.strictEqual(addon.stats?.accuracy, 0);
        });
        test('handles left arrow when we hit the boundary', () => {
            const t = ds.add(createMockTerminal({ lines: ['|'] }));
            addon.activate(t.terminal);
            addon.unlockNavigating();
            const cursorXBefore = addon.physicalCursor(t.terminal.buffer.active)?.x;
            t.onData(`${CSI}${"D" /* CursorMoveDirection.Back */}`);
            t.expectWritten('');
            // Trigger rollback because we don't expect this data
            onBeforeProcessData.fire({ data: 'xy' });
            assert.strictEqual(addon.physicalCursor(t.terminal.buffer.active)?.x, 
            // The cursor should not have changed because we've hit the
            // boundary (start of prompt)
            cursorXBefore);
        });
        test('handles right arrow when we hit the boundary', () => {
            const t = ds.add(createMockTerminal({ lines: ['|'] }));
            addon.activate(t.terminal);
            addon.unlockNavigating();
            const cursorXBefore = addon.physicalCursor(t.terminal.buffer.active)?.x;
            t.onData(`${CSI}${"C" /* CursorMoveDirection.Forwards */}`);
            t.expectWritten('');
            // Trigger rollback because we don't expect this data
            onBeforeProcessData.fire({ data: 'xy' });
            assert.strictEqual(addon.physicalCursor(t.terminal.buffer.active)?.x, 
            // The cursor should not have changed because we've hit the
            // boundary (end of prompt)
            cursorXBefore);
        });
        test('internal cursor state is reset when all predictions are undone', () => {
            const t = ds.add(createMockTerminal({ lines: ['|'] }));
            addon.activate(t.terminal);
            addon.unlockNavigating();
            const cursorXBefore = addon.physicalCursor(t.terminal.buffer.active)?.x;
            t.onData(`${CSI}${"D" /* CursorMoveDirection.Back */}`);
            t.expectWritten('');
            addon.undoAllPredictions();
            assert.strictEqual(addon.physicalCursor(t.terminal.buffer.active)?.x, 
            // The cursor should not have changed because we've hit the
            // boundary (start of prompt)
            cursorXBefore);
        });
        test('restores cursor graphics mode', () => {
            const t = ds.add(createMockTerminal({
                lines: ['hello|'],
                cursorAttrs: {
                    isAttributeDefault: false,
                    isBold: true,
                    isFgPalette: true,
                    getFgColor: 1,
                },
            }));
            addon.activate(t.terminal);
            t.onData('o');
            expectProcessed('q', [
                `${CSI}?25l`, // hide cursor
                `${CSI}2;7H`, // move cursor cursor
                `${CSI}X`, // delete character
                `${CSI}1;38;5;1m`, // reset style
                'q', // new character
                `${CSI}?25h`, // show cursor
            ].join(''));
            assert.strictEqual(addon.stats?.accuracy, 0);
        });
        test('validates against and applies graphics mode on predicted', () => {
            const t = ds.add(createMockTerminal({ lines: ['hello|'] }));
            addon.activate(t.terminal);
            t.onData('o');
            expectProcessed(`${CSI}4mo`, [
                `${CSI}?25l`, // hide cursor
                `${CSI}2;7H`, // move cursor
                `${CSI}4m`, // new PTY's style
                'o', // new character
                `${CSI}2;8H`, // place cursor back at end of line
                `${CSI}?25h`, // show cursor
            ].join(''));
            assert.strictEqual(addon.stats?.accuracy, 1);
        });
        test('ignores cursor hides or shows', () => {
            const t = ds.add(createMockTerminal({ lines: ['hello|'] }));
            addon.activate(t.terminal);
            t.onData('o');
            expectProcessed(`${CSI}?25lo${CSI}?25h`, [
                `${CSI}?25l`, // hide cursor from PTY
                `${CSI}?25l`, // hide cursor
                `${CSI}2;7H`, // move cursor
                'o', // new character
                `${CSI}?25h`, // show cursor from PTY
                `${CSI}2;8H`, // place cursor back at end of line
                `${CSI}?25h`, // show cursor
            ].join(''));
            assert.strictEqual(addon.stats?.accuracy, 1);
        });
        test('matches backspace at EOL (bash style)', () => {
            const t = ds.add(createMockTerminal({ lines: ['hello|'] }));
            addon.activate(t.terminal);
            t.onData('\x7F');
            expectProcessed(`\b${CSI}K`, `\b${CSI}K`);
            assert.strictEqual(addon.stats?.accuracy, 1);
        });
        test('matches backspace at EOL (zsh style)', () => {
            const t = ds.add(createMockTerminal({ lines: ['hello|'] }));
            addon.activate(t.terminal);
            t.onData('\x7F');
            expectProcessed('\b \b', '\b \b');
            assert.strictEqual(addon.stats?.accuracy, 1);
        });
        test('gradually matches backspace', () => {
            const t = ds.add(createMockTerminal({ lines: ['hello|'] }));
            addon.activate(t.terminal);
            t.onData('\x7F');
            expectProcessed('\b', '');
            expectProcessed(' \b', '\b \b');
            assert.strictEqual(addon.stats?.accuracy, 1);
        });
        test('restores old character after invalid backspace', () => {
            const t = ds.add(createMockTerminal({ lines: ['hel|lo'] }));
            addon.activate(t.terminal);
            addon.unlockNavigating();
            t.onData('\x7F');
            t.expectWritten(`${CSI}2;4H${CSI}X`);
            expectProcessed('x', `${CSI}?25l${CSI}0ml${CSI}2;5H${CSI}0mx${CSI}?25h`);
            assert.strictEqual(addon.stats?.accuracy, 0);
        });
        test('waits for validation before deleting to left of cursor', () => {
            const t = ds.add(createMockTerminal({ lines: ['hello|'] }));
            addon.activate(t.terminal);
            // initially should not backspace (until the server confirms it)
            t.onData('\x7F');
            t.expectWritten('');
            expectProcessed('\b \b', '\b \b');
            t.cursor.x--;
            // enter input on the column...
            t.onData('o');
            onBeforeProcessData.fire({ data: 'o' });
            t.cursor.x++;
            t.clearWritten();
            // now that the column is 'unlocked', we should be able to predict backspace on it
            t.onData('\x7F');
            t.expectWritten(`${CSI}2;6H${CSI}X`);
        });
        test('waits for first valid prediction on a line', () => {
            const t = ds.add(createMockTerminal({ lines: ['hello|'] }));
            addon.lockMakingPredictions();
            addon.activate(t.terminal);
            t.onData('o');
            t.expectWritten('');
            expectProcessed('o', 'o');
            t.onData('o');
            t.expectWritten(`${CSI}3mo${CSI}23m`);
        });
        test('disables on title change', () => {
            const t = ds.add(createMockTerminal({ lines: ['hello|'] }));
            addon.activate(t.terminal);
            addon.reevaluateNow();
            assert.strictEqual(addon.isShowing, true, 'expected to show initially');
            t.onTitleChange.fire('foo - VIM.exe');
            addon.reevaluateNow();
            assert.strictEqual(addon.isShowing, false, 'expected to hide when vim is open');
            t.onTitleChange.fire('foo - git.exe');
            addon.reevaluateNow();
            assert.strictEqual(addon.isShowing, true, 'expected to show again after vim closed');
        });
        test('adds line wrap prediction even if behind a boundary', () => {
            const t = ds.add(createMockTerminal({ lines: ['hello|'] }));
            addon.lockMakingPredictions();
            addon.activate(t.terminal);
            t.onData('hi'.repeat(50));
            t.expectWritten('');
            expectProcessed('hi', [
                `${CSI}?25l`, // hide cursor
                'hi', // this greeting characters
                ...new Array(36).fill(`${CSI}3mh${CSI}23m${CSI}3mi${CSI}23m`), // rest of the greetings that fit on this line
                `${CSI}2;81H`, // move to end of line
                `${CSI}?25h`,
            ].join(''));
        });
    });
});
class TestTypeAheadAddon extends TypeAheadAddon {
    unlockMakingPredictions() {
        this._lastRow = { y: 1, startingX: 100, endingX: 100, charState: 2 /* CharPredictState.Validated */ };
    }
    lockMakingPredictions() {
        this._lastRow = undefined;
    }
    unlockNavigating() {
        this._lastRow = { y: 1, startingX: 1, endingX: 1, charState: 2 /* CharPredictState.Validated */ };
    }
    reevaluateNow() {
        this._reevaluatePredictorStateNow(this.stats, this._timeline);
    }
    get isShowing() {
        return !!this._timeline?.isShowingPredictions;
    }
    undoAllPredictions() {
        this._timeline?.undoAllPredictions();
    }
    physicalCursor(buffer) {
        return this._timeline?.physicalCursor(buffer);
    }
    tentativeCursor(buffer) {
        return this._timeline?.tentativeCursor(buffer);
    }
}
function upcastPartial(v) {
    return v;
}
function createPredictionStubs(n) {
    return new Array(n).fill(0).map(stubPrediction);
}
function stubPrediction() {
    return {
        apply: () => '',
        rollback: () => '',
        matches: () => 0,
        rollForwards: () => '',
    };
}
function createMockTerminal({ lines, cursorAttrs }) {
    const ds = new DisposableStore();
    const written = [];
    const cursor = { y: 1, x: 1 };
    const onTitleChange = ds.add(new Emitter());
    const onData = ds.add(new Emitter());
    const csiEmitter = ds.add(new Emitter());
    for (let y = 0; y < lines.length; y++) {
        const line = lines[y];
        if (line.includes('|')) {
            cursor.y = y + 1;
            cursor.x = line.indexOf('|') + 1;
            lines[y] = line.replace('|', ''); // CodeQL [SM02383] replacing the first occurrence is intended
            break;
        }
    }
    return {
        written,
        cursor,
        expectWritten: (s) => {
            assert.strictEqual(JSON.stringify(written.join('')), JSON.stringify(s));
            written.splice(0, written.length);
        },
        clearWritten: () => written.splice(0, written.length),
        onData: (s) => onData.fire(s),
        csiEmitter,
        onTitleChange,
        dispose: () => ds.dispose(),
        terminal: {
            cols: 80,
            rows: 5,
            onResize: new Emitter().event,
            onData: onData.event,
            onTitleChange: onTitleChange.event,
            parser: {
                registerCsiHandler(_, callback) {
                    ds.add(csiEmitter.event(callback));
                },
            },
            write(line) {
                written.push(line);
            },
            _core: {
                _inputHandler: {
                    _curAttrData: mockCell('', cursorAttrs),
                },
                writeSync() { },
            },
            buffer: {
                active: {
                    type: 'normal',
                    baseY: 0,
                    get cursorY() {
                        return cursor.y;
                    },
                    get cursorX() {
                        return cursor.x;
                    },
                    getLine(y) {
                        const s = lines[y - 1] || '';
                        return {
                            length: s.length,
                            getCell: (x) => mockCell(s[x - 1] || ''),
                            translateToString: (trim, start = 0, end = s.length) => {
                                const out = s.slice(start, end);
                                return trim ? out.trimRight() : out;
                            },
                        };
                    },
                },
            },
        },
    };
}
function mockCell(char, attrs = {}) {
    return new Proxy({}, {
        get(_, prop) {
            if (typeof prop === 'string' && attrs.hasOwnProperty(prop)) {
                return () => attrs[prop];
            }
            switch (prop) {
                case 'getWidth':
                    return () => 1;
                case 'getChars':
                    return () => char;
                case 'getCode':
                    return () => char.charCodeAt(0) || 0;
                case 'isAttributeDefault':
                    return () => true;
                default:
                    return String(prop).startsWith('is') ? () => false : () => 0;
            }
        },
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxUeXBlQWhlYWQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi90eXBlQWhlYWQvdGVzdC9icm93c2VyL3Rlcm1pbmFsVHlwZUFoZWFkLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBRTNCLE9BQU8sRUFBYSxJQUFJLEVBQUUsYUFBYSxFQUFFLE1BQU0sT0FBTyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNoRSxPQUFPLEVBR04sZUFBZSxFQUNmLGNBQWMsR0FDZCxNQUFNLHlDQUF5QyxDQUFBO0FBTWhELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtGQUFrRixDQUFBO0FBQzNILE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM1RSxPQUFPLEVBQ04sMEJBQTBCLEdBRTFCLE1BQU0sZ0RBQWdELENBQUE7QUFFdkQsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFBO0FBRW5CLElBQVcsbUJBR1Y7QUFIRCxXQUFXLG1CQUFtQjtJQUM3QixpQ0FBVSxDQUFBO0lBQ1YscUNBQWMsQ0FBQTtBQUNmLENBQUMsRUFIVSxtQkFBbUIsS0FBbkIsbUJBQW1CLFFBRzdCO0FBRUQsS0FBSyxDQUFDLGdDQUFnQyxFQUFFLEdBQUcsRUFBRTtJQUM1QyxNQUFNLEVBQUUsR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXBELEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7UUFDN0IsSUFBSSxLQUFzQixDQUFBO1FBQzFCLElBQUksR0FBeUIsQ0FBQTtRQUM3QixJQUFJLE9BQTZCLENBQUE7UUFDakMsSUFBSSxJQUEwQixDQUFBO1FBRTlCLEtBQUssQ0FBQyxHQUFHLEVBQUU7WUFDVixHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLE9BQU8sRUFBZSxDQUFDLENBQUE7WUFDeEMsT0FBTyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxPQUFPLEVBQWUsQ0FBQyxDQUFBO1lBQzVDLElBQUksR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksT0FBTyxFQUFlLENBQUMsQ0FBQTtZQUV6QyxLQUFLLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FDYixJQUFJLGVBQWUsQ0FBQztnQkFDbkIsaUJBQWlCLEVBQUUsR0FBRyxDQUFDLEtBQUs7Z0JBQzVCLHFCQUFxQixFQUFFLE9BQU8sQ0FBQyxLQUFLO2dCQUNwQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsS0FBSzthQUN2QixDQUFDLENBQ1QsQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtZQUM5QixNQUFNLEtBQUssR0FBRyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN0QyxNQUFNLEtBQUssR0FBRyxhQUFhLEVBQUUsQ0FBQTtZQUM3QixJQUFJLENBQUM7Z0JBQ0osS0FBSyxNQUFNLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQztvQkFDdkIsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDWixDQUFDO2dCQUVELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQ3ZDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQ2Q7b0JBQUEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDekMsQ0FBQztnQkFFRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO2dCQUN6QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ3ZDLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRTtvQkFDckMsS0FBSyxFQUFFLENBQUM7b0JBQ1IsR0FBRyxFQUFFLEdBQUc7b0JBQ1IsR0FBRyxFQUFFLEdBQUc7b0JBQ1IsTUFBTSxFQUFFLEdBQUc7aUJBQ1gsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztvQkFBUyxDQUFDO2dCQUNWLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUNoQixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO1lBQzVCLE1BQU0sVUFBVSxHQUFHLEVBQUUsQ0FBQTtZQUNyQixNQUFNLEtBQUssR0FBRyxxQkFBcUIsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFFbkQsS0FBSyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDO2dCQUM1QyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNYLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDaEIsQ0FBQztZQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUVyQyxLQUFLLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQy9ELEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ1gsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNiLENBQUM7WUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFFdkMsS0FBSyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ25ELEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ1gsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNiLENBQUM7WUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdEMsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLEtBQUssQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFO1FBQ3RCLElBQUksbUJBQXFELENBQUE7UUFDekQsSUFBSSxTQUFvQixDQUFBO1FBQ3hCLElBQUksTUFBdUMsQ0FBQTtRQUMzQyxJQUFJLEtBQXlCLENBQUE7UUFFN0IsTUFBTSxlQUFlLEdBQUc7WUFDdkIsR0FBRyxHQUFHLE1BQU0sRUFBRSxjQUFjO1lBQzVCLEdBQUcsR0FBRyxNQUFNLEVBQUUsY0FBYztZQUM1QixHQUFHLEVBQUUsZ0JBQWdCO1lBQ3JCLEdBQUcsR0FBRyxNQUFNLEVBQUUsbUNBQW1DO1lBQ2pELEdBQUcsR0FBRyxNQUFNLEVBQUUsY0FBYztTQUM1QixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUVWLE1BQU0sZUFBZSxHQUFHLENBQUMsS0FBYSxFQUFFLE1BQWMsRUFBRSxFQUFFO1lBQ3pELE1BQU0sR0FBRyxHQUFHLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFBO1lBQzNCLG1CQUFtQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUM3QixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUNyRSxDQUFDLENBQUE7UUFFRCxLQUFLLENBQUMsR0FBRyxFQUFFO1lBQ1YsbUJBQW1CLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLE9BQU8sRUFBMkIsQ0FBQyxDQUFBO1lBQ3BFLE1BQU0sR0FBRyxhQUFhLENBQWtDO2dCQUN2RCxjQUFjLEVBQUUsUUFBUTtnQkFDeEIseUJBQXlCLEVBQUUsQ0FBQztnQkFDNUIsd0JBQXdCLEVBQUUsMEJBQTBCO2FBQ3BELENBQUMsQ0FBQTtZQUNGLFNBQVMsR0FBRyxJQUFJLEVBQUUsQ0FBQTtZQUNsQixLQUFLLEdBQUcsSUFBSSxrQkFBa0IsQ0FDN0IsYUFBYSxDQUEwQixFQUFFLG1CQUFtQixFQUFFLG1CQUFtQixDQUFDLEtBQUssRUFBRSxDQUFDLEVBQzFGLElBQUksd0JBQXdCLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxVQUFVLEVBQUUsRUFBRSxHQUFHLE1BQU0sRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUN6RSxhQUFhLENBQW9CLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FDL0MsQ0FBQTtZQUNELEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxDQUFBO1FBQ2hDLENBQUMsQ0FBQyxDQUFBO1FBRUYsUUFBUSxDQUFDLEdBQUcsRUFBRTtZQUNiLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNoQixDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLEVBQUU7WUFDeEMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzNELEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQzFCLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDYixDQUFDLENBQUMsYUFBYSxDQUFDLEdBQUcsR0FBRyxNQUFNLEdBQUcsS0FBSyxDQUFDLENBQUE7UUFDdEMsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsZ0NBQWdDLEVBQUUsR0FBRyxFQUFFO1lBQzNDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMzRCxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUMxQixDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ2IsZUFBZSxDQUFDLEdBQUcsRUFBRSxlQUFlLENBQUMsQ0FBQTtZQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzdDLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLG9DQUFvQyxFQUFFLEdBQUcsRUFBRTtZQUMvQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDM0QsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDMUIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNiLGVBQWUsQ0FBQyxHQUFHLEVBQUUsZUFBZSxDQUFDLENBQUE7WUFFckMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNiLGVBQWUsQ0FDZCxNQUFNLEVBQ047Z0JBQ0MsR0FBRyxHQUFHLE1BQU0sRUFBRSxjQUFjO2dCQUM1QixHQUFHLEdBQUcsTUFBTSxFQUFFLGNBQWM7Z0JBQzVCLE1BQU0sRUFBRSxXQUFXO2dCQUNuQixHQUFHLEdBQUcsTUFBTSxFQUFFLG1DQUFtQztnQkFDakQsR0FBRyxHQUFHLE1BQU0sRUFBRSxjQUFjO2FBQzVCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUNWLENBQUE7WUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzdDLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLHFFQUFxRSxFQUFFLEdBQUcsRUFBRTtZQUNoRixNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDM0QsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDMUIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNiLGVBQWUsQ0FBQyxHQUFHLEVBQUUsZUFBZSxDQUFDLENBQUE7WUFFckMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNiLGVBQWUsQ0FDZCxNQUFNLEVBQ047Z0JBQ0MsR0FBRyxHQUFHLE1BQU0sRUFBRSxjQUFjO2dCQUM1QixHQUFHLEdBQUcsTUFBTSxFQUFFLHFCQUFxQjtnQkFDbkMsR0FBRyxHQUFHLEdBQUcsRUFBRSxtQkFBbUI7Z0JBQzlCLEdBQUcsR0FBRyxJQUFJLEVBQUUsY0FBYztnQkFDMUIsTUFBTSxFQUFFLFdBQVc7Z0JBQ25CLEdBQUcsR0FBRyxNQUFNLEVBQUUsY0FBYzthQUM1QixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FDVixDQUFBO1lBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUMvQyxDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxHQUFHLEVBQUU7WUFDNUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzNELEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQzFCLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7WUFFYixlQUFlLENBQ2QsR0FBRyxFQUNIO2dCQUNDLEdBQUcsR0FBRyxNQUFNLEVBQUUsY0FBYztnQkFDNUIsR0FBRyxHQUFHLE1BQU0sRUFBRSxxQkFBcUI7Z0JBQ25DLEdBQUcsR0FBRyxHQUFHLEVBQUUsbUJBQW1CO2dCQUM5QixHQUFHLEdBQUcsSUFBSSxFQUFFLGNBQWM7Z0JBQzFCLEdBQUcsRUFBRSxnQkFBZ0I7Z0JBQ3JCLEdBQUcsR0FBRyxNQUFNLEVBQUUsY0FBYzthQUM1QixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FDVixDQUFBO1lBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM3QyxDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyw2Q0FBNkMsRUFBRSxHQUFHLEVBQUU7WUFDeEQsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3RELEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQzFCLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO1lBRXhCLE1BQU0sYUFBYSxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBRSxDQUFBO1lBQ3hFLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLEdBQUcsa0NBQXdCLEVBQUUsQ0FBQyxDQUFBO1lBQzdDLENBQUMsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUE7WUFFbkIscURBQXFEO1lBQ3JELG1CQUFtQixDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1lBRXhDLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUNqRCwyREFBMkQ7WUFDM0QsNkJBQTZCO1lBQzdCLGFBQWEsQ0FDYixDQUFBO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsOENBQThDLEVBQUUsR0FBRyxFQUFFO1lBQ3pELE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN0RCxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUMxQixLQUFLLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtZQUV4QixNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUUsQ0FBQTtZQUN4RSxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxHQUFHLHNDQUE0QixFQUFFLENBQUMsQ0FBQTtZQUNqRCxDQUFDLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBRW5CLHFEQUFxRDtZQUNyRCxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtZQUV4QyxNQUFNLENBQUMsV0FBVyxDQUNqQixLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDakQsMkRBQTJEO1lBQzNELDJCQUEyQjtZQUMzQixhQUFhLENBQ2IsQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLGdFQUFnRSxFQUFFLEdBQUcsRUFBRTtZQUMzRSxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDdEQsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDMUIsS0FBSyxDQUFDLGdCQUFnQixFQUFFLENBQUE7WUFFeEIsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFFLENBQUE7WUFDeEUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsR0FBRyxrQ0FBd0IsRUFBRSxDQUFDLENBQUE7WUFDN0MsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUNuQixLQUFLLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTtZQUUxQixNQUFNLENBQUMsV0FBVyxDQUNqQixLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDakQsMkRBQTJEO1lBQzNELDZCQUE2QjtZQUM3QixhQUFhLENBQ2IsQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLCtCQUErQixFQUFFLEdBQUcsRUFBRTtZQUMxQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUNmLGtCQUFrQixDQUFDO2dCQUNsQixLQUFLLEVBQUUsQ0FBQyxRQUFRLENBQUM7Z0JBQ2pCLFdBQVcsRUFBRTtvQkFDWixrQkFBa0IsRUFBRSxLQUFLO29CQUN6QixNQUFNLEVBQUUsSUFBSTtvQkFDWixXQUFXLEVBQUUsSUFBSTtvQkFDakIsVUFBVSxFQUFFLENBQUM7aUJBQ2I7YUFDRCxDQUFDLENBQ0YsQ0FBQTtZQUNELEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQzFCLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7WUFFYixlQUFlLENBQ2QsR0FBRyxFQUNIO2dCQUNDLEdBQUcsR0FBRyxNQUFNLEVBQUUsY0FBYztnQkFDNUIsR0FBRyxHQUFHLE1BQU0sRUFBRSxxQkFBcUI7Z0JBQ25DLEdBQUcsR0FBRyxHQUFHLEVBQUUsbUJBQW1CO2dCQUM5QixHQUFHLEdBQUcsV0FBVyxFQUFFLGNBQWM7Z0JBQ2pDLEdBQUcsRUFBRSxnQkFBZ0I7Z0JBQ3JCLEdBQUcsR0FBRyxNQUFNLEVBQUUsY0FBYzthQUM1QixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FDVixDQUFBO1lBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM3QyxDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQywwREFBMEQsRUFBRSxHQUFHLEVBQUU7WUFDckUsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzNELEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQzFCLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDYixlQUFlLENBQ2QsR0FBRyxHQUFHLEtBQUssRUFDWDtnQkFDQyxHQUFHLEdBQUcsTUFBTSxFQUFFLGNBQWM7Z0JBQzVCLEdBQUcsR0FBRyxNQUFNLEVBQUUsY0FBYztnQkFDNUIsR0FBRyxHQUFHLElBQUksRUFBRSxrQkFBa0I7Z0JBQzlCLEdBQUcsRUFBRSxnQkFBZ0I7Z0JBQ3JCLEdBQUcsR0FBRyxNQUFNLEVBQUUsbUNBQW1DO2dCQUNqRCxHQUFHLEdBQUcsTUFBTSxFQUFFLGNBQWM7YUFDNUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQ1YsQ0FBQTtZQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDN0MsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsK0JBQStCLEVBQUUsR0FBRyxFQUFFO1lBQzFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMzRCxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUMxQixDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ2IsZUFBZSxDQUNkLEdBQUcsR0FBRyxRQUFRLEdBQUcsTUFBTSxFQUN2QjtnQkFDQyxHQUFHLEdBQUcsTUFBTSxFQUFFLHVCQUF1QjtnQkFDckMsR0FBRyxHQUFHLE1BQU0sRUFBRSxjQUFjO2dCQUM1QixHQUFHLEdBQUcsTUFBTSxFQUFFLGNBQWM7Z0JBQzVCLEdBQUcsRUFBRSxnQkFBZ0I7Z0JBQ3JCLEdBQUcsR0FBRyxNQUFNLEVBQUUsdUJBQXVCO2dCQUNyQyxHQUFHLEdBQUcsTUFBTSxFQUFFLG1DQUFtQztnQkFDakQsR0FBRyxHQUFHLE1BQU0sRUFBRSxjQUFjO2FBQzVCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUNWLENBQUE7WUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzdDLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLHVDQUF1QyxFQUFFLEdBQUcsRUFBRTtZQUNsRCxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDM0QsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDMUIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUNoQixlQUFlLENBQUMsS0FBSyxHQUFHLEdBQUcsRUFBRSxLQUFLLEdBQUcsR0FBRyxDQUFDLENBQUE7WUFDekMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM3QyxDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxzQ0FBc0MsRUFBRSxHQUFHLEVBQUU7WUFDakQsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzNELEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQzFCLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDaEIsZUFBZSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUNqQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzdDLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtZQUN4QyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDM0QsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDMUIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUNoQixlQUFlLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQ3pCLGVBQWUsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUE7WUFDL0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM3QyxDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxnREFBZ0QsRUFBRSxHQUFHLEVBQUU7WUFDM0QsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzNELEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQzFCLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO1lBQ3hCLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDaEIsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxHQUFHLEdBQUcsT0FBTyxHQUFHLEdBQUcsQ0FBQyxDQUFBO1lBQ3BDLGVBQWUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxHQUFHLE9BQU8sR0FBRyxNQUFNLEdBQUcsT0FBTyxHQUFHLE1BQU0sR0FBRyxNQUFNLENBQUMsQ0FBQTtZQUN4RSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzdDLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLHdEQUF3RCxFQUFFLEdBQUcsRUFBRTtZQUNuRSxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDM0QsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUE7WUFFMUIsZ0VBQWdFO1lBQ2hFLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDaEIsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUNuQixlQUFlLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBQ2pDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUE7WUFFWiwrQkFBK0I7WUFDL0IsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNiLG1CQUFtQixDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFBO1lBQ3ZDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUE7WUFDWixDQUFDLENBQUMsWUFBWSxFQUFFLENBQUE7WUFFaEIsa0ZBQWtGO1lBQ2xGLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDaEIsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxHQUFHLEdBQUcsT0FBTyxHQUFHLEdBQUcsQ0FBQyxDQUFBO1FBQ3JDLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLDRDQUE0QyxFQUFFLEdBQUcsRUFBRTtZQUN2RCxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDM0QsS0FBSyxDQUFDLHFCQUFxQixFQUFFLENBQUE7WUFDN0IsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUE7WUFFMUIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNiLENBQUMsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDbkIsZUFBZSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQTtZQUV6QixDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ2IsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxHQUFHLEdBQUcsTUFBTSxHQUFHLEtBQUssQ0FBQyxDQUFBO1FBQ3RDLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLDBCQUEwQixFQUFFLEdBQUcsRUFBRTtZQUNyQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDM0QsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUE7WUFFMUIsS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFBO1lBQ3JCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsNEJBQTRCLENBQUMsQ0FBQTtZQUV2RSxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQTtZQUNyQyxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUE7WUFDckIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxtQ0FBbUMsQ0FBQyxDQUFBO1lBRS9FLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFBO1lBQ3JDLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQTtZQUNyQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLHlDQUF5QyxDQUFDLENBQUE7UUFDckYsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMscURBQXFELEVBQUUsR0FBRyxFQUFFO1lBQ2hFLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMzRCxLQUFLLENBQUMscUJBQXFCLEVBQUUsQ0FBQTtZQUM3QixLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUUxQixDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN6QixDQUFDLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQ25CLGVBQWUsQ0FDZCxJQUFJLEVBQ0o7Z0JBQ0MsR0FBRyxHQUFHLE1BQU0sRUFBRSxjQUFjO2dCQUM1QixJQUFJLEVBQUUsMkJBQTJCO2dCQUNqQyxHQUFHLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsTUFBTSxHQUFHLE1BQU0sR0FBRyxNQUFNLEdBQUcsS0FBSyxDQUFDLEVBQUUsOENBQThDO2dCQUM3RyxHQUFHLEdBQUcsT0FBTyxFQUFFLHNCQUFzQjtnQkFDckMsR0FBRyxHQUFHLE1BQU07YUFDWixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FDVixDQUFBO1FBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBO0FBRUYsTUFBTSxrQkFBbUIsU0FBUSxjQUFjO0lBQzlDLHVCQUF1QjtRQUN0QixJQUFJLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsU0FBUyxvQ0FBNEIsRUFBRSxDQUFBO0lBQzlGLENBQUM7SUFFRCxxQkFBcUI7UUFDcEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxTQUFTLENBQUE7SUFDMUIsQ0FBQztJQUVELGdCQUFnQjtRQUNmLElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxTQUFTLG9DQUE0QixFQUFFLENBQUE7SUFDMUYsQ0FBQztJQUVELGFBQWE7UUFDWixJQUFJLENBQUMsNEJBQTRCLENBQUMsSUFBSSxDQUFDLEtBQU0sRUFBRSxJQUFJLENBQUMsU0FBVSxDQUFDLENBQUE7SUFDaEUsQ0FBQztJQUVELElBQUksU0FBUztRQUNaLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsb0JBQW9CLENBQUE7SUFDOUMsQ0FBQztJQUVELGtCQUFrQjtRQUNqQixJQUFJLENBQUMsU0FBUyxFQUFFLGtCQUFrQixFQUFFLENBQUE7SUFDckMsQ0FBQztJQUVELGNBQWMsQ0FBQyxNQUFlO1FBQzdCLE9BQU8sSUFBSSxDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDOUMsQ0FBQztJQUVELGVBQWUsQ0FBQyxNQUFlO1FBQzlCLE9BQU8sSUFBSSxDQUFDLFNBQVMsRUFBRSxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDL0MsQ0FBQztDQUNEO0FBRUQsU0FBUyxhQUFhLENBQUksQ0FBYTtJQUN0QyxPQUFPLENBQU0sQ0FBQTtBQUNkLENBQUM7QUFFRCxTQUFTLHFCQUFxQixDQUFDLENBQVM7SUFDdkMsT0FBTyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFBO0FBQ2hELENBQUM7QUFFRCxTQUFTLGNBQWM7SUFDdEIsT0FBTztRQUNOLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFO1FBQ2YsUUFBUSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUU7UUFDbEIsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDaEIsWUFBWSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUU7S0FDdEIsQ0FBQTtBQUNGLENBQUM7QUFFRCxTQUFTLGtCQUFrQixDQUFDLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBMEM7SUFDekYsTUFBTSxFQUFFLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtJQUNoQyxNQUFNLE9BQU8sR0FBYSxFQUFFLENBQUE7SUFDNUIsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQTtJQUM3QixNQUFNLGFBQWEsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksT0FBTyxFQUFVLENBQUMsQ0FBQTtJQUNuRCxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksT0FBTyxFQUFVLENBQUMsQ0FBQTtJQUM1QyxNQUFNLFVBQVUsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksT0FBTyxFQUFZLENBQUMsQ0FBQTtJQUVsRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ3ZDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNyQixJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN4QixNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDaEIsTUFBTSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNoQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUEsQ0FBQyw4REFBOEQ7WUFDL0YsTUFBSztRQUNOLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTztRQUNOLE9BQU87UUFDUCxNQUFNO1FBQ04sYUFBYSxFQUFFLENBQUMsQ0FBUyxFQUFFLEVBQUU7WUFDNUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDdkUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ2xDLENBQUM7UUFDRCxZQUFZLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUNyRCxNQUFNLEVBQUUsQ0FBQyxDQUFTLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLFVBQVU7UUFDVixhQUFhO1FBQ2IsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUU7UUFDM0IsUUFBUSxFQUFFO1lBQ1QsSUFBSSxFQUFFLEVBQUU7WUFDUixJQUFJLEVBQUUsQ0FBQztZQUNQLFFBQVEsRUFBRSxJQUFJLE9BQU8sRUFBUSxDQUFDLEtBQUs7WUFDbkMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxLQUFLO1lBQ3BCLGFBQWEsRUFBRSxhQUFhLENBQUMsS0FBSztZQUNsQyxNQUFNLEVBQUU7Z0JBQ1Asa0JBQWtCLENBQUMsQ0FBVSxFQUFFLFFBQW9CO29CQUNsRCxFQUFFLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtnQkFDbkMsQ0FBQzthQUNEO1lBQ0QsS0FBSyxDQUFDLElBQVk7Z0JBQ2pCLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDbkIsQ0FBQztZQUNELEtBQUssRUFBRTtnQkFDTixhQUFhLEVBQUU7b0JBQ2QsWUFBWSxFQUFFLFFBQVEsQ0FBQyxFQUFFLEVBQUUsV0FBVyxDQUFDO2lCQUN2QztnQkFDRCxTQUFTLEtBQUksQ0FBQzthQUNkO1lBQ0QsTUFBTSxFQUFFO2dCQUNQLE1BQU0sRUFBRTtvQkFDUCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxLQUFLLEVBQUUsQ0FBQztvQkFDUixJQUFJLE9BQU87d0JBQ1YsT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFBO29CQUNoQixDQUFDO29CQUNELElBQUksT0FBTzt3QkFDVixPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUE7b0JBQ2hCLENBQUM7b0JBQ0QsT0FBTyxDQUFDLENBQVM7d0JBQ2hCLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFBO3dCQUM1QixPQUFPOzRCQUNOLE1BQU0sRUFBRSxDQUFDLENBQUMsTUFBTTs0QkFDaEIsT0FBTyxFQUFFLENBQUMsQ0FBUyxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7NEJBQ2hELGlCQUFpQixFQUFFLENBQUMsSUFBYSxFQUFFLEtBQUssR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtnQ0FDL0QsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUE7Z0NBQy9CLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQTs0QkFDcEMsQ0FBQzt5QkFDRCxDQUFBO29CQUNGLENBQUM7aUJBQ0Q7YUFDRDtTQUNzQjtLQUN4QixDQUFBO0FBQ0YsQ0FBQztBQUVELFNBQVMsUUFBUSxDQUFDLElBQVksRUFBRSxRQUFvQyxFQUFFO0lBQ3JFLE9BQU8sSUFBSSxLQUFLLENBQ2YsRUFBRSxFQUNGO1FBQ0MsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJO1lBQ1YsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLElBQUksS0FBSyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUM1RCxPQUFPLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUN6QixDQUFDO1lBRUQsUUFBUSxJQUFJLEVBQUUsQ0FBQztnQkFDZCxLQUFLLFVBQVU7b0JBQ2QsT0FBTyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ2YsS0FBSyxVQUFVO29CQUNkLE9BQU8sR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFBO2dCQUNsQixLQUFLLFNBQVM7b0JBQ2IsT0FBTyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDckMsS0FBSyxvQkFBb0I7b0JBQ3hCLE9BQU8sR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFBO2dCQUNsQjtvQkFDQyxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzlELENBQUM7UUFDRixDQUFDO0tBQ0QsQ0FDRCxDQUFBO0FBQ0YsQ0FBQyJ9