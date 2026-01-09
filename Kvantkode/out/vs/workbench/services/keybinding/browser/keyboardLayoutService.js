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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5Ym9hcmRMYXlvdXRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMva2V5YmluZGluZy9icm93c2VyL2tleWJvYXJkTGF5b3V0U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFtQixVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNoRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBeUMsTUFBTSx5QkFBeUIsQ0FBQTtBQUMzRixPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUVOLGtCQUFrQixHQUNsQixNQUFNLDhEQUE4RCxDQUFBO0FBQ3JFLE9BQU8sRUFFTixvQkFBb0IsR0FDcEIsTUFBTSw4REFBOEQsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsRUFBRSxFQUFtQixXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDMUUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFNUUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFHNUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxD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