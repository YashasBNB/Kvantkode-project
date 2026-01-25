import React, { useState } from 'react'
import { getBackendBase } from './AuthGate.js'

export const AuthOverlay: React.FC<{ onAuthed: (token: string) => void }> = ({ onAuthed }) => {
	const [mode, setMode] = useState<'login' | 'signup'>('login')
	const [name, setName] = useState('')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const submit = async (e: React.FormEvent) => {
		e.preventDefault()
		setLoading(true)
		setError(null)
		try {
			const path = mode === 'login' ? '/auth/login' : '/auth/signup'
			const body: any = { email, password }
			if (mode === 'signup') body.username = name || email.split('@')[0]
			const rsp = await fetch(`${getBackendBase()}${path}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			})
			const data = await rsp.json()
			if (!rsp.ok) throw new Error(data?.error || 'request_failed')
			if (data?.token) {
				onAuthed(data.token)
			}
		} catch (e: any) {
			setError(e?.message || String(e))
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="@@void-scope">
			<div className="fixed inset-0 z-[100000] bg-[rgba(0,0,0,0.6)] flex items-center justify-center">
				<div className="bg-void-bg-2 text-void-fg-1 border border-void-border-2 rounded-lg shadow-xl w-[360px] p-5">
					<div className="text-xl mb-3">{mode === 'login' ? 'Login' : 'Sign up'}</div>
					<form onSubmit={submit} className="flex flex-col gap-3">
						{mode === 'signup' && (
							<div className="flex flex-col gap-1">
								<label className="text-xs text-void-fg-3">Name</label>
								<input
									className="bg-void-bg-1 border border-void-border-3 rounded px-2 py-1"
									type="text"
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="Your name"
								/>
							</div>
						)}
						<div className="flex flex-col gap-1">
							<label className="text-xs text-void-fg-3">Email</label>
							<input
								className="bg-void-bg-1 border border-void-border-3 rounded px-2 py-1"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="you@example.com"
								required
							/>
						</div>
						<div className="flex flex-col gap-1">
							<label className="text-xs text-void-fg-3">Password</label>
							<input
								className="bg-void-bg-1 border border-void-border-3 rounded px-2 py-1"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="••••••••"
								required
							/>
						</div>
						<div className="text-[11px] text-void-fg-3 leading-snug">
							By signing in, you agree that KvantKode is an algo coding assistant only and does not
							provide trading or investment advice.
						</div>
						{error && <div className="text-void-warning text-xs">{error}</div>}
						<button
							type="submit"
							disabled={loading}
							className={`px-3 py-2 rounded bg-white text-black ${loading ? 'opacity-60' : ''}`}
						>
							{loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
						</button>
					</form>
					<div className="mt-3 text-xs text-void-fg-3">
						{mode === 'login' ? (
								<button className="underline" onClick={() => setMode('signup')}>
									Need an account? Sign up
								</button>
						) : (
								<button className="underline" onClick={() => setMode('login')}>
									Already have an account? Sign in
								</button>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}
