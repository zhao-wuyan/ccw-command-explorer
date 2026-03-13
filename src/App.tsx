import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, Home, GitBranch, Users, AlertCircle, Database,
  Lightbulb, TestTube, FlaskConical, Search as SearchIcon, Palette,
  Wrench, X, Clock, Target, Sparkles, BookOpen, Info, Bot, Play,
  ChevronRight, Terminal, MessageSquare, CheckCircle, AlertTriangle,
  Lightbulb as TipIcon, Cpu, Settings as SettingsIcon, Github, SlidersHorizontal
} from 'lucide-react';
import {
  COMMANDS, CATEGORIES, TIMELINE, WORKFLOW_LEVELS, GRANDMA_COMMANDS,
  DEPRECATED_COMMANDS, STATS, COLORS, CLI_CONFIG, EXPERIENCE_GUIDE,
  analyzeIntent, TASK_PATTERNS, COMMAND_CHAINS
} from './data';
import type { IntentAnalysis } from './data';
import type { Command, CommandCategory, TimelineItem, CLIType, ExperienceTip, ExperienceCategory } from './data';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { ALL_CASES, CASES_BY_LEVEL, LEVEL_CONFIG } from './data/cases';
import type { Case, CaseStep } from './data/cases';
import { ThemeToggle } from './components/ThemeToggle';
import { useColors } from './contexts/ColorsContext';
import './App.css';

// 辅助函数：根据 cmd 和 cli 查找命令
const findCommand = (cmd: string, cli?: CLIType): Command | undefined => {
  if (cli) {
    return COMMANDS.find(c => c.cmd === cmd && c.cli === cli);
  }
  // 如果没有指定 cli，返回第一个匹配的命令（向后兼容）
  return COMMANDS.find(c => c.cmd === cmd);
};

// 辅助函数：生成命令的唯一键
const getCommandKey = (cmd: string, cli?: CLIType): string => {
  return cli ? `${cmd}-${cli}` : cmd;
};

// 获取主题感知的分类颜色
const useCategoryColor = (category: CommandCategory): string => {
  const COLORS = useColors();
  const colorMap: Record<CommandCategory, keyof typeof COLORS> = {
    'main': 'categoryMain',
    'workflow': 'categoryWorkflow',
    'session': 'categorySession',
    'issue': 'categoryIssue',
    'memory': 'categoryMemory',
    'brainstorm': 'categoryBrainstorm',
    'tdd': 'categoryTdd',
    'test': 'categoryTest',
    'review': 'categoryReview',
    'ui-design': 'categoryUiDesign',
    'prompt': 'categoryPrompt',
    'skill': 'categorySkill',
  };
  return COLORS[colorMap[category]] || COLORS.primary;
};

// 获取主题感知的 CLI 颜色
const useCliColor = (cli: CLIType): string => {
  const COLORS = useColors();
  return cli === 'claude' ? COLORS.cliClaude : COLORS.cliCodex;
};

// 获取主题感知的 Level 颜色
const useLevelColor = (level: number): string => {
  const COLORS = useColors();
  const levelColors = [COLORS.level1, COLORS.level2, COLORS.level3, COLORS.level4];
  return levelColors[level - 1] || COLORS.level1;
};

// 获取主题感知的案例级别颜色
const useCaseLevelColor = (level: string): string => {
  const COLORS = useColors();
  const colorMap: Record<string, keyof typeof COLORS> = {
    '1': 'caseLevel1',
    '2': 'caseLevel2',
    '3': 'caseLevel3',
    '4': 'caseLevel4',
    'skill': 'caseLevelSkill',
    'issue': 'caseLevelIssue',
    'team': 'caseLevelTeam',
    'ui': 'caseLevelUi',
    'memory': 'caseLevelMemory',
    'session': 'caseLevelSession',
    'multi-cli': 'caseLevelMultiCli',
  };
  return COLORS[colorMap[level]] || COLORS.caseLevel1;
};

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
  const COLORS = useColors();
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
  const cliColor = useCliColor(cli);
  const config = CLI_CONFIG[cli];
  return (
    <span
      style={{
        fontSize: 10,
        padding: '2px 6px',
        borderRadius: 4,
        backgroundColor: cliColor + '20',
        color: cliColor,
        fontWeight: 700,
        letterSpacing: '0.3px',
        border: `1px solid ${cliColor}40`,
      }}
      title={config.label}
    >
      {config.shortLabel}
    </span>
  );
};

// 版本徽章组件
const VersionBadge = ({ version }: { version: string }) => {
  const COLORS = useColors();
  return (
    <span
      style={{
        fontSize: 10,
        padding: '2px 6px',
        borderRadius: 4,
        backgroundColor: COLORS.primary + '20',
        color: COLORS.primaryLight,
        fontWeight: 600,
        fontFamily: 'monospace',
        border: `1px solid ${COLORS.primary}30`,
      }}
      title={`Added in ${version}`}
    >
      {version}
    </span>
  );
};

// 判断版本号是否 >= v7.0（只显示 v7.0 及以上版本）
const shouldShowVersion = (version: string | undefined): boolean => {
  if (!version) return false;
  const match = version.match(/v(\d+)/);
  if (!match) return false;
  const major = parseInt(match[1], 10);
  return major >= 7;
};

// 相关命令徽章组件
const RelatedCommandBadge = ({ cmd, category }: { cmd: string; category: CommandCategory }) => {
  const COLORS = useColors();
  const categoryColor = useCategoryColor(category);
  return (
    <code style={{ fontSize: 13, color: categoryColor, backgroundColor: COLORS.codeBg, padding: '4px 10px', borderRadius: 4 }}>
      {cmd}
    </code>
  );
};

// 命令卡片组件
const CommandCard = ({ command, onClick }: { command: Command; onClick: () => void }) => {
  const COLORS = useColors();
  const categoryColor = useCategoryColor(command.category);
  const levelColor = command.level ? useLevelColor(command.level) : null;
  const [isHovered, setIsHovered] = useState(false);
  const showVersion = shouldShowVersion(command.addedInVersion);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      style={{
        backgroundColor: isHovered ? (COLORS.bg === '#ffffff' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)') : COLORS.cardBg,
        borderRadius: 12,
        padding: '16px 20px',
        border: `1px solid ${isHovered ? categoryColor + '60' : COLORS.cardBorder}`,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
      }}
    >
      {/* 右上角版本号（仅显示 v7.0+）*/}
      {showVersion && (
        <div style={{ position: 'absolute', top: 12, right: 12 }}>
          <VersionBadge version={command.addedInVersion!} />
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap', paddingRight: showVersion ? 55 : 0 }}>
        <CLIBadge cli={command.cli} />
        <code
          style={{
            fontSize: 15,
            color: categoryColor,
            fontWeight: 600,
            backgroundColor: COLORS.codeBg,
            padding: '4px 12px',
            borderRadius: 6,
          }}
        >
          {command.cmd}
        </code>
        <StatusBadge status={command.status} />
        {command.level && levelColor && (
          <span
            style={{
              fontSize: 12,
              padding: '2px 8px',
              borderRadius: 4,
              backgroundColor: levelColor + '20',
              color: levelColor,
            }}
          >
            Lv.{command.level}
          </span>
        )}
      </div>
      <p style={{ fontSize: 14, color: COLORS.textMuted, margin: 0, paddingRight: showVersion ? 55 : 0 }}>
        {command.desc}
      </p>
    </motion.div>
  );
};

// ============================================
// 命令详情弹窗 - 带左侧案例/右侧经验侧边面板
// ============================================

// 反向查找：此命令相关的案例
function getRelatedCases(cmd: string, cli: CLIType): Case[] {
  return ALL_CASES.filter(c =>
    c.commands.some(cc => cc.cmd === cmd && (cc.cli === cli || cc.cli === undefined))
  );
}

// 反向查找：此命令相关的经验
function getRelatedExperiences(cmd: string, cli: CLIType): { category: ExperienceCategory; tip: ExperienceTip }[] {
  const result: { category: ExperienceCategory; tip: ExperienceTip }[] = [];
  for (const cat of EXPERIENCE_GUIDE) {
    for (const tip of cat.tips) {
      if (tip.commands.some(c => c.cmd === cmd && c.cli === cli)) {
        result.push({ category: cat, tip });
      }
    }
  }
  return result;
}



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
}) => {
  const COLORS = useColors();
  return (
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
        whiteSpace: 'normal', overflow: 'visible', wordBreak: 'break-all', lineHeight: 1.4 }}>
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
};

