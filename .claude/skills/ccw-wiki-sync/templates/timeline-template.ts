// Timeline Entry Template
// 用于生成新的时间线条目

// ============================================
// 时间线对象结构
// ============================================

interface TimelineItem {
  date: string;              // YYYY-MM 格式
  version: string;           // 版本号，如 v7.0
  title: string;             // 版本标题
  desc: string;              // 版本描述
  color: string;             // 颜色变量，如 COLORS.accent5
  commands: number;          // 命令总数
  detail: VersionDetail;     // 版本详情
}

interface VersionDetail {
  version: string;           // 版本号
  highlights: string[];      // 亮点列表
  newCommands: string[];     // 新增命令列表
  usage: string;             // 使用说明
}

// ============================================
// 颜色选项
// ============================================

/**
 * 可用颜色 (来自 COLORS 常量):
 * - COLORS.primary      #6366f1 靛蓝
 * - COLORS.secondary    #10b981 绿色
 * - COLORS.warning      #f59e0b 橙黄
 * - COLORS.accent1      #ec4899 粉红
 * - COLORS.accent2      #8b5cf6 紫色
 * - COLORS.accent3      #06b6d4 青色
 * - COLORS.accent4      #84cc16 黄绿
 * - COLORS.accent5      #f97316 橙色
 */

// ============================================
// 模板示例
// ============================================

const timelineExample: TimelineItem = {
  date: '2026-03',
  version: 'v7.1',
  title: '功能增强',
  desc: '新增命令和性能优化',
  color: 'COLORS.accent5',
  commands: 115,
  detail: {
    version: 'v7.1',
    highlights: [
      '新增工作流命令',
      '性能优化和 bug 修复',
      '案例和文档更新'
    ],
    newCommands: [
      '/workflow:new-feature',
      '/team-new-skill',
      '/memory-enhanced'
    ],
    usage: '使用 /ccw-help 浏览所有新命令，或查看命令详情了解更多信息'
  }
};

// ============================================
// 生成函数
// ============================================

function generateTimelineEntry(
  version: string,
  totalCommands: number,
  newCommands: string[],
  highlights: string[]
): TimelineItem {
  // 解析版本号确定日期
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // 根据版本号选择颜色
  const colorIndex = parseInt(version.split('.')[1]) % 5 + 1;
  const color = `COLORS.accent${colorIndex}`;

  return {
    date: dateStr,
    version,
    title: '版本更新',
    desc: '新增命令和功能优化',
    color,
    commands: totalCommands,
    detail: {
      version,
      highlights,
      newCommands: newCommands.slice(0, 5), // 最多 5 个
      usage: '查看命令详情了解更多信息'
    }
  };
}

// ============================================
// 版本号规则
// ============================================

/**
 * 版本号格式: a.b.c
 *
 * - a (major): 里程碑版本
 *   - 重大架构变更
 *   - 不兼容更新
 *
 * - b (minor): 大版本 ← 记录到 timeline
 *   - 新功能添加
 *   - 重要命令变更
 *
 * - c (patch): 小版本 ← 合并到 b 版本
 *   - bug 修复
 *   - 小改进
 *   - 不单独记录
 *
 * 判断是否添加到 timeline:
 * - b 变化 → 添加新条目
 * - 仅 c 变化 → 合并到现有 b 版本
 */

function shouldAddToTimeline(oldVersion: string, newVersion: string): boolean {
  const parseVer = (v: string) => v.replace('v', '').split('.').map(Number);

  const oldParts = parseVer(oldVersion);
  const newParts = parseVer(newVersion);

  // major 或 minor 变化
  return newParts[0] > oldParts[0] || newParts[1] > oldParts[1];
}

// ============================================
// 在 timeline.ts 中的格式
// ============================================

/**
 * 添加到 TIMELINE 数组开头:
 *
 * {
 *   date: '2026-03',
 *   version: 'v7.1',
 *   title: '功能增强',
 *   desc: '新增命令和性能优化',
 *   color: COLORS.accent5,
 *   commands: 115,
 *   detail: {
 *     version: 'v7.1',
 *     highlights: [
 *       '新增工作流命令',
 *       '性能优化和 bug 修复'
 *     ],
 *     newCommands: [
 *       '/workflow:new-feature',
 *       '/team-new-skill'
 *     ],
 *     usage: '查看命令详情了解更多信息'
 *   }
 * },
 */
