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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ0VkaXRpbmcudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2tleWJpbmRpbmcvdGVzdC9icm93c2VyL2tleWJpbmRpbmdFZGl0aW5nLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxJQUFJLE1BQU0sb0NBQW9DLENBQUE7QUFFMUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUE7QUFLeEYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scUVBQXFFLENBQUE7QUFDNUcsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0seUVBQXlFLENBQUE7QUFDcEgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3hFLE9BQU8sRUFDTixzQkFBc0IsRUFDdEIsNkJBQTZCLEdBQzdCLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDdEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG9FQUFvRSxDQUFBO0FBQy9HLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQTtBQUMzRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUVsRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQVNsRyxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFBO0FBRS9ELEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7SUFDaEMsTUFBTSxXQUFXLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUM3RCxJQUFJLG9CQUE4QyxDQUFBO0lBQ2xELElBQUksV0FBeUIsQ0FBQTtJQUM3QixJQUFJLGtCQUF1QyxDQUFBO0lBQzNDLElBQUksc0JBQStDLENBQUE7SUFDbkQsSUFBSSxVQUFxQyxDQUFBO0lBRXpDLEtBQUssQ0FBQyxLQUFLLElBQUksRUFBRTtRQUNoQixrQkFBa0IsR0FBRyxzQkFBc0IsQ0FBQTtRQUUzQyxNQUFNLFVBQVUsR0FBRyxJQUFJLGNBQWMsRUFBRSxDQUFBO1FBQ3ZDLFdBQVcsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7UUFDMUQsTUFBTSxrQkFBa0IsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksMEJBQTBCLEVBQUUsQ0FBQyxDQUFBO1FBQzVFLFdBQVcsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsa0JBQWtCLENBQUMsQ0FBQyxDQUFBO1FBRTlFLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDekMsTUFBTSxXQUFXLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBRTFDLE1BQU0sYUFBYSxHQUFHLElBQUksd0JBQXdCLEVBQUUsQ0FBQTtRQUNwRCxhQUFhLENBQUMsb0JBQW9CLENBQUMsT0FBTyxFQUFFLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFFMUQsTUFBTSxrQkFBa0IsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksa0JBQWtCLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQTtRQUMvRSxNQUFNLHVCQUF1QixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQzlDLElBQUksdUJBQXVCLENBQUMsa0JBQWtCLEVBQUUsV0FBVyxFQUFFLGtCQUFrQixFQUFFLFVBQVUsQ0FBQyxDQUM1RixDQUFBO1FBQ0Qsc0JBQXNCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDdkMsSUFBSSxzQkFBc0IsQ0FBQyx1QkFBdUIsQ0FBQyxjQUFjLENBQUMsQ0FDbEUsQ0FBQTtRQUNELFdBQVcsQ0FBQyxHQUFHLENBQ2QsV0FBVyxDQUFDLGdCQUFnQixDQUMzQixPQUFPLENBQUMsY0FBYyxFQUN0QixXQUFXLENBQUMsR0FBRyxDQUNkLElBQUksb0JBQW9CLENBQ3ZCLElBQUksQ0FBQyxNQUFNLEVBQ1gsa0JBQWtCLEVBQ2xCLE9BQU8sQ0FBQyxjQUFjLEVBQ3RCLHVCQUF1QixFQUN2QixrQkFBa0IsRUFDbEIsSUFBSSxjQUFjLEVBQUUsQ0FDcEIsQ0FDRCxDQUNELENBQ0QsQ0FBQTtRQUVELG9CQUFvQixHQUFHLDZCQUE2QixDQUNuRDtZQUNDLFdBQVcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxXQUFXO1lBQzlCLG9CQUFvQixFQUFFLEdBQUcsRUFBRSxDQUFDLGFBQWE7WUFDekMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFLENBQUMsa0JBQWtCO1NBQzVDLEVBQ0QsV0FBVyxDQUNYLENBQUE7UUFFRCxVQUFVLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFBO0lBQzdGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDZCQUE2QixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzlDLE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsc0JBQXNCLENBQUMsY0FBYyxDQUFDLG1CQUFtQixFQUN6RCxRQUFRLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLENBQ3JDLENBQUE7UUFDRCxJQUFJLENBQUM7WUFDSixNQUFNLFVBQVUsQ0FBQyxjQUFjLENBQzlCLHVCQUF1QixDQUFDLEVBQUUsVUFBVSxFQUFFLEVBQUUsT0FBTyx3QkFBZ0IsRUFBRSxFQUFFLENBQUMsRUFDcEUsT0FBTyxFQUNQLFNBQVMsQ0FDVCxDQUFBO1lBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxDQUFBO1FBQzdDLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLEtBQUssQ0FBQyxPQUFPLEVBQ2IsNkhBQTZILENBQzdILENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsK0JBQStCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDaEQsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixzQkFBc0IsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLEVBQ3pELFFBQVEsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQ2xDLENBQUE7UUFDRCxJQUFJLENBQUM7WUFDSixNQUFNLFVBQVUsQ0FBQyxjQUFjLENBQzlCLHVCQUF1QixDQUFDLEVBQUUsVUFBVSxFQUFFLEVBQUUsT0FBTyx3QkFBZ0IsRUFBRSxFQUFFLENBQUMsRUFDcEUsT0FBTyxFQUNQLFNBQVMsQ0FDVCxDQUFBO1lBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxDQUFBO1FBQzdDLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLEtBQUssQ0FBQyxPQUFPLEVBQ2IsNkhBQTZILENBQzdILENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO1FBQ2pDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDNUQsT0FBTyxVQUFVO2FBQ2YsY0FBYyxDQUNkLHVCQUF1QixDQUFDLEVBQUUsVUFBVSxFQUFFLEVBQUUsT0FBTyx3QkFBZ0IsRUFBRSxFQUFFLENBQUMsRUFDcEUsT0FBTyxFQUNQLFNBQVMsQ0FDVDthQUNBLElBQUksQ0FDSixHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLDhCQUE4QixDQUFDLEVBQ2pELENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FDVCxNQUFNLENBQUMsV0FBVyxDQUNqQixLQUFLLENBQUMsT0FBTyxFQUNiLDBIQUEwSCxDQUMxSCxDQUNGLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxzQ0FBc0MsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN2RCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsRUFDekQsUUFBUSxDQUFDLFVBQVUsQ0FBQyxzQ0FBc0MsQ0FBQyxDQUMzRCxDQUFBO1FBQ0QsSUFBSSxDQUFDO1lBQ0osTUFBTSxVQUFVLENBQUMsY0FBYyxDQUM5Qix1QkFBdUIsQ0FBQyxFQUFFLFVBQVUsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUUsRUFBRSxDQUFDLEVBQ3BFLE9BQU8sRUFDUCxTQUFTLENBQ1QsQ0FBQTtZQUNELE1BQU0sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDM0IsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsTUFBTSxDQUFDLFdBQVcsQ0FDakIsS0FBSyxDQUFDLE9BQU8sRUFDYixxSkFBcUosQ0FDckosQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM3RCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsRUFDekQsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FDdkIsQ0FBQTtRQUNELE1BQU0sUUFBUSxHQUE4QjtZQUMzQyxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUM5QixFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtTQUNoQyxDQUFBO1FBQ0QsTUFBTSxVQUFVLENBQUMsY0FBYyxDQUM5Qix1QkFBdUIsQ0FBQyxFQUFFLFVBQVUsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUUsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFDbEYsT0FBTyxFQUNQLFNBQVMsQ0FDVCxDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLGtCQUFrQixFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDN0QsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNkNBQTZDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDOUQsTUFBTSxzQkFBc0IsRUFBRSxDQUFBO1FBQzlCLE1BQU0sUUFBUSxHQUE4QjtZQUMzQyxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUM5QixFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtTQUNoQyxDQUFBO1FBQ0QsTUFBTSxVQUFVLENBQUMsY0FBYyxDQUM5Qix1QkFBdUIsQ0FBQyxFQUFFLFVBQVUsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUUsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFDbEYsT0FBTyxFQUNQLFNBQVMsQ0FDVCxDQUFBO1FBQ0QsT0FBTyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sa0JBQWtCLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUNwRSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxnREFBZ0QsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNqRSxNQUFNLHNCQUFzQixDQUFDLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQTtRQUM5RCxNQUFNLFFBQVEsR0FBOEI7WUFDM0MsRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUU7WUFDaEMsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUU7WUFDOUIsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7U0FDaEMsQ0FBQTtRQUNELE1BQU0sVUFBVSxDQUFDLGNBQWMsQ0FDOUIsdUJBQXVCLENBQUMsRUFBRSxVQUFVLEVBQUUsRUFBRSxPQUFPLHdCQUFnQixFQUFFLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQ2xGLE9BQU8sRUFDUCxTQUFTLENBQ1QsQ0FBQTtRQUNELE9BQU8sTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLGtCQUFrQixFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDcEUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsd0JBQXdCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDekMsTUFBTSxRQUFRLEdBQThCLENBQUMsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFBO1FBQzVFLE1BQU0sVUFBVSxDQUFDLGFBQWEsQ0FDN0IsdUJBQXVCLENBQUMsRUFBRSxVQUFVLEVBQUUsRUFBRSxPQUFPLHdCQUFnQixFQUFFLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQ2xGLE9BQU8sRUFDUCxTQUFTLENBQ1QsQ0FBQTtRQUNELE9BQU8sTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLGtCQUFrQixFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDcEUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsOEJBQThCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDL0MsTUFBTSxRQUFRLEdBQThCLENBQUMsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFBO1FBQzVFLE1BQU0sVUFBVSxDQUFDLGFBQWEsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUM3RixPQUFPLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxrQkFBa0IsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ3BFLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHlDQUF5QyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzFELE1BQU0sUUFBUSxHQUE4QixDQUFDLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQTtRQUM1RSxNQUFNLFVBQVUsQ0FBQyxjQUFjLENBQUMsdUJBQXVCLENBQUMsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDOUYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLGtCQUFrQixFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDN0QsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMseUJBQXlCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDMUMsTUFBTSxzQkFBc0IsQ0FBQyxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUE7UUFDN0QsTUFBTSxRQUFRLEdBQThCLENBQUMsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFBO1FBQzVFLE1BQU0sVUFBVSxDQUFDLGNBQWMsQ0FDOUIsdUJBQXVCLENBQUM7WUFDdkIsVUFBVSxFQUFFLEVBQUUsT0FBTyx3QkFBZ0IsRUFBRTtZQUN2QyxPQUFPLEVBQUUsR0FBRztZQUNaLFNBQVMsRUFBRSxLQUFLO1NBQ2hCLENBQUMsRUFDRixPQUFPLEVBQ1AsU0FBUyxDQUNULENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sa0JBQWtCLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUM3RCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxvREFBb0QsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNyRSxNQUFNLHNCQUFzQixDQUMzQixFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxFQUMvQixFQUFFLEdBQUcsRUFBRSxhQUFhLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUNwQyxDQUFBO1FBQ0QsTUFBTSxRQUFRLEdBQThCO1lBQzNDLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFO1lBQzlCLEVBQUUsR0FBRyxFQUFFLGFBQWEsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFO1NBQ3BDLENBQUE7UUFDRCxNQUFNLFVBQVUsQ0FBQyxjQUFjLENBQzlCLHVCQUF1QixDQUFDO1lBQ3ZCLFVBQVUsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUU7WUFDdkMsT0FBTyxFQUFFLEdBQUc7WUFDWixTQUFTLEVBQUUsS0FBSztTQUNoQixDQUFDLEVBQ0YsT0FBTyxFQUNQLFNBQVMsQ0FDVCxDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLGtCQUFrQixFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDN0QsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNkJBQTZCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDOUMsTUFBTSxRQUFRLEdBQThCLENBQUMsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQzdFLE1BQU0sVUFBVSxDQUFDLGdCQUFnQixDQUNoQyx1QkFBdUIsQ0FBQztZQUN2QixPQUFPLEVBQUUsR0FBRztZQUNaLFVBQVUsRUFBRSxFQUFFLE9BQU8sdUJBQWMsRUFBRSxTQUFTLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUU7U0FDbEUsQ0FBQyxDQUNGLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sa0JBQWtCLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUM3RCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw2REFBNkQsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM5RSxNQUFNLFFBQVEsR0FBOEIsQ0FBQyxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDN0UsTUFBTSxVQUFVLENBQUMsZ0JBQWdCLENBQ2hDLHVCQUF1QixDQUFDO1lBQ3ZCLE9BQU8sRUFBRSxHQUFHO1lBQ1osVUFBVSxFQUFFLEVBQUUsT0FBTyx1QkFBYyxFQUFFLFNBQVMsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRTtTQUNsRSxDQUFDLENBQ0YsQ0FBQTtRQUNELE1BQU0sVUFBVSxDQUFDLGdCQUFnQixDQUNoQyx1QkFBdUIsQ0FBQztZQUN2QixPQUFPLEVBQUUsR0FBRztZQUNaLFVBQVUsRUFBRSxFQUFFLE9BQU8sdUJBQWMsRUFBRSxTQUFTLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUU7U0FDbEUsQ0FBQyxDQUNGLENBQUE7UUFDRCxNQUFNLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FDaEMsdUJBQXVCLENBQUM7WUFDdkIsT0FBTyxFQUFFLEdBQUc7WUFDWixVQUFVLEVBQUUsRUFBRSxPQUFPLHVCQUFjLEVBQUUsU0FBUyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFO1NBQ2xFLENBQUMsQ0FDRixDQUFBO1FBQ0QsTUFBTSxVQUFVLENBQUMsZ0JBQWdCLENBQ2hDLHVCQUF1QixDQUFDO1lBQ3ZCLE9BQU8sRUFBRSxHQUFHO1lBQ1osVUFBVSxFQUFFLEVBQUUsT0FBTyx1QkFBYyxFQUFFLFNBQVMsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRTtTQUNsRSxDQUFDLENBQ0YsQ0FBQTtRQUNELE1BQU0sVUFBVSxDQUFDLGdCQUFnQixDQUNoQyx1QkFBdUIsQ0FBQztZQUN2QixPQUFPLEVBQUUsR0FBRztZQUNaLFVBQVUsRUFBRSxFQUFFLE9BQU8sdUJBQWMsRUFBRSxTQUFTLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUU7U0FDbEUsQ0FBQyxDQUNGLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sa0JBQWtCLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUM3RCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywwQkFBMEIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMzQyxNQUFNLHNCQUFzQixDQUFDLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQTtRQUM1RCxNQUFNLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FDaEMsdUJBQXVCLENBQUM7WUFDdkIsT0FBTyxFQUFFLEdBQUc7WUFDWixVQUFVLEVBQUUsRUFBRSxPQUFPLHVCQUFjLEVBQUUsU0FBUyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFO1lBQ2xFLFNBQVMsRUFBRSxLQUFLO1NBQ2hCLENBQUMsQ0FDRixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLGtCQUFrQixFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDdkQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNEJBQTRCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDN0MsTUFBTSxzQkFBc0IsQ0FBQyxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUE7UUFDNUQsTUFBTSxVQUFVLENBQUMsZUFBZSxDQUMvQix1QkFBdUIsQ0FBQztZQUN2QixPQUFPLEVBQUUsR0FBRztZQUNaLFVBQVUsRUFBRSxFQUFFLE9BQU8sdUJBQWMsRUFBRSxTQUFTLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDbEUsU0FBUyxFQUFFLEtBQUs7U0FDaEIsQ0FBQyxDQUNGLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sa0JBQWtCLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUN2RCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM3QyxNQUFNLHNCQUFzQixDQUFDLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUM3RCxNQUFNLFVBQVUsQ0FBQyxlQUFlLENBQUMsdUJBQXVCLENBQUMsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDN0YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLGtCQUFrQixFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDdkQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsb0NBQW9DLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDckQsTUFBTSxzQkFBc0IsQ0FBQyxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDN0QsTUFBTSxzQkFBc0IsQ0FBQyxFQUFFLEdBQUcsRUFBRSxhQUFhLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDbkUsTUFBTSxzQkFBc0IsQ0FBQyxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDOUQsTUFBTSxVQUFVLENBQUMsZUFBZSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzdGLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxrQkFBa0IsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQ3ZELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLCtDQUErQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2hFLE1BQU0sc0JBQXNCLENBQUMsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQzdELE1BQU0sUUFBUSxHQUE4QjtZQUMzQyxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtZQUMvQixFQUFFLEdBQUcsRUFBRSxhQUFhLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRTtTQUNwQyxDQUFBO1FBQ0QsTUFBTSxVQUFVLENBQUMsY0FBYyxDQUM5Qix1QkFBdUIsQ0FBQyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQzNELGFBQWEsRUFDYixTQUFTLENBQ1QsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxrQkFBa0IsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQzdELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHFCQUFxQixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3RDLE1BQU0sc0JBQXNCLENBQUMsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQzdELE1BQU0sUUFBUSxHQUE4QjtZQUMzQyxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtZQUMvQixFQUFFLEdBQUcsRUFBRSxhQUFhLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7U0FDN0QsQ0FBQTtRQUNELE1BQU0sVUFBVSxDQUFDLGNBQWMsQ0FDOUIsdUJBQXVCLENBQUMsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUMzRCxhQUFhLEVBQ2IsaUJBQWlCLENBQ2pCLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sa0JBQWtCLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUM3RCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNyRCxNQUFNLHNCQUFzQixDQUFDO1lBQzVCLEdBQUcsRUFBRSxPQUFPO1lBQ1osT0FBTyxFQUFFLElBQUk7WUFDYixJQUFJLEVBQUUsb0NBQW9DO1NBQzFDLENBQUMsQ0FBQTtRQUNGLE1BQU0sUUFBUSxHQUE4QjtZQUMzQyxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsb0NBQW9DLEVBQUU7WUFDM0UsRUFBRSxHQUFHLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixFQUFFO1NBQzdELENBQUE7UUFDRCxNQUFNLFVBQVUsQ0FBQyxjQUFjLENBQzlCLHVCQUF1QixDQUFDLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFDM0QsYUFBYSxFQUNiLGlCQUFpQixDQUNqQixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLGtCQUFrQixFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDN0QsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsd0JBQXdCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDekMsTUFBTSxzQkFBc0IsQ0FDM0IsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLG9DQUFvQyxFQUFFLEVBQzNFLEVBQUUsR0FBRyxFQUFFLGFBQWEsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxvQ0FBb0MsRUFBRSxDQUNoRixDQUFBO1FBQ0QsTUFBTSxRQUFRLEdBQThCO1lBQzNDLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxvQ0FBb0MsRUFBRTtZQUMzRSxFQUFFLEdBQUcsRUFBRSxhQUFhLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7U0FDN0QsQ0FBQTtRQUNELE1BQU0sVUFBVSxDQUFDLGNBQWMsQ0FDOUIsdUJBQXVCLENBQUM7WUFDdkIsT0FBTyxFQUFFLEdBQUc7WUFDWixTQUFTLEVBQUUsS0FBSztZQUNoQixJQUFJLEVBQUUsb0NBQW9DO1NBQzFDLENBQUMsRUFDRixhQUFhLEVBQ2IsaUJBQWlCLENBQ2pCLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sa0JBQWtCLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUM3RCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN6QyxNQUFNLHNCQUFzQixDQUFDO1lBQzVCLEdBQUcsRUFBRSxPQUFPO1lBQ1osT0FBTyxFQUFFLElBQUk7WUFDYixJQUFJLEVBQUUsb0NBQW9DO1NBQzFDLENBQUMsQ0FBQTtRQUNGLE1BQU0sUUFBUSxHQUE4QjtZQUMzQyxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsb0NBQW9DLEVBQUU7WUFDM0UsRUFBRSxHQUFHLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUU7U0FDcEMsQ0FBQTtRQUNELE1BQU0sVUFBVSxDQUFDLGNBQWMsQ0FDOUIsdUJBQXVCLENBQUMsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUMzRCxhQUFhLEVBQ2IsU0FBUyxDQUNULENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sa0JBQWtCLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUM3RCxDQUFDLENBQUMsQ0FBQTtJQUVGLEtBQUssVUFBVSxzQkFBc0IsQ0FBQyxHQUFHLFdBQXNDO1FBQzlFLE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsc0JBQXNCLENBQUMsY0FBYyxDQUFDLG1CQUFtQixFQUN6RCxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQ3RELENBQUE7SUFDRixDQUFDO0lBRUQsS0FBSyxVQUFVLGtCQUFrQjtRQUNoQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQ2hCLENBQ0MsTUFBTSxXQUFXLENBQUMsUUFBUSxDQUFDLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUNyRixDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FDbEIsQ0FBQTtJQUNGLENBQUM7SUFFRCxTQUFTLHVCQUF1QixDQUFDLEVBQ2hDLE9BQU8sRUFDUCxJQUFJLEVBQ0osU0FBUyxFQUNULFVBQVUsRUFDVixXQUFXLEdBT1g7UUFDQSxNQUFNLGlCQUFpQixHQUFHLFVBQVUsS0FHbkM7WUFDQSxNQUFNLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLEdBQUcsS0FBSyxDQUFDLFNBQVMsSUFBSTtnQkFDakUsT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsUUFBUSxFQUFFLEtBQUs7Z0JBQ2YsTUFBTSxFQUFFLEtBQUs7Z0JBQ2IsT0FBTyxFQUFFLEtBQUs7YUFDZCxDQUFBO1lBQ0QsT0FBTyxJQUFJLFlBQVksQ0FBQyxPQUFRLEVBQUUsUUFBUyxFQUFFLE1BQU8sRUFBRSxPQUFRLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQy9FLENBQUMsQ0FBQTtRQUNELE1BQU0sTUFBTSxHQUFtQixFQUFFLENBQUE7UUFDakMsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNoQixNQUFNLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7WUFDMUMsSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFDakIsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFBO1lBQzVDLENBQUM7UUFDRixDQUFDO1FBQ0QsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksMEJBQTBCLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7UUFDN0YsT0FBTyxJQUFJLHNCQUFzQixDQUNoQyxVQUFVLEVBQ1YsT0FBTyxJQUFJLGNBQWMsRUFDekIsSUFBSSxFQUNKLElBQUksQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUNuRCxTQUFTLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFDMUMsSUFBSSxFQUNKLEtBQUssQ0FDTCxDQUFBO0lBQ0YsQ0FBQztBQUNGLENBQUMsQ0FBQyxDQUFBIn0=