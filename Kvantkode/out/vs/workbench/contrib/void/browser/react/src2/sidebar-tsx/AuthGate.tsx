import React, { useEffect, useState } from 'react'

type Props = {
	children: React.ReactNode
}

const TOKEN_KEY = 'void_jwt'
const DEFAULT_BACKEND = 'https://kvantkode-backends.onrender.com'

export const getBackendBase = (): string => {
	try {
		const v = window.localStorage.getItem('void_backend_url')
		return v && v.trim() ? v : DEFAULT_BACKEND
	} catch {
		return DEFAULT_BACKEND
	}
}

export const getToken = (): string | null => {
	try {
		return window.localStorage.getItem(TOKEN_KEY)
	} catch {
		return null
	}
}

export const setToken = (token: string) => {
	try {
		window.localStorage.setItem(TOKEN_KEY, token)
	} catch {}
}

export const clearToken = () => {
	try {
		window.localStorage.removeItem(TOKEN_KEY)
	} catch {}
}

export const AuthGate: React.FC<Props> = ({ children }) => {
	const [token, setTokenState] = useState<string | null>(getToken())
	const [checking, setChecking] = useState<boolean>(false)

	useEffect(() => {
		const t = getToken()
		if (!t) return
		setChecking(true)
		fetch(`${getBackendBase()}/auth/me`, { headers: { Authorization: `Bearer ${t}` } })
			.then((r) => (r.ok ? r.json() : Promise.reject()))
			.then(() => setTokenState(t))
			.catch(() => {
				clearToken()
				setTokenState(null)
			})
			.finally(() => setChecking(false))
	}, [])

	if (checking) {
		return (
			<div className="void-w-full void-h-full void-flex void-items-center void-justify-center void-text-void-fg-3">
				Checking session…
			</div>
		)
	}

	if (!token) {
		const AuthOverlay = require('./AuthOverlay').AuthOverlay
		return (
			<AuthOverlay
				onAuthed={(tk: string) => {
					setToken(tk)
					setTokenState(tk)
				}}
			/>
		)
	}

	return <>{children}</>
}
