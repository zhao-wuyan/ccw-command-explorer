import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, Home, GitBranch, Users, AlertCircle, Database,
  Lightbulb, TestTube, FlaskConical, Search as SearchIcon, Palette,
  Wrench, X, Clock, Target, Sparkles, BookOpen, Info, Bot
} from 'lucide-react';
import {
  COMMANDS, CATEGORIES, TIMELINE, WORKFLOW_LEVELS, GRANDMA_COMMANDS,
  DEPRECATED_COMMANDS, STATS, COLORS, CLI_CONFIG
} from './data/commands';
import type { Command, CommandCategory, TimelineItem, CLIType } from './data/commands';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
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
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
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

// 命令详情弹窗
const CommandDetail = ({ command, onClose }: { command: Command; onClose: () => void }) => {
  const category = CATEGORIES[command.category];
  const relatedCommands = COMMANDS.filter(
    c => c.category === command.category && c.cmd !== command.cmd
  ).slice(0, 5);

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
          maxWidth: 600,
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto',
          border: `2px solid ${category.color}40`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <code
              style={{
                fontSize: 24,
                color: category.color,
                fontWeight: 'bold',
                backgroundColor: 'rgba(0,0,0,0.4)',
                padding: '8px 16px',
                borderRadius: 8,
                display: 'inline-block',
              }}
            >
              {command.cmd}
            </code>
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

        <p style={{ fontSize: 18, color: COLORS.text, marginBottom: 20 }}>
          {command.desc}
        </p>

        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: 12,
              padding: '4px 10px',
              borderRadius: 6,
              backgroundColor: CLI_CONFIG[command.cli].color + '25',
              color: CLI_CONFIG[command.cli].color,
              fontWeight: 600,
              border: `1px solid ${CLI_CONFIG[command.cli].color}40`,
            }}
          >
            {CLI_CONFIG[command.cli].label}
          </span>
          <StatusBadge status={command.status} />
          <span
            style={{
              fontSize: 12,
              padding: '4px 10px',
              borderRadius: 6,
              backgroundColor: category.color + '20',
              color: category.color,
            }}
          >
            {category.label}
          </span>
          {command.level && (
            <span
              style={{
                fontSize: 12,
                padding: '4px 10px',
                borderRadius: 6,
                backgroundColor: WORKFLOW_LEVELS[command.level - 1].color + '20',
                color: WORKFLOW_LEVELS[command.level - 1].color,
              }}
            >
              复杂度 Level {command.level}
            </span>
          )}
        </div>

        {/* 详细说明 */}
        {command.detail && (
          <div
            style={{
              backgroundColor: 'rgba(0,0,0,0.3)',
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
              borderLeft: `4px solid ${category.color}`,
            }}
          >
            <h4 style={{ color: COLORS.text, marginBottom: 8, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={16} style={{ color: category.color }} />
              详细说明
            </h4>
            <p style={{ color: COLORS.textMuted, fontSize: 14, margin: 0, lineHeight: 1.7 }}>
              {command.detail}
            </p>
          </div>
        )}

        {/* 使用场景 */}
        {command.usage && (
          <div
            style={{
              backgroundColor: category.color + '10',
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
              border: `1px solid ${category.color}30`,
            }}
          >
            <h4 style={{ color: COLORS.text, marginBottom: 8, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              💡 使用场景
            </h4>
            <p style={{ color: COLORS.text, fontSize: 14, margin: 0, lineHeight: 1.7 }}>
              {command.usage}
            </p>
          </div>
        )}

        {command.level && (
          <div
            style={{
              backgroundColor: 'rgba(0,0,0,0.3)',
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <h4 style={{ color: COLORS.text, marginBottom: 8, fontSize: 14 }}>
              💡 适用场景
            </h4>
            <p style={{ color: COLORS.textMuted, fontSize: 14, margin: 0 }}>
              {WORKFLOW_LEVELS[command.level - 1].useCase}
            </p>
          </div>
        )}

        {relatedCommands.length > 0 && (
          <div>
            <h4 style={{ color: COLORS.textMuted, marginBottom: 12, fontSize: 14 }}>
              相关命令
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {relatedCommands.map((c, i) => (
                <code
                  key={i}
                  style={{
                    fontSize: 13,
                    color: CATEGORIES[c.category].color,
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    padding: '4px 10px',
                    borderRadius: 4,
                  }}
                >
                  {c.cmd}
                </code>
              ))}
            </div>
          </div>
        )}
      </motion.div>
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
const DeprecatedCommands = () => (
  <div style={{ marginBottom: 40 }}>
    <h2 style={{ fontSize: 24, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
      <X size={24} style={{ color: COLORS.danger }} />
      已废弃的命令
    </h2>
    <div style={{ display: 'grid', gap: 12 }}>
      {DEPRECATED_COMMANDS.map((item, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.1 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
            backgroundColor: COLORS.cardBg,
            borderRadius: 12,
            padding: 16,
            flexWrap: 'wrap',
          }}
        >
          <code
            style={{
              fontSize: 16,
              color: COLORS.danger,
              textDecoration: 'line-through',
              backgroundColor: 'rgba(239,68,68,0.1)',
              padding: '8px 16px',
              borderRadius: 6,
            }}
          >
            {item.old}
          </code>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 24, color: COLORS.textMuted }}>→</span>
            <p style={{ fontSize: 12, color: COLORS.textDim, margin: '4px 0 0 0' }}>{item.reason}</p>
          </div>
          <code
            style={{
              fontSize: 16,
              color: COLORS.secondary,
              backgroundColor: 'rgba(16,185,129,0.1)',
              padding: '8px 16px',
              borderRadius: 6,
            }}
          >
            {item.newCmd}
          </code>
        </motion.div>
      ))}
    </div>
  </div>
);

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

// 主应用
function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CommandCategory | 'all'>('all');
  const [selectedLevel, setSelectedLevel] = useState<number | 'all'>('all');
  const [selectedCLI, setSelectedCLI] = useState<CLIType | 'all'>('all');
  const [selectedCommand, setSelectedCommand] = useState<Command | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<TimelineItem | null>(null);
  const [showGrandma, setShowGrandma] = useState(true);

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

          {/* 搜索和筛选 */}
          <div className="search-filter-row">
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

          {/* 老奶奶模式切换 */}
          <button
            className={`grandma-toggle ${showGrandma ? 'active' : ''}`}
            onClick={() => setShowGrandma(!showGrandma)}
          >
            <Sparkles size={18} />
            <span>{showGrandma ? '隐藏' : '显示'}老奶奶指南</span>
          </button>
        </div>
      </header>

      {/* 主内容 */}
      <main className="main-content">
        {/* 时间线 */}
        <TimelineSection onVersionClick={setSelectedVersion} />

        {/* 4级工作流 */}
        <WorkflowLevelsSection />

        {/* 老奶奶指南 */}
        <AnimatePresence>
          {showGrandma && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <GrandmaGuide />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 命令列表 */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 28, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <BookOpen size={28} style={{ color: COLORS.primary }} />
            命令列表
            <span style={{ fontSize: 16, color: COLORS.textDim, fontWeight: 'normal' }}>
              ({filteredCommands.length} 个命令)
            </span>
          </h2>

          {Object.entries(groupedCommands).map(([category, commands]) => (
            <div key={category} style={{ marginBottom: 30 }}>
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
                <AnimatePresence mode="popLayout">
                  {commands.map((cmd) => (
                    <CommandCard
                      key={cmd.cmd}
                      command={cmd}
                      onClick={() => setSelectedCommand(cmd)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>

        {/* 废弃命令 */}
        <DeprecatedCommands />
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
    </div>
  );
}

export default App;
