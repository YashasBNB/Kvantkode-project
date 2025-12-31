/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, {
	ButtonHTMLAttributes,
	FormEvent,
	FormHTMLAttributes,
	Fragment,
	KeyboardEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'

import {
	useAccessor,
	useChatThreadsState,
	useChatThreadsStreamState,
	useSettingsState,
	useActiveURI,
	useCommandBarState,
	useFullChatThreadsStreamState,
} from '../util/services.js'
import { ScrollType } from '../../../../../../../editor/common/editorCommon.js'

import {
	ChatMarkdownRender,
	ChatMessageLocation,
	getApplyBoxId,
} from '../markdown/ChatMarkdownRender.js'
import { URI } from '../../../../../../../base/common/uri.js'
import { IDisposable } from '../../../../../../../base/common/lifecycle.js'
import { ErrorDisplay } from './ErrorDisplay.js'
import {
	BlockCode,
	TextAreaFns,
	VoidCustomDropdownBox,
	VoidInputBox2,
	VoidSlider,
	VoidSwitch,
	VoidDiffEditor,
} from '../util/inputs.js'
import { ModelDropdown } from '../void-settings-tsx/ModelDropdown.js'
import { PastThreadsList } from './SidebarThreadSelector.js'
import { VOID_CTRL_L_ACTION_ID } from '../../../actionIDs.js'
import { VOID_OPEN_SETTINGS_ACTION_ID } from '../../../voidSettingsPane.js'
import {
	ChatMode,
	displayInfoOfProviderName,
	FeatureName,
	isFeatureNameDisabled,
} from '../../../../../../../workbench/contrib/void/common/voidSettingsTypes.js'
import { ICommandService } from '../../../../../../../platform/commands/common/commands.js'
import { WarningBox } from '../void-settings-tsx/WarningBox.js'
import {
	getModelCapabilities,
	getIsReasoningEnabledState,
} from '../../../../common/modelCapabilities.js'
import {
	AlertTriangle,
	File,
	Ban,
	Check,
	ChevronRight,
	Dot,
	FileIcon,
	Pencil,
	Undo,
	Undo2,
	X,
	Flag,
	Copy as CopyIcon,
	Info,
	CirclePlus,
	Ellipsis,
	CircleEllipsis,
	Folder,
	ALargeSmall,
	TypeOutline,
	Text,
	CreditCard,
} from 'lucide-react'
import {
	ChatMessage,
	CheckpointEntry,
	StagingSelectionItem,
	ToolMessage,
} from '../../../../common/chatThreadServiceTypes.js'
import {
	approvalTypeOfBuiltinToolName,
	BuiltinToolCallParams,
	BuiltinToolName,
	ToolName,
	LintErrorItem,
	ToolApprovalType,
	toolApprovalTypes,
} from '../../../../common/toolsServiceTypes.js'
import {
	CopyButton,
	EditToolAcceptRejectButtonsHTML,
	IconShell1,
	JumpToFileButton,
	JumpToTerminalButton,
	StatusIndicator,
	StatusIndicatorForApplyButton,
	useApplyStreamState,
	useEditToolStreamState,
} from '../markdown/ApplyBlockHoverButtons.js'
import { IsRunningType } from '../../../chatThreadService.js'
import {
	acceptAllBg,
	acceptBorder,
	buttonFontSize,
	buttonTextColor,
	rejectAllBg,
	rejectBg,
	rejectBorder,
} from '../../../../common/helpers/colors.js'
import {
	builtinToolNames,
	isABuiltinToolName,
	MAX_FILE_CHARS_PAGE,
	MAX_TERMINAL_INACTIVE_TIME,
} from '../../../../common/prompt/prompts.js'
import { RawToolCallObj } from '../../../../common/sendLLMMessageTypes.js'
import ErrorBoundary from './ErrorBoundary.js'
import { ToolApprovalTypeSwitch } from '../void-settings-tsx/Settings.js'

import { persistentTerminalNameOfId } from '../../../terminalToolService.js'
import { removeMCPToolNamePrefix } from '../../../../common/mcpServiceTypes.js'

export const IconX = ({
	size,
	className = '',
	...props
}: { size: number; className?: string } & React.SVGProps<SVGSVGElement>) => {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			className={className}
			{...props}
		>
			<path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
		</svg>
	)
}

	const BrokerPanel = ({ userId, onChanged }: { userId: string; onChanged: () => void }) => {
		const friendlyBrokerError = (raw: unknown): string => {
			const msg =
				(typeof raw === 'string' && raw)
				|| (raw as any)?.message
				|| String(raw ?? '')
			if (msg.includes('MPIN attempts exceeded limit')) {
				return 'AngelOne: MPIN attempts exceeded limit. Please wait ~15 minutes or reset your MPIN in the AngelOne app, then update it here.'
			}
			return msg
		}
	const SUPPORTED_BROKERS = ['Alpaca', 'Binance', 'Zerodha', 'AngelOne', 'Upstox', 'Dhan']
	const REQ: Record<
		string,
		{ apiKey: boolean; apiSecretKey: boolean; accessToken: boolean; clientId: boolean }
	> = {
		Alpaca: { apiKey: true, apiSecretKey: true, accessToken: false, clientId: false },
		Binance: { apiKey: true, apiSecretKey: true, accessToken: false, clientId: false },
		Zerodha: { apiKey: true, apiSecretKey: false, accessToken: true, clientId: false },
		AngelOne: { apiKey: true, apiSecretKey: false, accessToken: false, clientId: true },
		Upstox: { apiKey: false, apiSecretKey: false, accessToken: true, clientId: false },
		Dhan: { apiKey: true, apiSecretKey: true, accessToken: false, clientId: true },
	}
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [brokers, setBrokers] = useState<any[]>([])
	const [form, setForm] = useState<{
		broker: string
		apiKey: string
		apiSecretKey: string
		accessToken?: string
		clientId?: string
		tokenId?: string
		token?: string
		mpin?: string
		isActive: boolean
	}>({ broker: '', apiKey: '', apiSecretKey: '', accessToken: '', clientId: '', tokenId: '', token: '', mpin: '', isActive: true })
	const [balance, setBalance] = useState<{
		cashBalance: number | null
		currency: string | null
	} | null>(null)
	const [balanceError, setBalanceError] = useState<string | null>(null)
	const [loadingBalance, setLoadingBalance] = useState(false)
	const [positions, setPositions] = useState<
		Array<{ symbol: string; qty: number; avgPrice?: number; side?: string }>
	>([])
	const [orders, setOrders] = useState<
		Array<{
			id: string
			symbol: string
			side: string
			qty: number
			status: string
			createdAt?: string | null
		}>
	>([])
	const [loadingPo, setLoadingPo] = useState(false)
	const [poError, setPoError] = useState<string | null>(null)
	const [editingId, setEditingId] = useState<string | null>(null)
	const [editForm, setEditForm] = useState<{
		broker: string
		apiKey: string
		apiSecretKey: string
		accessToken?: string
		clientId?: string
		tokenId?: string
		token?: string
		mpin?: string
	}>({ broker: '', apiKey: '', apiSecretKey: '', accessToken: '', clientId: '', tokenId: '', token: '', mpin: '' })
	const [dhanTokenError, setDhanTokenError] = useState<string | null>(null)
	const [dhanTokenLoading, setDhanTokenLoading] = useState(false)
	const [dhanConsentError, setDhanConsentError] = useState<string | null>(null)
	const [dhanConsentLoading, setDhanConsentLoading] = useState(false)

	const readMe = useCallback(async () => {
		setError(null)
		try {
			const token = localStorage.getItem('void_jwt')
			if (!token) {
				setBrokers([])
				return
			}
			const rsp = await fetch(`${BACKEND_URL}/auth/me`, {
				headers: { Authorization: `Bearer ${token}` },
			})
			if (!rsp.ok) throw new Error('failed_me')
			const data = await rsp.json()
			setBrokers(data?.user?.brokerCredentials || [])
		} catch (e: any) {
			setError(friendlyBrokerError(e))
		}
	}, [])

	useEffect(() => {
		readMe()
	}, [readMe])

	const readBalance = useCallback(async () => {
		setBalanceError(null)
		setLoadingBalance(true)
		try {
			const token = localStorage.getItem('void_jwt')
			if (!token) {
				setBalance(null)
				return
			}
			const rsp = await fetch(
				`${BACKEND_URL}/api/users/${encodeURIComponent(userId)}/brokers/active/balance`,
				{ headers: { Authorization: `Bearer ${token}` } },
			)
			const data = await rsp.json().catch(() => ({}))
			if (!rsp.ok) throw new Error(data?.error || data?.message || 'failed_balance')
			if (data?.cashBalance != null)
				setBalance({ cashBalance: data.cashBalance, currency: data.currency || null })
			else setBalance(null)
		} catch (e: any) {
			setBalanceError(friendlyBrokerError(e))
			setBalance(null)
		} finally {
			setLoadingBalance(false)
		}
	}, [userId])

	const startDhanLogin = async () => {
		setDhanConsentError(null)
		setDhanConsentLoading(true)
		try {
			const brokerName = (form?.broker || '').toLowerCase()
			const clientId = (form.clientId || '').trim()
			const apiKey = (form.apiKey || '').trim()
			const apiSecretKey = (form.apiSecretKey || '').trim()
			if (brokerName !== 'dhan') throw new Error('select_dhan_broker_first')
			if (!clientId || !apiKey || !apiSecretKey)
				throw new Error('client_id_api_key_secret_required')
			const token = localStorage.getItem('void_jwt')
			if (!token) throw new Error('auth_required')
			const rsp = await fetch(
				`${BACKEND_URL}/api/users/${encodeURIComponent(userId)}/brokers/dhan/consent`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						clientId,
						apiKey,
						apiSecret: apiSecretKey,
					}),
				},
			)
			const data = await rsp.json().catch(() => ({}))
			if (!rsp.ok) throw new Error(data?.error || data?.message || 'failed_dhan_consent')
			const loginUrl = data?.loginUrl as string | undefined
			if (loginUrl && typeof window !== 'undefined') {
				window.open(loginUrl, '_blank')
			}
		} catch (e: any) {
			setDhanConsentError(e?.message || String(e))
		} finally {
			setDhanConsentLoading(false)
		}
	}

	const generateDhanToken = async (opts?: {
		clientId?: string
		apiKey?: string
		apiSecretKey?: string
	}) => {
		setDhanTokenError(null)
		setDhanTokenLoading(true)
		try {
			const brokerName = (form?.broker || '').toLowerCase()
			const clientId = (opts?.clientId ?? form.clientId ?? '').trim()
			const apiKey = (opts?.apiKey ?? form.apiKey ?? '').trim()
			const apiSecretKey = (opts?.apiSecretKey ?? form.apiSecretKey ?? '').trim()
			const tokenId = (form.tokenId || '').trim()
			if (brokerName !== 'dhan') {
				throw new Error('select_dhan_broker_first')
			}
			if (!clientId || !apiKey || !apiSecretKey)
				throw new Error('client_id_api_key_secret_required')
			if (!tokenId) throw new Error('token_id_required')
			const token = localStorage.getItem('void_jwt')
			if (!token) throw new Error('auth_required')
			const rsp = await fetch(
				`${BACKEND_URL}/api/users/${encodeURIComponent(userId)}/brokers/dhan/token`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						apiKey,
						apiSecret: apiSecretKey,
						tokenId,
					}),
				},
			)
			const data = await rsp.json().catch(() => ({}))
			if (!rsp.ok) throw new Error(data?.error || data?.message || 'failed_generate_dhan_token')
			await readMe()
			await readBalance()
			await readPositionsOrders()
		} catch (e: any) {
			setDhanTokenError(e?.message || String(e))
		} finally {
			setDhanTokenLoading(false)
		}
	}

	const readPositionsOrders = useCallback(async () => {
		setPoError(null)
		setLoadingPo(true)
		try {
			const token = localStorage.getItem('void_jwt')
			if (!token) {
				setPositions([])
				setOrders([])
				return
			}
			const [rp, ro] = await Promise.all([
				fetch(`${BACKEND_URL}/api/users/${encodeURIComponent(userId)}/brokers/active/positions`, {
					headers: { Authorization: `Bearer ${token}` },
				}),
				fetch(`${BACKEND_URL}/api/users/${encodeURIComponent(userId)}/brokers/active/orders`, {
					headers: { Authorization: `Bearer ${token}` },
				}),
			])
			const dp = await rp.json().catch(() => ({}))
			const dor = await ro.json().catch(() => ({}))
			if (!rp.ok) throw new Error(dp?.error || dp?.message || 'failed_positions')
			if (!ro.ok) throw new Error(dor?.error || dor?.message || 'failed_orders')
			setPositions(Array.isArray(dp.positions) ? dp.positions : [])
			setOrders(Array.isArray(dor.orders) ? dor.orders : [])
		} catch (e: any) {
			setPoError(friendlyBrokerError(e))
			setPositions([])
			setOrders([])
		} finally {
			setLoadingPo(false)
		}
	}, [userId])

	// Best-effort: export current JWT to ~/.void_jwt via backend so local scripts can work without envs
	useEffect(() => {
		try {
			const token = localStorage.getItem('void_jwt')
			if (!token) return
			fetch(`${BACKEND_URL}/auth/export-token`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${token}` },
			}).catch(() => {})
		} catch {}
	}, [])

	useEffect(() => {
		readBalance()
		readPositionsOrders()
		const id = setInterval(() => {
			readBalance()
			readPositionsOrders()
		}, 10000)
		return () => clearInterval(id)
	}, [readBalance, readPositionsOrders])

	// --- Subscription panel helpers ---
	const [subStatus, setSubStatus] = useState<string | null>(null)
	const [subUntil, setSubUntil] = useState<string | null>(null)
	const [subLoading, setSubLoading] = useState(false)
	const [subError, setSubError] = useState<string | null>(null)
	const [subActionLoading, setSubActionLoading] = useState(false)

	const refreshSubscription = useCallback(async () => {
		setSubError(null)
		setSubLoading(true)
		try {
			const token = localStorage.getItem('void_jwt')
			if (!token) {
				setSubStatus(null)
				setSubUntil(null)
				return
			}
			const rsp = await fetch(`${BACKEND_URL}/auth/me`, {
				headers: { Authorization: `Bearer ${token}` },
			})
			const data = await rsp.json().catch(() => ({}))
			if (!rsp.ok) throw new Error(data?.error || data?.message || 'failed_subscription_me')
			const sub = (data?.user?.subscription ?? {}) as { status?: string; validUntil?: string | null }
			setSubStatus(sub.status || null)
			setSubUntil(sub.validUntil || null)
		} catch (e: any) {
			setSubError(e?.message || String(e))
			setSubStatus(null)
			setSubUntil(null)
		} finally {
			setSubLoading(false)
		}
	}, [])

	useEffect(() => {
		refreshSubscription()
	}, [refreshSubscription])

	// Minimal Razorpay type guard
	const hasRazorpayOnWindow = () =>
		typeof window !== 'undefined' && typeof (window as any).Razorpay === 'function'

	// Dynamically load Razorpay checkout script if not present
	const ensureRazorpayLoaded = async () => {
		if (hasRazorpayOnWindow()) return
		if (typeof document === 'undefined') throw new Error('razorpay_js_not_loaded')
		await new Promise<void>((resolve, reject) => {
			const existing = document.querySelector<HTMLScriptElement>(
				'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
			)
			if (existing) {
				existing.addEventListener('load', () => resolve())
				existing.addEventListener('error', () => reject(new Error('razorpay_script_load_failed')))
				return
			}
			const script = document.createElement('script')
			script.src = 'https://checkout.razorpay.com/v1/checkout.js'
			script.async = true
			script.onload = () => resolve()
			script.onerror = () => reject(new Error('razorpay_script_load_failed'))
			document.head.appendChild(script)
		})
		if (!hasRazorpayOnWindow()) {
			throw new Error('razorpay_js_not_loaded')
		}
	}

	const startTrial = async () => {
		setSubActionLoading(true)
		setSubError(null)
		try {
			const token = localStorage.getItem('void_jwt')
			if (!token) throw new Error('auth_required')
			await ensureRazorpayLoaded()

			// Create 1 trial order via backend
			const orderRsp = await fetch(`${BACKEND_URL}/api/payments/create-order`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ planType: 'trial' }),
			})
			const orderData = await orderRsp.json().catch(() => ({}))
			if (!orderRsp.ok) throw new Error(orderData?.error || orderData?.message || 'order_failed')
			const { keyId, orderId, amount, currency } = orderData as any

			const RazorpayCtor = (window as any).Razorpay
			const opts: any = {
				key: keyId,
				amount,
				currency,
				name: 'KvantKode / Void',
				description: '1 trial (15 days) then  1008 / 28 days',
				order_id: orderId,
				handler: async (resp: any) => {
					try {
						const confirmRsp = await fetch(`${BACKEND_URL}/api/payments/verify`, {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								Authorization: `Bearer ${token}`,
							},
							body: JSON.stringify({
								razorpay_order_id: resp.razorpay_order_id,
								razorpay_payment_id: resp.razorpay_payment_id,
								razorpay_signature: resp.razorpay_signature,
								planType: 'trial',
							}),
						})
						const cdata = await confirmRsp.json().catch(() => ({}))
						if (!confirmRsp.ok)
							throw new Error(cdata?.error || cdata?.message || 'confirm_failed')
						await refreshSubscription()
					} catch (e: any) {
						setSubError(e?.message || String(e))
					}
				},
			}
			const rzp = new RazorpayCtor(opts)
			rzp.open()
		} catch (e: any) {
			setSubError(e?.message || String(e))
		} finally {
			setSubActionLoading(false)
		}
	}

	const activateBroker = async (brokerId: string) => {
		setLoading(true)
		setError(null)
		try {
			const token = localStorage.getItem('void_jwt')
			const rsp = await fetch(
				`${BACKEND_URL}/api/users/${encodeURIComponent(userId)}/brokers/activate/${encodeURIComponent(brokerId)}`,
				{
					method: 'PUT',
					headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
				}
			)
			const data = await rsp.json().catch(() => null)
			if (!rsp.ok) throw new Error(data?.error || data?.message || 'failed_activate_broker')
			await readMe()
			onChanged()
		} catch (e: any) {
			setError(friendlyBrokerError(e))
		} finally {
			setLoading(false)
		}
	}

	const deleteBroker = async (brokerId: string) => {
		setLoading(true)
		setError(null)
		try {
			const token = localStorage.getItem('void_jwt')
			const rsp = await fetch(
				`${BACKEND_URL}/api/users/${encodeURIComponent(userId)}/brokers/${encodeURIComponent(
					brokerId,
				)}`,
				{
					method: 'DELETE',
					headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
				},
			)
			const data = await rsp.json().catch(() => null)
			if (!rsp.ok) throw new Error(data?.error || data?.message || 'failed_delete_broker')
			await readMe()
			onChanged()
			await readBalance()
			await readPositionsOrders()
		} catch (e: any) {
			const raw = e?.message || String(e)
			let friendly = raw
			if (raw === 'user_exists') friendly = 'An account with this email or phone already exists.'
			else if (raw === 'invalid_otp') friendly = 'The OTP is incorrect or has expired.'
			else if (raw === 'phone_in_use') friendly = 'This phone number is already registered.'
			else if (raw === 'invalid_credentials') friendly = 'Invalid email/phone or password.'
			setError(friendly)
		} finally {
			setLoading(false)
		}
	}

	const deactivateBroker = async (brokerId: string) => {
		setLoading(true)
		setError(null)
		try {
			const token = localStorage.getItem('void_jwt')
			const rsp = await fetch(
				`${BACKEND_URL}/api/users/${encodeURIComponent(userId)}/brokers/${encodeURIComponent(brokerId)}/deactivate`,
				{
					method: 'PUT',
					headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
				},
			)
			const data = await rsp.json().catch(() => null)
			if (!rsp.ok) throw new Error(data?.error || data?.message || 'failed_deactivate_broker')
			await readMe()
			onChanged()
		} catch (e: any) {
			setError(e?.message || String(e))
		} finally {
			setLoading(false)
		}
	}

	const startEdit = (b: any) => {
		setEditingId(b._id)
		setEditForm({
			broker: b.broker || '',
			apiKey: b.apiKey || '',
			apiSecretKey: b.apiSecretKey || '',
			accessToken: b.accessToken || '',
			clientId: b.clientId || '',
			tokenId: b.tokenId || '',
			token: b.token || '',
			mpin: b.mpin || '',
		})
	}

	const cancelEdit = () => {
		setEditingId(null)
	}

	const saveEdit = async (brokerId: string) => {
		setLoading(true)
		setError(null)
		try {
			if (
				!SUPPORTED_BROKERS.map((b) => b.toLowerCase()).includes(
					(editForm.broker || '').toLowerCase(),
				)
			) {
				throw new Error('unsupported_broker')
			}
			const rules = REQ[editForm.broker as keyof typeof REQ]
			if (rules) {
				if (rules.apiKey && !editForm.apiKey.trim()) throw new Error('api_key_required')
				if (rules.apiSecretKey && !editForm.apiSecretKey.trim())
					throw new Error('api_secret_required')
				if (rules.accessToken && !(editForm.accessToken || '').trim())
					throw new Error('access_token_required')
				if (rules.clientId && !(editForm.clientId || '').trim())
					throw new Error('client_id_required')
			}
			const token = localStorage.getItem('void_jwt')
			const rsp = await fetch(
				`${BACKEND_URL}/api/users/${encodeURIComponent(userId)}/brokers/${encodeURIComponent(brokerId)}`,
				{
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
						...(token ? { Authorization: `Bearer ${token}` } : {}),
					},
					body: JSON.stringify({
						broker: editForm.broker,
						...(rules?.apiKey ? { apiKey: editForm.apiKey } : {}),
						...(rules?.apiSecretKey ? { apiSecretKey: editForm.apiSecretKey } : {}),
						...(rules?.accessToken ? { accessToken: (editForm.accessToken || '').trim() } : {}),
						...(rules?.clientId ? { clientId: (editForm.clientId || '').trim() } : {}),
						// tokenId is currently only meaningful for Dhan but harmless for others
						...(editForm.tokenId ? { tokenId: editForm.tokenId.trim() } : {}),
						// AngelOne extra fields when editing
						...(editForm.broker === 'AngelOne' && editForm.token ? { token: editForm.token.trim() } : {}),
						...(editForm.broker === 'AngelOne' && editForm.mpin ? { mpin: editForm.mpin.trim() } : {}),
					}),
				},
			)
			const data = await rsp.json().catch(() => null)
			if (!rsp.ok) throw new Error(data?.error || data?.message || 'failed_update_broker')
			setEditingId(null)
			await readMe()
			onChanged()
			await readBalance()
		} catch (e: any) {
			setError(e?.message || String(e))
		} finally {
			setLoading(false)
		}
	}

	const onSubmit = async () => {
		setLoading(true)
		setError(null)
		try {
			if (
				!SUPPORTED_BROKERS.map((b) => b.toLowerCase()).includes((form.broker || '').toLowerCase())
			) {
				throw new Error('unsupported_broker')
			}
			const rules = REQ[form.broker as keyof typeof REQ]
			if (rules) {
				if (rules.apiKey && !form.apiKey.trim()) throw new Error('api_key_required')
				if (rules.apiSecretKey && !form.apiSecretKey.trim()) throw new Error('api_secret_required')
				if (rules.accessToken && !(form.accessToken || '').trim())
					throw new Error('access_token_required')
				if (rules.clientId && !(form.clientId || '').trim())
					throw new Error('client_id_required')
			}
			const token = localStorage.getItem('void_jwt')
			const body: any = {
				broker: form.broker,
				...(rules?.apiKey ? { apiKey: form.apiKey } : {}),
				...(rules?.apiSecretKey ? { apiSecretKey: form.apiSecretKey } : {}),
				...(rules?.accessToken ? { accessToken: (form.accessToken || '').trim() } : {}),
				...(rules?.clientId ? { clientId: (form.clientId || '').trim() } : {}),
				// AngelOne extra fields (optional)
				...(form.broker === 'AngelOne' && form.token ? { token: form.token.trim() } : {}),
				...(form.broker === 'AngelOne' && form.mpin ? { mpin: form.mpin.trim() } : {}),
				isActive: form.isActive,
			}

			const rsp = await fetch(`${BACKEND_URL}/api/users/${encodeURIComponent(userId)}/brokers`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				body: JSON.stringify(body),
			})
			const data = await rsp.json()
			if (!rsp.ok) throw new Error(data?.error || data?.message || 'failed_add_broker')
			setForm({ broker: '', apiKey: '', apiSecretKey: '', accessToken: '', clientId: '', tokenId: '', token: '', mpin: '', isActive: true })
			await readMe()
			onChanged()
		} catch (e: any) {
			setError(e?.message || String(e))
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="px-4 py-3 border-t border-void-border-2 h-full overflow-y-auto">
			{/* Subscription card */}
			<div className="mb-3 rounded border border-void-border-2 bg-void-bg-2 p-2 text-xs flex flex-col gap-1">
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-1 text-void-fg-2">
						<CreditCard size={14} />
						<span>Subscription</span>
					</div>
					<button
						type="button"
						className="px-2 py-1 rounded bg-void-bg-3 border border-void-border-2 text-void-fg-1 hover:bg-void-bg-4 disabled:opacity-60 disabled:cursor-not-allowed"
						disabled={subLoading || subActionLoading}
						onClick={startTrial}
					>
						{subActionLoading ? 'Processing…' : 'Start / Manage'}
					</button>
				</div>
				<div className="flex flex-col gap-0.5 text-void-fg-3">
					<div>
						{subLoading
							? 'Checking subscription…'
							: subStatus === 'trial'
								? `Trial active${subUntil ? ` until ${new Date(subUntil).toLocaleString()}` : ''}`
								: subStatus === 'active'
									? `Subscribed${subUntil ? ` until ${new Date(subUntil).toLocaleString()}` : ''}`
									: 'No active subscription'}
					</div>
					{subError ? (
						<div className="text-[11px] text-red-500 truncate" title={subError}>
							{subError}
						</div>
					) : null}
				</div>
			</div>

			{/* Existing broker UI */}
			<div className="flex items-center justify-between mb-2">
				<div className="text-sm">Broker</div>
				<div className="text-xs text-void-fg-3 flex items-center gap-2">
					{loadingBalance ? (
						<span>Loading balance…</span>
					) : balance ? (
						<span>
							Cash: {balance.cashBalance} {balance.currency || ''}
						</span>
					) : (
						<span className="opacity-70">Balance unavailable</span>
					)}
				</div>
			</div>
			<div className="text-xs text-void-fg-3 mb-2">
				Connect your broker credentials to your account.
			</div>
			<div className="grid gap-2 mb-2">
				<select
					className="bg-void-bg-2 border border-void-border-2 rounded p-2"
					value={form.broker}
					onChange={(e) =>
						setForm({
							...form,
							broker: e.target.value,
							apiKey: '',
							apiSecretKey: '',
							accessToken: '',
						})
					}
				>
					<option value="">Select Broker</option>
					{SUPPORTED_BROKERS.map((b) => (
						<option key={b} value={b}>
							{b}
						</option>
					))}
				</select>
				<input
					className="bg-void-bg-2 border border-void-border-2 rounded p-2"
					placeholder="API Key"
					value={form.apiKey}
					onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
					disabled={!REQ[form.broker]?.apiKey}
				/>
				<input
					className="bg-void-bg-2 border border-void-border-2 rounded p-2"
					placeholder="API Secret Key"
					value={form.apiSecretKey}
					onChange={(e) => setForm({ ...form, apiSecretKey: e.target.value })}
					disabled={!REQ[form.broker]?.apiSecretKey}
				/>
				<input
					className="bg-void-bg-2 border border-void-border-2 rounded p-2"
					placeholder={
						REQ[form.broker]?.accessToken ? 'Access Token (required)' : 'Access Token'
					}
					value={form.accessToken}
					onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
					disabled={!REQ[form.broker]?.accessToken}
				/>
				<input
					className="bg-void-bg-2 border border-void-border-2 rounded p-2"
					placeholder={
						REQ[form.broker]?.clientId ? 'Client ID (required for this broker)' : 'Client ID'
					}
					value={form.clientId}
					onChange={(e) => setForm({ ...form, clientId: e.target.value })}
					disabled={!REQ[form.broker]?.clientId}
				/>
				{form.broker === 'AngelOne' && (
					<>
						<input
							className="bg-void-bg-2 border border-void-border-2 rounded p-2"
							placeholder="Token (TOTP seed / auth token)"
							value={form.token}
							onChange={(e) => setForm({ ...form, token: e.target.value })}
						/>
						<input
							className="bg-void-bg-2 border border-void-border-2 rounded p-2"
							placeholder="MPIN"
							value={form.mpin}
							onChange={(e) => setForm({ ...form, mpin: e.target.value })}
						/>
					</>
				)}
				{form.broker === 'Dhan' && (
					<input
						className="bg-void-bg-2 border border-void-border-2 rounded p-2"
						placeholder="Token ID (from Dhan URL after login)"
						value={form.tokenId}
						onChange={(e) => setForm({ ...form, tokenId: e.target.value })}
					/>
				)}
				<label className="flex items-center gap-2 text-xs">
					<input
						type="checkbox"
						checked={form.isActive}
						onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
					/>{' '}
					Active
				</label>
				{form.broker === 'Dhan' && (
					<div className="flex items-center gap-2 text-xs">
						<button
							className="px-2 py-1 rounded border border-void-border-2 bg-void-bg-2 disabled:opacity-50"
							disabled={dhanConsentLoading}
							onClick={startDhanLogin}
						>
							{dhanConsentLoading ? 'Opening Dhan login…' : 'Start Dhan login'}
						</button>
						<button
							className="px-2 py-1 rounded border border-void-border-2 bg-void-bg-2 disabled:opacity-50"
							disabled={dhanTokenLoading}
							onClick={() => generateDhanToken()}
						>
							{dhanTokenLoading ? 'Generating Dhan token…' : 'Generate Dhan token'}
						</button>
						{dhanConsentError && (
							<span className="text-void-warning">{dhanConsentError}</span>
						)}
						{dhanTokenError && (
							<span className="text-void-warning">{dhanTokenError}</span>
						)}
					</div>
				)}
				{error && <div className="text-void-warning text-xs">{error}</div>}
				{balanceError && <div className="text-void-warning text-xs">{balanceError}</div>}
				<button
					className="bg-white text-black rounded p-2 text-sm disabled:opacity-50"
					disabled={loading}
					onClick={onSubmit}
				>
					{loading ? 'Saving...' : 'Add broker'}
				</button>
			</div>
			<div className="text-xs text-void-fg-3 mb-1">Connected brokers</div>
			<div className="flex flex-col gap-2">
				{brokers?.length ? (
					brokers.map((b: any) => (
						<div
							key={b._id}
							className="text-xs p-2 rounded border border-void-border-2 flex flex-col gap-2"
						>
							{editingId === b._id ? (
								<>
									<div className="grid gap-2">
										<select
											className="bg-void-bg-2 border border-void-border-2 rounded p-2"
											value={editForm.broker}
											onChange={(e) =>
												setEditForm({
													...editForm,
													broker: e.target.value,
													apiKey: '',
													apiSecretKey: '',
													accessToken: '',
												})
											}
										>
											<option value="">Select Broker</option>
											{SUPPORTED_BROKERS.map((b) => (
												<option key={b} value={b}>
													{b}
												</option>
											))}
										</select>
										<input
											className="bg-void-bg-2 border border-void-border-2 rounded p-2"
											placeholder="API Key"
											value={editForm.apiKey}
											onChange={(e) => setEditForm({ ...editForm, apiKey: e.target.value })}
											disabled={!REQ[editForm.broker]?.apiKey}
										/>
										<input
											className="bg-void-bg-2 border border-void-border-2 rounded p-2"
											placeholder="API Secret Key"
											value={editForm.apiSecretKey}
											onChange={(e) => setEditForm({ ...editForm, apiSecretKey: e.target.value })}
											disabled={!REQ[editForm.broker]?.apiSecretKey}
										/>
										<input
											className="bg-void-bg-2 border border-void-border-2 rounded p-2"
											placeholder={
												REQ[editForm.broker]?.accessToken
													? 'Access Token (required)'
													: 'Access Token'
											}
											value={editForm.accessToken}
											onChange={(e) =>
												setEditForm({ ...editForm, accessToken: e.target.value })
											}
											disabled={!REQ[editForm.broker]?.accessToken}
										/>
										<input
											className="bg-void-bg-2 border border-void-border-2 rounded p-2"
											placeholder={
												REQ[editForm.broker]?.clientId
													? 'Client ID (required for this broker)'
													: 'Client ID'
											}
											value={editForm.clientId}
											onChange={(e) =>
												setEditForm({ ...editForm, clientId: e.target.value })
											}
											disabled={!REQ[editForm.broker]?.clientId}
										/>
										{editForm.broker === 'AngelOne' && (
											<>
												<input
													className="bg-void-bg-2 border border-void-border-2 rounded p-2"
													placeholder="Token (TOTP seed / auth token)"
													value={editForm.token}
													onChange={(e) => setEditForm({ ...editForm, token: e.target.value })}
												/>
												<input
													className="bg-void-bg-2 border border-void-border-2 rounded p-2"
													placeholder="MPIN"
													value={editForm.mpin}
													onChange={(e) => setEditForm({ ...editForm, mpin: e.target.value })}
												/>
											</>
										)}
									</div>
									<div className="flex items-center gap-2 justify-end">
										<button
											className="px-2 py-1 rounded border border-void-border-2"
											onClick={cancelEdit}
											disabled={loading}
										>
											Cancel
										</button>
										<button
											className="px-2 py-1 rounded bg-white text-black"
											onClick={() => saveEdit(b._id)}
											disabled={loading}
										>
											Save
										</button>
									</div>
								</>
							) : (
								<div className="flex items-center justify-between gap-2">
									<div>
										<div className="font-mono">{b.broker || 'Broker'}</div>
										<div className={`opacity-70 ${b.isActive ? 'text-green-400' : ''}`}>
											{b.isActive ? 'Active' : 'Inactive'}
										</div>
									</div>
									<div className="flex items-center gap-2">
										<button
											className="px-2 py-1 rounded border border-void-border-2"
											onClick={() => startEdit(b)}
											disabled={loading}
										>
											Edit
										</button>
										<button
											disabled={loading}
											className="px-2 py-1 rounded border border-void-border-2 text-void-warning"
											onClick={() => deleteBroker(b._id)}
										>
											Delete
										</button>
										{b.isActive ? (
											<button
												disabled={loading}
												className="px-2 py-1 rounded border border-void-border-2"
												onClick={() => deactivateBroker(b._id)}
											>
												Deactivate
											</button>
										) : (
											<button
												disabled={loading}
												className="px-2 py-1 rounded bg-white text-black"
												onClick={() => activateBroker(b._id)}
											>
												Activate
											</button>
										)}
									</div>
								</div>
							)}
						</div>
					))
				) : (
					<div className="text-xs opacity-70">No brokers yet</div>
				)}
			</div>
			<div className="mt-3">
				<div className="text-xs text-void-fg-3 mb-1">Positions</div>
				{poError && <div className="text-void-warning text-xs mb-1">{poError}</div>}
				<div className="flex flex-col gap-1">
					{loadingPo ? (
						<div className="text-xs opacity-70">Loading…</div>
					) : positions.length ? (
						positions.map((p, i) => (
							<div
								key={i}
								className="text-xs p-2 rounded border border-void-border-2 flex justify-between"
							>
								<div className="font-mono">{p.symbol}</div>
								<div className="opacity-80">Qty: {p.qty}</div>
							</div>
						))
					) : (
						<div className="text-xs opacity-70">No positions</div>
					)}
				</div>
			</div>
			<div className="mt-3">
				<div className="text-xs text-void-fg-3 mb-1">Recent orders</div>
				<div className="flex flex-col gap-1">
					{loadingPo ? (
						<div className="text-xs opacity-70">Loading…</div>
					) : orders.length ? (
						orders.map((o) => (
							<div
								key={o.id}
								className="text-xs p-2 rounded border border-void-border-2 flex justify-between"
							>
								<div className="font-mono">{o.symbol}</div>
								<div className="opacity-80">
									{o.side} {o.qty} · {o.status}
								</div>
							</div>
						))
					) : (
						<div className="text-xs opacity-70">No orders</div>
					)}
				</div>
			</div>
		</div>
	)
}

const IconArrowUp = ({ size, className = '' }: { size: number; className?: string }) => {
	return (
		<svg
			width={size}
			height={size}
			className={className}
			viewBox="0 0 20 20"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				fill="black"
				fillRule="evenodd"
				clipRule="evenodd"
				d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
			></path>
		</svg>
	)
}

const IconSquare = ({ size, className = '' }: { size: number; className?: string }) => {
	return (
		<svg
			className={className}
			stroke="black"
			fill="black"
			strokeWidth="0"
			viewBox="0 0 24 24"
			width={size}
			height={size}
			xmlns="http://www.w3.org/2000/svg"
		>
			<rect x="2" y="2" width="20" height="20" rx="4" ry="4" />
		</svg>
	)
}

export const IconWarning = ({ size, className = '' }: { size: number; className?: string }) => {
	return (
		<svg
			className={className}
			stroke="currentColor"
			fill="currentColor"
			strokeWidth="0"
			viewBox="0 0 16 16"
			width={size}
			height={size}
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				fillRule="evenodd"
				clipRule="evenodd"
				d="M7.56 1h.88l6.54 12.26-.44.74H1.44L1 13.26 7.56 1zM8 2.28L2.28 13H13.7L8 2.28zM8.625 12v-1h-1.25v1h1.25zm-1.25-2V6h1.25v4h-1.25z"
			/>
		</svg>
	)
}

export const IconLoading = ({ className = '' }: { className?: string }) => {
	const [loadingText, setLoadingText] = useState('.')

	useEffect(() => {
		let intervalId

		// Function to handle the animation
		const toggleLoadingText = () => {
			if (loadingText === '...') {
				setLoadingText('.')
			} else {
				setLoadingText(loadingText + '.')
			}
		}

		// Start the animation loop
		intervalId = setInterval(toggleLoadingText, 300)

		// Cleanup function to clear the interval when component unmounts
		return () => clearInterval(intervalId)
	}, [loadingText, setLoadingText])

	return <div className={`${className}`}>{loadingText}</div>
}

const BACKEND_URL =
	(typeof process !== 'undefined' &&
		(process as any).env &&
		(process as any).env.VOID_BACKEND_URL) ||
	'http://localhost:3000'

const DHAN_LOGIN_URL =
	(typeof process !== 'undefined' &&
		(process as any).env &&
		(process as any).env.DHAN_LOGIN_URL) ||
	'https://app.dhan.co/'

const AuthPanel = ({
	onAuthed
}: {
	onAuthed: (token: string, user: any) => void;
}) => {
	const [mode, setMode] = useState<'login' | 'signup'>('login')
	const [username, setUsername] = useState('')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [showTerms, setShowTerms] = useState(false)
	const [acceptedTerms, setAcceptedTerms] = useState(false)
	const [subscription, setSubscription] = useState<{ isActive: boolean; validUntil: string | null; isFirstTime: boolean; paymentLink: string | null } | null>(null)
	const [checkingSubscription, setCheckingSubscription] = useState(false)
	const [pollingPayment, setPollingPayment] = useState(false)
	const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null)
	const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
	const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)

	// Cleanup polling on unmount
	useEffect(() => {
		return () => {
			if (pollIntervalRef.current) {
				clearInterval(pollIntervalRef.current)
				pollIntervalRef.current = null
			}
			if (countdownIntervalRef.current) {
				clearInterval(countdownIntervalRef.current)
				countdownIntervalRef.current = null
			}
		}
	}, [])

	// Countdown timer
	useEffect(() => {
		if (subscription?.isActive && subscription.validUntil) {
			const updateCountdown = () => {
				const now = new Date().getTime()
				const expiry = new Date(subscription.validUntil!).getTime()
				const diff = expiry - now
				if (diff > 0) {
					const days = Math.floor(diff / (1000 * 60 * 60 * 24))
					const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
					const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
					const seconds = Math.floor((diff % (1000 * 60)) / 1000)
					setTimeLeft({ days, hours, minutes, seconds })
				} else {
					setTimeLeft(null)
					// Subscription expired; refresh status
					const token = localStorage.getItem('void_jwt')
					if (token) checkSubscription(token)
				}
			}
			updateCountdown()
			countdownIntervalRef.current = setInterval(updateCountdown, 1000)
			return () => {
				if (countdownIntervalRef.current) {
					clearInterval(countdownIntervalRef.current)
					countdownIntervalRef.current = null
				}
			}
		} else {
			setTimeLeft(null)
		}
	}, [subscription])

	// Check subscription after auth
	const checkSubscription = async (token: string) => {
		setCheckingSubscription(true)
		// Reset stale subscription state
		setSubscription(null)
		setTimeLeft(null)
		try {
			const rsp = await fetch(`${BACKEND_URL}/subscription/status`, {
				headers: { Authorization: `Bearer ${token}` },
			})
			const data = await rsp.json()
			if (rsp.ok) {
				setSubscription(data)
				if (!data.isActive) {
					// Show payment UI
					return
				}
			}
		} catch {}
		setCheckingSubscription(false)
	}

	// Poll for payment completion
	const startPaymentPolling = (token: string) => {
		setPollingPayment(true)
		pollIntervalRef.current = setInterval(async () => {
			try {
				const rsp = await fetch(`${BACKEND_URL}/subscription/status`, {
					headers: { Authorization: `Bearer ${token}` },
				})
				const data = await rsp.json()
				if (rsp.ok && data.isActive) {
					setSubscription(data)
					setPollingPayment(false)
					if (pollIntervalRef.current) {
						clearInterval(pollIntervalRef.current)
						pollIntervalRef.current = null
					}
					// Proceed to app
					const meRsp = await fetch(`${BACKEND_URL}/auth/me`, {
						headers: { Authorization: `Bearer ${token}` },
					})
					if (meRsp.ok) {
						const meData = await meRsp.json()
						onAuthed(token, meData.user)
					}
				}
			} catch {}
		}, 3000) // every 3 seconds
	}

	const handleAuthed = async (token: string, user: any) => {
		try {
			localStorage.setItem('void_jwt', token)
		} catch {}
		// Stop any existing payment polling
		setPollingPayment(false)
		if (pollIntervalRef.current) {
			clearInterval(pollIntervalRef.current)
			pollIntervalRef.current = null
		}
		await checkSubscription(token)
		if (subscription?.isActive) {
			// Proceed to app
			onAuthed(token, user)
		} else {
			// Start polling for payment
			startPaymentPolling(token)
		}
	}

	// Clear browser storage on new signup
	const clearBrowserStorage = () => {
		try {
			localStorage.clear()
			sessionStorage.clear()
		} catch {}
	}

	const verifyPayment = async (paymentId: string, orderId: string, signature: string) => {
		try {
			const token = localStorage.getItem('void_jwt')
			const rsp = await fetch(`${BACKEND_URL}/payments/verify`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ razorpay_payment_id: paymentId, razorpay_order_id: orderId, razorpay_signature: signature }),
			})
			const data = await rsp.json()
			if (rsp.ok) {
				await checkSubscription(token!)
				if (subscription?.isActive && token) {
					// Fetch user and proceed
					const meRsp = await fetch(`${BACKEND_URL}/auth/me`, {
						headers: { Authorization: `Bearer ${token}` },
					})
					if (meRsp.ok) {
						const meData = await meRsp.json()
						onAuthed(token, meData.user)
					}
				}
			} else {
				setError('Payment verification failed')
			}
		} catch (e) {
			setError('Payment verification failed')
		}
	}

	const doSubmit = async () => {
		setLoading(true)
		setError(null)
		// Reset subscription state on fresh login/signup
		setSubscription(null)
		setCheckingSubscription(false)
		setPollingPayment(false)
		if (pollIntervalRef.current) {
			clearInterval(pollIntervalRef.current)
			pollIntervalRef.current = null
		}
		// Clear any stored JWT to avoid stale state
		try {
			localStorage.removeItem('void_jwt')
		} catch {}
		try {
			if (!acceptedTerms) {
				throw new Error('Please accept the terms & services to continue.')
			}
			// Validate password confirmation on signup
			if (mode === 'signup' && password !== confirmPassword) {
				throw new Error('Passwords do not match.')
			}
			const path = mode === 'login' ? '/auth/login' : '/auth/signup'
			const body: any =
				mode === 'login'
					? { email, password }
					: { username: username || (email ? email.split('@')[0] : ''), email, password }
			const rsp = await fetch(`${BACKEND_URL}${path}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			})
			const data = await rsp.json()
			if (!rsp.ok) throw new Error(data?.error || 'auth_failed')
			const { token, user } = data || {}
			if (token) {
				// Clear browser storage on new signup to avoid stale state
				if (mode === 'signup') clearBrowserStorage()
				await handleAuthed(token, user)
			} else {
				throw new Error('missing_token')
			}
		} catch (e: any) {
			setError(e?.message || String(e))
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="w-full h-full flex items-center justify-center p-4">
			<div className="bg-void-bg-1 border border-void-border-2 rounded p-4 w-full max-w-sm flex flex-col gap-2">
				{subscription && !subscription.isActive && subscription.paymentLink ? (
					<div className="flex flex-col gap-3">
						<div className="text-lg">
							{subscription.isFirstTime ? 'Start your trial' : 'Renew subscription'}
						</div>
						<div className="text-sm text-void-fg-3">
							{subscription.isFirstTime
								? 'Pay ₹1 to get 7 days access.'
								: 'Pay ₹1008 for 28 days access.'}
						</div>
						{timeLeft && (
							<div className="text-xs text-void-fg-3">
								Next payment: {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
							</div>
						)}
						<button
							className="px-4 py-2 rounded bg-white text-black font-semibold"
							onClick={() => {
								if (subscription?.paymentLink) {
									window.open(subscription.paymentLink, '_blank')
									// Start polling for payment
									const token = localStorage.getItem('void_jwt')
									if (token && !pollingPayment) startPaymentPolling(token)
								}
							}}
							disabled={pollingPayment}
						>
							{pollingPayment ? 'Waiting for payment…' : 'Pay Now'}
						</button>
						<div className="text-xs text-void-fg-3">
							After payment, refresh this page or click below to verify.
						</div>
						<button
							className="text-xs underline text-void-fg-3"
							onClick={async () => {
								setError(null)
								const token = localStorage.getItem('void_jwt')
								if (token) {
									try {
										const rsp = await fetch(`${BACKEND_URL}/payments/manual-verify`, {
											method: 'POST',
											headers: {
												'Content-Type': 'application/json',
												Authorization: `Bearer ${token}`,
											},
										})
										const data = await rsp.json()
										if (rsp.ok) {
											await checkSubscription(token)
											if (subscription?.isActive && token) {
												const meRsp = await fetch(`${BACKEND_URL}/auth/me`, {
													headers: { Authorization: `Bearer ${token}` },
												})
												if (meRsp.ok) {
													const meData = await meRsp.json()
													onAuthed(token, meData.user)
												}
											}
										} else {
											setError('Verification failed. Please try again.')
										}
									} catch (e) {
										setError('Verification failed. Please try again.')
									}
								}
							}}
						>
							I have paid – verify
						</button>
						{error && <div className="text-void-warning text-xs">{error}</div>}
					</div>
				) : checkingSubscription ? (
					<div className="text-center text-void-fg-3">Checking subscription…</div>
				) : (
					<>
						<div className="text-lg">{mode === 'login' ? 'Login' : 'Sign up'}</div>
						{mode === 'signup' && (
							<input
								className="bg-void-bg-2 border border-void-border-2 rounded p-2"
								placeholder="Username"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
							/>
						)}
						<input
							className="bg-void-bg-2 border border-void-border-2 rounded p-2"
							placeholder="Email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
						/>
						<input
							className="bg-void-bg-2 border border-void-border-2 rounded p-2"
							placeholder="Password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
						/>
						{mode === 'signup' && (
							<input
								className="bg-void-bg-2 border border-void-border-2 rounded p-2"
								placeholder="Confirm Password"
								type="password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
							/>
						)}
						{/* Terms & Conditions notice above the submit button */}
						<label className="text-[11px] text-void-fg-3 leading-snug flex items-start gap-2">
							<button
								type="button"
								className="mt-[2px] w-3 h-3 border border-void-border-2 rounded flex items-center justify-center bg-void-bg-1"
								onClick={() => setAcceptedTerms((v) => !v)}
							>
								{acceptedTerms && (
									<svg className="w-2 h-2 text-void-fg-2" fill="currentColor" viewBox="0 0 20 20">
										<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
									</svg>
								)}
							</button>
							<span>
								accept all the terms and conditions
								{' '}
								<button
									type="button"
									className="underline text-void-fg-3 hover:text-void-fg-2"
									onClick={() => window.open('https://users-policies-kvantkode.netlify.app', '_blank')}
								>
									Read Terms &amp; Services
								</button>
							</span>
						</label>
						{error && <div className="text-void-warning text-xs">{error}</div>}
				<button
					className="bg-white text-black rounded p-2 text-sm disabled:opacity-50"
					disabled={loading || !acceptedTerms}
					onClick={doSubmit}
				>
					{loading ? 'Please wait…' : mode === 'login' ? 'Login' : 'Create account'}
				</button>
				<button
					className="text-void-fg-3 text-xs underline"
					onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
				>
					{mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Log in'}
				</button>
					</>
				)}
			</div>
		</div>
	)
}

// SLIDER ONLY:
const ReasoningOptionSlider = ({ featureName }: { featureName: FeatureName }) => {
	const accessor = useAccessor()

	const voidSettingsService = accessor.get('IVoidSettingsService')
	const voidSettingsState = useSettingsState()

	const modelSelection = voidSettingsState.modelSelectionOfFeature[featureName]
	const overridesOfModel = voidSettingsState.overridesOfModel

	if (!modelSelection) return null

	const { modelName, providerName } = modelSelection
	const { reasoningCapabilities } = getModelCapabilities(providerName, modelName, overridesOfModel)
	const { canTurnOffReasoning, reasoningSlider: reasoningBudgetSlider } =
		reasoningCapabilities || {}

	const modelSelectionOptions =
		voidSettingsState.optionsOfModelSelection[featureName][providerName]?.[modelName]
	const isReasoningEnabled = getIsReasoningEnabledState(
		featureName,
		providerName,
		modelName,
		modelSelectionOptions,
		overridesOfModel,
	)

	if (canTurnOffReasoning && !reasoningBudgetSlider) {
		// if it's just a on/off toggle without a power slider
		return (
			<div className="flex items-center gap-x-2">
				<span className="text-void-fg-3 text-xs pointer-events-none inline-block w-10 pr-1">
					Thinking
				</span>
				<VoidSwitch
					size="xxs"
					value={isReasoningEnabled}
					onChange={(newVal) => {
						const isOff = canTurnOffReasoning && !newVal
						voidSettingsService.setOptionsOfModelSelection(
							featureName,
							modelSelection.providerName,
							modelSelection.modelName,
							{ reasoningEnabled: !isOff },
						)
					}}
				/>
			</div>
		)
	}

	if (reasoningBudgetSlider?.type === 'budget_slider') {
		// if it's a slider
		const { min: min_, max, default: defaultVal } = reasoningBudgetSlider

		const nSteps = 8 // only used in calculating stepSize, stepSize is what actually matters
		const stepSize = Math.round((max - min_) / nSteps)

		const valueIfOff = min_ - stepSize
		const min = canTurnOffReasoning ? valueIfOff : min_
		const value = isReasoningEnabled
			? (voidSettingsState.optionsOfModelSelection[featureName][modelSelection.providerName]?.[
					modelSelection.modelName
				]?.reasoningBudget ?? defaultVal)
			: valueIfOff

		return (
			<div className="flex items-center gap-x-2">
				<span className="text-void-fg-3 text-xs pointer-events-none inline-block w-10 pr-1">
					Thinking
				</span>
				<VoidSlider
					width={50}
					size="xs"
					min={min}
					max={max}
					step={stepSize}
					value={value}
					onChange={(newVal) => {
						const isOff = canTurnOffReasoning && newVal === valueIfOff
						voidSettingsService.setOptionsOfModelSelection(
							featureName,
							modelSelection.providerName,
							modelSelection.modelName,
							{ reasoningEnabled: !isOff, reasoningBudget: newVal },
						)
					}}
				/>
				<span className="text-void-fg-3 text-xs pointer-events-none">
					{isReasoningEnabled ? `${value} tokens` : 'Thinking disabled'}
				</span>
			</div>
		)
	}

	if (reasoningBudgetSlider?.type === 'effort_slider') {
		const { values, default: defaultVal } = reasoningBudgetSlider

		const min = canTurnOffReasoning ? -1 : 0
		const max = values.length - 1

		const currentEffort =
			voidSettingsState.optionsOfModelSelection[featureName][modelSelection.providerName]?.[
				modelSelection.modelName
			]?.reasoningEffort ?? defaultVal
		const valueIfOff = -1
		const value = isReasoningEnabled && currentEffort ? values.indexOf(currentEffort) : valueIfOff

		const currentEffortCapitalized =
			currentEffort.charAt(0).toUpperCase() + currentEffort.slice(1, Infinity)

		return (
			<div className="flex items-center gap-x-2">
				<span className="text-void-fg-3 text-xs pointer-events-none inline-block w-10 pr-1">
					Thinking
				</span>
				<VoidSlider
					width={30}
					size="xs"
					min={min}
					max={max}
					step={1}
					value={value}
					onChange={(newVal) => {
						const isOff = canTurnOffReasoning && newVal === valueIfOff
						voidSettingsService.setOptionsOfModelSelection(
							featureName,
							modelSelection.providerName,
							modelSelection.modelName,
							{ reasoningEnabled: !isOff, reasoningEffort: values[newVal] ?? undefined },
						)
					}}
				/>
				<span className="text-void-fg-3 text-xs pointer-events-none">
					{isReasoningEnabled ? `${currentEffortCapitalized}` : 'Thinking disabled'}
				</span>
			</div>
		)
	}

	return null
}

const nameOfChatMode = {
	normal: 'Chat',
	gather: 'Gather',
	agent: 'Agent',
}

const detailOfChatMode = {
	normal: 'Normal chat',
	gather: "Reads files, but can't edit",
	agent: 'Edits files and uses tools',
}

const ChatModeDropdown = ({ className }: { className: string }) => {
	const accessor = useAccessor()

	const voidSettingsService = accessor.get('IVoidSettingsService')
	const settingsState = useSettingsState()

	const options: ChatMode[] = useMemo(() => ['normal', 'agent'], [])

	const onChangeOption = useCallback(
		(newVal: ChatMode) => {
			voidSettingsService.setGlobalSetting('chatMode', newVal)
		},
		[voidSettingsService],
	)

	return (
		<VoidCustomDropdownBox
			className={className}
			options={options}
			selectedOption={settingsState.globalSettings.chatMode}
			onChangeOption={onChangeOption}
			getOptionDisplayName={(val) => nameOfChatMode[val]}
			getOptionDropdownName={(val) => nameOfChatMode[val]}
			getOptionDropdownDetail={(val) => detailOfChatMode[val]}
			getOptionsEqual={(a, b) => a === b}
		/>
	)
}

interface VoidChatAreaProps {
	// Required
	children: React.ReactNode // This will be the input component

	// Form controls
	onSubmit: () => void
	onAbort: () => void
	isStreaming: boolean
	isDisabled?: boolean
	divRef?: React.RefObject<HTMLDivElement | null>

	// UI customization
	className?: string
	showModelDropdown?: boolean
	showSelections?: boolean
	showProspectiveSelections?: boolean
	loadingIcon?: React.ReactNode

	selections?: StagingSelectionItem[]
	setSelections?: (s: StagingSelectionItem[]) => void
	// selections?: any[];
	// onSelectionsChange?: (selections: any[]) => void;

	onClickAnywhere?: () => void
	// Optional close button
	onClose?: () => void

	featureName: FeatureName
}

export const VoidChatArea: React.FC<VoidChatAreaProps> = ({
	children,
	onSubmit,
	onAbort,
	onClose,
	onClickAnywhere,
	divRef,
	isStreaming = false,
	isDisabled = false,
	className = '',
	showModelDropdown = true,
	showSelections = false,
	showProspectiveSelections = false,
	selections,
	setSelections,
	featureName,
	loadingIcon,
}) => {
	const accessor = useAccessor()

	const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		// Allow drop
		e.preventDefault()
	}

	const addFileUriSelection = async (uri: URI) => {
		const chatThreadService = accessor.get('IChatThreadService')
		const languageService = accessor.get('ILanguageService')
		try {
			chatThreadService.addNewStagingSelection({
				type: 'File',
				uri,
				language: languageService.guessLanguageIdByFilepathOrFirstLine(uri) || '',
				state: { wasAddedAsCurrentFile: false },
			})
		} catch {}
	}

	const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()

		const dt = e.dataTransfer
		if (!dt) return

		// 1) Try URI list (Explorer/internal drags often use this)
		const uriList = dt.getData('text/uri-list')
		if (uriList && uriList.trim()) {
			const lines = uriList.split(/\r?\n/).filter((l) => !!l && !l.startsWith('#'))
			for (const l of lines) {
				try {
					addFileUriSelection(URI.parse(l))
				} catch {}
			}
		}

		// 2) Fallback: Files from OS drag (Electron provides file.path)
		if (dt.files && dt.files.length) {
			for (let i = 0; i < dt.files.length; i++) {
				const f = dt.files[i] as any
				const p: string | undefined = f?.path // Electron specific
				if (p) {
					try {
						addFileUriSelection(URI.file(p))
					} catch {}
				}
			}
		}

		// 3) Lastly, check for string items carrying uri-list
		if (dt.items && dt.items.length) {
			for (let i = 0; i < dt.items.length; i++) {
				const it = dt.items[i]
				if (it.kind === 'string' && it.type === 'text/uri-list') {
					it.getAsString((text) => {
						const lines = (text || '').split(/\r?\n/).filter((l) => !!l && !l.startsWith('#'))
						for (const l of lines) {
							try {
								addFileUriSelection(URI.parse(l))
							} catch {}
						}
					})
				}
			}
		}
	}

	return (
		<div
			ref={divRef}
			className={`
				gap-x-1
                flex flex-col p-2 relative input text-left shrink-0
                rounded-md
                bg-void-bg-1
				transition-all duration-200
				border border-void-border-3 focus-within:border-void-border-1 hover:border-void-border-1
				max-h-[80vh] overflow-y-auto
                ${className}
            `}
			onDragOver={handleDragOver}
			onDrop={handleDrop}
			onClick={(e) => {
				onClickAnywhere?.()
			}}
		>
			{/* Selections section */}
			{showSelections && selections && setSelections && (
				<SelectedFiles
					type="staging"
					selections={selections}
					setSelections={setSelections}
					showProspectiveSelections={showProspectiveSelections}
				/>
			)}

			{/* Input section */}
			<div className="relative w-full">
				{children}

				{/* Close button (X) if onClose is provided */}
				{onClose && (
					<div className="absolute -top-1 -right-1 cursor-pointer z-1">
						<IconX
							size={12}
							className="stroke-[2] opacity-80 text-void-fg-3 hover:brightness-95"
							onClick={onClose}
						/>
					</div>
				)}
			</div>

			{/* Bottom row */}
			<div className="flex flex-row justify-between items-end gap-1">
				{showModelDropdown && (
					<div className="flex flex-col gap-y-1">
						<ReasoningOptionSlider featureName={featureName} />

						<div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-nowrap ">
							{featureName === 'Chat' && (
								<ChatModeDropdown className="text-xs text-void-fg-3 bg-void-bg-1 border border-void-border-2 rounded py-0.5 px-1" />
							)}
							<ModelDropdown
								featureName={featureName}
								className="text-xs text-void-fg-3 bg-void-bg-1 rounded"
							/>
						</div>
					</div>
				)}

				<div className="flex items-center gap-2">
					{isStreaming && loadingIcon}

					{isStreaming ? (
						<ButtonStop onClick={onAbort} />
					) : (
						<ButtonSubmit onClick={onSubmit} disabled={isDisabled} />
					)}
				</div>
			</div>
		</div>
	)
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>
const DEFAULT_BUTTON_SIZE = 22
export const ButtonSubmit = ({
	className,
	disabled,
	...props
}: ButtonProps & Required<Pick<ButtonProps, 'disabled'>>) => {
	return (
		<button
			type="button"
			className={`rounded-full flex-shrink-0 flex-grow-0 flex items-center justify-center
			${disabled ? 'bg-vscode-disabled-fg cursor-default' : 'bg-white cursor-pointer'}
			${className}
		`}
			// data-tooltip-id='void-tooltip'
			// data-tooltip-content={'Send'}
			// data-tooltip-place='left'
			{...props}
		>
			<IconArrowUp size={DEFAULT_BUTTON_SIZE} className="stroke-[2] p-[2px]" />
		</button>
	)
}

export const ButtonStop = ({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => {
	return (
		<button
			className={`rounded-full flex-shrink-0 flex-grow-0 cursor-pointer flex items-center justify-center
			bg-white
			${className}
		`}
			type="button"
			{...props}
		>
			<IconSquare size={DEFAULT_BUTTON_SIZE} className="stroke-[3] p-[7px]" />
		</button>
	)
}

const scrollToBottom = (divRef: { current: HTMLElement | null }) => {
	if (divRef.current) {
		divRef.current.scrollTop = divRef.current.scrollHeight
	}
}

const ScrollToBottomContainer = ({
	children,
	className,
	style,
	scrollContainerRef,
}: {
	children: React.ReactNode
	className?: string
	style?: React.CSSProperties
	scrollContainerRef: React.MutableRefObject<HTMLDivElement | null>
}) => {
	const [isAtBottom, setIsAtBottom] = useState(true) // Start at bottom

	const divRef = scrollContainerRef

	const onScroll = () => {
		const div = divRef.current
		if (!div) return

		const isBottom = Math.abs(div.scrollHeight - div.clientHeight - div.scrollTop) < 4

		setIsAtBottom(isBottom)
	}

	// When children change (new messages added)
	useEffect(() => {
		if (isAtBottom) {
			scrollToBottom(divRef)
		}
	}, [children, isAtBottom]) // Dependency on children to detect new messages

	// Initial scroll to bottom
	useEffect(() => {
		scrollToBottom(divRef)
	}, [])

	return (
		<div ref={divRef} onScroll={onScroll} className={className} style={style}>
			{children}
		</div>
	)
}

export const getRelative = (uri: URI, accessor: ReturnType<typeof useAccessor>) => {
	const workspaceContextService = accessor.get('IWorkspaceContextService')
	let path: string
	const isInside = workspaceContextService.isInsideWorkspace(uri)
	if (isInside) {
		const f = workspaceContextService
			.getWorkspace()
			.folders.find((f) => uri.fsPath?.startsWith(f.uri.fsPath))
		if (f) {
			path = uri.fsPath.replace(f.uri.fsPath, '')
		} else {
			path = uri.fsPath
		}
	} else {
		path = uri.fsPath
	}
	return path || undefined
}

export const getFolderName = (pathStr: string) => {
	// 'unixify' path
	pathStr = pathStr.replace(/[/\\]+/g, '/') // replace any / or \ or \\ with /
	const parts = pathStr.split('/') // split on /
	// Filter out empty parts (the last element will be empty if path ends with /)
	const nonEmptyParts = parts.filter((part) => part.length > 0)
	if (nonEmptyParts.length === 0) return '/' // Root directory
	if (nonEmptyParts.length === 1) return nonEmptyParts[0] + '/' // Only one folder
	// Get the last two parts
	const lastTwo = nonEmptyParts.slice(-2)
	return lastTwo.join('/') + '/'
}

export const getBasename = (pathStr: string, parts: number = 1) => {
	// 'unixify' path
	pathStr = pathStr.replace(/[/\\]+/g, '/') // replace any / or \ or \\ with /
	const allParts = pathStr.split('/') // split on /
	if (allParts.length === 0) return pathStr
	return allParts.slice(-parts).join('/')
}

// Open file utility function
export const voidOpenFileFn = (
	uri: URI,
	accessor: ReturnType<typeof useAccessor>,
	range?: [number, number],
) => {
	const commandService = accessor.get('ICommandService')
	const editorService = accessor.get('ICodeEditorService')

	// Get editor selection from CodeSelection range
	let editorSelection = undefined

	// If we have a selection, create an editor selection from the range
	if (range) {
		editorSelection = {
			startLineNumber: range[0],
			startColumn: 1,
			endLineNumber: range[1],
			endColumn: Number.MAX_SAFE_INTEGER,
		}
	}

	// open the file
	commandService.executeCommand('vscode.open', uri).then(() => {
		// select the text
		setTimeout(() => {
			if (!editorSelection) return

			const editor = editorService.getActiveCodeEditor()
			if (!editor) return

			editor.setSelection(editorSelection)
			editor.revealRange(editorSelection, ScrollType.Immediate)
		}, 50) // needed when document was just opened and needs to initialize
	})
}

export const SelectedFiles = ({
	type,
	selections,
	setSelections,
	showProspectiveSelections,
	messageIdx,
}:
	| {
			type: 'past'
			selections: StagingSelectionItem[]
			setSelections?: undefined
			showProspectiveSelections?: undefined
			messageIdx: number
	  }
	| {
			type: 'staging'
			selections: StagingSelectionItem[]
			setSelections: (newSelections: StagingSelectionItem[]) => void
			showProspectiveSelections?: boolean
			messageIdx?: number
	  }) => {
	const accessor = useAccessor()
	const commandService = accessor.get('ICommandService')
	const modelReferenceService = accessor.get('IVoidModelService')

	// state for tracking prospective files
	const { uri: currentURI } = useActiveURI()
	const [recentUris, setRecentUris] = useState<URI[]>([])
	const maxRecentUris = 10
	const maxProspectiveFiles = 3
	useEffect(() => {
		// handle recent files
		if (!currentURI) return
		setRecentUris((prev) => {
			const withoutCurrent = prev.filter((uri) => uri.fsPath !== currentURI.fsPath) // remove duplicates
			const withCurrent = [currentURI, ...withoutCurrent]
			return withCurrent.slice(0, maxRecentUris)
		})
	}, [currentURI])
	const [prospectiveSelections, setProspectiveSelections] = useState<StagingSelectionItem[]>([])

	// handle prospective files
	useEffect(() => {
		const computeRecents = async () => {
			const prospectiveURIs = recentUris
				.filter((uri) => !selections.find((s) => s.type === 'File' && s.uri.fsPath === uri.fsPath))
				.slice(0, maxProspectiveFiles)

			const answer: StagingSelectionItem[] = []
			for (const uri of prospectiveURIs) {
				answer.push({
					type: 'File',
					uri: uri,
					language:
						(await modelReferenceService.getModelSafe(uri)).model?.getLanguageId() || 'plaintext',
					state: { wasAddedAsCurrentFile: false },
				})
			}
			return answer
		}

		// add a prospective file if type === 'staging' and if the user is in a file, and if the file is not selected yet
		if (type === 'staging' && showProspectiveSelections) {
			computeRecents().then((a) => setProspectiveSelections(a))
		} else {
			setProspectiveSelections([])
		}
	}, [recentUris, selections, type, showProspectiveSelections])

	const allSelections = [...selections, ...prospectiveSelections]

	if (allSelections.length === 0) {
		return null
	}

	return (
		<div className="flex items-center flex-wrap text-left relative gap-x-0.5 gap-y-1 pb-0.5">
			{allSelections.map((selection, i) => {
				const isThisSelectionProspective = i > selections.length - 1

				const thisKey =
					selection.type === 'CodeSelection'
						? selection.type +
							selection.language +
							selection.range +
							selection.state.wasAddedAsCurrentFile +
							selection.uri.fsPath
						: selection.type === 'File'
							? selection.type +
								selection.language +
								selection.state.wasAddedAsCurrentFile +
								selection.uri.fsPath
							: selection.type === 'Folder'
								? selection.type + selection.language + selection.state + selection.uri.fsPath
								: i

				const SelectionIcon =
					selection.type === 'File'
						? File
						: selection.type === 'Folder'
							? Folder
							: selection.type === 'CodeSelection'
								? Text
								: (undefined as never)

				return (
					<div // container for summarybox and code
						key={thisKey}
						className={`flex flex-col space-y-[1px]`}
					>
						{/* tooltip for file path */}
						<span
							className="truncate overflow-hidden text-ellipsis"
							data-tooltip-id="void-tooltip"
							data-tooltip-content={getRelative(selection.uri, accessor)}
							data-tooltip-place="top"
							data-tooltip-delay-show={3000}
						>
							{/* summarybox */}
							<div
								className={`
								flex items-center gap-1 relative
								px-1
								w-fit h-fit
								select-none
								text-xs text-nowrap
								border rounded-sm
								${isThisSelectionProspective ? 'bg-void-bg-1 text-void-fg-3 opacity-80' : 'bg-void-bg-1 hover:brightness-95 text-void-fg-1'}
								${isThisSelectionProspective ? 'border-void-border-2' : 'border-void-border-1'}
								hover:border-void-border-1
								transition-all duration-150
							`}
								onClick={() => {
									if (type !== 'staging') return // (never)
									if (isThisSelectionProspective) {
										// add prospective selection to selections
										setSelections([...selections, selection])
									} else if (selection.type === 'File') {
										// open files
										voidOpenFileFn(selection.uri, accessor)

										const wasAddedAsCurrentFile = selection.state.wasAddedAsCurrentFile
										if (wasAddedAsCurrentFile) {
											// make it so the file is added permanently, not just as the current file
											const newSelection: StagingSelectionItem = {
												...selection,
												state: { ...selection.state, wasAddedAsCurrentFile: false },
											}
											setSelections([
												...selections.slice(0, i),
												newSelection,
												...selections.slice(i + 1),
											])
										}
									} else if (selection.type === 'CodeSelection') {
										voidOpenFileFn(selection.uri, accessor, selection.range)
									} else if (selection.type === 'Folder') {
										// TODO!!! reveal in tree
									}
								}}
							>
								{<SelectionIcon size={10} />}

								{
									// file name and range
									getBasename(selection.uri.fsPath) +
										(selection.type === 'CodeSelection'
											? ` (${selection.range[0]}-${selection.range[1]})`
											: '')
								}

								{selection.type === 'File' &&
								selection.state.wasAddedAsCurrentFile &&
								messageIdx === undefined &&
								currentURI?.fsPath === selection.uri.fsPath ? (
									<span className={`text-[8px] 'void-opacity-60 text-void-fg-4`}>
										{`(Current File)`}
									</span>
								) : null}

								{type === 'staging' && !isThisSelectionProspective ? ( // X button
									<div // box for making it easier to click
										className="cursor-pointer z-1 self-stretch flex items-center justify-center"
										onClick={(e) => {
											e.stopPropagation() // don't open/close selection
											if (type !== 'staging') return
											setSelections([...selections.slice(0, i), ...selections.slice(i + 1)])
										}}
									>
										<IconX className="stroke-[2]" size={10} />
									</div>
								) : (
									<></>
								)}
							</div>
						</span>
					</div>
				)
			})}
		</div>
	)
}

type ToolHeaderParams = {
	icon?: React.ReactNode
	title: React.ReactNode
	desc1: React.ReactNode
	desc1OnClick?: () => void
	desc2?: React.ReactNode
	isError?: boolean
	info?: string
	desc1Info?: string
	isRejected?: boolean
	numResults?: number
	hasNextPage?: boolean
	children?: React.ReactNode
	bottomChildren?: React.ReactNode
	onClick?: () => void
	desc2OnClick?: () => void
	isOpen?: boolean
	className?: string
}

const ToolHeaderWrapper = ({
	icon,
	title,
	desc1,
	desc1OnClick,
	desc1Info,
	desc2,
	numResults,
	hasNextPage,
	children,
	info,
	bottomChildren,
	isError,
	onClick,
	desc2OnClick,
	isOpen,
	isRejected,
	className, // applies to the main content
}: ToolHeaderParams) => {
	const [isOpen_, setIsOpen] = useState(false)
	const isExpanded = isOpen !== undefined ? isOpen : isOpen_

	const isDropdown = children !== undefined // null ALLOWS dropdown
	const isClickable = !!(isDropdown || onClick)

	const isDesc1Clickable = !!desc1OnClick

	const desc1HTML = (
		<span
			className={`text-void-fg-4 text-xs italic truncate ml-2
			${isDesc1Clickable ? 'cursor-pointer hover:brightness-125 transition-all duration-150' : ''}
		`}
			onClick={desc1OnClick}
			{...(desc1Info
				? {
						'data-tooltip-id': 'void-tooltip',
						'data-tooltip-content': desc1Info,
						'data-tooltip-place': 'top',
						'data-tooltip-delay-show': 1000,
					}
				: {})}
		>
			{desc1}
		</span>
	)

	return (
		<div className="">
			<div
				className={`w-full border border-void-border-3 rounded px-2 py-1 bg-void-bg-3 overflow-hidden ${className}`}
			>
				{/* header */}
				<div className={`select-none flex items-center min-h-[24px]`}>
					<div
						className={`flex items-center w-full gap-x-2 overflow-hidden justify-between ${isRejected ? 'line-through' : ''}`}
					>
						{/* left */}
						<div // container for if desc1 is clickable
							className="ml-1 flex items-center overflow-hidden"
						>
							{/* title eg "> Edited File" */}
							<div
								className={`
							flex items-center min-w-0 overflow-hidden grow
							${isClickable ? 'cursor-pointer hover:brightness-125 transition-all duration-150' : ''}
						`}
								onClick={() => {
									if (isDropdown) {
										setIsOpen((v) => !v)
									}
									if (onClick) {
										onClick()
									}
								}}
							>
								{isDropdown && (
									<ChevronRight
										className={`
								text-void-fg-3 mr-0.5 h-4 w-4 flex-shrink-0 transition-transform duration-100 ease-[cubic-bezier(0.4,0,0.2,1)]
								${isExpanded ? 'rotate-90' : ''}
							`}
									/>
								)}
								<span className="text-void-fg-3 flex-shrink-0">{title}</span>

								{!isDesc1Clickable && desc1HTML}
							</div>
							{isDesc1Clickable && desc1HTML}
						</div>

						{/* right */}
						<div className="flex items-center gap-x-2 flex-shrink-0">
							{info && (
								<CircleEllipsis
									className="ml-2 text-void-fg-4 opacity-60 flex-shrink-0"
									size={14}
									data-tooltip-id="void-tooltip"
									data-tooltip-content={info}
									data-tooltip-place="top-end"
								/>
							)}

							{isError && (
								<AlertTriangle
									className="text-void-warning opacity-90 flex-shrink-0"
									size={14}
									data-tooltip-id="void-tooltip"
									data-tooltip-content={'Error running tool'}
									data-tooltip-place="top"
								/>
							)}
							{isRejected && (
								<Ban
									className="text-void-fg-4 opacity-90 flex-shrink-0"
									size={14}
									data-tooltip-id="void-tooltip"
									data-tooltip-content={'Canceled'}
									data-tooltip-place="top"
								/>
							)}
							{desc2 && (
								<span className="text-void-fg-4 text-xs" onClick={desc2OnClick}>
									{desc2}
								</span>
							)}
							{numResults !== undefined && (
								<span className="text-void-fg-4 text-xs ml-auto mr-1">
									{`${numResults}${hasNextPage ? '+' : ''} result${numResults !== 1 ? 's' : ''}`}
								</span>
							)}
						</div>
					</div>
				</div>
				{/* children */}
				{
					<div
						className={`overflow-hidden transition-all duration-200 ease-in-out ${isExpanded ? 'opacity-100 py-1' : 'max-h-0 opacity-0'}
					text-void-fg-4 rounded-sm overflow-x-auto
				  `}
						//    bg-black bg-opacity-10 border border-void-border-4 border-opacity-50
					>
						{children}
					</div>
				}
			</div>
			{bottomChildren}
		</div>
	)
}

const EditTool = ({
	toolMessage,
	threadId,
	messageIdx,
	content,
}: Parameters<ResultWrapper<'edit_file' | 'rewrite_file'>>[0] & { content: string }) => {
	const accessor = useAccessor()
	const isError = false
	const isRejected = toolMessage.type === 'rejected'

	const title = getTitle(toolMessage)

	const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor)
	const icon = null

	const { rawParams, params, name } = toolMessage
	const desc1OnClick = () => voidOpenFileFn(params.uri, accessor)
	const componentParams: ToolHeaderParams = {
		title,
		desc1,
		desc1OnClick,
		desc1Info,
		isError,
		icon,
		isRejected,
	}

	const editToolType = toolMessage.name === 'edit_file' ? 'diff' : 'rewrite'
	if (toolMessage.type === 'running_now' || toolMessage.type === 'tool_request') {
		componentParams.children = (
			<ToolChildrenWrapper className="bg-void-bg-3">
				<EditToolChildren uri={params.uri} code={content} type={editToolType} />
			</ToolChildrenWrapper>
		)
		// JumpToFileButton removed in favor of FileLinkText
	} else if (
		toolMessage.type === 'success' ||
		toolMessage.type === 'rejected' ||
		toolMessage.type === 'tool_error'
	) {
		// add apply box
		const applyBoxId = getApplyBoxId({
			threadId: threadId,
			messageIdx: messageIdx,
			tokenIdx: 'N/A',
		})
		componentParams.desc2 = (
			<EditToolHeaderButtons
				applyBoxId={applyBoxId}
				uri={params.uri}
				codeStr={content}
				toolName={name}
				threadId={threadId}
			/>
		)

		// add children
		componentParams.children = (
			<ToolChildrenWrapper className="bg-void-bg-3">
				<EditToolChildren uri={params.uri} code={content} type={editToolType} />
			</ToolChildrenWrapper>
		)

		if (toolMessage.type === 'success' || toolMessage.type === 'rejected') {
			const { result } = toolMessage
			componentParams.bottomChildren = (
				<BottomChildren title="Lint errors">
					{result?.lintErrors?.map((error, i) => (
						<div key={i} className="whitespace-nowrap">
							Lines {error.startLineNumber}-{error.endLineNumber}: {error.message}
						</div>
					))}
				</BottomChildren>
			)
		} else if (toolMessage.type === 'tool_error') {
			// error
			const { result } = toolMessage
			componentParams.bottomChildren = (
				<BottomChildren title="Error">
					<CodeChildren>{result}</CodeChildren>
				</BottomChildren>
			)
		}
	}

	return <ToolHeaderWrapper {...componentParams} />
}

const SimplifiedToolHeader = ({
	title,
	children,
}: {
	title: string
	children?: React.ReactNode
}) => {
	const [isOpen, setIsOpen] = useState(false)
	const isDropdown = children !== undefined
	return (
		<div>
			<div className="w-full">
				{/* header */}
				<div
					className={`select-none flex items-center min-h-[24px] ${isDropdown ? 'cursor-pointer' : ''}`}
					onClick={() => {
						if (isDropdown) {
							setIsOpen((v) => !v)
						}
					}}
				>
					{isDropdown && (
						<ChevronRight
							className={`text-void-fg-3 mr-0.5 h-4 w-4 flex-shrink-0 transition-transform duration-100 ease-[cubic-bezier(0.4,0,0.2,1)] ${isOpen ? 'rotate-90' : ''}`}
						/>
					)}
					<div className="flex items-center w-full overflow-hidden">
						<span className="text-void-fg-3">{title}</span>
					</div>
				</div>
				{/* children */}
				{
					<div
						className={`overflow-hidden transition-all duration-200 ease-in-out ${isOpen ? 'opacity-100' : 'max-h-0 opacity-0'} text-void-fg-4`}
					>
						{children}
					</div>
				}
			</div>
		</div>
	)
}

const UserMessageComponent = ({
	chatMessage,
	messageIdx,
	isCheckpointGhost,
	currCheckpointIdx,
	_scrollToBottom,
}: {
	chatMessage: ChatMessage & { role: 'user' }
	messageIdx: number
	currCheckpointIdx: number | undefined
	isCheckpointGhost: boolean
	_scrollToBottom: (() => void) | null
}) => {
	const accessor = useAccessor()
	const chatThreadsService = accessor.get('IChatThreadService')

	// global state
	let isBeingEdited = false
	let stagingSelections: StagingSelectionItem[] = []
	let setIsBeingEdited = (_: boolean) => {}
	let setStagingSelections = (_: StagingSelectionItem[]) => {}

	if (messageIdx !== undefined) {
		const _state = chatThreadsService.getCurrentMessageState(messageIdx)
		isBeingEdited = _state.isBeingEdited
		stagingSelections = _state.stagingSelections
		setIsBeingEdited = (v) =>
			chatThreadsService.setCurrentMessageState(messageIdx, { isBeingEdited: v })
		setStagingSelections = (s) =>
			chatThreadsService.setCurrentMessageState(messageIdx, { stagingSelections: s })
	}

	// local state
	const mode: ChatBubbleMode = isBeingEdited ? 'edit' : 'display'
	const [isFocused, setIsFocused] = useState(false)
	const [isHovered, setIsHovered] = useState(false)
	const [isDisabled, setIsDisabled] = useState(false)
	const [textAreaRefState, setTextAreaRef] = useState<HTMLTextAreaElement | null>(null)
	const textAreaFnsRef = useRef<TextAreaFns | null>(null)
	// initialize on first render, and when edit was just enabled
	const _mustInitialize = useRef(true)
	const _justEnabledEdit = useRef(false)
	useEffect(() => {
		const canInitialize = mode === 'edit' && textAreaRefState
		const shouldInitialize = _justEnabledEdit.current || _mustInitialize.current
		if (canInitialize && shouldInitialize) {
			setStagingSelections(
				(chatMessage.selections || []).map((s) => {
					// quick hack so we dont have to do anything more
					if (s.type === 'File')
						return { ...s, state: { ...s.state, wasAddedAsCurrentFile: false } }
					else return s
				}),
			)

			if (textAreaFnsRef.current) textAreaFnsRef.current.setValue(chatMessage.displayContent || '')

			textAreaRefState.focus()

			_justEnabledEdit.current = false
			_mustInitialize.current = false
		}
	}, [
		chatMessage,
		mode,
		_justEnabledEdit,
		textAreaRefState,
		textAreaFnsRef.current,
		_justEnabledEdit.current,
		_mustInitialize.current,
	])

	const onOpenEdit = () => {
		setIsBeingEdited(true)
		chatThreadsService.setCurrentlyFocusedMessageIdx(messageIdx)
		_justEnabledEdit.current = true
	}
	const onCloseEdit = () => {
		setIsFocused(false)
		setIsHovered(false)
		setIsBeingEdited(false)
		chatThreadsService.setCurrentlyFocusedMessageIdx(undefined)
	}

	const EditSymbol = mode === 'display' ? Pencil : X

	let chatbubbleContents: React.ReactNode
	if (mode === 'display') {
		chatbubbleContents = (
			<>
				<SelectedFiles
					type="past"
					messageIdx={messageIdx}
					selections={chatMessage.selections || []}
				/>
				<span className="px-0.5">{chatMessage.displayContent}</span>
			</>
		)
	} else if (mode === 'edit') {
		const onSubmit = async () => {
			if (isDisabled) return
			if (!textAreaRefState) return
			if (messageIdx === undefined) return

			// cancel any streams on this thread
			const threadId = chatThreadsService.state.currentThreadId

			await chatThreadsService.abortRunning(threadId)

			// update state
			setIsBeingEdited(false)
			chatThreadsService.setCurrentlyFocusedMessageIdx(undefined)

			// stream the edit
			const userMessage = textAreaRefState.value
			try {
				await chatThreadsService.editUserMessageAndStreamResponse({
					userMessage,
					messageIdx,
					threadId,
				})
			} catch (e) {
				console.error('Error while editing message:', e)
			}
			await chatThreadsService.focusCurrentChat()
			requestAnimationFrame(() => _scrollToBottom?.())
		}

		const onAbort = async () => {
			const threadId = chatThreadsService.state.currentThreadId
			await chatThreadsService.abortRunning(threadId)
		}

		const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === 'Escape') {
				onCloseEdit()
			}
			if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
				onSubmit()
			}
		}

		if (!chatMessage.content) {
			// don't show if empty and not loading (if loading, want to show).
			return null
		}

		chatbubbleContents = (
			<VoidChatArea
				featureName="Chat"
				onSubmit={onSubmit}
				onAbort={onAbort}
				isStreaming={false}
				isDisabled={isDisabled}
				showSelections={true}
				showProspectiveSelections={false}
				selections={stagingSelections}
				setSelections={setStagingSelections}
			>
				<VoidInputBox2
					enableAtToMention
					ref={setTextAreaRef}
					className="min-h-[81px] max-h-[500px] px-0.5"
					placeholder="Edit your message..."
					onChangeText={(text) => setIsDisabled(!text)}
					onFocus={() => {
						setIsFocused(true)
						chatThreadsService.setCurrentlyFocusedMessageIdx(messageIdx)
					}}
					onBlur={() => {
						setIsFocused(false)
					}}
					onKeyDown={onKeyDown}
					fnsRef={textAreaFnsRef}
					multiline={true}
				/>
			</VoidChatArea>
		)
	}

	const isMsgAfterCheckpoint =
		currCheckpointIdx !== undefined && currCheckpointIdx === messageIdx - 1

	return (
		<div
			// align chatbubble accoridng to role
			className={`
        relative ml-auto
        ${
					mode === 'edit'
						? 'w-full max-w-full'
						: mode === 'display'
							? `self-end w-fit max-w-full whitespace-pre-wrap`
							: '' // user words should be pre
				}

        ${isCheckpointGhost && !isMsgAfterCheckpoint ? 'opacity-50 pointer-events-none' : ''}
    `}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			<div
				// style chatbubble according to role
				className={`
            text-left rounded-lg max-w-full
            ${
							mode === 'edit'
								? ''
								: mode === 'display'
									? 'p-2 flex flex-col bg-void-bg-1 text-void-fg-1 overflow-x-auto cursor-pointer'
									: ''
						}
        `}
				onClick={() => {
					if (mode === 'display') {
						onOpenEdit()
					}
				}}
			>
				{chatbubbleContents}
			</div>

			<div
				className="absolute -top-1 -right-1 translate-x-0 -translate-y-0 z-1"
				// data-tooltip-id='void-tooltip'
				// data-tooltip-content='Edit message'
				// data-tooltip-place='left'
			>
				<EditSymbol
					size={18}
					className={`
                    cursor-pointer
                    p-[2px]
                    bg-void-bg-1 border border-void-border-1 rounded-md
                    transition-opacity duration-200 ease-in-out
                    ${isHovered || (isFocused && mode === 'edit') ? 'opacity-100' : 'opacity-0'}
                `}
					onClick={() => {
						if (mode === 'display') {
							onOpenEdit()
						} else if (mode === 'edit') {
							onCloseEdit()
						}
					}}
				/>
			</div>
		</div>
	)
}

