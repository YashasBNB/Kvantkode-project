/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../../base/common/lifecycle.js';
import Severity from '../../../../base/common/severity.js';
import { localize2 } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { INotificationService, } from '../../../../platform/notification/common/notification.js';
import { IMetricsService } from '../common/metricsService.js';
import { IVoidUpdateService } from '../common/voidUpdateService.js';
import { registerWorkbenchContribution2, } from '../../../common/contributions.js';
import * as dom from '../../../../base/browser/dom.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
const notifyUpdate = (res, notifService, updateService) => {
    const message = res?.message ||
        'This is a very old version of KvantKode, please download the latest version! [KvantKode Editor](https://kvantkode.com/download-beta)!';
    let actions;
    if (res?.action) {
        const primary = [];
        if (res.action === 'reinstall') {
            primary.push({
                label: `Reinstall`,
                id: 'void.updater.reinstall',
                enabled: true,
                tooltip: '',
                class: undefined,
                run: () => {
                    const { window } = dom.getActiveWindow();
                    window.open('https://kvantkode.com/download-beta');
                },
            });
        }
        if (res.action === 'download') {
            primary.push({
                label: `Download`,
                id: 'void.updater.download',
                enabled: true,
                tooltip: '',
                class: undefined,
                run: () => {
                    updateService.downloadUpdate();
                },
            });
        }
        if (res.action === 'apply') {
            primary.push({
                label: `Apply`,
                id: 'void.updater.apply',
                enabled: true,
                tooltip: '',
                class: undefined,
                run: () => {
                    updateService.applyUpdate();
                },
            });
        }
        if (res.action === 'restart') {
            primary.push({
                label: `Restart`,
                id: 'void.updater.restart',
                enabled: true,
                tooltip: '',
                class: undefined,
                run: () => {
                    updateService.quitAndInstall();
                },
            });
        }
        primary.push({
            id: 'void.updater.site',
            enabled: true,
            label: `KvantKode Site`,
            tooltip: '',
            class: undefined,
            run: () => {
                const { window } = dom.getActiveWindow();
                window.open('https://kvantkode.com/');
            },
        });
        actions = {
            primary: primary,
            secondary: [
                {
                    id: 'void.updater.close',
                    enabled: true,
                    label: `Keep current version`,
                    tooltip: '',
                    class: undefined,
                    run: () => {
                        notifController.close();
                    },
                },
            ],
        };
    }
    else {
        actions = undefined;
    }
    const notifController = notifService.notify({
        severity: Severity.Info,
        message: message,
        sticky: true,
        progress: actions ? { worked: 0, total: 100 } : undefined,
        actions: actions,
    });
    return notifController;
    // const d = notifController.onDidClose(() => {
    // 	notifyYesUpdate(notifService, res)
    // 	d.dispose()
    // })
};
const notifyErrChecking = (notifService) => {
    const message = `KvantKode Error: There was an error checking for updates. If this persists, please get in touch or reinstall KvantKode [here](https://kvantkode.com/download-beta)!`;
    const notifController = notifService.notify({
        severity: Severity.Info,
        message: message,
        sticky: true,
    });
    return notifController;
};
const performVoidCheck = async (explicit, notifService, voidUpdateService, metricsService, updateService) => {
    const metricsTag = explicit ? 'Manual' : 'Auto';
    metricsService.capture(`Void Update ${metricsTag}: Checking...`, {});
    const res = await voidUpdateService.check(explicit);
    if (!res) {
        const notifController = notifyErrChecking(notifService);
        metricsService.capture(`Void Update ${metricsTag}: Error`, { res });
        return notifController;
    }
    else {
        if (res.message) {
            const notifController = notifyUpdate(res, notifService, updateService);
            metricsService.capture(`Void Update ${metricsTag}: Yes`, { res });
            return notifController;
        }
        else {
            metricsService.capture(`Void Update ${metricsTag}: No`, { res });
            return null;
        }
    }
};
// Action
let lastNotifController = null;
registerAction2(class extends Action2 {
    constructor() {
        super({
            f1: true,
            id: 'void.voidCheckUpdate',
            title: localize2('voidCheckUpdate', 'KvantKode: Check for Updates'),
        });
    }
    async run(accessor) {
        const voidUpdateService = accessor.get(IVoidUpdateService);
        const notifService = accessor.get(INotificationService);
        const metricsService = accessor.get(IMetricsService);
        const updateService = accessor.get(IUpdateService);
        const currNotifController = lastNotifController;
        const newController = await performVoidCheck(true, notifService, voidUpdateService, metricsService, updateService);
        if (newController) {
            currNotifController?.close();
            lastNotifController = newController;
        }
    }
});
// on mount
let VoidUpdateWorkbenchContribution = class VoidUpdateWorkbenchContribution extends Disposable {
    static { this.ID = 'workbench.contrib.void.voidUpdate'; }
    constructor(voidUpdateService, metricsService, notifService, updateService) {
        super();
        const autoCheck = () => {
            performVoidCheck(false, notifService, voidUpdateService, metricsService, updateService);
        };
        // check once 5 seconds after mount
        // check every 3 hours
        const { window } = dom.getActiveWindow();
        const initId = window.setTimeout(() => autoCheck(), 5 * 1000);
        this._register({ dispose: () => window.clearTimeout(initId) });
        const intervalId = window.setInterval(() => autoCheck(), 3 * 60 * 60 * 1000); // every 3 hrs
        this._register({ dispose: () => window.clearInterval(intervalId) });
    }
};
VoidUpdateWorkbenchContribution = __decorate([
    __param(0, IVoidUpdateService),
    __param(1, IMetricsService),
    __param(2, INotificationService),
    __param(3, IUpdateService)
], VoidUpdateWorkbenchContribution);
registerWorkbenchContribution2(VoidUpdateWorkbenchContribution.ID, VoidUpdateWorkbenchContribution, 2 /* WorkbenchPhase.BlockRestore */);
