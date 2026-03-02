import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, Home, GitBranch, Users, AlertCircle, Database,
  Lightbulb, TestTube, FlaskConical, Search as SearchIcon, Palette,
  Wrench, X, Clock, Target, Sparkles, BookOpen, Info, Bot, Play,
  ChevronRight, Terminal, MessageSquare, CheckCircle, AlertTriangle,
  Lightbulb as TipIcon
} from 'lucide-react';
import {
  COMMANDS, CATEGORIES, TIMELINE, WORKFLOW_LEVELS, GRANDMA_COMMANDS,
  DEPRECATED_COMMANDS, STATS, COLORS, CLI_CONFIG, EXPERIENCE_GUIDE
} from './data/commands';
import type { Command, CommandCategory, TimelineItem, CLIType, ExperienceTip, ExperienceCategory } from './data/commands';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { ALL_CASES, CASES_BY_LEVEL, LEVEL_CONFIG } from './data/cases';
import type { Case, CaseStep } from './data/cases';
import './App.css';

// 图标映射
const ICON_MAP: Record<string, React.ReactNode> = {
  Home: <Home size={18} />,
  GitBranch: <GitBranch size={18} />,
  Users: <Users size={18} />,
  AlertCircle: <AlertCircle size={18} />,
  Database: <Database size={18} />,
  Lightbulb: <Lightbulb size={18} />,
  TestTube: <TestTube size={18} />,
  FlaskConical: <FlaskConical size={18} />,
  Search: <SearchIcon size={18} />,
  Palette: <Palette size={18} />,
  Wrench: <Wrench size={18} />,
  Bot: <Bot size={18} />,
};

// 状态徽章
const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { bg: string; color: string; text: string }> = {
    new: { bg: COLORS.secondary + '30', color: COLORS.secondary, text: 'NEW' },
    stable: { bg: COLORS.primary + '30', color: COLORS.primaryLight, text: '稳定' },
    recommended: { bg: COLORS.accent1 + '30', color: COLORS.accent1, text: '推荐' },
    deprecated: { bg: COLORS.danger + '30', color: COLORS.danger, text: '废弃' },
  };
  const c = config[status] || config.stable;
  return (
    <span
      style={{
        fontSize: 11,
        padding: '3px 8px',
        borderRadius: 4,
        backgroundColor: c.bg,
        color: c.color,
        fontWeight: 600,
        letterSpacing: '0.5px',
      }}
    >
      {c.text}
    </span>
  );
};

// CLI 类型徽章
const CLIBadge = ({ cli }: { cli: CLIType }) => {
  const config = CLI_CONFIG[cli];
  return (
    <span
      style={{
        fontSize: 10,
        padding: '2px 6px',
        borderRadius: 4,
        backgroundColor: config.color + '25',
        color: config.color,
        fontWeight: 700,
        letterSpacing: '0.3px',
        border: `1px solid ${config.color}40`,
      }}
      title={config.label}
    >
      {config.shortLabel}
    </span>
  );
};

// 命令卡片组件
const CommandCard = ({ command, onClick }: { command: Command; onClick: () => void }) => {
  const category = CATEGORIES[command.category];
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      style={{
        backgroundColor: isHovered ? 'rgba(255,255,255,0.08)' : COLORS.cardBg,
        borderRadius: 12,
        padding: '16px 20px',
        border: `1px solid ${isHovered ? category.color + '60' : COLORS.cardBorder}`,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
        <CLIBadge cli={command.cli} />
        <code
          style={{
            fontSize: 15,
            color: category.color,
            fontWeight: 600,
            backgroundColor: 'rgba(0,0,0,0.4)',
            padding: '4px 12px',
            borderRadius: 6,
          }}
        >
          {command.cmd}
        </code>
        <StatusBadge status={command.status} />
        {command.level && (
          <span
            style={{
              fontSize: 12,
              padding: '2px 8px',
              borderRadius: 4,
              backgroundColor: WORKFLOW_LEVELS[command.level - 1].color + '20',
              color: WORKFLOW_LEVELS[command.level - 1].color,
            }}
          >
            Lv.{command.level}
          </span>
        )}
      </div>
      <p style={{ fontSize: 14, color: COLORS.textMuted, margin: 0 }}>
        {command.desc}
      </p>
    </motion.div>
  );
};

// ============================================
// 命令详情弹窗 - 带左侧案例/右侧经验侧边面板
// ============================================

// 反向查找：此命令相关的案例
function getRelatedCases(cmd: string): Case[] {
  return ALL_CASES.filter(c =>
    c.commands.some(cc => cc.cmd === cmd)
  );
}

// 反向查找：此命令相关的经验
function getRelatedExperiences(cmd: string): { category: ExperienceCategory; tip: ExperienceTip }[] {
  const result: { category: ExperienceCategory; tip: ExperienceTip }[] = [];
  for (const cat of EXPERIENCE_GUIDE) {
    for (const tip of cat.tips) {
      if (tip.commands.includes(cmd)) {
        result.push({ category: cat, tip });
      }
    }
  }
  return result;
}

// 二次弹框：案例详情（轻量版，用于命令详情内嵌）
const CasePopup = ({
  caseItem,
  onClose,
}: {
  caseItem: Case;
  onClose: () => void;
}) => {
  const levelConfig = LEVEL_CONFIG[String(caseItem.level)] || LEVEL_CONFIG['2'];
  return (
    <motion.div
      key={caseItem.id}
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ duration: 0.18 }}
      onClick={(e) => e.stopPropagation()}
      style={{
        backgroundColor: '#1a1a2e',
        borderRadius: 16,
        padding: '20px 24px',
        border: `2px solid ${levelConfig.color}50`,
        width: '100%',
        maxHeight: 420,
        overflow: 'auto',
        boxShadow: `0 8px 40px rgba(0,0,0,0.6)`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>{levelConfig.emoji}</span>
          <span style={{ fontSize: 13, color: levelConfig.color, fontWeight: 600,
            backgroundColor: levelConfig.color + '20', padding: '3px 10px', borderRadius: 8 }}>
            {levelConfig.name}
          </span>
          <span style={{ fontSize: 12, color: COLORS.textDim }}>{caseItem.category}</span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', padding: 4 }}>
          <X size={18} />
        </button>
      </div>
      <h3 style={{ fontSize: 16, color: COLORS.text, margin: '0 0 8px 0' }}>{caseItem.title}</h3>
      <p style={{ fontSize: 13, color: COLORS.textMuted, margin: '0 0 12px 0' }}>{caseItem.scenario}</p>
      <div>
        {caseItem.steps.slice(0, 5).map((step, i) => {
          const typeColors: Record<string, string> = {
            command: '#6366f1', response: '#10b981', result: '#10b981',
            note: '#f59e0b', choice: '#8b5cf6',
          };
          const c = typeColors[step.type || ''] || '#666';
          return (
            <div key={i} style={{
              backgroundColor: c + '12',
              borderLeft: `2px solid ${c}50`,
              borderRadius: 6,
              padding: '8px 12px',
              marginBottom: 6,
              fontSize: 12,
              color: step.type === 'command' ? COLORS.secondary : COLORS.text,
              fontFamily: step.type === 'command' ? 'monospace' : 'inherit',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: 1.5,
            }}>
              <span style={{ fontSize: 10, color: COLORS.textDim, marginRight: 6 }}>
                {step.role === 'user' ? '👤' : '🤖'}
              </span>
              {step.content.length > 120 ? step.content.slice(0, 120) + '…' : step.content}
            </div>
          );
        })}
        {caseItem.steps.length > 5 && (
          <p style={{ fontSize: 11, color: COLORS.textDim, margin: '4px 0 0 0' }}>…还有 {caseItem.steps.length - 5} 步</p>
        )}
      </div>
    </motion.div>
  );
};

// 二次弹框：经验详情（轻量版）
const ExperiencePopup = ({
  item,
  onClose,
}: {
  item: { category: ExperienceCategory; tip: ExperienceTip };
  onClose: () => void;
}) => {
  const { category, tip } = item;
  const isSequence = tip.commandType === 'sequence';
  return (
    <motion.div
      key={tip.id}
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ duration: 0.18 }}
      onClick={(e) => e.stopPropagation()}
      style={{
        backgroundColor: '#1a1a2e',
        borderRadius: 16,
        padding: '20px 24px',
        border: `2px solid ${category.color}50`,
        width: '100%',
        maxHeight: 420,
        overflow: 'auto',
        boxShadow: `0 8px 40px rgba(0,0,0,0.6)`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{category.emoji}</span>
          <span style={{ fontSize: 12, color: category.color, fontWeight: 600,
            backgroundColor: category.color + '20', padding: '2px 8px', borderRadius: 6 }}>
            {isSequence ? '按顺序执行' : '多选一'}
          </span>
          <span style={{ fontSize: 11, color: COLORS.textDim }}>{category.title}</span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', padding: 4 }}>
          <X size={18} />
        </button>
      </div>
      <h3 style={{ fontSize: 16, color: COLORS.text, margin: '0 0 6px 0' }}>{tip.title}</h3>
      <p style={{ fontSize: 13, color: COLORS.textMuted, margin: '0 0 12px 0' }}>{tip.scenario}</p>
      <div style={{ fontSize: 13, color: COLORS.text, marginBottom: 12, lineHeight: 1.6 }}>{tip.recommendation}</div>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {tip.commands.map((cmd, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <code style={{
              fontSize: 12, color: category.color,
              backgroundColor: category.color + '20',
              padding: '3px 8px', borderRadius: 4,
            }}>{cmd}</code>
            {isSequence && i < tip.commands.length - 1 && (
              <span style={{ color: COLORS.textDim, fontSize: 12 }}>→</span>
            )}
          </span>
        ))}
      </div>
      {tip.reason && (
        <p style={{ fontSize: 12, color: COLORS.textDim, margin: 0, fontStyle: 'italic' }}>{tip.reason}</p>
      )}
      {tip.tips && tip.tips.length > 0 && (
        <ul style={{ margin: '8px 0 0 0', paddingLeft: 18 }}>
          {tip.tips.map((t, i) => (
            <li key={i} style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 4 }}>{t}</li>
          ))}
        </ul>
      )}
    </motion.div>
  );
};

