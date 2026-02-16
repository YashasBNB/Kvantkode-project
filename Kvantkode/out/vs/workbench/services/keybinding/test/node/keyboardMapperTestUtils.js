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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5Ym9hcmRNYXBwZXJUZXN0VXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9rZXliaW5kaW5nL3Rlc3Qvbm9kZS9rZXlib2FyZE1hcHBlclRlc3RVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQTtBQUN4QixPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxLQUFLLElBQUksTUFBTSxvQ0FBb0MsQ0FBQTtBQU0xRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFHMUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBYWxFLFNBQVMscUJBQXFCLENBQUMsRUFBc0I7SUFDcEQsT0FBTztRQUNOLEtBQUssRUFBRSxFQUFFLENBQUMsUUFBUSxFQUFFO1FBQ3BCLFNBQVMsRUFBRSxFQUFFLENBQUMsWUFBWSxFQUFFO1FBQzVCLG1CQUFtQixFQUFFLEVBQUUsQ0FBQyxzQkFBc0IsRUFBRTtRQUNoRCxpQkFBaUIsRUFBRSxFQUFFLENBQUMsb0JBQW9CLEVBQUU7UUFDNUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxTQUFTLEVBQUU7UUFDekIsWUFBWSxFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsRUFBRTtRQUNwQyxhQUFhLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixFQUFFO1FBQ3JDLDJCQUEyQixFQUFFLEVBQUUsQ0FBQywrQkFBK0IsRUFBRTtLQUNqRSxDQUFBO0FBQ0YsQ0FBQztBQUVELE1BQU0sVUFBVSwwQkFBMEIsQ0FDekMsTUFBdUIsRUFDdkIsYUFBNkIsRUFDN0IsUUFBNkI7SUFFN0IsTUFBTSxNQUFNLEdBQUcscUJBQXFCLENBQUMsTUFBTSxDQUFDLG9CQUFvQixDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUE7SUFDaEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUE7QUFDekMsQ0FBQztBQUVELE1BQU0sVUFBVSx1QkFBdUIsQ0FDdEMsTUFBdUIsRUFDdkIsVUFBc0IsRUFDdEIsUUFBK0I7SUFFL0IsTUFBTSxNQUFNLEdBQTBCLE1BQU07U0FDMUMsaUJBQWlCLENBQUMsVUFBVSxDQUFDO1NBQzdCLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO0lBQzVCLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0FBQ3pDLENBQUM7QUFFRCxNQUFNLFVBQVUsY0FBYyxDQUFJLElBQVk7SUFDN0MsT0FBTyxFQUFFLENBQUMsUUFBUTtTQUNoQixRQUFRLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyw4Q0FBOEMsSUFBSSxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUM7U0FDOUYsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDZCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDaEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxRQUFRLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBLENBQUMsMEdBQTBHO1FBQ3hKLElBQUksV0FBVyxHQUFhLElBQUksQ0FBQTtRQUNoQyxJQUFJLENBQUMsVUFBVSxLQUFRO1lBQ3RCLFdBQVcsR0FBRyxLQUFLLENBQUE7UUFDcEIsQ0FBQyxDQUFDLENBQUE7UUFDRixPQUFPLFdBQVksQ0FBQTtJQUNwQixDQUFDLENBQUMsQ0FBQTtBQUNKLENBQUM7QUFFRCxNQUFNLFVBQVUsYUFBYSxDQUM1QixvQkFBNkIsRUFDN0IsTUFBdUIsRUFDdkIsSUFBWTtJQUVaLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQzlCLFVBQVUsQ0FBQyxTQUFTLENBQUMsOENBQThDLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTSxDQUNqRixDQUFBO0lBRUQsT0FBTyxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtRQUNuRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN2RCxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsYUFBYSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM1RCxJQUFJLE1BQU0sS0FBSyxRQUFRLElBQUksb0JBQW9CLEVBQUUsQ0FBQztZQUNqRCxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLGtDQUFrQyxFQUFFLG1CQUFtQixDQUFDLENBQUE7WUFDMUYsUUFBUSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDckMsQ0FBQztRQUNELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ3pDLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyJ9