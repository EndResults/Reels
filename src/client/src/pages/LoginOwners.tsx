import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Shield } from 'lucide-react';
import Logo from '../components/Logo';
import api, { authAPI, authStorage, LoginData } from '../services/api';

const LoginOwners: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const payload: LoginData = { email: formData.email, password: formData.password };
      const res = await authAPI.loginUser(payload);
      if (res.data?.success && res.data?.data) {
        authStorage.setToken(res.data.data.token);
        if (res.data.data.user) authStorage.setUser(res.data.data.user);
        // Fetch profile to check ADMIN
        try {
          const base = String(api.defaults.baseURL || '').replace(/\/+$/, '');
          const profileRes = await fetch(base + '/consumer/profile', {
            credentials: 'include',
            headers: { 'Authorization': `Bearer ${res.data.data.token}` }
          });
          if (profileRes.ok) {
            const json = await profileRes.json();
            const userType = json?.profile?.user_type;
            if (userType === 'ADMIN') {
              navigate('/owner/dashboard');
              return;
            }
          }
        } catch {}
        navigate('/customer/dashboard');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Inloggen mislukt');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Logo className="h-12 w-auto" variant="light" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-dark-900">
          Owner login
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Alleen voor beheerders (URL niet in navigatie zichtbaar)
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                E-mail
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="jij@bedrijf.nl"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Wachtwoord
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button type="submit" disabled={isLoading} className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                {isLoading ? 'Bezig met inloggen...' : 'Inloggen'}
              </button>
            </div>

            <div className="text-center text-xs text-gray-500">
              <div className="inline-flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>Deze pagina staat niet in de navigatie</span>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginOwners;