// 侧边面板条目
const SidePanelItem = ({
  label,
  sub,
  color,
  isActive,
  onClick,
}: {
  label: string;
  sub: string;
  color: string;
  isActive: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    style={{
      display: 'block',
      width: '100%',
      textAlign: 'left',
      background: isActive ? color + '20' : 'transparent',
      border: `1px solid ${isActive ? color + '60' : color + '20'}`,
      borderRadius: 8,
      padding: '8px 10px',
      cursor: 'pointer',
      transition: 'all 0.15s',
      marginBottom: 6,
    }}
    onMouseEnter={(e) => {
      if (!isActive) {
        e.currentTarget.style.background = color + '15';
        e.currentTarget.style.borderColor = color + '40';
      }
    }}
    onMouseLeave={(e) => {
      if (!isActive) {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.borderColor = color + '20';
      }
    }}
  >
    <div style={{ fontSize: 12, color: isActive ? color : COLORS.text, fontWeight: isActive ? 600 : 400,
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {label}
    </div>
    {sub && (
      <div style={{ fontSize: 11, color: COLORS.textDim, marginTop: 2,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {sub}
      </div>
    )}
  </button>
);

// 命令详情弹窗
const CommandDetail = ({ command, onClose }: { command: Command; onClose: () => void }) => {
  const category = CATEGORIES[command.category];
  const relatedCommands = COMMANDS.filter(
    c => c.category === command.category && c.cmd !== command.cmd
  ).slice(0, 5);

  // 反向关联
  const relatedCases = useMemo(() => getRelatedCases(command.cmd), [command.cmd]);
  const relatedExperiences = useMemo(() => getRelatedExperiences(command.cmd), [command.cmd]);

  // 二次弹框状态
  const [activeCase, setActiveCase] = useState<Case | null>(null);
  const [activeExp, setActiveExp] = useState<{ category: ExperienceCategory; tip: ExperienceTip } | null>(null);

  // 检测移动端
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleCaseClick = (c: Case) => {
    setActiveExp(null);
    setActiveCase(prev => prev?.id === c.id ? null : c);
  };

  const handleExpClick = (e: { category: ExperienceCategory; tip: ExperienceTip }) => {
    setActiveCase(null);
    setActiveExp(prev => prev?.tip.id === e.tip.id ? null : e);
  };

  const SIDE_WIDTH = 160;
  const hasCases = relatedCases.length > 0;
  const hasExps = relatedExperiences.length > 0;
  const hasSides = hasCases || hasExps;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
        padding: isMobile ? '12px 0 0 0' : 20,
        overflow: isMobile ? 'auto' : 'hidden',
      }}
      onClick={onClose}
    >
      {/* 桌面端：三列布局 */}
      {!isMobile ? (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            maxWidth: hasSides ? 960 : 640,
            width: '100%',
            maxHeight: '90vh',
          }}
        >
          {/* 左侧：案例面板 */}
          {hasCases && (
            <div style={{
              width: SIDE_WIDTH,
              flexShrink: 0,
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{
                backgroundColor: 'rgba(18,18,38,0.95)',
                borderRadius: 14,
                padding: '14px 12px',
                border: `1px solid ${COLORS.accent3}30`,
                maxHeight: '90vh',
                overflow: 'auto',
              }}>
                <div style={{ fontSize: 12, color: COLORS.accent3, fontWeight: 600, marginBottom: 10,
                  display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Play size={12} />
                  关联案例 ({relatedCases.length})
                </div>
                {relatedCases.map((c) => {
                  const lc = LEVEL_CONFIG[String(c.level)] || LEVEL_CONFIG['2'];
                  return (
                    <SidePanelItem
                      key={c.id}
                      label={c.title}
                      sub={`${lc.emoji} ${lc.name}`}
                      color={lc.color}
                      isActive={activeCase?.id === c.id}
                      onClick={() => handleCaseClick(c)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* 中间：命令详情 + 二次弹框 */}
          <div style={{ flex: 1, minWidth: 0, maxHeight: '90vh', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* 命令详情主体 */}
            <div style={{
              backgroundColor: '#1a1a2e',
              borderRadius: 20,
              padding: 30,
              overflow: 'auto',
              border: `2px solid ${category.color}40`,
              flex: activeCase || activeExp ? '0 0 auto' : '1',
              maxHeight: activeCase || activeExp ? '45vh' : '90vh',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <code style={{
                    fontSize: 24, color: category.color, fontWeight: 'bold',
                    backgroundColor: 'rgba(0,0,0,0.4)', padding: '8px 16px', borderRadius: 8, display: 'inline-block',
                  }}>
                    {command.cmd}
                  </code>
                </div>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', padding: 5 }}>
                  <X size={24} />
                </button>
              </div>

              <p style={{ fontSize: 18, color: COLORS.text, marginBottom: 20 }}>{command.desc}</p>

              <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6,
                  backgroundColor: CLI_CONFIG[command.cli].color + '25', color: CLI_CONFIG[command.cli].color,
                  fontWeight: 600, border: `1px solid ${CLI_CONFIG[command.cli].color}40` }}>
                  {CLI_CONFIG[command.cli].label}
                </span>
                <StatusBadge status={command.status} />
                <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6,
                  backgroundColor: category.color + '20', color: category.color }}>
                  {category.label}
                </span>
                {command.level && (
                  <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6,
                    backgroundColor: WORKFLOW_LEVELS[command.level - 1].color + '20',
                    color: WORKFLOW_LEVELS[command.level - 1].color }}>
                    复杂度 Level {command.level}
                  </span>
                )}
              </div>

              {command.detail && (
                <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 16, marginBottom: 20, borderLeft: `4px solid ${category.color}` }}>
                  <h4 style={{ color: COLORS.text, marginBottom: 8, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BookOpen size={16} style={{ color: category.color }} />
                    详细说明
                  </h4>
                  <p style={{ color: COLORS.textMuted, fontSize: 14, margin: 0, lineHeight: 1.7 }}>{command.detail}</p>
                </div>
              )}

              {command.usage && (
                <div style={{ backgroundColor: category.color + '10', borderRadius: 12, padding: 16, marginBottom: 20, border: `1px solid ${category.color}30` }}>
                  <h4 style={{ color: COLORS.text, marginBottom: 8, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    💡 使用场景
                  </h4>
                  <p style={{ color: COLORS.text, fontSize: 14, margin: 0, lineHeight: 1.7 }}>{command.usage}</p>
                </div>
              )}

              {command.level && (
                <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                  <h4 style={{ color: COLORS.text, marginBottom: 8, fontSize: 14 }}>💡 适用场景</h4>
                  <p style={{ color: COLORS.textMuted, fontSize: 14, margin: 0 }}>{WORKFLOW_LEVELS[command.level - 1].useCase}</p>
                </div>
              )}

              {relatedCommands.length > 0 && (
                <div>
                  <h4 style={{ color: COLORS.textMuted, marginBottom: 12, fontSize: 14 }}>相关命令</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {relatedCommands.map((c, i) => (
                      <code key={i} style={{ fontSize: 13, color: CATEGORIES[c.category].color, backgroundColor: 'rgba(0,0,0,0.3)', padding: '4px 10px', borderRadius: 4 }}>
                        {c.cmd}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 二次弹框：案例或经验详情 */}
            <AnimatePresence mode="wait">
              {activeCase && (
                <CasePopup key={activeCase.id} caseItem={activeCase} onClose={() => setActiveCase(null)} />
              )}
              {activeExp && (
                <ExperiencePopup key={activeExp.tip.id} item={activeExp} onClose={() => setActiveExp(null)} />
              )}
            </AnimatePresence>
          </div>

          {/* 右侧：经验面板 */}
          {hasExps && (
            <div style={{
              width: SIDE_WIDTH,
              flexShrink: 0,
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{
                backgroundColor: 'rgba(18,18,38,0.95)',
                borderRadius: 14,
                padding: '14px 12px',
                border: `1px solid ${COLORS.accent1}30`,
                maxHeight: '90vh',
                overflow: 'auto',
              }}>
                <div style={{ fontSize: 12, color: COLORS.accent1, fontWeight: 600, marginBottom: 10,
                  display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TipIcon size={12} />
                  关联经验 ({relatedExperiences.length})
                </div>
                {relatedExperiences.map((e) => (
                  <SidePanelItem
                    key={e.tip.id}
                    label={e.tip.title}
                    sub={`${e.category.emoji} ${e.category.title}`}
                    color={e.category.color}
                    isActive={activeExp?.tip.id === e.tip.id}
                    onClick={() => handleExpClick(e)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 移动端：垂直堆叠 */
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxHeight: '100vh',
            overflow: 'auto',
            padding: '0 12px 24px 12px',
          }}
        >
          {/* 命令详情主体 */}
          <div style={{
            backgroundColor: '#1a1a2e',
            borderRadius: 20,
            padding: 20,
            border: `2px solid ${category.color}40`,
            marginBottom: 12,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <code style={{ fontSize: 18, color: category.color, fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.4)', padding: '6px 12px', borderRadius: 8, display: 'inline-block' }}>
                {command.cmd}
              </code>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', padding: 5 }}>
                <X size={22} />
              </button>
            </div>
            <p style={{ fontSize: 16, color: COLORS.text, marginBottom: 16 }}>{command.desc}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5,
                backgroundColor: CLI_CONFIG[command.cli].color + '25', color: CLI_CONFIG[command.cli].color,
                fontWeight: 600, border: `1px solid ${CLI_CONFIG[command.cli].color}40` }}>
                {CLI_CONFIG[command.cli].label}
              </span>
              <StatusBadge status={command.status} />
              <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, backgroundColor: category.color + '20', color: category.color }}>
                {category.label}
              </span>
            </div>
            {command.detail && (
              <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 12, marginBottom: 12, borderLeft: `3px solid ${category.color}` }}>
                <p style={{ color: COLORS.textMuted, fontSize: 13, margin: 0, lineHeight: 1.6 }}>{command.detail}</p>
              </div>
            )}
            {command.usage && (
              <div style={{ backgroundColor: category.color + '10', borderRadius: 10, padding: 12, border: `1px solid ${category.color}30` }}>
                <p style={{ color: COLORS.text, fontSize: 13, margin: 0, lineHeight: 1.6 }}>{command.usage}</p>
              </div>
            )}
          </div>

          {/* 移动端：案例面板 */}
          {hasCases && (
            <div style={{
              backgroundColor: 'rgba(18,18,38,0.95)',
              borderRadius: 14,
              padding: '12px 14px',
              border: `1px solid ${COLORS.accent3}30`,
              marginBottom: 10,
            }}>
              <div style={{ fontSize: 12, color: COLORS.accent3, fontWeight: 600, marginBottom: 10,
                display: 'flex', alignItems: 'center', gap: 6 }}>
                <Play size={12} />
                关联案例 ({relatedCases.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {relatedCases.map((c) => {
                  const lc = LEVEL_CONFIG[String(c.level)] || LEVEL_CONFIG['2'];
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleCaseClick(c)}
                      style={{
                        background: activeCase?.id === c.id ? lc.color + '25' : lc.color + '10',
                        border: `1px solid ${activeCase?.id === c.id ? lc.color + '60' : lc.color + '25'}`,
                        borderRadius: 8, padding: '6px 10px', cursor: 'pointer', textAlign: 'left',
                        fontSize: 12, color: activeCase?.id === c.id ? lc.color : COLORS.text,
                      }}
                    >
                      {lc.emoji} {c.title}
                    </button>
                  );
                })}
              </div>
              <AnimatePresence mode="wait">
                {activeCase && (
                  <div style={{ marginTop: 10 }}>
                    <CasePopup caseItem={activeCase} onClose={() => setActiveCase(null)} />
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* 移动端：经验面板 */}
          {hasExps && (
            <div style={{
              backgroundColor: 'rgba(18,18,38,0.95)',
              borderRadius: 14,
              padding: '12px 14px',
              border: `1px solid ${COLORS.accent1}30`,
            }}>
              <div style={{ fontSize: 12, color: COLORS.accent1, fontWeight: 600, marginBottom: 10,
                display: 'flex', alignItems: 'center', gap: 6 }}>
                <TipIcon size={12} />
                关联经验 ({relatedExperiences.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {relatedExperiences.map((e) => (
                  <button
                    key={e.tip.id}
                    onClick={() => handleExpClick(e)}
                    style={{
                      background: activeExp?.tip.id === e.tip.id ? e.category.color + '25' : e.category.color + '10',
                      border: `1px solid ${activeExp?.tip.id === e.tip.id ? e.category.color + '60' : e.category.color + '25'}`,
                      borderRadius: 8, padding: '6px 10px', cursor: 'pointer', textAlign: 'left',
                      fontSize: 12, color: activeExp?.tip.id === e.tip.id ? e.category.color : COLORS.text,
                    }}
                  >
                    {e.category.emoji} {e.tip.title}
                  </button>
                ))}
              </div>
              <AnimatePresence mode="wait">
                {activeExp && (
                  <div style={{ marginTop: 10 }}>
                    <ExperiencePopup item={activeExp} onClose={() => setActiveExp(null)} />
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

// 时间线组件
const TimelineSection = ({ onVersionClick }: { onVersionClick: (version: TimelineItem) => void }) => (
  <div style={{ marginBottom: 40 }}>
    <h2 style={{ fontSize: 28, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
      <Clock size={28} style={{ color: COLORS.primary }} />
      项目成长地图
      <span style={{ fontSize: 14, color: COLORS.textDim, fontWeight: 'normal' }}>(点击查看详情)</span>
    </h2>
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 10, paddingTop: 15 }}>
      {TIMELINE.map((item, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ scale: 1.03, y: -3 }}
          onClick={() => onVersionClick(item)}
          style={{
            minWidth: 200,
            backgroundColor: COLORS.cardBg,
            borderRadius: 16,
            padding: 20,
            paddingTop: 24,
            border: `2px solid ${item.color}40`,
            position: 'relative',
            flexShrink: 0,
            cursor: 'pointer',
            transition: 'border-color 0.2s',
          }}
        >
          {/* 版本号徽章 - 改进样式避免截断 */}
          <div
            style={{
              position: 'absolute',
              top: -12,
              left: 16,
              backgroundColor: item.color,
              padding: '5px 14px',
              borderRadius: 14,
              fontSize: 13,
              fontWeight: 'bold',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              zIndex: 1,
            }}
          >
            {item.version}
          </div>
          <p style={{ fontSize: 12, color: COLORS.textDim, marginTop: 8 }}>{item.date}</p>
          <h3 style={{ fontSize: 18, color: item.color, marginTop: 6 }}>{item.title}</h3>
          <p style={{ fontSize: 14, color: COLORS.textMuted, marginTop: 6 }}>{item.desc}</p>
          <div
            style={{
              marginTop: 12,
              padding: '6px 12px',
              backgroundColor: item.color + '20',
              borderRadius: 8,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ fontSize: 14, color: item.color, fontWeight: 600 }}>
              {item.commands} 命令
            </span>
            <span style={{ fontSize: 12, color: COLORS.textDim }}>→</span>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

// 4级工作流组件
const WorkflowLevelsSection = () => (
  <div style={{ marginBottom: 40 }}>
    <h2 style={{ fontSize: 28, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
      <Target size={28} style={{ color: COLORS.accent1 }} />
      4级工作流系统 - 按难度选命令
    </h2>
    <div style={{ display: 'grid', gap: 16 }}>
      {WORKFLOW_LEVELS.map((level, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          style={{
            backgroundColor: COLORS.cardBg,
            borderRadius: 16,
            padding: 20,
            borderLeft: `6px solid ${level.color}`,
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${level.color}, ${level.color}80)`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 14, color: COLORS.text, opacity: 0.8 }}>Level</span>
            <span style={{ fontSize: 32, color: COLORS.text, fontWeight: 'bold' }}>{level.level}</span>
          </div>
          <div style={{ flex: 1, minWidth: 250 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 28 }}>{level.emoji}</span>
              <code style={{ fontSize: 18, color: level.color, fontWeight: 600 }}>
                {level.name}
              </code>
            </div>
            <p style={{ fontSize: 16, color: COLORS.text, marginBottom: 4 }}>{level.desc}</p>
            <p style={{ fontSize: 14, color: COLORS.textMuted }}>💡 {level.useCase}</p>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

// 老奶奶指南组件
const GrandmaGuide = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    style={{
      background: `linear-gradient(135deg, ${COLORS.accent1}15, ${COLORS.accent2}15)`,
      borderRadius: 24,
      padding: 30,
      marginBottom: 40,
      border: `2px solid ${COLORS.accent1}30`,
    }}
  >
    <h2 style={{ fontSize: 28, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 32 }}>🎀</span>
      老奶奶也能看懂的命令指南
    </h2>
    <p style={{ color: COLORS.textMuted, marginBottom: 24, fontSize: 16 }}>
      只需要记住这5个命令就够了！其他的让 /ccw ���你选！
    </p>

    <div style={{ display: 'grid', gap: 12 }}>
      {GRANDMA_COMMANDS.map((item, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            backgroundColor: 'rgba(236,72,153,0.08)',
            borderRadius: 12,
            padding: 16,
            border: `1px solid ${COLORS.accent1}20`,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 28 }}>{item.emoji}</span>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: COLORS.accent1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 18, color: COLORS.text, fontWeight: 'bold' }}>{index + 1}</span>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <code
              style={{
                fontSize: 18,
                color: COLORS.secondary,
                fontWeight: 600,
                backgroundColor: 'rgba(0,0,0,0.3)',
                padding: '4px 12px',
                borderRadius: 6,
              }}
            >
              {item.cmd}
            </code>
            <span style={{ fontSize: 16, color: COLORS.textMuted, marginLeft: 12 }}>{item.desc}</span>
          </div>
          <div title={item.detail} style={{ cursor: 'help' }}>
            <Info size={20} style={{ color: COLORS.textDim }} />
          </div>
        </motion.div>
      ))}
    </div>

    <div
      style={{
        marginTop: 24,
        padding: 20,
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 12,
        textAlign: 'center',
      }}
    >
      <p style={{ fontSize: 20, color: COLORS.text, marginBottom: 8 }}>
        💡 一句话总结：
      </p>
      <p
        style={{
          fontSize: 24,
          fontWeight: 'bold',
          background: `linear-gradient(90deg, ${COLORS.secondary}, ${COLORS.accent3})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        "有事就说 /ccw，它帮你搞定一切！"
      </p>
    </div>
  </motion.div>
);

// 废弃命令组件
const DeprecatedCommands = ({ searchQuery }: { searchQuery: string }) => {
  // 过滤废弃命令
  const filteredDeprecated = useMemo(() => {
    if (!searchQuery) return DEPRECATED_COMMANDS;
    const query = searchQuery.toLowerCase();
    return DEPRECATED_COMMANDS.filter(item =>
      item.old.toLowerCase().includes(query) ||
      (item.newCmd && item.newCmd.toLowerCase().includes(query)) ||
      item.reason.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // 如果没有匹配的废弃命令，不显示整个组件
  if (filteredDeprecated.length === 0) return null;

  return (
    <div style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 24, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <X size={24} style={{ color: COLORS.danger }} />
        已废弃的命令
        <span style={{ fontSize: 16, color: COLORS.textDim, fontWeight: 'normal' }}>
          ({filteredDeprecated.length} 个)
        </span>
      </h2>
      <div
        style={{
          backgroundColor: COLORS.cardBg,
          borderRadius: 12,
          border: `1px solid ${COLORS.cardBorder}`,
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: COLORS.textDim, fontWeight: 600, width: '30%' }}>旧命令</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, color: COLORS.textDim, fontWeight: 600, width: '10%' }}></th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: COLORS.textDim, fontWeight: 600, width: '30%' }}>替代命令</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: COLORS.textDim, fontWeight: 600, width: '30%' }}>废弃原因</th>
            </tr>
          </thead>
          <tbody>
            {filteredDeprecated.map((item, index) => (
              <motion.tr
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                style={{
                  borderTop: `1px solid ${COLORS.cardBorder}`,
                }}
              >
                <td style={{ padding: '12px 16px' }}>
                  <code
                    style={{
                      fontSize: 14,
                      color: COLORS.danger,
                      textDecoration: 'line-through',
                      backgroundColor: 'rgba(239,68,68,0.1)',
                      padding: '4px 10px',
                      borderRadius: 4,
                    }}
                  >
                    {item.old}
                  </code>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <span style={{ fontSize: 18, color: COLORS.textMuted }}>→</span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {item.newCmd ? (
                    <code
                      style={{
                        fontSize: 14,
                        color: COLORS.secondary,
                        backgroundColor: 'rgba(16,185,129,0.1)',
                        padding: '4px 10px',
                        borderRadius: 4,
                      }}
                    >
                      {item.newCmd}
                    </code>
                  ) : (
                    <span style={{ fontSize: 13, color: COLORS.textDim, fontStyle: 'italic' }}>无替代</span>
                  )}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: 13, color: COLORS.textMuted }}>{item.reason}</span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 命令 Tab 组件（带目录导航）
interface CommandsTabProps {
  filteredCommands: Command[];
  groupedCommands: Record<string, Command[]>;
  searchQuery: string;
  onCommandClick: (cmd: Command) => void;
}

const CommandsTab = ({ filteredCommands, groupedCommands, searchQuery, onCommandClick }: CommandsTabProps) => {
  // 为每个分类创建 ref
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // 获取有命令的分类列表
  const categoriesWithCommands = useMemo(() => {
    return Object.entries(groupedCommands).filter(([_, commands]) => commands.length > 0);
  }, [groupedCommands]);

  // 检测屏幕宽度，H5 隐藏目录，右侧空白不足也隐藏
  const [hasEnoughSpace, setHasEnoughSpace] = useState(false);
  useEffect(() => {
    const checkSpace = () => {
      const windowWidth = window.innerWidth;
      const mainContentWidth = 1200; // main-content max-width
      const tocWidth = 160; // 目录宽度
      const tocMargin = 48; // 目录左右边距
      const minGap = 24; // 目录与内容的最小间距

      // 计算右侧空白区域
      const rightSpace = (windowWidth - mainContentWidth) / 2;
      // 需要目录宽度 + 边距 + 最小间距
      setHasEnoughSpace(rightSpace >= tocWidth + tocMargin + minGap);
    };
    checkSpace();
    window.addEventListener('resize', checkSpace);
    return () => window.removeEventListener('resize', checkSpace);
  }, []);

  // 滚动到指定分类
  const scrollToCategory = (category: string) => {
    const element = categoryRefs.current[category];
    if (element) {
      const navHeight = 200; // 导航栏高度估算
      const top = element.getBoundingClientRect().top + window.scrollY - navHeight;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* 右侧目录导航 - 放在内容区域外，空白不足时隐藏 */}
      {hasEnoughSpace && categoriesWithCommands.length > 0 && (
        <div
          style={{
            position: 'fixed',
            right: 24,
            top: 260,
            width: 160,
            zIndex: 50,
          }}
        >
          <h5
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: COLORS.textMuted,
              marginBottom: 12,
              letterSpacing: '0.5px',
            }}
          >
            目录
          </h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {categoriesWithCommands.map(([category]) => {
              const cat = CATEGORIES[category as CommandCategory];
              const label = cat.label.replace(/[🌟⚙️🔄🐛📚🧠🧪🔬👀🎨📋🛠️]/g, '').trim();
              return (
                <button
                  key={category}
                  onClick={() => scrollToCategory(category)}
                  style={{
                    padding: '6px 0',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: 14,
                    color: COLORS.textDim,
                    transition: 'all 0.2s',
                    borderLeft: `2px solid transparent`,
                    paddingLeft: 12,
                    marginLeft: -12,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = cat.color;
                    e.currentTarget.style.borderLeftColor = cat.color;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = COLORS.textDim;
                    e.currentTarget.style.borderLeftColor = 'transparent';
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <motion.div
        key="commands"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
      >
        {/* 命令列表 */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 28, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <BookOpen size={28} style={{ color: COLORS.primary }} />
            命令列表
            <span style={{ fontSize: 16, color: COLORS.textDim, fontWeight: 'normal' }}>
              ({filteredCommands.length} 个命令)
            </span>
          </h2>

          {categoriesWithCommands.map(([category, commands]) => (
            <div
              key={category}
              ref={(el) => { categoryRefs.current[category] = el; }}
              style={{ marginBottom: 30 }}
            >
              <h3
                style={{
                  fontSize: 20,
                  marginBottom: 16,
                  color: CATEGORIES[category as CommandCategory].color,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                {ICON_MAP[CATEGORIES[category as CommandCategory].icon]}
                {CATEGORIES[category as CommandCategory].label}
                <span style={{ fontSize: 14, color: COLORS.textDim }}>({commands.length})</span>
              </h3>
              <div className="commands-grid">
                {commands.map((cmd) => (
                  <CommandCard
                    key={`${cmd.cmd}-${cmd.cli}`}
                    command={cmd}
                    onClick={() => onCommandClick(cmd)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 废弃命令 */}
        <DeprecatedCommands searchQuery={searchQuery} />
      </motion.div>
    </>
  );
};

// 案例步骤渲染组件
const CaseStepItem = ({ step, index, onCommandClick }: { step: CaseStep; index: number; onCommandClick?: (cmd: string) => void }) => {
  const getStyle = () => {
    switch (step.type) {
      case 'command':
        return {
          bg: 'rgba(99,102,241,0.1)',
          border: 'rgba(99,102,241,0.3)',
          icon: <Terminal size={16} style={{ color: '#6366f1' }} />,
        };
      case 'response':
        return {
          bg: 'rgba(16,185,129,0.1)',
          border: 'rgba(16,185,129,0.3)',
          icon: <MessageSquare size={16} style={{ color: '#10b981' }} />,
        };
      case 'result':
        return {
          bg: step.highlight ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)',
          border: step.highlight ? '#10b981' : 'rgba(16,185,129,0.3)',
          icon: <CheckCircle size={16} style={{ color: '#10b981' }} />,
        };
      case 'note':
        return {
          bg: 'rgba(245,158,11,0.1)',
          border: 'rgba(245,158,11,0.3)',
          icon: <AlertTriangle size={16} style={{ color: '#f59e0b' }} />,
        };
      case 'choice':
        return {
          bg: 'rgba(139,92,246,0.1)',
          border: 'rgba(139,92,246,0.3)',
          icon: <ChevronRight size={16} style={{ color: '#8b5cf6' }} />,
        };
      default:
        return {
          bg: 'rgba(255,255,255,0.05)',
          border: 'rgba(255,255,255,0.1)',
          icon: null,
        };
    }
  };

  const style = getStyle();

  const renderContentWithCommands = (content: string) => {
    const commandRegex = /(\/[\w:\-]+)/g;
    const parts = content.split(commandRegex);
    
    return parts.map((part, i) => {
      if (part.match(commandRegex)) {
        const cmd = COMMANDS.find(c => c.cmd === part);
        return (
          <code
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              if (cmd && onCommandClick) {
                onCommandClick(part);
              }
            }}
            style={{
              fontSize: 'inherit',
              backgroundColor: cmd ? 'rgba(99,102,241,0.2)' : 'transparent',
              padding: cmd ? '2px 6px' : 0,
              borderRadius: 4,
              color: cmd ? COLORS.primary : 'inherit',
              cursor: cmd ? 'pointer' : 'inherit',
              fontFamily: 'monospace',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (cmd) {
                e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (cmd) {
                e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.2)';
              }
            }}
            title={cmd ? `${cmd.desc} - 点击查看详情` : undefined}
          >
            {part}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      style={{
        backgroundColor: style.bg,
        borderRadius: 8,
        padding: '12px 16px',
        marginBottom: 8,
        borderLeft: `3px solid ${style.border}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {style.icon && <div style={{ marginTop: 2 }}>{style.icon}</div>}
        <div style={{ flex: 1 }}>
          <span
            style={{
              fontSize: 11,
              color: COLORS.textDim,
              marginBottom: 4,
              display: 'block',
            }}
          >
            {step.role === 'user' ? '👤 用户' : '🤖 系统'}
          </span>
          <pre
            style={{
              margin: 0,
              fontFamily: step.type === 'command' ? 'monospace' : 'inherit',
              fontSize: 13,
              color: step.type === 'command' ? COLORS.secondary : COLORS.text,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: 1.6,
            }}
          >
            {onCommandClick ? renderContentWithCommands(step.content) : step.content}
          </pre>
        </div>
      </div>
    </motion.div>
  );
};

// 案例卡片组件
const CaseCard = ({ caseItem, onClick, onCommandClick }: { caseItem: Case; onClick: () => void; onCommandClick?: (cmd: string) => void }) => {
  const levelConfig = LEVEL_CONFIG[String(caseItem.level)] || LEVEL_CONFIG['2'];
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      style={{
        backgroundColor: isHovered ? 'rgba(255,255,255,0.08)' : COLORS.cardBg,
        borderRadius: 16,
        padding: '20px 24px',
        border: `1px solid ${isHovered ? levelConfig.color + '60' : COLORS.cardBorder}`,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 24 }}>{levelConfig.emoji}</span>
        <div
          style={{
            backgroundColor: levelConfig.color + '20',
            padding: '4px 12px',
            borderRadius: 12,
            fontSize: 12,
            color: levelConfig.color,
            fontWeight: 600,
          }}
        >
          {levelConfig.name}
        </div>
        <span style={{ fontSize: 12, color: COLORS.textDim }}>{caseItem.category}</span>
      </div>

      <h3 style={{ fontSize: 18, color: COLORS.text, margin: '0 0 8px 0' }}>{caseItem.title}</h3>
      <p style={{ fontSize: 14, color: COLORS.textMuted, margin: '0 0 12px 0' }}>{caseItem.scenario}</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {caseItem.commands.map((cmd, i) => {
          const cmdInfo = COMMANDS.find(c => c.cmd === cmd.cmd);
          return (
            <code
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                if (cmdInfo && onCommandClick) {
                  onCommandClick(cmd.cmd);
                }
              }}
              style={{
                fontSize: 12,
                backgroundColor: cmdInfo ? levelConfig.color + '15' : 'rgba(0,0,0,0.3)',
                padding: '4px 10px',
                borderRadius: 4,
                color: cmdInfo ? levelConfig.color : COLORS.secondary,
                cursor: cmdInfo ? 'pointer' : 'default',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (cmdInfo) {
                  e.currentTarget.style.backgroundColor = levelConfig.color + '30';
                }
              }}
              onMouseLeave={(e) => {
                if (cmdInfo) {
                  e.currentTarget.style.backgroundColor = levelConfig.color + '15';
                }
              }}
              title={cmdInfo ? `${cmd.desc} - 点击查看详情` : undefined}
            >
              {cmd.cmd}
            </code>
          );
        })}
      </div>
    </motion.div>
  );
};

// 案例详情弹窗
const CaseDetail = ({ caseItem, onClose, onCommandClick }: { caseItem: Case; onClose: () => void; onCommandClick?: (cmd: string) => void }) => {
  const levelConfig = LEVEL_CONFIG[String(caseItem.level)] || LEVEL_CONFIG['2'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
        padding: 20,
        overflow: 'auto',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#1a1a2e',
          borderRadius: 20,
          padding: 30,
          maxWidth: 800,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          border: `2px solid ${levelConfig.color}40`,
        }}
      >
        {/* 头部 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 28 }}>{levelConfig.emoji}</span>
              <span
                style={{
                  backgroundColor: levelConfig.color + '20',
                  padding: '6px 14px',
                  borderRadius: 12,
                  fontSize: 14,
                  color: levelConfig.color,
                  fontWeight: 600,
                }}
              >
                {levelConfig.name}
              </span>
              <span style={{ fontSize: 14, color: COLORS.textDim }}>{caseItem.category}</span>
            </div>
            <h2 style={{ fontSize: 24, color: COLORS.text, margin: 0 }}>{caseItem.title}</h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: COLORS.textMuted,
              cursor: 'pointer',
              padding: 5,
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* 场景描述 */}
        <div
          style={{
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <h4 style={{ color: COLORS.text, marginBottom: 8, fontSize: 14 }}>📋 场景</h4>
          <p style={{ color: COLORS.textMuted, fontSize: 15, margin: 0 }}>{caseItem.scenario}</p>
        </div>

        {/* 涉及命令 */}
        <div
          style={{
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <h4 style={{ color: COLORS.text, marginBottom: 12, fontSize: 14 }}>🔧 涉及命令 <span style={{ color: COLORS.textDim, fontWeight: 'normal' }}>(点击查看详情)</span></h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {caseItem.commands.map((cmd, i) => {
              const cmdInfo = COMMANDS.find(c => c.cmd === cmd.cmd);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <code
                    onClick={(e) => {
                      e.stopPropagation();
                      if (cmdInfo && onCommandClick) {
                        onCommandClick(cmd.cmd);
                      }
                    }}
                    style={{
                      fontSize: 14,
                      backgroundColor: cmdInfo ? levelConfig.color + '20' : 'rgba(0,0,0,0.3)',
                      padding: '6px 12px',
                      borderRadius: 6,
                      color: cmdInfo ? levelConfig.color : COLORS.textMuted,
                      minWidth: 200,
                      cursor: cmdInfo ? 'pointer' : 'default',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (cmdInfo) {
                        e.currentTarget.style.backgroundColor = levelConfig.color + '35';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (cmdInfo) {
                        e.currentTarget.style.backgroundColor = levelConfig.color + '20';
                      }
                    }}
                    title={cmdInfo ? '点击查看命令详情' : undefined}
                  >
                    {cmd.cmd}
                  </code>
                  <span style={{ fontSize: 14, color: COLORS.textMuted }}>{cmd.desc}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 交互步骤 */}
        <div
          style={{
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <h4 style={{ color: COLORS.text, marginBottom: 16, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Play size={16} style={{ color: levelConfig.color }} />
            交互过程 <span style={{ color: COLORS.textDim, fontWeight: 'normal' }}>(命令可点击)</span>
          </h4>
          <div>
            {caseItem.steps.map((step, i) => (
              <CaseStepItem key={i} step={step} index={i} onCommandClick={onCommandClick} />
            ))}
          </div>
        </div>

        {/* 提示 */}
        {caseItem.tips && caseItem.tips.length > 0 && (
          <div
            style={{
              backgroundColor: levelConfig.color + '10',
              borderRadius: 12,
              padding: 16,
              border: `1px solid ${levelConfig.color}30`,
            }}
          >
            <h4 style={{ color: COLORS.text, marginBottom: 12, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TipIcon size={16} style={{ color: levelConfig.color }} />
              实用提示
            </h4>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {caseItem.tips.map((tip, i) => (
                <li key={i} style={{ color: COLORS.textMuted, marginBottom: 6, fontSize: 14 }}>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// 案例展示区域组件
const CasesSection = ({
  selectedLevel,
  onSelectLevel,
  onSelectCase,
  onCommandClick
}: {
  selectedLevel: string;
  onSelectLevel: (level: string) => void;
  onSelectCase: (caseItem: Case) => void;
  onCommandClick?: (cmd: string) => void;
}) => {
  const filteredCases = selectedLevel === 'all'
    ? ALL_CASES
    : CASES_BY_LEVEL[selectedLevel] || [];

  return (
    <div style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 28, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Play size={28} style={{ color: COLORS.accent3 }} />
        使用案例
        <span style={{ fontSize: 14, color: COLORS.textDim, fontWeight: 'normal' }}>
          ({filteredCases.length} 个案例)
        </span>
      </h2>

      {/* 等级筛选 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelectLevel('all')}
          style={{
            backgroundColor: selectedLevel === 'all' ? COLORS.primary + '30' : COLORS.cardBg,
            border: `1px solid ${selectedLevel === 'all' ? COLORS.primary : COLORS.cardBorder}`,
            borderRadius: 20,
            padding: '10px 20px',
            color: selectedLevel === 'all' ? COLORS.primary : COLORS.textMuted,
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          全部 ({ALL_CASES.length})
        </motion.button>
        {Object.entries(LEVEL_CONFIG).map(([key, config]) => {
          const count = CASES_BY_LEVEL[key]?.length || 0;
          return (
            <motion.button
              key={key}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectLevel(key)}
              style={{
                backgroundColor: selectedLevel === key ? config.color + '30' : COLORS.cardBg,
                border: `1px solid ${selectedLevel === key ? config.color : COLORS.cardBorder}`,
                borderRadius: 20,
                padding: '10px 20px',
                color: selectedLevel === key ? config.color : COLORS.textMuted,
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>{config.emoji}</span>
              {config.name}
              <span style={{ fontSize: 12, opacity: 0.7 }}>({count})</span>
            </motion.button>
          );
        })}
      </div>

      {/* 案例网格 */}
      <div className="commands-grid">
        <AnimatePresence mode="popLayout">
          {filteredCases.map((caseItem) => (
            <CaseCard
              key={caseItem.id}
              caseItem={caseItem}
              onClick={() => onSelectCase(caseItem)}
              onCommandClick={onCommandClick}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

// 经验指南卡片组件
const ExperienceCard = ({ 
  tip, 
  categoryColor,
  onCommandClick 
}: { 
  tip: ExperienceTip; 
  categoryColor: string;
  onCommandClick: (cmd: string) => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isSequence = tip.commandType === 'sequence';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.02, y: -2 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      style={{
        backgroundColor: isHovered ? 'rgba(255,255,255,0.08)' : COLORS.cardBg,
        borderRadius: 12,
        padding: '16px 20px',
        border: `1px solid ${isHovered ? categoryColor + '60' : COLORS.cardBorder}`,
        cursor: 'default',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <h4 style={{ fontSize: 16, color: COLORS.text, margin: 0 }}>{tip.title}</h4>
        <span
          style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 4,
            backgroundColor: isSequence ? COLORS.accent1 + '20' : COLORS.secondary + '20',
            color: isSequence ? COLORS.accent1 : COLORS.secondary,
          }}
        >
          {isSequence ? '按顺序执行' : '多选一'}
        </span>
      </div>
      <p style={{ fontSize: 13, color: COLORS.textMuted, margin: '0 0 12px 0' }}>{tip.scenario}</p>
      
      {isSequence ? (
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          {tip.commands.map((cmd, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <code
                onClick={() => onCommandClick(cmd)}
                style={{
                  fontSize: 12,
                  color: categoryColor,
                  backgroundColor: categoryColor + '15',
                  padding: '4px 10px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = categoryColor + '30';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = categoryColor + '15';
                }}
              >
                {cmd}
              </code>
              {i < tip.commands.length - 1 && (
                <span style={{ color: COLORS.textDim, fontSize: 14 }}>→</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {tip.commands.map((cmd, i) => (
            <code
              key={i}
              onClick={() => onCommandClick(cmd)}
              style={{
                fontSize: 12,
                color: categoryColor,
                backgroundColor: categoryColor + '15',
                padding: '4px 10px',
                borderRadius: 4,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = categoryColor + '30';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = categoryColor + '15';
              }}
            >
              {cmd}
            </code>
          ))}
        </div>
      )}
    </motion.div>
  );
};

// 经验指南区域组件
const ExperienceSection = ({ 
  onCommandClick 
}: { 
  onCommandClick: (cmd: string) => void;
}) => {
  return (
    <div style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 28, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
        <TipIcon size={28} style={{ color: COLORS.accent1 }} />
        经验指南
      </h2>
      <p style={{ color: COLORS.textMuted, marginBottom: 24, fontSize: 15 }}>
        点击命令可查看详情 - 来自实战经验的命令选择建议
      </p>

      {EXPERIENCE_GUIDE.map((category) => (
        <motion.div
          key={category.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 30 }}
        >
          <h3
            style={{
              fontSize: 20,
              marginBottom: 16,
              color: category.color,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>{category.emoji}</span>
            {category.title}
            <span style={{ fontSize: 14, color: COLORS.textDim }}>({category.tips.length})</span>
          </h3>
          <div className="commands-grid">
            <AnimatePresence mode="popLayout">
              {category.tips.map((tip) => (
                <ExperienceCard
                  key={tip.id}
                  tip={tip}
                  categoryColor={category.color}
                  onCommandClick={onCommandClick}
                />
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// 版本详情弹窗
const VersionDetailModal = ({ version, onClose }: { version: TimelineItem; onClose: () => void }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
        padding: 20,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#1a1a2e',
          borderRadius: 20,
          padding: 30,
          maxWidth: 700,
          width: '100%',
          maxHeight: '85vh',
          overflow: 'auto',
          border: `2px solid ${version.color}60`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span
                style={{
                  backgroundColor: version.color,
                  padding: '6px 16px',
                  borderRadius: 16,
                  fontSize: 16,
                  fontWeight: 'bold',
                }}
              >
                {version.version}
              </span>
              <span style={{ fontSize: 14, color: COLORS.textDim }}>{version.date}</span>
            </div>
            <h2 style={{ fontSize: 28, color: version.color, margin: 0 }}>{version.title}</h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: COLORS.textMuted,
              cursor: 'pointer',
              padding: 5,
            }}
          >
            <X size={24} />
          </button>
        </div>

        <p style={{ fontSize: 16, color: COLORS.textMuted, marginBottom: 20 }}>{version.desc}</p>

        {/* 亮点 */}
        <div
          style={{
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <h4 style={{ color: COLORS.text, marginBottom: 12, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} style={{ color: version.color }} />
            本次更新亮点
          </h4>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {version.detail.highlights.map((h, i) => (
              <li key={i} style={{ color: COLORS.textMuted, marginBottom: 6, fontSize: 14 }}>
                {h}
              </li>
            ))}
          </ul>
        </div>

        {/* 新增命令 */}
        <div
          style={{
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <h4 style={{ color: COLORS.text, marginBottom: 12, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: version.color }}>🆕</span>
            新增命令 ({version.detail.newCommands.length})
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {version.detail.newCommands.map((cmd, i) => (
              <code
                key={i}
                style={{
                  fontSize: 13,
                  color: version.color,
                  backgroundColor: version.color + '20',
                  padding: '4px 10px',
                  borderRadius: 6,
                }}
              >
                {cmd}
              </code>
            ))}
          </div>
        </div>

        {/* 用法介绍 */}
        <div
          style={{
            backgroundColor: version.color + '15',
            borderRadius: 12,
            padding: 16,
            border: `1px solid ${version.color}30`,
          }}
        >
          <h4 style={{ color: COLORS.text, marginBottom: 8, fontSize: 16 }}>💡 使用指南</h4>
          <p style={{ color: COLORS.text, fontSize: 14, margin: 0, lineHeight: 1.7 }}>
            {version.detail.usage}
          </p>
        </div>

        {/* 命令统计 */}
        <div
          style={{
            marginTop: 20,
            padding: '12px 16px',
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: 8,
            display: 'inline-block',
          }}
        >
          <span style={{ fontSize: 16, color: version.color, fontWeight: 600 }}>
            📊 累计 {version.commands} 个命令
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Tab 类型定义
type TabType = 'overview' | 'commands' | 'cases' | 'install' | 'experience';

// Tab 配置
const TABS: { key: TabType; label: string; icon: React.ReactNode; desc: string }[] = [
  { key: 'overview', label: '概览', icon: <Home size={18} />, desc: '成长地图、工作流、快速入门' },
  { key: 'commands', label: '命令', icon: <Terminal size={18} />, desc: '所有命令列表' },
  { key: 'cases', label: '案例', icon: <Play size={18} />, desc: '使用案例和场景' },
  { key: 'experience', label: '经验', icon: <TipIcon size={18} />, desc: '场景决策指南' },
  { key: 'install', label: '安装', icon: <Wrench size={18} />, desc: '安装和使用指南' },
];

// 主应用
function App() {
  const [activeTab, setActiveTab] = useState<TabType>('commands'); // 默认显示命令
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CommandCategory | 'all'>('all');
  const [selectedLevel, setSelectedLevel] = useState<number | 'all'>('all');
  const [selectedCLI, setSelectedCLI] = useState<CLIType | 'all'>('all');
  const [selectedCommand, setSelectedCommand] = useState<Command | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<TimelineItem | null>(null);
  const [selectedCaseLevel, setSelectedCaseLevel] = useState<string>('all');
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);

  // 过滤命令
  const filteredCommands = useMemo(() => {
    return COMMANDS.filter(cmd => {
      const matchesSearch = searchQuery === '' ||
        cmd.cmd.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cmd.desc.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || cmd.category === selectedCategory;
      const matchesLevel = selectedLevel === 'all' || cmd.level === selectedLevel;
      const matchesCLI = selectedCLI === 'all' || cmd.cli === selectedCLI;
      return matchesSearch && matchesCategory && matchesLevel && matchesCLI;
    });
  }, [searchQuery, selectedCategory, selectedLevel, selectedCLI]);

  // 按分类分组
  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {};
    filteredCommands.forEach(cmd => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  return (
    <div className="app">
      {/* 背景装饰 */}
      <div className="bg-decoration" />

      {/* 头部 */}
      <header className="header">
        <div className="header-content">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="title"
          >
            <span className="gradient-text">CCW 命令百科</span>
          </motion.h1>
          <p className="subtitle">Claude Code Workflow 完整命令图谱 · 可交互式</p>

          {/* 统计卡片 */}
          <div className="stats-row">
            {[
              { label: '命令总数', value: `${STATS.totalCommands}+`, color: COLORS.primary },
              { label: '分类数', value: STATS.categories, color: COLORS.accent1 },
              { label: '最新版本', value: STATS.latestVersion, color: COLORS.secondary },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="stat-card"
                style={{ borderColor: stat.color + '40' }}
              >
                <p className="stat-value" style={{ color: stat.color }}>{stat.value}</p>
                <p className="stat-label">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </header>

      {/* 浮动卡片式导航栏 */}
      <div className="floating-nav-card">
        {/* Tab 导航 */}
        <nav className="tab-nav-inner-card">
          {TABS.map((tab) => (
            <motion.button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {tab.icon}
              <span className="tab-label">{tab.label}</span>
            </motion.button>
          ))}
        </nav>

        {/* 搜索和筛选栏 - 只在命令 Tab 显示 */}
        {activeTab === 'commands' && (
          <div className="search-filter-row-card">
            <div className="search-box">
              <Search size={20} style={{ color: COLORS.textDim }} />
              <input
                type="text"
                placeholder="搜索命令..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="clear-btn">
                  <X size={16} />
                </button>
              )}
            </div>

            {/* 分类筛选 */}
            <div className="filter-group">
              <Filter size={18} style={{ color: COLORS.textDim }} />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as CommandCategory | 'all')}
                className="filter-select"
              >
                <option value="all">全部分类</option>
                {Object.entries(CATEGORIES).map(([key, value]) => (
                  <option key={key} value={key}>{value.label}</option>
                ))}
              </select>
            </div>

            {/* 等级筛选 */}
            <div className="filter-group">
              <Target size={18} style={{ color: COLORS.textDim }} />
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="filter-select"
              >
                <option value="all">全部等级</option>
                {WORKFLOW_LEVELS.map(level => (
                  <option key={level.level} value={level.level}>
                    Level {level.level} - {level.emoji}
                  </option>
                ))}
              </select>
            </div>

            {/* CLI 筛选 */}
            <div className="filter-group">
              <span style={{ fontSize: 12, fontWeight: 600, color: selectedCLI === 'all' ? COLORS.textMuted : CLI_CONFIG[selectedCLI].color }}>
                {selectedCLI === 'all' ? '★' : CLI_CONFIG[selectedCLI].shortLabel}
              </span>
              <select
                value={selectedCLI}
                onChange={(e) => setSelectedCLI(e.target.value as CLIType | 'all')}
                className="filter-select"
              >
                <option value="all">全部 CLI</option>
                <option value="claude">Claude Code</option>
                <option value="codex">Codex</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 主内容 */}
      <main className="main-content">
        <AnimatePresence mode="wait">
          {/* 概览 Tab */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* 时间线 */}
              <TimelineSection onVersionClick={setSelectedVersion} />

              {/* 4级工作流 */}
              <WorkflowLevelsSection />

              {/* 老奶奶指南 */}
              <GrandmaGuide />
            </motion.div>
          )}

          {/* 命令 Tab */}
          {activeTab === 'commands' && (
            <CommandsTab
              filteredCommands={filteredCommands}
              groupedCommands={groupedCommands}
              searchQuery={searchQuery}
              onCommandClick={setSelectedCommand}
            />
          )}

          {/* 案例 Tab */}
          {activeTab === 'cases' && (
            <motion.div
              key="cases"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* 使用案例 */}
              <CasesSection
                selectedLevel={selectedCaseLevel}
                onSelectLevel={setSelectedCaseLevel}
                onSelectCase={setSelectedCase}
                onCommandClick={(cmd) => {
                  const command = COMMANDS.find(c => c.cmd === cmd);
                  if (command) {
                    setSelectedCommand(command);
                  }
                }}
              />
            </motion.div>
          )}

          {/* 经验指南 Tab */}
          {activeTab === 'experience' && (
            <motion.div
              key="experience"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <ExperienceSection
                onCommandClick={(cmd) => {
                  const command = COMMANDS.find(c => c.cmd === cmd);
                  if (command) {
                    setSelectedCommand(command);
                  }
                }}
              />
            </motion.div>
          )}

          {/* 安装 Tab */}
          {activeTab === 'install' && (
            <motion.div
              key="install"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* 安装指南 */}
              <div style={{ marginBottom: 40 }}>
                <h2 style={{ fontSize: 28, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Wrench size={28} style={{ color: COLORS.secondary }} />
                  安装和使用指南
                </h2>

                {/* 项目信息 */}
                <div
                  style={{
                    background: COLORS.cardBg,
                    borderRadius: 16,
                    padding: 24,
                    marginBottom: 24,
                    border: `1px solid ${COLORS.cardBorder}`,
                  }}
                >
                  <h3 style={{ fontSize: 18, color: COLORS.text, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <GitBranch size={20} style={{ color: COLORS.primary }} />
                    项目仓库
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <a
                      href="https://github.com/catlog22/Claude-Code-Workflow"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        backgroundColor: COLORS.primary + '20',
                        color: COLORS.primary,
                        padding: '12px 20px',
                        borderRadius: 12,
                        textDecoration: 'none',
                        fontWeight: 600,
                        transition: 'all 0.2s',
                      }}
                    >
                      <GitBranch size={18} />
                      catlog22/Claude-Code-Workflow
                    </a>
                    <span style={{ color: COLORS.textMuted, fontSize: 14 }}>
                      Claude Code Workflow 工作流系统
                    </span>
                  </div>
                </div>

                {/* 安装步骤 */}
                <div
                  style={{
                    background: COLORS.cardBg,
                    borderRadius: 16,
                    padding: 24,
                    marginBottom: 24,
                    border: `1px solid ${COLORS.cardBorder}`,
                  }}
                >
                  <h3 style={{ fontSize: 18, color: COLORS.text, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Terminal size={20} style={{ color: COLORS.secondary }} />
                    安装和更新
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* npm 安装 */}
                    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <span style={{
                          backgroundColor: COLORS.secondary,
                          color: '#fff',
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 'bold',
                        }}>1</span>
                        <span style={{ color: COLORS.text, fontWeight: 600 }}>📦 npm 全局安装</span>
                        <span style={{ background: COLORS.secondary + '30', color: COLORS.secondary, fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>推荐</span>
                      </div>
                      <code style={{
                        display: 'block',
                        background: 'rgba(0,0,0,0.4)',
                        padding: '12px 16px',
                        borderRadius: 8,
                        color: COLORS.secondary,
                        fontSize: 13,
                        fontFamily: 'monospace',
                      }}>
                        npm install -g claude-code-workflow
                      </code>
                    </div>

                    {/* npm 更新 */}
                    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <span style={{
                          backgroundColor: COLORS.accent1,
                          color: '#fff',
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 'bold',
                        }}>2</span>
                        <span style={{ color: COLORS.text, fontWeight: 600 }}>🔄 更新到最新版本</span>
                      </div>
                      <code style={{
                        display: 'block',
                        background: 'rgba(0,0,0,0.4)',
                        padding: '12px 16px',
                        borderRadius: 8,
                        color: COLORS.secondary,
                        fontSize: 13,
                        fontFamily: 'monospace',
                      }}>
                        npm update -g claude-code-workflow
                      </code>
                    </div>

                    {/* 安装后目录结构 */}
                    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <span style={{ color: COLORS.textMuted, fontSize: 14 }}>📁 安装目录结构</span>
                      </div>
                      <code style={{
                        display: 'block',
                        background: 'rgba(0,0,0,0.3)',
                        padding: '12px 16px',
                        borderRadius: 8,
                        color: COLORS.textMuted,
                        fontSize: 12,
                        fontFamily: 'monospace',
                        whiteSpace: 'pre',
                      }}>
{`~/.claude/
├── agents/          # Agent 配置
├── commands/        # 命令定义
├── skills/          # 技能模块
├── output-styles/   # 输出样式
├── settings.local.json
└── CLAUDE.md`}
                      </code>
                    </div>
                  </div>
                </div>

                {/* 快速开始 */}
                <div
                  style={{
                    background: `linear-gradient(135deg, ${COLORS.primary}10, ${COLORS.accent1}10)`,
                    borderRadius: 16,
                    padding: 24,
                    marginBottom: 24,
                    border: `1px solid ${COLORS.primary}30`,
                  }}
                >
                  <h3 style={{ fontSize: 18, color: COLORS.text, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Sparkles size={20} style={{ color: COLORS.accent1 }} />
                    快速开始
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <span style={{ color: COLORS.primary, fontSize: 18, fontWeight: 'bold' }}>1.</span>
                      <div>
                        <p style={{ color: COLORS.text, marginBottom: 4 }}>安装工作流文件到系统（全局安装）</p>
                        <code style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: 6, color: COLORS.secondary, fontSize: 13 }}>
                          ccw install -m Global
                        </code>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <span style={{ color: COLORS.primary, fontSize: 18, fontWeight: 'bold' }}>2.</span>
                      <div>
                        <p style={{ color: COLORS.text, marginBottom: 4 }}>在项目目录中启动 Claude Code 或 Codex</p>
                        <code style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: 6, color: COLORS.secondary, fontSize: 13 }}>
                          claude / codex
                        </code>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <span style={{ color: COLORS.primary, fontSize: 18, fontWeight: 'bold' }}>3.</span>
                      <div>
                        <p style={{ color: COLORS.text, marginBottom: 4 }}>验证安装是否成功</p>
                        <code style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: 6, color: COLORS.secondary, fontSize: 13 }}>
                          /workflow:session:list
                        </code>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <span style={{ color: COLORS.primary, fontSize: 18, fontWeight: 'bold' }}>4.</span>
                      <div>
                        <p style={{ color: COLORS.text, marginBottom: 4 }}>使用 /ccw 命令让 AI 帮你选择工作流</p>
                        <code style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: 6, color: COLORS.secondary, fontSize: 13 }}>
                          /ccw 帮我实现用户登录功能
                        </code>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <span style={{ color: COLORS.primary, fontSize: 18, fontWeight: 'bold' }}>5.</span>
                      <div>
                        <p style={{ color: COLORS.text, marginBottom: 4 }}>或者使用具体的工作流命令</p>
                        <code style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: 6, color: COLORS.secondary, fontSize: 13 }}>
                          /workflow:lite-plan "任务描述"
                        </code>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 常用链接 */}
                <div
                  style={{
                    background: COLORS.cardBg,
                    borderRadius: 16,
                    padding: 24,
                    border: `1px solid ${COLORS.cardBorder}`,
                  }}
                >
                  <h3 style={{ fontSize: 18, color: COLORS.text, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <BookOpen size={20} style={{ color: COLORS.accent2 }} />
                    相关资源
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    {[
                      { label: 'GitHub 仓库', url: 'https://github.com/catlog22/Claude-Code-Workflow', color: COLORS.primary },
                      { label: '安装指南', url: 'https://github.com/catlog22/Claude-Code-Workflow/blob/master/INSTALL_CN.md', color: COLORS.secondary },
                      { label: '快速入门', url: 'https://github.com/catlog22/Claude-Code-Workflow/blob/master/GETTING_STARTED_CN.md', color: COLORS.accent1 },
                      { label: '更新日志', url: 'https://github.com/catlog22/Claude-Code-Workflow/blob/master/CHANGELOG.md', color: COLORS.accent2 },
                    ].map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          backgroundColor: link.color + '15',
                          color: link.color,
                          padding: '10px 16px',
                          borderRadius: 10,
                          textDecoration: 'none',
                          fontSize: 14,
                          fontWeight: 500,
                          border: `1px solid ${link.color}30`,
                          transition: 'all 0.2s',
                        }}
                      >
                        <ChevronRight size={16} />
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 底部 */}
      <footer className="footer">
        <p>CCW 命令百科 · 让开发更简单</p>
        <p style={{ fontSize: 12, color: COLORS.textDim, marginTop: 8 }}>
          提示：按 <code>/ccw</code> 让 AI 帮你选择最合适的命令
        </p>
      </footer>

      {/* 命令详情弹窗 */}
      <AnimatePresence>
        {selectedCommand && (
          <CommandDetail
            command={selectedCommand}
            onClose={() => setSelectedCommand(null)}
          />
        )}
      </AnimatePresence>

      {/* 版本详情弹窗 */}
      <AnimatePresence>
        {selectedVersion && (
          <VersionDetailModal
            version={selectedVersion}
            onClose={() => setSelectedVersion(null)}
          />
        )}
      </AnimatePresence>
      <Analytics />
      <SpeedInsights />

      {/* 案例详情弹窗 */}
      <AnimatePresence>
        {selectedCase && (
          <CaseDetail
            caseItem={selectedCase}
            onClose={() => setSelectedCase(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