const SmallProseWrapper = ({ children }: { children: React.ReactNode }) => {
	return (
		<div
			className="
text-void-fg-4
prose
prose-sm
break-words
max-w-none
leading-snug
text-[13px]

[&>:first-child]:!mt-0
[&>:last-child]:!mb-0

prose-h1:text-[14px]
prose-h1:my-4

prose-h2:text-[13px]
prose-h2:my-4

prose-h3:text-[13px]
prose-h3:my-3

prose-h4:text-[13px]
prose-h4:my-2

prose-p:my-2
prose-p:leading-snug
prose-hr:my-2

prose-ul:my-2
prose-ul:pl-4
prose-ul:list-outside
prose-ul:list-disc
prose-ul:leading-snug


prose-ol:my-2
prose-ol:pl-4
prose-ol:list-outside
prose-ol:list-decimal
prose-ol:leading-snug

marker:text-inherit

prose-blockquote:pl-2
prose-blockquote:my-2

prose-code:text-void-fg-3
prose-code:text-[12px]
prose-code:before:content-none
prose-code:after:content-none

prose-pre:text-[12px]
prose-pre:p-2
prose-pre:my-2

prose-table:text-[13px]
"
		>
			{children}
		</div>
	)
}

const ProseWrapper = ({ children }: { children: React.ReactNode }) => {
	return (
		<div
			className="
text-void-fg-2
prose
prose-sm
break-words
prose-p:block
prose-hr:my-4
prose-pre:my-2
marker:text-inherit
prose-ol:list-outside
prose-ol:list-decimal
prose-ul:list-outside
prose-ul:list-disc
prose-li:my-0
prose-code:before:content-none
prose-code:after:content-none
prose-headings:prose-sm
prose-headings:font-bold

prose-p:leading-normal
prose-ol:leading-normal
prose-ul:leading-normal

max-w-none
"
		>
			{children}
		</div>
	)
}
const AssistantMessageComponent = ({
	chatMessage,
	isCheckpointGhost,
	isCommitted,
	messageIdx,
}: {
	chatMessage: ChatMessage & { role: 'assistant' }
	isCheckpointGhost: boolean
	messageIdx: number
	isCommitted: boolean
}) => {
	const accessor = useAccessor()
	const chatThreadsService = accessor.get('IChatThreadService')

	const reasoningStr = chatMessage.reasoning?.trim() || null
	const hasReasoning = !!reasoningStr
	const isDoneReasoning = !!chatMessage.displayContent
	const thread = chatThreadsService.getCurrentThread()

	const chatMessageLocation: ChatMessageLocation = {
		threadId: thread.id,
		messageIdx: messageIdx,
	}

	const isEmpty = !chatMessage.displayContent && !chatMessage.reasoning
	if (isEmpty) return null

	return (
		<>
			{/* reasoning token */}
			{hasReasoning && (
				<div className={`${isCheckpointGhost ? 'opacity-50' : ''}`}>
					<ReasoningWrapper isDoneReasoning={isDoneReasoning} isStreaming={!isCommitted}>
						<SmallProseWrapper>
							<ChatMarkdownRender
								string={reasoningStr}
								chatMessageLocation={chatMessageLocation}
								isApplyEnabled={false}
								isLinkDetectionEnabled={true}
							/>
						</SmallProseWrapper>
					</ReasoningWrapper>
				</div>
			)}

			{/* assistant message */}
			{chatMessage.displayContent && (
				<div className={`${isCheckpointGhost ? 'opacity-50' : ''}`}>
					<ProseWrapper>
						<ChatMarkdownRender
							string={chatMessage.displayContent || ''}
							chatMessageLocation={chatMessageLocation}
							isApplyEnabled={true}
							isLinkDetectionEnabled={true}
						/>
					</ProseWrapper>
				</div>
			)}
		</>
	)
}

