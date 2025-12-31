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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdXNlckRhdGFQcm9maWxlL2Jyb3dzZXIvdXNlckRhdGFQcm9maWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUVmLGlCQUFpQixHQUNqQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUUzRCxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3hELE9BQU8sRUFDTixPQUFPLEVBQ1AsTUFBTSxFQUNOLFlBQVksRUFDWixlQUFlLEdBQ2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQ04sY0FBYyxFQUVkLGtCQUFrQixHQUNsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFFTix3QkFBd0IsR0FDeEIsTUFBTSxnRUFBZ0UsQ0FBQTtBQUV2RSxPQUFPLEVBQUUsaUJBQWlCLEVBQWtCLE1BQU0saURBQWlELENBQUE7QUFDbkcsT0FBTyxFQUNOLHVCQUF1QixFQUN2QixvQkFBb0IsRUFDcEIsb0NBQW9DLEVBQ3BDLGlDQUFpQyxFQUNqQyx1QkFBdUIsRUFDdkIsaUJBQWlCLEVBQ2pCLGNBQWMsRUFDZCxZQUFZLEdBQ1osTUFBTSw2REFBNkQsQ0FBQTtBQUNwRSxPQUFPLEVBQ04sa0JBQWtCLEdBRWxCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDL0YsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxpQkFBaUIsRUFB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