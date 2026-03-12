import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'framer-motion';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  const toggle = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <motion.button
      onClick={toggle}
      className="theme-toggle-btn"
      title={resolvedTheme === 'dark' ? '切换到浅色模式' : '切换到暗黑模式'}
      aria-label={resolvedTheme === 'dark' ? '切换到浅色模式' : '切换到暗黑模式'}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        color: 'var(--text-muted)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      {resolvedTheme === 'dark' ? (
        <Sun size={20} strokeWidth={2} />
      ) : (
        <Moon size={20} strokeWidth={2} />
      )}
    </motion.button>
  );
}