const ReasoningWrapper = ({
	isDoneReasoning,
	isStreaming,
	children,
}: {
	isDoneReasoning: boolean
	isStreaming: boolean
	children: React.ReactNode
}) => {
	const isDone = isDoneReasoning || !isStreaming
	const isWriting = !isDone
	const [isOpen, setIsOpen] = useState(isWriting)
	useEffect(() => {
		if (!isWriting) setIsOpen(false) // if just finished reasoning, close
	}, [isWriting])
	return (
		<ToolHeaderWrapper
			title="Reasoning"
			desc1={isWriting ? <IconLoading /> : ''}
			isOpen={isOpen}
			onClick={() => setIsOpen((v) => !v)}
		>
			<ToolChildrenWrapper>
				<div className="!select-text cursor-auto">{children}</div>
			</ToolChildrenWrapper>
		</ToolHeaderWrapper>
	)
}

// should either be past or "-ing" tense, not present tense. Eg. when the LLM searches for something, the user expects it to say "I searched for X" or "I am searching for X". Not "I search X".

const loadingTitleWrapper = (item: React.ReactNode): React.ReactNode => {
	return (
		<span className="flex items-center flex-nowrap">
			{item}
			<IconLoading className="w-3 text-sm" />
		</span>
	)
}

const titleOfBuiltinToolName = {
	read_file: {
		done: 'Read file',
		proposed: 'Read file',
		running: loadingTitleWrapper('Reading file'),
	},
	ls_dir: {
		done: 'Inspected folder',
		proposed: 'Inspect folder',
		running: loadingTitleWrapper('Inspecting folder'),
	},
	get_dir_tree: {
		done: 'Inspected folder tree',
		proposed: 'Inspect folder tree',
		running: loadingTitleWrapper('Inspecting folder tree'),
	},
	search_pathnames_only: {
		done: 'Searched by file name',
		proposed: 'Search by file name',
		running: loadingTitleWrapper('Searching by file name'),
	},
	search_for_files: {
		done: 'Searched',
		proposed: 'Search',
		running: loadingTitleWrapper('Searching'),
	},
	create_file_or_folder: {
		done: `Created`,
		proposed: `Create`,
		running: loadingTitleWrapper(`Creating`),
	},
	delete_file_or_folder: {
		done: `Deleted`,
		proposed: `Delete`,
		running: loadingTitleWrapper(`Deleting`),
	},
	edit_file: {
		done: `Edited file`,
		proposed: 'Edit file',
		running: loadingTitleWrapper('Editing file'),
	},
	rewrite_file: {
		done: `Wrote file`,
		proposed: 'Write file',
		running: loadingTitleWrapper('Writing file'),
	},
	run_command: {
		done: `Ran terminal`,
		proposed: 'Run terminal',
		running: loadingTitleWrapper('Running terminal'),
	},
	run_persistent_command: {
		done: `Ran terminal`,
		proposed: 'Run terminal',
		running: loadingTitleWrapper('Running terminal'),
	},

	open_persistent_terminal: {
		done: `Opened terminal`,
		proposed: 'Open terminal',
		running: loadingTitleWrapper('Opening terminal'),
	},
	kill_persistent_terminal: {
		done: `Killed terminal`,
		proposed: 'Kill terminal',
		running: loadingTitleWrapper('Killing terminal'),
	},

	read_lint_errors: {
		done: `Read lint errors`,
		proposed: 'Read lint errors',
		running: loadingTitleWrapper('Reading lint errors'),
	},
	search_in_file: {
		done: 'Searched in file',
		proposed: 'Search in file',
		running: loadingTitleWrapper('Searching in file'),
	},
} as const satisfies Record<BuiltinToolName, { done: any; proposed: any; running: any }>

