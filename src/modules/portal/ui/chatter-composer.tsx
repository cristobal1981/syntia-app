'use client'

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react'
import Placeholder from '@tiptap/extension-placeholder'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Italic } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { portalChatter } from '@/content/portal-chatter'
import { isChatterHtmlEmpty } from '@/src/modules/portal/domain/filter-portal-messages'
import { cn } from '@/lib/utils'

export type ChatterComposerHandle = {
  clear: () => void
  getHtml: () => string
  isEmpty: () => boolean
}

type ChatterComposerProps = {
  disabled?: boolean
  resetToken?: number
  onEmptyChange?: (empty: boolean) => void
}

export const ChatterComposer = forwardRef<ChatterComposerHandle, ChatterComposerProps>(
  function ChatterComposer({ disabled = false, resetToken = 0, onEmptyChange }, ref) {
    const [isEmpty, setIsEmpty] = useState(true)

    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          blockquote: false,
          code: false,
          codeBlock: false,
          heading: false,
          horizontalRule: false,
          strike: false,
        }),
        Placeholder.configure({
          placeholder: portalChatter.composerPlaceholder,
        }),
      ],
      editable: !disabled,
      editorProps: {
        attributes: {
          class:
            'min-h-10 max-h-[120px] overflow-y-auto px-4 py-2.5 text-sm leading-5 outline-none [&_p]:m-0 [&_p+p]:mt-2',
        },
      },
      onUpdate: ({ editor: currentEditor }) => {
        const empty = isChatterHtmlEmpty(currentEditor.getHTML())
        setIsEmpty(empty)
        onEmptyChange?.(empty)
      },
    })

    useImperativeHandle(
      ref,
      () => ({
        clear: () => {
          editor?.commands.clearContent(true)
          setIsEmpty(true)
          onEmptyChange?.(true)
        },
        getHtml: () => editor?.getHTML() ?? '',
        isEmpty: () => isChatterHtmlEmpty(editor?.getHTML() ?? ''),
      }),
      [editor, onEmptyChange]
    )

    useEffect(() => {
      if (!editor) return
      editor.setEditable(!disabled)
    }, [disabled, editor])

    useEffect(() => {
      if (!editor) return
      editor.commands.clearContent(true)
      setIsEmpty(true)
      onEmptyChange?.(true)
    }, [editor, onEmptyChange, resetToken])

    return (
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'overflow-hidden rounded-2xl border border-border bg-background focus-within:ring-2 focus-within:ring-ring dark:border-input/50',
            disabled && 'opacity-60'
          )}
        >
          <div className="flex items-center gap-0.5 border-b border-border px-1 py-0.5 dark:border-input/50">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              disabled={disabled || !editor}
              aria-label={portalChatter.formatBold}
              aria-pressed={editor?.isActive('bold') ?? false}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            >
              <Bold className="size-4" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              disabled={disabled || !editor}
              aria-label={portalChatter.formatItalic}
              aria-pressed={editor?.isActive('italic') ?? false}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            >
              <Italic className="size-4" aria-hidden />
            </Button>
          </div>
          <EditorContent editor={editor} />
        </div>
        <span className="sr-only" aria-live="polite">
          {isEmpty ? portalChatter.composerEmpty : portalChatter.composerHasContent}
        </span>
      </div>
    )
  }
)
