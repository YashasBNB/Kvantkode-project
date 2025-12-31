/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual } from 'assert';
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { PartialCommandDetectionCapability } from '../../../../../../platform/terminal/common/capabilities/partialCommandDetectionCapability.js';
import { writeP } from '../../../browser/terminalTestHelpers.js';
suite('PartialCommandDetectionCapability', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let xterm;
    let capability;
    let addEvents;
    function assertCommands(expectedLines) {
        deepStrictEqual(capability.commands.map((e) => e.line), expectedLines);
        deepStrictEqual(addEvents.map((e) => e.line), expectedLines);
    }
    setup(async () => {
        const TerminalCtor = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
        xterm = store.add(new TerminalCtor({ allowProposedApi: true, cols: 80 }));
        capability = store.add(new PartialCommandDetectionCapability(xterm));
        addEvents = [];
        store.add(capability.onCommandFinished((e) => addEvents.push(e)));
    });
    test('should not add commands when the cursor position is too close to the left side', async () => {
        assertCommands([]);
        xterm.input('\x0d');
        await writeP(xterm, '\r\n');
        assertCommands([]);
        await writeP(xterm, 'a');
        xterm.input('\x0d');
        await writeP(xterm, '\r\n');
        assertCommands([]);
    });
    test('should add commands when the cursor position is not too close to the left side', async () => {
        assertCommands([]);
        await writeP(xterm, 'ab');
        xterm.input('\x0d');
        await writeP(xterm, '\r\n\r\n');
        assertCommands([0]);
        await writeP(xterm, 'cd');
        xterm.input('\x0d');
        await writeP(xterm, '\r\n');
        assertCommands([0, 2]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFydGlhbENvbW1hbmREZXRlY3Rpb25DYXBhYmlsaXR5LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC90ZXN0L2Jyb3dzZXIvY2FwYWJpbGl0aWVzL3BhcnRpYWxDb21tYW5kRGV0ZWN0aW9uQ2FwYWJpbGl0eS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxRQUFRLENBQUE7QUFDeEMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDL0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDckcsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sOEZBQThGLENBQUE7QUFDaEosT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRWhFLEtBQUssQ0FBQyxtQ0FBbUMsRUFBRSxHQUFHLEVBQUU7SUFDL0MsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUV2RCxJQUFJLEtBQWUsQ0FBQTtJQUNuQixJQUFJLFVBQTZDLENBQUE7SUFDakQsSUFBSSxTQUFvQixDQUFBO0lBRXhCLFNBQVMsY0FBYyxDQUFDLGFBQXVCO1FBQzlDLGVBQWUsQ0FDZCxVQUFVLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUN0QyxhQUFhLENBQ2IsQ0FBQTtRQUNELGVBQWUsQ0FDZCxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQzVCLGFBQWEsQ0FDYixDQUFBO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxLQUFLLElBQUksRUFBRTtRQUNoQixNQUFNLFlBQVksR0FBRyxDQUNwQixNQUFNLG1CQUFtQixDQUFnQyxjQUFjLEVBQUUsY0FBYyxDQUFDLENBQ3hGLENBQUMsUUFBUSxDQUFBO1FBRVYsS0FBSyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxZQUFZLENBQUMsRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFhLENBQUMsQ0FBQTtRQUNyRixVQUFVLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGlDQUFpQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDcEUsU0FBUyxHQUFHLEVBQUUsQ0FBQTtRQUNkLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNsRSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxnRkFBZ0YsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNqRyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDbEIsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNuQixNQUFNLE1BQU0sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDM0IsY0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ2xCLE1BQU0sTUFBTSxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUN4QixLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ25CLE1BQU0sTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUMzQixjQUFjLENBQUMsRUFBRSxDQUFDLENBQUE7SUFDbkIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsZ0ZBQWdGLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDakcsY0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ2xCLE1BQU0sTUFBTSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN6QixLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ25CLE1BQU0sTUFBTSxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUMvQixjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ25CLE1BQU0sTUFBTSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN6QixLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ25CLE1BQU0sTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUMzQixjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUN2QixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=