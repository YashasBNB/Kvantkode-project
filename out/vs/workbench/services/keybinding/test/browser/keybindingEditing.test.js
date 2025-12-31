/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as json from '../../../../../base/common/json.js';
import { KeyCodeChord } from '../../../../../base/common/keybindings.js';
import { OS } from '../../../../../base/common/platform.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { ResolvedKeybindingItem } from '../../../../../platform/keybinding/common/resolvedKeybindingItem.js';
import { USLayoutResolvedKeybinding } from '../../../../../platform/keybinding/common/usLayoutResolvedKeybinding.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { KeybindingsEditingService } from '../../common/keybindingEditing.js';
import { ITextFileService } from '../../../textfile/common/textfiles.js';
import { TestEnvironmentService, workbenchInstantiationService, } from '../../../../test/browser/workbenchTestServices.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { Schemas } from '../../../../../base/common/network.js';
import { URI } from '../../../../../base/common/uri.js';
import { FileUserDataProvider } from '../../../../../platform/userData/common/fileUserDataProvider.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { joinPath } from '../../../../../base/common/resources.js';
import { InMemoryFileSystemProvider } from '../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { UserDataProfilesService } from '../../../../../platform/userDataProfile/common/userDataProfile.js';
import { UserDataProfileService } from '../../../userDataProfile/common/userDataProfileService.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
const ROOT = URI.file('tests').with({ scheme: 'vscode-tests' });
suite('KeybindingsEditing', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let fileService;
    let environmentService;
    let userDataProfileService;
    let testObject;
    setup(async () => {
        environmentService = TestEnvironmentService;
        const logService = new NullLogService();
        fileService = disposables.add(new FileService(logService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(ROOT.scheme, fileSystemProvider));
        const userFolder = joinPath(ROOT, 'User');
        await fileService.createFolder(userFolder);
        const configService = new TestConfigurationService();
        configService.setUserConfiguration('files', { eol: '\n' });
        const uriIdentityService = disposables.add(new UriIdentityService(fileService));
        const userDataProfilesService = disposables.add(new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService));
        userDataProfileService = disposables.add(new UserDataProfileService(userDataProfilesService.defaultProfile));
        disposables.add(fileService.registerProvider(Schemas.vscodeUserData, disposables.add(new FileUserDataProvider(ROOT.scheme, fileSystemProvider, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, new NullLogService()))));
        instantiationService = workbenchInstantiationService({
            fileService: () => fileService,
            configurationService: () => configService,
            environmentService: () => environmentService,
        }, disposables);
        testObject = disposables.add(instantiationService.createInstance(KeybindingsEditingService));
    });
    test('errors cases - parse errors', async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.keybindingsResource, VSBuffer.fromString(',,,,,,,,,,,,,,'));
        try {
            await testObject.editKeybinding(aResolvedKeybindingItem({ firstChord: { keyCode: 9 /* KeyCode.Escape */ } }), 'alt+c', undefined);
            assert.fail('Should fail with parse errors');
        }
        catch (error) {
            assert.strictEqual(error.message, 'Unable to write to the keybindings configuration file. Please open it to correct errors/warnings in the file and try again.');
        }
    });
    test('errors cases - parse errors 2', async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.keybindingsResource, VSBuffer.fromString('[{"key": }]'));
        try {
            await testObject.editKeybinding(aResolvedKeybindingItem({ firstChord: { keyCode: 9 /* KeyCode.Escape */ } }), 'alt+c', undefined);
            assert.fail('Should fail with parse errors');
        }
        catch (error) {
            assert.strictEqual(error.message, 'Unable to write to the keybindings configuration file. Please open it to correct errors/warnings in the file and try again.');
        }
    });
    test('errors cases - dirty', () => {
        instantiationService.stub(ITextFileService, 'isDirty', true);
        return testObject
            .editKeybinding(aResolvedKeybindingItem({ firstChord: { keyCode: 9 /* KeyCode.Escape */ } }), 'alt+c', undefined)
            .then(() => assert.fail('Should fail with dirty error'), (error) => assert.strictEqual(error.message, 'Unable to write because the keybindings configuration file has unsaved changes. Please save it first and then try again.'));
    });
    test('errors cases - did not find an array', async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.keybindingsResource, VSBuffer.fromString('{"key": "alt+c", "command": "hello"}'));
        try {
            await testObject.editKeybinding(aResolvedKeybindingItem({ firstChord: { keyCode: 9 /* KeyCode.Escape */ } }), 'alt+c', undefined);
            assert.fail('Should fail');
        }
        catch (error) {
            assert.strictEqual(error.message, 'Unable to write to the keybindings configuration file. It has an object which is not of type Array. Please open the file to clean up and try again.');
        }
    });
    test('edit a default keybinding to an empty file', async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.keybindingsResource, VSBuffer.fromString(''));
        const expected = [
            { key: 'alt+c', command: 'a' },
            { key: 'escape', command: '-a' },
        ];
        await testObject.editKeybinding(aResolvedKeybindingItem({ firstChord: { keyCode: 9 /* KeyCode.Escape */ }, command: 'a' }), 'alt+c', undefined);
        assert.deepStrictEqual(await getUserKeybindings(), expected);
    });
    test('edit a default keybinding to an empty array', async () => {
        await writeToKeybindingsFile();
        const expected = [
            { key: 'alt+c', command: 'a' },
            { key: 'escape', command: '-a' },
        ];
        await testObject.editKeybinding(aResolvedKeybindingItem({ firstChord: { keyCode: 9 /* KeyCode.Escape */ }, command: 'a' }), 'alt+c', undefined);
        return assert.deepStrictEqual(await getUserKeybindings(), expected);
    });
    test('edit a default keybinding in an existing array', async () => {
        await writeToKeybindingsFile({ command: 'b', key: 'shift+c' });
        const expected = [
            { key: 'shift+c', command: 'b' },
            { key: 'alt+c', command: 'a' },
            { key: 'escape', command: '-a' },
        ];
        await testObject.editKeybinding(aResolvedKeybindingItem({ firstChord: { keyCode: 9 /* KeyCode.Escape */ }, command: 'a' }), 'alt+c', undefined);
        return assert.deepStrictEqual(await getUserKeybindings(), expected);
    });
    test('add another keybinding', async () => {
        const expected = [{ key: 'alt+c', command: 'a' }];
        await testObject.addKeybinding(aResolvedKeybindingItem({ firstChord: { keyCode: 9 /* KeyCode.Escape */ }, command: 'a' }), 'alt+c', undefined);
        return assert.deepStrictEqual(await getUserKeybindings(), expected);
    });
    test('add a new default keybinding', async () => {
        const expected = [{ key: 'alt+c', command: 'a' }];
        await testObject.addKeybinding(aResolvedKeybindingItem({ command: 'a' }), 'alt+c', undefined);
        return assert.deepStrictEqual(await getUserKeybindings(), expected);
    });
    test('add a new default keybinding using edit', async () => {
        const expected = [{ key: 'alt+c', command: 'a' }];
        await testObject.editKeybinding(aResolvedKeybindingItem({ command: 'a' }), 'alt+c', undefined);
        assert.deepStrictEqual(await getUserKeybindings(), expected);
    });
    test('edit an user keybinding', async () => {
        await writeToKeybindingsFile({ key: 'escape', command: 'b' });
        const expected = [{ key: 'alt+c', command: 'b' }];
        await testObject.editKeybinding(aResolvedKeybindingItem({
            firstChord: { keyCode: 9 /* KeyCode.Escape */ },
            command: 'b',
            isDefault: false,
        }), 'alt+c', undefined);
        assert.deepStrictEqual(await getUserKeybindings(), expected);
    });
    test('edit an user keybinding with more than one element', async () => {
        await writeToKeybindingsFile({ key: 'escape', command: 'b' }, { key: 'alt+shift+g', command: 'c' });
        const expected = [
            { key: 'alt+c', command: 'b' },
            { key: 'alt+shift+g', command: 'c' },
        ];
        await testObject.editKeybinding(aResolvedKeybindingItem({
            firstChord: { keyCode: 9 /* KeyCode.Escape */ },
            command: 'b',
            isDefault: false,
        }), 'alt+c', undefined);
        assert.deepStrictEqual(await getUserKeybindings(), expected);
    });
    test('remove a default keybinding', async () => {
        const expected = [{ key: 'alt+c', command: '-a' }];
        await testObject.removeKeybinding(aResolvedKeybindingItem({
            command: 'a',
            firstChord: { keyCode: 33 /* KeyCode.KeyC */, modifiers: { altKey: true } },
        }));
        assert.deepStrictEqual(await getUserKeybindings(), expected);
    });
    test('remove a default keybinding should not ad duplicate entries', async () => {
        const expected = [{ key: 'alt+c', command: '-a' }];
        await testObject.removeKeybinding(aResolvedKeybindingItem({
            command: 'a',
            firstChord: { keyCode: 33 /* KeyCode.KeyC */, modifiers: { altKey: true } },
        }));
        await testObject.removeKeybinding(aResolvedKeybindingItem({
            command: 'a',
            firstChord: { keyCode: 33 /* KeyCode.KeyC */, modifiers: { altKey: true } },
        }));
        await testObject.removeKeybinding(aResolvedKeybindingItem({
            command: 'a',
            firstChord: { keyCode: 33 /* KeyCode.KeyC */, modifiers: { altKey: true } },
        }));
        await testObject.removeKeybinding(aResolvedKeybindingItem({
            command: 'a',
            firstChord: { keyCode: 33 /* KeyCode.KeyC */, modifiers: { altKey: true } },
        }));
        await testObject.removeKeybinding(aResolvedKeybindingItem({
            command: 'a',
            firstChord: { keyCode: 33 /* KeyCode.KeyC */, modifiers: { altKey: true } },
        }));
        assert.deepStrictEqual(await getUserKeybindings(), expected);
    });
    test('remove a user keybinding', async () => {
        await writeToKeybindingsFile({ key: 'alt+c', command: 'b' });
        await testObject.removeKeybinding(aResolvedKeybindingItem({
            command: 'b',
            firstChord: { keyCode: 33 /* KeyCode.KeyC */, modifiers: { altKey: true } },
            isDefault: false,
        }));
        assert.deepStrictEqual(await getUserKeybindings(), []);
    });
    test('reset an edited keybinding', async () => {
        await writeToKeybindingsFile({ key: 'alt+c', command: 'b' });
        await testObject.resetKeybinding(aResolvedKeybindingItem({
            command: 'b',
            firstChord: { keyCode: 33 /* KeyCode.KeyC */, modifiers: { altKey: true } },
            isDefault: false,
        }));
        assert.deepStrictEqual(await getUserKeybindings(), []);
    });
    test('reset a removed keybinding', async () => {
        await writeToKeybindingsFile({ key: 'alt+c', command: '-b' });
        await testObject.resetKeybinding(aResolvedKeybindingItem({ command: 'b', isDefault: false }));
        assert.deepStrictEqual(await getUserKeybindings(), []);
    });
    test('reset multiple removed keybindings', async () => {
        await writeToKeybindingsFile({ key: 'alt+c', command: '-b' });
        await writeToKeybindingsFile({ key: 'alt+shift+c', command: '-b' });
        await writeToKeybindingsFile({ key: 'escape', command: '-b' });
        await testObject.resetKeybinding(aResolvedKeybindingItem({ command: 'b', isDefault: false }));
        assert.deepStrictEqual(await getUserKeybindings(), []);
    });
    test('add a new keybinding to unassigned keybinding', async () => {
        await writeToKeybindingsFile({ key: 'alt+c', command: '-a' });
        const expected = [
            { key: 'alt+c', command: '-a' },
            { key: 'shift+alt+c', command: 'a' },
        ];
        await testObject.editKeybinding(aResolvedKeybindingItem({ command: 'a', isDefault: false }), 'shift+alt+c', undefined);
        assert.deepStrictEqual(await getUserKeybindings(), expected);
    });
    test('add when expression', async () => {
        await writeToKeybindingsFile({ key: 'alt+c', command: '-a' });
        const expected = [
            { key: 'alt+c', command: '-a' },
            { key: 'shift+alt+c', command: 'a', when: 'editorTextFocus' },
        ];
        await testObject.editKeybinding(aResolvedKeybindingItem({ command: 'a', isDefault: false }), 'shift+alt+c', 'editorTextFocus');
        assert.deepStrictEqual(await getUserKeybindings(), expected);
    });
    test('update command and when expression', async () => {
        await writeToKeybindingsFile({
            key: 'alt+c',
            command: '-a',
            when: 'editorTextFocus && !editorReadonly',
        });
        const expected = [
            { key: 'alt+c', command: '-a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'shift+alt+c', command: 'a', when: 'editorTextFocus' },
        ];
        await testObject.editKeybinding(aResolvedKeybindingItem({ command: 'a', isDefault: false }), 'shift+alt+c', 'editorTextFocus');
        assert.deepStrictEqual(await getUserKeybindings(), expected);
    });
    test('update when expression', async () => {
        await writeToKeybindingsFile({ key: 'alt+c', command: '-a', when: 'editorTextFocus && !editorReadonly' }, { key: 'shift+alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' });
        const expected = [
            { key: 'alt+c', command: '-a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'shift+alt+c', command: 'a', when: 'editorTextFocus' },
        ];
        await testObject.editKeybinding(aResolvedKeybindingItem({
            command: 'a',
            isDefault: false,
            when: 'editorTextFocus && !editorReadonly',
        }), 'shift+alt+c', 'editorTextFocus');
        assert.deepStrictEqual(await getUserKeybindings(), expected);
    });
    test('remove when expression', async () => {
        await writeToKeybindingsFile({
            key: 'alt+c',
            command: '-a',
            when: 'editorTextFocus && !editorReadonly',
        });
        const expected = [
            { key: 'alt+c', command: '-a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'shift+alt+c', command: 'a' },
        ];
        await testObject.editKeybinding(aResolvedKeybindingItem({ command: 'a', isDefault: false }), 'shift+alt+c', undefined);
        assert.deepStrictEqual(await getUserKeybindings(), expected);
    });
    async function writeToKeybindingsFile(...keybindings) {
        await fileService.writeFile(userDataProfileService.currentProfile.keybindingsResource, VSBuffer.fromString(JSON.stringify(keybindings || [])));
    }
    async function getUserKeybindings() {
        return json.parse((await fileService.readFile(userDataProfileService.currentProfile.keybindingsResource)).value.toString());
    }
    function aResolvedKeybindingItem({ command, when, isDefault, firstChord, secondChord, }) {
        const aSimpleKeybinding = function (chord) {
            const { ctrlKey, shiftKey, altKey, metaKey } = chord.modifiers || {
                ctrlKey: false,
                shiftKey: false,
                altKey: false,
                metaKey: false,
            };
            return new KeyCodeChord(ctrlKey, shiftKey, altKey, metaKey, chord.keyCode);
        };
        const chords = [];
        if (firstChord) {
            chords.push(aSimpleKeybinding(firstChord));
            if (secondChord) {
                chords.push(aSimpleKeybinding(secondChord));
            }
        }
        const keybinding = chords.length > 0 ? new USLayoutResolvedKeybinding(chords, OS) : undefined;
        return new ResolvedKeybindingItem(keybinding, command || 'some command', null, when ? ContextKeyExpr.deserialize(when) : undefined, isDefault === undefined ? true : isDefault, null, false);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ0VkaXRpbmcudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9rZXliaW5kaW5nL3Rlc3QvYnJvd3Nlci9rZXliaW5kaW5nRWRpdGluZy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEtBQUssSUFBSSxNQUFNLG9DQUFvQyxDQUFBO0FBRTFELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsRUFBRSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDM0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBS3hGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHFFQUFxRSxDQUFBO0FBQzVHLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHlFQUF5RSxDQUFBO0FBQ3BILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN4RSxPQUFPLEVBQ04sc0JBQXNCLEVBQ3RCLDZCQUE2QixHQUM3QixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQ3RHLE9BQU8sRUFB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