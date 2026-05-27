import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider, theme } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import App from './App'
import { ThemeProvider, useTheme } from './theme/ThemeContext'
import './index.css'

const lightTokens = {
  colorPrimary: '#1677ff',
  borderRadius: 8,
  colorBgLayout: '#f0f2f5',
  colorBgContainer: '#ffffff',
  colorBgElevated: '#ffffff',
  colorBorder: '#d9d9d9',
  colorText: '#000000',
  colorTextSecondary: '#666666',
  colorTextTertiary: '#999999',
  colorLink: '#1677ff',
  colorLinkHover: '#4096ff',
  colorSuccess: '#52c41a',
  colorWarning: '#faad14',
  colorError: '#ff4d4f',
  colorInfo: '#1677ff',
}

const darkTokens = {
  colorPrimary: '#1677ff',
  borderRadius: 8,
  colorBgContainer: '#252526',
  colorBgElevated: '#2d2d30',
  colorBgLayout: '#1e1e1e',
  colorBgSpotlight: '#3e3e42',
  colorBorder: '#3e3e42',
  colorText: '#e0e0e0',
  colorTextSecondary: '#a0a0a0',
  colorTextTertiary: '#6e6e6e',
  colorBgTextHover: 'rgba(255,255,255,0.06)',
  colorBgTextActive: 'rgba(255,255,255,0.1)',
  colorLink: '#4da3ff',
  colorLinkHover: '#7ab8ff',
  colorSuccess: '#52c41a',
  colorWarning: '#faad14',
  colorError: '#ff4d4f',
  colorInfo: '#1677ff',
  colorPrimaryHover: '#4096ff',
  colorPrimaryActive: '#0958d9',
  colorPrimaryBorder: '#1668dc',
  controlItemBgHover: 'rgba(255,255,255,0.06)',
  controlItemBgActive: 'rgba(22,119,255,0.2)',
  controlItemBgActiveHover: 'rgba(22,119,255,0.25)',
}

const ThemedApp: React.FC = () => {
  const { isDark } = useTheme()
  return (
    <ConfigProvider
      locale={ruRU}
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: isDark ? darkTokens : lightTokens,
      }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  </React.StrictMode>,
)
