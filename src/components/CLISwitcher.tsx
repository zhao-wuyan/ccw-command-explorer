import { useState } from 'react';
import { useCLI } from '../contexts/CLIContext';
import { useColors } from '../contexts/ColorsContext';

export function CLISwitcher() {
  const { currentCLI, setCurrentCLI } = useCLI();
  const COLORS = useColors();
  const [isHovered, setIsHovered] = useState(false);

  const toggleCLI = () => {
    setCurrentCLI(currentCLI === 'claude' ? 'codex' : 'claude');
  };

  return (
    <button
      onClick={toggleCLI}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        borderRadius: 10,
        border: `1px solid ${isHovered ? (currentCLI === 'claude' ? '#d97706' : '#10b981') : COLORS.cardBorder}`,
        backgroundColor: isHovered
          ? (currentCLI === 'claude' ? 'rgba(217, 119, 6, 0.1)' : 'rgba(16, 185, 129, 0.1)')
          : 'transparent',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        fontSize: 14,
        fontWeight: 500,
        color: currentCLI === 'claude' ? '#d97706' : '#10b981',
      }}
      title={`当前: ${currentCLI === 'claude' ? 'Claude Code' : 'Codex'} - 点击切换`}
    >
      {currentCLI === 'claude' ? (
        <>
          <span style={{ fontSize: 16 }}>🟠</span>
          <span>Claude</span>
        </>
      ) : (
        <>
          <span style={{ fontSize: 16 }}>🟢</span>
          <span>Codex</span>
        </>
      )}
    </button>
  );
}
