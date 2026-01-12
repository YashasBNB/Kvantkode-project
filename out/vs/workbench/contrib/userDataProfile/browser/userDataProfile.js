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
import { Disposable, DisposableStore, MutableDisposable, } from '../../../../base/common/lifecycle.js';
import { isWeb } from '../../../../base/common/platform.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuId, MenuRegistry, registerAction2, } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IUserDataProfilesService, } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { CURRENT_PROFILE_CONTEXT, HAS_PROFILES_CONTEXT, IS_CURRENT_PROFILE_TRANSIENT_CONTEXT, IUserDataProfileManagementService, IUserDataProfileService, PROFILES_CATEGORY, PROFILES_TITLE, isProfileURL, } from '../../../services/userDataProfile/common/userDataProfile.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { URI } from '../../../../base/common/uri.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IWorkspaceTagsService } from '../../tags/common/workspaceTags.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { EditorExtensions } from '../../../common/editor.js';
import { UserDataProfilesEditor, UserDataProfilesEditorInput, UserDataProfilesEditorInputSerializer, } from './userDataProfilesEditor.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IURLService } from '../../../../platform/url/common/url.js';
import { IBrowserWorkbenchEnvironmentService } from '../../../services/environment/browser/environmentService.js';
export const OpenProfileMenu = new MenuId('OpenProfile');
const ProfilesMenu = new MenuId('Profiles');
let UserDataProfilesWorkbenchContribution = class UserDataProfilesWorkbenchContribution extends Disposable {
    static { this.ID = 'workbench.contrib.userDataProfiles'; }
    constructor(userDataProfileService, userDataProfilesService, userDataProfileManagementService, telemetryService, workspaceContextService, workspaceTagsService, contextKeyService, editorGroupsService, instantiationService, lifecycleService, urlService, environmentService) {
        super();
        this.userDataProfileService = userDataProfileService;
        this.userDataProfilesService = userDataProfilesService;
        this.userDataProfileManagementService = userDataProfileManagementService;
        this.telemetryService = telemetryService;
        this.workspaceContextService = workspaceContextService;
        this.workspaceTagsService = workspaceTagsService;
        this.editorGroupsService = editorGroupsService;
        this.instantiationService = instantiationService;
        this.lifecycleService = lifecycleService;
        this.urlService = urlService;
        this.profilesDisposable = this._register(new MutableDisposable());
        this.currentProfileContext = CURRENT_PROFILE_CONTEXT.bindTo(contextKeyService);
        this.isCurrentProfileTransientContext =
            IS_CURRENT_PROFILE_TRANSIENT_CONTEXT.bindTo(contextKeyService);
        this.currentProfileContext.set(this.userDataProfileService.currentProfile.id);
        this.isCurrentProfileTransientContext.set(!!this.userDataProfileService.currentProfile.isTransient);
        this._register(this.userDataProfileService.onDidChangeCurrentProfile((e) => {
            this.currentProfileContext.set(this.userDataProfileService.currentProfile.id);
            this.isCurrentProfileTransientContext.set(!!this.userDataProfileService.currentProfile.isTransient);
        }));
        this.hasProfilesContext = HAS_PROFILES_CONTEXT.bindTo(contextKeyService);
        this.hasProfilesContext.set(this.userDataProfilesService.profiles.length > 1);
        this._register(this.userDataProfilesService.onDidChangeProfiles((e) => this.hasProfilesContext.set(this.userDataProfilesService.profiles.length > 1)));
        this.registerEditor();
        this.registerActions();
        this._register(this.urlService.registerHandler(this));
        if (isWeb) {
            lifecycleService.when(4 /* LifecyclePhase.Eventually */).then(() => userDataProfilesService.cleanUp());
        }
        this.reportWorkspaceProfileInfo();
        if (environmentService.options?.profileToPreview) {
            lifecycleService
                .when(3 /* LifecyclePhase.Restored */)
                .then(() => this.handleURL(URI.revive(environmentService.options.profileToPreview)));
        }
    }
    async handleURL(uri) {
        if (isProfileURL(uri)) {
            const editor = await this.openProfilesEditor();
            if (editor) {
                editor.createNewProfile(uri);
                return true;
            }
        }
        return false;
    }
    async openProfilesEditor() {
        const editor = await this.editorGroupsService.activeGroup.openEditor(new UserDataProfilesEditorInput(this.instantiationService));
        return editor;
    }
    registerEditor() {
        Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(UserDataProfilesEditor, UserDataProfilesEditor.ID, localize('userdataprofilesEditor', 'Profiles Editor')), [new SyncDescriptor(UserDataProfilesEditorInput)]);
        Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(UserDataProfilesEditorInput.ID, UserDataProfilesEditorInputSerializer);
    }
    registerActions() {
        this.registerProfileSubMenu();
        this._register(this.registerManageProfilesAction());
        this._register(this.registerSwitchProfileAction());
        this.registerOpenProfileSubMenu();
        this.registerNewWindowWithProfileAction();
        this.registerProfilesActions();
        this._register(this.userDataProfilesService.onDidChangeProfiles(() => this.registerProfilesActions()));
        this._register(this.registerExportCurrentProfileAction());
        this.registerCreateFromCurrentProfileAction();
        this.registerNewProfileAction();
        this.registerDeleteProfileAction();
        this.registerHelpAction();
    }
    registerProfileSubMenu() {
        const getProfilesTitle = () => {
            return localize('profiles', 'Profile ({0})', this.userDataProfileService.currentProfile.name);
        };
        MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
            get title() {
                return getProfilesTitle();
            },
            submenu: ProfilesMenu,
            group: '2_configuration',
            order: 1,
            when: HAS_PROFILES_CONTEXT,
        });
        MenuRegistry.appendMenuItem(MenuId.MenubarPreferencesMenu, {
            get title() {
                return getProfilesTitle();
            },
            submenu: ProfilesMenu,
            group: '2_configuration',
            order: 1,
            when: HAS_PROFILES_CONTEXT,
        });
    }
    registerOpenProfileSubMenu() {
        MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
            title: localize('New Profile Window', 'New Window with Profile'),
            submenu: OpenProfileMenu,
            group: '1_new',
            order: 4,
        });
    }
    registerProfilesActions() {
        this.profilesDisposable.value = new DisposableStore();
        for (const profile of this.userDataProfilesService.profiles) {
            if (!profile.isTransient) {
                this.profilesDisposable.value.add(this.registerProfileEntryAction(profile));
                this.profilesDisposable.value.add(this.registerNewWindowAction(profile));
            }
        }
    }
    registerProfileEntryAction(profile) {
        const that = this;
        return registerAction2(class ProfileEntryAction extends Action2 {
            constructor() {
                super({
                    id: `workbench.profiles.actions.profileEntry.${profile.id}`,
                    title: profile.name,
                    metadata: {
                        description: localize2('change profile', 'Switch to {0} profile', profile.name),
                    },
                    toggled: ContextKeyExpr.equals(CURRENT_PROFILE_CONTEXT.key, profile.id),
                    menu: [
                        {
                            id: ProfilesMenu,
                            group: '0_profiles',
                        },
                    ],
                });
            }
            async run(accessor) {
                if (that.userDataProfileService.currentProfile.id !== profile.id) {
                    return that.userDataProfileManagementService.switchProfile(profile);
                }
            }
        });
    }
    registerNewWindowWithProfileAction() {
        return registerAction2(class NewWindowWithProfileAction extends Action2 {
            constructor() {
                super({
                    id: `workbench.profiles.actions.newWindowWithProfile`,
                    title: localize2('newWindowWithProfile', 'New Window with Profile...'),
                    category: PROFILES_CATEGORY,
                    precondition: HAS_PROFILES_CONTEXT,
                    f1: true,
                });
            }
            async run(accessor) {
                const quickInputService = accessor.get(IQuickInputService);
                const userDataProfilesService = accessor.get(IUserDataProfilesService);
                const hostService = accessor.get(IHostService);
                const pick = await quickInputService.pick(userDataProfilesService.profiles.map((profile) => ({
                    label: profile.name,
                    profile,
                })), {
                    title: localize('new window with profile', 'New Window with Profile'),
                    placeHolder: localize('pick profile', 'Select Profile'),
                    canPickMany: false,
                });
                if (pick) {
                    return hostService.openWindow({
                        remoteAuthority: null,
                        forceProfile: pick.profile.name,
                    });
                }
            }
        });
    }
    registerNewWindowAction(profile) {
        const disposables = new DisposableStore();
        const id = `workbench.action.openProfile.${profile.name.replace('/\s+/', '_')}`;
        disposables.add(registerAction2(class NewWindowAction extends Action2 {
            constructor() {
                super({
                    id,
                    title: localize2('openShort', '{0}', profile.name),
                    metadata: {
                        description: localize2('open profile', 'Open New Window with {0} Profile', profile.name),
                    },
                    menu: {
                        id: OpenProfileMenu,
                        group: '0_profiles',
                        when: HAS_PROFILES_CONTEXT,
                    },
                });
            }
            run(accessor) {
                const hostService = accessor.get(IHostService);
                return hostService.openWindow({ remoteAuthority: null, forceProfile: profile.name });
            }
        }));
        disposables.add(MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
            command: {
                id,
                category: PROFILES_CATEGORY,
                title: localize2('open', 'Open {0} Profile', profile.name),
                precondition: HAS_PROFILES_CONTEXT,
            },
        }));
        return disposables;
    }
    registerSwitchProfileAction() {
        const that = this;
        return registerAction2(class SwitchProfileAction extends Action2 {
            constructor() {
                super({
                    id: `workbench.profiles.actions.switchProfile`,
                    title: localize2('switchProfile', 'Switch Profile...'),
                    category: PROFILES_CATEGORY,
                    f1: true,
                });
            }
            async run(accessor) {
                const quickInputService = accessor.get(IQuickInputService);
                const items = [];
                for (const profile of that.userDataProfilesService.profiles) {
                    items.push({
                        id: profile.id,
                        label: profile.id === that.userDataProfileService.currentProfile.id
                            ? `$(check) ${profile.name}`
                            : profile.name,
                        profile,
                    });
                }
                const result = await quickInputService.pick(items.sort((a, b) => a.profile.name.localeCompare(b.profile.name)), {
                    placeHolder: localize('selectProfile', 'Select Profile'),
                });
                if (result) {
                    await that.userDataProfileManagementService.switchProfile(result.profile);
                }
            }
        });
    }
    registerManageProfilesAction() {
        const disposables = new DisposableStore();
        disposables.add(registerAction2(class ManageProfilesAction extends Action2 {
            constructor() {
                super({
                    id: `workbench.profiles.actions.manageProfiles`,
                    title: {
                        ...localize2('manage profiles', 'Profiles'),
                        mnemonicTitle: localize({ key: 'miOpenProfiles', comment: ['&& denotes a mnemonic'] }, '&&Profiles'),
                    },
                    menu: [
                        {
                            id: MenuId.GlobalActivity,
                            group: '2_configuration',
                            order: 1,
                            when: HAS_PROFILES_CONTEXT.negate(),
                        },
                        {
                            id: MenuId.MenubarPreferencesMenu,
                            group: '2_configuration',
                            order: 1,
                            when: HAS_PROFILES_CONTEXT.negate(),
                        },
                        {
                            id: ProfilesMenu,
                            group: '1_manage',
                            order: 1,
                        },
                    ],
                });
            }
            run(accessor) {
                const editorGroupsService = accessor.get(IEditorGroupsService);
                const instantiationService = accessor.get(IInstantiationService);
                return editorGroupsService.activeGroup.openEditor(new UserDataProfilesEditorInput(instantiationService));
            }
        }));
        disposables.add(MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
            command: {
                id: 'workbench.profiles.actions.manageProfiles',
                category: Categories.Preferences,
                title: localize2('open profiles', 'Open Profiles (UI)'),
            },
        }));
        return disposables;
    }
    registerExportCurrentProfileAction() {
        const that = this;
        const disposables = new DisposableStore();
        const id = 'workbench.profiles.actions.exportProfile';
        disposables.add(registerAction2(class ExportProfileAction extends Action2 {
            constructor() {
                super({
                    id,
                    title: localize2('export profile', 'Export Profile...'),
                    category: PROFILES_CATEGORY,
                    f1: true,
                });
            }
            async run() {
                const editor = await that.openProfilesEditor();
                editor?.selectProfile(that.userDataProfileService.currentProfile);
            }
        }));
        disposables.add(MenuRegistry.appendMenuItem(MenuId.MenubarShare, {
            command: {
                id,
                title: localize2('export profile in share', 'Export Profile ({0})...', that.userDataProfileService.currentProfile.name),
            },
        }));
        return disposables;
    }
    registerCreateFromCurrentProfileAction() {
        const that = this;
        this._register(registerAction2(class CreateFromCurrentProfileAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.profiles.actions.createFromCurrentProfile',
                    title: localize2('save profile as', 'Save Current Profile As...'),
                    category: PROFILES_CATEGORY,
                    f1: true,
                });
            }
            async run() {
                const editor = await that.openProfilesEditor();
                editor?.createNewProfile(that.userDataProfileService.currentProfile);
            }
        }));
    }
    registerNewProfileAction() {
        const that = this;
        this._register(registerAction2(class CreateProfileAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.profiles.actions.createProfile',
                    title: localize2('create profile', 'New Profile...'),
                    category: PROFILES_CATEGORY,
                    f1: true,
                    menu: [
                        {
                            id: OpenProfileMenu,
                            group: '1_manage_profiles',
                            order: 1,
                        },
                    ],
                });
            }
            async run(accessor) {
                const editor = await that.openProfilesEditor();
                return editor?.createNewProfile();
            }
        }));
    }
    registerDeleteProfileAction() {
        this._register(registerAction2(class DeleteProfileAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.profiles.actions.deleteProfile',
                    title: localize2('delete profile', 'Delete Profile...'),
                    category: PROFILES_CATEGORY,
                    f1: true,
                    precondition: HAS_PROFILES_CONTEXT,
                });
            }
            async run(accessor) {
                const quickInputService = accessor.get(IQuickInputService);
                const userDataProfileService = accessor.get(IUserDataProfileService);
                const userDataProfilesService = accessor.get(IUserDataProfilesService);
                const userDataProfileManagementService = accessor.get(IUserDataProfileManagementService);
                const notificationService = accessor.get(INotificationService);
                const profiles = userDataProfilesService.profiles.filter((p) => !p.isDefault && !p.isTransient);
                if (profiles.length) {
                    const picks = await quickInputService.pick(profiles.map((profile) => ({
                        label: profile.name,
                        description: profile.id === userDataProfileService.currentProfile.id
                            ? localize('current', 'Current')
                            : undefined,
                        profile,
                    })), {
                        title: localize('delete specific profile', 'Delete Profile...'),
                        placeHolder: localize('pick profile to delete', 'Select Profiles to Delete'),
                        canPickMany: true,
                    });
                    if (picks) {
                        try {
                            await Promise.all(picks.map((pick) => userDataProfileManagementService.removeProfile(pick.profile)));
                        }
                        catch (error) {
                            notificationService.error(error);
                        }
                    }
                }
            }
        }));
    }
    registerHelpAction() {
        this._register(registerAction2(class HelpAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.profiles.actions.help',
                    title: PROFILES_TITLE,
                    category: Categories.Help,
                    menu: [
                        {
                            id: MenuId.CommandPalette,
                        },
                    ],
                });
            }
            run(accessor) {
                return accessor
                    .get(IOpenerService)
                    .open(URI.parse('https://aka.ms/vscode-profiles-help'));
            }
        }));
    }
    async reportWorkspaceProfileInfo() {
        await this.lifecycleService.when(4 /* LifecyclePhase.Eventually */);
        if (this.userDataProfilesService.profiles.length > 1) {
            this.telemetryService.publicLog2('profiles:count', { count: this.userDataProfilesService.profiles.length - 1 });
        }
        const workspaceId = await this.workspaceTagsService.getTelemetryWorkspaceId(this.workspaceContextService.getWorkspace(), this.workspaceContextService.getWorkbenchState());
        this.telemetryService.publicLog2('workspaceProfileInfo', {
            workspaceId,
            defaultProfile: this.userDataProfileService.currentProfile.isDefault,
        });
    }
};
UserDataProfilesWorkbenchContribution = __decorate([
    __param(0, IUserDataProfileService),
    __param(1, IUserDataProfilesService),
    __param(2, IUserDataProfileManagementService),
    __param(3, ITelemetryService),
    __param(4, IWorkspaceContextService),
    __param(5, IWorkspaceTagsService),
    __param(6, IContextKeyService),
    __param(7, IEditorGroupsService),
    __param(8, IInstantiationService),
    __param(9, ILifecycleService),
    __param(10, IURLService),
    __param(11, IBrowserWorkbenchEnvironmentService)
], UserDataProfilesWorkbenchContribution);
export { UserDataProfilesWorkbenchContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi91c2VyRGF0YVByb2ZpbGUvYnJvd3Nlci91c2VyRGF0YVByb2ZpbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBRWYsaUJBQWlCLEdBQ2pCLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRTNELE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDeEQsT0FBTyxFQUNOLE9BQU8sRUFDUCxNQUFNLEVBQ04sWUFBWSxFQUNaLGVBQWUsR0FDZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFDTixjQUFjLEVBRWQsa0JBQWtCLEdBQ2xCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUVOLHdCQUF3QixHQUN4QixNQUFNLGdFQUFnRSxDQUFBO0FBRXZFLE9BQU8sRUFBRSxpQkFBaUIsRUFBa0IsTUFBTSxpREFBaUQsQ0FBQTtBQUNuRyxPQUFPLEVBQ04sdUJBQXVCLEVBQ3ZCLG9CQUFvQixFQUNwQixvQ0FBb0MsRUFDcEMsaUNBQWlDLEVBQ2pDLHVCQUF1QixFQUN2QixpQkFBaUIsRUFDakIsY0FBYyxFQUNkLFlBQVksR0FDWixNQUFNLDZEQUE2RCxDQUFBO0FBQ3BFLE9BQU8sRUFDTixrQkFBa0IsR0FFbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLGlCQUFp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