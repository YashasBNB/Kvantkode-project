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
const notifyUpdate = (res, notifService, updateService, voidUpdateService) => {
    const message = res?.message ||
        'This is a very old version of KvantKode, please download the latest version! [KvantKode Editor](https://kvantkode.com/download-beta)!';
    let actions;
    if (res?.action) {
        const primary = [];
        if (res.action === 'reinstall') {
            primary.push({
                label: `Download Latest`,
                id: 'void.updater.reinstall',
                enabled: true,
                tooltip: '',
                class: undefined,
                run: async () => {
                    const { window } = dom.getActiveWindow();
                    try {
                        const downloadUrl = await voidUpdateService.getDownloadUrl();
                        window.open(downloadUrl);
                    }
                    catch (e) {
                        window.open('https://github.com/YashasBNB/Kvantkode-project/releases/latest');
                    }
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
            const notifController = notifyUpdate(res, notifService, updateService, voidUpdateService);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZFVwZGF0ZUFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvYnJvd3Nlci92b2lkVXBkYXRlQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFFMUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzlDLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDekYsT0FBTyxFQUdOLG9CQUFvQixHQUNwQixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRSxPQUFPLEVBRU4sOEJBQThCLEdBRTlCLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFJN0UsTUFBTSxZQUFZLEdBQUcsQ0FDcEIsR0FBaUQsRUFDakQsWUFBa0MsRUFDbEMsYUFBNkIsRUFDN0IsaUJBQXFDLEVBQ2YsRUFBRTtJQUN4QixNQUFNLE9BQU8sR0FDWixHQUFHLEVBQUUsT0FBTztRQUNaLHVJQUF1SSxDQUFBO0lBRXhJLElBQUksT0FBeUMsQ0FBQTtJQUU3QyxJQUFJLEdBQUcsRUFBRSxNQUFNLEVBQUUsQ0FBQztRQUNqQixNQUFNLE9BQU8sR0FBYyxFQUFFLENBQUE7UUFF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