const getTitle = (
	toolMessage: Pick<ChatMessage & { role: 'tool' }, 'name' | 'type' | 'mcpServerName'>,
): React.ReactNode => {
	const t = toolMessage

	// non-built-in title
	if (!builtinToolNames.includes(t.name as BuiltinToolName)) {
		// descriptor of Running or Ran etc
		const descriptor =
			t.type === 'success'
				? 'Called'
				: t.type === 'running_now'
					? 'Calling'
					: t.type === 'tool_request'
						? 'Call'
						: t.type === 'rejected'
							? 'Call'
							: t.type === 'invalid_params'
								? 'Call'
								: t.type === 'tool_error'
									? 'Call'
									: 'Call'

		const title = `${descriptor} ${toolMessage.mcpServerName || 'MCP'}`
		if (t.type === 'running_now' || t.type === 'tool_request') return loadingTitleWrapper(title)
		return title
	}

	// built-in title
	else {
		const toolName = t.name as BuiltinToolName
		if (t.type === 'success') return titleOfBuiltinToolName[toolName].done
		if (t.type === 'running_now') return titleOfBuiltinToolName[toolName].running
		return titleOfBuiltinToolName[toolName].proposed
	}
}

const toolNameToDesc = (
	toolName: BuiltinToolName,
	_toolParams: BuiltinToolCallParams[BuiltinToolName] | undefined,
	accessor: ReturnType<typeof useAccessor>,
): {
	desc1: React.ReactNode
	desc1Info?: string
} => {
	if (!_toolParams) {
		return { desc1: '' }
	}

	const x = {
		read_file: () => {
			const toolParams = _toolParams as BuiltinToolCallParams['read_file']
			return {
				desc1: getBasename(toolParams.uri.fsPath),
				desc1Info: getRelative(toolParams.uri, accessor),
			}
		},
		ls_dir: () => {
			const toolParams = _toolParams as BuiltinToolCallParams['ls_dir']
			return {
				desc1: getFolderName(toolParams.uri.fsPath),
				desc1Info: getRelative(toolParams.uri, accessor),
			}
		},
		search_pathnames_only: () => {
			const toolParams = _toolParams as BuiltinToolCallParams['search_pathnames_only']
			return {
				desc1: `"${toolParams.query}"`,
			}
		},
		search_for_files: () => {
			const toolParams = _toolParams as BuiltinToolCallParams['search_for_files']
			return {
				desc1: `"${toolParams.query}"`,
			}
		},
		search_in_file: () => {
			const toolParams = _toolParams as BuiltinToolCallParams['search_in_file']
			return {
				desc1: `"${toolParams.query}"`,
				desc1Info: getRelative(toolParams.uri, accessor),
			}
		},
		create_file_or_folder: () => {
			const toolParams = _toolParams as BuiltinToolCallParams['create_file_or_folder']
			return {
				desc1: toolParams.isFolder
					? (getFolderName(toolParams.uri.fsPath) ?? '/')
					: getBasename(toolParams.uri.fsPath),
				desc1Info: getRelative(toolParams.uri, accessor),
			}
		},
		delete_file_or_folder: () => {
			const toolParams = _toolParams as BuiltinToolCallParams['delete_file_or_folder']
			return {
				desc1: toolParams.isFolder
					? (getFolderName(toolParams.uri.fsPath) ?? '/')
					: getBasename(toolParams.uri.fsPath),
				desc1Info: getRelative(toolParams.uri, accessor),
			}
		},
		rewrite_file: () => {
			const toolParams = _toolParams as BuiltinToolCallParams['rewrite_file']
			return {
				desc1: getBasename(toolParams.uri.fsPath),
				desc1Info: getRelative(toolParams.uri, accessor),
			}
		},
		edit_file: () => {
			const toolParams = _toolParams as BuiltinToolCallParams['edit_file']
			return {
				desc1: getBasename(toolParams.uri.fsPath),
				desc1Info: getRelative(toolParams.uri, accessor),
			}
		},
		run_command: () => {
			const toolParams = _toolParams as BuiltinToolCallParams['run_command']
			return {
				desc1: `"${toolParams.command}"`,
			}
		},
		run_persistent_command: () => {
			const toolParams = _toolParams as BuiltinToolCallParams['run_persistent_command']
			return {
				desc1: `"${toolParams.command}"`,
			}
		},
		open_persistent_terminal: () => {
			const toolParams = _toolParams as BuiltinToolCallParams['open_persistent_terminal']
			return { desc1: '' }
		},
		kill_persistent_terminal: () => {
			const toolParams = _toolParams as BuiltinToolCallParams['kill_persistent_terminal']
			return { desc1: toolParams.persistentTerminalId }
		},
		get_dir_tree: () => {
			const toolParams = _toolParams as BuiltinToolCallParams['get_dir_tree']
			return {
				desc1: getFolderName(toolParams.uri.fsPath) ?? '/',
				desc1Info: getRelative(toolParams.uri, accessor),
			}
		},
		read_lint_errors: () => {
			const toolParams = _toolParams as BuiltinToolCallParams['read_lint_errors']
			return {
				desc1: getBasename(toolParams.uri.fsPath),
				desc1Info: getRelative(toolParams.uri, accessor),
			}
		},
	}

	try {
		return x[toolName]?.() || { desc1: '' }
	} catch {
		return { desc1: '' }
	}
}

