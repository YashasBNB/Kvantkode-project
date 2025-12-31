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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9maWxlU2VydmljZS5pbnRlZ3JhdGlvblRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC90ZXN0L2Jyb3dzZXIvdGVybWluYWxQcm9maWxlU2VydmljZS5pbnRlZ3JhdGlvblRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUV4QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFtQixNQUFNLHdDQUF3QyxDQUFBO0FBQzVGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFFTixxQkFBcUIsR0FDckIsTUFBTSwrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUV4SCxPQUFPLEVBRU4sa0JBQWtCLEdBR2xCLE1BQU0seURBQXlELENBQUE7QUFPaEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3BFLE9BQU8sRUFFTix3QkFBd0IsR0FDeEIsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRixPQUFPLEVBQTBCLHVCQUF1QixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDMUYs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