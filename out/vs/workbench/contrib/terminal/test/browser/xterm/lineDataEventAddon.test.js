/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual } from 'assert';
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { writeP } from '../../../browser/terminalTestHelpers.js';
import { LineDataEventAddon } from '../../../browser/xterm/lineDataEventAddon.js';
suite('LineDataEventAddon', () => {
    let xterm;
    let lineDataEventAddon;
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    suite('onLineData', () => {
        let events;
        setup(async () => {
            const TerminalCtor = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
            xterm = store.add(new TerminalCtor({ allowProposedApi: true, cols: 4 }));
            lineDataEventAddon = store.add(new LineDataEventAddon());
            xterm.loadAddon(lineDataEventAddon);
            events = [];
            store.add(lineDataEventAddon.onLineData((e) => events.push(e)));
        });
        test('should fire when a non-wrapped line ends with a line feed', async () => {
            await writeP(xterm, 'foo');
            deepStrictEqual(events, []);
            await writeP(xterm, '\n\r');
            deepStrictEqual(events, ['foo']);
            await writeP(xterm, 'bar');
            deepStrictEqual(events, ['foo']);
            await writeP(xterm, '\n');
            deepStrictEqual(events, ['foo', 'bar']);
        });
        test('should not fire soft wrapped lines', async () => {
            await writeP(xterm, 'foo.');
            deepStrictEqual(events, []);
            await writeP(xterm, 'bar.');
            deepStrictEqual(events, []);
            await writeP(xterm, 'baz.');
            deepStrictEqual(events, []);
        });
        test('should fire when a wrapped line ends with a line feed', async () => {
            await writeP(xterm, 'foo.bar.baz.');
            deepStrictEqual(events, []);
            await writeP(xterm, '\n\r');
            deepStrictEqual(events, ['foo.bar.baz.']);
        });
        test('should not fire on cursor move when the backing process is not on Windows', async () => {
            await writeP(xterm, 'foo.\x1b[H');
            deepStrictEqual(events, []);
        });
        test('should fire on cursor move when the backing process is on Windows', async () => {
            lineDataEventAddon.setOperatingSystem(1 /* OperatingSystem.Windows */);
            await writeP(xterm, 'foo\x1b[H');
            deepStrictEqual(events, ['foo']);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZURhdGFFdmVudEFkZG9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC90ZXN0L2Jyb3dzZXIveHRlcm0vbGluZURhdGFFdmVudEFkZG9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUUvRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDaEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFFakYsS0FBSyxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtJQUNoQyxJQUFJLEtBQWUsQ0FBQTtJQUNuQixJQUFJLGtCQUFzQyxDQUFBO0lBRTFDLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFdkQsS0FBSyxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7UUFDeEIsSUFBSSxNQUFnQixDQUFBO1FBRXBCLEtBQUssQ0FBQyxLQUFLLElBQUksRUFBRTtZQUNoQixNQUFNLFlBQVksR0FBRyxDQUNwQixNQUFNLG1CQUFtQixDQUFnQyxjQUFjLEVBQUUsY0FBYyxDQUFDLENBQ3hGLENBQUMsUUFBUSxDQUFBO1lBQ1YsS0FBSyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxZQUFZLENBQUMsRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN4RSxrQkFBa0IsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFD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