const ToolRequestAcceptRejectButtons = ({ toolName }: { toolName: ToolName }) => {
	const accessor = useAccessor()
	const chatThreadsService = accessor.get('IChatThreadService')
	const metricsService = accessor.get('IMetricsService')
	const voidSettingsService = accessor.get('IVoidSettingsService')
	const voidSettingsState = useSettingsState()

	const onAccept = useCallback(() => {
		try {
			// this doesn't need to be wrapped in try/catch anymore
			const threadId = chatThreadsService.state.currentThreadId
			chatThreadsService.approveLatestToolRequest(threadId)
			metricsService.capture('Tool Request Accepted', {})
		} catch (e) {
			console.error('Error while approving message in chat:', e)
		}
	}, [chatThreadsService, metricsService])

	const onReject = useCallback(() => {
		try {
			const threadId = chatThreadsService.state.currentThreadId
			chatThreadsService.rejectLatestToolRequest(threadId)
		} catch (e) {
			console.error('Error while approving message in chat:', e)
		}
		metricsService.capture('Tool Request Rejected', {})
	}, [chatThreadsService, metricsService])

	const approveButton = (
		<button
			onClick={onAccept}
			className={`
                px-2 py-1
                bg-[var(--vscode-button-background)]
                text-[var(--vscode-button-foreground)]
                hover:bg-[var(--vscode-button-hoverBackground)]
                rounded
                text-sm font-medium
            `}
		>
			Approve
		</button>
	)

	const cancelButton = (
		<button
			onClick={onReject}
			className={`
                px-2 py-1
                bg-[var(--vscode-button-secondaryBackground)]
                text-[var(--vscode-button-secondaryForeground)]
                hover:bg-[var(--vscode-button-secondaryHoverBackground)]
                rounded
                text-sm font-medium
            `}
		>
			Cancel
		</button>
	)

	const approvalType = isABuiltinToolName(toolName)
		? approvalTypeOfBuiltinToolName[toolName]
		: 'MCP tools'
	const approvalToggle = approvalType ? (
		<div key={approvalType} className="flex items-center ml-2 gap-x-1">
			<ToolApprovalTypeSwitch
				size="xs"
				approvalType={approvalType}
				desc={`Auto-approve ${approvalType}`}
			/>
		</div>
	) : null

	return (
		<div className="flex gap-2 mx-0.5 items-center">
			{approveButton}
			{cancelButton}
			{approvalToggle}
		</div>
	)
}

