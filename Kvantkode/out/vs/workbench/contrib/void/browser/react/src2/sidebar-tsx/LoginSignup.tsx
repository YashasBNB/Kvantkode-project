import React, { useEffect, useState } from 'react'
import { getBackendBase } from './AuthGate.js'

export const LoginSignup = ({ onAuthed }: { onAuthed: (token: string) => void }) => {
	const [mode, setMode] = useState<'login' | 'signup'>('login')
	const [email, setEmail] = useState('')
	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [googleClientId, setGoogleClientId] = useState<string | null>(null)
	const [googleReady, setGoogleReady] = useState(false)
	const [acceptedTerms, setAcceptedTerms] = useState(false)

	const submit = async () => {
		setLoading(true)
		setError(null)
		try {
			if (!acceptedTerms) {
				throw new Error('Please accept the Terms & Conditions to continue')
			}
			const endpoint = mode === 'login' ? '/auth/login' : '/auth/signup'
			const payload: any = { email, password }
			if (mode === 'signup') payload.username = username || email.split('@')[0]
			const rsp = await fetch(`${getBackendBase()}${endpoint}`, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(payload),
})
			const data = await rsp.json()
			if (!rsp.ok) throw new Error(data?.error || 'auth_failed')
			if (data?.token) onAuthed(data.token)
		} catch (e: any) {
			setError(e.message || 'Failed')
		} finally {
			setLoading(false)
		}
	}

	// Load Google Identity Services if configured
	useEffect(() => {
		const load = async () => {
			try {
				const cfgRsp = await fetch(`${getBackendBase()}/auth/config`)
				const cfg = await cfgRsp.json()
				if (cfg?.googleClientId) {
					setGoogleClientId(cfg.googleClientId)
					// Inject GIS script once
					if (!document.getElementById('gsi-script')) {
						const s = document.createElement('script')
						s.id = 'gsi-script'
						s.src = 'https://accounts.google.com/gsi/client'
						s.async = true
						s.defer = true
						s.onload = () => setGoogleReady(true)
						document.head.appendChild(s)
					} else {
						setGoogleReady(true)
					}
			}
			catch (_) { /* ignore */ }
		}
		load()
	}, [])

	const loginWithGoogle = async () => {
		try {
			setLoading(true)
			setError(null)
			if (!acceptedTerms) throw new Error('Please accept the Terms & Conditions to continue')
			if (!googleClientId) throw new Error('google_not_configured')
			const anyWin: any = window as any
			if (!anyWin.google?.accounts?.id) {
				throw new Error('google_sdk_not_ready')
			}
			// Wrap the callback into a Promise to await credential
			const idToken: string = await new Promise((resolve, reject) => {
				try {
					anyWin.google.accounts.id.initialize({
client_id: googleClientId,
callback: (resp: any) => {
							const cred = resp?.credential
							if (cred) resolve(cred)
							else reject(new Error('no_credential'))
						},
						ux_mode: 'popup',
					})
					anyWin.google.accounts.id.prompt((notification: any) => {
						if (notification?.isNotDisplayed || notification?.isSkippedMoment) {
							reject(new Error('popup_blocked'))
						}
					})
				} catch (e) {
					reject(e)
				}
			})

			const rsp = await fetch(`${getBackendBase()}/auth/google`, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ idToken })
})
			const data = await rsp.json()
			if (!rsp.ok) throw new Error(data?.error || 'google_auth_failed')
			if (data?.token) onAuthed(data.token)
		} catch (e: any) {
			setError(e?.message || 'Google sign-in failed')
		} finally {
			setLoading(false)
		}
	}

	return (
<div className="void-w-full void-h-full void-flex void-items-center void-justify-center">
			<div className="void-w-full void-max-w-sm void-bg-void-bg-3 void-border void-border-void-border-3 void-rounded void-p-4">
				<div className="void-text-lg void-mb-3">{mode === 'login' ? 'Log in' : 'Sign up'}</div>
				{mode === 'signup' && (
					<div className="void-mb-2">
						<label className="void-text-xs void-text-void-fg-3">Username</label>
						<input
							className="void-w-full void-mt-1 void-p-2 void-bg-void-bg-1 void-border void-border-void-border-3 void-rounded"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							placeholder="yourname"
						/>
					</div>
				)}
				<div className="void-mb-2">
					<label className="void-text-xs void-text-void-fg-3">Email</label>
					<input
						className="void-w-full void-mt-1 void-p-2 void-bg-void-bg-1 void-border void-border-void-border-3 void-rounded"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						placeholder="you@example.com"
					/>
				</div>
				<div className="void-mb-3">
					<label className="void-text-xs void-text-void-fg-3">Password</label>
					<input
						type="password"
						className="void-w-full void-mt-1 void-p-2 void-bg-void-bg-1 void-border void-border-void-border-3 void-rounded"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						placeholder="••••••••"
					/>
				</div>
				{/* Inline Terms & Conditions and consent */}
				<div className="void-mt-3">
					<div className="void-h-40 void-overflow-auto void-text-xs void-bg-void-bg-1 void-border void-border-void-border-3 void-rounded void-p-3 void-whitespace-pre-wrap">
📄 TERMS & CONDITIONS – Algo Coding Assistant App
Last Updated: [Insert Date]
Welcome to [Your App Name] (“the App”).
By accessing or using this App, you (“User”) agree to the following Terms & Conditions. If you do not agree, you must not use the App.

1. Nature of the App
1.1. The App is a coding assistant designed for algo traders.
1.2. The App does not provide investment advice, trading signals, recommendations, or portfolio management.
1.3. The App only generates code, scripts, strategies, or automation logic based on user prompts.
1.4. All final decisions, including placing trades, connecting to brokers, and using generated code, are solely the User’s responsibility.

2. No Financial Advice
2.1. The App is not a SEBI-registered advisor, research analyst, portfolio manager, or broker.
2.2. Nothing generated by the App should be interpreted as:
Trading advice
Buy/sell recommendations
Investment research
Risk management advice
2.3. Any output generated is purely programmatic/code output based on user instructions.

3. User Responsibility
The User understands and agrees:
3.1. You are fully responsible for verifying, testing, and validating any code generated by the App.
3.2. You are responsible for:
Backtesting the code
Evaluating risks
Complying with regulations
Monitoring trades
3.3. The App is not liable for:
Losses from automated or manual trades
Errors in code
Technical failures
Loss of capital
3.4. If you choose to deploy code that connects to any broker (e.g., Zerodha, AngelOne, Dhan, Upstox, etc.), you take full responsibility for the integration.

4. No Guarantee of Performance
4.1. The App does NOT guarantee:
Profit
Accuracy
Stability
Market predictions
Future performance
4.2. All market data, analysis, and code are informational and experimental.

5. Regulatory Compliance
5.1. The User agrees to follow all SEBI, exchange, and broker rules.
5.2. The User acknowledges that:
Automated trading may require approvals from brokers/exchanges.
The App does not bypass any compliance requirements.
The User must ensure their trading setup follows proper regulations.

6. External Integrations & APIs
6.1. The App may allow integration with third-party platforms (brokers, data providers, etc.).
6.2. The App does NOT manage your API keys or trading accounts.
6.3. The User is responsible for:
Securing their credentials
Managing API limits
Ensuring connection safety
6.4. The App is not responsible for any malfunction or loss due to third-party services.

7. User Conduct
Users must NOT use the App:
To manipulate markets
For unlawful activities
To create malicious code
To bypass regulatory requirements
Improper usage may lead to termination of access.

8. Intellectual Property
8.1. The App’s interface, features, algorithms, and software are the property of [Your Company Name].
8.2. Code generated for the user belongs to the user, but the App maintains its platform rights.

9. Limitation of Liability
To the maximum extent permitted by law:
The App is provided "as is" and "as available".
The company is not liable for any direct, indirect, incidental, or consequential losses.
Trading involves high financial risk, and the User agrees to use the App entirely at their own risk.

10. Indemnification
The User agrees to indemnify and hold harmless the App, its owners, and developers from any claims, losses, legal actions, or damages arising from:
Use of generated code
Automated trading losses
Regulatory violations
Unauthorized API usage

11. Modifications to Terms
The App may update these Terms at any time. Continued use after modifications means you accept the updated Terms.
					</div>
					<label className="void-flex void-items-start void-gap-2 void-text-xs void-text-void-fg-3 void-mt-2">
						<input
							type="checkbox"
							checked={acceptedTerms}
							onChange={(e) => setAcceptedTerms(e.target.checked)}
							className="void-mt-0.5"
						/>
						<span>I agree to the Terms & Conditions above</span>
					</label>
				</div>
				{error && <div className="void-text-red-400 void-text-xs void-mb-2">{String(error)}</div>}
				<button
					disabled={loading || !acceptedTerms}
					onClick={submit}
					className={`void-w-full void-py-2 void-rounded ${loading ? 'void-opacity-70' : ''} void-bg-white void-text-black`}
				>
					{loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
				</button>
				<div className="void-text-xs void-text-void-fg-3 void-mt-3">
					{mode === 'login' ? (
						<>
							No account?{' '}
							<button className="void-underline" onClick={() => setMode('signup')}>
								Sign up
							</button>
						</>
					) : (
						<>
							Have an account?{' '}
							<button className="void-underline" onClick={() => setMode('login')}>
								Log in
							</button>
						</>
					)}
				</div>

				<div className="void-my-3 void-flex void-items-center void-gap-2">
					<div className="void-h-px void-bg-void-border-3 void-flex-1" />
					<div className="void-text-void-fg-3 void-text-xs">or</div>
					<div className="void-h-px void-bg-void-border-3 void-flex-1" />
				</div>
				<button
					disabled={loading || !googleClientId || !googleReady || !acceptedTerms}
					onClick={loginWithGoogle}
					className={`void-w-full void-py-2 void-rounded ${loading ? 'void-opacity-70' : ''} void-bg-white void-text-black`}
				>
					Continue with Google
				</button>
			</div>
		</div>
	)
}