// 经验详情弹窗（position: fixed，自然覆盖一切）
const ExperienceDetailModal = ({ item, onClose }: {
  item: { category: ExperienceCategory; tip: ExperienceTip };
  onClose: () => void;
}) => {
  const COLORS = useColors();
  return (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: COLORS.bg === '#ffffff' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.85)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 200,
      padding: 20,
      overflow: 'auto',
    }}
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.95, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.95, y: 20 }}
      onClick={(e) => e.stopPropagation()}
      style={{
        width: '100%',
        maxWidth: 700,
        backgroundColor: COLORS.modalBg,
        borderRadius: 20,
        padding: 30,
        border: `2px solid ${item.category.color}40`,
        marginTop: 20,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 13, color: item.category.color, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{item.category.emoji}</span>
            <span>{item.category.title}</span>
          </div>
          <h2 style={{ fontSize: 22, color: COLORS.text, margin: 0 }}>{item.tip.title}</h2>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', padding: 5, flexShrink: 0 }}>
          <X size={24} />
        </button>
      </div>
      <p style={{ fontSize: 15, color: COLORS.textMuted, marginBottom: 16, lineHeight: 1.6 }}>{item.tip.scenario}</p>
      <div style={{ backgroundColor: item.category.color + '10', borderRadius: 12, padding: 16, marginBottom: 16, borderLeft: `4px solid ${item.category.color}` }}>
        <p style={{ color: COLORS.text, fontSize: 14, margin: 0, lineHeight: 1.7 }}>{item.tip.recommendation}</p>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: COLORS.textDim, marginBottom: 8 }}>关联命令：</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {item.tip.commands.map((cmd) => (
            <code key={getCommandKey(cmd.cmd, cmd.cli)} style={{ fontSize: 13, color: item.category.color, backgroundColor: item.category.color + '15', padding: '4px 10px', borderRadius: 4 }}>
              {cmd.cmd}
            </code>
          ))}
        </div>
      </div>
      {item.tip.tips && item.tip.tips.length > 0 && (
        <div>
          <div style={{ fontSize: 13, color: COLORS.textDim, marginBottom: 8 }}>使用建议：</div>
          {item.tip.tips.map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <span style={{ color: item.category.color, flexShrink: 0 }}>•</span>
              <span style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.6 }}>{t}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  </motion.div>
  );
};

