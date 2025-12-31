/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import assert from 'assert';
import * as path from '../../../../../base/common/path.js';
import { Promises } from '../../../../../base/node/pfs.js';
import { FileAccess } from '../../../../../base/common/network.js';
function toIResolvedKeybinding(kb) {
    return {
        label: kb.getLabel(),
        ariaLabel: kb.getAriaLabel(),
        electronAccelerator: kb.getElectronAccelerator(),
        userSettingsLabel: kb.getUserSettingsLabel(),
        isWYSIWYG: kb.isWYSIWYG(),
        isMultiChord: kb.hasMultipleChords(),
        dispatchParts: kb.getDispatchChords(),
        singleModifierDispatchParts: kb.getSingleModifierDispatchChords(),
    };
}
export function assertResolveKeyboardEvent(mapper, keyboardEvent, expected) {
    const actual = toIResolvedKeybinding(mapper.resolveKeyboardEvent(keyboardEvent));
    assert.deepStrictEqual(actual, expected);
}
export function assertResolveKeybinding(mapper, keybinding, expected) {
    const actual = mapper
        .resolveKeybinding(keybinding)
        .map(toIResolvedKeybinding);
    assert.deepStrictEqual(actual, expected);
}
export function readRawMapping(file) {
    return fs.promises
        .readFile(FileAccess.asFileUri(`vs/workbench/services/keybinding/test/node/${file}.js`).fsPath)
        .then((buff) => {
        const contents = buff.toString();
        const func = new Function('define', contents); // CodeQL [SM01632] This is used in tests and we read the files as JS to avoid slowing down TS compilation
        let rawMappings = null;
        func(function (value) {
            rawMappings = value;
        });
        return rawMappings;
    });
}
export function assertMapping(writeFileIfDifferent, mapper, file) {
    const filePath = path.normalize(FileAccess.asFileUri(`vs/workbench/services/keybinding/test/node/${file}`).fsPath);
    return fs.promises.readFile(filePath).then((buff) => {
        const expected = buff.toString().replace(/\r\n/g, '\n');
        const actual = mapper.dumpDebugInfo().replace(/\r\n/g, '\n');
        if (actual !== expected && writeFileIfDifferent) {
            const destPath = filePath.replace(/[\/\\]out[\/\\]vs[\/\\]workbench/, '/src/vs/workbench');
            Promises.writeFile(destPath, actual);
        }
        assert.deepStrictEqual(actual, expected);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5Ym9hcmRNYXBwZXJUZXN0VXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMva2V5YmluZGluZy90ZXN0L25vZGUva2V5Ym9hcmRNYXBwZXJUZXN0VXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDeEIsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxJQUFJLE1BQU0sb0NBQW9DLENBQUE7QUFNMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQWFsRSxTQUFTLHFCQUFxQixDQUFDLEVBQXNCO0lBQ3BELE9BQU87UUFDTixLQUFLLEVBQUUsRUFBRSxDQUFDLFFBQVEsRUFBRTtRQUNwQixTQUFTLEVBQUUsRUFBRSxDQUFDLFlBQVksRUFBRTtRQUM1QixtQkFBbUIsRUFBRSxFQUFFLENBQUMsc0JBQXNCLEVBQUU7UUFDaEQsaUJBQWlCLEVBQUUsRUFBRSxDQUFDLG9CQUFvQixFQUFFO1FBQzVDLFNBQVMsRUFBRSxFQUFFLENBQUMsU0FBUyxFQUFFO1FBQ3pCLFlBQVksRUFBRSxFQUFFLENBQUMsaUJBQWlCLEVBQUU7UUFDcEMsYUFBYSxFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsRUFBRTtRQUNyQywyQkFBMkIsRUFBRSxFQUFFLENBQUMsK0JBQStCLEVBQUU7S0FDakUsQ0FBQTtBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsMEJBQTBCLENBQ3pDLE1BQXVCLEVBQ3ZCLGFBQTZCLEVBQzdCLFFBQTZCO0lBRTdCLE1BQU0sTUFBTSxHQUFHLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFBO0lBQ2hGLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0FBQ3pDLENBQUM7QUFFRCxNQUFNLFVBQVUsdUJBQXVCLENBQ3RDLE1BQXVCLEVBQ3ZCLFVBQXNCLEVBQ3RCLFFBQStCO0lBRS9CLE1BQU0sTUFBTSxHQUEwQixNQUFNO1NBQzFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQztTQUM3QixHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQTtJQUM1QixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtBQUN6QyxDQUFDO0FBRUQsTUFBTSxVQUFVLGNBQWMsQ0FBSSxJQUFZO0lBQzdDLE9BQU8sRUFBRSxDQUFDLFFBQVE7U0FDaEIsUUFBUSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsOENBQThDLElBQUksS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDO1NBQzlGLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1FBQ2QsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ2hDLE1BQU0sSUFBSSxHQUFHLElBQUksUUFBUSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQSxDQUFDLDBHQUEwRztRQUN4SixJQUFJLFdBQVcsR0FBYSxJQUFJLENBQUE7UUFDaEMsSUFBSSxDQUFDLFVBQVUsS0FBUTtZQUN0QixXQUFXLEdBQUcsS0FBSyxDQUFBO1FBQ3BCLENBQUMsQ0FBQyxDQUFBO1FBQ0YsT0FBTyxXQUFZLENBQUE7SUFDcEIsQ0FBQyxDQUFDLENBQUE7QUFDSixDQUFDO0FBRUQsTUFBTSxVQUFVLGFBQWEsQ0FDNUIsb0JBQTZCLEVBQzdCLE1BQXVCLEVBQ3ZCLElBQVk7SUFFWixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUM5QixVQUFVLENBQUMsU0FBUyxDQUFDLDhDQUE4QyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FDakYsQ0FBQTtJQUVELE9BQU8sRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDbkQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDdkQsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLGFBQWEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDNUQsSUFBSSxNQUFNLEtBQUssUUFBUSxJQUFJLG9CQUFvQixFQUFFLENBQUM7WUFDakQsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxrQ0FBa0MsRUFBRSxtQkFBbUIsQ0FBQyxDQUFBO1lBQzFGLFFBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3JDLENBQUM7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUN6QyxDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMifQ==