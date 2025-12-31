/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import * as nls from '../../../../nls.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { FileAccess } from '../../../../base/common/network.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { KeymapInfo } from '../common/keymapInfo.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { readKeyboardConfig, } from '../../../../platform/keyboardLayout/common/keyboardConfig.js';
import { CachedKeyboardMapper, } from '../../../../platform/keyboardLayout/common/keyboardMapper.js';
import { OS, isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { WindowsKeyboardMapper } from '../common/windowsKeyboardMapper.js';
import { FallbackKeyboardMapper } from '../common/fallbackKeyboardMapper.js';
import { MacLinuxKeyboardMapper } from '../common/macLinuxKeyboardMapper.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { parse, getNodeType } from '../../../../base/common/json.js';
import * as objects from '../../../../base/common/objects.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as ConfigExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { getKeyboardLayoutId, IKeyboardLayoutService, } from '../../../../platform/keyboardLayout/common/keyboardLayout.js';
export class BrowserKeyboardMapperFactoryBase extends Disposable {
    get activeKeymap() {
        return this._activeKeymapInfo;
    }
    get keymapInfos() {
        return this._keymapInfos;
    }
    get activeKeyboardLayout() {
        if (!this._initialized) {
            return null;
        }
        return this._activeKeymapInfo?.layout ?? null;
    }
    get activeKeyMapping() {
        if (!this._initialized) {
            return null;
        }
        return this._activeKeymapInfo?.mapping ?? null;
    }
    get keyboardLayouts() {
        return this._keymapInfos.map((keymapInfo) => keymapInfo.layout);
    }
    constructor(_configurationService) {
        super();
        this._configurationService = _configurationService;
        this._onDidChangeKeyboardMapper = new Emitter();
        this.onDidChangeKeyboardMapper = this._onDidChangeKeyboardMapper.event;
        this.keyboardLayoutMapAllowed = navigator.keyboard !== undefined;
        this._keyboardMapper = null;
        this._initialized = false;
        this._keymapInfos = [];
        this._mru = [];
        this._activeKeymapInfo = null;
        if (navigator.keyboard &&
            navigator.keyboard.addEventListener) {
            ;
            navigator.keyboard.addEventListener('layoutchange', () => {
                // Update user keyboard map settings
                this._getBrowserKeyMapping().then((mapping) => {
                    if (this.isKeyMappingActive(mapping)) {
                        return;
                    }
                    this.setLayoutFromBrowserAPI();
                });
            });
        }
        this._register(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('keyboard')) {
                this._keyboardMapper = null;
                this._onDidChangeKeyboardMapper.fire();
            }
        }));
    }
    registerKeyboardLayout(layout) {
        this._keymapInfos.push(layout);
        this._mru = this._keymapInfos;
    }
    removeKeyboardLayout(layout) {
        let index = this._mru.indexOf(layout);
        this._mru.splice(index, 1);
        index = this._keymapInfos.indexOf(layout);
        this._keymapInfos.splice(index, 1);
    }
    getMatchedKeymapInfo(keyMapping) {
        if (!keyMapping) {
            return null;
        }
        const usStandard = this.getUSStandardLayout();
        if (usStandard) {
            let maxScore = usStandard.getScore(keyMapping);
            if (maxScore === 0) {
                return {
                    result: usStandard,
                    score: 0,
                };
            }
            let result = usStandard;
            for (let i = 0; i < this._mru.length; i++) {
                const score = this._mru[i].getScore(keyMapping);
                if (score > maxScore) {
                    if (score === 0) {
                        return {
                            result: this._mru[i],
                            score: 0,
                        };
                    }
                    maxScore = score;
                    result = this._mru[i];
                }
            }
            return {
                result,
                score: maxScore,
            };
        }
        for (let i = 0; i < this._mru.length; i++) {
            if (this._mru[i].fuzzyEqual(keyMapping)) {
                return {
                    result: this._mru[i],
                    score: 0,
                };
            }
        }
        return null;
    }
    getUSStandardLayout() {
        const usStandardLayouts = this._mru.filter((layout) => layout.layout.isUSStandard);
        if (usStandardLayouts.length) {
            return usStandardLayouts[0];
        }
        return null;
    }
    isKeyMappingActive(keymap) {
        return this._activeKeymapInfo && keymap && this._activeKeymapInfo.fuzzyEqual(keymap);
    }
    setUSKeyboardLayout() {
        this._activeKeymapInfo = this.getUSStandardLayout();
    }
    setActiveKeyMapping(keymap) {
        let keymapUpdated = false;
        const matchedKeyboardLayout = this.getMatchedKeymapInfo(keymap);
        if (matchedKeyboardLayout) {
            // let score = matchedKeyboardLayout.score;
            // Due to https://bugs.chromium.org/p/chromium/issues/detail?id=977609, any key after a dead key will generate a wrong mapping,
            // we shoud avoid yielding the false error.
            // if (keymap && score < 0) {
            // const donotAskUpdateKey = 'missing.keyboardlayout.donotask';
            // if (this._storageService.getBoolean(donotAskUpdateKey, StorageScope.APPLICATION)) {
            // 	return;
            // }
            // the keyboard layout doesn't actually match the key event or the keymap from chromium
            // this._notificationService.prompt(
            // 	Severity.Info,
            // 	nls.localize('missing.keyboardlayout', 'Fail to find matching keyboard layout'),
            // 	[{
            // 		label: nls.localize('keyboardLayoutMissing.configure', "Configure"),
            // 		run: () => this._commandService.executeCommand('workbench.action.openKeyboardLayoutPicker')
            // 	}, {
            // 		label: nls.localize('neverAgain', "Don't Show Again"),
            // 		isSecondary: true,
            // 		run: () => this._storageService.store(donotAskUpdateKey, true, StorageScope.APPLICATION)
            // 	}]
            // );
            // console.warn('Active keymap/keyevent does not match current keyboard layout', JSON.stringify(keymap), this._activeKeymapInfo ? JSON.stringify(this._activeKeymapInfo.layout) : '');
            // return;
            // }
            if (!this._activeKeymapInfo) {
                this._activeKeymapInfo = matchedKeyboardLayout.result;
                keymapUpdated = true;
            }
            else if (keymap) {
                if (matchedKeyboardLayout.result.getScore(keymap) > this._activeKeymapInfo.getScore(keymap)) {
                    this._activeKeymapInfo = matchedKeyboardLayout.result;
                    keymapUpdated = true;
                }
            }
        }
        if (!this._activeKeymapInfo) {
            this._activeKeymapInfo = this.getUSStandardLayout();
            keymapUpdated = true;
        }
        if (!this._activeKeymapInfo || !keymapUpdated) {
            return;
        }
        const index = this._mru.indexOf(this._activeKeymapInfo);
        this._mru.splice(index, 1);
        this._mru.unshift(this._activeKeymapInfo);
        this._setKeyboardData(this._activeKeymapInfo);
    }
    setActiveKeymapInfo(keymapInfo) {
        this._activeKeymapInfo = keymapInfo;
        const index = this._mru.indexOf(this._activeKeymapInfo);
        if (index === 0) {
            return;
        }
        this._mru.splice(index, 1);
        this._mru.unshift(this._activeKeymapInfo);
        this._setKeyboardData(this._activeKeymapInfo);
    }
    setLayoutFromBrowserAPI() {
        this._updateKeyboardLayoutAsync(this._initialized);
    }
    _updateKeyboardLayoutAsync(initialized, keyboardEvent) {
        if (!initialized) {
            return;
        }
        this._getBrowserKeyMapping(keyboardEvent).then((keyMap) => {
            // might be false positive
            if (this.isKeyMappingActive(keyMap)) {
                return;
            }
            this.setActiveKeyMapping(keyMap);
        });
    }
    getKeyboardMapper() {
        const config = readKeyboardConfig(this._configurationService);
        if (config.dispatch === 1 /* DispatchConfig.KeyCode */ ||
            !this._initialized ||
            !this._activeKeymapInfo) {
            // Forcefully set to use keyCode
            return new FallbackKeyboardMapper(config.mapAltGrToCtrlAlt, OS);
        }
        if (!this._keyboardMapper) {
            this._keyboardMapper = new CachedKeyboardMapper(BrowserKeyboardMapperFactory._createKeyboardMapper(this._activeKeymapInfo, config.mapAltGrToCtrlAlt));
        }
        return this._keyboardMapper;
    }
    validateCurrentKeyboardMapping(keyboardEvent) {
        if (!this._initialized) {
            return;
        }
        const isCurrentKeyboard = this._validateCurrentKeyboardMapping(keyboardEvent);
        if (isCurrentKeyboard) {
            return;
        }
        this._updateKeyboardLayoutAsync(true, keyboardEvent);
    }
    setKeyboardLayout(layoutName) {
        const matchedLayouts = this.keymapInfos.filter((keymapInfo) => getKeyboardLayoutId(keymapInfo.layout) === layoutName);
        if (matchedLayouts.length > 0) {
            this.setActiveKeymapInfo(matchedLayouts[0]);
        }
    }
    _setKeyboardData(keymapInfo) {
        this._initialized = true;
        this._keyboardMapper = null;
        this._onDidChangeKeyboardMapper.fire();
    }
    static _createKeyboardMapper(keymapInfo, mapAltGrToCtrlAlt) {
        const rawMapping = keymapInfo.mapping;
        const isUSStandard = !!keymapInfo.layout.isUSStandard;
        if (OS === 1 /* OperatingSystem.Windows */) {
            return new WindowsKeyboardMapper(isUSStandard, rawMapping, mapAltGrToCtrlAlt);
        }
        if (Object.keys(rawMapping).length === 0) {
            // Looks like reading the mappings failed (most likely Mac + Japanese/Chinese keyboard layouts)
            return new FallbackKeyboardMapper(mapAltGrToCtrlAlt, OS);
        }
        return new MacLinuxKeyboardMapper(isUSStandard, rawMapping, mapAltGrToCtrlAlt, OS);
    }
    //#region Browser API
    _validateCurrentKeyboardMapping(keyboardEvent) {
        if (!this._initialized) {
            return true;
        }
        const standardKeyboardEvent = keyboardEvent;
        const currentKeymap = this._activeKeymapInfo;
        if (!currentKeymap) {
            return true;
        }
        if (standardKeyboardEvent.browserEvent.key === 'Dead' ||
            standardKeyboardEvent.browserEvent.isComposing) {
            return true;
        }
        const mapping = currentKeymap.mapping[standardKeyboardEvent.code];
        if (!mapping) {
            return false;
        }
        if (mapping.value === '') {
            // The value is empty when the key is not a printable character, we skip validation.
            if (keyboardEvent.ctrlKey || keyboardEvent.metaKey) {
                setTimeout(() => {
                    this._getBrowserKeyMapping().then((keymap) => {
                        if (this.isKeyMappingActive(keymap)) {
                            return;
                        }
                        this.setLayoutFromBrowserAPI();
                    });
                }, 350);
            }
            return true;
        }
        const expectedValue = standardKeyboardEvent.altKey && standardKeyboardEvent.shiftKey
            ? mapping.withShiftAltGr
            : standardKeyboardEvent.altKey
                ? mapping.withAltGr
                : standardKeyboardEvent.shiftKey
                    ? mapping.withShift
                    : mapping.value;
        const isDead = (standardKeyboardEvent.altKey &&
            standardKeyboardEvent.shiftKey &&
            mapping.withShiftAltGrIsDeadKey) ||
            (standardKeyboardEvent.altKey && mapping.withAltGrIsDeadKey) ||
            (standardKeyboardEvent.shiftKey && mapping.withShiftIsDeadKey) ||
            mapping.valueIsDeadKey;
        if (isDead && standardKeyboardEvent.browserEvent.key !== 'Dead') {
            return false;
        }
        // TODO, this assumption is wrong as `browserEvent.key` doesn't necessarily equal expectedValue from real keymap
        if (!isDead && standardKeyboardEvent.browserEvent.key !== expectedValue) {
            return false;
        }
        return true;
    }
    async _getBrowserKeyMapping(keyboardEvent) {
        if (this.keyboardLayoutMapAllowed) {
            try {
                return await navigator.keyboard.getLayoutMap().then((e) => {
                    const ret = {};
                    for (const key of e) {
                        ret[key[0]] = {
                            value: key[1],
                            withShift: '',
                            withAltGr: '',
                            withShiftAltGr: '',
                        };
                    }
                    return ret;
                    // const matchedKeyboardLayout = this.getMatchedKeymapInfo(ret);
                    // if (matchedKeyboardLayout) {
                    // 	return matchedKeyboardLayout.result.mapping;
                    // }
                    // return null;
                });
            }
            catch {
                // getLayoutMap can throw if invoked from a nested browsing context
                this.keyboardLayoutMapAllowed = false;
            }
        }
        if (keyboardEvent &&
            !keyboardEvent.shiftKey &&
            !keyboardEvent.altKey &&
            !keyboardEvent.metaKey &&
            !keyboardEvent.metaKey) {
            const ret = {};
            const standardKeyboardEvent = keyboardEvent;
            ret[standardKeyboardEvent.browserEvent.code] = {
                value: standardKeyboardEvent.browserEvent.key,
                withShift: '',
                withAltGr: '',
                withShiftAltGr: '',
            };
            const matchedKeyboardLayout = this.getMatchedKeymapInfo(ret);
            if (matchedKeyboardLayout) {
                return ret;
            }
            return null;
        }
        return null;
    }
}
export class BrowserKeyboardMapperFactory extends BrowserKeyboardMapperFactoryBase {
    constructor(configurationService, notificationService, storageService, commandService) {
        // super(notificationService, storageService, commandService);
        super(configurationService);
        const platform = isWindows ? 'win' : isMacintosh ? 'darwin' : 'linux';
        import(FileAccess.asBrowserUri(`vs/workbench/services/keybinding/browser/keyboardLayouts/layout.contribution.${platform}.js`).path).then((m) => {
            const keymapInfos = m.KeyboardLayoutContribution.INSTANCE.layoutInfos;
            this._keymapInfos.push(...keymapInfos.map((info) => new KeymapInfo(info.layout, info.secondaryLayouts, info.mapping, info.isUserKeyboardLayout)));
            this._mru = this._keymapInfos;
            this._initialized = true;
            this.setLayoutFromBrowserAPI();
        });
    }
}
class UserKeyboardLayout extends Disposable {
    get keyboardLayout() {
        return this._keyboardLayout;
    }
    constructor(keyboardLayoutResource, fileService) {
        super();
        this.keyboardLayoutResource = keyboardLayoutResource;
        this.fileService = fileService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._keyboardLayout = null;
        this.reloadConfigurationScheduler = this._register(new RunOnceScheduler(() => this.reload().then((changed) => {
            if (changed) {
                this._onDidChange.fire();
            }
        }), 50));
        this._register(Event.filter(this.fileService.onDidFilesChange, (e) => e.contains(this.keyboardLayoutResource))(() => this.reloadConfigurationScheduler.schedule()));
    }
    async initialize() {
        await this.reload();
    }
    async reload() {
        const existing = this._keyboardLayout;
        try {
            const content = await this.fileService.readFile(this.keyboardLayoutResource);
            const value = parse(content.value.toString());
            if (getNodeType(value) === 'object') {
                const layoutInfo = value.layout;
                const mappings = value.rawMapping;
                this._keyboardLayout = KeymapInfo.createKeyboardLayoutFromDebugInfo(layoutInfo, mappings, true);
            }
            else {
                this._keyboardLayout = null;
            }
        }
        catch (e) {
            this._keyboardLayout = null;
        }
        return existing ? !objects.equals(existing, this._keyboardLayout) : true;
    }
}
let BrowserKeyboardLayoutService = class BrowserKeyboardLayoutService extends Disposable {
    constructor(environmentService, fileService, notificationService, storageService, commandService, configurationService) {
        super();
        this.configurationService = configurationService;
        this._onDidChangeKeyboardLayout = new Emitter();
        this.onDidChangeKeyboardLayout = this._onDidChangeKeyboardLayout.event;
        const keyboardConfig = configurationService.getValue('keyboard');
        const layout = keyboardConfig.layout;
        this._keyboardLayoutMode = layout ?? 'autodetect';
        this._factory = new BrowserKeyboardMapperFactory(configurationService, notificationService, storageService, commandService);
        this._register(this._factory.onDidChangeKeyboardMapper(() => {
            this._onDidChangeKeyboardLayout.fire();
        }));
        if (layout && layout !== 'autodetect') {
            // set keyboard layout
            this._factory.setKeyboardLayout(layout);
        }
        this._register(configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('keyboard.layout')) {
                const keyboardConfig = configurationService.getValue('keyboard');
                const layout = keyboardConfig.layout;
                this._keyboardLayoutMode = layout;
                if (layout === 'autodetect') {
                    this._factory.setLayoutFromBrowserAPI();
                }
                else {
                    this._factory.setKeyboardLayout(layout);
                }
            }
        }));
        this._userKeyboardLayout = new UserKeyboardLayout(environmentService.keyboardLayoutResource, fileService);
        this._userKeyboardLayout.initialize().then(() => {
            if (this._userKeyboardLayout.keyboardLayout) {
                this._factory.registerKeyboardLayout(this._userKeyboardLayout.keyboardLayout);
                this.setUserKeyboardLayoutIfMatched();
            }
        });
        this._register(this._userKeyboardLayout.onDidChange(() => {
            const userKeyboardLayouts = this._factory.keymapInfos.filter((layout) => layout.isUserKeyboardLayout);
            if (userKeyboardLayouts.length) {
                if (this._userKeyboardLayout.keyboardLayout) {
                    userKeyboardLayouts[0].update(this._userKeyboardLayout.keyboardLayout);
                }
                else {
                    this._factory.removeKeyboardLayout(userKeyboardLayouts[0]);
                }
            }
            else {
                if (this._userKeyboardLayout.keyboardLayout) {
                    this._factory.registerKeyboardLayout(this._userKeyboardLayout.keyboardLayout);
                }
            }
            this.setUserKeyboardLayoutIfMatched();
        }));
    }
    setUserKeyboardLayoutIfMatched() {
        const keyboardConfig = this.configurationService.getValue('keyboard');
        const layout = keyboardConfig.layout;
        if (layout && this._userKeyboardLayout.keyboardLayout) {
            if (getKeyboardLayoutId(this._userKeyboardLayout.keyboardLayout.layout) === layout &&
                this._factory.activeKeymap) {
                if (!this._userKeyboardLayout.keyboardLayout.equal(this._factory.activeKeymap)) {
                    this._factory.setActiveKeymapInfo(this._userKeyboardLayout.keyboardLayout);
                }
            }
        }
    }
    getKeyboardMapper() {
        return this._factory.getKeyboardMapper();
    }
    getCurrentKeyboardLayout() {
        return this._factory.activeKeyboardLayout;
    }
    getAllKeyboardLayouts() {
        return this._factory.keyboardLayouts;
    }
    getRawKeyboardMapping() {
        return this._factory.activeKeyMapping;
    }
    validateCurrentKeyboardMapping(keyboardEvent) {
        if (this._keyboardLayoutMode !== 'autodetect') {
            return;
        }
        this._factory.validateCurrentKeyboardMapping(keyboardEvent);
    }
};
BrowserKeyboardLayoutService = __decorate([
    __param(0, IEnvironmentService),
    __param(1, IFileService),
    __param(2, INotificationService),
    __param(3, IStorageService),
    __param(4, ICommandService),
    __param(5, IConfigurationService)
], BrowserKeyboardLayoutService);
export { BrowserKeyboardLayoutService };
registerSingleton(IKeyboardLayoutService, BrowserKeyboardLayoutService, 1 /* InstantiationType.Delayed */);
// Configuration
const configurationRegistry = Registry.as(ConfigExtensions.Configuration);
const keyboardConfiguration = {
    id: 'keyboard',
    order: 15,
    type: 'object',
    title: nls.localize('keyboardConfigurationTitle', 'Keyboard'),
    properties: {
        'keyboard.layout': {
            type: 'string',
            default: 'autodetect',
            description: nls.localize('keyboard.layout.config', 'Control the keyboard layout used in web.'),
        },
    },
};
configurationRegistry.registerConfiguration(keyboardConfiguration);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5Ym9hcmRMYXlvdXRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2tleWJpbmRpbmcvYnJvd3Nlci9rZXlib2FyZExheW91dFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBbUIsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDaEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQXlDLE1BQU0seUJBQXlCLENBQUE7QUFDM0YsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFFTixrQkFBa0IsR0FDbEIsTUFBTSw4REFBOEQsQ0FBQTtBQUNyRSxPQUFPLEVBRU4sb0JBQW9CLEdBQ3BCLE1BQU0sOERBQThELENBQUE7QUFDckUsT0FBTyxFQUFFLEVBQUUsRUFBbUIsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRTVFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRzVFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsS0FB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