// 命令详情弹窗
const CommandDetail = ({ command, onClose }: { command: Command; onClose: () => void }) => {
  const COLORS = useColors();
  const isLight = COLORS.bg === '#ffffff';
  const categoryColor = useCategoryColor(command.category);
  const cliColor = useCliColor(command.cli);
  const levelColor = command.level ? useLevelColor(command.level) : null;
  const relatedCommands = COMMANDS.filter(
    c => c.category === command.category && (c.cmd !== command.cmd || c.cli !== command.cli)
  ).slice(0, 5);

  // 反向关联
  const relatedCases = useMemo(() => getRelatedCases(command.cmd, command.cli), [command.cmd, command.cli]);
  const relatedExperiences = useMemo(() => getRelatedExperiences(command.cmd, command.cli), [command.cmd, command.cli]);

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

  const SIDE_WIDTH = 200;
  const hasCases = relatedCases.length > 0;
  const hasExps = relatedExperiences.length > 0;
  const hasSides = hasCases || hasExps;

  return (
    <>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: isLight ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.8)',
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
            maxWidth: hasSides ? 1100 : 640,
            width: '100%',
            maxHeight: '90vh',
          }}
        >
          {/* 左侧：案例面板（无数据时用占位保持宽度对称） */}
          {hasSides && (
            hasCases ? (
            <div style={{
              width: SIDE_WIDTH,
              flexShrink: 0,
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{
                backgroundColor: COLORS.panelBg,
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
            ) : (
              <div style={{ width: SIDE_WIDTH, flexShrink: 0 }} />
            )
          )}

          {/* 中间：命令详情 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* 命令详情主体：高度随内容，最高 90vh 可滚动 */}
            <div style={{
              backgroundColor: COLORS.modalBg,
              borderRadius: 20,
              padding: 30,
              overflow: 'auto',
              border: `2px solid ${categoryColor}40`,
              maxHeight: '90vh',
              boxSizing: 'border-box',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <code style={{
                    fontSize: 24, color: categoryColor, fontWeight: 'bold',
                    backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.4)', padding: '8px 16px', borderRadius: 8, display: 'inline-block',
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
                  backgroundColor: cliColor + '20', color: cliColor,
                  fontWeight: 600, border: `1px solid ${cliColor}40` }}>
                  {CLI_CONFIG[command.cli].label}
                </span>
                <StatusBadge status={command.status} />
                <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6,
                  backgroundColor: categoryColor + '20', color: categoryColor }}>
                  {CATEGORIES[command.category].label}
                </span>
                {command.level && levelColor && (
                  <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6,
                    backgroundColor: levelColor + '20',
                    color: levelColor }}>
                    复杂度 Level {command.level}
                  </span>
                )}
              </div>

              {command.detail && (
                <div style={{ backgroundColor: COLORS.codeBg, borderRadius: 12, padding: 16, marginBottom: 20, borderLeft: `4px solid ${categoryColor}` }}>
                  <h4 style={{ color: COLORS.text, marginBottom: 8, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BookOpen size={16} style={{ color: categoryColor }} />
                    详细说明
                  </h4>
                  <p style={{ color: COLORS.textMuted, fontSize: 14, margin: 0, lineHeight: 1.7 }}>{command.detail}</p>
                </div>
              )}

              {command.usage && (
                <div style={{ backgroundColor: categoryColor + '10', borderRadius: 12, padding: 16, marginBottom: 20, border: `1px solid ${categoryColor}30` }}>
                  <h4 style={{ color: COLORS.text, marginBottom: 8, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    💡 使用场景
                  </h4>
                  <p style={{ color: COLORS.text, fontSize: 14, margin: 0, lineHeight: 1.7 }}>{command.usage}</p>
                </div>
              )}

              {command.level && (
                <div style={{ backgroundColor: COLORS.codeBg, borderRadius: 12, padding: 16, marginBottom: 20 }}>
                  <h4 style={{ color: COLORS.text, marginBottom: 8, fontSize: 14 }}>💡 适用场景</h4>
                  <p style={{ color: COLORS.textMuted, fontSize: 14, margin: 0 }}>{WORKFLOW_LEVELS[command.level - 1].useCase}</p>
                </div>
              )}

              {relatedCommands.length > 0 && (
                <div>
                  <h4 style={{ color: COLORS.textMuted, marginBottom: 12, fontSize: 14 }}>相关命令</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {relatedCommands.map((c) => (
                      <RelatedCommandBadge key={getCommandKey(c.cmd, c.cli)} cmd={c.cmd} category={c.category} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            </div>

          {/* 右侧：经验面板（无数据时用占位保持宽度对称） */}
          {hasSides && (
            hasExps ? (
            <div style={{
              width: SIDE_WIDTH,
              flexShrink: 0,
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{
                backgroundColor: COLORS.panelBg,
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
            ) : (
              <div style={{ width: SIDE_WIDTH, flexShrink: 0 }} />
            )
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
            backgroundColor: COLORS.modalBg,
            borderRadius: 20,
            padding: 20,
            border: `2px solid ${categoryColor}40`,
            marginBottom: 12,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <code style={{ fontSize: 18, color: categoryColor, fontWeight: 'bold', backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.4)', padding: '6px 12px', borderRadius: 8, display: 'inline-block' }}>
                {command.cmd}
              </code>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', padding: 5 }}>
                <X size={22} />
              </button>
            </div>
            <p style={{ fontSize: 16, color: COLORS.text, marginBottom: 16 }}>{command.desc}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5,
                backgroundColor: cliColor + '20', color: cliColor,
                fontWeight: 600, border: `1px solid ${cliColor}40` }}>
                {CLI_CONFIG[command.cli].label}
              </span>
              <StatusBadge status={command.status} />
              <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, backgroundColor: categoryColor + '20', color: categoryColor }}>
                {CATEGORIES[command.category].label}
              </span>
            </div>
            {command.detail && (
              <div style={{ backgroundColor: COLORS.codeBg, borderRadius: 10, padding: 12, marginBottom: 12, borderLeft: `3px solid ${categoryColor}` }}>
                <p style={{ color: COLORS.textMuted, fontSize: 13, margin: 0, lineHeight: 1.6 }}>{command.detail}</p>
              </div>
            )}
            {command.usage && (
              <div style={{ backgroundColor: categoryColor + '10', borderRadius: 10, padding: 12, border: `1px solid ${categoryColor}30` }}>
                <p style={{ color: COLORS.text, fontSize: 13, margin: 0, lineHeight: 1.6 }}>{command.usage}</p>
              </div>
            )}
          </div>

          {/* 移动端：案例面板 */}
          {hasCases && (
            <div style={{
              backgroundColor: COLORS.panelBg,
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
            </div>
          )}

          {/* 移动端：经验面板 */}
          {hasExps && (
            <div style={{
              backgroundColor: COLORS.panelBg,
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
            </div>
          )}
        </div>
      )}
    </motion.div>
    {/* 复用 CaseDetail（position: fixed，自然覆盖整个屏幕包括侧边面板） */}
    <AnimatePresence>
      {activeCase && (
        <CaseDetail key={activeCase.id} caseItem={activeCase} onClose={() => setActiveCase(null)} />
      )}
    </AnimatePresence>
    {/* 经验详情弹窗（position: fixed） */}
    <AnimatePresence>
      {activeExp && (
        <ExperienceDetailModal key={activeExp.tip.id} item={activeExp} onClose={() => setActiveExp(null)} />
      )}
    </AnimatePresence>
    </>
  );
};

// 时间线组件
const TimelineSection = ({ onVersionClick }: { onVersionClick: (version: TimelineItem) => void }) => {
  const COLORS = useColors();
  return (
  <div style={{ marginBottom: 40 }}>
    <h2 style={{ fontSize: 28, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10, color: COLORS.text }}>
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
              color: '#fff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
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
};

// 4级工作流组件
const WorkflowLevelsSection = () => {
  const COLORS = useColors();
  return (
  <div style={{ marginBottom: 40 }}>
    <h2 style={{ fontSize: 28, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10, color: COLORS.text }}>
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
            <span style={{ fontSize: 14, color: '#fff', opacity: 0.9 }}>Level</span>
            <span style={{ fontSize: 32, color: '#fff', fontWeight: 'bold' }}>{level.level}</span>
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
};

// 老奶奶指南组件
const GrandmaGuide = () => {
  const COLORS = useColors();
  return (
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
      只需要记住这5个命令就够了！其他的让 /ccw 帮你选！
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
            backgroundColor: COLORS.bg === '#ffffff' ? 'rgba(236,72,153,0.06)' : 'rgba(236,72,153,0.08)',
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
                backgroundColor: COLORS.codeBg,
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
        backgroundColor: COLORS.bg === '#ffffff' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.2)',
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
};

// 废弃命令组件
const DeprecatedCommands = ({ searchQuery }: { searchQuery: string }) => {
  const COLORS = useColors();
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
            <tr style={{ backgroundColor: COLORS.codeBg }}>
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
                      backgroundColor: COLORS.bg === '#ffffff' ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.1)',
                      padding: '4px 10px',
                      borderRadius: 4,
                    }}
                  >
                    {item.old}
                  </code>
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'center', minWidth: 80 }}>
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    {item.deprecatedInVersion && (
                      <span
                        style={{
                          position: 'absolute',
                          top: -6,
                          left: '38%',
                          transform: 'translateX(-50%)',
                          fontSize: 9,
                          color: COLORS.textDim,
                          fontFamily: 'monospace',
                          whiteSpace: 'nowrap',
                        }}
                        title={`Deprecated in ${item.deprecatedInVersion}`}
                      >
                        {item.deprecatedInVersion}
                      </span>
                    )}
                    <svg width="50" height="14" viewBox="0 0 50 14" style={{ opacity: 0.6, marginTop: 4 }}>
                      <line x1="0" y1="7" x2="38" y2="7" stroke={COLORS.textMuted} strokeWidth="1.5" />
                      <polyline points="34,3 40,7 34,11" fill="none" stroke={COLORS.textMuted} strokeWidth="1.5" strokeLinejoin="round" />
                    </svg>
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {item.newCmd ? (
                    <code
                      style={{
                        fontSize: 14,
                        color: COLORS.secondary,
                        backgroundColor: COLORS.bg === '#ffffff' ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.1)',
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
const CaseStepItem = ({ step, index, onCommandClick }: { step: CaseStep; index: number; onCommandClick?: (cmdRef: { cmd: string; cli?: CLIType }) => void }) => {
  const COLORS = useColors();
  const isLight = COLORS.bg === '#ffffff';
  const bgAlpha = isLight ? 0.06 : 0.1;
  const borderAlpha = isLight ? 0.2 : 0.3;

  const getStyle = () => {
    switch (step.type) {
      case 'command':
        return {
          bg: `rgba(99,102,241,${bgAlpha})`,
          border: `rgba(99,102,241,${borderAlpha})`,
          icon: <Terminal size={16} style={{ color: COLORS.primary }} />,
        };
      case 'response':
        return {
          bg: `rgba(16,185,129,${bgAlpha})`,
          border: `rgba(16,185,129,${borderAlpha})`,
          icon: <MessageSquare size={16} style={{ color: COLORS.secondary }} />,
        };
      case 'result':
        return {
          bg: step.highlight ? `rgba(16,185,129,${isLight ? 0.1 : 0.15})` : `rgba(16,185,129,${bgAlpha})`,
          border: step.highlight ? COLORS.secondary : `rgba(16,185,129,${borderAlpha})`,
          icon: <CheckCircle size={16} style={{ color: COLORS.secondary }} />,
        };
      case 'note':
        return {
          bg: `rgba(245,158,11,${bgAlpha})`,
          border: `rgba(245,158,11,${borderAlpha})`,
          icon: <AlertTriangle size={16} style={{ color: COLORS.warning }} />,
        };
      case 'choice':
        return {
          bg: `rgba(139,92,246,${bgAlpha})`,
          border: `rgba(139,92,246,${borderAlpha})`,
          icon: <ChevronRight size={16} style={{ color: COLORS.accent2 }} />,
        };
      default:
        return {
          bg: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)',
          border: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)',
          icon: null,
        };
    }
  };

  const style = getStyle();

  const renderContentWithCommands = (content: string) => {
    const commandRegex = /(\/[\w:\-]+)/g;
    const parts = content.split(commandRegex);
    const cmdBgAlpha = isLight ? 0.12 : 0.2;
    const cmdBgAlphaHover = isLight ? 0.18 : 0.3;

    return parts.map((part, i) => {
      if (part.match(commandRegex)) {
        const cmd = findCommand(part);
        return (
          <code
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              if (cmd && onCommandClick) {
                onCommandClick({ cmd: part, cli: cmd.cli });
              }
            }}
            style={{
              fontSize: 'inherit',
              backgroundColor: cmd ? `rgba(99,102,241,${cmdBgAlpha})` : 'transparent',
              padding: cmd ? '2px 6px' : 0,
              borderRadius: 4,
              color: cmd ? COLORS.primary : 'inherit',
              cursor: cmd ? 'pointer' : 'inherit',
              fontFamily: 'monospace',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (cmd) {
                e.currentTarget.style.backgroundColor = `rgba(99,102,241,${cmdBgAlphaHover})`;
              }
            }}
            onMouseLeave={(e) => {
              if (cmd) {
                e.currentTarget.style.backgroundColor = `rgba(99,102,241,${cmdBgAlpha})`;
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
const CaseCard = ({ caseItem, onClick, onCommandClick }: { caseItem: Case; onClick: () => void; onCommandClick?: (cmdRef: { cmd: string; cli?: CLIType }) => void }) => {
  const COLORS = useColors();
  const caseLevelColor = useCaseLevelColor(String(caseItem.level));
  const levelConfig = LEVEL_CONFIG[String(caseItem.level)] || LEVEL_CONFIG['2'];
  const [isHovered, setIsHovered] = useState(false);
  const isLight = COLORS.bg === '#ffffff';

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
        backgroundColor: isHovered ? (isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)') : COLORS.cardBg,
        borderRadius: 16,
        padding: '20px 24px',
        border: `1px solid ${isHovered ? caseLevelColor + '60' : COLORS.cardBorder}`,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 24 }}>{levelConfig.emoji}</span>
        <div
          style={{
            backgroundColor: caseLevelColor + '20',
            padding: '4px 12px',
            borderRadius: 12,
            fontSize: 12,
            color: caseLevelColor,
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
        {caseItem.commands.map((cmd) => {
          const cmdInfo = findCommand(cmd.cmd, cmd.cli);
          return (
            <code
              key={getCommandKey(cmd.cmd, cmd.cli)}
              onClick={(e) => {
                e.stopPropagation();
                if (cmdInfo && onCommandClick) {
                  onCommandClick({ cmd: cmd.cmd, cli: cmd.cli });
                }
              }}
              style={{
                fontSize: 12,
                backgroundColor: cmdInfo ? caseLevelColor + '15' : COLORS.codeBg,
                padding: '4px 10px',
                borderRadius: 4,
                color: cmdInfo ? caseLevelColor : COLORS.secondary,
                cursor: cmdInfo ? 'pointer' : 'default',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (cmdInfo) {
                  e.currentTarget.style.backgroundColor = caseLevelColor + '30';
                }
              }}
              onMouseLeave={(e) => {
                if (cmdInfo) {
                  e.currentTarget.style.backgroundColor = caseLevelColor + '15';
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
const CaseDetail = ({ caseItem, onClose, onCommandClick }: { caseItem: Case; onClose: () => void; onCommandClick?: (cmdRef: { cmd: string; cli?: CLIType }) => void }) => {
  const COLORS = useColors();
  const isLight = COLORS.bg === '#ffffff';
  const caseLevelColor = useCaseLevelColor(String(caseItem.level));
  const levelConfig = LEVEL_CONFIG[String(caseItem.level)] || LEVEL_CONFIG['2'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: isLight ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.85)',
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
          backgroundColor: COLORS.modalBg,
          borderRadius: 20,
          padding: 30,
          maxWidth: 800,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          border: `2px solid ${caseLevelColor}40`,
        }}
      >
        {/* 头部 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 28 }}>{levelConfig.emoji}</span>
              <span
                style={{
                  backgroundColor: caseLevelColor + '20',
                  padding: '6px 14px',
                  borderRadius: 12,
                  fontSize: 14,
                  color: caseLevelColor,
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
            backgroundColor: COLORS.codeBg,
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
            backgroundColor: COLORS.codeBg,
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <h4 style={{ color: COLORS.text, marginBottom: 12, fontSize: 14 }}>🔧 涉及命令 <span style={{ color: COLORS.textDim, fontWeight: 'normal' }}>(点击查看详情)</span></h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {caseItem.commands.map((cmd) => {
              const cmdInfo = findCommand(cmd.cmd, cmd.cli);
              return (
                <div key={getCommandKey(cmd.cmd, cmd.cli)} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <code
                    onClick={(e) => {
                      e.stopPropagation();
                      if (cmdInfo && onCommandClick) {
                        onCommandClick({ cmd: cmd.cmd, cli: cmd.cli });
                      }
                    }}
                    style={{
                      fontSize: 14,
                      backgroundColor: cmdInfo ? caseLevelColor + '20' : COLORS.codeBg,
                      padding: '6px 12px',
                      borderRadius: 6,
                      color: cmdInfo ? caseLevelColor : COLORS.textMuted,
                      minWidth: 200,
                      cursor: cmdInfo ? 'pointer' : 'default',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (cmdInfo) {
                        e.currentTarget.style.backgroundColor = caseLevelColor + '35';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (cmdInfo) {
                        e.currentTarget.style.backgroundColor = caseLevelColor + '20';
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

        {/* 命令链可视化 */}
        {caseItem.commands.length > 1 && (
          <div
            style={{
              backgroundColor: COLORS.codeBg,
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <h4 style={{ color: COLORS.text, marginBottom: 16, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <GitBranch size={16} style={{ color: caseLevelColor }} />
              命令链流程
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              {caseItem.commands.map((cmd, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onCommandClick) {
                        onCommandClick({ cmd: cmd.cmd, cli: cmd.cli });
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      backgroundColor: caseLevelColor + '15',
                      border: `1px solid ${caseLevelColor}40`,
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    whileHover={{ scale: 1.05, backgroundColor: caseLevelColor + '25' }}
                  >
                    <span style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      backgroundColor: caseLevelColor,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 'bold',
                    }}>
                      {i + 1}
                    </span>
                    <code style={{ fontSize: 13, color: caseLevelColor }}>{cmd.cmd}</code>
                  </motion.div>
                  {i < caseItem.commands.length - 1 && (
                    <ChevronRight size={18} style={{ color: COLORS.textDim }} />
                  )}
                </span>
              ))}
            </div>
            <p style={{ fontSize: 12, color: COLORS.textDim, marginTop: 12, marginBottom: 0 }}>
              💡 命令按顺序执行，点击节点查看命令详情
            </p>
          </div>
        )}

        {/* 增强信息：前置条件、成功标准 */}
        {(caseItem.prerequisites || caseItem.successCriteria) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
            {caseItem.prerequisites && caseItem.prerequisites.length > 0 && (
              <div
                style={{
                  backgroundColor: COLORS.codeBg,
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <h4 style={{ color: COLORS.text, marginBottom: 12, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertCircle size={16} style={{ color: COLORS.warning }} />
                  前置条件
                </h4>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {caseItem.prerequisites.map((p, i) => (
                    <li key={i} style={{ color: COLORS.textMuted, marginBottom: 4, fontSize: 13 }}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
            {caseItem.successCriteria && caseItem.successCriteria.length > 0 && (
              <div
                style={{
                  backgroundColor: COLORS.codeBg,
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <h4 style={{ color: COLORS.text, marginBottom: 12, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={16} style={{ color: COLORS.secondary }} />
                  成功标准
                </h4>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {caseItem.successCriteria.map((s, i) => (
                    <li key={i} style={{ color: COLORS.textMuted, marginBottom: 4, fontSize: 13 }}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 复杂度信息 */}
        {(caseItem.estimatedTime || caseItem.difficulty) && (
          <div
            style={{
              display: 'flex',
              gap: 16,
              marginBottom: 20,
            }}
          >
            {caseItem.estimatedTime && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                backgroundColor: COLORS.codeBg,
                borderRadius: 8,
              }}>
                <Clock size={16} style={{ color: COLORS.textDim }} />
                <span style={{ fontSize: 13, color: COLORS.textMuted }}>预估时间:</span>
                <span style={{ fontSize: 13, color: COLORS.text, fontWeight: 600 }}>{caseItem.estimatedTime}</span>
              </div>
            )}
            {caseItem.difficulty && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                backgroundColor: COLORS.codeBg,
                borderRadius: 8,
              }}>
                <Target size={16} style={{ color: COLORS.textDim }} />
                <span style={{ fontSize: 13, color: COLORS.textMuted }}>难度:</span>
                <span style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: caseItem.difficulty === 'easy' ? COLORS.secondary
                    : caseItem.difficulty === 'medium' ? COLORS.warning
                    : COLORS.danger
                }}>
                  {caseItem.difficulty === 'easy' ? '简单' : caseItem.difficulty === 'medium' ? '中等' : '困难'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 交互步骤 */}
        <div
          style={{
            backgroundColor: COLORS.codeBg,
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <h4 style={{ color: COLORS.text, marginBottom: 16, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Play size={16} style={{ color: caseLevelColor }} />
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
              backgroundColor: caseLevelColor + '10',
              borderRadius: 12,
              padding: 16,
              border: `1px solid ${caseLevelColor}30`,
            }}
          >
            <h4 style={{ color: COLORS.text, marginBottom: 12, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TipIcon size={16} style={{ color: caseLevelColor }} />
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

// LLM 配置类型
interface LLMConfig {
  baseUrl: string;
  apiKey: string;
  modelId: string;
  enabled: boolean;
}

// LLM 分析结果类型
// 简单加密/解密（使用 Base64 + 简单混淆）
const encryptKey = (text: string): string => {
  if (!text) return '';
  const reversed = text.split('').reverse().join('');
  return btoa(reversed);
};

const decryptKey = (encrypted: string): string => {
  if (!encrypted) return '';
  try {
    const decoded = atob(encrypted);
    return decoded.split('').reverse().join('');
  } catch {
    return '';
  }
};

// LLM 配置存储
const LLM_CONFIG_KEY = 'ccw-llm-config';

const loadLLMConfig = (): LLMConfig => {
  try {
    const stored = localStorage.getItem(LLM_CONFIG_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...parsed,
        apiKey: decryptKey(parsed.apiKey),
      };
    }
  } catch (e) {
    console.error('Failed to load LLM config:', e);
  }
  return {
    baseUrl: '',
    apiKey: '',
    modelId: '',
    enabled: false,
  };
};

const saveLLMConfig = (config: LLMConfig) => {
  try {
    const toSave = {
      ...config,
      apiKey: encryptKey(config.apiKey),
    };
    localStorage.setItem(LLM_CONFIG_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.error('Failed to save LLM config:', e);
  }
};

// LLM 提示词缓存
let cachedLLMPrompt: string | null = null;

// 动态加载 LLM 提示词（从构建生成的文件）
const loadLLMPrompt = async (): Promise<string | null> => {
  if (cachedLLMPrompt) return cachedLLMPrompt;

  try {
    const response = await fetch('/llm-prompt.txt');
    if (response.ok) {
      cachedLLMPrompt = await response.text();
      console.log('[LLM] Loaded skill-based prompt, size:', cachedLLMPrompt.length);
      return cachedLLMPrompt;
    }
  } catch (e) {
    console.warn('[LLM] Failed to load skill-based prompt:', e);
  }
  return null;
};

// 构建 CCW-Help 上下文用于 LLM 分析（使用 skill 内容）
const buildCCWHelpContextFromSkill = async (): Promise<string> => {
  const skillPrompt = await loadLLMPrompt();
  if (skillPrompt) {
    return skillPrompt;
  }
  // Fallback to built-in context
  return buildCCWHelpContextBuiltin();
};

// 构建 CCW-Help 上下文（内置硬编码版本，作为 fallback）
const buildCCWHelpContextBuiltin = (): string => {
  const taskTypes = TASK_PATTERNS.map(p =>
    `- ${p.type} (Level ${p.level}, flow: ${p.flow}): ${p.desc} ${p.emoji}`
  ).join('\n');

  const flows = Object.entries(COMMAND_CHAINS).map(([key, chain]) =>
    `- ${key}: [${chain.commands.map(c => c.cmd).join(' → ')}] (${chain.tips.join(', ')})`
  ).join('\n');

  return `
## CCW-Help 命令推荐系统

### 工作流级别说明
- **Level 1**: 超简单任务，一步完成
- **Level 2**: 简单任务，规划+执行
- **Level 3**: 中等复杂度，规划+执行+验证
- **Level 4**: 复杂任务，探索+规划+执行+验证

### 任务类型列表
${taskTypes}

### 命令链定义
${flows}
`;
};

// LLM 分析函数 - 返回与关键词匹配相同的 IntentAnalysis 结构
const analyzeWithLLM = async (config: LLMConfig, input: string): Promise<IntentAnalysis | null> => {
  if (!config.baseUrl || !config.apiKey || !config.modelId) {
    return null;
  }

  // 使用 skill 内容构建上下文（异步加载）
  const ccwContext = await buildCCWHelpContextFromSkill();

  const systemPrompt = `你是一个 CCW 命令推荐专家。根据用户的任务描述，分析并推荐最合适的工作流程。

${ccwContext}

## 分析要求

1. 根据用户输入判断任务类型
2. 选择合适的 workflow flow
3. 推荐对应的命令链
4. 给出置信度（0-1）

## 返回格式（严格 JSON）

返回一个 JSON 对象，包含以下字段：
- taskType: 任务类型标识（如 bugfix, feature, complex-feature 等）
- level: 复杂度级别（1-4）
- flow: 工作流标识（如 rapid, bugfix.standard, collaborative-plan 等）
- confidence: 置信度（0-1）
- reason: 选择这个工作流的原因（简短说明）
- commands: 推荐的命令数组，每项包含 {cmd, desc}

示例返回：
{
  "taskType": "complex-feature",
  "level": 3,
  "flow": "collaborative-plan",
  "confidence": 0.85,
  "reason": "任务涉及架构扩展和性能优化，需要多人协作规划",
  "commands": [
    {"cmd": "/workflow:collaborative-plan-with-file", "desc": "协作规划"},
    {"cmd": "/workflow:unified-execute-with-file", "desc": "统一执行"}
  ]
}

请只返回 JSON，不要有其他内容。`;

  try {
    // 使用 Vercel Serverless Function 代理解决 CORS
    const proxyUrl = '/api/proxy';

    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        modelId: config.modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: input },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (content) {
      // 提取最外层 JSON（处理嵌套括号）
      let braceCount = 0;
      let startIdx = -1;
      let jsonStr = '';

      for (let i = 0; i < content.length; i++) {
        if (content[i] === '{') {
          if (braceCount === 0) startIdx = i;
          braceCount++;
        } else if (content[i] === '}') {
          braceCount--;
          if (braceCount === 0 && startIdx !== -1) {
            jsonStr = content.slice(startIdx, i + 1);
            break;
          }
        }
      }

      if (!jsonStr) {
        // 回退到正则提取
        const jsonMatch = content.match(/\{[\s\S]*?\}/);
        if (jsonMatch) jsonStr = jsonMatch[0];
      }

      if (jsonStr) {
        const parsed = JSON.parse(jsonStr);

        // 从 COMMAND_CHAINS 获取完整的 chain 信息
        const chain = COMMAND_CHAINS[parsed.flow] || COMMAND_CHAINS['rapid'];

        // 构建匹配的 pattern
        const pattern = TASK_PATTERNS.find(p => p.type === parsed.taskType) || TASK_PATTERNS[TASK_PATTERNS.length - 1];

        // 构建 IntentAnalysis 结构（支持多链条）
        const result: IntentAnalysis = {
          goal: input,
          taskType: parsed.taskType,
          level: parsed.level,
          flow: parsed.flow,
          chain: {
            ...chain,
            // 如果 LLM 返回了自定义命令，使用 LLM 的
            commands: parsed.commands || chain.commands,
          },
          pattern,
          confidence: parsed.confidence || 0.8,
          matchedKeyword: parsed.reason,  // 不再截断，显示完整分析依据
          isDefaultFallback: false,
          allMatches: [],
        };

        // 如果 LLM 返回了多链条方案，使用它
        if (parsed.chains && Array.isArray(parsed.chains) && parsed.chains.length > 0) {
          const mappedChains = parsed.chains.map((c: any) => ({
            name: c.name || `Level ${c.level} 方案`,
            flow: c.flow,
            level: c.level,
            commands: c.commands || [],
            tips: c.tips || chain.tips,
          }));
          result.chains = mappedChains;
          // 用第一个方案作为主 chain（向后兼容）
          const firstChain = mappedChains[0];
          result.chain = {
            ...COMMAND_CHAINS[firstChain.flow] || chain,
            commands: firstChain.commands,
          };
          result.flow = firstChain.flow;
          result.level = firstChain.level;
        }

        return result;
      }
    }
    return null;
  } catch (e: any) {
    console.error('LLM analysis failed:', e);
    throw new Error(e.message || 'LLM 调用失败');
  }
};

// 智能推荐器组件
const RecommenderSection = ({
  onCommandClick
}: {
  onCommandClick: (cmd: Command) => void;
}) => {
  const COLORS = useColors();
  const [input, setInput] = useState('');
  const [analysisResult, setAnalysisResult] = useState<IntentAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedChainIndex, setSelectedChainIndex] = useState(0); // 当前选中的链条方案

  // LLM 配置状态
  const [llmConfig, setLLMConfig] = useState<LLMConfig>(loadLLMConfig);
  const [showLLMConfig, setShowLLMConfig] = useState(false);
  const [llmError, setLLMError] = useState<string | null>(null);

  // 保存配置
  const handleSaveConfig = () => {
    saveLLMConfig(llmConfig);
    setShowLLMConfig(false);
  };

  // 分析处理
  const handleAnalyze = async () => {
    if (!input.trim()) return;

    setIsAnalyzing(true);
    setLLMError(null);
    setAnalysisResult(null);
    setSelectedChainIndex(0); // 重置选中的链条方案

    // 如果启用了 LLM，优先使用 LLM 分析
    if (llmConfig.enabled && llmConfig.baseUrl && llmConfig.apiKey && llmConfig.modelId) {
      try {
        const result = await analyzeWithLLM(llmConfig, input);
        if (result) {
          setAnalysisResult(result);
          setIsAnalyzing(false);
          return;
        }
      } catch (e: any) {
        setLLMError(e.message || 'LLM 调用失败');
      }
    }

    // LLM 未启用或失败时，使用关键词匹配
    const keywordResult = analyzeIntent(input);
    setAnalysisResult(keywordResult);
    setIsAnalyzing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAnalyze();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      style={{ marginBottom: 40 }}
    >
      <h2 style={{ fontSize: 28, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10, color: COLORS.text }}>
        <SearchIcon size={28} style={{ color: llmConfig.enabled ? COLORS.accent2 : COLORS.accent3 }} />
        {llmConfig.enabled ? 'LLM 智能推荐' : '命令匹配推荐'}
      </h2>
      <p style={{ color: COLORS.textMuted, marginBottom: 24, fontSize: 15 }}>
        {llmConfig.enabled
          ? '输入任务描述，LLM 会分析并推荐最合适的命令链'
          : '输入任务描述，系统会匹配关键词并推荐最合适的命令链'
        }
      </p>

      {/* 输入区域 */}
      <div style={{
        background: COLORS.cardBg,
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        border: `1px solid ${COLORS.cardBorder}`,
      }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="例如：修复登录超时问题、添加用户认证功能、重构支付模块..."
            style={{
              flex: 1,
              background: COLORS.codeBg,
              border: `1px solid ${COLORS.cardBorder}`,
              borderRadius: 12,
              padding: '14px 18px',
              color: COLORS.text,
              fontSize: 15,
              outline: 'none',
            }}
          />
          <motion.button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !input.trim()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              background: llmConfig.enabled
                ? `linear-gradient(135deg, ${COLORS.accent2}, ${COLORS.primary})`
                : `linear-gradient(135deg, ${COLORS.accent3}, ${COLORS.primary})`,
              border: 'none',
              borderRadius: 12,
              padding: '14px 24px',
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
              cursor: isAnalyzing || !input.trim() ? 'not-allowed' : 'pointer',
              opacity: isAnalyzing || !input.trim() ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {isAnalyzing ? (
              <>
                <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
                {llmConfig.enabled ? 'LLM 分析中...' : '匹配中...'}
              </>
            ) : (
              <>
                {llmConfig.enabled ? <Cpu size={18} /> : <SearchIcon size={18} />}
                {llmConfig.enabled ? '智能分析' : '匹配'}
              </>
            )}
          </motion.button>
        </div>

        {/* 快捷示例 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 13, color: COLORS.textDim }}>试试:</span>
          {[
            '修复登录超时问题',
            '添加用户认证系统',
            '重构支付模块',
            '写单元测试',
          ].map((example, i) => (
            <button
              key={i}
              onClick={() => {
                setInput(example);
                // 不自动触发分析，让用户自己点击按钮
              }}
              style={{
                background: 'transparent',
                border: `1px solid ${COLORS.cardBorder}`,
                borderRadius: 20,
                padding: '6px 12px',
                color: COLORS.textMuted,
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = COLORS.primary;
                e.currentTarget.style.color = COLORS.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = COLORS.cardBorder;
                e.currentTarget.style.color = COLORS.textMuted;
              }}
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* LLM 配置区域 */}
      <div style={{
        background: COLORS.cardBg,
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        border: `1px solid ${COLORS.cardBorder}`,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: showLLMConfig ? 16 : 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Cpu size={20} style={{ color: llmConfig.enabled ? COLORS.accent2 : COLORS.textDim }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15, color: COLORS.text }}>LLM 智能分析</span>
                <span style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: llmConfig.enabled ? COLORS.accent2 + '20' : (COLORS.bg === '#ffffff' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)'),
                  color: llmConfig.enabled ? COLORS.accent2 : COLORS.textMuted,
                }}>
                  {llmConfig.enabled ? '已启用' : '未启用'}
                </span>
              </div>
              <span style={{ fontSize: 11, color: COLORS.textMuted }}>
                提示词上下文约 20k tokens
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* 开关 */}
            <button
              onClick={() => {
                const newConfig = { ...llmConfig, enabled: !llmConfig.enabled };
                setLLMConfig(newConfig);
                saveLLMConfig(newConfig);
              }}
              style={{
                width: 48,
                height: 26,
                borderRadius: 13,
                border: 'none',
                background: llmConfig.enabled ? COLORS.accent2 : 'rgba(255,255,255,0.2)',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
              }}
            >
              <div style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: '#fff',
                position: 'absolute',
                top: 2,
                left: llmConfig.enabled ? 24 : 2,
                transition: 'left 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }} />
            </button>
            {/* 配置按钮 */}
            <motion.button
              onClick={() => setShowLLMConfig(!showLLMConfig)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                background: 'transparent',
                border: `1px solid ${COLORS.cardBorder}`,
                borderRadius: 8,
                padding: '6px 12px',
                color: COLORS.textMuted,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <SettingsIcon size={14} />
              配置
            </motion.button>
          </div>
        </div>

        {/* 配置表单 */}
        <AnimatePresence>
          {showLLMConfig && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{
                marginTop: 16,
                padding: 16,
                background: COLORS.cardBg,
                borderRadius: 12,
              }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, color: COLORS.textMuted, marginBottom: 6 }}>
                    Base URL
                  </label>
                  <input
                    type="text"
                    value={llmConfig.baseUrl}
                    onChange={(e) => setLLMConfig({ ...llmConfig, baseUrl: e.target.value })}
                    placeholder="例如: https://api.openai.com/v1"
                    style={{
                      width: '100%',
                      background: COLORS.codeBg,
                      border: `1px solid ${COLORS.cardBorder}`,
                      borderRadius: 8,
                      padding: '10px 14px',
                      color: COLORS.text,
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, color: COLORS.textMuted, marginBottom: 6 }}>
                    API Key
                  </label>
                  <input
                    type="password"
                    value={llmConfig.apiKey}
                    onChange={(e) => setLLMConfig({ ...llmConfig, apiKey: e.target.value })}
                    placeholder="sk-..."
                    style={{
                      width: '100%',
                      background: COLORS.codeBg,
                      border: `1px solid ${COLORS.cardBorder}`,
                      borderRadius: 8,
                      padding: '10px 14px',
                      color: COLORS.text,
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <span style={{ fontSize: 11, color: COLORS.textDim, marginTop: 4, display: 'block' }}>
                    🔒 API Key 会加密存储在浏览器本地
                  </span>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, color: COLORS.textMuted, marginBottom: 6 }}>
                    Model ID
                  </label>
                  <input
                    type="text"
                    value={llmConfig.modelId}
                    onChange={(e) => setLLMConfig({ ...llmConfig, modelId: e.target.value })}
                    placeholder="例如: gpt-4o, claude-3-5-sonnet-latest"
                    style={{
                      width: '100%',
                      background: COLORS.codeBg,
                      border: `1px solid ${COLORS.cardBorder}`,
                      borderRadius: 8,
                      padding: '10px 14px',
                      color: COLORS.text,
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      setLLMConfig(loadLLMConfig());
                      setShowLLMConfig(false);
                    }}
                    style={{
                      background: 'transparent',
                      border: `1px solid ${COLORS.cardBorder}`,
                      borderRadius: 8,
                      padding: '8px 16px',
                      color: COLORS.textMuted,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    取消
                  </button>
                  <motion.button
                    onClick={handleSaveConfig}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      background: COLORS.primary,
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 16px',
                      color: '#fff',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    保存配置
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 分析结果 - 仅在没有 LLM 结果时显示关键词匹配 */}
      <AnimatePresence mode="wait">
        {analysisResult && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              background: COLORS.cardBg,
              borderRadius: 16,
              padding: 24,
              border: `1px solid ${COLORS.cardBorder}`,
            }}
          >
            {/* LLM 错误提示 - 放在明显位置 */}
            {llmError && (
              <div style={{
                padding: '16px 20px',
                background: COLORS.warning + '15',
                borderRadius: 12,
                marginBottom: 20,
                border: `1px solid ${COLORS.warning}40`,
                borderLeft: `4px solid ${COLORS.warning}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <AlertTriangle size={20} style={{ color: COLORS.warning }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.warning }}>
                    LLM 调用失败
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: COLORS.textMuted }}>
                  {llmError}
                </p>
                <p style={{ margin: '8px 0 0 0', fontSize: 12, color: COLORS.textDim, fontStyle: 'italic' }}>
                  已自动回退到关键词匹配模式，以下是关键词匹配推荐结果：
                </p>
              </div>
            )}

            {/* 匹配摘要 */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 16,
              marginBottom: 24,
              padding: '16px 20px',
              background: COLORS.codeBg,
              borderRadius: 12,
            }}>
              <span style={{ fontSize: 32 }}>{analysisResult.pattern.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 600, color: COLORS.text }}>
                    {analysisResult.pattern.desc}
                  </span>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 600,
                    background: WORKFLOW_LEVELS[analysisResult.level - 1].color + '20',
                    color: WORKFLOW_LEVELS[analysisResult.level - 1].color,
                  }}>
                    Level {analysisResult.level}
                  </span>
                </div>
                {/* 匹配到的关键词 */}
                {analysisResult.matchedKeyword && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    marginBottom: 8,
                    padding: '8px 12px',
                    background: COLORS.accent3 + '10',
                    borderRadius: 8,
                    borderLeft: `3px solid ${COLORS.accent3}`,
                    flexWrap: 'wrap',
                  }}>
                    <SearchIcon size={14} style={{ color: COLORS.accent3, flexShrink: 0, marginTop: 3 }} />
                    <span style={{ fontSize: 12, color: COLORS.textMuted, flexShrink: 0 }}>{llmConfig.enabled ? 'LLM 分析依据:' : '匹配关键词:'}</span>
                    <code style={{
                      fontSize: 13,
                      color: COLORS.accent3,
                      background: COLORS.codeBg,
                      padding: '4px 8px',
                      borderRadius: 4,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      flex: 1,
                      minWidth: 200,
                    }}>
                      {analysisResult.matchedKeyword}
                    </code>
                    {/* 显示置信度 */}
                    <span style={{
                      fontSize: 11,
                      color: COLORS.textDim,
                      flexShrink: 0,
                    }}>
                      置信度: {Math.round(analysisResult.confidence * 100)}%
                    </span>
                  </div>
                )}
                {/* 改进2: 使用 isDefaultFallback 判断是否为默认兜底 */}
                {analysisResult.isDefaultFallback && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 8,
                    padding: '8px 12px',
                    background: COLORS.warning + '10',
                    borderRadius: 8,
                    borderLeft: `3px solid ${COLORS.warning}`,
                  }}>
                    <AlertTriangle size={14} style={{ color: COLORS.warning }} />
                    <span style={{ fontSize: 12, color: COLORS.textMuted }}>
                      未匹配到特定关键词，使用默认推荐
                    </span>
                    <span style={{
                      fontSize: 11,
                      color: COLORS.textDim,
                    }}>
                      (置信度: {Math.round(analysisResult.confidence * 100)}%)
                    </span>
                  </div>
                )}
                {/* 改进3: 显示备选方案（当有多个匹配时） */}
                {analysisResult.allMatches && analysisResult.allMatches.length > 1 && (
                  <div style={{
                    marginTop: 8,
                    padding: '8px 12px',
                    background: COLORS.cardBg,
                    borderRadius: 8,
                  }}>
                    <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 6 }}>
                      其他可能匹配:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {analysisResult.allMatches.slice(1, 4).map((m, i) => (
                        <span key={i} style={{
                          fontSize: 11,
                          padding: '4px 8px',
                          background: COLORS.codeBg,
                          borderRadius: 4,
                          color: COLORS.textMuted,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}>
                          <span>{m.pattern.emoji}</span>
                          <span>{m.pattern.desc}</span>
                          <code style={{ fontSize: 10, color: COLORS.accent2 }}>"{m.matchedKeyword}"</code>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ fontSize: 13, color: COLORS.textDim }}>
                  输入内容: {analysisResult.goal}
                </div>
              </div>
            </div>

            {/* 推荐命令链 - 支持多方案 */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h4 style={{ fontSize: 16, color: COLORS.text, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <GitBranch size={18} style={{ color: COLORS.primary }} />
                  推荐命令链
                  {analysisResult.chains && analysisResult.chains.length > 1 && (
                    <span style={{ fontSize: 12, color: COLORS.textMuted }}>
                      ({analysisResult.chains.length} 个方案)
                    </span>
                  )}
                </h4>
              </div>

              {/* 多方案标签页 */}
              {analysisResult.chains && analysisResult.chains.length > 1 && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  {analysisResult.chains.map((chain, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedChainIndex(idx)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 8,
                        border: 'none',
                        background: selectedChainIndex === idx ? COLORS.primary : 'rgba(0,0,0,0.2)',
                        color: selectedChainIndex === idx ? '#fff' : COLORS.textMuted,
                        fontSize: 13,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{chain.name}</div>
                      <div style={{ fontSize: 11, opacity: 0.8 }}>Level {chain.level}</div>
                    </button>
                  ))}
                </div>
              )}

              {/* 当前选中的命令链 */}
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                {(analysisResult.chains?.[selectedChainIndex]?.commands || analysisResult.chain.commands).map((cmd, i) => {
                  // 使用模糊匹配查找命令
                  const cmdInfo = COMMANDS.find(c => c.cmd === cmd.cmd || c.cmd.includes(cmd.cmd.replace('/', '')));
                  // 使用 selectedChainIndex + cmd.cmd + i 组合作为唯一 key，确保切换命令链时正确重新渲染
                  const uniqueKey = `${selectedChainIndex}-${cmd.cmd}-${i}`;
                  return (
                    <span key={uniqueKey} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        onClick={() => {
                          if (cmdInfo) {
                            onCommandClick(cmdInfo);
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '12px 16px',
                          background: cmdInfo ? COLORS.primary + '15' : (COLORS.bg === '#ffffff' ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.2)'),
                          border: `1px solid ${cmdInfo ? COLORS.primary + '40' : COLORS.cardBorder}`,
                          borderRadius: 10,
                          cursor: cmdInfo ? 'pointer' : 'default',
                          transition: 'all 0.2s',
                        }}
                        whileHover={cmdInfo ? { scale: 1.03, backgroundColor: COLORS.primary + '25' } : {}}
                      >
                        <span style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: COLORS.primary,
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 'bold',
                        }}>
                          {i + 1}
                        </span>
                        <code style={{ fontSize: 14, color: cmdInfo ? COLORS.primary : COLORS.textMuted }}>
                          {cmd.cmd}
                        </code>
                        <span style={{ fontSize: 12, color: COLORS.textMuted }}>{cmd.desc}</span>
                      </motion.div>
                      {i < (analysisResult.chains?.[selectedChainIndex]?.commands || analysisResult.chain.commands).length - 1 && (
                        <ChevronRight size={20} style={{ color: COLORS.textDim }} />
                      )}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* 使用提示 */}
            {(analysisResult.chains?.[selectedChainIndex]?.tips || analysisResult.chain.tips).length > 0 && (
              <div style={{
                padding: '16px 20px',
                background: COLORS.secondary + '10',
                borderRadius: 12,
                borderLeft: `4px solid ${COLORS.secondary}`,
              }}>
                <h5 style={{ fontSize: 14, color: COLORS.text, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TipIcon size={16} style={{ color: COLORS.secondary }} />
                  使用提示
                </h5>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {(analysisResult.chains?.[selectedChainIndex]?.tips || analysisResult.chain.tips).map((tip, i) => (
                    <li key={i} style={{ color: COLORS.textMuted, marginBottom: 4, fontSize: 13 }}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 一键执行 */}
            <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  // 复制命令到剪贴板
                  const ccwCmd = `/ccw "${analysisResult.goal}"`;

                  // Fallback for non-HTTPS environments
                  const copyToClipboard = (text: string) => {
                    if (navigator.clipboard && window.isSecureContext) {
                      return navigator.clipboard.writeText(text);
                    } else {
                      // Fallback using textarea
                      const textarea = document.createElement('textarea');
                      textarea.value = text;
                      textarea.style.position = 'fixed';
                      textarea.style.left = '-9999px';
                      document.body.appendChild(textarea);
                      textarea.select();
                      document.execCommand('copy');
                      document.body.removeChild(textarea);
                      return Promise.resolve();
                    }
                  };

                  copyToClipboard(ccwCmd).then(() => {
                    alert(`已复制命令: ${ccwCmd}`);
                  }).catch(() => {
                    alert(`复制失败，请手动复制: ${ccwCmd}`);
                  });
                }}
                style={{
                  flex: 1,
                  background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent2})`,
                  border: 'none',
                  borderRadius: 12,
                  padding: '14px 20px',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Terminal size={18} />
                复制 /ccw 命令
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 匹配原理说明 */}
      <div style={{
        marginTop: 24,
        padding: '16px 20px',
        background: COLORS.cardBg,
        borderRadius: 12,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}>
        <Info size={20} style={{ color: COLORS.textDim, flexShrink: 0, marginTop: 2 }} />
        <div>
          <h5 style={{ fontSize: 14, color: COLORS.text, marginBottom: 6 }}>匹配原理</h5>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li style={{ color: COLORS.textMuted, marginBottom: 4, fontSize: 13 }}><b>LLM 模式</b>：启用后通过 AI 分析任务需求，智能推荐命令链（上下文约 20k tokens）</li>
            <li style={{ color: COLORS.textMuted, marginBottom: 4, fontSize: 13 }}><b>正则模式</b>：通过关键词匹配识别任务类型，支持中英文如 "修复"、"refactor"、"紧急"</li>
            <li style={{ color: COLORS.textMuted, marginBottom: 4, fontSize: 13 }}>点击命令节点可查看命令详情</li>
            <li style={{ color: COLORS.textMuted, fontSize: 13 }}>复制 /ccw 命令可在 Claude Code 中直接执行</li>
          </ul>
        </div>
      </div>
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
  onCommandClick?: (cmdRef: { cmd: string; cli?: CLIType }) => void;
}) => {
  const COLORS = useColors();
  const filteredCases = selectedLevel === 'all'
    ? ALL_CASES
    : CASES_BY_LEVEL[selectedLevel] || [];

  return (
    <div style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 28, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10, color: COLORS.text }}>
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
            backgroundColor: selectedLevel === 'all' ? COLORS.primary + '20' : COLORS.cardBg,
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
  onCommandClick: (cmdRef: { cmd: string; cli: CLIType }) => void;
}) => {
  const COLORS = useColors();
  const [isHovered, setIsHovered] = useState(false);
  const isSequence = tip.commandType === 'sequence';
  const isLight = COLORS.bg === '#ffffff';

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
        backgroundColor: isHovered ? (isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)') : COLORS.cardBg,
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
            <div key={getCommandKey(cmd.cmd, cmd.cli)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <code
                onClick={() => onCommandClick({ cmd: cmd.cmd, cli: cmd.cli })}
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
                {cmd.cmd}
              </code>
              {i < tip.commands.length - 1 && (
                <span style={{ color: COLORS.textDim, fontSize: 14 }}>→</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {tip.commands.map((cmd) => (
            <code
              key={getCommandKey(cmd.cmd, cmd.cli)}
              onClick={() => onCommandClick({ cmd: cmd.cmd, cli: cmd.cli })}
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
              {cmd.cmd}
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
  onCommandClick: (cmdRef: { cmd: string; cli: CLIType }) => void;
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
  const COLORS = useColors();
  const isLight = COLORS.bg === '#ffffff';
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: isLight ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.85)',
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
          backgroundColor: COLORS.modalBg,
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
            backgroundColor: COLORS.codeBg,
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
            backgroundColor: COLORS.codeBg,
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
type TabType = 'overview' | 'commands' | 'cases' | 'install' | 'experience' | 'recommender';

// Tab 配置
const TABS: { key: TabType; label: string; icon: React.ReactNode; desc: string }[] = [
  { key: 'overview', label: '概览', icon: <Home size={18} />, desc: '成长地图、工作流、快速入门' },
  { key: 'recommender', label: '推荐', icon: <Sparkles size={18} />, desc: '智能命令推荐' },
  { key: 'commands', label: '命令', icon: <Terminal size={18} />, desc: '所有命令列表' },
  { key: 'cases', label: '案例', icon: <Play size={18} />, desc: '使用案例和场景' },
  { key: 'experience', label: '经验', icon: <TipIcon size={18} />, desc: '场景决策指南' },
  { key: 'install', label: '安装', icon: <Wrench size={18} />, desc: '安装和使用指南' },
];

// 主应用
function App() {
  // 获取主题感知的颜色
  const COLORS = useColors();

  const [activeTab, setActiveTab] = useState<TabType>('commands'); // 默认显示命令
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CommandCategory | 'all'>('all');
  const [selectedLevel, setSelectedLevel] = useState<number | 'all'>('all');
  const [selectedCLI, setSelectedCLI] = useState<CLIType | 'all'>('all');
  const [selectedCommand, setSelectedCommand] = useState<Command | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<TimelineItem | null>(null);
  const [selectedCaseLevel, setSelectedCaseLevel] = useState<string>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
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
        {/* 右上角按钮组 */}
        <div className="header-actions">
          <ThemeToggle />
          <a
            href="https://github.com/zhao-wuyan/ccw-command-explorer"
            target="_blank"
            rel="noopener noreferrer"
            className="github-corner-btn"
          >
            <Github size={18} />
            <span>GitHub</span>
          </a>
        </div>
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
                id="search-commands"
                name="search-commands"
                placeholder="搜索命令..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
                autoComplete="off"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="clear-btn">
                  <X size={16} />
                </button>
              )}
            </div>

            {/* 移动端汉堡菜单按钮 */}
            <button
              className={`filter-toggle-btn ${showFilterDropdown ? 'active' : ''}`}
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              aria-label="筛选"
            >
              <SlidersHorizontal size={20} />
            </button>

            {/* 筛选器下拉面板 */}
            <AnimatePresence>
              {showFilterDropdown && (
                <motion.div
                  className="filter-dropdown"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                >
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
                </motion.div>
              )}
            </AnimatePresence>

            {/* 桌面端筛选器横向排列 */}
            <div className="filter-scroll desktop-only">
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

          {/* 智能推荐 Tab */}
          {activeTab === 'recommender' && (
            <RecommenderSection onCommandClick={setSelectedCommand} />
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
                onCommandClick={(cmdRef) => {
                  const command = findCommand(cmdRef.cmd, cmdRef.cli);
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
                onCommandClick={(cmdRef) => {
                  const command = findCommand(cmdRef.cmd, cmdRef.cli);
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
                    <div style={{ background: COLORS.codeBg, borderRadius: 12, padding: 16 }}>
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
                        background: COLORS.codeBg,
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
                    <div style={{ background: COLORS.codeBg, borderRadius: 12, padding: 16 }}>
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
                        background: COLORS.codeBg,
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
                    <div style={{ background: COLORS.cardBg, borderRadius: 12, padding: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <span style={{ color: COLORS.textMuted, fontSize: 14 }}>📁 安装目录结构</span>
                      </div>
                      <code style={{
                        display: 'block',
                        background: COLORS.codeBg,
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
                        <code style={{ background: COLORS.codeBg, padding: '8px 12px', borderRadius: 6, color: COLORS.secondary, fontSize: 13 }}>
                          ccw install -m Global
                        </code>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <span style={{ color: COLORS.primary, fontSize: 18, fontWeight: 'bold' }}>2.</span>
                      <div>
                        <p style={{ color: COLORS.text, marginBottom: 4 }}>在项目目录中启动 Claude Code 或 Codex</p>
                        <code style={{ background: COLORS.codeBg, padding: '8px 12px', borderRadius: 6, color: COLORS.secondary, fontSize: 13 }}>
                          claude / codex
                        </code>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <span style={{ color: COLORS.primary, fontSize: 18, fontWeight: 'bold' }}>3.</span>
                      <div>
                        <p style={{ color: COLORS.text, marginBottom: 4 }}>验证安装是否成功</p>
                        <code style={{ background: COLORS.codeBg, padding: '8px 12px', borderRadius: 6, color: COLORS.secondary, fontSize: 13 }}>
                          /workflow:session:list
                        </code>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <span style={{ color: COLORS.primary, fontSize: 18, fontWeight: 'bold' }}>4.</span>
                      <div>
                        <p style={{ color: COLORS.text, marginBottom: 4 }}>使用 /ccw 命令让 AI 帮你选择工作流</p>
                        <code style={{ background: COLORS.codeBg, padding: '8px 12px', borderRadius: 6, color: COLORS.secondary, fontSize: 13 }}>
                          /ccw 帮我实现用户登录功能
                        </code>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <span style={{ color: COLORS.primary, fontSize: 18, fontWeight: 'bold' }}>5.</span>
                      <div>
                        <p style={{ color: COLORS.text, marginBottom: 4 }}>或者使用具体的工作流命令</p>
                        <code style={{ background: COLORS.codeBg, padding: '8px 12px', borderRadius: 6, color: COLORS.secondary, fontSize: 13 }}>
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
