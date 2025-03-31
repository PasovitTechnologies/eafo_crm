import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import { jwtDecode } from 'jwt-decode';
import { useTranslation } from 'react-i18next';
import './AuthForm.css';

const LoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const baseUrl = import.meta.env.VITE_BASE_URL;

  // Configure toast notifications with white text
  const notify = {
    success: (message) => toast.success(message, {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      className: 'toast-notification',
      style: { color: '#ffffff' }
    }),
    error: (message) => toast.error(message, {
      position: "top-right",
      autoClose: 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      className: 'toast-notification',
      style: { color: '#ffffff' }
    }),
    info: (message) => toast.info(message, {
      position: "top-right",
      autoClose: 2000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      className: 'toast-notification',
      style: { color: '#ffffff' }
    })
  };

  // Validate JWT token
  const validateToken = (token) => {
    try {
      const decoded = jwtDecode(token);
      const isValid = decoded.exp > Date.now() / 1000;

      if (!isValid) {
        localStorage.removeItem('token');
        notify.error(t('loginPage.sessionExpired'));
      }

      setIsLoggedIn(isValid);
      return isValid;
    } catch (error) {
      console.error('Token validation failed:', error);
      localStorage.removeItem('token');
      setIsLoggedIn(false);
      notify.error(t('loginPage.invalidToken'));
      return false;
    }
  };

  // Check for existing valid token on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      notify.info(t('loginPage.checkingSession'));
      validateToken(token);
    }
  }, []);

  // Redirect if logged in
  useEffect(() => {
    if (isLoggedIn) {
      notify.success(t('loginPage.welcomeBack'));
      setTimeout(() => navigate('/dashboard'), 1500);
    }
  }, [isLoggedIn, navigate]);

  // Email validation
  const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isValidEmail(email)) {
      notify.error(t('loginPage.validEmail'));
      return;
    }

    if (password.length < 8) {
      notify.error(t('loginPage.validPassword'));
      return;
    }

    setLoading(true);
    
    try {
      const response = await axios.post(`${baseUrl}/api/user/login`, {
        email,
        password,
      });

      const { token } = response.data;
      if (!token) {
        throw new Error(t('loginPage.invalidResponse'));
      }

      localStorage.setItem('token', token);
      localStorage.setItem('email', email);
      setIsLoggedIn(true);

      notify.success(t('loginPage.loginSuccess'));

    } catch (error) {
      const errorMessage = error.response?.data?.message || t('loginPage.loginFailed');
      notify.error(errorMessage);
      
      // Clear form on error
      if (error.response?.status === 401) {
        setPassword('');
      }
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = email && password;

  return (
      
      <form onSubmit={handleSubmit} className="login-form" style={{ zIndex: 20 }}>
        <h1>{t('loginPage.title')}</h1>

        {/* Email Input */}
        <div className="input-box">
          <input
            type="email"
            placeholder={t('loginPage.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-label={t('loginPage.emailAriaLabel')}
          />
        </div>

        {/* Password Input */}
        <div className="input-box">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder={t('loginPage.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-label={t('loginPage.passwordAriaLabel')}
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => {
              setShowPassword(!showPassword);
              notify.info(
                showPassword 
                  ? t('loginPage.passwordHidden') 
                  : t('loginPage.passwordVisible')
              );
            }}
            aria-label={showPassword ? t('loginPage.hidePassword') : t('loginPage.showPassword')}
            style={{ zIndex: 30 }}
          >
            {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
          </button>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="button"
          disabled={loading || !isFormValid}
          aria-busy={loading}
          style={{ zIndex: 20 }}
        >
          {loading ? t('loginPage.loading') : t('loginPage.loginButton')}
        </button>
        <ToastContainer 
        style={{ color: '#ffffff' }}
        toastStyle={{ color: '#ffffff' }}
      />
      </form>
    
  );
};

export default LoginPage;