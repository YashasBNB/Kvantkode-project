/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { FileService } from '../../../files/common/fileService.js';
import { NullLogService } from '../../../log/common/log.js';
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { joinPath } from '../../../../base/common/resources.js';
import { InMemoryFileSystemProvider } from '../../../files/common/inMemoryFilesystemProvider.js';
import { AbstractNativeEnvironmentService } from '../../../environment/common/environmentService.js';
import product from '../../../product/common/product.js';
import { UserDataProfilesMainService } from '../../electron-main/userDataProfile.js';
import { StateService } from '../../../state/node/stateService.js';
import { UriIdentityService } from '../../../uriIdentity/common/uriIdentityService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
const ROOT = URI.file('tests').with({ scheme: 'vscode-tests' });
class TestEnvironmentService extends AbstractNativeEnvironmentService {
    constructor(_appSettingsHome) {
        super(Object.create(null), Object.create(null), { _serviceBrand: undefined, ...product });
        this._appSettingsHome = _appSettingsHome;
    }
    get userRoamingDataHome() {
        return this._appSettingsHome.with({ scheme: Schemas.vscodeUserData });
    }
    get extensionsPath() {
        return joinPath(this.userRoamingDataHome, 'extensions.json').path;
    }
    get stateResource() {
        return joinPath(this.userRoamingDataHome, 'state.json');
    }
    get cacheHome() {
        return joinPath(this.userRoamingDataHome, 'cache');
    }
}
suite('UserDataProfileMainService', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let testObject;
    let environmentService, stateService;
    setup(async () => {
        const logService = new NullLogService();
        const fileService = disposables.add(new FileService(logService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(Schemas.vscodeUserData, fileSystemProvider));
        environmentService = new TestEnvironmentService(joinPath(ROOT, 'User'));
        stateService = disposables.add(new StateService(1 /* SaveStrategy.DELAYED */, environmentService, logService, fileService));
        testObject = disposables.add(new UserDataProfilesMainService(stateService, disposables.add(new UriIdentityService(fileService)), environmentService, fileService, logService));
        await stateService.init();
    });
    test('default profile', () => {
        assert.strictEqual(testObject.defaultProfile.isDefault, true);
    });
    test('profiles always include default profile', () => {
        assert.deepStrictEqual(testObject.profiles.length, 1);
        assert.deepStrictEqual(testObject.profiles[0].isDefault, true);
    });
    test('default profile when there are profiles', async () => {
        await testObject.createNamedProfile('test');
        assert.strictEqual(testObject.defaultProfile.isDefault, true);
    });
    test('default profile when profiles are removed', async () => {
        const profile = await testObject.createNamedProfile('test');
        await testObject.removeProfile(profile);
        assert.strictEqual(testObject.defaultProfile.isDefault, true);
    });
    test('when no profile is set', async () => {
        await testObject.createNamedProfile('profile1');
        assert.equal(testObject.getProfileForWorkspace({ id: 'id' }), undefined);
        assert.equal(testObject.getProfileForWorkspace({
            id: 'id',
            configPath: environmentService.userRoamingDataHome,
        }), undefined);
        assert.equal(testObject.getProfileForWorkspace({ id: 'id', uri: environmentService.userRoamingDataHome }), undefined);
    });
    test('set profile to a workspace', async () => {
        const workspace = { id: 'id', configPath: environmentService.userRoamingDataHome };
        const profile = await testObject.createNamedProfile('profile1');
        testObject.setProfileForWorkspace(workspace, profile);
        assert.strictEqual(testObject.getProfileForWorkspace(workspace)?.id, profile.id);
    });
    test('set profile to a folder', async () => {
        const workspace = { id: 'id', uri: environmentService.userRoamingDataHome };
        const profile = await testObject.createNamedProfile('profile1');
        testObject.setProfileForWorkspace(workspace, profile);
        assert.strictEqual(testObject.getProfileForWorkspace(workspace)?.id, profile.id);
    });
    test('set profile to a window', async () => {
        const workspace = { id: 'id' };
        const profile = await testObject.createNamedProfile('profile1');
        testObject.setProfileForWorkspace(workspace, profile);
        assert.strictEqual(testObject.getProfileForWorkspace(workspace)?.id, profile.id);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlTWFpblNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhUHJvZmlsZS90ZXN0L2VsZWN0cm9uLW1haW4vdXNlckRhdGFQcm9maWxlTWFpblNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNwRyxPQUFPLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRixPQUFPLEVBQWdCLFlBQVksRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9GLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUE7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