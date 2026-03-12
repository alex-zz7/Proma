/**
 * McpMentionSuggestion — TipTap Mention Suggestion 配置（# 触发）
 *
 * 输入 # 后异步获取当前工作区的 MCP Server 列表，弹出 MentionList 浮动列表。
 */

import type React from 'react'
import { ReactRenderer } from '@tiptap/react'
import type { SuggestionOptions } from '@tiptap/suggestion'
import { Server } from 'lucide-react'
import { MentionList } from './MentionList'
import type { MentionListRef } from './MentionList'
import { createMentionPopup, positionPopup } from './mention-popup-utils'

export interface McpMentionItem {
  id: string
  name: string
  type: string
  enabled: boolean
}

/** MCP 项渲染 */
function McpItemRenderer({ item }: { item: McpMentionItem }): React.ReactElement {
  return (
    <>
      <Server className="size-3.5 text-emerald-500 flex-shrink-0" />
      <span className="truncate font-medium flex-1 min-w-0">{item.name}</span>
      <span className="truncate text-[10px] text-muted-foreground/50 max-w-[120px]">{item.type}</span>
    </>
  )
}

/**
 * 创建 MCP # 引用的 Suggestion 配置
 *
 * @param workspaceSlugRef 当前工作区 slug 引用
 * @param mentionActiveRef 是否正在 mention 模式（用于阻止 Enter 发送消息）
 */
export function createMcpMentionSuggestion(
  workspaceSlugRef: React.RefObject<string | null>,
  mentionActiveRef: React.MutableRefObject<boolean>,
): Omit<SuggestionOptions<McpMentionItem>, 'editor'> {
  return {
    char: '#',
    allowSpaces: false,

    items: async ({ query }): Promise<McpMentionItem[]> => {
      const slug = workspaceSlugRef.current
      if (!slug) return []

      try {
        const caps = await window.electronAPI.getWorkspaceCapabilities(slug)
        const q = (query ?? '').toLowerCase()
        return caps.mcpServers
          .filter((s) => s.enabled)
          .filter((s) => !q || s.name.toLowerCase().includes(q))
          .map((s) => ({ id: s.name, name: s.name, type: s.type, enabled: s.enabled }))
      } catch {
        return []
      }
    },

    render: () => {
      let renderer: ReactRenderer<MentionListRef> | null = null
      let popup: HTMLDivElement | null = null

      return {
        onStart(props) {
          mentionActiveRef.current = true
          renderer = new ReactRenderer(MentionList, {
            props: {
              items: props.items,
              selectedIndex: 0,
              emptyText: '无匹配 MCP 服务',
              keyExtractor: (item: McpMentionItem) => item.id,
              renderItem: (item: McpMentionItem) => <McpItemRenderer item={item} />,
              onSelect: (item: McpMentionItem) => {
                props.command({ id: item.id, label: item.name })
              },
            },
            editor: props.editor,
          })

          popup = createMentionPopup(renderer.element)
          positionPopup(popup, props.clientRect?.())
        },

        onUpdate(props) {
          renderer?.updateProps({ items: props.items })
          positionPopup(popup, props.clientRect?.())
        },

        onKeyDown(props) {
          return renderer?.ref?.onKeyDown({ event: props.event }) ?? false
        },

        onExit() {
          mentionActiveRef.current = false
          popup?.remove()
          popup = null
          renderer?.destroy()
          renderer = null
        },
      }
    },
  }
}