export const ToolChildrenWrapper = ({
	children,
	className,
}: {
	children: React.ReactNode
	className?: string
}) => {
	return (
		<div className={`${className ? className : ''} cursor-default select-none`}>
			<div className="px-2 min-w-full overflow-hidden">{children}</div>
		</div>
	)
}
export const CodeChildren = ({
	children,
	className,
}: {
	children: React.ReactNode
	className?: string
}) => {
	return (
		<div className={`${className ?? ''} p-1 rounded-sm overflow-auto text-sm`}>
			<div className="!select-text cursor-auto">{children}</div>
		</div>
	)
}

export const ListableToolItem = ({
	name,
	onClick,
	isSmall,
	className,
	showDot,
}: {
	name: React.ReactNode
	onClick?: () => void
	isSmall?: boolean
	className?: string
	showDot?: boolean
}) => {
	return (
		<div
			className={`
			${onClick ? 'hover:brightness-125 hover:cursor-pointer transition-all duration-200 ' : ''}
			flex items-center flex-nowrap whitespace-nowrap
			${className ? className : ''}
			`}
			onClick={onClick}
		>
			{showDot === false ? null : (
				<div className="flex-shrink-0">
					<svg className="w-1 h-1 opacity-60 mr-1.5 fill-current" viewBox="0 0 100 40">
						<rect x="0" y="15" width="100" height="10" />
					</svg>
				</div>
			)}
			<div className={`${isSmall ? 'italic text-void-fg-4 flex items-center' : ''}`}>{name}</div>
		</div>
	)
}

const EditToolChildren = ({
	uri,
	code,
	type,
}: {
	uri: URI | undefined
	code: string
	type: 'diff' | 'rewrite'
}) => {
	const content =
		type === 'diff' ? (
			<VoidDiffEditor uri={uri} searchReplaceBlocks={code} />
		) : (
			<ChatMarkdownRender
				string={`\`\`\`\n${code}\n\`\`\``}
				codeURI={uri}
				chatMessageLocation={undefined}
			/>
		)

	return (
		<div className="!select-text cursor-auto">
			<SmallProseWrapper>{content}</SmallProseWrapper>
		</div>
	)
}

const LintErrorChildren = ({ lintErrors }: { lintErrors: LintErrorItem[] }) => {
	return (
		<div className="text-xs text-void-fg-4 opacity-80 border-l-2 border-void-warning px-2 py-0.5 flex flex-col gap-0.5 overflow-x-auto whitespace-nowrap">
			{lintErrors.map((error, i) => (
				<div key={i}>
					Lines {error.startLineNumber}-{error.endLineNumber}: {error.message}
				</div>
			))}
		</div>
	)
}

const BottomChildren = ({ children, title }: { children: React.ReactNode; title: string }) => {
	const [isOpen, setIsOpen] = useState(false)
	if (!children) return null
	return (
		<div className="w-full px-2 mt-0.5">
			<div
				className={`flex items-center cursor-pointer select-none transition-colors duration-150 pl-0 py-0.5 rounded group`}
				onClick={() => setIsOpen((o) => !o)}
				style={{ background: 'none' }}
			>
				<ChevronRight
					className={`mr-1 h-3 w-3 flex-shrink-0 transition-transform duration-100 text-void-fg-4 group-hover:text-void-fg-3 ${isOpen ? 'rotate-90' : ''}`}
				/>
				<span className="font-medium text-void-fg-4 group-hover:text-void-fg-3 text-xs">
					{title}
				</span>
			</div>
			<div
				className={`overflow-hidden transition-all duration-200 ease-in-out ${isOpen ? 'opacity-100' : 'max-h-0 opacity-0'} text-xs pl-4`}
			>
				<div className="overflow-x-auto text-void-fg-4 opacity-90 border-l-2 border-void-warning px-2 py-0.5">
					{children}
				</div>
			</div>
		</div>
	)
}

const EditToolHeaderButtons = ({
	applyBoxId,
	uri,
	codeStr,
	toolName,
	threadId,
}: {
	threadId: string
	applyBoxId: string
	uri: URI
	codeStr: string
	toolName: 'edit_file' | 'rewrite_file'
}) => {
	const { streamState } = useEditToolStreamState({ applyBoxId, uri })
	return (
		<div className="flex items-center gap-1">
			{/* <StatusIndicatorForApplyButton applyBoxId={applyBoxId} uri={uri} /> */}
			{/* <JumpToFileButton uri={uri} /> */}
			{streamState === 'idle-no-changes' && <CopyButton codeStr={codeStr} toolTipName="Copy" />}
			<EditToolAcceptRejectButtonsHTML
				type={toolName}
				codeStr={codeStr}
				applyBoxId={applyBoxId}
				uri={uri}
				threadId={threadId}
			/>
		</div>
	)
}

const InvalidTool = ({
	toolName,
	message,
	mcpServerName,
}: {
	toolName: ToolName
	message: string
	mcpServerName: string | undefined
}) => {
	const accessor = useAccessor()
	const title = getTitle({ name: toolName, type: 'invalid_params', mcpServerName })
	const desc1 = 'Invalid parameters'
	const icon = null
	const isError = true
	const componentParams: ToolHeaderParams = { title, desc1, isError, icon }

	componentParams.children = (
		<ToolChildrenWrapper>
			<CodeChildren className="bg-void-bg-3">{message}</CodeChildren>
		</ToolChildrenWrapper>
	)
	return <ToolHeaderWrapper {...componentParams} />
}

const CanceledTool = ({
	toolName,
	mcpServerName,
}: {
	toolName: ToolName
	mcpServerName: string | undefined
}) => {
	const accessor = useAccessor()
	const title = getTitle({ name: toolName, type: 'rejected', mcpServerName })
	const desc1 = ''
	const icon = null
	const isRejected = true
	const componentParams: ToolHeaderParams = { title, desc1, icon, isRejected }
	return <ToolHeaderWrapper {...componentParams} />
}

const CommandTool = ({
	toolMessage,
	type,
	threadId,
}: { threadId: string } & (
	| {
			toolMessage: Exclude<ToolMessage<'run_command'>, { type: 'invalid_params' }>
			type: 'run_command'
	  }
	| {
			toolMessage: Exclude<ToolMessage<'run_persistent_command'>, { type: 'invalid_params' }>
			type: 'run_persistent_command'
	  }
)) => {
	const accessor = useAccessor()

	const commandService = accessor.get('ICommandService')
	const terminalToolsService = accessor.get('ITerminalToolService')
	const toolsService = accessor.get('IToolsService')
	const isError = false
	const title = getTitle(toolMessage)
	const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor)
	const icon = null
	const streamState = useChatThreadsStreamState(threadId)

	const divRef = useRef<HTMLDivElement | null>(null)

	const isRejected = toolMessage.type === 'rejected'
	const { rawParams, params } = toolMessage
	const componentParams: ToolHeaderParams = { title, desc1, desc1Info, isError, icon, isRejected }

	const effect = async () => {
		if (streamState?.isRunning !== 'tool') return
		if (type !== 'run_command' || toolMessage.type !== 'running_now') return

		// wait for the interruptor so we know it's running

		await streamState?.interrupt
		const container = divRef.current
		if (!container) return

		const terminal = terminalToolsService.getTemporaryTerminal(toolMessage.params.terminalId)
		if (!terminal) return

		try {
			terminal.attachToElement(container)
			terminal.setVisible(true)
		} catch {}

		// Listen for size changes of the container and keep the terminal layout in sync.
		const resizeObserver = new ResizeObserver((entries) => {
			const height = entries[0].borderBoxSize[0].blockSize
			const width = entries[0].borderBoxSize[0].inlineSize
			if (typeof terminal.layout === 'function') {
				terminal.layout({ width, height })
			}
		})

		resizeObserver.observe(container)
		return () => {
			terminal.detachFromElement()
			resizeObserver?.disconnect()
		}
	}

	useEffect(() => {
		effect()
	}, [terminalToolsService, toolMessage, toolMessage.type, type])

	if (toolMessage.type === 'success') {
		const { result } = toolMessage

		// it's unclear that this is a button and not an icon.
		// componentParams.desc2 = <JumpToTerminalButton
		// 	onClick={() => { terminalToolsService.openTerminal(terminalId) }}
		// />

		let msg: string
		if (type === 'run_command')
			msg = toolsService.stringOfResult['run_command'](toolMessage.params, result)
		else msg = toolsService.stringOfResult['run_persistent_command'](toolMessage.params, result)

		if (type === 'run_persistent_command') {
			componentParams.info = persistentTerminalNameOfId(toolMessage.params.persistentTerminalId)
		}

		componentParams.children = (
			<ToolChildrenWrapper className="whitespace-pre text-nowrap overflow-auto text-sm">
				<div className="!select-text cursor-auto">
					<BlockCode initValue={`${msg.trim()}`} language="shellscript" />
				</div>
			</ToolChildrenWrapper>
		)
	} else if (toolMessage.type === 'tool_error') {
		const { result } = toolMessage
		componentParams.bottomChildren = (
			<BottomChildren title="Error">
				<CodeChildren>{result}</CodeChildren>
			</BottomChildren>
		)
	} else if (toolMessage.type === 'running_now') {
		if (type === 'run_command')
			componentParams.children = <div ref={divRef} className="relative h-[300px] text-sm" />
	} else if (toolMessage.type === 'rejected' || toolMessage.type === 'tool_request') {
	}

	return (
		<>
			<ToolHeaderWrapper
				{...componentParams}
				isOpen={type === 'run_command' && toolMessage.type === 'running_now' ? true : undefined}
			/>
		</>
	)
}

type WrapperProps<T extends ToolName> = {
	toolMessage: Exclude<ToolMessage<T>, { type: 'invalid_params' }>
	messageIdx: number
	threadId: string
}
const MCPToolWrapper = ({ toolMessage }: WrapperProps<string>) => {
	const accessor = useAccessor()
	const mcpService = accessor.get('IMCPService')

	const title = getTitle(toolMessage)
	const desc1 = removeMCPToolNamePrefix(toolMessage.name)
	const icon = null

	if (toolMessage.type === 'running_now') return null // do not show running

	const isError = false
	const isRejected = toolMessage.type === 'rejected'
	const { rawParams, params } = toolMessage
	const componentParams: ToolHeaderParams = { title, desc1, isError, icon, isRejected }

	const paramsStr = JSON.stringify(params, null, 2)
	componentParams.desc2 = (
		<CopyButton codeStr={paramsStr} toolTipName={`Copy inputs: ${paramsStr}`} />
	)

	componentParams.info = !toolMessage.mcpServerName ? 'MCP tool not found' : undefined

	// Add copy inputs button in desc2

	if (toolMessage.type === 'success' || toolMessage.type === 'tool_request') {
		const { result } = toolMessage
		const resultStr = result ? mcpService.stringifyResult(result) : 'null'
		componentParams.children = (
			<ToolChildrenWrapper>
				<SmallProseWrapper>
					<ChatMarkdownRender
						string={`\`\`\`json\n${resultStr}\n\`\`\``}
						chatMessageLocation={undefined}
						isApplyEnabled={false}
						isLinkDetectionEnabled={true}
					/>
				</SmallProseWrapper>
			</ToolChildrenWrapper>
		)
	} else if (toolMessage.type === 'tool_error') {
		const { result } = toolMessage
		componentParams.bottomChildren = (
			<BottomChildren title="Error">
				<CodeChildren>{result}</CodeChildren>
			</BottomChildren>
		)
	}

	return <ToolHeaderWrapper {...componentParams} />
}

type ResultWrapper<T extends ToolName> = (props: WrapperProps<T>) => React.ReactNode

