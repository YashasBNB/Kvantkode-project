/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual } from 'assert';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter } from '../../../../../base/common/event.js';
import { isLinux, isWindows } from '../../../../../base/common/platform.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IConfigurationService, } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IQuickInputService, } from '../../../../../platform/quickinput/common/quickInput.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { TestThemeService } from '../../../../../platform/theme/test/common/testThemeService.js';
import { ITerminalInstanceService } from '../../browser/terminal.js';
import { TerminalProfileQuickpick, } from '../../browser/terminalProfileQuickpick.js';
import { TerminalProfileService } from '../../browser/terminalProfileService.js';
import { ITerminalProfileService } from '../../common/terminal.js';
import { ITerminalContributionService } from '../../common/terminalExtensionPoints.js';
import { IWorkbenchEnvironmentService } from '../../../../services/environment/common/environmentService.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { IRemoteAgentService } from '../../../../services/remote/common/remoteAgentService.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
import { TestExtensionService } from '../../../../test/common/workbenchTestServices.js';
class TestTerminalProfileService extends TerminalProfileService {
    refreshAvailableProfiles() {
        this.hasRefreshedProfiles = this._refreshAvailableProfilesNow();
    }
    refreshAndAwaitAvailableProfiles() {
        this.refreshAvailableProfiles();
        if (!this.hasRefreshedProfiles) {
            throw new Error('has not refreshed profiles yet');
        }
        return this.hasRefreshedProfiles;
    }
}
class MockTerminalProfileService {
    constructor() {
        this.availableProfiles = [];
        this.contributedProfiles = [];
    }
    async getPlatformKey() {
        return 'linux';
    }
    getDefaultProfileName() {
        return this._defaultProfileName;
    }
    setProfiles(profiles, contributed) {
        this.availableProfiles = profiles;
        this.contributedProfiles = contributed;
    }
    setDefaultProfileName(name) {
        this._defaultProfileName = name;
    }
}
class MockQuickInputService {
    constructor() {
        this._pick = powershellPick;
    }
    async pick(picks, options, token) {
        Promise.resolve(picks);
        return this._pick;
    }
    setPick(pick) {
        this._pick = pick;
    }
}
class TestTerminalProfileQuickpick extends TerminalProfileQuickpick {
}
class TestTerminalExtensionService extends TestExtensionService {
    constructor() {
        super(...arguments);
        this._onDidChangeExtensions = new Emitter();
    }
}
class TestTerminalContributionService {
    constructor() {
        this.terminalProfiles = [];
    }
    setProfiles(profiles) {
        this.terminalProfiles = profiles;
    }
}
class TestTerminalInstanceService {
    constructor() {
        this._profiles = new Map();
        this._hasReturnedNone = true;
    }
    async getBackend(remoteAuthority) {
        return {
            getProfiles: async () => {
                if (this._hasReturnedNone) {
                    return this._profiles.get(remoteAuthority ?? '') || [];
                }
                else {
                    this._hasReturnedNone = true;
                    return [];
                }
            },
        };
    }
    setProfiles(remoteAuthority, profiles) {
        this._profiles.set(remoteAuthority ?? '', profiles);
    }
    setReturnNone() {
        this._hasReturnedNone = false;
    }
}
class TestRemoteAgentService {
    setEnvironment(os) {
        this._os = os;
    }
    async getEnvironment() {
        return { os: this._os };
    }
}
const defaultTerminalConfig = {
    profiles: { windows: {}, linux: {}, osx: {} },
};
let powershellProfile = {
    profileName: 'PowerShell',
    path: 'C:\\Powershell.exe',
    isDefault: true,
    icon: Codicon.terminalPowershell,
};
let jsdebugProfile = {
    extensionIdentifier: 'ms-vscode.js-debug-nightly',
    icon: 'debug',
    id: 'extension.js-debug.debugTerminal',
    title: 'JavaScript Debug Terminal',
};
const powershellPick = {
    label: 'Powershell',
    profile: powershellProfile,
    profileName: powershellProfile.profileName,
};
const jsdebugPick = {
    label: 'Javascript Debug Terminal',
    profile: jsdebugProfile,
    profileName: jsdebugProfile.title,
};
suite('TerminalProfileService', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let configurationService;
    let terminalInstanceService;
    let terminalProfileService;
    let remoteAgentService;
    let extensionService;
    let environmentService;
    let instantiationService;
    setup(async () => {
        configurationService = new TestConfigurationService({
            files: {},
            terminal: {
                integrated: defaultTerminalConfig,
            },
        });
        instantiationService = workbenchInstantiationService({
            configurationService: () => configurationService,
        }, store);
        remoteAgentService = new TestRemoteAgentService();
        terminalInstanceService = new TestTerminalInstanceService();
        extensionService = new TestTerminalExtensionService();
        environmentService = {
            remoteAuthority: undefined,
        };
        const themeService = new TestThemeService();
        const terminalContributionService = new TestTerminalContributionService();
        instantiationService.stub(IExtensionService, extensionService);
        instantiationService.stub(IConfigurationService, configurationService);
        instantiationService.stub(IRemoteAgentService, remoteAgentService);
        instantiationService.stub(ITerminalContributionService, terminalContributionService);
        instantiationService.stub(ITerminalInstanceService, terminalInstanceService);
        instantiationService.stub(IWorkbenchEnvironmentService, environmentService);
        instantiationService.stub(IThemeService, themeService);
        terminalProfileService = store.add(instantiationService.createInstance(TestTerminalProfileService));
        //reset as these properties are changed in each test
        powershellProfile = {
            profileName: 'PowerShell',
            path: 'C:\\Powershell.exe',
            isDefault: true,
            icon: Codicon.terminalPowershell,
        };
        jsdebugProfile = {
            extensionIdentifier: 'ms-vscode.js-debug-nightly',
            icon: 'debug',
            id: 'extension.js-debug.debugTerminal',
            title: 'JavaScript Debug Terminal',
        };
        terminalInstanceService.setProfiles(undefined, [powershellProfile]);
        terminalInstanceService.setProfiles('fakeremote', []);
        terminalContributionService.setProfiles([jsdebugProfile]);
        if (isWindows) {
            remoteAgentService.setEnvironment(1 /* OperatingSystem.Windows */);
        }
        else if (isLinux) {
            remoteAgentService.setEnvironment(3 /* OperatingSystem.Linux */);
        }
        else {
            remoteAgentService.setEnvironment(2 /* OperatingSystem.Macintosh */);
        }
        configurationService.setUserConfiguration('terminal', { integrated: defaultTerminalConfig });
    });
    suite('Contributed Profiles', () => {
        test('should filter out contributed profiles set to null (Linux)', async () => {
            remoteAgentService.setEnvironment(3 /* OperatingSystem.Linux */);
            await configurationService.setUserConfiguration('terminal', {
                integrated: {
                    profiles: {
                        linux: {
                            'JavaScript Debug Terminal': null,
                        },
                    },
                },
            });
            configurationService.onDidChangeConfigurationEmitter.fire({
                affectsConfiguration: () => true,
                source: 2 /* ConfigurationTarget.USER */,
            });
            await terminalProfileService.refreshAndAwaitAvailableProfiles();
            deepStrictEqual(terminalProfileService.availableProfiles, [powershellProfile]);
            deepStrictEqual(terminalProfileService.contributedProfiles, []);
        });
        test('should filter out contributed profiles set to null (Windows)', async () => {
            remoteAgentService.setEnvironment(1 /* OperatingSystem.Windows */);
            await configurationService.setUserConfiguration('terminal', {
                integrated: {
                    profiles: {
                        windows: {
                            'JavaScript Debug Terminal': null,
                        },
                    },
                },
            });
            configurationService.onDidChangeConfigurationEmitter.fire({
                affectsConfiguration: () => true,
                source: 2 /* ConfigurationTarget.USER */,
            });
            await terminalProfileService.refreshAndAwaitAvailableProfiles();
            deepStrictEqual(terminalProfileService.availableProfiles, [powershellProfile]);
            deepStrictEqual(terminalProfileService.contributedProfiles, []);
        });
        test('should filter out contributed profiles set to null (macOS)', async () => {
            remoteAgentService.setEnvironment(2 /* OperatingSystem.Macintosh */);
            await configurationService.setUserConfiguration('terminal', {
                integrated: {
                    profiles: {
                        osx: {
                            'JavaScript Debug Terminal': null,
                        },
                    },
                },
            });
            configurationService.onDidChangeConfigurationEmitter.fire({
                affectsConfiguration: () => true,
                source: 2 /* ConfigurationTarget.USER */,
            });
            await terminalProfileService.refreshAndAwaitAvailableProfiles();
            deepStrictEqual(terminalProfileService.availableProfiles, [powershellProfile]);
            deepStrictEqual(terminalProfileService.contributedProfiles, []);
        });
        test('should include contributed profiles', async () => {
            await terminalProfileService.refreshAndAwaitAvailableProfiles();
            deepStrictEqual(terminalProfileService.availableProfiles, [powershellProfile]);
            deepStrictEqual(terminalProfileService.contributedProfiles, [jsdebugProfile]);
        });
    });
    test('should get profiles from remoteTerminalService when there is a remote authority', async () => {
        environmentService = {
            remoteAuthority: 'fakeremote',
        };
        instantiationService.stub(IWorkbenchEnvironmentService, environmentService);
        terminalProfileService = store.add(instantiationService.createInstance(TestTerminalProfileService));
        await terminalProfileService.hasRefreshedProfiles;
        deepStrictEqual(terminalProfileService.availableProfiles, []);
        deepStrictEqual(terminalProfileService.contributedProfiles, [jsdebugProfile]);
        terminalInstanceService.setProfiles('fakeremote', [powershellProfile]);
        await terminalProfileService.refreshAndAwaitAvailableProfiles();
        deepStrictEqual(terminalProfileService.availableProfiles, [powershellProfile]);
        deepStrictEqual(terminalProfileService.contributedProfiles, [jsdebugProfile]);
    });
    test('should fire onDidChangeAvailableProfiles only when available profiles have changed via user config', async () => {
        powershellProfile.icon = Codicon.lightBulb;
        let calls = [];
        store.add(terminalProfileService.onDidChangeAvailableProfiles((e) => calls.push(e)));
        await configurationService.setUserConfiguration('terminal', {
            integrated: {
                profiles: {
                    windows: powershellProfile,
                    linux: powershellProfile,
                    osx: powershellProfile,
                },
            },
        });
        await terminalProfileService.hasRefreshedProfiles;
        deepStrictEqual(calls, [[powershellProfile]]);
        deepStrictEqual(terminalProfileService.availableProfiles, [powershellProfile]);
        deepStrictEqual(terminalProfileService.contributedProfiles, [jsdebugProfile]);
        calls = [];
        await terminalProfileService.refreshAndAwaitAvailableProfiles();
        deepStrictEqual(calls, []);
    });
    test('should fire onDidChangeAvailableProfiles when available or contributed profiles have changed via remote/localTerminalService', async () => {
        powershellProfile.isDefault = false;
        terminalInstanceService.setProfiles(undefined, [powershellProfile]);
        const calls = [];
        store.add(terminalProfileService.onDidChangeAvailableProfiles((e) => calls.push(e)));
        await terminalProfileService.hasRefreshedProfiles;
        deepStrictEqual(calls, [[powershellProfile]]);
        deepStrictEqual(terminalProfileService.availableProfiles, [powershellProfile]);
        deepStrictEqual(terminalProfileService.contributedProfiles, [jsdebugProfile]);
    });
    test('should call refreshAvailableProfiles _onDidChangeExtensions', async () => {
        extensionService._onDidChangeExtensions.fire();
        const calls = [];
        store.add(terminalProfileService.onDidChangeAvailableProfiles((e) => calls.push(e)));
        await terminalProfileService.hasRefreshedProfiles;
        deepStrictEqual(calls, [[powershellProfile]]);
        deepStrictEqual(terminalProfileService.availableProfiles, [powershellProfile]);
        deepStrictEqual(terminalProfileService.contributedProfiles, [jsdebugProfile]);
    });
    suite('Profiles Quickpick', () => {
        let quickInputService;
        let mockTerminalProfileService;
        let terminalProfileQuickpick;
        setup(async () => {
            quickInputService = new MockQuickInputService();
            mockTerminalProfileService = new MockTerminalProfileService();
            instantiationService.stub(IQuickInputService, quickInputService);
            instantiationService.stub(ITerminalProfileService, mockTerminalProfileService);
            terminalProfileQuickpick = instantiationService.createInstance(TestTerminalProfileQuickpick);
        });
        test('setDefault', async () => {
            powershellProfile.isDefault = false;
            mockTerminalProfileService.setProfiles([powershellProfile], [jsdebugProfile]);
            mockTerminalProfileService.setDefaultProfileName(jsdebugProfile.title);
            const result = await terminalProfileQuickpick.showAndGetResult('setDefault');
            deepStrictEqual(result, powershellProfile.profileName);
        });
        test('setDefault to contributed', async () => {
            mockTerminalProfileService.setDefaultProfileName(powershellProfile.profileName);
            quickInputService.setPick(jsdebugPick);
            const result = await terminalProfileQuickpick.showAndGetResult('setDefault');
            const expected = {
                config: {
                    extensionIdentifier: jsdebugProfile.extensionIdentifier,
                    id: jsdebugProfile.id,
                    options: { color: undefined, icon: 'debug' },
                    title: jsdebugProfile.title,
                },
                keyMods: undefined,
            };
            deepStrictEqual(result, expected);
        });
        test('createInstance', async () => {
            mockTerminalProfileService.setDefaultProfileName(powershellProfile.profileName);
            const pick = { ...powershellPick, keyMods: { alt: true, ctrlCmd: false } };
            quickInputService.setPick(pick);
            const result = await terminalProfileQuickpick.showAndGetResult('createInstance');
            deepStrictEqual(result, { config: powershellProfile, keyMods: { alt: true, ctrlCmd: false } });
        });
        test('createInstance with contributed', async () => {
            const pick = { ...jsdebugPick, keyMods: { alt: true, ctrlCmd: false } };
            quickInputService.setPick(pick);
            const result = await terminalProfileQuickpick.showAndGetResult('createInstance');
            const expected = {
                config: {
                    extensionIdentifier: jsdebugProfile.extensionIdentifier,
                    id: jsdebugProfile.id,
                    options: { color: undefined, icon: 'debug' },
                    title: jsdebugProfile.title,
                },
                keyMods: { alt: true, ctrlCmd: false },
            };
            deepStrictEqual(result, expected);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9maWxlU2VydmljZS5pbnRlZ3JhdGlvblRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL3Rlc3QvYnJvd3Nlci90ZXJtaW5hbFByb2ZpbGVTZXJ2aWNlLmludGVncmF0aW9uVGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sUUFBUSxDQUFBO0FBRXhDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQW1CLE1BQU0sd0NBQXdDLENBQUE7QUFDNUYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUVOLHFCQUFxQixHQUNyQixNQUFNLCtEQUErRCxDQUFBO0FBQ3RFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBRXhILE9BQU8sRUFFTixrQkFBa0IsR0FHbEIsTUFBTSx5REFBeUQsQ0FBQTtBQU9oRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDcEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDcEUsT0FBTyxFQUVOLHdCQUF3QixHQUN4QixNQUFNLDJDQUEyQyxDQUFBO0FBQ2xELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2hGLE9BQU8sRUFBMEIsdUJBQXVCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtB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