/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js'
import { IEnvironmentMainService } from '../../../../platform/environment/electron-main/environmentMainService.js'
import { IProductService } from '../../../../platform/product/common/productService.js'
import { IUpdateService, StateType } from '../../../../platform/update/common/update.js'
import { IVoidUpdateService } from '../common/voidUpdateService.js'
import { VoidCheckUpdateRespose } from '../common/voidUpdateServiceTypes.js'

export class VoidMainUpdateService extends Disposable implements IVoidUpdateService {
	_serviceBrand: undefined

	private _lastUpdateCheck: number = 0
	private _updateCheckCache: any = null
	private readonly _RATE_LIMIT_MS = 5 * 60 * 1000 // 5 minutes between checks

	constructor(
		@IProductService private readonly _productService: IProductService,
		@IEnvironmentMainService private readonly _envMainService: IEnvironmentMainService,
		@IUpdateService private readonly _updateService: IUpdateService,
	) {
		super()
		// Start automatic update checking every 30 minutes
		this._startAutoUpdateCheck()
	}

	private _startAutoUpdateCheck() {
		// Only check for updates in production mode
		if (this._envMainService.isBuilt) {
			setInterval(() => {
				this.check(false) // Silent check
			}, 30 * 60 * 1000) // 30 minutes
		}
	}

	async check(explicit: boolean): Promise<VoidCheckUpdateRespose> {
		const isDevMode = !this._envMainService.isBuilt // found in abstractUpdateService.ts

		if (isDevMode) {
			return { message: null } as const
		}

		// if disabled and not explicitly checking, return early
		if (this._updateService.state.type === StateType.Disabled) {
			if (!explicit) return { message: null } as const
		}

		this._updateService.checkForUpdates(false) // implicity check, then handle result ourselves

		console.log('updateState', this._updateService.state)

		if (this._updateService.state.type === StateType.Uninitialized) {
			// The update service hasn't been initialized yet
			return {
				message: explicit ? 'Checking for updates soon...' : null,
				action: explicit ? 'reinstall' : undefined,
			} as const
		}

		if (this._updateService.state.type === StateType.Idle) {
			// No updates currently available
			return {
				message: explicit ? 'No updates found!' : null,
				action: explicit ? 'reinstall' : undefined,
			} as const
		}

		if (this._updateService.state.type === StateType.CheckingForUpdates) {
			// Currently checking for updates
			return { message: explicit ? 'Checking for updates...' : null } as const
		}

		if (this._updateService.state.type === StateType.AvailableForDownload) {
			// Update available but requires manual download (mainly for Linux)
			return { message: 'A new update is available!', action: 'download' } as const
		}

		if (this._updateService.state.type === StateType.Downloading) {
			// Update is currently being downloaded
			return { message: explicit ? 'Currently downloading update...' : null } as const
		}

		if (this._updateService.state.type === StateType.Downloaded) {
			// Update has been downloaded but not yet ready
			return {
				message: explicit ? 'An update is ready to be applied!' : null,
				action: 'apply',
			} as const
		}

		if (this._updateService.state.type === StateType.Updating) {
			// Update is being applied
			return { message: explicit ? 'Applying update...' : null } as const
		}

		if (this._updateService.state.type === StateType.Ready) {
			// Update is ready
			return { message: 'Restart KvantKode to update!', action: 'restart' } as const
		}

		if (this._updateService.state.type === StateType.Disabled) {
			return await this._manualCheckGHTagIfDisabled(explicit)
		}
		return null
	}

	async getDownloadUrl(): Promise<string> {
		const now = Date.now()
		
		// Return cached result if within rate limit
		if (this._updateCheckCache && (now - this._lastUpdateCheck) < this._RATE_LIMIT_MS) {
			return this._updateCheckCache
		}

		try {
			// Add user agent to avoid rate limiting
			const response = await fetch(
				'https://api.github.com/repos/YashasBNB/Kvantkode-project/releases/latest',
				{
					headers: {
						'User-Agent': 'KvantKode-Editor/1.0',
						'Accept': 'application/vnd.github.v3+json'
					}
				}
			)
			
			if (!response.ok) {
				if (response.status === 429) {
					// Rate limited, return fallback URL
					return 'https://github.com/YashasBNB/Kvantkode-project/releases/latest'
				}
				throw new Error(`HTTP ${response.status}`)
			}
			
			const data = await response.json()
			
			// Find appropriate asset for current platform
			const asset = data.assets?.find((asset: any) => {
				if (process.platform === 'darwin') {
					return asset.name.includes('.dmg') || asset.name.includes('mac')
				} else if (process.platform === 'win32') {
					return asset.name.includes('.exe') || asset.name.includes('win')
				} else if (process.platform === 'linux') {
					return asset.name.includes('.AppImage') || asset.name.includes('.deb') || asset.name.includes('.rpm')
				}
				return false
			})

			const downloadUrl = asset?.browser_download_url || data.html_url
			
			// Cache the result
			this._updateCheckCache = downloadUrl
			this._lastUpdateCheck = now
			
			return downloadUrl
		} catch (e) {
			console.error('Failed to get download URL:', e)
			// Return fallback URL on error
			return 'https://github.com/YashasBNB/Kvantkode-project/releases/latest'
		}
	}

	private async _manualCheckGHTagIfDisabled(explicit: boolean): Promise<VoidCheckUpdateRespose> {
		const now = Date.now()
		
		// For non-explicit checks, use cache to avoid rate limiting
		if (!explicit && this._updateCheckCache && (now - this._lastUpdateCheck) < this._RATE_LIMIT_MS) {
			return { message: null } as const // Silent check, use cached data
		}
		
		try {
			const response = await fetch(
				'https://api.github.com/repos/YashasBNB/Kvantkode-project/releases/latest',
				{
					headers: {
						'User-Agent': 'KvantKode-Editor/1.0',
						'Accept': 'application/vnd.github.v3+json'
					}
				}
			)

			if (!response.ok) {
				if (response.status === 429 && !explicit) {
					// Rate limited on silent check, just return null
					return { message: null } as const
				}
				throw new Error(`HTTP ${response.status}`)
			}

			const data = await response.json()
			const version = data.tag_name

			const myVersion = this._productService.voidVersion || this._productService.version
			const latestVersion = version

			const isUpToDate = myVersion === latestVersion // only makes sense if response.ok

			let message: string | null
			let action: 'reinstall' | undefined

			// explicit
			if (explicit) {
				if (response.ok) {
					if (!isUpToDate) {
						message =
							'A new version of KvantKode is available! Please reinstall (auto-updates are disabled on this OS) - it only takes a second!'
						action = 'reinstall'
					} else {
						message = 'KvantKode is up-to-date!'
					}
				} else {
					message = `An error occurred when fetching the latest GitHub release tag. Please try again in ~5 minutes, or reinstall.`
					action = 'reinstall'
				}
			}
			// not explicit
			else {
				if (response.ok && !isUpToDate) {
					message =
						'A new version of KvantKode is available! Please reinstall (auto-updates are disabled on this OS) - it only takes a second!'
					action = 'reinstall'
				} else {
					message = null
				}
			}
			
			// Update cache for successful requests
			this._lastUpdateCheck = now
			
			return { message, action } as const
		} catch (e) {
			if (explicit) {
				return {
					message: `An error occurred when fetching the latest GitHub release tag: ${e}. Please try again in ~5 minutes.`,
					action: 'reinstall',
				}
			} else {
				return { message: null } as const
			}
		}
	}
}
