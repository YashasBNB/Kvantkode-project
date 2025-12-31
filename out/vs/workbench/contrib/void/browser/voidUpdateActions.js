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
        'This is a very old version of KvantKode, please download the latest version! [KvantKode Editor](https://voideditor.com/download-beta)!';
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
                    window.open('https://voideditor.com/download-beta');
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
                window.open('https://voideditor.com/');
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
    const message = `KvantKode Error: There was an error checking for updates. If this persists, please get in touch or reinstall KvantKode [here](https://voideditor.com/download-beta)!`;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZFVwZGF0ZUFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvdm9pZFVwZGF0ZUFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBRTFELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3pGLE9BQU8sRUFHTixvQkFBb0IsR0FDcEIsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDN0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDbkUsT0FBTyxFQUVOLDhCQUE4QixHQUU5QixNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBSTdFLE1BQU0sWUFBWSxHQUFHLENBQ3BCLEdBQWlELEVBQ2pELFlBQWtDLEVBQ2xDLGFBQTZCLEVBQ1AsRUFBRTtJQUN4QixNQUFNLE9BQU8sR0FDWixHQUFHLEVBQUUsT0FBTztRQUNaLHdJQUF3SSxDQUFBO0lBRXpJLElBQUksT0FBeUMsQ0FBQTtJQUU3QyxJQUFJLEdBQUcsRUFBRSxNQUFNLEVBQUUsQ0FBQztRQUNqQixNQUFNLE9BQU8sR0FBYyxFQUFFLENBQUE7UUFFN0IsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLFdBQVcsRUFB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