const builtinToolNameToComponent: { [T in BuiltinToolName]: { resultWrapper: ResultWrapper<T> } } =
	{
		read_file: {
			resultWrapper: ({ toolMessage }) => {
				const accessor = useAccessor()
				const commandService = accessor.get('ICommandService')

				const title = getTitle(toolMessage)

				const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor)
				const icon = null

				if (toolMessage.type === 'tool_request') return null // do not show past requests
				if (toolMessage.type === 'running_now') return null // do not show running

				const isError = false
				const isRejected = toolMessage.type === 'rejected'
				const { rawParams, params } = toolMessage
				const componentParams: ToolHeaderParams = {
					title,
					desc1,
					desc1Info,
					isError,
					icon,
					isRejected,
				}

				let range: [number, number] | undefined = undefined
				if (toolMessage.params.startLine !== null || toolMessage.params.endLine !== null) {
					const start =
						toolMessage.params.startLine === null ? `1` : `${toolMessage.params.startLine}`
					const end = toolMessage.params.endLine === null ? `` : `${toolMessage.params.endLine}`
					const addStr = `(${start}-${end})`
					componentParams.desc1 += ` ${addStr}`
					range = [params.startLine || 1, params.endLine || 1]
				}

				if (toolMessage.type === 'success') {
					const { result } = toolMessage
					componentParams.onClick = () => {
						voidOpenFileFn(params.uri, accessor, range)
					}
					if (result.hasNextPage && params.pageNumber === 1)
						// first page
						componentParams.desc2 = `(truncated after ${Math.round(MAX_FILE_CHARS_PAGE) / 1000}k)`
					else if (params.pageNumber > 1)
						// subsequent pages
						componentParams.desc2 = `(part ${params.pageNumber})`
				} else if (toolMessage.type === 'tool_error') {
					const { result } = toolMessage
					// JumpToFileButton removed in favor of FileLinkText
					componentParams.bottomChildren = (
						<BottomChildren title="Error">
							<CodeChildren>{result}</CodeChildren>
						</BottomChildren>
					)
				}

				return <ToolHeaderWrapper {...componentParams} />
			},
		},
		get_dir_tree: {
			resultWrapper: ({ toolMessage }) => {
				const accessor = useAccessor()
				const commandService = accessor.get('ICommandService')

				const title = getTitle(toolMessage)
				const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor)
				const icon = null

				if (toolMessage.type === 'tool_request') return null // do not show past requests
				if (toolMessage.type === 'running_now') return null // do not show running

				const isError = false
				const isRejected = toolMessage.type === 'rejected'
				const { rawParams, params } = toolMessage
				const componentParams: ToolHeaderParams = {
					title,
					desc1,
					desc1Info,
					isError,
					icon,
					isRejected,
				}

				if (params.uri) {
					const rel = getRelative(params.uri, accessor)
					if (rel) componentParams.info = `Only search in ${rel}`
				}

				if (toolMessage.type === 'success') {
					const { result } = toolMessage
					componentParams.children = (
						<ToolChildrenWrapper>
							<SmallProseWrapper>
								<ChatMarkdownRender
									string={`\`\`\`\n${result.str}\n\`\`\``}
									chatMessageLocation={undefined}
									isApplyEnabled={false}
									isLinkDetectionEnabled={true}
								/>
							</SmallProseWrapper>
						</ToolChildrenWrapper>
					)
				} else if (toolMessage.type === 'tool_error') {
					const { result } = toolMessage
					componentParams.bottomChildren = (
						<BottomChildren title="Error">
							<CodeChildren>{result}</CodeChildren>
						</BottomChildren>
					)
				}

				return <ToolHeaderWrapper {...componentParams} />
			},
		},
		ls_dir: {
			resultWrapper: ({ toolMessage }) => {
				const accessor = useAccessor()
				const commandService = accessor.get('ICommandService')
				const explorerService = accessor.get('IExplorerService')
				const title = getTitle(toolMessage)
				const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor)
				const icon = null

				if (toolMessage.type === 'tool_request') return null // do not show past requests
				if (toolMessage.type === 'running_now') return null // do not show running

				const isError = false
				const isRejected = toolMessage.type === 'rejected'
				const { rawParams, params } = toolMessage
				const componentParams: ToolHeaderParams = {
					title,
					desc1,
					desc1Info,
					isError,
					icon,
					isRejected,
				}

				if (params.uri) {
					const rel = getRelative(params.uri, accessor)
					if (rel) componentParams.info = `Only search in ${rel}`
				}

				if (toolMessage.type === 'success') {
					const { result } = toolMessage
					componentParams.numResults = result.children?.length
					componentParams.hasNextPage = result.hasNextPage
					componentParams.children =
						!result.children || (result.children.length ?? 0) === 0 ? undefined : (
							<ToolChildrenWrapper>
								{result.children.map((child, i) => (
									<ListableToolItem
										key={i}
										name={`${child.name}${child.isDirectory ? '/' : ''}`}
										className="w-full overflow-auto"
										onClick={() => {
											voidOpenFileFn(child.uri, accessor)
											// commandService.executeCommand('workbench.view.explorer'); // open in explorer folders view instead
											// explorerService.select(child.uri, true);
										}}
									/>
								))}
								{result.hasNextPage && (
									<ListableToolItem
										name={`Results truncated (${result.itemsRemaining} remaining).`}
										isSmall={true}
										className="w-full overflow-auto"
									/>
								)}
							</ToolChildrenWrapper>
						)
				} else if (toolMessage.type === 'tool_error') {
					const { result } = toolMessage
					componentParams.bottomChildren = (
						<BottomChildren title="Error">
							<CodeChildren>{result}</CodeChildren>
						</BottomChildren>
					)
				}

				return <ToolHeaderWrapper {...componentParams} />
			},
		},
		search_pathnames_only: {
			resultWrapper: ({ toolMessage }) => {
				const accessor = useAccessor()
				const commandService = accessor.get('ICommandService')
				const isError = false
				const isRejected = toolMessage.type === 'rejected'
				const title = getTitle(toolMessage)
				const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor)
				const icon = null

				if (toolMessage.type === 'tool_request') return null // do not show past requests
				if (toolMessage.type === 'running_now') return null // do not show running

				const { rawParams, params } = toolMessage
				const componentParams: ToolHeaderParams = {
					title,
					desc1,
					desc1Info,
					isError,
					icon,
					isRejected,
				}

				if (params.includePattern) {
					componentParams.info = `Only search in ${params.includePattern}`
				}

				if (toolMessage.type === 'success') {
					const { result, rawParams } = toolMessage
					componentParams.numResults = result.uris.length
					componentParams.hasNextPage = result.hasNextPage
					componentParams.children =
						result.uris.length === 0 ? undefined : (
							<ToolChildrenWrapper>
								{result.uris.map((uri, i) => (
									<ListableToolItem
										key={i}
										name={getBasename(uri.fsPath)}
										className="w-full overflow-auto"
										onClick={() => {
											voidOpenFileFn(uri, accessor)
										}}
									/>
								))}
								{result.hasNextPage && (
									<ListableToolItem
										name={'Results truncated.'}
										isSmall={true}
										className="w-full overflow-auto"
									/>
								)}
							</ToolChildrenWrapper>
						)
				} else if (toolMessage.type === 'tool_error') {
					const { result } = toolMessage
					componentParams.bottomChildren = (
						<BottomChildren title="Error">
							<CodeChildren>{result}</CodeChildren>
						</BottomChildren>
					)
				}

				return <ToolHeaderWrapper {...componentParams} />
			},
		},
		search_for_files: {
			resultWrapper: ({ toolMessage }) => {
				const accessor = useAccessor()
				const commandService = accessor.get('ICommandService')
				const isError = false
				const isRejected = toolMessage.type === 'rejected'
				const title = getTitle(toolMessage)
				const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor)
				const icon = null

				if (toolMessage.type === 'tool_request') return null // do not show past requests
				if (toolMessage.type === 'running_now') return null // do not show running

				const { rawParams, params } = toolMessage
				const componentParams: ToolHeaderParams = {
					title,
					desc1,
					desc1Info,
					isError,
					icon,
					isRejected,
				}

				if (params.searchInFolder || params.isRegex) {
					let info: string[] = []
					if (params.searchInFolder) {
						const rel = getRelative(params.searchInFolder, accessor)
						if (rel) info.push(`Only search in ${rel}`)
					}
					if (params.isRegex) {
						info.push(`Uses regex search`)
					}
					componentParams.info = info.join('; ')
				}

				if (toolMessage.type === 'success') {
					const { result, rawParams } = toolMessage
					componentParams.numResults = result.uris.length
					componentParams.hasNextPage = result.hasNextPage
					componentParams.children =
						result.uris.length === 0 ? undefined : (
							<ToolChildrenWrapper>
								{result.uris.map((uri, i) => (
									<ListableToolItem
										key={i}
										name={getBasename(uri.fsPath)}
										className="w-full overflow-auto"
										onClick={() => {
											voidOpenFileFn(uri, accessor)
										}}
									/>
								))}
								{result.hasNextPage && (
									<ListableToolItem
										name={`Results truncated.`}
										isSmall={true}
										className="w-full overflow-auto"
									/>
								)}
							</ToolChildrenWrapper>
						)
				} else if (toolMessage.type === 'tool_error') {
					const { result } = toolMessage
					componentParams.bottomChildren = (
						<BottomChildren title="Error">
							<CodeChildren>{result}</CodeChildren>
						</BottomChildren>
					)
				}
				return <ToolHeaderWrapper {...componentParams} />
			},
		},

		search_in_file: {
			resultWrapper: ({ toolMessage }) => {
				const accessor = useAccessor()
				const toolsService = accessor.get('IToolsService')
				const title = getTitle(toolMessage)
				const isError = false
				const isRejected = toolMessage.type === 'rejected'
				const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor)
				const icon = null

				if (toolMessage.type === 'tool_request') return null // do not show past requests
				if (toolMessage.type === 'running_now') return null // do not show running

				const { rawParams, params } = toolMessage
				const componentParams: ToolHeaderParams = {
					title,
					desc1,
					desc1Info,
					isError,
					icon,
					isRejected,
				}

				const infoarr: string[] = []
				const uriStr = getRelative(params.uri, accessor)
				if (uriStr) infoarr.push(uriStr)
				if (params.isRegex) infoarr.push('Uses regex search')
				componentParams.info = infoarr.join('; ')

				if (toolMessage.type === 'success') {
					const { result } = toolMessage // result is array of snippets
					componentParams.numResults = result.lines.length
					componentParams.children =
						result.lines.length === 0 ? undefined : (
							<ToolChildrenWrapper>
								<CodeChildren className="bg-void-bg-3">
									<pre className="font-mono whitespace-pre">
										{toolsService.stringOfResult['search_in_file'](params, result)}
									</pre>
								</CodeChildren>
							</ToolChildrenWrapper>
						)
				} else if (toolMessage.type === 'tool_error') {
					const { result } = toolMessage
					componentParams.bottomChildren = (
						<BottomChildren title="Error">
							<CodeChildren>{result}</CodeChildren>
						</BottomChildren>
					)
				}

				return <ToolHeaderWrapper {...componentParams} />
			},
		},

		read_lint_errors: {
			resultWrapper: ({ toolMessage }) => {
				const accessor = useAccessor()
				const commandService = accessor.get('ICommandService')

				const title = getTitle(toolMessage)

				const { uri } = toolMessage.params ?? {}
				const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor)
				const icon = null

				if (toolMessage.type === 'tool_request') return null // do not show past requests
				if (toolMessage.type === 'running_now') return null // do not show running

				const isError = false
				const isRejected = toolMessage.type === 'rejected'
				const { rawParams, params } = toolMessage
				const componentParams: ToolHeaderParams = {
					title,
					desc1,
					desc1Info,
					isError,
					icon,
					isRejected,
				}

				componentParams.info = getRelative(uri, accessor) // full path

				if (toolMessage.type === 'success') {
					const { result } = toolMessage
					componentParams.onClick = () => {
						voidOpenFileFn(params.uri, accessor)
					}
					if (result.lintErrors)
						componentParams.children = <LintErrorChildren lintErrors={result.lintErrors} />
					else componentParams.children = `No lint errors found.`
				} else if (toolMessage.type === 'tool_error') {
					const { result } = toolMessage
					// JumpToFileButton removed in favor of FileLinkText
					componentParams.bottomChildren = (
						<BottomChildren title="Error">
							<CodeChildren>{result}</CodeChildren>
						</BottomChildren>
					)
				}

				return <ToolHeaderWrapper {...componentParams} />
			},
		},

		// ---

		create_file_or_folder: {
			resultWrapper: ({ toolMessage }) => {
				const accessor = useAccessor()
				const commandService = accessor.get('ICommandService')
				const isError = false
				const isRejected = toolMessage.type === 'rejected'
				const title = getTitle(toolMessage)
				const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor)
				const icon = null

				const { rawParams, params } = toolMessage
				const componentParams: ToolHeaderParams = {
					title,
					desc1,
					desc1Info,
					isError,
					icon,
					isRejected,
				}

				componentParams.info = getRelative(params.uri, accessor) // full path

				if (toolMessage.type === 'success') {
					const { result } = toolMessage
					componentParams.onClick = () => {
						voidOpenFileFn(params.uri, accessor)
					}
				} else if (toolMessage.type === 'rejected') {
					componentParams.onClick = () => {
						voidOpenFileFn(params.uri, accessor)
					}
				} else if (toolMessage.type === 'tool_error') {
					const { result } = toolMessage
					if (params) {
						componentParams.onClick = () => {
							voidOpenFileFn(params.uri, accessor)
						}
					}
					componentParams.bottomChildren = (
						<BottomChildren title="Error">
							<CodeChildren>{result}</CodeChildren>
						</BottomChildren>
					)
				} else if (toolMessage.type === 'running_now') {
					// nothing more is needed
				} else if (toolMessage.type === 'tool_request') {
					// nothing more is needed
				}

				return <ToolHeaderWrapper {...componentParams} />
			},
		},
		delete_file_or_folder: {
			resultWrapper: ({ toolMessage }) => {
				const accessor = useAccessor()
				const commandService = accessor.get('ICommandService')
				const isFolder = toolMessage.params?.isFolder ?? false
				const isError = false
				const isRejected = toolMessage.type === 'rejected'
				const title = getTitle(toolMessage)
				const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor)
				const icon = null

				const { rawParams, params } = toolMessage
				const componentParams: ToolHeaderParams = {
					title,
					desc1,
					desc1Info,
					isError,
					icon,
					isRejected,
				}

				componentParams.info = getRelative(params.uri, accessor) // full path

				if (toolMessage.type === 'success') {
					const { result } = toolMessage
					componentParams.onClick = () => {
						voidOpenFileFn(params.uri, accessor)
					}
				} else if (toolMessage.type === 'rejected') {
					componentParams.onClick = () => {
						voidOpenFileFn(params.uri, accessor)
					}
				} else if (toolMessage.type === 'tool_error') {
					const { result } = toolMessage
					if (params) {
						componentParams.onClick = () => {
							voidOpenFileFn(params.uri, accessor)
						}
					}
					componentParams.bottomChildren = (
						<BottomChildren title="Error">
							<CodeChildren>{result}</CodeChildren>
						</BottomChildren>
					)
				} else if (toolMessage.type === 'running_now') {
					const { result } = toolMessage
					componentParams.onClick = () => {
						voidOpenFileFn(params.uri, accessor)
					}
				} else if (toolMessage.type === 'tool_request') {
					const { result } = toolMessage
					componentParams.onClick = () => {
						voidOpenFileFn(params.uri, accessor)
					}
				}

				return <ToolHeaderWrapper {...componentParams} />
			},
		},
		rewrite_file: {
			resultWrapper: (params) => {
				return <EditTool {...params} content={params.toolMessage.params.newContent} />
			},
		},
		edit_file: {
			resultWrapper: (params) => {
				return <EditTool {...params} content={params.toolMessage.params.searchReplaceBlocks} />
			},
		},

		// ---

		run_command: {
			resultWrapper: (params) => {
				return <CommandTool {...params} type="run_command" />
			},
		},

		run_persistent_command: {
			resultWrapper: (params) => {
				return <CommandTool {...params} type="run_persistent_command" />
			},
		},
		open_persistent_terminal: {
			resultWrapper: ({ toolMessage }) => {
				const accessor = useAccessor()
				const terminalToolsService = accessor.get('ITerminalToolService')

				const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor)
				const title = getTitle(toolMessage)
				const icon = null

				if (toolMessage.type === 'tool_request') return null // do not show past requests
				if (toolMessage.type === 'running_now') return null // do not show running

				const isError = false
				const isRejected = toolMessage.type === 'rejected'
				const { rawParams, params } = toolMessage
				const componentParams: ToolHeaderParams = {
					title,
					desc1,
					desc1Info,
					isError,
					icon,
					isRejected,
				}

				const relativePath = params.cwd ? getRelative(URI.file(params.cwd), accessor) : ''
				componentParams.info = relativePath ? `Running in ${relativePath}` : undefined

				if (toolMessage.type === 'success') {
					const { result } = toolMessage
					const { persistentTerminalId } = result
					componentParams.desc1 = persistentTerminalNameOfId(persistentTerminalId)
					componentParams.onClick = () =>
						terminalToolsService.focusPersistentTerminal(persistentTerminalId)
				} else if (toolMessage.type === 'tool_error') {
					const { result } = toolMessage
					componentParams.bottomChildren = (
						<BottomChildren title="Error">
							<CodeChildren>{result}</CodeChildren>
						</BottomChildren>
					)
				}

				return <ToolHeaderWrapper {...componentParams} />
			},
		},
		kill_persistent_terminal: {
			resultWrapper: ({ toolMessage }) => {
				const accessor = useAccessor()
				const commandService = accessor.get('ICommandService')
				const terminalToolsService = accessor.get('ITerminalToolService')

				const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor)
				const title = getTitle(toolMessage)
				const icon = null

				if (toolMessage.type === 'tool_request') return null // do not show past requests
				if (toolMessage.type === 'running_now') return null // do not show running

				const isError = false
				const isRejected = toolMessage.type === 'rejected'
				const { rawParams, params } = toolMessage
				const componentParams: ToolHeaderParams = {
					title,
					desc1,
					desc1Info,
					isError,
					icon,
					isRejected,
				}

				if (toolMessage.type === 'success') {
					const { persistentTerminalId } = params
					componentParams.desc1 = persistentTerminalNameOfId(persistentTerminalId)
					componentParams.onClick = () =>
						terminalToolsService.focusPersistentTerminal(persistentTerminalId)
				} else if (toolMessage.type === 'tool_error') {
					const { result } = toolMessage
					componentParams.bottomChildren = (
						<BottomChildren title="Error">
							<CodeChildren>{result}</CodeChildren>
						</BottomChildren>
					)
				}

				return <ToolHeaderWrapper {...componentParams} />
			},
		},
	}

const Checkpoint = ({
	message,
	threadId,
	messageIdx,
	isCheckpointGhost,
	threadIsRunning,
}: {
	message: CheckpointEntry
	threadId: string
	messageIdx: number
	isCheckpointGhost: boolean
	threadIsRunning: boolean
}) => {
	const accessor = useAccessor()
	const chatThreadService = accessor.get('IChatThreadService')
	const streamState = useFullChatThreadsStreamState()

	const isRunning = useChatThreadsStreamState(threadId)?.isRunning
	const isDisabled = useMemo(() => {
		if (isRunning) return true
		return !!Object.keys(streamState).find((threadId2) => streamState[threadId2]?.isRunning)
	}, [isRunning, streamState])

	return (
		<div className={`flex items-center justify-center px-2 `}>
			<div
				className={`
                    text-xs
                    text-void-fg-3
                    select-none
                    ${isCheckpointGhost ? 'opacity-50' : 'opacity-100'}
					${isDisabled ? 'cursor-default' : 'cursor-pointer'}
                `}
				style={{ position: 'relative', display: 'inline-block' }} // allow absolute icon
				onClick={() => {
					if (threadIsRunning) return
					if (isDisabled) return
					chatThreadService.jumpToCheckpointBeforeMessageIdx({
						threadId,
						messageIdx,
						jumpToUserModified:
							messageIdx ===
							(chatThreadService.state.allThreads[threadId]?.messages.length ?? 0) - 1,
					})
				}}
				{...(isDisabled
					? {
							'data-tooltip-id': 'void-tooltip',
							'data-tooltip-content': `Disabled ${isRunning ? 'when running' : 'because another thread is running'}`,
							'data-tooltip-place': 'top',
						}
					: {})}
			>
				Checkpoint
			</div>
		</div>
	)
}

type ChatBubbleMode = 'display' | 'edit'
type ChatBubbleProps = {
	chatMessage: ChatMessage
	messageIdx: number
	isCommitted: boolean
	chatIsRunning: IsRunningType
	threadId: string
	currCheckpointIdx: number | undefined
	_scrollToBottom: (() => void) | null
}

const ChatBubble = (props: ChatBubbleProps) => {
	return (
		<ErrorBoundary>
			<_ChatBubble {...props} />
		</ErrorBoundary>
	)
}

const _ChatBubble = ({
	threadId,
	chatMessage,
	currCheckpointIdx,
	isCommitted,
	messageIdx,
	chatIsRunning,
	_scrollToBottom,
}: ChatBubbleProps) => {
	const role = chatMessage.role

	const isCheckpointGhost = messageIdx > (currCheckpointIdx ?? Infinity) && !chatIsRunning // whether to show as gray (if chat is running, for good measure just dont show any ghosts)

	if (role === 'user') {
		return (
			<UserMessageComponent
				chatMessage={chatMessage}
				isCheckpointGhost={isCheckpointGhost}
				currCheckpointIdx={currCheckpointIdx}
				messageIdx={messageIdx}
				_scrollToBottom={_scrollToBottom}
			/>
		)
	} else if (role === 'assistant') {
		return (
			<AssistantMessageComponent
				chatMessage={chatMessage}
				isCheckpointGhost={isCheckpointGhost}
				messageIdx={messageIdx}
				isCommitted={isCommitted}
			/>
		)
	} else if (role === 'tool') {
		if (chatMessage.type === 'invalid_params') {
			return (
				<div className={`${isCheckpointGhost ? 'opacity-50' : ''}`}>
					<InvalidTool
						toolName={chatMessage.name}
						message={chatMessage.content}
						mcpServerName={chatMessage.mcpServerName}
					/>
				</div>
			)
		}

		const toolName = chatMessage.name
		const isBuiltInTool = isABuiltinToolName(toolName)
		const ToolResultWrapper = isBuiltInTool
			? (builtinToolNameToComponent[toolName]?.resultWrapper as ResultWrapper<ToolName>)
			: (MCPToolWrapper as ResultWrapper<ToolName>)

		if (ToolResultWrapper)
			return (
				<>
					<div className={`${isCheckpointGhost ? 'opacity-50' : ''}`}>
						<ToolResultWrapper
							toolMessage={chatMessage}
							messageIdx={messageIdx}
							threadId={threadId}
						/>
					</div>
					{chatMessage.type === 'tool_request' ? (
						<div className={`${isCheckpointGhost ? 'opacity-50 pointer-events-none' : ''}`}>
							<ToolRequestAcceptRejectButtons toolName={chatMessage.name} />
						</div>
					) : null}
				</>
			)
		return null
	} else if (role === 'interrupted_streaming_tool') {
		return (
			<div className={`${isCheckpointGhost ? 'opacity-50' : ''}`}>
				<CanceledTool toolName={chatMessage.name} mcpServerName={chatMessage.mcpServerName} />
			</div>
		)
	} else if (role === 'checkpoint') {
		return (
			<Checkpoint
				threadId={threadId}
				message={chatMessage}
				messageIdx={messageIdx}
				isCheckpointGhost={isCheckpointGhost}
				threadIsRunning={!!chatIsRunning}
			/>
		)
	}
}

