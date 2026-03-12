/**
 * SkillMentionSuggestion — TipTap Mention Suggestion 配置（/ 触发）
 *
 * 输入 / 后异步获取当前工作区的 Skill 列表，弹出 MentionList 浮动列表。
 */

import type React from 'react'
import { ReactRenderer } from '@tiptap/react'
import type { SuggestionOptions } from '@tiptap/suggestion'
import { Sparkles } from 'lucide-react'
import { MentionList } from './MentionList'
import type { MentionListRef } from './MentionList'
import { createMentionPopup, positionPopup } from './mention-popup-utils'

export interface SkillMentionItem {
  id: string
  name: string
  description?: string
}

/** Skill 项渲染 */
function SkillItemRenderer({ item }: { item: SkillMentionItem }): React.ReactElement {
  return (
    <>
      <Sparkles className="size-3.5 text-violet-500 flex-shrink-0" />
      <span className="truncate font-medium flex-1 min-w-0">{item.name}</span>
      {item.description && (
        <span className="truncate text-[10px] text-muted-foreground/50 max-w-[120px]">{item.description}</span>
      )}
    </>
  )
}

/**
 * 创建 Skill / 引用的 Suggestion 配置
 *
 * @param workspaceSlugRef 当前工作区 slug 引用
 * @param mentionActiveRef 是否正在 mention 模式（用于阻止 Enter 发送消息）
 */
export function createSkillMentionSuggestion(
  workspaceSlugRef: React.RefObject<string | null>,
  mentionActiveRef: React.MutableRefObject<boolean>,
): Omit<SuggestionOptions<SkillMentionItem>, 'editor'> {
  return {
    char: '/',
    allowSpaces: false,

    items: async ({ query }): Promise<SkillMentionItem[]> => {
      const slug = workspaceSlugRef.current
      if (!slug) return []

      try {
        const caps = await window.electronAPI.getWorkspaceCapabilities(slug)
        const q = (query ?? '').toLowerCase()
        return caps.skills
          .filter((s) => s.enabled)
          .filter((s) => !q || s.name.toLowerCase().includes(q) || (s.slug ?? '').toLowerCase().includes(q))
          .map((s) => ({ id: s.slug, name: s.name, description: s.description }))
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
              emptyText: '无匹配 Skill',
              keyExtractor: (item: SkillMentionItem) => item.id,
              renderItem: (item: SkillMentionItem) => <SkillItemRenderer item={item} />,
              onSelect: (item: SkillMentionItem) => {
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
