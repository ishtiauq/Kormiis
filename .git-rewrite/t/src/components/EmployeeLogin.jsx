import { useState } from 'react'
import { LogIn, ArrowLeft, Shield, Activity, Lock, Eye, EyeOff, Users } from 'lucide-react'
import { verifyPassword } from '../services/crypto.js'

export default function EmployeeLogin({ onLogin, onBack }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const storedEmployees = localStorage.getItem('hr_pulse_employees_plain')
      if (!storedEmployees) {
        setError('No employee data found. Please contact your HR department.')
        setIsLoading(false)
        return
      }

      const employees = JSON.parse(storedEmployees)
      const employee = employees.find(e => e.email === email)

      if (!employee) {
        setError('Invalid email or password.')
        setIsLoading(false)
        return
      }

      const valid = await verifyPassword(password, employee.passwordHash || employee.password)
      if (!valid) {
        setError('Invalid email or password.')
        setIsLoading(false)
        return
      }

      const hrToken = localStorage.getItem('hr_pulse_hr_token')

      const employeeUser = {
        name: employee.name,
        email: employee.email,
        role: employee.role || 'Employee',
        department: employee.department,
        avatar: employee.avatar || '',
        isEmployee: true,
        employeeId: employee.id,
        token: hrToken || ''
      }

      onLogin(employeeUser)
    } catch (err) {
      setError('Login failed: ' + err.message)
      setIsLoading(false)
    }
  }

  return (
    <div className="welcome-screen-wrapper p-4 sm:p-6 lg:p-10">
      <div className="welcome-brand">
        <div className="welcome-logo-box">
          <Activity size={24} color="#fff" />
        </div>
        <div>
          <span className="welcome-title">HR Pulse</span>
          <span className="welcome-tagline">EMPLOYEE LOGIN</span>
        </div>
      </div>

      <div className="welcome-center-content">
        <button onClick={onBack} className="btn btn-outline flex items-center gap-1.5 mb-6 px-4 py-2 rounded-lg bg-transparent cursor-pointer"
          style={{ border: '1px solid var(--color-md-sys-outline-variant)', color: 'var(--text-secondary)', font: "500 13px 'Roboto'" }}>
          <ArrowLeft size={16} />
          Back to HR Manager Login
        </button>

        <h1 className="welcome-heading mb-2" style={{ fontSize: 'var(--fs-headline-large)' }}>
          Employee <span className="welcome-accent">Login</span>
        </h1>
        <p className="mb-8" style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-body-medium)' }}>
          Sign in with your company credentials
        </p>

        <form onSubmit={handleSubmit} aria-label="Employee login form" className="w-full max-w-[400px] p-6 sm:p-8">
          {error && (
            <div className="px-4 py-3 rounded-lg mb-4 bg-[rgba(224,32,20,0.08)] text-[#E02014]"
              style={{ border: '1px solid rgba(224, 32, 20, 0.2)', fontSize: 'var(--fs-label-small)' }}>
              {error}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="emp-email" className="block mb-1.5" style={{ font: "500 13px 'Roboto'", color: 'var(--text-secondary)' }}>
              Email Address
            </label>
            <input
              id="emp-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              className="w-full px-4 py-3 rounded-[10px] outline-none"
              style={{
                border: '1px solid var(--color-md-sys-outline-variant)',
                background: 'var(--color-md-sys-surface)',
                color: 'var(--text-primary)',
                font: "400 14px 'Roboto'",
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div className="mb-6">
            <label htmlFor="emp-password" className="block mb-1.5" style={{ font: "500 13px 'Roboto'", color: 'var(--text-secondary)' }}>
              Password
            </label>
            <div className="relative">
              <input
                id="emp-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full py-3 pl-4 pr-10 rounded-[10px] outline-none"
                style={{
                  border: '1px solid var(--color-md-sys-outline-variant)',
                  background: 'var(--color-md-sys-surface)',
                  color: 'var(--text-primary)',
                  font: "400 14px 'Roboto'",
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="connect-btn w-full justify-center mb-4 px-5 sm:px-6 py-3 sm:py-3.5"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
            {!isLoading && <LogIn size={16} />}
          </button>

          <button
            type="button"
            onClick={onBack}
            className="btn btn-outline w-full justify-center flex items-center gap-1.5"
          >
            <ArrowLeft size={16} />
            Back to HR Manager Login
          </button>
        </form>
      </div>

      <style>{`
        .welcome-screen-wrapper {
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: var(--bg-primary);
          font-family: var(--font-sans);
          position: relative;
          overflow: hidden;
        }

        .welcome-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          z-index: 2;
        }

        .welcome-logo-box {
          width: 44px;
          height: 44px;
          background: var(--accent-primary);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(232, 93, 74, 0.35);
        }

        .welcome-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text-primary);
          display: block;
          line-height: 1.1;
        }

        .welcome-tagline {
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--accent-primary);
          letter-spacing: 0.1em;
          display: block;
        }

        .welcome-center-content {
          max-width: 900px;
          margin: auto;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
          z-index: 2;
        }

        .welcome-heading {
          font-size: 3rem;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1.15;
          letter-spacing: -0.02em;
          font-family: var(--font-display);
        }

        .welcome-accent {
          color: var(--color-accent);
        }

        .connect-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--color-accent);
          color: #ffffff;
          border: none;
          border-radius: 14px;
          font-size: 1.05rem;
          cursor: pointer;
          transition: background-color var(--dur-short) var(--ease-out), transform var(--dur-micro) var(--ease-out);
          box-shadow: 0 4px 12px var(--color-accent-glow);
        }

        .connect-btn:hover {
          transform: translateY(-1px);
          background: var(--color-accent-hover);
        }

        .connect-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .welcome-small-text {
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        @media (max-width: 850px) {
          .welcome-heading {
            font-size: 2.25rem;
          }
        }

        @media (max-width: 480px) {
          .welcome-screen-wrapper {
            justify-content: center;
          }
          .welcome-heading {
            font-size: 1.5rem;
          }
          .welcome-center-content {
            gap: 16px;
          }
          .connect-btn {
            font-size: 0.95rem;
          }
        }
      `}</style>
    </div>
  )
}