const CommandBarInChat = () => {
	const { stateOfURI: commandBarStateOfURI, sortedURIs: sortedCommandBarURIs } =
		useCommandBarState()
	const numFilesChanged = sortedCommandBarURIs.length

	const accessor = useAccessor()
	const editCodeService = accessor.get('IEditCodeService')
	const commandService = accessor.get('ICommandService')
	const chatThreadsState = useChatThreadsState()
	const commandBarState = useCommandBarState()
	const chatThreadsStreamState = useChatThreadsStreamState(chatThreadsState.currentThreadId)

	// (
	// 	<IconShell1
	// 		Icon={CopyIcon}
	// 		onClick={copyChatToClipboard}
	// 		data-tooltip-id='void-tooltip'
	// 		data-tooltip-place='top'
	// 		data-tooltip-content='Copy chat JSON'
	// 	/>
	// )

	const [fileDetailsOpenedState, setFileDetailsOpenedState] = useState<
		'auto-opened' | 'auto-closed' | 'user-opened' | 'user-closed'
	>('auto-closed')
	const isFileDetailsOpened =
		fileDetailsOpenedState === 'auto-opened' || fileDetailsOpenedState === 'user-opened'

	useEffect(() => {
		// close the file details if there are no files
		// this converts 'user-closed' to 'auto-closed'
		if (numFilesChanged === 0) {
			setFileDetailsOpenedState('auto-closed')
		}
		// open the file details if it hasnt been closed
		if (numFilesChanged > 0 && fileDetailsOpenedState !== 'user-closed') {
			setFileDetailsOpenedState('auto-opened')
		}
	}, [fileDetailsOpenedState, setFileDetailsOpenedState, numFilesChanged])

	const isFinishedMakingThreadChanges =
		// there are changed files
		commandBarState.sortedURIs.length !== 0 &&
		// none of the files are streaming
		commandBarState.sortedURIs.every((uri) => !commandBarState.stateOfURI[uri.fsPath]?.isStreaming)

	// ======== status of agent ========
	// This icon answers the question "is the LLM doing work on this thread?"
	// assume it is single threaded for now
	// green = Running
	// orange = Requires action
	// dark = Done

	const threadStatus =
		chatThreadsStreamState?.isRunning === 'awaiting_user'
			? ({ title: 'Needs Approval', color: 'yellow' } as const)
			: chatThreadsStreamState?.isRunning
				? ({ title: 'Running', color: 'orange' } as const)
				: ({ title: 'Done', color: 'dark' } as const)

	const threadStatusHTML = (
		<StatusIndicator
			className="mx-1"
			indicatorColor={threadStatus.color}
			title={threadStatus.title}
		/>
	)

	// ======== info about changes ========
	// num files changed
	// acceptall + rejectall
	// popup info about each change (each with num changes + acceptall + rejectall of their own)

	const numFilesChangedStr =
		numFilesChanged === 0
			? 'No files with changes'
			: `${sortedCommandBarURIs.length} file${numFilesChanged === 1 ? '' : 's'} with changes`

	const acceptRejectAllButtons = (
		<div
			// do this with opacity so that the height remains the same at all times
			className={`flex items-center gap-0.5
			${isFinishedMakingThreadChanges ? '' : 'opacity-0 pointer-events-none'}`}
		>
			<IconShell1 // RejectAllButtonWrapper
				// text="Reject All"
				// className="text-xs"
				Icon={X}
				onClick={() => {
					sortedCommandBarURIs.forEach((uri) => {
						editCodeService.acceptOrRejectAllDiffAreas({
							uri,
							removeCtrlKs: true,
							behavior: 'reject',
							_addToHistory: true,
						})
					})
				}}
				data-tooltip-id="void-tooltip"
				data-tooltip-place="top"
				data-tooltip-content="Reject all"
			/>

			<IconShell1 // AcceptAllButtonWrapper
				// text="Accept All"
				// className="text-xs"
				Icon={Check}
				onClick={() => {
					sortedCommandBarURIs.forEach((uri) => {
						editCodeService.acceptOrRejectAllDiffAreas({
							uri,
							removeCtrlKs: true,
							behavior: 'accept',
							_addToHistory: true,
						})
					})
				}}
				data-tooltip-id="void-tooltip"
				data-tooltip-place="top"
				data-tooltip-content="Accept all"
			/>
		</div>
	)

	// !select-text cursor-auto
	const fileDetailsContent = (
		<div className="px-2 gap-1 w-full overflow-y-auto">
			{sortedCommandBarURIs.map((uri, i) => {
				const basename = getBasename(uri.fsPath)

				const { sortedDiffIds, isStreaming } = commandBarStateOfURI[uri.fsPath] ?? {}
				const isFinishedMakingFileChanges = !isStreaming

				const numDiffs = sortedDiffIds?.length || 0

				const fileStatus = isFinishedMakingFileChanges
					? ({ title: 'Done', color: 'dark' } as const)
					: ({ title: 'Running', color: 'orange' } as const)

				const fileNameHTML = (
					<div
						className="flex items-center gap-1.5 text-void-fg-3 hover:brightness-125 transition-all duration-200 cursor-pointer"
						onClick={() => voidOpenFileFn(uri, accessor)}
					>
						{/* <FileIcon size={14} className="text-void-fg-3" /> */}
						<span className="text-void-fg-3">{basename}</span>
					</div>
				)

				const detailsContent = (
					<div className="flex px-4">
						<span className="text-void-fg-3 opacity-80">
							{numDiffs} diff{numDiffs !== 1 ? 's' : ''}
						</span>
					</div>
				)

				const acceptRejectButtons = (
					<div
						// do this with opacity so that the height remains the same at all times
						className={`flex items-center gap-0.5
					${isFinishedMakingFileChanges ? '' : 'opacity-0 pointer-events-none'}
				`}
					>
						{/* <JumpToFileButton
					uri={uri}
					data-tooltip-id='void-tooltip'
					data-tooltip-place='top'
					data-tooltip-content='Go to file'
				/> */}
						<IconShell1 // RejectAllButtonWrapper
							Icon={X}
							onClick={() => {
								editCodeService.acceptOrRejectAllDiffAreas({
									uri,
									removeCtrlKs: true,
									behavior: 'reject',
									_addToHistory: true,
								})
							}}
							data-tooltip-id="void-tooltip"
							data-tooltip-place="top"
							data-tooltip-content="Reject file"
						/>
						<IconShell1 // AcceptAllButtonWrapper
							Icon={Check}
							onClick={() => {
								editCodeService.acceptOrRejectAllDiffAreas({
									uri,
									removeCtrlKs: true,
									behavior: 'accept',
									_addToHistory: true,
								})
							}}
							data-tooltip-id="void-tooltip"
							data-tooltip-place="top"
							data-tooltip-content="Accept file"
						/>
					</div>
				)

				const fileStatusHTML = (
					<StatusIndicator
						className="mx-1"
						indicatorColor={fileStatus.color}
						title={fileStatus.title}
					/>
				)

				return (
					// name, details
					<div key={i} className="flex justify-between items-center">
						<div className="flex items-center">
							{fileNameHTML}
							{detailsContent}
						</div>
						<div className="flex items-center gap-2">
							{acceptRejectButtons}
							{fileStatusHTML}
						</div>
					</div>
				)
			})}
		</div>
	)

	const fileDetailsButton = (
		<button
			className={`flex items-center gap-1 rounded ${numFilesChanged === 0 ? 'cursor-pointer' : 'cursor-pointer hover:brightness-125 transition-all duration-200'}`}
			onClick={() =>
				isFileDetailsOpened
					? setFileDetailsOpenedState('user-closed')
					: setFileDetailsOpenedState('user-opened')
			}
			type="button"
			disabled={numFilesChanged === 0}
		>
			<svg
				className="transition-transform duration-200 size-3.5"
				style={{
					transform: isFileDetailsOpened ? 'rotate(0deg)' : 'rotate(180deg)',
					transition: 'transform 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)',
				}}
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<polyline points="18 15 12 9 6 15"></polyline>
			</svg>
			{numFilesChangedStr}
		</button>
	)

	return (
		<>
			{/* file details */}
			<div className="px-2">
				<div
					className={`
						select-none
						flex w-full rounded-t-lg bg-void-bg-3
						text-void-fg-3 text-xs text-nowrap

						overflow-hidden transition-all duration-200 ease-in-out
						${isFileDetailsOpened ? 'max-h-24' : 'max-h-0'}
					`}
				>
					{fileDetailsContent}
				</div>
			</div>
			{/* main content */}
			<div
				className={`
					select-none
					flex w-full rounded-t-lg bg-void-bg-3
					text-void-fg-3 text-xs text-nowrap
					border-t border-l border-r border-zinc-300/10

					px-2 py-1
					justify-between
				`}
			>
				<div className="flex gap-2 items-center">{fileDetailsButton}</div>
				<div className="flex gap-2 items-center">
					{acceptRejectAllButtons}
					{threadStatusHTML}
				</div>
			</div>
		</>
	)
}

const EditToolSoFar = ({ toolCallSoFar }: { toolCallSoFar: RawToolCallObj }) => {
	if (!isABuiltinToolName(toolCallSoFar.name)) return null

	const accessor = useAccessor()

	const uri = toolCallSoFar.rawParams.uri ? URI.file(toolCallSoFar.rawParams.uri) : undefined

	const title = titleOfBuiltinToolName[toolCallSoFar.name].proposed

	const uriDone = toolCallSoFar.doneParams.includes('uri')
	const desc1 = (
		<span className="flex items-center">
			{uriDone ? getBasename(toolCallSoFar.rawParams['uri'] ?? 'unknown') : `Generating`}
			<IconLoading />
		</span>
	)

	const desc1OnClick = () => {
		uri && voidOpenFileFn(uri, accessor)
	}

	// If URI has not been specified
	return (
		<ToolHeaderWrapper title={title} desc1={desc1} desc1OnClick={desc1OnClick}>
			<EditToolChildren
				uri={uri}
				code={
					toolCallSoFar.rawParams.search_replace_blocks ?? toolCallSoFar.rawParams.new_content ?? ''
				}
				type={'rewrite'} // as it streams, show in rewrite format, don't make a diff editor
			/>
			<IconLoading />
		</ToolHeaderWrapper>
	)
}

export const SidebarChat = () => {
	const textAreaRef = useRef<HTMLTextAreaElement | null>(null)
	const textAreaFnsRef = useRef<TextAreaFns | null>(null)

	const [authed, setAuthed] = useState(false)
	const [authChecked, setAuthChecked] = useState(false)
	const [userName, setUserName] = useState<string>('')
	const [userId, setUserId] = useState<string>('')
	const [activeTab, setActiveTab] = useState<'chat' | 'broker'>('chat')

	useEffect(() => {
		const verify = async () => {
			let token: string | null = null
			try {
				token = localStorage.getItem('void_jwt')
			} catch {}
			if (!token) {
				setAuthChecked(true)
				setAuthed(false)
				return
			}
			try {
				const rsp = await fetch(`${BACKEND_URL}/auth/me`, {
					headers: { Authorization: `Bearer ${token}` },
				})
				if (rsp.ok) {
					setAuthed(true)
					try {
						const data = await rsp.json()
						setUserName(data?.user?.username || '')
						setUserId(data?.user?._id || data?.user?.id || '')
					} catch {}
				} else setAuthed(false)
			} catch {
				setAuthed(false)
			} finally {
				setAuthChecked(true)
			}
		}
		verify()
	}, [])

	if (false && (!authChecked || !authed)) {
		return (
			<AuthPanel
				onAuthed={() => {
					setAuthed(true)
					setAuthChecked(true)
				}}
			/>
		)
	}

	const accessor = useAccessor()
	const commandService = accessor.get('ICommandService')
	const chatThreadsService = accessor.get('IChatThreadService')

	const settingsState = useSettingsState()
	// ----- HIGHER STATE -----

	// threads state
	const chatThreadsState = useChatThreadsState()

	const currentThread = chatThreadsService.getCurrentThread()
	const previousMessages = currentThread?.messages ?? []

	const selections = currentThread.state.stagingSelections
	const setSelections = (s: StagingSelectionItem[]) => {
		chatThreadsService.setCurrentThreadState({ stagingSelections: s })
	}

	// stream state
	const currThreadStreamState = useChatThreadsStreamState(chatThreadsState.currentThreadId)
	const isRunning = currThreadStreamState?.isRunning
	const latestError = currThreadStreamState?.error
	const { displayContentSoFar, toolCallSoFar, reasoningSoFar } =
		currThreadStreamState?.llmInfo ?? {}

	// this is just if it's currently being generated, NOT if it's currently running
	const toolIsGenerating = toolCallSoFar && !toolCallSoFar.isDone // show loading for slow tools (right now just edit)

	// ----- SIDEBAR CHAT state (local) -----

	// state of current message
	const initVal = ''
	const [instructionsAreEmpty, setInstructionsAreEmpty] = useState(!initVal)

	const isDisabled = instructionsAreEmpty || !!isFeatureNameDisabled('Chat', settingsState)

	const sidebarRef = useRef<HTMLDivElement>(null)
	const scrollContainerRef = useRef<HTMLDivElement | null>(null)
	const onSubmit = useCallback(
		async (_forceSubmit?: string) => {
			if (isDisabled && !_forceSubmit) return
			if (isRunning) return

			const threadId = chatThreadsService.state.currentThreadId

			// send message to LLM
			const userMessage = _forceSubmit || textAreaRef.current?.value || ''

			try {
				await chatThreadsService.addUserMessageAndStreamResponse({ userMessage, threadId })
			} catch (e) {
				console.error('Error while sending message in chat:', e)
			}

			setSelections([]) // clear staging
			textAreaFnsRef.current?.setValue('')
			textAreaRef.current?.focus() // focus input after submit
		},
		[
			chatThreadsService,
			isDisabled,
			isRunning,
			textAreaRef,
			textAreaFnsRef,
			setSelections,
			settingsState,
		],
	)

	const onAbort = async () => {
		const threadId = currentThread.id
		await chatThreadsService.abortRunning(threadId)
	}

	const keybindingString = accessor
		.get('IKeybindingService')
		.lookupKeybinding(VOID_CTRL_L_ACTION_ID)
		?.getLabel()

	const threadId = currentThread.id
	const currCheckpointIdx =
		chatThreadsState.allThreads[threadId]?.state?.currCheckpointIdx ?? undefined // if not exist, treat like checkpoint is last message (infinity)

	// resolve mount info
	const isResolved =
		chatThreadsState.allThreads[threadId]?.state.mountedInfo?.mountedIsResolvedRef.current
	useEffect(() => {
		if (isResolved) return
		chatThreadsState.allThreads[threadId]?.state.mountedInfo?._whenMountedResolver?.({
			textAreaRef: textAreaRef,
			scrollToBottom: () => scrollToBottom(scrollContainerRef),
		})
	}, [chatThreadsState, threadId, textAreaRef, scrollContainerRef, isResolved])

	const previousMessagesHTML = useMemo(() => {
		// const lastMessageIdx = previousMessages.findLastIndex(v => v.role !== 'checkpoint')
		// tool request shows up as Editing... if in progress
		return previousMessages.map((message, i) => {
			return (
				<ChatBubble
					key={i}
					currCheckpointIdx={currCheckpointIdx}
					chatMessage={message}
					messageIdx={i}
					isCommitted={true}
					chatIsRunning={isRunning}
					threadId={threadId}
					_scrollToBottom={() => scrollToBottom(scrollContainerRef)}
				/>
			)
		})
	}, [previousMessages, threadId, currCheckpointIdx, isRunning])

	const streamingChatIdx = previousMessagesHTML.length
	const currStreamingMessageHTML =
		reasoningSoFar || displayContentSoFar || isRunning ? (
			<ChatBubble
				key={'curr-streaming-msg'}
				currCheckpointIdx={currCheckpointIdx}
				chatMessage={{
					role: 'assistant',
					displayContent: displayContentSoFar ?? '',
					reasoning: reasoningSoFar ?? '',
					anthropicReasoning: null,
				}}
				messageIdx={streamingChatIdx}
				isCommitted={false}
				chatIsRunning={isRunning}
				threadId={threadId}
				_scrollToBottom={null}
			/>
		) : null

	// the tool currently being generated
	const generatingTool = toolIsGenerating ? (
		toolCallSoFar.name === 'edit_file' || toolCallSoFar.name === 'rewrite_file' ? (
			<EditToolSoFar key={'curr-streaming-tool'} toolCallSoFar={toolCallSoFar} />
		) : null
	) : null

	const messagesHTML = (
		<ScrollToBottomContainer
			key={'messages' + chatThreadsState.currentThreadId} // force rerender on all children if id changes
			scrollContainerRef={scrollContainerRef}
			className={`
			flex flex-col
			px-4 py-4 space-y-4
			w-full flex-1 min-h-0
			overflow-x-hidden
			overflow-y-auto
			${previousMessagesHTML.length === 0 && !displayContentSoFar ? 'hidden' : ''}
		`}
		>
			{/* previous messages */}
			{previousMessagesHTML}
			{currStreamingMessageHTML}

			{/* Generating tool */}
			{generatingTool}

			{/* loading indicator */}
			{isRunning === 'LLM' || (isRunning === 'idle' && !toolIsGenerating) ? (
				<ProseWrapper>{<IconLoading className="opacity-50 text-sm" />}</ProseWrapper>
			) : null}

			{/* error message */}
			{latestError === undefined ? null : (
				<div className="px-2 my-1">
					<ErrorDisplay
						message={latestError.message}
						fullError={latestError.fullError}
						onDismiss={() => {
							chatThreadsService.dismissStreamError(currentThread.id)
						}}
						showDismiss={true}
					/>

					<WarningBox
						className="text-sm my-2 mx-4"
						onClick={() => {
							commandService.executeCommand(VOID_OPEN_SETTINGS_ACTION_ID)
						}}
						text="Open settings"
					/>
				</div>
			)}
		</ScrollToBottomContainer>
	)

	const onChangeText = useCallback(
		(newStr: string) => {
			setInstructionsAreEmpty(!newStr)
		},
		[setInstructionsAreEmpty],
	)
	const onKeyDown = useCallback(
		(e: KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
				onSubmit()
			} else if (e.key === 'Escape' && isRunning) {
				onAbort()
			}
		},
		[onSubmit, onAbort, isRunning],
	)

	const inputChatArea = (
		<VoidChatArea
			featureName="Chat"
			onSubmit={() => onSubmit()}
			onAbort={onAbort}
			isStreaming={!!isRunning}
			isDisabled={isDisabled}
			showSelections={true}
			// showProspectiveSelections={previousMessagesHTML.length === 0}
			selections={selections}
			setSelections={setSelections}
			onClickAnywhere={() => {
				textAreaRef.current?.focus()
			}}
		>
			<VoidInputBox2
				enableAtToMention
				className={`min-h-[81px] px-0.5 py-0.5`}
				placeholder={`${userName ? `${userName}, what do you want to do?` : 'What do you want to do?'}`}
				onChangeText={onChangeText}
				onKeyDown={onKeyDown}
				onFocus={() => {
					chatThreadsService.setCurrentlyFocusedMessageIdx(undefined)
				}}
				ref={textAreaRef}
				fnsRef={textAreaFnsRef}
				multiline={true}
			/>
		</VoidChatArea>
	)

	const isLandingPage = previousMessages.length === 0

	const initiallySuggestedPromptsHTML = (
		<div className="flex flex-col gap-2 w-full text-nowrap text-void-fg-3 select-none">
			{[
				'Summarize my codebase',
				'How do types work in Rust?',
				'Create a .voidrules file for me',
			].map((text, index) => (
				<div
					key={index}
					className="py-1 px-2 rounded text-sm bg-zinc-700/5 hover:bg-zinc-700/10 dark:bg-zinc-300/5 dark:hover:bg-zinc-300/10 cursor-pointer opacity-80 hover:opacity-100"
					onClick={() => onSubmit(text)}
				>
					{text}
				</div>
			))}
		</div>
	)

	const threadPageInput = (
		<div key={'input' + chatThreadsState.currentThreadId}>
			{authChecked && authed ? (
				<div className="px-4">
					<CommandBarInChat />
				</div>
			) : null}
			<div className="px-2 pb-2">{inputChatArea}</div>
		</div>
	)

	const landingPageInput = (
		<div>
			<div className="pt-8">{inputChatArea}</div>
		</div>
	)

	const landingPageContent = (
		<div
			ref={sidebarRef}
			className="w-full flex-1 min-h-0 max-h-full flex flex-col overflow-auto px-4"
		>
			<ErrorBoundary>{landingPageInput}</ErrorBoundary>

			{Object.keys(chatThreadsState.allThreads).length > 1 ? ( // show if there are threads
				<ErrorBoundary>
					<div className="pt-8 mb-2 text-void-fg-3 text-root select-none pointer-events-none">
						Previous Threads
					</div>
					<PastThreadsList />
				</ErrorBoundary>
			) : (
				<ErrorBoundary>
					<div className="pt-8 mb-2 text-void-fg-3 text-root select-none pointer-events-none">
						Suggestions
					</div>
					{initiallySuggestedPromptsHTML}
				</ErrorBoundary>
			)}
		</div>
	)

	const threadPageContent = (
		<div ref={sidebarRef} className="w-full flex-1 min-h-0 flex flex-col overflow-hidden">
			<ErrorBoundary>{messagesHTML}</ErrorBoundary>
			<ErrorBoundary>{threadPageInput}</ErrorBoundary>
		</div>
	)

	return (
		<div className="relative w-full h-full min-h-0 flex flex-col">
			{authChecked && authed && (
				<button
					className="absolute top-2 right-2 z-40 px-2 py-1 rounded bg-white text-black text-xs"
					onClick={() => {
						try {
							localStorage.removeItem('void_jwt')
						} catch {}
						setAuthed(false)
						setAuthChecked(true)
					}}
				>
					Logout{userName ? ` (${userName})` : ''}
				</button>
			)}
			<div
				className={`${!authChecked || !authed ? 'pointer-events-none' : ''} w-full h-full min-h-0 flex flex-col`}
			>
				<div className="flex items-center gap-4 px-4 py-2 border-b border-void-border-2 select-none">
					<button
						className={`text-xs tracking-wide ${activeTab === 'chat' ? 'text-white underline' : 'text-void-fg-3'}`}
						onClick={() => setActiveTab('chat')}
					>
						CHAT
					</button>
					<button
						className={`text-xs tracking-wide ${activeTab === 'broker' ? 'text-white underline' : 'text-void-fg-3'}`}
						onClick={() => setActiveTab('broker')}
					>
						BROKER
					</button>
				</div>
				<Fragment key={threadId}>
					{activeTab === 'chat' ? (
						isLandingPage ? (
							landingPageContent
						) : (
							threadPageContent
						)
					) : authChecked && authed && userId ? (
						<BrokerPanel userId={userId} onChanged={() => {}} />
					) : null}
				</Fragment>
			</div>

			{(!authChecked || !authed) && (
				<div
					className="fixed inset-0 bg-black flex items-center justify-center"
					style={{ zIndex: 2147483647, pointerEvents: 'auto' }}
				>
					<div className="w-full h-full absolute inset-0" />
					<div className="relative z-10 w-full h-full">
						<AuthPanel
							onAuthed={(token, user) => {
								setUserName(user?.username || '')
								setUserId(user?._id || user?.id || '')
								setAuthed(true)
								setAuthChecked(true)
							}}
						/>
					</div>
				</div>
			)}
		</div>
	)
}

// Hide broker panel Start/Manage buttons globally
if (typeof document !== 'undefined') {
	requestAnimationFrame(() => {
		const existing = document.getElementById('void-hide-broker-buttons-css')
		if (existing) return
		const link = document.createElement('link')
		link.id = 'void-hide-broker-buttons-css'
		link.rel = 'stylesheet'
		link.href = '/resources/css/hide-broker-buttons.css'
		document.head.appendChild(link)
	})
}
