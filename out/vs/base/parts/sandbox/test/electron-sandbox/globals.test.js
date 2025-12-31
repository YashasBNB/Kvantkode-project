/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ipcRenderer, process, webFrame, webUtils } from '../../electron-sandbox/globals.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../test/common/utils.js';
suite('Sandbox', () => {
    test('globals', async () => {
        assert.ok(typeof ipcRenderer.send === 'function');
        assert.ok(typeof webFrame.setZoomLevel === 'function');
        assert.ok(typeof process.platform === 'string');
        assert.ok(typeof webUtils.getPathForFile === 'function');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2xvYmFscy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9wYXJ0cy9zYW5kYm94L3Rlc3QvZWxlY3Ryb24tc2FuZGJveC9nbG9iYWxzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxXQUFXLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUUxRixLQUFLLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRTtJQUNyQixJQUFJLENBQUMsU0FBUyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzFCLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxXQUFXLENBQUMsSUFBSSxLQUFLLFVBQVUsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxRQUFRLENBQUMsWUFBWSxLQUFLLFVBQVUsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxPQUFPLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FBQyxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxRQUFRLENBQUMsY0FBYyxLQUFLLFVBQVUsQ0FBQyxDQUFBO0lBQ3pELENBQUMsQ0FBQyxDQUFBO0lBRUYsdUNBQXVDLEVBQUUsQ0FBQTtBQUMxQyxDQUFDLENBQUMsQ0FBQSJ9